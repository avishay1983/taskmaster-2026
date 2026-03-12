import { useCallback } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { ListView } from '@/components/ListView';
import { KanbanView } from '@/components/KanbanView';
import { PullToRefresh } from '@/components/PullToRefresh';
import { toast } from 'sonner';

const Index = () => {
  const { viewMode, activeWorkspace, workspaces } = useTaskStore();
  const ws = activeWorkspace ? workspaces.find((w) => w.id === activeWorkspace) : null;

  const handleRefresh = useCallback(async () => {
    // Simulate refresh — in a real app this would refetch from API
    await new Promise((r) => setTimeout(r, 400));
    toast.success('המשימות עודכנו');
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <PullToRefresh onRefresh={handleRefresh}>
              <div className="mb-6" dir="rtl">
                <h1 className="text-xl font-bold">
                  {ws ? `${ws.icon} ${ws.name}` : '📋 כל המשימות'}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  ניהול וארגון המשימות שלך
                </p>
              </div>
              {viewMode === 'list' ? <ListView /> : <KanbanView />}
            </PullToRefresh>
          </main>
        </div>
        <AppSidebar />
      </div>
    </SidebarProvider>
  );
};

export default Index;
