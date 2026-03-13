import { useEffect, useRef } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { Bell, AlertTriangle, UserPlus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface Props {
  onClose: () => void;
}

export function NotificationsDropdown({ onClose }: Props) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useTaskStore();
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

  return (
    <div
      ref={ref}
      className="fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 rounded-xl border border-border bg-card shadow-lg z-50"
      dir="rtl"
    >
      <div className="flex items-center justify-between border-b border-border p-3">
        <h3 className="text-sm font-semibold">התראות</h3>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllNotificationsRead}>
          סמן הכל כנקרא
        </Button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2" />
            <p className="text-sm">אין התראות חדשות</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              className={`flex w-full gap-3 p-3 text-right transition-colors hover:bg-accent/50 ${
                !n.read ? 'bg-primary/5' : ''
              }`}
            >
              <div className="mt-0.5 shrink-0">{iconMap[n.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{n.taskTitle}</p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: he })}
                </p>
              </div>
              {!n.read && (
                <div className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
