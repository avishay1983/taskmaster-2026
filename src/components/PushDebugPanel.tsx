import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/lib/device-id';
import { usePushStatus } from '@/hooks/usePushStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bug, RefreshCw, CheckCircle2, XCircle, Clock, Smartphone } from 'lucide-react';

interface PushSubRecord {
  endpoint: string;
  user_name: string;
  created_at: string;
}

interface PushLog {
  lastAttempt: string | null;
  lastError: string | null;
}

const PUSH_LOG_KEY = 'push_debug_log';

/** Persist push debug info to localStorage */
export function logPushAttempt(success: boolean, error?: string) {
  const log: PushLog = {
    lastAttempt: new Date().toISOString(),
    lastError: success ? null : (error || 'Unknown error'),
  };
  localStorage.setItem(PUSH_LOG_KEY, JSON.stringify(log));
}

function getPushLog(): PushLog {
  try {
    const raw = localStorage.getItem(PUSH_LOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { lastAttempt: null, lastError: null };
}

export function PushDebugPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { status } = usePushStatus();
  const [subscriptions, setSubscriptions] = useState<PushSubRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [swState, setSwState] = useState<string>('unknown');
  const [permissionState, setPermissionState] = useState<string>('unknown');
  const [pushLog] = useState<PushLog>(getPushLog);
  const deviceId = getDeviceId();

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('push_subscriptions')
      .select('endpoint, user_name, created_at')
      .order('created_at', { ascending: false });
    setSubscriptions(data || []);

    // SW state
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      setSwState(reg?.active ? 'active' : reg ? 'registered' : 'none');
    } else {
      setSwState('unsupported');
    }

    // Permission
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('he-IL', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const statusColor = {
    subscribed: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
    'not-subscribed': 'bg-amber-500/15 text-amber-700 border-amber-300',
    denied: 'bg-destructive/15 text-destructive border-destructive/30',
    unsupported: 'bg-muted text-muted-foreground border-border',
    loading: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Push Debug Panel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Status Overview */}
          <section className="space-y-2">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">סטטוס</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-2.5 space-y-1">
                <div className="text-[10px] text-muted-foreground">Push Status</div>
                <Badge variant="outline" className={statusColor[status]}>
                  {status === 'subscribed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {status === 'denied' && <XCircle className="h-3 w-3 mr-1" />}
                  {status}
                </Badge>
              </div>
              <div className="rounded-lg border p-2.5 space-y-1">
                <div className="text-[10px] text-muted-foreground">Notification Permission</div>
                <Badge variant="outline">{permissionState}</Badge>
              </div>
              <div className="rounded-lg border p-2.5 space-y-1">
                <div className="text-[10px] text-muted-foreground">Service Worker</div>
                <Badge variant="outline" className={swState === 'active' ? 'bg-emerald-500/15 text-emerald-700' : ''}>
                  {swState}
                </Badge>
              </div>
              <div className="rounded-lg border p-2.5 space-y-1">
                <div className="text-[10px] text-muted-foreground">Device ID</div>
                <code className="text-[10px] break-all text-muted-foreground">{deviceId.slice(0, 12)}…</code>
              </div>
            </div>
          </section>

          {/* Last Attempt */}
          <section className="space-y-2">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">ניסיון אחרון</h3>
            <div className="rounded-lg border p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">{formatDate(pushLog.lastAttempt)}</span>
              </div>
              {pushLog.lastError ? (
                <div className="flex items-start gap-2 text-destructive">
                  <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="text-xs break-all">{pushLog.lastError}</span>
                </div>
              ) : pushLog.lastAttempt ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="text-xs">הצליח</span>
                </div>
              ) : null}
            </div>
          </section>

          {/* Registered Subscriptions */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                מנויים רשומים ({subscriptions.length})
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {subscriptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">אין מנויים רשומים</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {subscriptions.map((sub, i) => (
                  <div key={i} className="rounded-lg border p-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-xs">{sub.user_name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground break-all">
                      {sub.endpoint.slice(0, 60)}…
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatDate(sub.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
