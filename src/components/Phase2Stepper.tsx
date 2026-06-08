import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Lock, Compass, Eye, Sparkles, ChevronRight } from 'lucide-react';

interface SessionInfo {
  current_step: string;
}

interface Phase2StepperProps {
  activeStep: number; // 1 to 10
  onNavigate?: (page: string) => void;
}

const STEP_LABELS = [
  { step: 1, label: 'Blueprint', path: '/phase/2?noredirect=true', key: 'blueprint' },
  { step: 2, label: 'Features', path: '/phase/2/features', key: 'features' },
  { step: 3, label: 'Journey', path: '/phase/2/journey', key: 'user_journey' },
  { step: 4, label: 'Screens', path: '/phase/2/screens', key: 'screens' },
  { step: 5, label: 'Build', path: '/phase/2/building', key: 'review' }, // transitional loading
  { step: 6, label: 'MVP Review', path: '/phase/2/review', key: 'review' },
  { step: 7, label: 'Pitch Story', path: '/phase/2/description', key: 'description' },
  { step: 8, label: 'AI Mechanics', path: '/phase/2/explain', key: 'explain' },
  { step: 9, label: 'Demo Script', path: '/phase/2/demo', key: 'demo' },
  { step: 10, label: 'Complete', path: '/phase/2/complete', key: 'complete' }
];

const STEP_MAP_ORDER: Record<string, number> = {
  'blueprint': 1,
  'features': 2,
  'user_journey': 3,
  'screens': 4,
  'review': 6,
  'description': 7,
  'explain': 8,
  'demo': 9,
  'complete': 10
};

export default function Phase2Stepper({ activeStep, onNavigate }: Phase2StepperProps) {
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const token = localStorage.getItem('vibelab_token');
        if (!token) return;

        const res = await fetch('/api/product/session', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.session) {
            const stepName = data.session.current_step || 'blueprint';
            const mappedStep = STEP_MAP_ORDER[stepName] || 1;
            
            // Set max unlocked step. If they have screens generated, let them access screens
            let computedMax = mappedStep;
            if (data.screens && data.screens.length > 0 && computedMax < 4) {
              computedMax = 4;
            }
            if (data.mvp && computedMax < 6) {
              computedMax = 6;
            }
            
            setMaxUnlockedStep(computedMax);
          }
        }
      } catch (err) {
        console.error('Failed to resolve stepper session progress', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSession();
  }, []);

  return (
    <div className="w-full mb-10 p-4 sm:p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#C9A84C]" />
          <span className="text-xs font-black font-jetbrains text-[#C9A84C] tracking-widest uppercase">
            Phase 2 Creator Platform
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold font-jetbrains text-slate-400">
          <span className="text-[#C9A84C]">Step {activeStep} of 10</span>
          <span>•</span>
          <span className="uppercase">{STEP_LABELS[activeStep - 1]?.label}</span>
        </div>
      </div>

      {/* Stepper horizontal track */}
      <div className="relative flex items-center justify-between w-full overflow-x-auto pb-2 pt-1 scrollbar-none">
        
        {/* Background connector line */}
        <div className="absolute top-[18px] left-[20px] right-[20px] h-0.5 bg-slate-800 -z-10 min-w-[700px]" />
        
        {/* Fill line up to maximum unlocked */}
        <div 
          className="absolute top-[18px] left-[20px] h-0.5 bg-gradient-to-r from-[#C9A84C] to-cyan-500 -z-10 transition-all duration-500 origin-left min-w-[700px]"
          style={{ 
            width: `${Math.min(100, Math.max(0, ((maxUnlockedStep - 1) / 9) * 100))}%` 
          }}
        />

        <div className="flex items-center justify-between w-full min-w-[800px] px-1">
          {STEP_LABELS.map((item) => {
            const isCompleted = item.step < activeStep;
            const isActive = item.step === activeStep;
            const isUnlocked = item.step <= maxUnlockedStep;

            return (
              <div 
                key={item.step} 
                className="flex flex-col items-center group relative z-10"
              >
                <button
                  disabled={!isUnlocked}
                  onClick={() => navigateTo(item.path)}
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer shadow-lg
                    ${isActive 
                      ? 'bg-[#02050e] border-[#C9A84C] text-[#C9A84C] scale-110 shadow-[#C9A84C]/25 ring-4 ring-[#C9A84C]/10' 
                      : isCompleted
                        ? 'bg-[#C9A84C] border-[#C9A84C] text-slate-950 hover:bg-[#E3C268] hover:border-[#E3C268]'
                        : isUnlocked
                          ? 'bg-slate-950 border-cyan-500/50 text-cyan-400 hover:border-cyan-400'
                          : 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-4.5 h-4.5 stroke-[3]" />
                  ) : !isUnlocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-xs font-black font-jetbrains">{item.step}</span>
                  )}
                </button>

                {/* Step Subtitle */}
                <span className={`
                  mt-2 text-[10px] font-bold font-jetbrains tracking-tight uppercase whitespace-nowrap transition-colors
                  ${isActive 
                    ? 'text-[#C9A84C]' 
                    : isCompleted
                      ? 'text-slate-300 hover:text-white'
                      : isUnlocked
                        ? 'text-cyan-400/80 hover:text-cyan-300'
                        : 'text-slate-600'
                  }
                `}>
                  {item.label}
                </span>

                {/* Glow ring on hover */}
                {isUnlocked && !isActive && (
                  <div className="absolute top-0 w-9 h-9 rounded-full bg-cyan-400/5 scale-0 group-hover:scale-125 transition-transform duration-300 pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
