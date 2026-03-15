import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Archive, Plus, Search, List, Columns3, Bell, Users, 
  FolderPlus, ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';

const ONBOARDING_KEY = 'taskmaster_onboarding_done';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const steps: Step[] = [
  {
    icon: <Sparkles className="h-8 w-8" />,
    title: 'ברוכים הבאים ל-TaskMaster! 🎉',
    description: 'מערכת ניהול משימות חכמה שתעזור לך לארגן את העבודה שלך ושל הצוות. בוא נכיר את הכלים העיקריים.',
    color: 'from-primary/20 to-primary/5',
  },
  {
    icon: <Archive className="h-8 w-8" />,
    title: 'Backlog — המשימות האישיות שלך',
    description: 'כאן תוכל לשמור משימות לתכנון עתידי. הבקלוג הוא אישי — כל משתמש רואה רק את המשימות שלו. כשתהיה מוכן, תוכל לקשר אותן למרחב עבודה.',
    color: 'from-amber-500/20 to-amber-500/5',
  },
  {
    icon: <Plus className="h-8 w-8" />,
    title: 'יצירת משימה חדשה',
    description: 'לחץ על כפתור ה-"+" או "משימה חדשה" כדי ליצור משימה. תוכל להגדיר כותרת, תיאור, עדיפות, תאריך יעד, ולשייך אותה לחברי צוות.',
    color: 'from-emerald-500/20 to-emerald-500/5',
  },
  {
    icon: <div className="flex gap-1"><List className="h-7 w-7" /><Columns3 className="h-7 w-7" /></div>,
    title: 'תצוגת רשימה וקנבן',
    description: 'החלף בין תצוגת רשימה לתצוגת קנבן (לוח). בתצוגת קנבן תוכל לגרור משימות בין עמודות הסטטוס: לביצוע, בתהליך, הושלם.',
    color: 'from-blue-500/20 to-blue-500/5',
  },
  {
    icon: <Search className="h-8 w-8" />,
    title: 'חיפוש מהיר',
    description: 'השתמש בשדה החיפוש בחלק העליון כדי למצוא משימות לפי שם, תיאור או תגיות. החיפוש פועל בזמן אמת.',
    color: 'from-violet-500/20 to-violet-500/5',
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: 'מרחבי עבודה וחברי צוות',
    description: 'צור מרחבי עבודה לפרויקטים שונים והזמן חברי צוות. כל חבר יראה את המשימות שמשויכות אליו ויוכל לעדכן את הסטטוס.',
    color: 'from-pink-500/20 to-pink-500/5',
  },
  {
    icon: <FolderPlus className="h-8 w-8" />,
    title: 'קבוצות — ארגון מרחבים',
    description: 'ארגן מרחבי עבודה קשורים יחד בקבוצות. למשל, קבוצה "משפחה" יכולה להכיל מרחבים כמו "נקיונות" ו"קניות".',
    color: 'from-orange-500/20 to-orange-500/5',
  },
  {
    icon: <Bell className="h-8 w-8" />,
    title: 'התראות ותזכורות',
    description: 'קבל התראות כשמשימה מוקצית אליך, כשמועד יעד מתקרב, או כשמשימה מתעדכנת. תוכל להפעיל התראות Push דרך התפריט הצדדי.',
    color: 'from-red-500/20 to-red-500/5',
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      // Small delay so the app renders first
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOpen(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 border-0" dir="rtl">
        {/* Progress bar */}
        <div className="flex gap-1 px-4 pt-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 pt-4 text-center space-y-4">
          <div className={`mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-foreground`}>
            {step.icon}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">{step.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
          </div>

          <div className="text-xs text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronRight className="h-4 w-4" />
            הקודם
          </Button>

          <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground">
            דלג
          </Button>

          <Button size="sm" onClick={handleNext} className="gap-1">
            {isLast ? 'בואו נתחיל! 🚀' : 'הבא'}
            {!isLast && <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
