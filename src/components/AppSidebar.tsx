import { useState, useEffect } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { Workspace } from '@/lib/types';
import { WorkspaceMembersDialog } from './WorkspaceMembersDialog';
import { supabase } from '@/integrations/supabase/client';
import shabbatIcon from '@/assets/shabbat-icon.png';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { Plus, Trash2, Users, LogOut } from 'lucide-react';

const EMOJI_OPTIONS = ['📁', '🎯', '💡', '🔥', '⭐', '🏠', '💼', '👤', '📚', '🎨', '🛠️', '🌍', 'shabbat'];

const SPECIAL_ICONS: Record<string, string> = {
  shabbat: shabbatIcon,
};

function IconDisplay({ icon, className = '' }: { icon: string; className?: string }) {
  if (SPECIAL_ICONS[icon]) {
    return <img src={SPECIAL_ICONS[icon]} alt={icon} className={`inline-block ${className}`} style={{ width: '1.2em', height: '1.2em' }} />;
  }
  return <span className={className}>{icon}</span>;
}

export function AppSidebar() {
  const { activeWorkspace, setActiveWorkspace, tasks, workspaces, addWorkspace, deleteWorkspace, currentUser, logout } = useTaskStore();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [membersWsId, setMembersWsId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📁');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<string[]>([]);

  // Fetch all known users from workspaces members + device_registrations
  useEffect(() => {
    const fetchUsers = async () => {
      const membersFromWorkspaces = new Set<string>();
      // Get all workspace members from store
      workspaces.forEach(w => w.members.forEach(m => membersFromWorkspaces.add(m)));
      
      // Get users from device_registrations
      const { data } = await supabase.from('device_registrations').select('user_name');
      if (data) data.forEach(row => membersFromWorkspaces.add(row.user_name));
      
      setAllUsers(Array.from(membersFromWorkspaces).sort());
    };
    if (showAdd) fetchUsers();
  }, [showAdd, workspaces]);

  const getTaskCount = (wsId: string) =>
    tasks.filter((t) => t.workspaceId === wsId && !t.completed).length;

  const toggleMember = (name: string) => {
    setSelectedMembers(prev => 
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    );
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const ws: Workspace = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      icon: newIcon,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
      members: selectedMembers,
    };
    addWorkspace(ws);
    setNewName('');
    setNewIcon('📁');
    setSelectedMembers([]);
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
                      <IconDisplay icon={ws.icon} className="text-base shrink-0" />
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

        {currentUser && (
          <SidebarFooter className="p-2">
            <Button
              variant="ghost"
              onClick={logout}
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>יציאה ({currentUser})</span>}
            </Button>
          </SidebarFooter>
        )}
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
                    <IconDisplay icon={emoji} />
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
