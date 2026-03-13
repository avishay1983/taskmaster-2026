import { useCallback } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { ListView } from '@/components/ListView';
import { KanbanView } from '@/components/KanbanView';
import { PullToRefresh } from '@/components/PullToRefresh';
import { WorkspacePickerDialog } from '@/components/WorkspacePickerDialog';
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
      <div className="h-svh flex w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex h-svh min-h-0 flex-col overflow-hidden">
          <AppHeader />
          <main className="flex-1 min-h-0 overflow-y-auto scroll-smooth-touch p-4 md:p-6">
            <PullToRefresh onRefresh={handleRefresh}>
              {ws ? (
                <div className="mb-6" dir="rtl">
                  <h1 className="text-xl font-bold">
                    {ws.icon} {ws.name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    ניהול וארגון המשימות שלך
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground" dir="rtl">
                  <p className="text-sm">בחר מרחב עבודה מהתפריט כדי להתחיל</p>
                </div>
              )}
              {ws && (viewMode === 'list' ? <ListView /> : <KanbanView />)}
            </PullToRefresh>
          </main>
        </SidebarInset>
      </div>
      <WorkspacePickerDialog />
    </SidebarProvider>
  );
};

export default Index;
