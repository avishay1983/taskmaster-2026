import { useState } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { Task, Priority } from '@/lib/types';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format, isPast, isToday, isYesterday, isTomorrow, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar, Clock, User, AlertCircle, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RecurringTaskDialog } from './RecurringTaskDialog';
import { SwipeableTask } from './SwipeableTask';
import { motion, AnimatePresence } from 'framer-motion';

const priorityStyles: Record<Priority, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-success/10 text-success border-success/20',
};
const priorityLabels: Record<Priority, string> = { high: 'גבוה', medium: 'בינוני', low: 'נמוך' };

function getDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return '📌 היום';
  if (isTomorrow(date)) return '⏳ מחר';
  if (isYesterday(date)) return '⚠️ אתמול';
  if (isPast(date)) return `⚠️ ${format(date, 'EEEE, dd/MM', { locale: he })}`;
  return format(date, 'EEEE, dd/MM', { locale: he });
}

function groupTasksByDate(tasks: Task[]): { label: string; dateKey: string; tasks: Task[] }[] {
  const groups: Record<string, Task[]> = {};
  for (const task of tasks) {
    const key = task.dueDate.split('T')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([dateKey, tasks]) => ({ label: getDateLabel(dateKey), dateKey, tasks }));
}

export function ListView() {
  const { getFilteredTasks, toggleComplete, deleteTask, workspaces } = useTaskStore();
  const [recurringTask, setRecurringTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const tasks = getFilteredTasks().sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const grouped = groupTasksByDate(tasks);

  const handleToggle = (task: Task) => {
    if (!task.completed) {
      setRecurringTask(task);
    }
    toggleComplete(task.id);
  };

  const isOverdue = (task: Task) => !task.completed && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

  return (
    <>
      <div className="space-y-4" dir="rtl">
        {grouped.map(({ label, dateKey, tasks: dateTasks }) => {
          const hasOverdue = dateTasks.some(isOverdue);
          return (
            <div key={dateKey}>
              <div className={`sticky top-0 z-10 flex items-center gap-2 py-2 px-1 mb-1 backdrop-blur-sm bg-background/80 border-b ${hasOverdue ? 'border-destructive/30' : 'border-border/50'}`}>
                <span className={`text-sm font-semibold ${hasOverdue ? 'text-destructive' : 'text-foreground'}`}>
                  {label}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({dateTasks.length})
                </span>
              </div>
              <div className="space-y-1">
                <AnimatePresence>
                  {dateTasks.map((task) => {
                    const ws = workspaces.find((w) => w.id === task.workspaceId);
                    const assigneeName = task.assigneeId;
                    const overdue = isOverdue(task);

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                      >
                        <SwipeableTask onDelete={() => setDeleteId(task.id)}>
                          <div
                            className={`flex items-center gap-3 rounded-xl px-4 py-3 md:py-3 py-4 transition-colors hover:bg-accent/50 group ${
                              overdue ? 'bg-destructive/5 border border-destructive/10' : 'border border-transparent'
                            } ${task.completed ? 'opacity-60' : ''}`}
                          >
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => handleToggle(task)}
                              className="shrink-0 h-5 w-5 md:h-4 md:w-4"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-medium ${
                                    task.completed ? 'line-through text-muted-foreground' : ''
                                  }`}
                                >
                                  {task.title}
                                </span>
                                {overdue && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                              </div>
                              {task.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-md">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5 md:hidden">
                                <Badge variant="outline" className={`text-[10px] shrink-0 ${priorityStyles[task.priority]}`}>
                                  {priorityLabels[task.priority]}
                                </Badge>
                                {task.dueTime && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {task.dueTime}
                                  </div>
                                )}
                                {ws && (
                                  <span className="text-xs text-muted-foreground">
                                    {ws.icon}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="hidden sm:flex items-center gap-2">
                              {task.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            <Badge variant="outline" className={`text-[10px] shrink-0 hidden md:inline-flex ${priorityStyles[task.priority]}`}>
                              {priorityLabels[task.priority]}
                            </Badge>

                            {ws && (
                              <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">
                                {ws.icon} {ws.name}
                              </span>
                            )}

                            {assigneeName && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 hidden lg:flex">
                                <User className="h-3 w-3" />
                                {assigneeName}
                              </div>
                            )}

                            <div className={`items-center gap-1 text-xs shrink-0 hidden md:flex ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                              {task.dueTime && (
                                <>
                                  <Clock className="h-3 w-3" />
                                  {task.dueTime}
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => setDeleteId(task.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all shrink-0 hidden md:block"
                              title="מחק משימה"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </SwipeableTask>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <p className="text-sm">אין משימות להצגה</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת משימה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את המשימה? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={() => { if (deleteId) { deleteTask(deleteId); setDeleteId(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RecurringTaskDialog task={recurringTask} onClose={() => setRecurringTask(null)} />
    </>
  );
}