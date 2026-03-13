import { useState, useRef } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { Task, TaskStatus, Priority } from '@/lib/types';

import { Badge } from '@/components/ui/badge';
import { format, isPast, isToday } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar, AlertCircle, GripVertical, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { RecurringTaskDialog } from './RecurringTaskDialog';
import { EditTaskModal } from './EditTaskModal';
import { motion } from 'framer-motion';
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
import { useIsMobile } from '@/hooks/use-mobile';

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'לביצוע', color: 'bg-secondary' },
  { id: 'in_progress', label: 'בתהליך', color: 'bg-primary/10' },
  { id: 'done', label: 'בוצע', color: 'bg-success/10' },
];

const priorityDot: Record<Priority, string> = {
  high: 'bg-destructive',
  medium: 'bg-warning',
  low: 'bg-success',
};

export function KanbanView() {
  const { getFilteredTasks, updateTaskStatus, deleteTask, workspaces } = useTaskStore();
  const [recurringTask, setRecurringTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeCol, setActiveCol] = useState(0);
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const tasks = getFilteredTasks();

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedId) {
      const task = tasks.find((t) => t.id === draggedId);
      if (task && task.status !== status) {
        if (status === 'done' && !task.completed) {
          setRecurringTask(task);
        }
        updateTaskStatus(draggedId, status);
      }
      setDraggedId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const isOverdue = (task: Task) =>
    !task.completed && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

  const scrollToCol = (idx: number) => {
    const clamped = Math.max(0, Math.min(columns.length - 1, idx));
    setActiveCol(clamped);
    if (scrollRef.current) {
      const colWidth = scrollRef.current.scrollWidth / columns.length;
      scrollRef.current.scrollTo({ left: colWidth * clamped, behavior: 'smooth' });
    }
  };

  // Mobile: move task to next/prev column via long press or buttons
  const moveTask = (taskId: string, direction: 'next' | 'prev') => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const currentIdx = columns.findIndex((c) => c.id === task.status);
    const targetIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (targetIdx < 0 || targetIdx >= columns.length) return;
    const targetStatus = columns[targetIdx].id;
    if (targetStatus === 'done' && !task.completed) {
      setRecurringTask(task);
    }
    updateTaskStatus(taskId, targetStatus);
  };

  return (
    <>
      {/* Mobile column navigation dots */}
      {isMobile && (
        <div className="flex items-center justify-center gap-3 mb-3" dir="rtl">
          {columns.map((col, idx) => (
            <button
              key={col.id}
              onClick={() => scrollToCol(idx)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCol === idx
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {col.label}
            </button>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none"
        dir="rtl"
        onScroll={(e) => {
          if (isMobile && scrollRef.current) {
            const colWidth = scrollRef.current.scrollWidth / columns.length;
            const newIdx = Math.round(scrollRef.current.scrollLeft / colWidth);
            if (newIdx !== activeCol) setActiveCol(newIdx);
          }
        }}
      >
        {columns.map((col, colIdx) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className="flex-shrink-0 w-[85vw] md:w-auto md:flex-1 min-w-[280px] flex flex-col snap-center"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 ${col.color}`}>
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="secondary" className="text-xs h-5 min-w-5 justify-center">
                  {colTasks.length}
                </Badge>
              </div>

              <div className="flex-1 space-y-2">
                {colTasks.map((task) => {
                  const ws = workspaces.find((w) => w.id === task.workspaceId);
                  const assigneeNames = task.assigneeIds;
                  const overdue = isOverdue(task);
                  const canMoveNext = colIdx < columns.length - 1;
                  const canMovePrev = colIdx > 0;

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      draggable={!isMobile}
                      onDragStart={(e) => !isMobile && handleDragStart(e as any, task.id)}
                      onClick={() => setEditTask(task)}
                      className={`rounded-xl border bg-card p-3 shadow-sm transition-shadow cursor-pointer ${
                        isMobile ? 'active:shadow-md' : 'cursor-grab active:cursor-grabbing hover:shadow-md'
                      } ${overdue ? 'border-destructive/30' : 'border-border'} ${
                        draggedId === task.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2 group">
                        {!isMobile && (
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(task.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all shrink-0 mt-0.5 md:block hidden"
                          title="מחק משימה"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className={`h-2 w-2 rounded-full shrink-0 ${priorityDot[task.priority]}`} />
                            <span className={`text-sm font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <div className={`flex items-center gap-1 text-xs ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {overdue && <AlertCircle className="h-3 w-3" />}
                              <Calendar className="h-3 w-3" />
                              {format(new Date(task.dueDate), 'dd/MM', { locale: he })}
                            </div>

                            {ws && (
                              <span className="text-xs text-muted-foreground">
                                {ws.icon}
                              </span>
                            )}

                            {assigneeNames.length > 0 && (
                              <span className="text-xs text-muted-foreground mr-auto">
                                {assigneeNames.map(n => n.split(' ')[0]).join(', ')}
                              </span>
                            )}
                          </div>

                          {task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {task.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Mobile: move buttons */}
                          {isMobile && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                              {canMovePrev && (
                                <button
                                  onClick={() => moveTask(task.id, 'prev')}
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md bg-secondary transition-colors"
                                >
                                  <ChevronRight className="h-3 w-3" />
                                  {columns[colIdx - 1].label}
                                </button>
                              )}
                              {canMoveNext && (
                                <button
                                  onClick={() => moveTask(task.id, 'next')}
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md bg-secondary transition-colors mr-auto"
                                >
                                  {columns[colIdx + 1].label}
                                  <ChevronLeft className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
