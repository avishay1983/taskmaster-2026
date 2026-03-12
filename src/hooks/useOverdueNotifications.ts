import { useEffect, useRef } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { isPast, isToday } from 'date-fns';

const DAY_NAMES = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];

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
      tag: `overdue-${title}`, // prevents duplicate notifications
    });
  }
}

/**
 * Hook that checks every minute for overdue tasks (especially day-based ones)
 * and sends browser push notifications.
 */
export function useOverdueNotifications() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Request permission on first load
    requestNotificationPermission();

    const checkOverdue = () => {
      const { tasks } = useTaskStore.getState();

      tasks.forEach((task) => {
        if (task.completed) return;

        const dueDate = new Date(task.dueDate);
        const isOverdue = isPast(dueDate) && !isToday(dueDate);

        if (!isOverdue) return;

        // For day-based tasks, notify daily
        const todayKey = `${task.id}-${new Date().toDateString()}`;
        if (notifiedRef.current.has(todayKey)) return;

        // Mark as notified for today
        notifiedRef.current.add(todayKey);

        const dayLabel = task.dueDay !== undefined ? DAY_NAMES[task.dueDay] : '';
        const message = task.dueDay !== undefined
          ? `המשימה "${task.title}" הייתה אמורה להתבצע ב${dayLabel} ועדיין לא בוצעה!`
          : `המשימה "${task.title}" באיחור!`;

        // Send browser notification
        sendNotification('⚠️ משימה באיחור', message);

        // Also add to in-app notifications
        const notification = {
          id: crypto.randomUUID(),
          type: 'overdue' as const,
          taskId: task.id,
          taskTitle: task.title,
          message,
          read: false,
          createdAt: new Date().toISOString(),
        };

        // Only add in-app notification if not already one for this task today
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

    // Check immediately, then every 60 seconds
    checkOverdue();
    intervalRef.current = setInterval(checkOverdue, 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
