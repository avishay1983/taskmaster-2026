import { useState } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, Search, List, Columns3, Trash2, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import shabbatIcon from '@/assets/shabbat-icon.png';
import { NotificationsDropdown } from './NotificationsDropdown';
import { CreateTaskModal } from './CreateTaskModal';
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

export function AppHeader() {
  const { viewMode, setViewMode, searchQuery, setSearchQuery, getUnreadNotificationCount, deleteAllTasks, activeWorkspace, workspaces } =
    useTaskStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const unreadCount = getUnreadNotificationCount();
  const ws = activeWorkspace ? workspaces.find((w) => w.id === activeWorkspace) : null;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-sm px-3 md:px-4">
        <SidebarTrigger className="shrink-0" />

        {/* Workspace switcher */}
        {ws && (
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg font-medium px-2">
                <WorkspaceIcon icon={ws.icon} />
                <span className="max-w-[100px] truncate">{ws.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
              {workspaces.map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  onClick={() => setActiveWorkspace(w.id)}
                  className={`gap-2 ${w.id === activeWorkspace ? 'bg-accent font-medium' : ''}`}
                >
                  <WorkspaceIcon icon={w.icon} />
                  <span>{w.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Desktop: inline button */}
        <Button
          size="sm"
          onClick={() => setShowCreateTask(true)}
          className="gap-1.5 rounded-lg font-medium hidden md:flex"
        >
          <Plus className="h-4 w-4" />
          <span>משימה חדשה</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowDeleteAll(true)}
          className="gap-1.5 rounded-lg font-medium hidden md:flex text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
        >
          <Trash2 className="h-4 w-4" />
          <span>מחק הכל</span>
        </Button>

        <div className="relative flex-1 max-w-md mx-auto">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="חיפוש משימות..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 h-9 rounded-lg bg-secondary border-0 text-sm"
            dir="rtl"
          />
        </div>

        <div className="flex items-center gap-1">
          {/* Mobile: delete all icon */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive md:hidden"
            onClick={() => setShowDeleteAll(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <div className="flex items-center rounded-lg border border-border p-0.5">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setViewMode('kanban')}
            >
              <Columns3 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-0.5 -left-0.5 h-4 min-w-4 rounded-full px-1 text-[10px] font-bold bg-destructive text-destructive-foreground border-2 border-background">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            {showNotifications && (
              <NotificationsDropdown onClose={() => setShowNotifications(false)} />
            )}
          </div>
        </div>
      </header>

      {/* Mobile FAB for adding tasks */}
      <Button
        size="icon"
        onClick={() => setShowCreateTask(true)}
        className="fixed bottom-6 left-6 z-40 h-14 w-14 rounded-full shadow-lg md:hidden"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Delete All Confirmation */}
      <AlertDialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת כל המשימות</AlertDialogTitle>
            <AlertDialogDescription>
              {ws
                ? `האם אתה בטוח שברצונך למחוק את כל המשימות ב"${ws.icon} ${ws.name}"? פעולה זו לא ניתנת לביטול.`
                : 'האם אתה בטוח שברצונך למחוק את כל המשימות? פעולה זו לא ניתנת לביטול.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={() => { deleteAllTasks(); setShowDeleteAll(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק הכל
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateTaskModal open={showCreateTask} onClose={() => setShowCreateTask(false)} />
    </>
  );
}
