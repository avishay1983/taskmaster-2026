import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Settings, RotateCcw } from 'lucide-react';

const SETTINGS_KEY = 'taskmaster_settings';
const ONBOARDING_KEY = 'taskmaster_onboarding_done';

export interface AppSettings {
  autoSelectWorkspace: boolean;
}

const defaultSettings: AppSettings = {
  autoSelectWorkspace: false,
};

export function getAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: Props) {
  const [settings, setSettings] = useState<AppSettings>(getAppSettings);

  useEffect(() => {
    if (open) setSettings(getAppSettings());
  }, [open]);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    onClose();
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            הגדרות
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Auto-select workspace */}
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm font-medium">פתיחה אוטומטית של מרחב עבודה</Label>
              <p className="text-xs text-muted-foreground">
                בכניסה לאפליקציה, להיכנס ישר למרחב העבודה הראשון במקום מסך ריק
              </p>
            </div>
            <Switch
              checked={settings.autoSelectWorkspace}
              onCheckedChange={(v) => update({ autoSelectWorkspace: v })}
            />
          </div>

          {/* Reset onboarding */}
          <div className="border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={resetOnboarding}
              className="w-full gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              הצג שוב את סיור ההדרכה
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
