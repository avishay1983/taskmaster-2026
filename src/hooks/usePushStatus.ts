import { useState, useEffect, useCallback } from 'react';

export type PushStatus = 'loading' | 'subscribed' | 'not-subscribed' | 'denied' | 'unsupported';

/**
 * Returns the current Web Push notification status and a subscribe helper.
 */
export function usePushStatus() {
  const [status, setStatus] = useState<PushStatus>('loading');

  const check = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setStatus('not-subscribed');
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? 'subscribed' : 'not-subscribed');
    } catch {
      setStatus('not-subscribed');
    }
  }, []);

  useEffect(() => {
    check();
    // Re-check when user returns to tab (e.g. after changing browser settings)
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [check]);

  return { status, recheck: check };
}
