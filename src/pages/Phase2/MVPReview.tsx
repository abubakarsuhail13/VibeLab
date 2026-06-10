import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Loader2, Play, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import Phase2Stepper from '../../components/Phase2Stepper';

interface MVPData {
  id: number;
  session_id: number;
  mvp_html: string;
  architecture_explanation: string;
  builder_reflection?: string | null;
}

export default function MVPReview({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [mvp, setMvp] = useState<MVPData | null>(null);
  const [reflection, setReflection] = useState('');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      if (!token) {
        toast.error('Session timeout, please log in.');
        navigateTo('/login');
        return;
      }

      const res = await fetch('/api/product/session', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve active step session.');
      }

      const data = await res.json();
      if (data.session) {
        setSessionId(data.session.id);
        if (data.mvp) {
          setMvp(data.mvp);
          setReflection(data.mvp.builder_reflection || '');
          
          // Generate a local blob URL for fully independent sandbox opening
          const blob = new Blob([data.mvp.mvp_html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        } else {
          // Fallback if they navigated manually but haven't compiled yet
          toast.error('No compiled MVP found. Redirecting to compileLoading space...');
          navigateTo('/phase/2/building');
        }
      } else {
        toast.error('No active session found.');
        navigateTo('/phase/2');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error loading MVP specifications.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveMVP = async () => {
    if (!reflection.trim()) {
      toast.error('Please share a few sentences about what you learned building this prototype.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/mvp/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          builder_reflection: reflection
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Approval registration failed');
      }

      toast.success('MVP build and reflection approved! Transforming into your campaign description kit...');
      navigateTo('/phase/2/description');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to approve your prototype');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe split helper for instructions sections
  const parseExplanation = (text: string) => {
    const sections = {
      built: '',
      does: '',
      helps: ''
    };

    if (!text) return sections;

    const idxBuilt = text.indexOf('🏗️');
    const idxDoes = text.indexOf('✨');
    const idxHelps = text.indexOf('👥');

    if (idxBuilt !== -1 && idxDoes !== -1 && idxHelps !== -1) {
      sections.built = text.substring(idxBuilt, idxDoes).replace(/🏗️\s*(How It's Built|How It’s Built)/gi, '').trim();
      sections.does = text.substring(idxDoes, idxHelps).replace(/✨\s*What It Does/gi, '').trim();
      sections.helps = text.substring(idxHelps).replace(/👥\s*Who It Helps/gi, '').trim();
    } else {
      // Fallback chunking
      const segments = text.split('\n\n');
      sections.built = segments[0] || '';
      sections.does = segments[1] || '';
      sections.helps = segments.slice(2).join('\n\n') || '';
    }

    return sections;
  };

  const parsedExplanation = mvp ? parseExplanation(mvp.architecture_explanation) : { built: '', does: '', helps: '' };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans text-white">
        <Loader2 className="w-12 h-12 text-[#2563eb] animate-spin mb-4" />
        <p className="text-[#2563eb] font-jetbrains text-xs tracking-widest font-bold">LOADING MENTOR REVIEW PANEL...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#2563eb]/25 pb-24 relative overflow-hidden font-dmsans">
      {/* Absolute graphic glow backdrops */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#2563eb]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto px-6 py-12">
        {/* Step Header */}
        <Phase2Stepper activeStep={6} onNavigate={navigateTo} />

        {/* Introduction Panel */}
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="font-bebas text-5xl md:text-7xl tracking-widest text-[#2563eb] leading-none mb-4">
              MVP REVIEW BOARD
            </h2>
            <p className="font-sans text-slate-650 text-sm md:text-base leading-relaxed max-w-2xl font-normal">
              Test your newly compiled interactive micro-app sandbox, understand the design mechanics under the hood, and log your insights to complete the functional prototype phase.
            </p>
          </div>
        </div>

        {/* Responsive Side-by-Side Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 mb-12">
          
          {/* LEFT 60% PANEL: Sandboxed Iframe Previews */}
          <div className="lg:col-span-6 flex flex-col h-[650px] bg-white border border-slate-200 hover:border-slate-200 p-4 rounded-3xl shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/85"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/85"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/85"></span>
                <span className="ml-2 font-jetbrains text-xs font-black text-[#2563eb] tracking-wider uppercase">
                  YOUR WORKING MVP
                </span>
              </div>
              
              {blobUrl && (
                <a
                  href={blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2563eb]/10 border border-[#2563eb]/20 hover:bg-[#2563eb]/20 text-[10px] font-bold font-[#2563eb] text-[#2563eb] font-jetbrains uppercase rounded-md transition-all cursor-pointer"
                >
                  Open Full Screen <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Sandbox Simulation Frame */}
            <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-inner relative border border-slate-100 dark:border-none">
              {mvp?.mvp_html ? (
                <iframe
                  id="mvp-sandbox"
                  title="MVP Interactive Prototype Sandbox"
                  sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                  srcDoc={mvp.mvp_html}
                  className="w-full h-full border-none object-contain"
                />
              ) : (
                <div className="absolute inset-0 bg-slate-50 flex flex-col justify-center items-center text-slate-500 gap-4">
                  <RefreshCw className="w-10 h-10 animate-spin text-[#2563eb]" />
                  <p className="font-jetbrains text-xs tracking-wider uppercase text-[#2563eb]">LOADING SANDBOX SOURCE...</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 40% PANEL: Structural Guide & Mentor Architecture */}
          <div className="lg:col-span-4 flex flex-col h-[650px] bg-white/50 border border-slate-200 p-6 rounded-3xl shadow-xl overflow-hidden backdrop-blur-sm">
            <h3 className="font-bebas text-4xl tracking-widest text-slate-900 leading-none mb-6 border-b border-slate-200 pb-4">
              HOW YOUR PRODUCT WORKS
            </h3>

            {/* Scrollable Architecture Content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-850 scrollbar-track-transparent">
              
              {/* How It's Built */}
              <div className="space-y-2">
                <h4 className="font-sans text-xs font-black tracking-widest text-[#2563eb] uppercase flex items-center gap-2">
                  🏗️ How It's Built
                </h4>
                <div className="font-sans text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-wrap select-text pl-1.5">
                  {parsedExplanation.built || 'Explain specifications currently compiling from layout codes.'}
                </div>
              </div>

              {/* What It Does */}
              <div className="space-y-2 border-t border-slate-200 pt-6">
                <h4 className="font-sans text-xs font-black tracking-widest text-[#2563eb] uppercase flex items-center gap-2">
                  ✨ What It Does
                </h4>
                <div className="font-sans text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-wrap select-text pl-1.5">
                  {parsedExplanation.does || 'Explain actions executing inside client interactive fields.'}
                </div>
              </div>

              {/* Who It Helps */}
              <div className="space-y-2 border-t border-slate-200 pt-6">
                <h4 className="font-sans text-xs font-black tracking-widest text-[#2563eb] uppercase flex items-center gap-2">
                  👥 Who It Helps
                </h4>
                <div className="font-sans text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-wrap select-text pl-1.5">
                  {parsedExplanation.helps || 'Explain user objectives addressed inside the MVP dashboard.'}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Reflection Field & Bottom Action Form */}
        <div className="p-8 rounded-3xl bg-white/40 border border-slate-200 backdrop-blur-md space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black tracking-wider font-jetbrains text-[#2563eb] uppercase flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 bg-[#2563eb] rounded-full inline-block animate-pulse"></span>
              What did you learn building this?
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              placeholder="Write a few sentences about your experience, what challenges you solved, and how it feels to interact with your code as an operating digital product..."
              className="w-full bg-white border border-slate-200 hover:border-slate-200 focus:border-[#2563eb] text-sm text-slate-700 px-5 py-4 rounded-xl outline-none transition-all placeholder:text-slate-650 font-normal font-sans resize-y leading-relaxed"
            />
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/15 border border-cyan-950/30 flex items-start gap-3 select-none">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              <strong>Tip:</strong> Submitting approvals will complete the product synthesis and automatically open Phase 3 — Testing & Validation, allowing you to prompt high-fidelity diagnostic surveys to prospective users!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-200">
            <button
              onClick={handleApproveMVP}
              disabled={isSubmitting}
              className="flex-1 order-1 sm:order-2 inline-flex items-center justify-center bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] text-white font-extrabold tracking-widest text-xs uppercase px-8 py-4 rounded-xl transition-all shadow-xl shadow-[#2563eb]/5 hover:shadow-[#2563eb]/15 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-55 disabled:pointer-events-none cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2.5 animate-spin text-black" />
                  SUBMITTING APPROVALS...
                </>
              ) : (
                <>
                  I'm Happy — Approve My MVP <ArrowRight className="w-4 h-4 ml-2.5" />
                </>
              )}
            </button>

            <button
              onClick={() => navigateTo('/phase/2/screens')}
              disabled={isSubmitting}
              className="w-full sm:w-auto order-2 sm:order-1 px-6 py-4 bg-white border border-slate-200 hover:border-slate-200 hover:text-slate-700 text-slate-500 font-jetbrains text-xs font-black tracking-widest uppercase rounded-xl transition-colors cursor-pointer"
            >
              I Want Changes
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
