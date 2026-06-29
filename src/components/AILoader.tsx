import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Brain, Cpu, Code2, Layers, Compass, LayoutGrid } from 'lucide-react';

interface AILoaderProps {
  type: 'blueprint' | 'features' | 'journey';
}

export const AILoader: React.FC<AILoaderProps> = ({ type }) => {
  const [progress, setProgress] = useState(5);
  const [statusIdx, setStatusIdx] = useState(0);

  // Configuration map for each loading experience
  const config = {
    blueprint: {
      title: 'Synthesizing Feature Recommendations',
      description: 'Vibelab is translating your foundational blueprint ideas into a comprehensive set of product milestones and features.',
      icon: <Brain className="w-5 h-5 text-blue-500 animate-pulse" />,
      stages: [
        'Analyzing blueprint problem statement & variables...',
        'Mapping constraints against target user profiles...',
        'Drafting key system functional requirements...',
        'Categorizing features into Must-Haves & Nice-To-Haves...',
        'Injecting learning milestones & code validation templates...'
      ],
      skeleton: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-35 animate-pulse mt-4">
          {[1, 2, 3].map((col) => (
            <div key={col} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-4">
              <div className="h-4 bg-slate-300 rounded-md w-1/3"></div>
              <div className="space-y-3">
                {[1, 2].map((card) => (
                  <div key={card} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="h-3 bg-slate-300 rounded-md w-2/3"></div>
                    <div className="h-2 bg-slate-200 rounded-md w-full"></div>
                    <div className="h-2 bg-slate-200 rounded-md w-5/6"></div>
                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                      <div className="h-2.5 bg-slate-200 rounded w-10"></div>
                      <div className="h-2.5 bg-slate-200 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    },
    features: {
      title: 'Fomulating Interactive User Journey',
      description: 'Vibelab is modeling a customized step-by-step user workflow flow based on your selected product characteristics.',
      icon: <Layers className="w-5 h-5 text-amber-500 animate-pulse" />,
      stages: [
        'Ingesting approved product feature matrix...',
        'Simulating logical user navigation pathways...',
        'Constructing database-state changes per screen action...',
        'Structuring task completion triggers and visual feedback...',
        'Aligning user stories with learning rubrics...'
      ],
      skeleton: (
        <div className="space-y-6 opacity-35 animate-pulse max-w-2xl mx-auto mt-4">
          <div className="flex flex-col md:flex-row items-center justify-around gap-4">
            {[1, 2, 3].map((step, idx) => (
              <React.Fragment key={step}>
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl w-full md:w-48 text-center space-y-2 relative">
                  <div className="w-6 h-6 rounded-full bg-slate-300 mx-auto flex items-center justify-center text-[10px] text-white font-mono font-bold">
                    {step}
                  </div>
                  <div className="h-3 bg-slate-300 rounded-md w-3/4 mx-auto"></div>
                  <div className="h-2 bg-slate-200 rounded-md w-5/6 mx-auto"></div>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block w-8 h-0.5 bg-slate-200 relative">
                    <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-slate-300 animate-ping"></div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )
    },
    journey: {
      title: 'Synthesizing Screen Layouts & Wireframes',
      description: 'Vibelab is rendering semantic layout maps, CSS parameters, and visual container wires for each user interface screen.',
      icon: <Compass className="w-5 h-5 text-[#2563eb] animate-pulse" />,
      stages: [
        'Mapping view screens to the interactive roadmap...',
        'Polishing CSS flex grids and layout density constraints...',
        'Injecting standard UI accessibility color ranges...',
        'Synthesizing interactive prototype state managers...',
        'Double-checking mobile-responsiveness patterns...'
      ],
      skeleton: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-35 animate-pulse mt-4">
          {[1, 2].map((screen) => (
            <div key={screen} className="border border-slate-200 rounded-2xl bg-white overflow-hidden flex flex-col h-48 shadow-sm">
              <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="h-3 bg-slate-300 rounded w-1/3"></div>
                <div className="w-4 h-4 rounded-full bg-slate-200"></div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                  <div className="h-2 bg-slate-200 rounded w-full"></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 bg-slate-100 rounded"></div>
                  <div className="h-10 bg-slate-100 rounded"></div>
                  <div className="h-10 bg-slate-100 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }
  };

  const activeConfig = config[type];

  // Progress Bar smoothness
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const start = Date.now();
    const duration = 20000; // Expected approximate time for Gemini is ~20s

    const update = () => {
      const elapsed = Date.now() - start;
      const progressRatio = Math.min(elapsed / duration, 1);
      
      // Asymptotically approach 98%
      const newProgress = Math.floor(5 + (93 * (1 - Math.pow(1 - progressRatio, 2))));
      setProgress(Math.min(newProgress, 98));

      if (progressRatio < 1) {
        timer = setTimeout(update, 250);
      }
    };

    timer = setTimeout(update, 250);
    return () => clearTimeout(timer);
  }, []);

  // Cycling individual processing logs and message stages
  useEffect(() => {
    const stageInterval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % activeConfig.stages.length);
    }, 3800);

    return () => clearInterval(stageInterval);
  }, [activeConfig.stages.length]);

  return (
    <div className="p-6 md:p-8 bg-slate-50/50 rounded-2xl border border-slate-200/50 space-y-6 flex flex-col justify-center animate-fade-in">
      {/* Upper Progress HUD */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100/50">
            {activeConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-rose-500 animate-spin" /> Vibelab Engine Work
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight mt-0.5">
              {activeConfig.title}
            </h3>
          </div>
        </div>

        {/* Dynamic percentage readout */}
        <div className="text-right shrink-0">
          <span className="text-sm font-mono font-black text-blue-600 block">{progress}%</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Estimated Pipeline Progress</span>
        </div>
      </div>

      {/* Actual Progress Bar */}
      <div className="w-full">
        <div className="w-full bg-slate-200/60 rounded-full h-2.5 overflow-hidden border border-slate-200/30 p-0.5">
          <div 
            style={{ width: `${progress}%` }} 
            className="h-full bg-gradient-to-r from-[#2563eb] to-rose-500 rounded-full transition-all duration-300 ease-out"
          ></div>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[10px] font-mono font-semibold text-slate-600 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 animate-spin text-blue-500" /> {activeConfig.stages[statusIdx]}
          </span>
          <span className="text-[9px] text-[#2563eb] font-bold font-sans uppercase tracking-widest animate-pulse flex items-center gap-1">
            <Code2 className="w-3 h-3" /> Processing...
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-slate-500 leading-normal max-w-2xl">
        {activeConfig.description}
      </p>

      {/* Decorative Skeleton Area representing the drafted material */}
      <div className="pt-2">
        <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-2 mb-3">
          <span className="text-[9.5px] font-mono font-black uppercase text-slate-500 tracking-wider">Draft Schema Matrix Layout</span>
          <span className="text-[9px] font-semibold text-[#2563eb] px-2 py-0.5 bg-blue-50 rounded-md">Live Synthesis Preview</span>
        </div>
        
        {activeConfig.skeleton}
      </div>
    </div>
  );
};
