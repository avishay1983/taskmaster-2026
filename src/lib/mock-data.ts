import { Task, Workspace, User, Notification } from './types';

export const workspaces: Workspace[] = [
  { id: 'personal', name: 'אישי', icon: '👤', color: 'hsl(220, 90%, 56%)', members: ['דני כהן'] },
  { id: 'home', name: 'בית', icon: '🏠', color: 'hsl(142, 71%, 45%)', members: ['דני כהן', 'מיכל לוי'] },
  { id: 'work', name: 'עבודה', icon: '💼', color: 'hsl(38, 92%, 50%)', members: ['דני כהן', 'מיכל לוי', 'יוסי אברהם'] },
];

export const users: User[] = [
  { id: 'user1', name: 'דני כהן', email: 'dani@example.com' },
  { id: 'user2', name: 'מיכל לוי', email: 'michal@example.com' },
  { id: 'user3', name: 'יוסי אברהם', email: 'yossi@example.com' },
];

export const currentUser = users[0];

const now = new Date();
const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
const twoDaysAgo = new Date(now); twoDaysAgo.setDate(now.getDate() - 2);
const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
const inThreeDays = new Date(now); inThreeDays.setDate(now.getDate() + 3);

export const initialTasks: Task[] = [
  {
    id: '1',
    title: 'לקנות מצרכים לשבת',
    description: 'חלב, לחם, ירקות, בשר, ופירות',
    workspaceId: 'home',
    assigneeIds: ['דני כהן'],
    priority: 'high',
    status: 'todo',
    tags: ['קניות', 'דחוף'],
    dueDate: yesterday.toISOString().split('T')[0],
    dueTime: '14:00',
    reminderBefore: '1h',
    createdAt: twoDaysAgo.toISOString(),
    completed: false,
  },
  {
    id: '2',
    title: 'להכין מצגת לפגישת צוות',
    description: 'מצגת סיכום רבעוני עם גרפים ונתונים',
    workspaceId: 'work',
    assigneeIds: ['דני כהן'],
    priority: 'high',
    status: 'in_progress',
    tags: ['פגישה', 'מצגת'],
    dueDate: tomorrow.toISOString().split('T')[0],
    dueTime: '09:00',
    reminderBefore: '1d',
    createdAt: twoDaysAgo.toISOString(),
    completed: false,
  },
  {
    id: '3',
    title: 'לתאם פגישה עם רופא שיניים',
    description: 'בדיקה שנתית - לבדוק זמינות ביום שלישי או רביעי',
    workspaceId: 'personal',
    assigneeIds: ['דני כהן'],
    priority: 'medium',
    status: 'todo',
    tags: ['בריאות'],
    dueDate: inThreeDays.toISOString().split('T')[0],
    dueTime: '10:00',
    reminderBefore: '1d',
    createdAt: yesterday.toISOString(),
    completed: false,
  },
  {
    id: '4',
    title: 'לתקן את הברז במטבח',
    description: 'הברז מטפטף, צריך להחליף אטם',
    workspaceId: 'home',
    assigneeIds: ['מיכל לוי'],
    priority: 'low',
    status: 'todo',
    tags: ['תחזוקה'],
    dueDate: nextWeek.toISOString().split('T')[0],
    reminderBefore: '1d',
    createdAt: yesterday.toISOString(),
    completed: false,
  },
  {
    id: '5',
    title: 'לשלוח דוח חודשי למנהל',
    description: 'דוח ביצועים חודשי כולל KPIs',
    workspaceId: 'work',
    assigneeIds: ['דני כהן'],
    priority: 'medium',
    status: 'done',
    tags: ['דוחות'],
    dueDate: twoDaysAgo.toISOString().split('T')[0],
    dueTime: '17:00',
    reminderBefore: '2h',
    createdAt: twoDaysAgo.toISOString(),
    completed: true,
  },
];

export const initialNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'overdue',
    taskId: '1',
    taskTitle: 'לקנות מצרכים לשבת',
    message: 'המשימה עברה את מועד היעד!',
    read: false,
    createdAt: now.toISOString(),
  },
  {
    id: 'n2',
    type: 'due',
    taskId: '2',
    taskTitle: 'להכין מצגת לפגישת צוות',
    message: 'המשימה מתקרבת - מחר בשעה 09:00',
    read: false,
    createdAt: now.toISOString(),
  },
  {
    id: 'n3',
    type: 'assigned',
    taskId: '4',
    taskTitle: 'לתקן את הברז במטבח',
    message: 'מיכל לוי שויכה למשימה',
    read: true,
    createdAt: yesterday.toISOString(),
  },
];
