import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useOverdueNotifications } from "@/hooks/useOverdueNotifications";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useTaskStore } from "@/lib/task-store";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/AuthScreen";
import Index from "./pages/Index";
import InvitePage from "./pages/InvitePage";
import NotFound from "./pages/NotFound";
import type { Session } from "@supabase/supabase-js";

const queryClient = new QueryClient();

async function resolveDisplayName(userId: string, userMeta: any, email: string | undefined): Promise<string> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();

    if (profile?.display_name) return profile.display_name;

    // Profile doesn't exist - create it
    const name = userMeta?.display_name || userMeta?.full_name || email || '';
    await supabase.from('profiles').upsert({ id: userId, display_name: name });
    return name;
  } catch (err) {
    console.error('resolveDisplayName error:', err);
    return userMeta?.display_name || userMeta?.full_name || email || '';
  }
}

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const loadFromDB = useTaskStore((s) => s.loadFromDB);
  const currentUser = useTaskStore((s) => s.currentUser);
  const setCurrentUser = useTaskStore((s) => s.setCurrentUser);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setAuthLoading(false);
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Resolve display name in a separate effect when session changes
  useEffect(() => {
    if (!session?.user) return;
    resolveDisplayName(
      session.user.id,
      session.user.user_metadata,
      session.user.email
    ).then((name) => {
      setCurrentUser(name, session.user.id);
    });
  }, [session?.user?.id, setCurrentUser]);

  useEffect(() => {
    if (session) {
      loadFromDB();
    }
  }, [session, loadFromDB]);

  useOverdueNotifications();
  usePushSubscription(currentUser);

  if (authLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
