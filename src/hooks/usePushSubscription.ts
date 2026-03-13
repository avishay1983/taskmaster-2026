import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PUSH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Subscribes the current user to Web Push notifications.
 * Also periodically triggers the server to check for overdue tasks.
 */
export function usePushSubscription(currentUser: string | null) {
  const subscribedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    let cancelled = false;

    async function subscribe() {
      try {
        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;

        // Check if already subscribed
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          // Already subscribed, just save to DB
          await saveSubscription(existingSub, currentUser!);
          subscribedRef.current = true;
          return;
        }

        // Get VAPID public key from edge function
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const resp = await fetch(
          `https://${projectId}.supabase.co/functions/v1/push-notifications?action=vapid-public-key`
        );
        if (!resp.ok) throw new Error('Failed to get VAPID key');
        const { publicKey } = await resp.json();

        if (cancelled) return;

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Subscribe to push
        const appServerKey = urlBase64ToUint8Array(publicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey.buffer as ArrayBuffer,
        });

        await saveSubscription(subscription, currentUser!);
        subscribedRef.current = true;
      } catch (err) {
        console.error('Push subscription error:', err);
      }
    }

    async function saveSubscription(subscription: PushSubscription, userName: string) {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/push-notifications?action=subscribe`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription: subscription.toJSON(),
              userName,
            }),
          }
        );
      } catch (err) {
        console.error('Save subscription error:', err);
      }
    }

    async function triggerCheck() {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/push-notifications?action=check-and-send`,
          { method: 'POST' }
        );
      } catch (err) {
        console.error('Push check error:', err);
      }
    }

    subscribe();

    // Periodically trigger overdue check (ensures push gets sent even without cron)
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
