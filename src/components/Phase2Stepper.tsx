import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Lock, Compass, Eye, Sparkles, ChevronRight, ArrowLeft } from 'lucide-react';

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
    <div className="w-full mb-10 p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 backdrop-blur-md select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2563eb]" />
            <span className="text-xs font-black font-jetbrains text-[#2563eb] tracking-widest uppercase">
              Phase 2 Creator Platform
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
          <button
            onClick={() => navigateTo('/dashboard')}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black font-jetbrains text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all uppercase tracking-wider cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#2563eb] group-hover:-translate-x-0.5 transition-transform" />
            Exit to Dashboard
          </button>
          
          <div className="flex items-center gap-1.5 text-[10px] font-bold font-jetbrains text-slate-500 border-l border-slate-200 pl-4">
            <span className="text-[#2563eb]">Step {activeStep} of 10</span>
            <span>•</span>
            <span className="uppercase">{STEP_LABELS[activeStep - 1]?.label}</span>
          </div>
        </div>
      </div>

      {/* Stepper horizontal track */}
      <div className="relative flex items-center justify-between w-full overflow-x-auto pb-2 pt-1 scrollbar-none">
        
        {/* Background connector line */}
        <div className="absolute top-[18px] left-[20px] right-[20px] h-0.5 bg-slate-200 -z-10 min-w-[700px]" />
        
        {/* Fill line up to maximum unlocked */}
        <div 
          className="absolute top-[18px] left-[20px] h-0.5 bg-gradient-to-r from-[#2563eb] to-cyan-500 -z-10 transition-all duration-500 origin-left min-w-[700px]"
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
                      ? 'bg-slate-50 border-[#2563eb] text-[#2563eb] scale-110 shadow-[#2563eb]/25 ring-4 ring-[#2563eb]/10' 
                      : isCompleted
                        ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700'
                        : isUnlocked
                          ? 'bg-white border-blue-500 text-blue-600 hover:border-blue-600'
                          : 'bg-white border-slate-200 text-slate-400 cursor-not-allowed'
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
                    ? 'text-[#2563eb]' 
                    : isCompleted
                      ? 'text-slate-600 hover:text-blue-600'
                      : isUnlocked
                        ? 'text-slate-700 hover:text-blue-600'
                        : 'text-slate-400'
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
