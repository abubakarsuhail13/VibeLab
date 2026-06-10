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
  Send,
  MessageSquare,
  HelpCircle,
  Eye,
  Settings,
  Zap,
  Info,
  Maximize2,
  X,
  FileCode
} from 'lucide-react';
import Phase2Stepper from '../../components/Phase2Stepper';

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
  const [selectedModalScreen, setSelectedModalScreen] = useState<ProductScreen | null>(null);

  // Edit feedbacks
  const [changeRequests, setChangeRequests] = useState('');

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

  const handleApproveLayoutsAndCompile = () => {
    toast.success('Layouts approved! Launching MVP builder space...');
    navigateTo('/phase/2/building');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans text-white">
        <Loader2 className="w-12 h-12 text-[#2563eb] animate-spin mb-4" />
        <p className="text-[#2563eb] font-jetbrains text-xs tracking-widest font-bold">LOADING HIGH-FIDELITY WIREFLOWS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#2563eb]/25 pb-24 relative overflow-hidden font-dmsans">
      {/* Decorative radial glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#2563eb]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl mx-auto px-6 py-12 pb-24">
        {/* Back navigation Row */}
        <button
          onClick={() => navigateTo('/phase/2/journey')}
          className="inline-flex items-center text-xs font-semibold font-jetbrains text-slate-500 hover:text-[#2563eb] mb-8 transition-colors uppercase gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Go back to Journey Map
        </button>

        {/* Step tracking line */}
        <Phase2Stepper activeStep={4} onNavigate={navigateTo} />

        {/* Big styled Bebas Header */}
        <div className="mb-12 text-center md:text-left">
          <h2 className="font-bebas text-5xl md:text-7xl tracking-widest text-[#2563eb] leading-none mb-4">
            YOUR PRODUCT SCREENS
          </h2>
          <p className="font-sans text-slate-650 text-sm md:text-base leading-relaxed max-w-2xl font-normal">
            Here are the screens for your product. Review each one.
          </p>
        </div>

        {/* Horizontal scrollable row of screen cards */}
        <div className="mb-12">
          <div className="flex flex-row overflow-x-auto gap-6 pb-6 pt-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {screens.map((sc, idx) => {
              // Frame the preview correctly inside the card
              const srcDoc = `
                <!DOCTYPE html>
                <html>
                <head>
                  <script src="https://cdn.tailwindcss.com"></script>
                  <style>
                    body {
                      background: #02050e;
                      color: white;
                      font-family: sans-serif;
                      padding: 16px;
                      margin: 0;
                      overflow: hidden;
                      height: 100%;
                    }
                  </style>
                </head>
                <body>
                  ${sc.layout_html}
                </body>
                </html>
              `;

              return (
                <motion.div
                  key={sc.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedModalScreen(sc)}
                  className="w-[280px] sm:w-[320px] shrink-0 bg-white/65 border border-slate-200 hover:border-[#2563eb]/50 rounded-2xl p-4.5 cursor-pointer flex flex-col justify-between group shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Card top details */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-bold font-jetbrains text-[#2563eb] tracking-widest uppercase">
                      SCREEN 0{idx + 1}
                    </span>
                    <Maximize2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#2563eb] transition-colors" />
                  </div>

                  {/* Sandboxed responsive preview iframe */}
                  <div className="w-full h-44 bg-white rounded-xl overflow-hidden border border-slate-200 pointer-events-none relative mb-4">
                    <iframe
                      srcDoc={srcDoc}
                      className="w-full h-full border-0"
                      title={`Card preview: ${sc.screen_name}`}
                      sandbox="allow-scripts"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider font-jetbrains bg-white/90 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                        Render Mock
                      </span>
                    </div>
                  </div>

                  {/* Screen Content Metadata */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-[#2563eb] transition-colors font-sans truncate">
                      {sc.screen_name}
                    </h4>
                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                      {sc.screen_purpose}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Change Request refinement form box */}
        <div className="bg-white/50 rounded-2xl border border-slate-200 p-6 md:p-8 mb-12">
          <h3 className="font-bebas text-2xl tracking-widest text-[#2563eb] mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#2563eb]" /> Request changes (optional)
          </h3>
          <p className="text-xs text-slate-500 font-sans leading-relaxed mb-5">
            Describe what you would like changed... We will automatically weave these refinements into the final layouts.
          </p>

          <div className="space-y-4">
            <textarea
              value={changeRequests}
              onChange={(e) => setChangeRequests(e.target.value)}
              disabled={isSubmitting || isCompiling}
              placeholder="Describe what you would like changed..."
              rows={3}
              className="w-full bg-white border border-slate-200 focus:border-[#2563eb] text-sm text-slate-800 p-5 rounded-xl outline-none transition-all placeholder:text-slate-650 resize-y leading-relaxed font-sans"
            />

            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              {/* Secondary button (Outline): Request Changes */}
              <button
                onClick={handleRegenerateScreens}
                disabled={isSubmitting || isCompiling || !changeRequests.trim()}
                className="inline-flex items-center justify-center bg-white hover:bg-white text-[#2563eb] border border-[#2563eb]/30 hover:border-[#2563eb] font-bold text-xs tracking-widest uppercase px-6 py-4 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer font-jetbrains"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2.5 animate-spin text-[#2563eb]" />
                    REFRACTING SCREENS...
                  </>
                ) : (
                  'Request Changes'
                )}
              </button>

              {/* Primary button (Gold): Build My MVP */}
              <button
                onClick={handleApproveLayoutsAndCompile}
                disabled={isSubmitting || isCompiling}
                className="inline-flex items-center justify-center bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] text-white font-extrabold tracking-widest text-xs sm:text-sm uppercase px-8 py-4 px-10 rounded-xl transition-all shadow-xl shadow-[#2563eb]/5 hover:shadow-[#2563eb]/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isCompiling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2.5 animate-spin text-black" />
                    COMPILING MVP CODEBASE...
                  </>
                ) : (
                  <>
                    Build My MVP <ArrowRight className="w-4.5 h-4.5 ml-2.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Technical Metadata paths row (Explicitly requirement: "Show every file path") */}
        <div className="pt-6 border-t border-slate-200 flex flex-wrap gap-4 items-center justify-between text-slate-500 font-jetbrains text-[9px] uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>Active Modules Checklist:</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="text-slate-500 hover:text-[#2563eb] transition-colors">
              src/pages/Phase2/FeaturesScreen.tsx
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500 hover:text-[#2563eb] transition-colors">
              src/pages/Phase2/JourneyScreen.tsx
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-[#2563eb] transition-colors">
              src/pages/Phase2/ScreensPreview.tsx
            </span>
          </div>
        </div>
      </div>

      {/* Expanded high-fidelity interactive preview modal overlay */}
      <AnimatePresence>
        {selectedModalScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-5xl bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh]"
            >
              {/* Modal top heading bar */}
              <div className="flex justify-between items-center bg-white p-4.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4 text-[#2563eb]" />
                  <span className="font-jetbrains text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-slate-200">
                    HI-FI INTERACTIVE WIREFRAME
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide font-sans ml-2.5">
                    {selectedModalScreen.screen_name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedModalScreen(null)}
                  className="p-1 px-2 rounded-lg bg-white text-slate-500 hover:text-white transition-all border border-slate-200 flex items-center justify-center gap-1.5 text-[10px] font-jetbrains uppercase tracking-widest cursor-pointer"
                >
                  <X className="w-4.5 h-4.5 text-rose-500" /> Close View
                </button>
              </div>

              {/* Centered iframe preview viewport */}
              <div className="flex-1 bg-white p-6 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                  <iframe
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
                        <style>
                          body {
                            background: #02050e;
                            color: white;
                            font-family: 'DM Sans', sans-serif;
                            padding: 32px;
                            margin: 0;
                            height: 100%;
                            overflow-y: auto;
                          }
                          .font-bebas { font-family: 'Bebas Neue', sans-serif; }
                          .font-jetbrains { font-family: 'JetBrains Mono', sans-serif; }
                        </style>
                      </head>
                      <body>
                        ${selectedModalScreen.layout_html}
                      </body>
                      </html>
                    `}
                    className="w-full h-full border-0 select-text"
                    title={`Modal Full View: ${selectedModalScreen.screen_name}`}
                    sandbox="allow-scripts"
                  />
                </div>
              </div>

              {/* Display specifications below iframe */}
              <div className="p-5.5 bg-white border-t border-slate-200 flex flex-wrap gap-4 items-start justify-between">
                <div className="space-y-1 max-w-xl">
                  <span className="block text-[9px] font-bold font-jetbrains text-[#2563eb] uppercase tracking-widest">
                    Mechanism Specs
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                    {selectedModalScreen.screen_description}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="block text-[9px] font-bold font-jetbrains text-[#2563eb] uppercase tracking-widest">
                    Layout Purpose
                  </span>
                  <span className="inline-block text-[10px] text-slate-600 font-bold font-sans bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    {selectedModalScreen.screen_purpose}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
