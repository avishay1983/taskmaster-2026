import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const ONBOARDING_KEY = 'taskmaster_onboarding_done';

interface TourStep {
  target: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  fallbackCenter?: boolean;
  /** If true, open sidebar before showing this step */
  requiresSidebar?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '__welcome__',
    title: 'ברוכים הבאים ל-TaskMaster! 🎉',
    description: 'בוא נעשה סיור קצר באפליקציה ונכיר את כל הכלים שלך. זה ייקח פחות מדקה!',
    placement: 'bottom',
    fallbackCenter: true,
  },
  {
    target: 'sidebar-trigger',
    title: 'תפריט צדדי 📂',
    description: 'פתח את התפריט הצדדי כדי לראות את מרחבי העבודה, הקבוצות, הגדרות והתראות.',
    placement: 'left',
  },
  {
    target: 'backlog',
    title: 'Backlog — המשימות האישיות שלך 📋',
    description: 'כאן תוכל לשמור משימות לתכנון עתידי. הבקלוג הוא אישי — כל משתמש רואה רק את המשימות שלו. כשתהיה מוכן, תוכל לקשר אותן למרחב עבודה.',
    placement: 'left',
    requiresSidebar: true,
  },
  {
    target: 'add-workspace',
    title: 'הקמת מרחב עבודה חדש ➕',
    description: 'לחץ כאן כדי ליצור מרחב עבודה חדש. בחר אייקון, שם, והוסף חברי צוות. כל מרחב הוא פרויקט נפרד עם המשימות שלו.',
    placement: 'left',
    requiresSidebar: true,
  },
  {
    target: 'invite-link',
    title: 'שליחת קישור הזמנה 🔗',
    description: 'שלח קישור הצטרפות לחברי צוות כדי שיוכלו להיכנס למרחב העבודה שלך. הקישור תקף ל-7 ימים וניתן להגביל את מספר השימושים.',
    placement: 'left',
    requiresSidebar: true,
  },
  {
    target: 'create-group',
    title: 'יצירת קבוצה 👥',
    description: 'ארגן מרחבי עבודה קשורים יחד בקבוצות. למשל, קבוצה "משפחה" יכולה להכיל מרחבים כמו "נקיונות" ו"קניות". חברי הקבוצה מקבלים גישה אוטומטית לכל המרחבים.',
    placement: 'left',
    requiresSidebar: true,
  },
  {
    target: 'search',
    title: 'חיפוש מהיר 🔍',
    description: 'חפש משימות לפי שם, תיאור או תגיות. התוצאות מתעדכנות בזמן אמת תוך כדי הקלדה.',
    placement: 'bottom',
  },
  {
    target: 'add-task',
    title: 'משימה חדשה ➕',
    description: 'לחץ כאן כדי ליצור משימה חדשה. תוכל להגדיר כותרת, עדיפות, תאריך יעד, ולשייך אותה לחברי צוות.',
    placement: 'bottom',
  },
  {
    target: 'add-task-mobile',
    title: 'כפתור הוספה מהיר ➕',
    description: 'במובייל, לחץ על הכפתור הצף הזה כדי ליצור משימה חדשה במהירות.',
    placement: 'top',
  },
  {
    target: 'view-toggle',
    title: 'תצוגת רשימה / קנבן',
    description: 'החלף בין תצוגת רשימה לתצוגת קנבן (לוח). בקנבן תוכל לגרור משימות בין עמודות הסטטוס.',
    placement: 'bottom',
  },
  {
    target: 'notifications',
    title: 'התראות 🔔',
    description: 'כאן תראה התראות על משימות שמוקצות אליך, תזכורות ומועדי יעד שמתקרבים.',
    placement: 'bottom',
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getElementRect(target: string): SpotlightRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function getTooltipPosition(
  rect: SpotlightRect | null,
  placement: TourStep['placement'],
  tooltipWidth: number,
  tooltipHeight: number
) {
  if (!rect) {
    // Center on screen
    return {
      top: window.innerHeight / 2 - tooltipHeight / 2,
      left: window.innerWidth / 2 - tooltipWidth / 2,
    };
  }

  const OFFSET = 12;
  const pad = 8;
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'bottom':
      top = rect.top + rect.height + OFFSET;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'top':
      top = rect.top - tooltipHeight - OFFSET;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - OFFSET;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left + rect.width + OFFSET;
      break;
  }

  // Clamp to viewport
  left = Math.max(pad, Math.min(left, window.innerWidth - tooltipWidth - pad));
  top = Math.max(pad, Math.min(top, window.innerHeight - tooltipHeight - pad));

  return { top, left };
}

