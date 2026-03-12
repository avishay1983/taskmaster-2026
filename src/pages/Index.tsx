import { useCallback } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { ListView } from '@/components/ListView';
import { KanbanView } from '@/components/KanbanView';
import { PullToRefresh } from '@/components/PullToRefresh';
import { toast } from 'sonner';

const Index = () => {
  const { viewMode, activeWorkspace, workspaces, isLoading, loadFromDB } = useTaskStore();
  const ws = activeWorkspace ? workspaces.find((w) => w.id === activeWorkspace) : null;

  const handleRefresh = useCallback(async () => {
    await loadFromDB();
    toast.success('המשימות עודכנו');
  }, [loadFromDB]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
