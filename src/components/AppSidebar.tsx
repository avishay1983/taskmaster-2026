import { useState, useEffect } from 'react';
import { PushDebugPanel } from './PushDebugPanel';
import { useTaskStore } from '@/lib/task-store';
import { Workspace } from '@/lib/types';
import { WorkspaceMembersDialog } from './WorkspaceMembersDialog';
import { InviteLinkDialog } from './InviteLinkDialog';
import { CreateGroupDialog } from './CreateGroupDialog';
import { supabase } from '@/integrations/supabase/client';
import { usePushStatus, PushStatus } from '@/hooks/usePushStatus';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Trash2, Users, LogOut, Bell, BellOff, BellRing, AlertTriangle, Bug, Archive, Link2, FolderPlus } from 'lucide-react';

const pushStatusConfig: Record<PushStatus, { icon: typeof Bell; label: string; color: string; description: string }> = {
  loading: { icon: Bell, label: 'בודק...', color: 'text-muted-foreground', description: 'בודק מצב התראות...' },
  subscribed: { icon: BellRing, label: 'התראות פעילות', color: 'text-emerald-600', description: 'התראות Push מופעלות ופועלות' },
  'not-subscribed': { icon: Bell, label: 'התראות כבויות', color: 'text-amber-500', description: 'לחץ כדי להפעיל התראות Push' },
  denied: { icon: BellOff, label: 'התראות חסומות', color: 'text-destructive', description: 'הרשאת התראות חסומה בדפדפן. יש לשנות בהגדרות הדפדפן.' },
  unsupported: { icon: AlertTriangle, label: 'לא נתמך', color: 'text-muted-foreground', description: 'הדפדפן אינו תומך בהתראות Push' },
};

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
  const { activeWorkspace, setActiveWorkspace, tasks, workspaces, groups, addWorkspace, deleteWorkspace, currentUser, logout } = useTaskStore();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { status: pushStatus, recheck: recheckPush } = usePushStatus();

  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [membersWsId, setMembersWsId] = useState<string | null>(null);
  const [showPushDebug, setShowPushDebug] = useState(false);
  const [inviteWsId, setInviteWsId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
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

  const backlogCount = tasks.filter((t) => t.isBacklog && !t.completed).length;

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
                {/* Backlog item */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setActiveWorkspace('backlog')}
                    className={`gap-3 rounded-lg transition-colors ${
                      activeWorkspace === 'backlog'
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <Archive className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <div className="flex flex-1 items-center justify-between">
                        <span>Backlog</span>
                        <span className="text-xs text-muted-foreground">{backlogCount}</span>
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
                                setInviteWsId(ws.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent transition-all"
                              title="הזמנה למרחב"
                            >
                              <Link2 className="h-3 w-3" />
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

          {/* Groups Section */}
          {groups.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {!collapsed && 'קבוצות'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {groups.map((group) => {
                    const groupWorkspaces = workspaces.filter(w => w.groupId === group.id);
                    return (
                      <SidebarMenuItem key={group.id}>
                        <div className="px-2 py-1.5">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                            <span>{group.icon}</span>
                            {!collapsed && <span>{group.name}</span>}
                          </div>
                          {!collapsed && groupWorkspaces.length > 0 && (
                            <div className="mr-4 space-y-0.5">
                              {groupWorkspaces.map((ws) => (
                                <button
                                  key={ws.id}
                                  onClick={() => setActiveWorkspace(ws.id)}
                                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors ${
                                    activeWorkspace === ws.id
                                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                      : 'hover:bg-sidebar-accent/50'
                                  }`}
                                >
                                  <IconDisplay icon={ws.icon} className="text-xs" />
                                  <span className="truncate">{ws.name}</span>
                                  <span className="text-xs text-muted-foreground mr-auto">{getTaskCount(ws.id)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Create Group Button */}
          {!collapsed && (
            <div className="px-3 py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateGroup(true)}
                className="w-full gap-1.5 text-xs"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                קבוצה חדשה
              </Button>
            </div>
          )}
        </SidebarContent>

        {currentUser && (
          <SidebarFooter className="p-2 space-y-1">
            {/* Push Status Indicator */}
            {!collapsed && (() => {
              const config = pushStatusConfig[pushStatus];
              const Icon = config.icon;
              const canSubscribe = pushStatus === 'not-subscribed';

              return (
                <button
                  onClick={async () => {
                    if (canSubscribe) {
                      const permission = await Notification.requestPermission();
                      if (permission === 'granted') {
                        recheckPush();
                      } else {
                        recheckPush();
                      }
                    }
                  }}
                  className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-right text-xs transition-colors ${
                    canSubscribe ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default'
                  }`}
                  title={config.description}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${config.color}`}>{config.label}</div>
                    {pushStatus === 'denied' && (
                      <div className="text-[10px] text-destructive/80 mt-0.5 leading-tight">
                        שנה הרשאות בהגדרות הדפדפן
                      </div>
                    )}
                  </div>
                  {pushStatus === 'subscribed' && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  )}
                </button>
              );
            })()}

            <div className="flex gap-1">
              <Button
                variant="ghost"
                onClick={() => logout()}
                className="flex-1 justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>יציאה ({currentUser})</span>}
              </Button>
              {!collapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPushDebug(true)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  title="Push Debug"
                >
                  <Bug className="h-4 w-4" />
                </Button>
              )}
            </div>
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
            {allUsers.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">חברים</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {allUsers.map((user) => (
                    <label
                      key={user}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm cursor-pointer transition-colors ${
                        selectedMembers.includes(user)
                          ? 'bg-primary/10 text-primary border border-primary/30'
                          : 'bg-secondary hover:bg-secondary/80 border border-transparent'
                      }`}
                    >
                      <Checkbox
                        checked={selectedMembers.includes(user)}
                        onCheckedChange={() => toggleMember(user)}
                        className="h-3.5 w-3.5"
                      />
                      {user}
                    </label>
                  ))}
                </div>
              </div>
            )}
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

      <PushDebugPanel open={showPushDebug} onClose={() => setShowPushDebug(false)} />

      {/* Invite Link Dialog */}
      {inviteWsId && (
        <InviteLinkDialog
          workspaceId={inviteWsId}
          open={!!inviteWsId}
          onClose={() => setInviteWsId(null)}
        />
      )}

      {/* Create Group Dialog */}
      <CreateGroupDialog open={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
    </>
  );
}