export function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [readySteps, setReadySteps] = useState<TourStep[]>([]);

  // Recompute visible steps when step changes (sidebar may have opened)
  const recomputeVisibleSteps = useCallback(() => {
    const steps = TOUR_STEPS.filter((step) => {
      if (step.fallbackCenter) return true;
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    setReadySteps(steps);
    return steps;
  }, []);

  // Open sidebar if the current step requires it
  const ensureSidebarOpen = useCallback((step: TourStep) => {
    if (!step.requiresSidebar) return;
    // Check if sidebar is already open by looking for a visible sidebar element
    const sidebarEl = document.querySelector('[data-tour="backlog"]');
    if (sidebarEl) {
      const rect = sidebarEl.getBoundingClientRect();
      if (rect.width > 0) return; // already visible
    }
    // Click the sidebar trigger to open it
    const trigger = document.querySelector('[data-tour="sidebar-trigger"]') as HTMLButtonElement;
    if (trigger) trigger.click();
  }, []);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      const timer = setTimeout(() => setActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const updatePosition = useCallback(() => {
    const steps = recomputeVisibleSteps();
    const step = steps[currentStep];
    if (!step) return;

    const rect = step.fallbackCenter ? null : getElementRect(step.target);
    setSpotlightRect(rect);

    const tooltipW = tooltipRef.current?.offsetWidth || 300;
    const tooltipH = tooltipRef.current?.offsetHeight || 160;
    setTooltipPos(getTooltipPosition(rect, step.placement, tooltipW, tooltipH));
  }, [currentStep, recomputeVisibleSteps]);

  useEffect(() => {
    if (!active) return;
    // Wait a tick for DOM
    const raf = requestAnimationFrame(() => updatePosition());
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [active, updatePosition]);

  // Re-measure after tooltip renders, and open sidebar if needed
  useEffect(() => {
    if (!active) return;
    const step = readySteps[currentStep] || TOUR_STEPS[currentStep];
    if (step?.requiresSidebar) {
      ensureSidebarOpen(step);
      // Wait for sidebar animation then recompute
      const timer = setTimeout(updatePosition, 400);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(updatePosition, 50);
      return () => clearTimeout(timer);
    }
  }, [active, currentStep, updatePosition, ensureSidebarOpen, readySteps]);

  const handleClose = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setActive(false);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < readySteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleClose();
    }
  }, [currentStep, readySteps.length, handleClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  if (!active || readySteps.length === 0) return null;

  const step = readySteps[currentStep];
  const isLast = currentStep === readySteps.length - 1;
  const PADDING = 6;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      {/* Overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left - PADDING}
                y={spotlightRect.top - PADDING}
                width={spotlightRect.width + PADDING * 2}
                height={spotlightRect.height + PADDING * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="hsl(var(--foreground) / 0.6)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: 'all' }}
          onClick={handleClose}
        />
      </svg>

      {/* Spotlight ring */}
      {spotlightRect && (
        <div
          className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none transition-all duration-300"
          style={{
            top: spotlightRect.top - PADDING,
            left: spotlightRect.left - PADDING,
            width: spotlightRect.width + PADDING * 2,
            height: spotlightRect.height + PADDING * 2,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute w-[300px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ease-out"
        style={{ top: tooltipPos.top, left: tooltipPos.left, pointerEvents: 'all' }}
      >
        {/* Progress */}
        <div className="flex gap-1 px-3 pt-3">
          {visibleSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-card-foreground leading-tight">{step.title}</h3>
            <button onClick={handleClose} className="shrink-0 p-0.5 rounded hover:bg-accent transition-colors">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-3 pb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="h-7 gap-1 text-xs px-2"
          >
            <ChevronRight className="h-3 w-3" />
            הקודם
          </Button>

          <span className="text-[10px] text-muted-foreground">
            {currentStep + 1} / {visibleSteps.length}
          </span>

          <Button
            size="sm"
            onClick={handleNext}
            className="h-7 gap-1 text-xs px-3"
          >
            {isLast ? '🚀 סיום' : 'הבא'}
            {!isLast && <ChevronLeft className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
