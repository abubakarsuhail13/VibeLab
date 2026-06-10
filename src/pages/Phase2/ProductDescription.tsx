import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { Loader2, ArrowRight, Save, Sparkles, FileText } from 'lucide-react';
import Phase2Stepper from '../../components/Phase2Stepper';

export default function ProductDescription({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchSessionData();
  }, []);

  const fetchSessionData = async () => {
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
          setDescription(data.mvp.product_description || '');
        } else {
          toast.error('No compiled MVP found. Redirecting to compileLoading space...');
          navigateTo('/phase/2/building');
        }
      } else {
        toast.error('No active session found.');
        navigateTo('/phase/2');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error loading product description.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error('Description cannot be empty!');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/description/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          product_description: description
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save product description');
      }

      toast.success('Description saved! Let\'s explain your features.');
      navigateTo('/phase/2/explain');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error occurred while saving description.');
    } finally {
      setIsSaving(false);
    }
  };

  // Live word counter helper
  const wordCount = description.trim() === '' ? 0 : description.trim().split(/\s+/).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans text-white">
        <Loader2 className="w-12 h-12 text-[#2563eb] animate-spin mb-4" />
        <p className="text-[#2563eb] font-jetbrains text-xs tracking-widest font-bold">LOADING LAUNCH STORY...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#2563eb]/25 pb-24 relative overflow-hidden font-dmsans">
      {/* Immersive background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#2563eb]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#2563eb]/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto px-6 py-12">
        
        {/* Step Progression Bar (Step 7 of 10) */}
        <Phase2Stepper activeStep={7} onNavigate={navigateTo} />

        {/* Branding & Header */}
        <div className="text-center md:text-left mb-8 space-y-3">
          <h2 className="font-bebas text-5xl md:text-7xl tracking-widest text-[#2563eb] leading-none">
            YOUR PRODUCT DESCRIPTION
          </h2>
          <p className="text-slate-650 text-base md:text-lg leading-relaxed">
            This is how you explain your product to others. Edit it until it sounds like you.
          </p>
        </div>

        {/* Main Work Area */}
        <div className="space-y-6">
          <div className="bg-white/65 border border-slate-200 rounded-3xl p-6 md:p-8 backdrop-blur-sm space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center select-none text-[10px] font-bold font-jetbrains text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-3">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <FileText className="w-3.5 h-3.5" /> EDITING MODE ACTIVE
              </span>
              <span>MARKETING PITCH CODES</span>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={12}
              className="w-full bg-white hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-200 focus:border-[#2563eb] text-slate-700 px-5 py-4 rounded-2xl outline-none transition-all placeholder:text-slate-650 font-sans text-sm md:text-base leading-relaxed resize-y select-text"
              placeholder="Your product description pitch space..."
            />

            {/* Word Counter Indicator */}
            <div className="flex justify-between items-center text-xs font-jetbrains">
              <span className="text-slate-500">
                Total Words: <strong className="text-[#2563eb]">{wordCount}</strong>
              </span>
              <span className="text-slate-550 italic">
                Focus on problem, solution & impact
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/15 border border-cyan-950/30 flex items-start gap-3 select-none">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              <strong>Tip:</strong> Keep the tone energetic and focused on how this makes your users' lives better. Your future crowdfunding pages and pitch decks will use this exact launch pitch as their hero summary!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between pt-4 border-t border-slate-200 select-none">
            <button
              onClick={() => navigateTo('/phase/2/review')}
              className="px-6 py-4 bg-white border border-slate-200 hover:border-slate-200 text-slate-600 hover:text-slate-700 text-xs font-black font-jetbrains tracking-widest uppercase rounded-xl transition-all cursor-pointer"
            >
              Go Back to Review
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center justify-center bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] text-white font-extrabold tracking-widest text-xs uppercase px-8 py-4 rounded-xl transition-all shadow-xl shadow-[#2563eb]/5 hover:shadow-[#2563eb]/15 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2.5 animate-spin" />
                  SAVING CODES...
                </>
              ) : (
                <>
                  Save My Description <ArrowRight className="w-4 h-4 ml-2.5" />
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
