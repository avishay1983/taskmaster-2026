export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type ViewMode = 'list' | 'kanban';

export interface Group {
  id: string;
  name: string;
  icon: string;
  members: string[];
  createdBy: string;
}

export interface Workspace {
  id: string;
  name: string;
  icon: string;
  color: string;
  members: string[]; // member names
  groupId?: string;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  workspaceId: string;
  assigneeIds: string[];
  priority: Priority;
  status: TaskStatus;
  tags: string[];
  dueDate: string;
  dueTime?: string;
  dueDay?: number; // 0=Sunday, 1=Monday, etc. — recurring weekly day
  reminderBefore?: string; // e.g. "1h", "30m", "1d"
  createdAt: string;
  completed: boolean;
  isBacklog?: boolean;
}

export interface Notification {
  id: string;
  type: 'due' | 'assigned' | 'overdue';
  taskId: string;
  taskTitle: string;
  message: string;
  read: boolean;
  createdAt: string;
}
