import React from "react";

interface EducationalAiBackgroundProps {
  isDark?: boolean;
}

export function EducationalAiBackground({ isDark = false }: EducationalAiBackgroundProps) {
  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none ${isDark ? "bg-transparent" : "bg-slate-50"}`}>
      {/* Ambient background glows - modern SaaS aesthetic adapted to light/dark themes */}
      <div 
        className={`absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] rounded-full blur-[100px] ${
          isDark ? "bg-cyan-500/5" : "bg-cyan-200/20"
        }`}
        aria-hidden="true"
      />
      <div 
        className={`absolute bottom-[-10%] left-[-10%] w-[55vw] h-[55vw] max-w-[650px] rounded-full blur-[120px] ${
          isDark ? "bg-[#C9A84C]/5" : "bg-slate-200/40"
        }`}
        aria-hidden="true"
      />
      <div 
        className={`absolute top-[30%] left-[15%] w-[300px] h-[300px] rounded-full blur-[80px] ${
          isDark ? "bg-cyan-500/3" : "bg-cyan-100/10"
        }`}
        aria-hidden="true"
      />

      {/* Grid Pattern overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.35]" aria-hidden="true">
        <defs>
          <pattern id="edu-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path 
              d="M 40 0 L 0 0 0 40" 
              fill="none" 
              stroke={isDark ? "rgba(148, 163, 184, 0.08)" : "rgba(203, 213, 225, 0.4)"} 
              strokeWidth="0.75" 
            />
            <circle cx="0" cy="0" r="1.5" fill={isDark ? "rgba(201, 168, 76, 0.12)" : "rgba(6, 182, 212, 0.15)"} />
            <circle cx="40" cy="0" r="1.5" fill={isDark ? "rgba(201, 168, 76, 0.12)" : "rgba(6, 182, 212, 0.15)"} />
            <circle cx="0" cy="40" r="1.5" fill={isDark ? "rgba(201, 168, 76, 0.12)" : "rgba(6, 182, 212, 0.15)"} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#edu-grid)" />
      </svg>

      {/* Interactive connection mesh behind everything */}
      <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
        {/* Soft diagonal connected pathways representing learning journeys */}
        <polyline 
          points="100,150 250,220 200,400 450,450" 
          fill="none" 
          stroke={isDark ? "rgba(201, 168, 76, 0.05)" : "rgba(6, 182, 212, 0.08)"} 
          strokeWidth="1.5" 
          strokeDasharray="6 4" 
          className="hidden md:block"
        />
        <polyline 
          points="1200,200 1050,350 1100,550 950,750" 
          fill="none" 
          stroke={isDark ? "rgba(6, 182, 212, 0.05)" : "rgba(6, 182, 212, 0.08)"} 
          strokeWidth="1.5" 
          strokeDasharray="6 4" 
          className="hidden lg:block"
        />
        <path 
          d="M 50,700 Q 180,750 220,900" 
          fill="none" 
          stroke={isDark ? "rgba(148, 163, 184, 0.06)" : "rgba(148, 163, 184, 0.12)"} 
          strokeWidth="1.5" 
          className="hidden md:block"
        />
      </svg>

      {/* FLOATING EDUCATIONAL AI THEMED EMBEDDED SYMBOLS */}
      {/* 1. Graduation Cap (Knowledge/Growth) - Top Right Area */}
      <div className={`absolute top-[12%] right-[10%] xl:right-[15%] hidden md:block select-none ${
        isDark ? "text-[#C9A84C]/10 opacity-70" : "text-cyan-600/15 opacity-80"
      }`}>
        <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.91a2 2 0 0 0 1.66 0z" />
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
          <path d="M21.5 12v6" />
        </svg>
      </div>

      {/* 2. Lightbulb (Creativity/Innovation) - Upper Left Area */}
      <div className={`absolute top-[18%] left-[8%] xl:left-[12%] hidden md:block select-none ${
        isDark ? "text-cyan-400/8 opacity-70" : "text-cyan-600/15 opacity-80"
      }`}>
        <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </svg>
      </div>

      {/* 3. Open Book (Education/Mentorship) - Middle-Lower Left Area */}
      <div className={`absolute bottom-[22%] left-[6%] xl:left-[10%] hidden md:block select-none ${
        isDark ? "text-[#C9A84C]/10 opacity-70" : "text-slate-400/20 opacity-80"
      }`}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </div>

      {/* 4. Connected Brain Synapses (AI learning/Neural) - Middle Right Area */}
      <div className={`absolute top-[42%] right-[8%] xl:right-[12%] hidden lg:block select-none ${
        isDark ? "text-cyan-500/8 opacity-60" : "text-slate-400/20 opacity-80"
      }`}>
        <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <circle cx="5" cy="8" r="2.5" />
          <circle cx="19" cy="8" r="2.5" />
          <circle cx="6" cy="16" r="2.5" />
          <circle cx="18" cy="16" r="2.5" />
          <line x1="7.5" y1="9" x2="9.5" y2="10.5" />
          <line x1="16.5" y1="9" x2="14.5" y2="10.5" />
          <line x1="8.5" y1="15" x2="10.5" y2="13.5" />
          <line x1="15.5" y1="15" x2="13.5" y2="13.5" />
          <line x1="12" y1="9" x2="12" y2="6" />
          <circle cx="12" cy="4" r="1.5" />
        </svg>
      </div>

      {/* 5. Code Brackets (Computer Science/Problem Solving) - Top Center Area */}
      <div className={`absolute top-[8%] left-[45%] hidden xl:block select-none ${
        isDark ? "text-[#C9A84C]/5 opacity-60" : "text-cyan-600/10 opacity-70"
      }`}>
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </div>

      {/* 6. Glowing Sparkles & Innovation Stars - Random Accents */}
      <div className={`absolute top-[34%] left-[28%] hidden md:block select-none animate-pulse ${
        isDark ? "text-[#C9A84C]/10" : "text-cyan-500/15"
      }`}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.4-6.6l-2.1 2.1m-9 9l-2.1 2.1m0-13.2l2.1 2.1m9 9l2.1 2.1" strokeLinecap="round" />
        </svg>
      </div>
      <div className={`absolute bottom-[15%] right-[25%] hidden md:block select-none animate-pulse ${
        isDark ? "text-cyan-400/10" : "text-cyan-500/15"
      }`} style={{ animationDelay: '1s' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.4-6.6l-2.1 2.1m-9 9l-2.1 2.1m0-13.2l2.1 2.1m9 9l2.1 2.1" strokeLinecap="round" />
        </svg>
      </div>

      {/* 7. Chat Bubbles/Prompt (Chat-based AI) - Bottom Right Area */}
      <div className={`absolute bottom-[10%] right-[8%] xl:right-[13%] hidden md:block select-none ${
        isDark ? "text-cyan-400/8 opacity-70" : "text-cyan-600/15 opacity-80"
      }`}>
        <svg width="74" height="74" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="8" cy="10" r="1.5" fill="currentColor" />
          <circle cx="12" cy="10" r="1.5" fill="currentColor" />
          <circle cx="16" cy="10" r="1.5" fill="currentColor" />
        </svg>
      </div>

      {/* 8. Infinite Loop/Diagram (Learning Journeys/Iterative Improvement) - Left Bottom Gutter */}
      <div className={`absolute bottom-[8%] left-[24%] hidden lg:block select-none ${
        isDark ? "text-slate-500/10" : "text-slate-400/15"
      }`}>
        <svg width="55" height="55" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 12a5 5 0 1 1 5-5.5a5 5 0 0 1-5 5.5Zm0 0a5 5 0 1 0-5 5.5a5 5 0 0 0 5-5.5Z" />
        </svg>
      </div>
    </div>
  );
}
