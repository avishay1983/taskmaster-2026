import { create } from 'zustand';
import { Task, Notification, ViewMode, TaskStatus, Workspace } from './types';
import { supabase } from '@/integrations/supabase/client';

interface TaskStore {
  tasks: Task[];
  notifications: Notification[];
  workspaces: Workspace[];
  activeWorkspace: string | null;
  viewMode: ViewMode;
  searchQuery: string;
  isLoading: boolean;
  currentUser: string | null;

  loadFromDB: () => Promise<void>;
  setCurrentUser: (name: string) => void;
  logout: () => void;

  setActiveWorkspace: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;

  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  deleteAllTasks: () => void;
  toggleComplete: (id: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;

  addWorkspace: (workspace: Workspace) => void;
  deleteWorkspace: (id: string) => void;
  addMemberToWorkspace: (workspaceId: string, memberName: string) => void;
  removeMemberFromWorkspace: (workspaceId: string, memberName: string) => void;

  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  getFilteredTasks: () => Task[];
  getUnreadNotificationCount: () => number;
}

// Helper: convert DB row to Task
function dbToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    workspaceId: row.workspace_id,
    assigneeIds: row.assignee_ids || [],
    priority: row.priority,
    status: row.status,
    tags: row.tags || [],
    dueDate: row.due_date,
    dueTime: row.due_time || undefined,
    dueDay: row.due_day ?? undefined,
    reminderBefore: row.reminder_before || undefined,
    createdAt: row.created_at,
    completed: row.completed,
  };
}

// Helper: convert DB row to Workspace
function dbToWorkspace(row: any): Workspace {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    members: row.members || [],
  };
}

// Helper: convert DB row to Notification
function dbToNotification(row: any): Notification {
  return {
    id: row.id,
    type: row.type,
    taskId: row.task_id,
    taskTitle: row.task_title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  };
}

