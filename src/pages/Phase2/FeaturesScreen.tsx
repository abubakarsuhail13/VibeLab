import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  Sparkles, 
  Check, 
  Plus, 
  Save, 
  Info,
  Sliders,
  Flame,
  Star,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';
import Phase2Stepper from '../../components/Phase2Stepper';

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

  // Add custom feature inputs
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCategory, setCustomCategory] = useState<'must_have' | 'nice_to_have' | 'future'>('must_have');
  const [isAdding, setIsAdding] = useState(false);

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

  const handleAddCustomFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customDesc.trim()) {
      toast.error('Please fill in both the feature name and description!');
      return;
    }

    setIsAdding(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/features/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session?.id,
          feature_name: customName,
          feature_description: customDesc,
          category: customCategory
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add custom feature');
      }

      const data = await res.json();
      if (data.feature) {
        setFeatures(prev => [...prev, data.feature]);
        setCustomName('');
        setCustomDesc('');
        toast.success('Custom feature added successfully!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error adding custom feature');
    } finally {
      setIsAdding(false);
    }
  };

  const handleApproveFeatures = async () => {
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
      // Save pending client updates first
      const savedStatus = await handleSaveFeatures(true);
      if (!savedStatus) {
        setIsApproving(false);
        return;
      }

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

      toast.success('Features approved! Mapping your user journey map...');
      navigateTo('/phase/2/journey');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to lock in your features');
    } finally {
      setIsApproving(false);
    }
  };

  const getFeaturesByCategory = (cat: 'must_have' | 'nice_to_have' | 'future') => {
    return features.filter(f => f.category === cat);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#02050e] flex flex-col justify-center items-center text-white font-sans">
        <Loader2 className="w-12 h-12 text-[#C9A84C] animate-spin mb-4" />
        <p className="text-[#C9A84C] font-jetbrains text-xs tracking-widest font-bold">LOADING PILOT CARD SCHEMAS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02050e] text-white select-none selection:bg-[#C9A84C]/25 pb-24 relative overflow-hidden font-dmsans">
      {/* Visual lighting accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#C9A84C]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl mx-auto px-6 py-12">
        {/* Custom Nav Back Row */}
        <button
          onClick={() => navigateTo('/phase/2')}
          className="inline-flex items-center text-xs font-semibold font-jetbrains text-slate-400 hover:text-[#C9A84C] mb-8 transition-colors uppercase gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Go back to Blueprint
        </button>

        {/* Progress Timeline Header */}
        <Phase2Stepper activeStep={2} onNavigate={navigateTo} />

        {/* Brand Header */}
        <div className="mb-12 text-center md:text-left">
          <h2 className="font-bebas text-5xl md:text-7xl tracking-widest text-[#C9A84C] leading-none mb-4">
            FEATURE DISCOVERY
          </h2>
          <p className="font-sans text-slate-350 text-sm md:text-base leading-relaxed max-w-2xl font-normal">
            Your AI mentor suggested these features. Decide what goes into your MVP and what can wait for later.
          </p>
        </div>

        {/* Dynamic Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mb-12">
          {/* COLUMN 1: MUST HAVE */}
          <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-900 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-emerald-500/10">
              <span className="px-3 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold font-jetbrains uppercase tracking-widest">
                MUST HAVE
              </span>
              <span className="text-xs font-bold font-jetbrains text-slate-500">
                Count: {getFeaturesByCategory('must_have').length}
              </span>
            </div>
            <div className="space-y-4 grow">
              {getFeaturesByCategory('must_have').length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-xs italic font-sans">
                  No features here. Drag or change category dropdown of suggestions.
                </div>
              ) : (
                getFeaturesByCategory('must_have').map(feat => (
                  <FeatureUIProgressCard
                    key={feat.id}
                    feature={feat}
                    onToggle={handleToggleInclude}
                    onChangeCategory={handleChangeCategory}
                    onRationaleChange={handleRationaleChange}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: NICE TO HAVE */}
          <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-900 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-amber-500/10">
              <span className="px-3 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20 text-[10px] font-bold font-jetbrains uppercase tracking-widest">
                NICE TO HAVE
              </span>
              <span className="text-xs font-bold font-jetbrains text-slate-500">
                Count: {getFeaturesByCategory('nice_to_have').length}
              </span>
            </div>
            <div className="space-y-4 grow">
              {getFeaturesByCategory('nice_to_have').length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-xs italic font-sans">
                  No Features. Set the dropdown to NICE TO HAVE to move ideas here.
                </div>
              ) : (
                getFeaturesByCategory('nice_to_have').map(feat => (
                  <FeatureUIProgressCard
                    key={feat.id}
                    feature={feat}
                    onToggle={handleToggleInclude}
                    onChangeCategory={handleChangeCategory}
                    onRationaleChange={handleRationaleChange}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: FUTURE */}
          <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-900 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <span className="px-3 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-750 text-[10px] font-bold font-jetbrains uppercase tracking-widest">
                FUTURE
              </span>
              <span className="text-xs font-bold font-jetbrains text-slate-500">
                Count: {getFeaturesByCategory('future').length}
              </span>
            </div>
            <div className="space-y-4 grow">
              {getFeaturesByCategory('future').length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-xs italic font-sans">
                  Empty. Mark ideas as FUTURE roadmaps.
                </div>
              ) : (
                getFeaturesByCategory('future').map(feat => (
                  <FeatureUIProgressCard
                    key={feat.id}
                    feature={feat}
                    onToggle={handleToggleInclude}
                    onChangeCategory={handleChangeCategory}
                    onRationaleChange={handleRationaleChange}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Feature Creation Box */}
        <div className="bg-slate-950/50 rounded-2xl border border-slate-900 p-6 md:p-8 mb-12">
          <h3 className="font-bebas text-2xl tracking-widest text-[#C9A84C] mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#C9A84C]" /> ADD MY OWN FEATURE
          </h3>

          <form onSubmit={handleAddCustomFeature} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[10px] uppercase font-bold font-jetbrains text-slate-400">Feature Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Dark Mode Toggle"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-[#C9A84C]/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[10px] uppercase font-bold font-jetbrains text-slate-400">Column Destination</label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-[#C9A84C]/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                >
                  <option value="must_have">MUST HAVE (Vital Core)</option>
                  <option value="nice_to_have">NICE TO HAVE (CX Boost)</option>
                  <option value="future">FUTURE (Post-launch roadmap)</option>
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[10px] uppercase font-bold font-jetbrains text-slate-400">Explanation Rationale</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    placeholder="e.g. Allows user to switch between light/dark..."
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-[#C9A84C]/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-650"
                  />
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="bg-gradient-to-r from-[#C9A84C] to-[#E3C268] hover:from-[#E3C268] hover:to-[#C9A84C] text-[#02050e] font-bold text-xs uppercase px-5 rounded-xl transition-all font-jetbrains tracking-wide whitespace-nowrap inline-flex items-center justify-center cursor-pointer"
                  >
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Feature'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Global Action lock/checkpoint CTA */}
        <div className="bg-slate-950/60 border border-slate-850 p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
          <div className="flex items-start gap-3.5 max-w-xl">
            <Info className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold font-sans text-white uppercase tracking-wide">
                Ready to Map your User Journey?
              </h5>
              <p className="text-[11px] sm:text-xs text-slate-400 font-normal leading-relaxed">
                Make sure you check the features vital to solving your user problem first. Once you click lock below, the AI researcher will draft your high fidelity UI flows based on current columns configuration!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <button
              onClick={() => handleSaveFeatures(false)}
              disabled={isSaving || isApproving}
              className="flex-1 md:flex-none px-6 py-4 rounded-xl border border-slate-800 hover:border-slate-700 font-jetbrains text-xs font-black uppercase text-slate-350 hover:text-white transition-all transition-duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Progress
            </button>

            <button
              onClick={handleApproveFeatures}
              disabled={isSaving || isApproving}
              className="flex-[2] md:flex-none inline-flex items-center justify-center bg-gradient-to-r from-[#C9A84C] to-[#E3C268] hover:from-[#E3C268] hover:to-[#C9A84C] text-black font-extrabold tracking-widest text-xs sm:text-sm px-8 py-4.5 rounded-xl transition-all shadow-xl shadow-[#C9A84C]/5 hover:shadow-[#C9A84C]/25 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer uppercase font-sans font-black"
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-black" />
                  Locking features...
                </>
              ) : (
                <>
                  Lock In My Features <ArrowRight className="w-4.5 h-4.5 ml-2.5" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

interface FeatureProgressCardProps {
  key?: any;
  feature: FeatureItem;
  onToggle: (id: number) => void;
  onChangeCategory: (id: number, cat: 'must_have' | 'nice_to_have' | 'future') => void;
  onRationaleChange: (id: number, val: string) => void;
}

function FeatureUIProgressCard({ feature, onToggle, onChangeCategory, onRationaleChange }: FeatureProgressCardProps) {
  const isInc = typeof feature.is_included === 'boolean' ? feature.is_included : feature.is_included === 1;

  return (
    <motion.div
      layout
      className={`p-4 rounded-xl border transition-all relative ${
        isInc 
          ? 'bg-slate-900/90 border-[#C9A84C]/15 hover:border-[#C9A84C]/30 shadow-indigo-950/20 shadow-md' 
          : 'bg-slate-950/45 border-slate-900/60 opacity-50 grayscale'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        {/* Check/State trigger */}
        <button
          onClick={() => onToggle(feature.id)}
          className={`w-[22px] h-[22px] rounded-md shrink-0 flex items-center justify-center border transition-all mt-0.5 cursor-pointer ${
            isInc 
              ? 'bg-[#C9A84C] border-[#C9A84C] text-[#02050e]' 
              : 'border-slate-800 bg-slate-900 text-transparent hover:border-slate-700'
          }`}
          title={isInc ? 'Disable feature' : 'Enable feature'}
        >
          <Check className="w-3.5 h-3.5 stroke-[3px]" />
        </button>

        {/* Feature content blocks */}
        <div className="flex-1 space-y-1">
          <h4 className={`text-xs font-bold leading-tight select-text transition-all font-sans ${isInc ? 'text-white' : 'text-slate-500 line-through'}`}>
            {feature.feature_name}
          </h4>
          <p className="text-[10px] leading-relaxed text-slate-400 select-text font-normal">
            {feature.feature_description}
          </p>
        </div>

        {/* Quick Dropdown selector to change columns manually */}
        <div className="shrink-0 select-none">
          <select
            value={feature.category}
            onChange={(e) => onChangeCategory(feature.id, e.target.value as any)}
            disabled={!isInc}
            className={`bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] font-bold font-jetbrains text-[#C9A84C] outline-none transition-all cursor-pointer ${
              !isInc ? 'opacity-30 pointer-events-none text-slate-600' : 'hover:border-slate-700'
            }`}
          >
            <option value="must_have">Must</option>
            <option value="nice_to_have">Nice</option>
            <option value="future">Future</option>
          </select>
        </div>
      </div>

      {/* Embedded rationale comment to add richness */}
      {isInc && (
        <div className="mt-3.5 pt-3 border-t border-slate-850">
          <input
            type="text"
            value={feature.student_rationale || ''}
            onChange={(e) => onRationaleChange(feature.id, e.target.value)}
            placeholder="Add comments / note rationale..."
            className="w-full bg-slate-950/60 text-[10px] text-slate-350 placeholder:text-slate-650 px-2.5 py-1.5 rounded-lg border border-slate-850 focus:border-[#C9A84C]/40 outline-none transition-all"
          />
        </div>
      )}
    </motion.div>
  );
}
