import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTaskStore } from '@/lib/task-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function InviteGroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const currentUser = useTaskStore((s) => s.currentUser);
  const loadFromDB = useTaskStore((s) => s.loadFromDB);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [groupName, setGroupName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!groupId || !currentUser) return;
    joinGroup();
  }, [groupId, currentUser]);

  async function joinGroup() {
    try {
      const { data: group, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error || !group) {
        setStatus('error');
        setErrorMsg('הקבוצה לא נמצאה');
        return;
      }

      setGroupName(`${group.icon} ${group.name}`);

      const members: string[] = group.members || [];
      if (members.includes(currentUser!)) {
        setStatus('success');
        await loadFromDB();
        return;
      }

      // Add user to group
      const newMembers = [...members, currentUser!];
      const { error: updateErr } = await supabase
        .from('groups')
        .update({ members: newMembers })
        .eq('id', groupId);

      if (updateErr) {
        setStatus('error');
        setErrorMsg('שגיאה בהצטרפות');
        return;
      }

      // Also add user to all workspaces in this group
      const { data: groupWorkspaces } = await supabase
        .from('workspaces')
        .select('id, members')
        .eq('group_id', groupId);

      if (groupWorkspaces) {
        for (const ws of groupWorkspaces) {
          const wsMembers: string[] = ws.members || [];
          if (!wsMembers.includes(currentUser!)) {
            await supabase
              .from('workspaces')
              .update({ members: [...wsMembers, currentUser!] })
              .eq('id', ws.id);
          }
        }
      }

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
            <p>התחבר לחשבון שלך כדי להצטרף לקבוצה.</p>
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
            {status === 'loading' && 'מצטרף לקבוצה...'}
            {status === 'success' && 'הצטרפת בהצלחה!'}
            {status === 'error' && 'שגיאה'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
          {status === 'success' && (
            <>
              <CheckCircle className="h-10 w-10 text-emerald-500" />
              <p className="text-sm text-muted-foreground">הצטרפת לקבוצה <strong>{groupName}</strong></p>
              <p className="text-xs text-muted-foreground">כל מרחבי העבודה של הקבוצה זמינים לך עכשיו.</p>
              <Button onClick={() => navigate('/')} className="w-full">חזרה לאפליקציה</Button>
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
