import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---- Web Push helpers (manual implementation for Deno) ----

async function generateVAPIDKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  // Convert JWK x,y to uncompressed point (65 bytes: 0x04 + x + y)
  const xBytes = base64UrlToBytes(publicJwk.x!);
  const yBytes = base64UrlToBytes(publicJwk.y!);
  const uncompressed = new Uint8Array(65);
  uncompressed[0] = 0x04;
  uncompressed.set(xBytes, 1);
  uncompressed.set(yBytes, 33);

  return {
    publicKey: bytesToBase64Url(uncompressed),
    privateKey: privateJwk.d!,
  };
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - b64.length % 4) % 4;
  const padded = b64 + '='.repeat(pad);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createVapidJwt(audience: string, subject: string, privateKeyD: string, publicKeyUncompressed: string) {
  // Build JWK for the private key
  const pubBytes = base64UrlToBytes(publicKeyUncompressed);
  const x = bytesToBase64Url(pubBytes.slice(1, 33));
  const y = bytesToBase64Url(pubBytes.slice(33, 65));

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d: privateKeyD,
  };

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: subject,
  };

  const encodedHeader = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r|s format (already raw from WebCrypto)
  const sig = new Uint8Array(signature);
  return `${unsignedToken}.${bytesToBase64Url(sig)}`;
}

async function encryptPayload(
  p256dhKey: string,
  authSecret: string,
  payload: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const userPublicKeyBytes = base64UrlToBytes(p256dhKey);
  const authSecretBytes = base64UrlToBytes(authSecret);
  const payloadBytes = new TextEncoder().encode(payload);

  // Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    'raw',
    userPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const localPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', localKeyPair.publicKey));

  // ECDH shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberKey },
    localKeyPair.privateKey,
    256
  ));

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive auth info
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const prkKey = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits']);

  // PRK from auth
  const ikm = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecretBytes, info: authInfo },
    prkKey,
    256
  );

  const ikmKey = await crypto.subtle.importKey('raw', new Uint8Array(ikm), { name: 'HKDF' }, false, ['deriveBits']);

  // Build context for key and nonce derivation
  const keyLabel = new TextEncoder().encode('Content-Encoding: aesgcm\0');
  const nonceLabel = new TextEncoder().encode('Content-Encoding: nonce\0');

  // Context: "P-256" + 0x00 + len(recipientPublic) + recipientPublic + len(senderPublic) + senderPublic
  const contextLabel = new TextEncoder().encode('P-256\0');
  const context = new Uint8Array(contextLabel.length + 1 + 2 + 65 + 2 + 65);
  let offset = 0;
  context.set(contextLabel, offset); offset += contextLabel.length;
  context[offset++] = 0;
  context[offset++] = 0; context[offset++] = 65;
  context.set(userPublicKeyBytes, offset); offset += 65;
  context[offset++] = 0; context[offset++] = 65;
  context.set(localPublicKeyRaw, offset);

  const keyInfoBuf = new Uint8Array(keyLabel.length + context.length);
  keyInfoBuf.set(keyLabel, 0);
  keyInfoBuf.set(context, keyLabel.length);

  const nonceInfoBuf = new Uint8Array(nonceLabel.length + context.length);
  nonceInfoBuf.set(nonceLabel, 0);
  nonceInfoBuf.set(context, nonceLabel.length);

  const contentKey = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: keyInfoBuf },
    ikmKey,
    128
  ));

  const nonce = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfoBuf },
    ikmKey,
    96
  ));

  // Pad payload (2 bytes padding length + payload)
  const paddedPayload = new Uint8Array(2 + payloadBytes.length);
  paddedPayload[0] = 0;
  paddedPayload[1] = 0;
  paddedPayload.set(payloadBytes, 2);

  // AES-GCM encrypt
  const aesKey = await crypto.subtle.importKey('raw', contentKey, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    paddedPayload
  ));

  return { ciphertext: encrypted, salt, localPublicKey: localPublicKeyRaw };
}

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await createVapidJwt(audience, 'mailto:app@family-flow.app', vapidPrivateKey, vapidPublicKey);
  const { ciphertext, salt, localPublicKey } = await encryptPayload(p256dh, auth, payload);

  const vapidPubBytes = base64UrlToBytes(vapidPublicKey);

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Content-Length': ciphertext.length.toString(),
      'Encryption': `salt=${bytesToBase64Url(salt)}`,
      'Crypto-Key': `dh=${bytesToBase64Url(localPublicKey)};p256ecdsa=${bytesToBase64Url(vapidPubBytes)}`,
      'Authorization': `vapid t=${jwt}, k=${bytesToBase64Url(vapidPubBytes)}`,
      'TTL': '86400',
      'Urgency': 'high',
    },
    body: ciphertext,
  });
}

