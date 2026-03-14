import { useState } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { Task, Priority } from '@/lib/types';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format, isPast, isToday, isYesterday, isTomorrow, parseISO, startOfWeek, endOfWeek, isWithinInterval, isBefore } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar, Clock, User, AlertCircle, Trash2, Pencil } from 'lucide-react';
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
import { EditTaskModal } from './EditTaskModal';
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

type WeekSection = {
  sectionLabel: string;
  sectionType: 'overdue' | 'this-week' | 'future';
  dateGroups: { label: string; dateKey: string; tasks: Task[] }[];
};

function groupTasksByWeek(tasks: Task[]): WeekSection[] {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  const overdue: Record<string, Task[]> = {};
  const thisWeek: Record<string, Task[]> = {};
  const future: Record<string, Task[]> = {};

  const noDate: Task[] = [];

  for (const task of tasks) {
    if (!task.dueDate) {
      noDate.push(task);
      continue;
    }
    const key = task.dueDate.split('T')[0];
    const date = parseISO(key);

    if (isNaN(date.getTime())) {
      noDate.push(task);
      continue;
    }

    if (isPast(date) && !isToday(date)) {
      if (!overdue[key]) overdue[key] = [];
      overdue[key].push(task);
    } else if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
      if (!thisWeek[key]) thisWeek[key] = [];
      thisWeek[key].push(task);
    } else {
      if (!future[key]) future[key] = [];
      future[key].push(task);
    }
  }

  const toGroups = (groups: Record<string, Task[]>) =>
    Object.entries(groups)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([dateKey, tasks]) => ({ label: getDateLabel(dateKey), dateKey, tasks }));

  const sections: WeekSection[] = [];

  const overdueGroups = toGroups(overdue);
  if (overdueGroups.length > 0) {
    sections.push({ sectionLabel: '⚠️ באיחור', sectionType: 'overdue', dateGroups: overdueGroups });
  }

  const thisWeekGroups = toGroups(thisWeek);
  if (thisWeekGroups.length > 0) {
    sections.push({ sectionLabel: '📅 השבוע', sectionType: 'this-week', dateGroups: thisWeekGroups });
  }

  const futureGroups = toGroups(future);
  if (futureGroups.length > 0) {
    sections.push({ sectionLabel: '🔮 שבועות הבאים', sectionType: 'future', dateGroups: futureGroups });
  }

  return sections;
}

export function ListView() {
  const { getFilteredTasks, toggleComplete, deleteTask, workspaces } = useTaskStore();
  const [recurringTask, setRecurringTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const tasks = getFilteredTasks().sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const sections = groupTasksByWeek(tasks);

  const handleToggle = (task: Task) => {
    if (!task.completed) {
      setRecurringTask(task);
    }
    toggleComplete(task.id);
  };

  const isOverdue = (task: Task) => !task.completed && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

  const sectionStyles: Record<string, { bg: string; border: string; text: string }> = {
    'overdue': { bg: 'bg-destructive/5', border: 'border-destructive/30', text: 'text-destructive' },
    'this-week': { bg: 'bg-primary/5', border: 'border-primary/30', text: 'text-primary' },
    'future': { bg: 'bg-muted/50', border: 'border-border', text: 'text-muted-foreground' },
  };

  return (
    <>
      <div className="space-y-6" dir="rtl">
        {sections.map((section) => {
          const style = sectionStyles[section.sectionType];
          return (
            <div key={section.sectionType}>
              <div className={`flex items-center gap-2 py-2.5 px-3 mb-3 rounded-lg ${style.bg} border ${style.border}`}>
                <span className={`text-sm font-bold ${style.text}`}>
                  {section.sectionLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({section.dateGroups.reduce((sum, g) => sum + g.tasks.length, 0)})
                </span>
              </div>

              <div className="space-y-3 pr-1">
                {section.dateGroups.map(({ label, dateKey, tasks: dateTasks }) => {
                  const hasOverdue = dateTasks.some(isOverdue);
                  return (
                    <div key={dateKey}>
                      <div className={`sticky top-0 z-10 flex items-center gap-2 py-1.5 px-1 mb-1 backdrop-blur-sm bg-background/80 border-b ${hasOverdue ? 'border-destructive/30' : 'border-border/50'}`}>
                        <span className={`text-xs font-semibold ${hasOverdue ? 'text-destructive' : 'text-foreground'}`}>
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
                            const assigneeNames = task.assigneeIds;
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
                                    <div onClick={(e) => e.stopPropagation()}>
                                      <Checkbox
                                        checked={task.completed}
                                        onCheckedChange={() => handleToggle(task)}
                                        className="shrink-0 h-5 w-5 md:h-4 md:w-4"
                                      />
                                    </div>

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

                                    {assigneeNames.length > 0 && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 hidden lg:flex">
                                        <User className="h-3 w-3" />
                                        {assigneeNames.join(', ')}
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
                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => setEditTask(task)}
                                        className="p-1.5 rounded hover:bg-accent transition-all text-muted-foreground hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
                                        title="ערוך משימה"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setDeleteId(task.id)}
                                        className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground md:opacity-0 md:group-hover:opacity-100"
                                        title="מחק משימה"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
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
      <EditTaskModal task={editTask} onClose={() => setEditTask(null)} />
    </>
  );
}