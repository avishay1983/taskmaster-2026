import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useOverdueNotifications } from "@/hooks/useOverdueNotifications";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useTaskStore } from "@/lib/task-store";
import { LoginScreen } from "@/components/LoginScreen";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const loadFromDB = useTaskStore((s) => s.loadFromDB);
  const currentUser = useTaskStore((s) => s.currentUser);
  const isLoading = useTaskStore((s) => s.isLoading);
  const workspaces = useTaskStore((s) => s.workspaces);

  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  // Show login after data is loaded so we have member names
  const showLogin = !isLoading && workspaces.length > 0 && !currentUser;

  useOverdueNotifications();
  usePushSubscription(currentUser);

  if (showLogin) {
    return <LoginScreen />;
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
