import { useEffect, useRef } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { getDeviceId } from '@/lib/device-id';
import { supabase } from '@/integrations/supabase/client';
import { isPast } from 'date-fns';

const DAY_NAMES = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];

const REMINDER_LABELS: Record<string, string> = {
  '15m': '15 דקות',
  '30m': '30 דקות',
  '1h': 'שעה',
  '2h': 'שעתיים',
  '1d': 'יום',
};

function parseReminderToMs(reminder?: string): number | null {
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

function formatReminder(reminder?: string): string {
  if (!reminder) return 'זמן קצר';
  return REMINDER_LABELS[reminder] ?? reminder;
}

/** Request notification permission on mount */
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/** Send a browser notification */
function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `overdue-${title}`,
    });
  }
}

/**
 * Hook that checks every minute for overdue tasks assigned to the
 * device owner and sends browser push notifications only for them.
 */
export function useOverdueNotifications() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());
  const deviceOwnerRef = useRef<string | null>(null);

  useEffect(() => {
    requestNotificationPermission();

    // Resolve device owner once
    const deviceId = getDeviceId();
    supabase
      .from('device_registrations')
      .select('user_name')
      .eq('device_id', deviceId)
      .maybeSingle()
      .then(({ data }) => {
        deviceOwnerRef.current = data?.user_name ?? null;
      });

    const checkOverdue = () => {
      const { tasks } = useTaskStore.getState();
      const owner = deviceOwnerRef.current;

      tasks.forEach((task) => {
        if (task.completed) return;

        // Only notify if this device's owner is assigned to the task
        if (owner && !task.assigneeIds.includes(owner)) return;

        // Build full due datetime (date + optional time)
        let dueDateTime: Date;
        if (task.dueTime) {
          const [h, m] = task.dueTime.split(':').map(Number);
          const d = new Date(task.dueDate + 'T00:00:00');
          d.setHours(h, m, 0, 0);
          dueDateTime = d;
        } else {
          // No time set – treat end-of-day as deadline
          const d = new Date(task.dueDate + 'T23:59:59');
          dueDateTime = d;
        }

        if (Number.isNaN(dueDateTime.getTime())) return;

        const now = new Date();

        // Reminder before due time (e.g. 15m / 1h)
        const reminderMs = parseReminderToMs(task.reminderBefore);
        if (reminderMs && dueDateTime > now) {
          const reminderAt = new Date(dueDateTime.getTime() - reminderMs);
          const reminderKey = `${task.id}-due-${task.dueDate}-${task.dueTime ?? ''}`;

          if (reminderAt <= now && !notifiedRef.current.has(reminderKey)) {
            notifiedRef.current.add(reminderKey);

            const message = `תזכורת: "${task.title}" בעוד ${formatReminder(task.reminderBefore)}`;
            sendNotification('⏰ תזכורת למשימה', message);

            const notification = {
              id: crypto.randomUUID(),
              type: 'due' as const,
              taskId: task.id,
              taskTitle: task.title,
              message,
              read: false,
              createdAt: new Date().toISOString(),
            };

            const existingNotifications = useTaskStore.getState().notifications;
            const alreadyNotified = existingNotifications.some(
              (n) =>
                n.taskId === task.id &&
                n.type === 'due' &&
                new Date(n.createdAt).toDateString() === new Date().toDateString()
            );

            if (!alreadyNotified) {
              useTaskStore.getState().addNotification(notification);
            }
          }
        }

        if (!isPast(dueDateTime)) return;

        const todayKey = `${task.id}-${new Date().toDateString()}`;
        if (notifiedRef.current.has(todayKey)) return;
        notifiedRef.current.add(todayKey);

        const dayLabel = task.dueDay !== undefined ? DAY_NAMES[task.dueDay] : '';
        const message = task.dueDay !== undefined
          ? `המשימה "${task.title}" הייתה אמורה להתבצע ב${dayLabel} ועדיין לא בוצעה!`
          : `המשימה "${task.title}" באיחור!`;

        sendNotification('⚠️ משימה באיחור', message);

        const notification = {
          id: crypto.randomUUID(),
          type: 'overdue' as const,
          taskId: task.id,
          taskTitle: task.title,
          message,
          read: false,
          createdAt: new Date().toISOString(),
        };

        const existingNotifications = useTaskStore.getState().notifications;
        const alreadyNotified = existingNotifications.some(
          (n) => n.taskId === task.id && n.type === 'overdue' &&
                 new Date(n.createdAt).toDateString() === new Date().toDateString()
        );

        if (!alreadyNotified) {
          useTaskStore.getState().addNotification(notification);
        }
      });
    };

    checkOverdue();
    intervalRef.current = setInterval(checkOverdue, 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
