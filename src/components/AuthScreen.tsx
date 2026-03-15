import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Mail, Lock, User, ArrowLeft, Zap, CheckCircle2, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import taskmasterLogo from '@/assets/taskmaster-logo.png';

const FEATURES = [
  { icon: Zap, text: 'ניהול משימות בלחיצה' },
  { icon: Users, text: 'שיתוף פעולה בזמן אמת' },
  { icon: BarChart3, text: 'מעקב התקדמות חכם' },
  { icon: CheckCircle2, text: 'תזכורות והתראות' },
];

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
    <div className="min-h-svh flex" dir="rtl">
      {/* Left panel - Hero / Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-primary">
        {/* Animated gradient blobs */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary-foreground/10 blur-3xl -translate-y-1/2 translate-x-1/4 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary-foreground/5 blur-3xl translate-y-1/3 -translate-x-1/4 animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full bg-primary-foreground/8 blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '4s' }} />
        </div>
        
        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(var(--primary-foreground)) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <img src={taskmasterLogo} alt="TaskMaster" className="w-12 h-12 drop-shadow-lg brightness-0 invert" />
            <h1 className="text-4xl font-black tracking-tight">TaskMaster</h1>
          </div>
          
          <p className="text-xl font-light text-primary-foreground/80 mb-10 leading-relaxed max-w-md">
            הדרך החכמה לנהל משימות, לשתף פעולה ולהשיג יותר — יחד.
          </p>

          <div className="space-y-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-4 group"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary-foreground/25 transition-colors">
                  <f.icon className="w-5 h-5" />
                </div>
                <span className="text-base font-medium text-primary-foreground/90">{f.text}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Right panel - Auth form */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-background">
        {/* Subtle background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-primary/3 blur-3xl" />
        </div>

        <div className="w-full max-w-[420px] mx-6 relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <img src={taskmasterLogo} alt="TaskMaster" className="w-10 h-10" />
              <h1 className="text-2xl font-black text-foreground tracking-tight">TaskMaster</h1>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
              {mode === 'login' ? 'ברוכים השבים! 👋' : 'יצירת חשבון חדש 🚀'}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {mode === 'login' ? 'התחברו כדי להמשיך לנהל את המשימות שלכם' : 'הצטרפו אלינו ותתחילו לנהל משימות כמו מקצוענים'}
            </p>
          </div>

          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full h-12 gap-3 rounded-2xl text-sm font-medium border-border hover:bg-accent hover:border-primary/20 transition-all duration-300 hover:shadow-md"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            המשך עם Google
          </Button>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-xs text-muted-foreground/70 font-medium">
                או באמצעות אימייל
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <div className="space-y-4">
            {mode === 'signup' && (
              <div className="relative group">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                <Input
                  id="displayName"
                  placeholder="שם תצוגה"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-12 pr-11 rounded-2xl border-border bg-secondary/50 focus:bg-background focus:border-primary/40 transition-all text-right placeholder:text-muted-foreground/40"
                />
              </div>
            )}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              <Input
                id="email"
                type="email"
                placeholder="אימייל"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                dir="ltr"
                className="h-12 pl-11 rounded-2xl border-border bg-secondary/50 focus:bg-background focus:border-primary/40 transition-all text-left placeholder:text-muted-foreground/40"
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              <Input
                id="password"
                type="password"
                placeholder="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                dir="ltr"
                className="h-12 pl-11 rounded-2xl border-border bg-secondary/50 focus:bg-background focus:border-primary/40 transition-all text-left placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleEmailAuth}
            className="w-full h-12 mt-6 rounded-2xl gap-2 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="h-4 w-4" />
                כניסה לחשבון
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                יצירת חשבון
              </>
            )}
          </Button>

          {/* Toggle mode */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  עדיין אין לך חשבון?{' '}
                  <button
                    onClick={() => setMode('signup')}
                    className="text-primary hover:text-primary/80 font-bold transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary/60"
                  >
                    הרשמה חינם
                  </button>
                </>
              ) : (
                <>
                  כבר יש לך חשבון?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="text-primary hover:text-primary/80 font-bold transition-colors inline-flex items-center gap-1 underline underline-offset-4 decoration-primary/30 hover:decoration-primary/60"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    חזרה לכניסה
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
