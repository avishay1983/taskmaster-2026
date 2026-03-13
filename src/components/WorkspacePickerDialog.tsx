import { useTaskStore } from '@/lib/task-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import shabbatIcon from '@/assets/shabbat-icon.png';

const SPECIAL_ICONS: Record<string, string> = {
  shabbat: shabbatIcon,
};

function IconDisplay({ icon }: { icon: string }) {
  if (SPECIAL_ICONS[icon]) {
    return <img src={SPECIAL_ICONS[icon]} alt={icon} className="inline-block w-8 h-8" />;
  }
  return <span className="text-2xl">{icon}</span>;
}

export function WorkspacePickerDialog() {
  const { workspaces, activeWorkspace, setActiveWorkspace, isLoading } = useTaskStore();
  const open = !isLoading && workspaces.length > 0 && !activeWorkspace;

  return (
    <Dialog open={open}>
      <DialogContent
        dir="rtl"
        className="sm:max-w-sm [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-lg">בחר מרחב עבודה</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 mt-2">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspace(ws.id)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all text-right"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <IconDisplay icon={ws.icon} />
              </div>
              <span className="font-medium text-foreground">{ws.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
