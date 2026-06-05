import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  Sparkles, 
  Check, 
  Layout, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Send,
  MessageSquare,
  HelpCircle,
  Eye,
  Settings,
  Zap,
  Info
} from 'lucide-react';

interface ProductScreen {
  id: number;
  screen_name: string;
  screen_description: string;
  screen_purpose: string;
  layout_html: string;
}

interface ProductSession {
  id: number;
  current_step: string;
  status: string;
}

export default function ScreensPreview({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [session, setSession] = useState<ProductSession | null>(null);
  const [screens, setScreens] = useState<ProductScreen[]>([]);
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);

  // Edit feedbacks
  const [changeRequests, setChangeRequests] = useState('');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      if (!token) {
        toast.error('You must be logged in to access Phase 2');
        navigateTo('/login');
        return;
      }

      const res = await fetch('/api/product/session', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to load session details');
      }

      const data = await res.json();
      if (!data.session) {
        navigateTo('/phase/2');
        return;
      }

      setSession(data.session);

      if (data.screens && data.screens.length > 0) {
        setScreens(data.screens);
        setActiveScreenIndex(0);
      } else {
        toast.error('Screens have not been generated yet. Redirecting back to user journey mapping!');
        navigateTo('/phase/2/journey');
        return;
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error fetching visual screens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateScreens = async () => {
    if (!changeRequests.trim()) {
      toast.error('Please enter details of the refinement or change request first!');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/screens/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session?.id,
          change_requests: changeRequests
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to apply change request');
      }

      const data = await res.json();
      if (data.screens && data.screens.length > 0) {
        setScreens(data.screens);
        setActiveScreenIndex(0);
        setChangeRequests('');
        toast.success('AI successfully incorporated feedback and regenerated your wireflow screens! 🚀');
      } else {
        throw new Error('No screens returned from the regeneration session');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error processing screen adjustments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveLayoutsAndCompile = async () => {
    setIsCompiling(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/screens/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session?.id
          // No change_requests sent triggers final approval and compilations
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to approve layout layouts');
      }

      toast.success('Layouts approved! Deeply integrating interactive client-side logic to compile your MVP...');
      
      // Navigate to current review or complete step
      navigateTo('/dashboard');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed compiling your functional MVP');
    } finally {
      setIsCompiling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#02050e] flex flex-col justify-center items-center font-sans text-white">
        <Loader2 className="w-12 h-12 text-[#C9A84C] animate-spin mb-4" />
        <p className="text-[#C9A84C] font-jetbrains text-xs tracking-widest font-bold">LOADING HIGH-FIDELITY WIREFLOWS...</p>
      </div>
    );
  }

  const currentScreen = screens[activeScreenIndex];

  return (
    <div className="min-h-screen bg-[#02050e] text-white selection:bg-[#C9A84C]/25 pb-24 relative overflow-hidden font-dmsans">
      {/* Golden backdrop particles layout */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#C9A84C]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl mx-auto px-6 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigateTo('/phase/2/journey')}
          className="inline-flex items-center text-xs font-semibold font-jetbrains text-slate-400 hover:text-[#C9A84C] mb-8 transition-colors uppercase gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Go back to Journey
        </button>

        {/* Progress Tracker (Step 4 of 10) */}
        <div className="mb-10 p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 font-jetbrains mb-3">
            <span className="text-[#C9A84C] uppercase tracking-widest font-black">Step 4 of 10</span>
            <span>Product Screens View</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '30%' }}
              animate={{ width: '40%' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="bg-gradient-to-r from-[#C9A84C] to-[#E3C268] h-full rounded-full"
            />
          </div>
        </div>

        {/* Header content */}
        <div className="mb-10 text-center sm:text-left">
          <h2 className="font-bebas text-4xl sm:text-6xl tracking-widest text-white leading-none mb-3">
            YOUR WIREFRAME SCREENS
          </h2>
          <p className="font-dmsans text-slate-400 text-sm sm:text-base leading-relaxed max-w-3xl">
            Here are high-fidelity mockups of your UI layouts. Switch between views using the tabs below, test responsiveness, and use the adjustment block to suggest final style/text enhancements.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Vertical layout controls/sidebar (Spans 1 Column) */}
          <div className="space-y-6 lg:col-span-1">
            <h4 className="font-bebas text-xl text-[#C9A84C] tracking-wider mb-2 flex items-center gap-1.5">
              <Layout className="w-4 h-4" /> Layout Sections
            </h4>
            
            <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-3 lg:pb-0 scrollbar-none select-none">
              {screens.map((sc, i) => (
                <button
                  key={sc.id}
                  onClick={() => setActiveScreenIndex(i)}
                  className={`w-full text-left p-4 rounded-xl border text-xs font-semibold transition-all shrink-0 lg:shrink flex flex-col gap-1.5 cursor-pointer max-w-[200px] lg:max-w-none ${
                    activeScreenIndex === i
                      ? 'bg-[#C9A84C]/10 border-[#C9A84C] text-[#C9A84C]'
                      : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="font-jetbrains font-bold text-[9px] uppercase tracking-widest opacity-60">
                    SCREEN 0{i + 1}
                  </span>
                  <span className="font-sans truncate text-sm">
                    {sc.screen_name}
                  </span>
                </button>
              ))}
            </div>

            {/* Current Screen Meta Details */}
            {currentScreen && (
              <motion.div
                key={activeScreenIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-950 p-5 rounded-2xl border border-slate-900 space-y-3.5"
              >
                <div className="text-xs font-semibold text-slate-500 font-jetbrains uppercase tracking-widest pb-2 border-b border-slate-900 flex justify-between items-center">
                  <span>Purpose Specs</span>
                  <Zap className="w-3.5 h-3.5 text-[#C9A84C]" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-300 font-sans mb-1 uppercase">Purpose</h5>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">{currentScreen.screen_purpose}</p>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-300 font-sans mb-1 uppercase">Mechanisms</h5>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">{currentScreen.screen_description}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Interactive Screen viewport (Spans 3 Columns) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Viewport bar options */}
            <div className="flex justify-between items-center bg-slate-950/80 p-4.5 rounded-2xl border border-slate-900 flex-wrap gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#C9A84C] inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span className="text-xs font-semibold font-jetbrains text-slate-400 uppercase tracking-widest ml-3.5">
                  {currentScreen?.screen_name || 'High-fidelity Wireframe'}
                </span>
              </div>
              
              {/* Responsive Size Selectors */}
              <div className="flex gap-1">
                {(['desktop', 'tablet', 'mobile'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewportMode(mode)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer ${
                      viewportMode === mode
                        ? 'bg-[#C9A84C]/10 border-[#C9A84C] text-[#C9A84C]'
                        : 'bg-slate-950 text-slate-500 border-slate-900 hover:text-slate-300 hover:border-slate-800'
                    }`}
                    title={`Preview in ${mode} viewport`}
                  >
                    {mode === 'desktop' && <Monitor className="w-4 h-4" />}
                    {mode === 'tablet' && <Tablet className="w-4 h-4" />}
                    {mode === 'mobile' && <Smartphone className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Outer Viewport Box mapping aspect rules */}
            <div className="w-full flex justify-center items-center bg-slate-950/30 p-4 border border-slate-900 rounded-3xl min-h-[500px]">
              <motion.div
                key={`${activeScreenIndex}-${viewportMode}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`bg-slate-950 relative overflow-y-auto border border-slate-800 rounded-2xl shadow-2xl origin-center duration-3 transition-all scrollbar-thin ${
                  viewportMode === 'desktop' 
                    ? 'w-full h-[620px]' 
                    : viewportMode === 'tablet' 
                      ? 'w-[768px] h-[580px]' 
                      : 'w-[375px] h-[520px]'
                }`}
              >
                {/* HTML rendering inside safely framed container */}
                <div 
                  className="w-full min-h-full font-sans bg-[#02050e]"
                  dangerouslySetInnerHTML={{ __html: currentScreen?.layout_html || '' }}
                />
              </motion.div>
            </div>

            {/* Adjustments Panel (Change request/refinement field) */}
            <div className="bg-slate-950/40 p-6 rounded-3xl border border-slate-850 shadow-xl space-y-5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#C9A84C]" />
                <h4 className="font-bebas text-xl text-white tracking-widest uppercase">
                  WANT TO MAKE CHANGES OR ADJUSTMENTS?
                </h4>
              </div>

              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Need to fine-tune colors, descriptions, button names, or screen details? Write your feedback below and VibeLab's PM Assistant will regenerate updated versions instantly.
              </p>

              <div>
                <textarea
                  value={changeRequests}
                  onChange={(e) => setChangeRequests(e.target.value)}
                  disabled={isSubmitting || isCompiling}
                  placeholder="e.g. Change the main theme button colors to a bright sleek neon gold, make sure the dashboards have a customer avatar logo at the top right, and add an info button to each panel."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-[#C9A84C] text-sm text-slate-100 p-5 rounded-xl outline-none transition-all placeholder:text-slate-650 resize-y leading-relaxed font-sans"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
                {/* Secondary Button: Request Edits */}
                <button
                  onClick={handleRegenerateScreens}
                  disabled={isSubmitting || isCompiling || !changeRequests.trim()}
                  className="flex-1 inline-flex items-center justify-center bg-slate-950 hover:bg-slate-900 text-[#C9A84C] border border-[#C9A84C]/30 hover:border-[#C9A84C] font-bold text-xs tracking-wider uppercase px-6 py-4 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2.5 animate-spin text-[#C9A84C]" />
                      REGENERATING SCREEN LAYOUTS...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2.5 text-[#C9A84C]" />
                      Submit Style Adjustment
                    </>
                  )}
                </button>

                {/* Primary Button: Approve Screen Wireflows */}
                <button
                  onClick={handleApproveLayoutsAndCompile}
                  disabled={isSubmitting || isCompiling}
                  className="flex-1 inline-flex items-center justify-center bg-gradient-to-r from-[#C9A84C] to-[#E3C268] hover:from-[#E3C268] hover:to-[#C9A84C] text-black font-extrabold tracking-wider text-xs sm:text-sm uppercase px-8 py-4 rounded-xl transition-all shadow-xl shadow-[#C9A84C]/5 hover:shadow-[#C9A84C]/20 disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                >
                  {isCompiling ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin text-black" />
                      COMPILING MVP CODE RUNTIME...
                    </>
                  ) : (
                    <>
                      Looks Good — Approve Layouts <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#C9A84C]/5 border border-[#C9A84C]/15 flex items-start gap-3 mt-4">
                <Info className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Approving screen wireflows will prompt the AI system to weave these components together into a <strong>dynamic single-file functional MVP application</strong>. It compiles physical event tracking, responsive modal dialog flows, and full layout logic to test live within your learning dashboard!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
