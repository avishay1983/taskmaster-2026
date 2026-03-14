import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LogIn, UserPlus, Mail } from 'lucide-react';
import { toast } from 'sonner';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      toast.error('נא למלא אימייל וסיסמה');
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      toast.error('נא להזין שם תצוגה');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() },
          },
        });
        if (error) throw error;
        toast.success('נרשמת בהצלחה!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בתהליך ההתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error('שגיאה בהתחברות עם Google');
      }
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEmailAuth();
  };

  return (
    <div className="min-h-svh flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl">
            {mode === 'login' ? '👋 ברוכים הבאים' : '✨ הרשמה'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' ? 'התחבר כדי להמשיך' : 'צור חשבון חדש'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            כניסה עם Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">או</span>
            </div>
          </div>

          {/* Email/Password */}
          <div className="space-y-3">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">שם תצוגה</Label>
                <Input
                  id="displayName"
                  placeholder="השם שלך..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-right"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>

          <Button onClick={handleEmailAuth} className="w-full gap-2" disabled={loading}>
            {mode === 'login' ? (
              <>
                <LogIn className="h-4 w-4" />
                כניסה
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                הרשמה
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                אין לך חשבון?{' '}
                <button onClick={() => setMode('signup')} className="text-primary hover:underline font-medium">
                  הרשמה
                </button>
              </>
            ) : (
              <>
                כבר יש לך חשבון?{' '}
                <button onClick={() => setMode('login')} className="text-primary hover:underline font-medium">
                  כניסה
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
