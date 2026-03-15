import { useCallback, useState } from 'react';
import { useTaskStore } from '@/lib/task-store';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { ListView } from '@/components/ListView';
import { KanbanView } from '@/components/KanbanView';
import { PullToRefresh } from '@/components/PullToRefresh';
import { WorkspacePickerDialog } from '@/components/WorkspacePickerDialog';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { viewMode, activeWorkspace, workspaces, isLoading, loadFromDB, deleteAllTasks, tasks, currentUser } = useTaskStore();
  const ws = activeWorkspace && activeWorkspace !== 'backlog' ? workspaces.find((w) => w.id === activeWorkspace) : null;
  const isBacklog = activeWorkspace === 'backlog';
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const activeTaskCount = ws
    ? tasks.filter((t) => t.workspaceId === ws.id).length
    : isBacklog
    ? tasks.filter((t) => t.isBacklog && (!currentUser || t.assigneeIds.includes(currentUser))).length
    : 0;

  const handleRefresh = useCallback(async () => {
    await loadFromDB();
    toast.success('המשימות עודכנו');
  }, [loadFromDB]);

  const workspaceLabel = ws ? `${ws.icon} ${ws.name}` : isBacklog ? 'Backlog' : '';

  return (
    <SidebarProvider>
      <div className="h-svh flex w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex h-svh min-h-0 flex-col overflow-hidden">
          <AppHeader />
          <main className="flex-1 min-h-0 overflow-y-auto scroll-smooth-touch p-4 md:p-6">
            <PullToRefresh onRefresh={handleRefresh}>
              {isBacklog ? (
                <div className="mb-6 flex items-start justify-between" dir="rtl">
                  <div>
                    <h1 className="text-xl font-bold">📋 Backlog</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      משימות לתכנון עתידי — קשר אותן למרחב עבודה כשתהיה מוכן
                    </p>
                  </div>
                  {activeTaskCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteAll(true)}
                      className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">מחק הכל</span>
                    </Button>
                  )}
                </div>
              ) : ws ? (
                <div className="mb-6 flex items-start justify-between" dir="rtl">
                  <div>
                    <h1 className="text-xl font-bold">
                      {ws.icon} {ws.name}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      ניהול וארגון המשימות שלך
                    </p>
                  </div>
                  {activeTaskCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteAll(true)}
                      className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">מחק הכל ({activeTaskCount})</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground" dir="rtl">
                  <p className="text-sm">בחר מרחב עבודה מהתפריט כדי להתחיל</p>
                </div>
              )}
              {(ws || isBacklog) && (viewMode === 'list' ? <ListView /> : <KanbanView />)}
            </PullToRefresh>
          </main>
        </SidebarInset>
      </div>
      <WorkspacePickerDialog />

      {/* Delete All Confirmation */}
      <AlertDialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת כל המשימות</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את כל המשימות ב-"{workspaceLabel}"? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={() => { deleteAllTasks(); setShowDeleteAll(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק הכל
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default Index;
