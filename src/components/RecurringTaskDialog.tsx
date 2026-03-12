import { useState } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { Task } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, RotateCcw } from 'lucide-react';
import { addDays, addWeeks, addMonths, format } from 'date-fns';

interface Props {
  task: Task | null;
  onClose: () => void;
}

export function RecurringTaskDialog({ task, onClose }: Props) {
  const { addTask } = useTaskStore();
  const [customDate, setCustomDate] = useState('');

  if (!task) return null;

  const scheduleAgain = (newDate: Date) => {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      dueDate: format(newDate, 'yyyy-MM-dd'),
      completed: false,
      status: 'todo',
      createdAt: new Date().toISOString(),
    };
    addTask(newTask);
    onClose();
  };

  const options = [
    { label: 'מחר', date: addDays(new Date(), 1) },
    { label: 'בעוד שבוע', date: addWeeks(new Date(), 1) },
    { label: 'בעוד חודש', date: addMonths(new Date(), 1) },
  ];

  return (
    <Dialog open={!!task} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="h-4 w-4" />
            תזמן שוב?
          </DialogTitle>
          <DialogDescription className="text-sm">
            האם תרצה לתזמן את "{task.title}" שוב?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {options.map((opt) => (
            <Button
              key={opt.label}
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => scheduleAgain(opt.date)}
            >
              <CalendarDays className="h-4 w-4" />
              {opt.label}
              <span className="text-muted-foreground text-xs mr-auto">
                {format(opt.date, 'dd/MM/yyyy')}
              </span>
            </Button>
          ))}

          <div className="flex gap-2">
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="flex-1 h-9"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={!customDate}
              onClick={() => scheduleAgain(new Date(customDate))}
            >
              בחר
            </Button>
          </div>

          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onClose}>
            לא, תודה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
