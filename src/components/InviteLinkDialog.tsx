import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTaskStore } from '@/lib/task-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}

export function InviteLinkDialog({ workspaceId, open, onClose }: Props) {
  const currentUser = useTaskStore((s) => s.currentUser);
  const workspaces = useTaskStore((s) => s.workspaces);
  const ws = workspaces.find((w) => w.id === workspaceId);
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_invites')
        .insert({
          workspace_id: workspaceId,
          created_by: currentUser,
        })
        .select('token')
        .single();

      if (error) throw error;

      const url = `${window.location.origin}/invite/${data.token}`;
      setInviteUrl(url);
    } catch (err) {
      console.error(err);
      toast.error('שגיאה ביצירת הלינק');
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
    setInviteUrl('');
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            הזמנה ל-{ws?.icon} {ws?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            צור לינק הזמנה ושתף אותו — כל מי שילחץ עליו יצטרף למרחב העבודה.
            <br />
            הלינק תקף ל-7 ימים.
          </p>

          {!inviteUrl ? (
            <Button onClick={generateLink} className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              צור לינק הזמנה
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={inviteUrl}
                  readOnly
                  className="text-sm font-mono"
                  dir="ltr"
                />
                <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" onClick={generateLink} className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                צור לינק חדש
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
