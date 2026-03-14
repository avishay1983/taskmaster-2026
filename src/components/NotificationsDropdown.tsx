import { useEffect, useRef } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { Bell, AlertTriangle, UserPlus, Clock, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface Props {
  onClose: () => void;
}

export function NotificationsDropdown({ onClose }: Props) {
  const { notifications, tasks, activeWorkspace, markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications } = useTaskStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const iconMap = {
    overdue: <AlertTriangle className="h-4 w-4 text-destructive" />,
    due: <Clock className="h-4 w-4 text-warning" />,
    assigned: <UserPlus className="h-4 w-4 text-primary" />,
  };

  // Filter notifications by active workspace
  const wsTaskIds = activeWorkspace
    ? new Set(tasks.filter(t => t.workspaceId === activeWorkspace).map(t => t.id))
    : null;
  const filtered = wsTaskIds
    ? notifications.filter(n => wsTaskIds.has(n.taskId))
    : notifications;

  const unread = filtered.filter((n) => !n.read);
  const read = filtered.filter((n) => n.read);

  return (
    <div
      ref={ref}
      className="fixed left-2 right-2 top-16 sm:absolute sm:right-auto sm:left-0 sm:top-full sm:mt-2 sm:w-80 rounded-xl border border-border bg-card shadow-lg z-50"
      dir="rtl"
    >
      <div className="flex items-center justify-between border-b border-border p-3">
        <h3 className="text-sm font-semibold">התראות</h3>
        <div className="flex items-center gap-1">
          {unread.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllNotificationsRead}>
              סמן כנקרא
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive" onClick={clearAllNotifications}>
              מחק הכל
            </Button>
          )}
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2" />
            <p className="text-sm">אין התראות</p>
          </div>
        ) : (
          <>
            {unread.map((n) => (
              <div
                key={n.id}
                className="flex w-full gap-3 p-3 text-right transition-colors hover:bg-accent/50 bg-primary/5 group"
              >
                <div className="mt-0.5 shrink-0">{iconMap[n.type]}</div>
                <button className="flex-1 min-w-0 text-right" onClick={() => markNotificationRead(n.id)}>
                  <p className="text-sm font-medium truncate">{n.taskTitle}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: he })}
                  </p>
                </button>
                <div className="flex items-start gap-1 shrink-0">
                  <div className="mt-2 h-2 w-2 rounded-full bg-primary" />
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {read.length > 0 && unread.length > 0 && (
              <div className="border-t border-border px-3 py-1.5">
                <span className="text-[10px] text-muted-foreground">נקראו</span>
              </div>
            )}
            {read.map((n) => (
              <div
                key={n.id}
                className="flex w-full gap-3 p-3 text-right transition-colors hover:bg-accent/50 opacity-60 group"
              >
                <div className="mt-0.5 shrink-0">{iconMap[n.type]}</div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-medium truncate">{n.taskTitle}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: he })}
                  </p>
                </div>
                <button
                  onClick={() => deleteNotification(n.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all shrink-0 mt-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}