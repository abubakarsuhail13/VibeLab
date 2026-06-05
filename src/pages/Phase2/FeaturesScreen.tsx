import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  Sparkles, 
  Check, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  Layers, 
  Plus, 
  Save, 
  Info,
  Sliders,
  Flame,
  Star,
  Clock
} from 'lucide-react';

interface FeatureItem {
  id: number;
  feature_name: string;
  feature_description: string;
  category: 'must_have' | 'nice_to_have' | 'future';
  is_included: number | boolean;
  student_rationale?: string;
  added_by?: string;
}

interface ProductSession {
  id: number;
  current_step: string;
  status: string;
}

export default function FeaturesScreen({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [session, setSession] = useState<ProductSession | null>(null);
  const [features, setFeatures] = useState<FeatureItem[]>([]);

  // For adding a custom feature (adds value for curious students!)
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCategory, setCustomCategory] = useState<'must_have' | 'nice_to_have' | 'future'>('must_have');

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
        // No session exists, redirect back to intro
        navigateTo('/phase/2');
        return;
      }

      setSession(data.session);
      
      // If no blueprint exists or not approved, redirect back to step 1
      if (!data.blueprint || !data.blueprint.student_approved) {
        toast.error('Please complete and approve your project blueprint first!');
        navigateTo('/phase/2');
        return;
      }

      setFeatures(data.features || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error fetching features data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleInclude = (id: number) => {
    setFeatures(prev => prev.map(f => {
      if (f.id === id) {
        const currentToggle = typeof f.is_included === 'number' ? f.is_included === 1 : f.is_included;
        return { ...f, is_included: !currentToggle };
      }
      return f;
    }));
  };

  const handleChangeCategory = (id: number, newCat: 'must_have' | 'nice_to_have' | 'future') => {
    setFeatures(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, category: newCat };
      }
      return f;
    }));
  };

  const handleRationaleChange = (id: number, val: string) => {
    setFeatures(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, student_rationale: val };
      }
      return f;
    }));
  };

  // Keep a separate saving endpoint action
  const handleSaveFeatures = async (silent = false) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const formattedFeatures = features.map(f => ({
        id: f.id,
        is_included: typeof f.is_included === 'boolean' ? f.is_included : f.is_included === 1,
        category: f.category,
        student_rationale: f.student_rationale || ''
      }));

      const res = await fetch('/api/product/features/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session?.id,
          features: formattedFeatures
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update feature selections');
      }

      if (!silent) {
        toast.success('Feature updates saved successfully!');
      }
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error saving feature updates');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveFeatures = async () => {
    // Audit that at least one feature is selected as Must-Have
    const includedMustHaves = features.filter(f => {
      const isInc = typeof f.is_included === 'boolean' ? f.is_included : f.is_included === 1;
      return isInc && f.category === 'must_have';
    });

    if (includedMustHaves.length === 0) {
      toast.error('You need to select at least one "Must-Have" feature for your MVP!');
      return;
    }

    setIsApproving(true);
    try {
      // First, save any pending client edit updates silently
      const savedStatus = await handleSaveFeatures(true);
      if (!savedStatus) {
        setIsApproving(false);
        return;
      }

      // Next, call the features approval endpoint to let Gemini generate the user journey Map
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/features/approve', {
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
        throw new Error(errorData.error || 'Feature scope approval failed');
      }

      toast.success('Features approved! Mapping your MVP User Journey...');
      navigateTo('/phase/2/journey');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to approve feature scope');
    } finally {
      setIsApproving(false);
    }
  };

  // Helper to categorize items for structural layout rendering
  const getFeaturesByCategory = (cat: 'must_have' | 'nice_to_have' | 'future') => {
    return features.filter(f => f.category === cat);
  };

  return (
    <div className="min-h-screen bg-[#02050e] text-white select-none selection:bg-[#C9A84C]/25 pb-24 relative overflow-hidden font-dmsans">
      {/* Premium ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#C9A84C]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto px-6 py-12">
        {/* Custom Back Nav Button */}
        <button
          onClick={() => navigateTo('/phase/2')}
          className="inline-flex items-center text-xs font-semibold font-jetbrains text-slate-400 hover:text-[#C9A84C] mb-8 transition-colors uppercase gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Go back to Blueprint
        </button>

        {/* Progress Tracker (Step 2 of 10) */}
        <div className="mb-10 p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 font-jetbrains mb-3">
            <span className="text-[#C9A84C] uppercase tracking-widest font-black">Step 2 of 10</span>
            <span>Feature Scope & Selection</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '10%' }}
              animate={{ width: '20%' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="bg-gradient-to-r from-[#C9A84C] to-[#E3C268] h-full rounded-full"
            />
          </div>
        </div>

        {/* Header Content */}
        <div className="mb-10 text-center sm:text-left">
          <h2 className="font-bebas text-4xl sm:text-6xl tracking-widest text-white leading-none mb-3">
            SELECT & SCOPE YOUR FEATURES
          </h2>
          <p className="font-dmsans text-slate-400 text-sm sm:text-base leading-relaxed max-w-3xl">
            VibeLab's AI suggested these core features for your MVP. Toggle what you want to include, refine their priority, or add custom notes to explain your design reasoning.
          </p>
        </div>

        {/* Action Controls Section */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#C9A84C]" />
            <span className="text-xs font-semibold text-slate-300 uppercase font-jetbrains tracking-wider">
              Total suggested: {features.length}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleSaveFeatures(false)}
              disabled={isSaving || isApproving}
              className="px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-xs font-bold font-jetbrains flex items-center gap-1.5 transition-all text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 text-[#C9A84C]" />
              )}
              Save Changes
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="space-y-12">
          {/* 1. MUST HAVE */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#C9A84C]/20 pb-2">
              <div className="p-1 px-2.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold font-jetbrains tracking-wider uppercase flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Vital Core
              </div>
              <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-widest">
                MUST-HAVE FEATURES (Required to solve the problem)
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {getFeaturesByCategory('must_have').length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No features currently assigned as Must-Have.</p>
              ) : (
                getFeaturesByCategory('must_have').map(f => (
                  <FeatureRowCard 
                    key={f.id} 
                    feature={f} 
                    onToggleInclude={handleToggleInclude} 
                    onChangeCategory={handleChangeCategory}
                    onRationaleChange={handleRationaleChange}
                  />
                ))
              )}
            </div>
          </section>

          {/* 2. NICE TO HAVE */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-cyan-500/25 pb-2">
              <div className="p-1 px-2.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold font-jetbrains tracking-wider uppercase flex items-center gap-1">
                <Star className="w-3.5 h-3.5" /> Nice-to-Have
              </div>
              <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-widest">
                NICE-TO-HAVE FEATURES (Enhances the user experience)
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {getFeaturesByCategory('nice_to_have').length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No features currently assigned as Nice-To-Have.</p>
              ) : (
                getFeaturesByCategory('nice_to_have').map(f => (
                  <FeatureRowCard 
                    key={f.id} 
                    feature={f} 
                    onToggleInclude={handleToggleInclude} 
                    onChangeCategory={handleChangeCategory}
                    onRationaleChange={handleRationaleChange}
                  />
                ))
              )}
            </div>
          </section>

          {/* 3. FUTURE SCALE */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-indigo-500/25 pb-2">
              <div className="p-1 px-2.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold font-jetbrains tracking-wider uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Future Vision
              </div>
              <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-widest">
                FUTURE CAPABILITIES (Post-MVP roadmap)
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {getFeaturesByCategory('future').length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No features currently assigned to Future Roadmap.</p>
              ) : (
                getFeaturesByCategory('future').map(f => (
                  <FeatureRowCard 
                    key={f.id} 
                    feature={f} 
                    onToggleInclude={handleToggleInclude} 
                    onChangeCategory={handleChangeCategory}
                    onRationaleChange={handleRationaleChange}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        {/* Bottom Callouts and Actions */}
        <div className="mt-14 space-y-8 bg-slate-950/40 border border-slate-800 p-8 rounded-3xl shadow-xl backdrop-blur-md">
          <div className="p-4 rounded-2xl bg-[#C9A84C]/5 border border-[#C9A84C]/15 flex items-start gap-3">
            <Info className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400 font-medium leading-relaxed">
              <strong className="text-white block mb-1">💡 Real Creator Advice</strong>
              A key secret of top startup founders is launching with a <strong className="text-[#C9A84C]">laser-focused MVP</strong>. Focus your energy on validating 2 to 3 essential Must-Haves, leaving Nice-To-Haves & Futures disabled or set for later update checkpoints. Keep it lean!
            </div>
          </div>

          <button
            onClick={handleApproveFeatures}
            disabled={isApproving || isSaving}
            className="w-full inline-flex items-center justify-center bg-gradient-to-r from-[#C9A84C] to-[#E3C268] hover:from-[#E3C268] hover:to-[#C9A84C] text-black font-extrabold tracking-wider text-sm sm:text-base px-8 py-5 rounded-2xl transition-all shadow-xl shadow-[#C9A84C]/5 hover:shadow-[#C9A84C]/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin text-black" />
                MAPPING MVP USER JOURNEY...
              </>
            ) : (
              <>
                Approve Features Scope & Map Journey <ArrowRight className="w-5 h-5 ml-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  key?: any;
  feature: FeatureItem;
  onToggleInclude: (id: number) => void;
  onChangeCategory: (id: number, cat: 'must_have' | 'nice_to_have' | 'future') => void;
  onRationaleChange: (id: number, val: string) => void;
}

function FeatureRowCard({ feature, onToggleInclude, onChangeCategory, onRationaleChange }: FeatureCardProps) {
  const isInc = typeof feature.is_included === 'boolean' ? feature.is_included : feature.is_included === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-2xl border transition-all ${
        isInc 
          ? 'bg-slate-900/80 border-slate-700/80' 
          : 'bg-slate-950/40 border-slate-900 text-slate-500'
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
        {/* Toggle + Content */}
        <div className="flex gap-4 items-start grow">
          <button
            onClick={() => onToggleInclude(feature.id)}
            className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center border transition-all mt-1 cursor-pointer ${
              isInc 
                ? 'bg-[#C9A84C] border-[#C9A84C] text-black' 
                : 'border-slate-800 bg-slate-900 text-transparent hover:border-slate-650'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3px]" />
          </button>

          <div className="space-y-1.5">
            <h4 className={`text-base font-bold transition-all ${isInc ? 'text-white' : 'text-slate-500 line-through'}`}>
              {feature.feature_name}
            </h4>
            <p className={`text-xs leading-relaxed transition-all ${isInc ? 'text-slate-400' : 'text-slate-600'}`}>
              {feature.feature_description}
            </p>
          </div>
        </div>

        {/* Priority Controls */}
        <div className="flex gap-1.5 shrink-0 select-none">
          {(['must_have', 'nice_to_have', 'future'] as const).map(catName => (
            <button
              key={catName}
              onClick={() => onChangeCategory(feature.id, catName)}
              disabled={!isInc}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-jetbrains tracking-wider uppercase transition-all border ${
                !isInc
                  ? 'opacity-30 border-transparent text-slate-700 pointer-events-none'
                  : feature.category === catName
                    ? catName === 'must_have'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : catName === 'nice_to_have'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    : 'bg-slate-950/60 text-slate-550 border-slate-900 hover:border-slate-800'
              } cursor-pointer`}
            >
              {catName === 'must_have' ? 'Must' : catName === 'nice_to_have' ? 'Nice' : 'Future'}
            </button>
          ))}
        </div>
      </div>

      {/* Student Rationale Textarea (only if feature is enabled, keeps layout exceptionally clean) */}
      <AnimatePresence>
        {isInc && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-slate-800/60 overflow-hidden"
          >
            <div className="relative">
              <span className="absolute top-3.5 left-4 text-slate-510 font-bold tracking-wider font-jetbrains text-[9px] uppercase">
                Rationale:
              </span>
              <textarea
                value={feature.student_rationale || ''}
                onChange={(e) => onRationaleChange(feature.id, e.target.value)}
                placeholder="Give a short comment explaining why this feature is critical or how users benefit..."
                className="w-full bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/60 focus:border-[#C9A84C]/50 text-xs text-slate-300 pl-24 pr-4 py-3 rounded-xl outline-none transition-all placeholder:text-slate-650 font-sans leading-relaxed resize-none h-[44px] focus:h-[64px]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
