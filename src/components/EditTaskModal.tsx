import { useState, useEffect } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { Task, Priority } from '@/lib/types';
import { nextDay, format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';

interface Props {
  task: Task | null;
  onClose: () => void;
}

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  high: { label: 'גבוה', color: 'bg-destructive text-destructive-foreground' },
  medium: { label: 'בינוני', color: 'bg-warning text-warning-foreground' },
  low: { label: 'נמוך', color: 'bg-success text-success-foreground' },
};

const reminderOptions = [
  { value: '15m', label: '15 דקות לפני' },
  { value: '30m', label: '30 דקות לפני' },
  { value: '1h', label: 'שעה לפני' },
  { value: '2h', label: 'שעתיים לפני' },
  { value: '1d', label: 'יום לפני' },
];

const DAY_NAMES = [
  { value: 0, label: 'יום ראשון' },
  { value: 1, label: 'יום שני' },
  { value: 2, label: 'יום שלישי' },
  { value: 3, label: 'יום רביעי' },
  { value: 4, label: 'יום חמישי' },
  { value: 5, label: 'יום שישי' },
  { value: 6, label: 'שבת' },
];

type DateMode = 'date' | 'day';

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNextDayDate(dayOfWeek: number): string {
  const today = new Date();
  const todayDay = today.getDay();
  if (todayDay === dayOfWeek) return toLocalDateString(today);
  const next = nextDay(today, dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6);
  return toLocalDateString(next);
}

export function EditTaskModal({ task, onClose }: Props) {
  const { updateTask, workspaces } = useTaskStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>('medium');
  const [dateMode, setDateMode] = useState<DateMode>('date');
  const [dueDate, setDueDate] = useState('');
  const [dueDay, setDueDay] = useState<number | null>(null);
  const [dueTime, setDueTime] = useState('');
  const [reminderBefore, setReminderBefore] = useState('1h');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setWorkspaceId(task.workspaceId);
      setAssigneeIds(task.assigneeIds);
      setPriority(task.priority);
      setDueDate(task.dueDate.split('T')[0]);
      setDueTime(task.dueTime || '');
      setDueDay(task.dueDay ?? null);
      setDateMode(task.dueDay !== undefined && task.dueDay !== null ? 'day' : 'date');
      setReminderBefore(task.reminderBefore || '1h');
      setTags([...task.tags]);
      setTagInput('');
    }
  }, [task]);

  const selectedWorkspace = workspaces.find((w) => w.id === workspaceId);
  const members = selectedWorkspace?.members || [];

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleSubmit = () => {
    if (!task || !title.trim()) return;

    let finalDueDate = dueDate || toLocalDateString(new Date());
    let finalDueDay: number | undefined;

    if (dateMode === 'day' && dueDay !== null) {
      finalDueDate = getNextDayDate(dueDay);
      finalDueDay = dueDay;
    }

    updateTask(task.id, {
      title,
      description,
      workspaceId,
      assigneeIds,
      priority,
      tags,
      dueDate: finalDueDate,
      dueTime: dueTime || undefined,
      dueDay: finalDueDay,
      reminderBefore,
    });
    onClose();
  };

  return (
    <Dialog open={!!task} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg">עריכת משימה</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto px-1">
          <Input
            placeholder="שם המשימה"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base font-medium"
            autoFocus
          />
          <Textarea
            placeholder="תיאור (אופציונלי)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {task?.isBacklog ? 'מרחב עבודה (אופציונלי)' : 'מרחב עבודה'}
              </label>
              <Select value={workspaceId || 'none'} onValueChange={(v) => setWorkspaceId(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="ללא מרחב" /></SelectTrigger>
                <SelectContent>
                  {task?.isBacklog && (
                    <SelectItem value="none">ללא מרחב</SelectItem>
                  )}
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.icon} {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">אחראים</label>
              {members.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {members.map((name) => (
                    <label key={name} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={assigneeIds.includes(name)}
                        onCheckedChange={(checked) => {
                          setAssigneeIds(prev =>
                            checked ? [...prev, name] : prev.filter(n => n !== name)
                          );
                        }}
                      />
                      {name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">אין חברים במרחב זה.</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">עדיפות</label>
            <div className="flex gap-2">
              {(Object.keys(priorityConfig) as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    priority === p
                      ? priorityConfig[p].color
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {priorityConfig[p].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">מועד יעד</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setDateMode('date')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  dateMode === 'date'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                📅 תאריך מדויק
              </button>
              <button
                onClick={() => setDateMode('day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  dateMode === 'day'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                🔄 יום בשבוע
              </button>
            </div>

            {dateMode === 'date' ? (
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
                <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="h-9" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {DAY_NAMES.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => setDueDay(day.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        dueDay === day.value
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {dueDay !== null && (
                  <p className="text-xs text-muted-foreground">
                    📌 המשימה תיקבע ל-{DAY_NAMES[dueDay].label} הקרוב ({format(new Date(getNextDayDate(dueDay)), 'dd/MM/yyyy', { locale: he })})
                  </p>
                )}
                <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="h-9" placeholder="שעת יעד (אופציונלי)" />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">תזכורת</label>
            <Select value={reminderBefore} onValueChange={setReminderBefore}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {reminderOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">תגיות</label>
            <div className="flex gap-2">
              <Input
                placeholder="הוסף תגית"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="h-9 flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleAddTag} className="h-9">הוסף</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <button onClick={() => setTags(tags.filter((t) => t !== tag))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!title.trim()}>
            שמור שינויים
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
