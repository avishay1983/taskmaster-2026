import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTaskStore } from '@/lib/task-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const currentUser = useTaskStore((s) => s.currentUser);
  const loadFromDB = useTaskStore((s) => s.loadFromDB);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [workspaceName, setWorkspaceName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token || !currentUser) return;
    acceptInvite();
  }, [token, currentUser]);

  async function acceptInvite() {
    try {
      // Fetch invite
      const { data: invite, error: inviteErr } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('token', token)
        .single();

      if (inviteErr || !invite) {
        setStatus('error');
        setErrorMsg('הזמנה לא נמצאה');
        return;
      }

      // Check expiry
      if (new Date(invite.expires_at) < new Date()) {
        setStatus('expired');
        return;
      }

      // Check max uses
      if (invite.max_uses && invite.use_count >= invite.max_uses) {
        setStatus('error');
        setErrorMsg('ההזמנה הגיעה למכסת השימושים');
        return;
      }

      // Fetch workspace
      const { data: ws } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', invite.workspace_id)
        .single();

      if (!ws) {
        setStatus('error');
        setErrorMsg('מרחב העבודה לא נמצא');
        return;
      }

      setWorkspaceName(`${ws.icon} ${ws.name}`);

      // Check if already a member
      const members: string[] = ws.members || [];
      if (members.includes(currentUser!)) {
        setStatus('success');
        return;
      }

      // Add user to workspace members
      const newMembers = [...members, currentUser!];
      const { error: updateErr } = await supabase
        .from('workspaces')
        .update({ members: newMembers })
        .eq('id', invite.workspace_id);

      if (updateErr) {
        setStatus('error');
        setErrorMsg('שגיאה בהצטרפות למרחב');
        return;
      }

      // Increment use count
      await supabase
        .from('workspace_invites')
        .update({ use_count: invite.use_count + 1 })
        .eq('id', invite.id);

      // Reload data
      await loadFromDB();
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('שגיאה לא צפויה');
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background p-4" dir="rtl">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center">יש להתחבר קודם</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>התחבר לחשבון שלך כדי לקבל את ההזמנה.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-lg">
            {status === 'loading' && 'מצטרף למרחב עבודה...'}
            {status === 'success' && 'הצטרפת בהצלחה!'}
            {status === 'expired' && 'ההזמנה פגה'}
            {status === 'error' && 'שגיאה'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
          {status === 'success' && (
            <>
              <CheckCircle className="h-10 w-10 text-emerald-500" />
              <p className="text-sm text-muted-foreground">הצטרפת למרחב <strong>{workspaceName}</strong></p>
              <Button onClick={() => navigate('/')} className="w-full">חזרה לאפליקציה</Button>
            </>
          )}
          {status === 'expired' && (
            <>
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">תוקף ההזמנה פג. בקש הזמנה חדשה.</p>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">חזרה</Button>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">חזרה</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
