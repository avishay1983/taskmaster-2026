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
import { Copy, Check, Link2, Loader2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

const GROUP_ICONS = ['👥', '👨‍👩‍👧‍👦', '🏢', '🏠', '⚽', '🎓', '💼', '🎯'];

export function CreateGroupDialog({ open, onClose }: Props) {
  const { currentUser, workspaces, loadFromDB } = useTaskStore();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('👥');
  const [members, setMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [allUsers, setAllUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    // Add current user to members by default
    if (currentUser && !members.includes(currentUser)) {
      setMembers([currentUser]);
    }
    // Fetch known users
    const fetchUsers = async () => {
      const usersSet = new Set<string>();
      workspaces.forEach(w => w.members.forEach(m => usersSet.add(m)));
      const { data } = await supabase.from('device_registrations').select('user_name');
      if (data) data.forEach(row => usersSet.add(row.user_name));
      setAllUsers(Array.from(usersSet).sort());
    };
    fetchUsers();
  }, [open, currentUser]);

  const addMember = () => {
    const trimmed = memberInput.trim();
    if (trimmed && !members.includes(trimmed)) {
      setMembers([...members, trimmed]);
      setMemberInput('');
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !currentUser) return;
    setLoading(true);
    try {
      const groupId = crypto.randomUUID();
      
      // Create group
      const { error: groupErr } = await supabase.from('groups').insert({
        id: groupId,
        name: name.trim(),
        icon,
        members,
        created_by: currentUser,
      });
      if (groupErr) throw groupErr;

      // Link selected workspaces to group
      for (const wsId of selectedWorkspaces) {
        await supabase.from('workspaces').update({ group_id: groupId }).eq('id', wsId);
      }

      // Create invite link for the group
      // We'll create a workspace_invites entry with a special group reference
      // For now, generate a shareable group invite
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
      await supabase.from('workspace_invites').insert({
        workspace_id: selectedWorkspaces[0] || null,
        token,
        created_by: currentUser,
      });

      await loadFromDB();
      
      // Generate group invite URL
      const url = `${window.location.origin}/invite-group/${groupId}`;
      setInviteUrl(url);
      
      toast.success(`הקבוצה "${name}" נוצרה בהצלחה!`);
    } catch (err) {
      console.error(err);
      toast.error('שגיאה ביצירת הקבוצה');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('הלינק הועתק!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setName('');
    setIcon('👥');
    setMembers(currentUser ? [currentUser] : []);
    setSelectedWorkspaces([]);
    setInviteUrl('');
    setCopied(false);
    onClose();
  };

  // Only show workspaces user owns (is a member of)
  const ownedWorkspaces = workspaces.filter(w => !w.groupId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg">יצירת קבוצה חדשה</DialogTitle>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-4 mt-2">
            <div className="text-center">
              <div className="text-3xl mb-2">{icon}</div>
              <h3 className="font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground mt-1">הקבוצה נוצרה! שתף את הלינק להזמין חברים:</p>
            </div>
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly className="text-sm font-mono" dir="ltr" />
              <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={handleClose} variant="outline" className="w-full">סגור</Button>
          </div>
        ) : (
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
              <Input
                placeholder="למשל: משפחת כהן"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
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
                        checked={members.includes(user)}
                        onCheckedChange={(checked) => {
                          setMembers(checked ? [...members, user] : members.filter(m => m !== user));
                        }}
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

            {/* Link workspaces */}
            {ownedWorkspaces.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">קשר מרחבי עבודה לקבוצה</label>
                <div className="flex flex-wrap gap-2">
                  {ownedWorkspaces.map((ws) => (
                    <label key={ws.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedWorkspaces.includes(ws.id)}
                        onCheckedChange={(checked) => {
                          setSelectedWorkspaces(checked
                            ? [...selectedWorkspaces, ws.id]
                            : selectedWorkspaces.filter(id => id !== ws.id)
                          );
                        }}
                      />
                      {ws.icon} {ws.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleCreate} className="w-full" disabled={!name.trim() || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              צור קבוצה
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