export const useTaskStore = create<TaskStore>()((set, get) => ({
  tasks: [],
  notifications: [],
  workspaces: [],
  activeWorkspace: null,
  viewMode: 'list',
  searchQuery: '',
  isLoading: true,
  currentUser: localStorage.getItem('currentUser'),
  setCurrentUser: (name) => {
    localStorage.setItem('currentUser', name);
    set({ currentUser: name });
  },
  logout: () => {
    localStorage.removeItem('currentUser');
    set({ currentUser: null, activeWorkspace: null });
  },

  loadFromDB: async () => {
    set({ isLoading: true });
    const [tasksRes, workspacesRes, notificationsRes] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('workspaces').select('*').order('created_at', { ascending: true }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    ]);
    const allWorkspaces = (workspacesRes.data || []).map(dbToWorkspace);
    const currentUser = get().currentUser;
    const loadedWorkspaces = currentUser
      ? allWorkspaces.filter(w => w.members.includes(currentUser))
      : allWorkspaces;
    const currentActive = get().activeWorkspace;
    const stillExists = currentActive && loadedWorkspaces.some(w => w.id === currentActive);
    set({
      tasks: (tasksRes.data || []).map(dbToTask),
      workspaces: loadedWorkspaces,
      notifications: (notificationsRes.data || []).map(dbToNotification),
      activeWorkspace: stillExists ? currentActive : null,
      isLoading: false,
    });
  },

  setActiveWorkspace: (id) => set({ activeWorkspace: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  addTask: (task) => {
    set((s) => ({ tasks: [task, ...s.tasks] }));
    supabase.from('tasks').insert({
      id: task.id,
      title: task.title,
      description: task.description,
      workspace_id: task.workspaceId,
      assignee_ids: task.assigneeIds,
      priority: task.priority,
      status: task.status,
      tags: task.tags,
      due_date: task.dueDate,
      due_time: task.dueTime || null,
      due_day: task.dueDay ?? null,
      reminder_before: task.reminderBefore || null,
      completed: task.completed,
      created_at: task.createdAt,
    }).then(({ error }) => {
      if (error) console.error('Error adding task:', error);
    });
  },

  updateTask: (id, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.workspaceId !== undefined) dbUpdates.workspace_id = updates.workspaceId;
    if (updates.assigneeIds !== undefined) dbUpdates.assignee_ids = updates.assigneeIds;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.dueTime !== undefined) dbUpdates.due_time = updates.dueTime;
    if (updates.dueDay !== undefined) dbUpdates.due_day = updates.dueDay;
    if (updates.reminderBefore !== undefined) dbUpdates.reminder_before = updates.reminderBefore;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if (Object.keys(dbUpdates).length > 0) {
      supabase.from('tasks').update(dbUpdates).eq('id', id).then(({ error }) => {
        if (error) console.error('Error updating task:', error);
      });
    }
  },

  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    supabase.from('tasks').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('Error deleting task:', error);
    });
  },

  deleteAllTasks: () => {
    const { activeWorkspace } = get();
    const tasksToDelete = activeWorkspace
      ? get().tasks.filter((t) => t.workspaceId === activeWorkspace)
      : get().tasks;
    set((s) => ({
      tasks: activeWorkspace
        ? s.tasks.filter((t) => t.workspaceId !== activeWorkspace)
        : [],
    }));
    const ids = tasksToDelete.map((t) => t.id);
    if (ids.length > 0) {
      supabase.from('tasks').delete().in('id', ids).then(({ error }) => {
        if (error) console.error('Error deleting tasks:', error);
      });
    }
  },

  toggleComplete: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;
    const newStatus = newCompleted ? 'done' : 'todo';
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, completed: newCompleted, status: newStatus } : t
      ),
    }));
    supabase.from('tasks').update({ completed: newCompleted, status: newStatus }).eq('id', id).then(({ error }) => {
      if (error) console.error('Error toggling task:', error);
    });
  },

  updateTaskStatus: (id, status) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, status, completed: status === 'done' } : t
      ),
    }));
    supabase.from('tasks').update({ status, completed: status === 'done' }).eq('id', id).then(({ error }) => {
      if (error) console.error('Error updating task status:', error);
    });
  },

  addWorkspace: (workspace) => {
    set((s) => ({ workspaces: [...s.workspaces, workspace] }));
    supabase.from('workspaces').insert({
      id: workspace.id,
      name: workspace.name,
      icon: workspace.icon,
      color: workspace.color,
      members: workspace.members,
    }).then(({ error }) => {
      if (error) console.error('Error adding workspace:', error);
    });
  },

  deleteWorkspace: (id) => {
    const remaining = get().workspaces.filter((w) => w.id !== id);
    set((s) => ({
      workspaces: remaining,
      tasks: s.tasks.filter((t) => t.workspaceId !== id),
      activeWorkspace: s.activeWorkspace === id ? (remaining.length > 0 ? remaining[0].id : null) : s.activeWorkspace,
    }));
    supabase.from('workspaces').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('Error deleting workspace:', error);
    });
  },

  addMemberToWorkspace: (workspaceId, memberName) => {
    const workspace = get().workspaces.find((w) => w.id === workspaceId);
    if (!workspace || workspace.members.includes(memberName)) return;
    const newMembers = [...workspace.members, memberName];
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === workspaceId ? { ...w, members: newMembers } : w
      ),
    }));
    supabase.from('workspaces').update({ members: newMembers }).eq('id', workspaceId).then(({ error }) => {
      if (error) console.error('Error adding member:', error);
    });
  },

  removeMemberFromWorkspace: (workspaceId, memberName) => {
    const workspace = get().workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return;
    const newMembers = workspace.members.filter((m) => m !== memberName);
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === workspaceId ? { ...w, members: newMembers } : w
      ),
    }));
    supabase.from('workspaces').update({ members: newMembers }).eq('id', workspaceId).then(({ error }) => {
      if (error) console.error('Error removing member:', error);
    });
  },

  addNotification: (notification) => {
    set((s) => ({ notifications: [notification, ...s.notifications] }));
    supabase.from('notifications').insert({
      id: notification.id,
      type: notification.type,
      task_id: notification.taskId,
      task_title: notification.taskTitle,
      message: notification.message,
      read: notification.read,
      created_at: notification.createdAt,
    }).then(({ error }) => {
      if (error) console.error('Error adding notification:', error);
    });
  },

  markNotificationRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
    supabase.from('notifications').update({ read: true }).eq('id', id).then(({ error }) => {
      if (error) console.error('Error marking notification read:', error);
    });
  },

  markAllNotificationsRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
    supabase.from('notifications').update({ read: true }).eq('read', false).then(({ error }) => {
      if (error) console.error('Error marking all notifications read:', error);
    });
  },

  getFilteredTasks: () => {
    const { tasks, activeWorkspace, searchQuery } = get();
    return tasks
      .filter((t) => !activeWorkspace || t.workspaceId === activeWorkspace)
      .filter(
        (t) =>
          !searchQuery ||
          t.title.includes(searchQuery) ||
          t.description.includes(searchQuery) ||
          t.tags.some((tag) => tag.includes(searchQuery))
      );
  },
  getUnreadNotificationCount: () =>
    get().notifications.filter((n) => !n.read).length,
}));
