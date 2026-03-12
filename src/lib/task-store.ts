import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, Notification, ViewMode, TaskStatus, Workspace } from './types';
import { initialTasks, initialNotifications, workspaces as initialWorkspaces } from './mock-data';

interface TaskStore {
  tasks: Task[];
  notifications: Notification[];
  workspaces: Workspace[];
  activeWorkspace: string | null;
  viewMode: ViewMode;
  searchQuery: string;
  
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
  
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  
  getFilteredTasks: () => Task[];
  getUnreadNotificationCount: () => number;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: initialTasks,
      notifications: initialNotifications,
      workspaces: initialWorkspaces,
      activeWorkspace: null,
      viewMode: 'list',
      searchQuery: '',

      setActiveWorkspace: (id) => set({ activeWorkspace: id }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
      updateTask: (id, updates) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      deleteAllTasks: () => {
        const { activeWorkspace } = get();
        set((s) => ({
          tasks: activeWorkspace
            ? s.tasks.filter((t) => t.workspaceId !== activeWorkspace)
            : [],
        }));
      },
      toggleComplete: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, completed: !t.completed, status: !t.completed ? 'done' : 'todo' }
              : t
          ),
        })),
      updateTaskStatus: (id, status) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, status, completed: status === 'done' }
              : t
          ),
        })),

      addWorkspace: (workspace) => set((s) => ({ workspaces: [...s.workspaces, workspace] })),
      deleteWorkspace: (id) =>
        set((s) => ({
          workspaces: s.workspaces.filter((w) => w.id !== id),
          tasks: s.tasks.filter((t) => t.workspaceId !== id),
          activeWorkspace: s.activeWorkspace === id ? null : s.activeWorkspace,
        })),
      addMemberToWorkspace: (workspaceId, memberName) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === workspaceId && !w.members.includes(memberName)
              ? { ...w, members: [...w.members, memberName] }
              : w
          ),
        })),
      removeMemberFromWorkspace: (workspaceId, memberName) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === workspaceId
              ? { ...w, members: w.members.filter((m) => m !== memberName) }
              : w
          ),
        })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

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
    }),
    {
      name: 'task-manager-storage',
      partialize: (state) => ({
        tasks: state.tasks,
        workspaces: state.workspaces,
        notifications: state.notifications,
        viewMode: state.viewMode,
      }),
    }
  )
);