function parseReminderToMs(reminder: string | null | undefined): number | null {
  if (!reminder) return null;
  const match = reminder.match(/^(\d+)([mhd])$/);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;
  return null;
}

function formatReminder(reminder: string | null | undefined): string {
  const labels: Record<string, string> = {
    '15m': '15 דקות',
    '30m': '30 דקות',
    '1h': 'שעה',
    '2h': 'שעתיים',
    '1d': 'יום',
  };

  if (!reminder) return 'זמן קצר';
  return labels[reminder] ?? reminder;
}

async function sendPushToSubscriptions(
  supabase: any,
  subscriptions: any[],
  payload: { title: string; body: string; icon: string; tag: string },
  vapidKeys: { publicKey: string; privateKey: string }
): Promise<number> {
  let sent = 0;
  const message = JSON.stringify(payload);

  for (const sub of subscriptions) {
    try {
      const resp = await sendWebPush(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        message,
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );

      if (resp.ok) {
        sent++;
      } else if (resp.status === 404 || resp.status === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      } else {
        console.error('Push send failed:', resp.status, await resp.text());
      }
    } catch (e) {
      console.error('Push send error:', e);
    }
  }

  return sent;
}

// ---- Main handler ----

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // Get or generate VAPID keys
  async function getVapidKeys() {
    const { data } = await supabase
      .from('app_settings')
      .select('id, value')
      .in('id', ['vapid_public_key', 'vapid_private_key']);

    if (data && data.length === 2) {
      const pub = data.find((d: any) => d.id === 'vapid_public_key')?.value;
      const priv = data.find((d: any) => d.id === 'vapid_private_key')?.value;
      if (pub && priv) return { publicKey: pub, privateKey: priv };
    }

    const keys = await generateVAPIDKeys();
    await supabase.from('app_settings').upsert([
      { id: 'vapid_public_key', value: keys.publicKey },
      { id: 'vapid_private_key', value: keys.privateKey },
    ]);
    return keys;
  }

  try {
    if (action === 'vapid-public-key') {
      const keys = await getVapidKeys();
      return new Response(JSON.stringify({ publicKey: keys.publicKey }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'subscribe') {
      const { subscription, userName } = await req.json();

      if (!userName || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return new Response(JSON.stringify({ error: 'Missing subscription fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Keep only the latest endpoint per user to avoid stale/orphaned subscriptions
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_name', userName)
        .neq('endpoint', subscription.endpoint);

      const refreshedAt = new Date().toISOString();
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_name: userName,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          created_at: refreshedAt,
        },
        { onConflict: 'endpoint' }
      );

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true, userName, endpoint: subscription.endpoint, refreshedAt }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'notify-assigned') {
      const { taskTitle, assigneeIds, assignedBy } = await req.json();
      if (!assigneeIds || assigneeIds.length === 0) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const keys = await getVapidKeys();

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth, user_name')
        .in('user_name', assigneeIds);

      // Filter out the person who assigned (don't notify yourself)
      const targetSubs = (subscriptions || []).filter(s => s.user_name !== assignedBy);

      if (targetSubs.length === 0) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sent = await sendPushToSubscriptions(
        supabase,
        targetSubs,
        {
          title: '📋 משימה חדשה שויכה אליך',
          body: `"${taskTitle}" שויכה אליך${assignedBy ? ` על ידי ${assignedBy}` : ''}`,
          icon: '/pwa-192x192.png',
          tag: `assigned-${Date.now()}`,
        },
        keys
      );

      return new Response(JSON.stringify({ sent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check-and-send') {
      const keys = await getVapidKeys();

      const [{ data: tasks, error: tasksError }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, due_date, due_time, reminder_before, assignee_ids')
          .eq('completed', false),
        supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth, user_name'),
      ]);

      if (tasksError) throw tasksError;
      if (subscriptionsError) throw subscriptionsError;

      if (!tasks || tasks.length === 0) {
        return new Response(JSON.stringify({ sent: 0, created: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Israel timezone (same "wall clock" comparison for due_date/due_time strings)
      const now = new Date();
      const israelNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
      const todayStr = israelNow.toISOString().split('T')[0];

      const { data: existingNotifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('task_id, type')
        .in('type', ['overdue', 'due'])
        .gte('created_at', `${todayStr}T00:00:00+00:00`);

      if (notificationsError) throw notificationsError;

      const alreadyOverdueTaskIds = new Set(
        (existingNotifications || [])
          .filter((n: any) => n.type === 'overdue')
          .map((n: any) => n.task_id)
      );

      const alreadyReminderTaskIds = new Set(
        (existingNotifications || [])
          .filter((n: any) => n.type === 'due')
          .map((n: any) => n.task_id)
      );

      const subscriptionsByUser = new Map<string, any[]>();
      for (const sub of subscriptions || []) {
        const list = subscriptionsByUser.get(sub.user_name) || [];
        list.push(sub);
        subscriptionsByUser.set(sub.user_name, list);
      }

      let sent = 0;
      const notificationsToInsert: any[] = [];

      for (const task of tasks) {
        if (!task.due_date) continue;

        let dueDateTime: Date;
        if (task.due_time) {
          const [h, m] = task.due_time.split(':').map(Number);
          dueDateTime = new Date(`${task.due_date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
        } else {
          dueDateTime = new Date(`${task.due_date}T23:59:59`);
        }

        if (Number.isNaN(dueDateTime.getTime())) continue;

        const uniqueSubs = new Map<string, any>();
        for (const assignee of (task.assignee_ids || [])) {
          for (const sub of subscriptionsByUser.get(assignee) || []) {
            uniqueSubs.set(sub.endpoint, sub);
          }
        }
        const assigneeSubscriptions = Array.from(uniqueSubs.values());

        // Reminder-before notification (e.g. 15m / 1h)
        const reminderMs = parseReminderToMs(task.reminder_before);
        if (reminderMs && dueDateTime > israelNow && !alreadyReminderTaskIds.has(task.id)) {
          const reminderAt = new Date(dueDateTime.getTime() - reminderMs);

          if (reminderAt <= israelNow) {
            const reminderMessage = `תזכורת: "${task.title}" בעוד ${formatReminder(task.reminder_before)}`;

            if (assigneeSubscriptions.length > 0) {
              sent += await sendPushToSubscriptions(
                supabase,
                assigneeSubscriptions,
                {
                  title: '⏰ תזכורת למשימה',
                  body: reminderMessage,
                  icon: '/pwa-192x192.png',
                  tag: `due-${task.id}-${todayStr}`,
                },
                keys
              );
            }

            notificationsToInsert.push({
              type: 'due',
              task_id: task.id,
              task_title: task.title,
              message: reminderMessage,
              read: false,
            });

            alreadyReminderTaskIds.add(task.id);
          }
        }

        // Overdue notification
        if (dueDateTime > israelNow || alreadyOverdueTaskIds.has(task.id)) continue;

        const overdueMessage = `המשימה "${task.title}" באיחור!`;

        if (assigneeSubscriptions.length > 0) {
          sent += await sendPushToSubscriptions(
            supabase,
            assigneeSubscriptions,
            {
              title: '⚠️ משימה באיחור',
              body: overdueMessage,
              icon: '/pwa-192x192.png',
              tag: `overdue-${task.id}-${todayStr}`,
            },
            keys
          );
        }

        notificationsToInsert.push({
          type: 'overdue',
          task_id: task.id,
          task_title: task.title,
          message: overdueMessage,
          read: false,
        });

        alreadyOverdueTaskIds.add(task.id);
      }

      if (notificationsToInsert.length > 0) {
        const { error: insertError } = await supabase.from('notifications').insert(notificationsToInsert);
        if (insertError) throw insertError;
      }

      return new Response(JSON.stringify({ sent, created: notificationsToInsert.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
