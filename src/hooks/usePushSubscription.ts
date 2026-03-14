import { useEffect, useRef } from 'react';
import { logPushAttempt } from '@/components/PushDebugPanel';

const PUSH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

function getPushFunctionUrl(action: string) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/push-notifications?action=${action}`;
}

async function callPushFunction(action: string, init?: RequestInit) {
  const response = await fetch(getPushFunctionUrl(action), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`push-notifications (${action}) failed: ${response.status} ${text}`);
  }

  return response;
}

/**
 * Subscribes the current user to Web Push notifications.
 * Also periodically triggers the server to check for overdue tasks.
 */
export function usePushSubscription(currentUser: string | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    let cancelled = false;

    async function subscribe() {
      try {
        // Ensure a service worker is registered
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js');
        }

        await navigator.serviceWorker.ready;

        // Keep current subscription alive until we successfully get/confirm a valid one
        let existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await saveSubscription(existingSub, currentUser);
        }

        // Get VAPID public key from backend
        const resp = await callPushFunction('vapid-public-key');
        const { publicKey } = await resp.json();

        if (cancelled) return;

        // Request permission only when needed
        let permission = Notification.permission;
        if (permission !== 'granted') {
          permission = await Notification.requestPermission();
        }
        if (permission !== 'granted') {
          logPushAttempt(false, 'Notification permission not granted');
          return;
        }

        const appServerKey = urlBase64ToUint8Array(publicKey);
        let subscription: PushSubscription;

        try {
          // In most browsers this returns existing subscription if compatible
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey.buffer as ArrayBuffer,
          });
        } catch (err) {
          // Fallback for browsers that require re-subscribe only on invalid state
          const isInvalidState = err instanceof DOMException && err.name === 'InvalidStateError';

          if (!existingSub || !isInvalidState) throw err;

          await existingSub.unsubscribe();
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey.buffer as ArrayBuffer,
          });
        }

        await saveSubscription(subscription, currentUser);
        logPushAttempt(true);
      } catch (err) {
        console.error('Push subscription error:', err);
        logPushAttempt(false, String(err));
      }
    }

    async function saveSubscription(subscription: PushSubscription, userName: string) {
      try {
        await callPushFunction('subscribe', {
          method: 'POST',
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            userName,
          }),
        });
      } catch (err) {
        console.error('Save subscription error:', err);
      }
    }

    async function triggerCheck() {
      try {
        await callPushFunction('check-and-send', {
          method: 'POST',
          body: JSON.stringify({}),
        });
      } catch (err) {
        console.error('Push check error:', err);
      }
    }

    subscribe();

    // Periodically trigger due/reminder check (ensures push gets sent even without cron)
    triggerCheck();
    intervalRef.current = setInterval(triggerCheck, PUSH_CHECK_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentUser]);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
