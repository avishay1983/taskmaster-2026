import { useState } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, Search, List, Columns3, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import shabbatIcon from '@/assets/shabbat-icon.png';
import taskmasterLogo from '@/assets/taskmaster-logo.png';
import { NotificationsDropdown } from './NotificationsDropdown';
import { CreateTaskModal } from './CreateTaskModal';

const SPECIAL_ICONS: Record<string, string> = { shabbat: shabbatIcon };

function WorkspaceIcon({ icon }: { icon: string }) {
  if (SPECIAL_ICONS[icon]) {
    return <img src={SPECIAL_ICONS[icon]} alt={icon} className="inline-block w-4 h-4" />;
  }
  return <span className="text-sm">{icon}</span>;
}

export function AppHeader() {
  const { viewMode, setViewMode, searchQuery, setSearchQuery, getUnreadNotificationCount, activeWorkspace, workspaces, setActiveWorkspace } =
    useTaskStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const unreadCount = getUnreadNotificationCount();
  const ws = activeWorkspace && activeWorkspace !== 'backlog' ? workspaces.find((w) => w.id === activeWorkspace) : null;
  const isBacklog = activeWorkspace === 'backlog';

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-sm px-3 md:px-4">
        <SidebarTrigger className="shrink-0" />

        {/* Workspace switcher */}
        {(ws || isBacklog) && (
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg font-medium px-2">
                {isBacklog ? (
                  <>
                    <span className="text-sm">📋</span>
                    <span className="max-w-[100px] truncate">Backlog</span>
                  </>
                ) : ws ? (
                  <>
                    <WorkspaceIcon icon={ws.icon} />
                    <span className="max-w-[100px] truncate">{ws.name}</span>
                  </>
                ) : null}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
              <DropdownMenuItem
                onClick={() => setActiveWorkspace('backlog')}
                className={`gap-2 ${isBacklog ? 'bg-accent font-medium' : ''}`}
              >
                <span className="text-sm">📋</span>
                <span>Backlog</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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


      <CreateTaskModal open={showCreateTask} onClose={() => setShowCreateTask(false)} />
    </>
  );
}
