import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LogIn, UserPlus, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import taskmasterLogo from '@/assets/taskmaster-logo.png';
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
    <div className="min-h-svh flex items-center justify-center bg-background relative overflow-hidden" dir="rtl">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/8 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="w-full max-w-md mx-4 relative z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4">
            <img src={taskmasterLogo} alt="TaskMaster" className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            TaskMaster
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {mode === 'login' ? 'שמחים לראות אותך שוב' : 'בואו נתחיל את המסע'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl shadow-primary/5 p-8">
          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full h-12 gap-3 rounded-xl text-sm font-medium border-border/60 hover:bg-accent/80 hover:border-primary/30 transition-all duration-200"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            המשך עם Google
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card/80 backdrop-blur-sm px-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                או עם אימייל
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <div className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs font-medium text-muted-foreground">
                  שם תצוגה
                </Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    id="displayName"
                    placeholder="איך קוראים לך?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-12 pr-10 rounded-xl border-border/60 bg-background/50 focus:bg-background transition-colors text-right"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                אימייל
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  dir="ltr"
                  className="h-12 pl-10 rounded-xl border-border/60 bg-background/50 focus:bg-background transition-colors text-left"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                סיסמה
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  dir="ltr"
                  className="h-12 pl-10 rounded-xl border-border/60 bg-background/50 focus:bg-background transition-colors text-left"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleEmailAuth}
            className="w-full h-12 mt-6 rounded-xl gap-2 text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            disabled={loading}
          >
            {mode === 'login' ? (
              <>
                <LogIn className="h-4 w-4" />
                כניסה
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                יצירת חשבון
              </>
            )}
          </Button>

          {/* Toggle mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  עדיין אין לך חשבון?{' '}
                  <button
                    onClick={() => setMode('signup')}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    הרשמה חינם
                  </button>
                </>
              ) : (
                <>
                  כבר יש לך חשבון?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    חזרה לכניסה
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          ניהול משימות משפחתי חכם ופשוט ✨
        </p>
      </div>
    </div>
  );
}
