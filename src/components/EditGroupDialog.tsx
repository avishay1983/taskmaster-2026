import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTaskStore } from '@/lib/task-store';
import { Group } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Loader2, UserPlus, X, Trash2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
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

const GROUP_ICONS = ['👥', '👨‍👩‍👧‍👦', '🏢', '🏠', '⚽', '🎓', '💼', '🎯'];

interface Props {
  group: Group;
  open: boolean;
  onClose: () => void;
}

export function EditGroupDialog({ group, open, onClose }: Props) {
  const { currentUser, workspaces, loadFromDB } = useTaskStore();
  const [name, setName] = useState(group.name);
  const [icon, setIcon] = useState(group.icon);
  const [members, setMembers] = useState<string[]>(group.members);
  const [memberInput, setMemberInput] = useState('');
  const [linkedWorkspaces, setLinkedWorkspaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(group.name);
    setIcon(group.icon);
    setMembers(group.members);
    setLinkedWorkspaces(workspaces.filter(w => w.groupId === group.id).map(w => w.id));

    const fetchUsers = async () => {
      const usersSet = new Set<string>();
      workspaces.forEach(w => w.members.forEach(m => usersSet.add(m)));
      const { data } = await supabase.from('device_registrations').select('user_name');
      if (data) data.forEach(row => usersSet.add(row.user_name));
      setAllUsers(Array.from(usersSet).sort());
    };
    fetchUsers();
  }, [open, group]);

  const addMember = () => {
    const trimmed = memberInput.trim();
    if (trimmed && !members.includes(trimmed)) {
      setMembers([...members, trimmed]);
      setMemberInput('');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('groups').update({
        name: name.trim(),
        icon,
        members,
      }).eq('id', group.id);
      if (error) throw error;

      // Update workspace linkages
      const currentlyLinked = workspaces.filter(w => w.groupId === group.id).map(w => w.id);
      const toUnlink = currentlyLinked.filter(id => !linkedWorkspaces.includes(id));
      const toLink = linkedWorkspaces.filter(id => !currentlyLinked.includes(id));

      for (const wsId of toUnlink) {
        await supabase.from('workspaces').update({ group_id: null }).eq('id', wsId);
      }
      for (const wsId of toLink) {
        await supabase.from('workspaces').update({ group_id: group.id }).eq('id', wsId);
      }

      await loadFromDB();
      toast.success('הקבוצה עודכנה בהצלחה!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בעדכון הקבוצה');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Unlink all workspaces first
      await supabase.from('workspaces').update({ group_id: null }).eq('group_id', group.id);
      await supabase.from('groups').delete().eq('id', group.id);
      await loadFromDB();
      toast.success('הקבוצה נמחקה');
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('שגיאה במחיקת הקבוצה');
    } finally {
      setLoading(false);
    }
  };

  // Workspaces available to link (not linked to another group)
  const availableWorkspaces = workspaces.filter(w => !w.groupId || w.groupId === group.id);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg">עריכת קבוצה</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto px-1">
            {/* Icon */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">אייקון</label>
              <div className="flex flex-wrap gap-1.5">
                {GROUP_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                      icon === emoji
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">שם הקבוצה</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {/* Members */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">חברים</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {members.map((m) => (
                  <Badge key={m} variant="secondary" className="gap-1 text-xs">
                    {m}
                    {m !== currentUser && (
                      <button onClick={() => setMembers(members.filter(x => x !== m))}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {allUsers.filter(u => !members.includes(u)).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {allUsers.filter(u => !members.includes(u)).map((user) => (
                    <label key={user} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => setMembers([...members, user])}
                      />
                      {user}
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="הוסף חבר ידנית"
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMember())}
                  className="h-8 text-sm flex-1"
                />
                <Button variant="outline" size="sm" onClick={addMember} className="h-8 gap-1">
                  <UserPlus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Linked workspaces */}
            {availableWorkspaces.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">מרחבי עבודה מקושרים</label>
                <div className="flex flex-wrap gap-2">
                  {availableWorkspaces.map((ws) => (
                    <label key={ws.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={linkedWorkspaces.includes(ws.id)}
                        onCheckedChange={(checked) => {
                          setLinkedWorkspaces(checked
                            ? [...linkedWorkspaces, ws.id]
                            : linkedWorkspaces.filter(id => id !== ws.id)
                          );
                        }}
                      />
                      {ws.icon} {ws.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Invite link */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">לינק הזמנה לקבוצה</label>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/invite-group/${group.id}`}
                  readOnly
                  className="text-xs font-mono h-8"
                  dir="ltr"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${window.location.origin}/invite-group/${group.id}`);
                    setCopied(true);
                    toast.success('הלינק הועתק!');
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1" disabled={!name.trim() || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                שמור שינויים
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                title="מחק קבוצה"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת קבוצה</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את הקבוצה "{group.name}"? מרחבי העבודה לא יימחקו, רק הקישור לקבוצה יוסר.
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
    </>
  );
}
