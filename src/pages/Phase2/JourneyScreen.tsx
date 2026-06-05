import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  Sparkles, 
  Check, 
  MapPin, 
  User, 
  Compass, 
  Play, 
  ArrowDown,
  FileText
} from 'lucide-react';

interface JourneyStep {
  step_number: number;
  title: string;
  description: string;
}

interface UserJourneyData {
  steps: JourneyStep[];
  key_actions: string[];
}

interface ProductSession {
  id: number;
  current_step: string;
  status: string;
}

export default function JourneyScreen({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [session, setSession] = useState<ProductSession | null>(null);
  const [journey, setJourney] = useState<UserJourneyData | null>(null);

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

      // If user journey doesn't exist, we fallback or show error
      if (!data.user_journey) {
        toast.error('User journey was not generated yet. Redirecting back to feature selection!');
        navigateTo('/phase/2/features');
        return;
      }

      setJourney(data.user_journey);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error fetching user journey');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveJourney = async () => {
    setIsApproving(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/journey/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session?.id
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to approve user journey');
      }

      toast.success('User journey approved! AI is compiling high-fidelity layout screens...');
      navigateTo('/phase/2/screens');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error approving user journey');
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#02050e] flex flex-col justify-center items-center font-sans text-white">
        <Loader2 className="w-12 h-12 text-[#C9A84C] animate-spin mb-4" />
        <p className="text-[#C9A84C] font-jetbrains text-xs tracking-widest font-bold">LOADING PILOT JOURNAL SCHEMA...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02050e] text-white selection:bg-[#C9A84C]/25 pb-24 relative overflow-hidden font-dmsans">
      {/* Premium ambient background glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#C9A84C]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto px-6 py-12">
        {/* Custom Back Button */}
        <button
          onClick={() => navigateTo('/phase/2/features')}
          className="inline-flex items-center text-xs font-semibold font-jetbrains text-slate-400 hover:text-[#C9A84C] mb-8 transition-colors uppercase gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Features
        </button>

        {/* Progress Tracker (Step 3 of 10) */}
        <div className="mb-10 p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 font-jetbrains mb-3">
            <span className="text-[#C9A84C] uppercase tracking-widest font-black">Step 3 of 10</span>
            <span>User Journey Map</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '20%' }}
              animate={{ width: '30%' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="bg-gradient-to-r from-[#C9A84C] to-[#E3C268] h-full rounded-full"
            />
          </div>
        </div>

        {/* Header content */}
        <div className="mb-10 text-center sm:text-left">
          <h2 className="font-bebas text-4xl sm:text-6xl tracking-widest text-white leading-none mb-3">
            USER JOURNEY MAP
          </h2>
          <p className="font-dmsans text-slate-400 text-sm sm:text-base leading-relaxed max-w-3xl">
            Based on your approved product features, this User Journey maps out the step-by-step experience of your users. Review each checkpoint to ensure every touchpoint feels natural and intuitive.
          </p>
        </div>

        {/* Journey Breakdown (Grid layout: Left = Step flowchart, Right = Key Actions card) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Flowchart list of steps (Columns Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-bebas text-2xl tracking-widest text-[#C9A84C] mb-4 flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#C9A84C]" /> Step-by-Step Experience Flow
            </h3>

            <div className="relative pl-10 border-l border-slate-800 space-y-12 py-4">
              {journey?.steps?.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.15 }}
                  className="relative group"
                >
                  {/* Glowing Node Marker */}
                  <div className="absolute left-[-52px] top-0 w-6 h-6 rounded-full bg-slate-950 border-2 border-[#C9A84C] flex items-center justify-center font-jetbrains text-[10px] text-[#C9A84C] font-black group-hover:bg-[#C9A84C] group-hover:text-black transition-all">
                    {step.step_number || idx + 1}
                  </div>

                  <div className="bg-slate-950/40 hover:bg-slate-950/65 border border-slate-900 hover:border-slate-800/80 p-6 rounded-2xl transition-all shadow-md group-hover:translate-x-1 duration-200">
                    <h4 className="text-base font-bold text-white mb-2 tracking-wide font-sans flex items-center justify-between">
                      {step.title}
                      <span className="text-[10px] font-bold font-jetbrains text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        TOUCHPOINT {idx + 1}
                      </span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Key Actions Column */}
          <div className="space-y-6">
            <h3 className="font-bebas text-2xl tracking-widest text-[#C9A84C] mb-4 flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#C9A84C]" /> Key User Actions
            </h3>

            <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center gap-2 text-xs font-semibold font-jetbrains text-[#C9A84C] uppercase tracking-wider pb-4 border-b border-slate-800">
                <Sparkles className="w-4 h-4" /> Crucial Actions List
              </div>
              
              <ul className="space-y-4">
                {journey?.key_actions?.map((act, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-3 items-start"
                  >
                    <div className="p-1 rounded-md bg-[#C9A84C]/10 text-[#C9A84C] mt-0.5 shrink-0 border border-[#C9A84C]/15">
                      <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    </div>
                    <span className="text-xs sm:text-sm leading-relaxed text-slate-300 font-sans font-medium">
                      {act}
                    </span>
                  </motion.li>
                ))}
              </ul>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-500 leading-relaxed font-sans">
                These critical action points represent the core interactions of your product layouts. We will ensure the user experiences these seamlessly in our high-fidelity wireflows.
              </div>
            </div>
          </div>
        </div>

        {/* Approval Bottom Container */}
        <div className="mt-14 space-y-8 bg-slate-950/40 border border-slate-800 p-8 rounded-3xl shadow-xl backdrop-blur-md">
          <div className="p-4 rounded-2xl bg-[#C9A84C]/5 border border-[#C9A84C]/15 flex items-start gap-3">
            <Compass className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400 font-medium leading-relaxed">
              <strong className="text-white block mb-1">🎭 UX Storyboarding Hint</strong>
              Mapping user behavior teaches you to view products from a user's perspective. In the next step, our builder will generate interactive layout visual previews based entirely on this step outline.
            </div>
          </div>

          <button
            onClick={handleApproveJourney}
            disabled={isApproving}
            className="w-full inline-flex items-center justify-center bg-gradient-to-r from-[#C9A84C] to-[#E3C268] hover:from-[#E3C268] hover:to-[#C9A84C] text-black font-extrabold tracking-wider text-sm sm:text-base px-8 py-5 rounded-2xl transition-all shadow-xl shadow-[#C9A84C]/5 hover:shadow-[#C9A84C]/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin text-black" />
                DRAFTING HIGH-FIDELITY WIREFLOW SCREENS...
              </>
            ) : (
              <>
                Looks Amazing — Generate Layout Screens <ArrowRight className="w-5 h-5 ml-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
