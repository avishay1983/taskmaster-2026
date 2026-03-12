import { useState } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { Workspace } from '@/lib/types';
import { WorkspaceMembersDialog } from './WorkspaceMembersDialog';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { LayoutDashboard, Plus, Trash2, Users } from 'lucide-react';

const EMOJI_OPTIONS = ['📁', '🎯', '💡', '🔥', '⭐', '🏠', '💼', '👤', '📚', '🎨', '🛠️', '🌍', '🕯️'];

export function AppSidebar() {
  const { activeWorkspace, setActiveWorkspace, tasks, workspaces, addWorkspace, deleteWorkspace } = useTaskStore();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [membersWsId, setMembersWsId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📁');

  const getTaskCount = (wsId: string) =>
    tasks.filter((t) => t.workspaceId === wsId && !t.completed).length;
  const totalOpen = tasks.filter((t) => !t.completed).length;

  const handleAdd = () => {
    if (!newName.trim()) return;
    const ws: Workspace = {
      id: `ws_${Date.now()}`,
      name: newName.trim(),
      icon: newIcon,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
      members: [],
    };
    addWorkspace(ws);
    setNewName('');
    setNewIcon('📁');
    setShowAdd(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteWorkspace(deleteId);
      setDeleteId(null);
    }
  };

  const wsToDelete = workspaces.find((w) => w.id === deleteId);

  return (
    <>
      <Sidebar side="right" collapsible="icon" className="border-l border-sidebar-border">
        <SidebarContent className="pt-4">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              {!collapsed && 'מרחבי עבודה'}
              {!collapsed && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="p-0.5 rounded hover:bg-sidebar-accent/50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setActiveWorkspace(null)}
                    className={`gap-3 rounded-lg transition-colors ${
                      activeWorkspace === null
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <div className="flex flex-1 items-center justify-between">
                        <span>הכל</span>
                        <span className="text-xs text-muted-foreground">{totalOpen}</span>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {workspaces.map((ws) => (
                  <SidebarMenuItem key={ws.id}>
                    <SidebarMenuButton
                      onClick={() => setActiveWorkspace(ws.id)}
                      className={`gap-3 rounded-lg transition-colors group ${
                        activeWorkspace === ws.id
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'hover:bg-sidebar-accent/50'
                      }`}
                    >
                      <span className="text-base shrink-0">{ws.icon}</span>
                      {!collapsed && (
                        <div className="flex flex-1 items-center justify-between">
                          <span>{ws.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {getTaskCount(ws.id)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMembersWsId(ws.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent transition-all"
                              title="ניהול חברים"
                            >
                              <Users className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(ws.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Add Workspace Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>מרחב עבודה חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">אייקון</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewIcon(emoji)}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                      newIcon === emoji
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">שם</label>
              <Input
                placeholder="שם מרחב העבודה"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={!newName.trim()}>
              צור מרחב עבודה
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת מרחב עבודה</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את "{wsToDelete?.icon} {wsToDelete?.name}"? כל המשימות במרחב זה יימחקו לצמיתות.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Members Dialog */}
      {membersWsId && (
        <WorkspaceMembersDialog
          workspaceId={membersWsId}
          open={!!membersWsId}
          onClose={() => setMembersWsId(null)}
        />
      )}
    </>
  );
}
