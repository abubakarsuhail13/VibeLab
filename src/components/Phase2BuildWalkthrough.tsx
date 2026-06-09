import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  Check, 
  Lock, 
  Sparkles, 
  ChevronRight, 
  ArrowRight, 
  Loader2, 
  Plus, 
  Trash2, 
  Eye, 
  AlertTriangle, 
  ArrowLeft,
  Columns,
  Columns3,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Info
} from 'lucide-react';

interface BlueprintData {
  id?: number;
  session_id?: number;
  project_name: string;
  problem_statement: string;
  target_users: string;
  mvp_scope: string;
}

interface FeatureItem {
  id: number;
  feature_name: string;
  feature_description: string;
  category: 'must_have' | 'nice_to_have' | 'future';
  is_included: number | boolean;
  student_rationale?: string;
  added_by?: string;
}

interface JourneyStepItem {
  step_number: number;
  title: string;
  description: string;
}

interface UserJourneyData {
  id?: number;
  steps: JourneyStepItem[];
  key_actions?: string[];
}

interface ScreenItem {
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

const STEP_LABELS = [
  { step: 1, label: 'Your Project Blueprint', desc: 'Review and confirm your foundational MVP ideas.' },
  { step: 2, label: 'Feature Discovery', desc: 'Identify must-haves, nice-to-haves, and future plans.' },
  { step: 3, label: 'User Journey', desc: 'Model how people will navigate through your application.' },
  { step: 4, label: 'Product Screens', desc: 'Review high-fidelity wireframes and visual layouts.' },
  { step: 5, label: 'Building Your Product', desc: 'Compiling your code, assets, and wiring up views.' },
  { step: 6, label: 'MVP Code Walkthrough', desc: 'Inspect your full screen, interactive MVP application.' },
  { step: 7, label: 'Pitch Story', desc: 'Add descriptive features and the core story of your product.' },
  { step: 8, label: 'AI Mechanics', desc: 'Highlight the technical opportunities and systems.' },
  { step: 9, label: 'Demo Script', desc: 'Write down a step-by-step presentation script.' },
  { step: 10, label: 'All Completed', desc: 'Unlock your certification and submit your project!' }
];

const STEP_MAP_ORDER: Record<string, number> = {
  'blueprint': 1,
  'features': 2,
  'user_journey': 3,
  'screens': 4,
  'building': 5,
  'review': 6,
  'description': 7,
  'explain': 8,
  'demo': 9,
  'complete': 10,
  'approved': 10
};

export default function Phase2BuildWalkthrough() {
  const [session, setSession] = useState<ProductSession | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // STEP 1 State
  const [projectName, setProjectName] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [mvpScope, setMvpScope] = useState('');

  // STEP 2 State
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [customFeatureName, setCustomFeatureName] = useState('');
  const [customFeatureDesc, setCustomFeatureDesc] = useState('');
  const [customFeatureCategory, setCustomFeatureCategory] = useState<'must_have' | 'nice_to_have' | 'future'>('must_have');
  const [isAddingFeature, setIsAddingFeature] = useState(false);

  // STEP 3 State
  const [userJourney, setUserJourney] = useState<UserJourneyData | null>(null);

  // STEP 4 State
  const [screens, setScreens] = useState<ScreenItem[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<ScreenItem | null>(null);
  const [changeRequests, setChangeRequests] = useState('');

  // STEP 5 State: Loading cycling messages
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const cyclingMessages = [
    'Turning your idea into reality...',
    projectName ? `Building ${projectName}...` : 'Building your project...',
    'Wiring up your features...',
    'Almost ready...'
  ];

  useEffect(() => {
    let interval: any;
    if (activeStep === 5) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % cyclingMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [activeStep, projectName]);

  // Load context on mount
  useEffect(() => {
    fetchSessionAndProgress();
  }, []);

  const fetchSessionAndProgress = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      if (!token) return;

      // 1. Fetch active session
      const sessRes = await fetch('/api/product/session', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (sessRes.ok) {
        const data = await sessRes.json();
        if (data.session) {
          setSession(data.session);
          const mappedStep = STEP_MAP_ORDER[data.session.current_step] || 1;
          setActiveStep(mappedStep);

          if (data.blueprint) {
            setProjectName(data.blueprint.project_name || '');
            setProblemStatement(data.blueprint.problem_statement || '');
            setTargetUsers(data.blueprint.target_users || '');
            setMvpScope(data.blueprint.mvp_scope || '');
          }

          if (data.features) {
            setFeatures(data.features);
          }

          if (data.user_journey) {
            setUserJourney(data.user_journey);
          }

          if (data.screens) {
            setScreens(data.screens);
          }
        } else {
          // No active session in database. Prefill Step 1 from latest discovery blueprint
          const idRes = await fetch('/api/ideation/blueprint', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (idRes.ok) {
            const ideationBp = await idRes.json();
            if (ideationBp) {
              setProjectName(ideationBp.product_name || ideationBp.project_name || '');
              setProblemStatement(ideationBp.problem_statement || '');
              setTargetUsers(ideationBp.target_user_persona || ideationBp.target_users || '');
              setMvpScope(ideationBp.mvp_definition || ideationBp.mvp_scope || '');
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching creation context:', error);
      toast.error('Could not load some of your product data.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Approve Blueprint: Step 1 -> Step 2
  const handleApproveBlueprint = async () => {
    if (!projectName.trim()) return toast.error('Project Name is required.');
    if (!problemStatement.trim()) return toast.error('Problem Statement is required.');
    if (!targetUsers.trim()) return toast.error('Target Users profile is required.');
    if (!mvpScope.trim()) return toast.error('MVP Scope is required.');

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      
      let sessionId = session?.id;

      // Create session in backend if not already started
      if (!sessionId) {
        const startRes = await fetch('/api/product/start', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!startRes.ok) {
          const errData = await startRes.json();
          throw new Error(errData.error || 'Failed to start product session.');
        }

        const startData = await startRes.json();
        sessionId = startData.session_id;
        setSession({
          id: sessionId!,
          current_step: 'blueprint',
          status: 'in_progress'
        });
      }

      // Approve blueprint content
      const approveRes = await fetch('/api/product/blueprint/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          project_name: projectName,
          problem_statement: problemStatement,
          target_users: targetUsers,
          mvp_scope: mvpScope
        })
      });

      if (!approveRes.ok) {
        const errData = await approveRes.json();
        throw new Error(errData.error || 'Blueprint confirmation failed.');
      }

      const approveData = await approveRes.json();
      setFeatures(approveData.features || []);
      
      // Update local step view state
      setSession((prev: any) => prev ? { ...prev, current_step: 'features' } : null);
      setActiveStep(2);
      toast.success('Your blueprint is saved! Gemini generated feature recommendations.');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Blueprint approval failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Toggles & category edits of features: Sync with server (Step 2 Helper)
  const handleToggleIncludeFeature = async (featureId: number, isIncluded: boolean) => {
    const updatedFeatures = features.map(f => 
      f.id === featureId ? { ...f, is_included: isIncluded ? 1 : 0 } : f
    );
    setFeatures(updatedFeatures);
    await syncFeaturesWithServer(updatedFeatures);
  };

  const handleChangeFeatureCategory = async (featureId: number, category: 'must_have' | 'nice_to_have' | 'future') => {
    const updatedFeatures = features.map(f => 
      f.id === featureId ? { ...f, category } : f
    );
    setFeatures(updatedFeatures);
    await syncFeaturesWithServer(updatedFeatures);
  };

  const syncFeaturesWithServer = async (featuresList: FeatureItem[]) => {
    if (!session?.id) return;
    try {
      const token = localStorage.getItem('vibelab_token');
      await fetch('/api/product/features/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session.id,
          features: featuresList
        })
      });
    } catch (error) {
      console.error('Failed to sync features list modifications:', error);
    }
  };

  const handleAddCustomFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFeatureName.trim()) return toast.error('Feature title is required.');
    if (!customFeatureDesc.trim()) return toast.error('Feature description is required.');
    if (!session?.id) return;

    setIsAddingFeature(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/features/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session.id,
          feature_name: customFeatureName,
          feature_description: customFeatureDesc,
          category: customFeatureCategory
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create custom feature.');
      }

      const data = await res.json();
      if (data.feature) {
        setFeatures((prev) => [...prev, data.feature]);
        setCustomFeatureName('');
        setCustomFeatureDesc('');
        setCustomFeatureCategory('must_have');
        toast.success(`"${data.feature.feature_name}" added!`);
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to add custom feature.');
    } finally {
      setIsAddingFeature(false);
    }
  };

  // Approve Features: Step 2 -> Step 3
  const handleApproveFeatures = async () => {
    const hasIncluded = features.some(f => Boolean(f.is_included));
    if (!hasIncluded) {
      return toast.error('Please select at least 1 feature to include in your MVP.');
    }

    setIsSubmitting(true);
    try {
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
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to approve feature list.');
      }

      const data = await res.json();
      setUserJourney(data.user_journey);
      setSession((prev: any) => prev ? { ...prev, current_step: 'user_journey' } : null);
      setActiveStep(3);
      toast.success('Features locked! Gemini formulated a user journey flow.');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to lock features.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve User Journey Step 3 -> Step 4
  const handleApproveJourney = async () => {
    setIsSubmitting(true);
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
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve user journey.');
      }

      const data = await res.json();
      setScreens(data.screens || []);
      setSession((prev: any) => prev ? { ...prev, current_step: 'screens' } : null);
      setActiveStep(4);
      toast.success('User Journey approved! Visual screens layouts synthesized.');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to approve user journey.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve Screens, trigger build: Step 4 -> Step 5 -> Step 6
  const handleApproveScreensAndBuild = async () => {
    setIsSubmitting(true);
    setActiveStep(5); // Immediate transition to gold spinner of loading step 5

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
        const err = await res.json();
        throw new Error(err.error || 'Failed to trigger MVP full compilation.');
      }

      const data = await res.json();
      
      // If user provided change requests, it might return new screens. Let's inspect:
      if (data.regenerated) {
        setScreens(data.screens || []);
        setActiveStep(4); // Keep on Step 4 to review the newly updated mock screens
        toast.success('Mock screens updated successfully based on your request!');
        return;
      }

      // Successful MVP code compilation! Advancing automatically to step 6 (MVP Review)
      setSession((prev: any) => prev ? { ...prev, current_step: 'review' } : null);
      setActiveStep(6);
      toast.success('Congratulations! Your initial functioning MVP is fully built!', { duration: 5000 });
      // Reload page or force complete re-state to load full MVP reviewer
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'MVP full build execution failed.');
      setActiveStep(4); // Pull them back to Step 4 on error
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col justify-center items-center text-center">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin mb-3" />
        <p className="text-[#C9A84C] font-mono text-xs tracking-wider">SYNCING PRODUCT STEPPER CONTEXT...</p>
      </div>
    );
  }

  return (
    <div className="w-full relative py-6">
      <div className="space-y-6">
        {STEP_LABELS.map((item) => {
          const isCompleted = item.step < activeStep;
          const isActive = item.step === activeStep;
          const isLocked = item.step > activeStep;

          return (
            <div 
              key={item.step}
              id={`step-block-${item.step}`}
              className={`border rounded-[1.8rem] transition-all overflow-hidden bg-slate-950/40 backdrop-blur-md ${
                isActive 
                  ? 'border-[#C9A84C]/50 shadow-lg shadow-[#C9A84C]/5 ring-1 ring-[#C9A84C]/10 bg-[#040817]/60' 
                  : isCompleted 
                    ? 'border-emerald-500/20 bg-slate-900/10' 
                    : 'border-slate-800 bg-slate-950/20 opacity-60'
              }`}
            >
              {/* Step Title Header Row */}
              <div 
                className={`p-6 flex items-center justify-between gap-4 cursor-pointer select-none ${
                  isLocked ? 'pointer-events-none' : ''
                }`}
                onClick={() => {
                  if (!isLocked) {
                    setActiveStep(item.step);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Circle Icon Badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-slate-700/50 ${
                    isCompleted 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/30' 
                      : isActive 
                        ? 'bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/40 ring-4 ring-[#C9A84C]/5' 
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}>
                    {isCompleted ? (
                      <Check className="w-4.5 h-4.5 stroke-[3]" />
                    ) : isLocked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-xs font-bold font-mono">{item.step}</span>
                    )}
                  </div>

                  <div>
                    <h3 className={`text-base font-bold font-sans flex items-center gap-2 ${
                      isActive ? 'text-[#C9A84C]' : 'text-white'
                    }`}>
                      {item.label}
                      {isActive && <span className="inline-block px-2 py-0.5 bg-[#C9A84C]/10 text-[#C9A84C] text-[9px] uppercase tracking-wider font-mono rounded border border-[#C9A84C]/20 animate-pulse">Now Active</span>}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                  </div>
                </div>

                {/* Right State Indicator Arrow */}
                <div className="text-slate-500 hover:text-white transition-colors p-1">
                  {!isLocked && (
                    <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'rotate-90 text-[#C9A84C]' : ''}`} />
                  )}
                </div>
              </div>

              {/* Collapsible Expanded Component Content Section */}
              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="border-t border-slate-800/60"
                  >
                    <div className="p-6 md:p-8 space-y-6 bg-slate-900/10">

                      {/**********************************************************
                       * STEP 1: Blueprint Approver View
                       ***********************************************************/}
                      {item.step === 1 && (
                        <div className="space-y-6">
                          <p className="text-xs font-semibold text-slate-400 font-sans tracking-wide">
                            Based on your Phase 1 ideation — review and confirm.
                          </p>

                          <div className="grid grid-cols-1 gap-5">
                            {/* Project Name Field */}
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] uppercase tracking-wider font-mono text-[#C9A84C] font-semibold">Project Name</label>
                              <input 
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="Enter project name..."
                                className="w-full bg-slate-900 border border-slate-800 focus:border-[#C9A84C] text-sm text-white px-4 py-3 rounded-xl outline-none transition-colors"
                              />
                            </div>

                            {/* Problem Statement Field */}
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] uppercase tracking-wider font-mono text-[#C9A84C] font-semibold">Problem Statement</label>
                              <textarea 
                                value={problemStatement}
                                onChange={(e) => setProblemStatement(e.target.value)}
                                rows={2}
                                placeholder="Describe the pain point..."
                                className="w-full bg-slate-900 border border-slate-800 focus:border-[#C9A84C] text-sm text-white px-4 py-3 rounded-xl outline-none resize-none transition-colors"
                              />
                            </div>

                            {/* Target Users Field */}
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] uppercase tracking-wider font-mono text-[#C9A84C] font-semibold">Target Users</label>
                              <textarea 
                                value={targetUsers}
                                onChange={(e) => setTargetUsers(e.target.value)}
                                rows={2}
                                placeholder="Who are your primary target users?"
                                className="w-full bg-slate-900 border border-slate-800 focus:border-[#C9A84C] text-sm text-white px-4 py-3 rounded-xl outline-none resize-none transition-colors"
                              />
                            </div>

                            {/* MVP Scope Field */}
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] uppercase tracking-wider font-mono text-[#C9A84C] font-semibold">MVP Scope</label>
                              <textarea 
                                value={mvpScope}
                                onChange={(e) => setMvpScope(e.target.value)}
                                rows={3}
                                placeholder="What core features are inside the MVP?"
                                className="w-full bg-slate-900 border border-slate-800 focus:border-[#C9A84C] text-sm text-white px-4 py-3 rounded-xl outline-none resize-none transition-colors"
                              />
                            </div>
                          </div>

                          <button 
                            disabled={isSubmitting}
                            onClick={handleApproveBlueprint}
                            className="w-full inline-flex items-center justify-center bg-[#C9A84C] hover:bg-[#E3C268] text-slate-950 font-black text-xs tracking-wider py-4 rounded-xl shadow-xl transition-all disabled:opacity-50 uppercase cursor-pointer"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Analyzing and Saving Blueprint...
                              </>
                            ) : (
                              <>
                                Confirm Blueprint →
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 2: Feature Discovery View
                       ***********************************************************/}
                      {item.step === 2 && (
                        <div className="space-y-8">
                          <p className="text-xs text-slate-400">
                            Below are your product features generated which you can prioritize. Organize them across columns, include/exclude them, or add custom ones!
                          </p>

                          {/* 3 Columns Layout */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* COLUMN 1: MUST HAVE */}
                            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-4">
                              <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span> Must Have
                              </h4>
                              <div className="space-y-3">
                                {features.filter(f => f.category === 'must_have').map(feat => (
                                  <div 
                                    key={feat.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                      Boolean(feat.is_included) 
                                        ? 'bg-slate-900/85 border-[#C9A84C]/30 shadow-md' 
                                        : 'bg-slate-950/60 border-slate-800 opacity-50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h5 className="text-xs font-bold text-white shrink">{feat.feature_name}</h5>
                                      <input 
                                        type="checkbox"
                                        checked={Boolean(feat.is_included)}
                                        onChange={(e) => handleToggleIncludeFeature(feat.id, e.target.checked)}
                                        className="rounded border-slate-700 bg-slate-900 text-[#C9A84C] focus:ring-0 cursor-pointer"
                                      />
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-normal mb-3">{feat.feature_description}</p>
                                    
                                    {/* Action Select to move column */}
                                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/50">
                                      <span className="text-[9.5px] font-mono text-slate-500 uppercase leading-none">Move:</span>
                                      <select 
                                        value={feat.category}
                                        onChange={(e) => handleChangeFeatureCategory(feat.id, e.target.value as any)}
                                        className="text-[9.5px] bg-slate-900 border border-slate-800 rounded font-bold px-1.5 py-0.5 text-[#C9A84C] outline-none"
                                      >
                                        <option value="must_have">Must Have</option>
                                        <option value="nice_to_have">Nice To Have</option>
                                        <option value="future">Future</option>
                                      </select>
                                    </div>
                                  </div>
                                ))}
                                {features.filter(f => f.category === 'must_have').length === 0 && (
                                  <p className="text-[10px] text-slate-500 text-center py-4 italic">No features in this column</p>
                                )}
                              </div>
                            </div>

                            {/* COLUMN 2: NICE TO HAVE */}
                            <div className="p-4 rounded-2xl bg-cyan-950/10 border border-cyan-800/15 space-y-4">
                              <h4 className="text-[11px] font-black uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span> Nice To Have
                              </h4>
                              <div className="space-y-3">
                                {features.filter(f => f.category === 'nice_to_have').map(feat => (
                                  <div 
                                    key={feat.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                      Boolean(feat.is_included) 
                                        ? 'bg-slate-900/85 border-[#C9A84C]/30 shadow-md' 
                                        : 'bg-slate-950/60 border-slate-800 opacity-50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h5 className="text-xs font-bold text-white shrink">{feat.feature_name}</h5>
                                      <input 
                                        type="checkbox"
                                        checked={Boolean(feat.is_included)}
                                        onChange={(e) => handleToggleIncludeFeature(feat.id, e.target.checked)}
                                        className="rounded border-slate-700 bg-slate-900 text-[#C9A84C] focus:ring-0 cursor-pointer"
                                      />
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-normal mb-3">{feat.feature_description}</p>
                                    
                                    {/* Action Select to move column */}
                                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/50">
                                      <span className="text-[9.5px] font-mono text-slate-500 uppercase leading-none">Move:</span>
                                      <select 
                                        value={feat.category}
                                        onChange={(e) => handleChangeFeatureCategory(feat.id, e.target.value as any)}
                                        className="text-[9.5px] bg-slate-900 border border-slate-800 rounded font-bold px-1.5 py-0.5 text-[#C9A84C] outline-none"
                                      >
                                        <option value="must_have">Must Have</option>
                                        <option value="nice_to_have">Nice To Have</option>
                                        <option value="future">Future</option>
                                      </select>
                                    </div>
                                  </div>
                                ))}
                                {features.filter(f => f.category === 'nice_to_have').length === 0 && (
                                  <p className="text-[10px] text-slate-500 text-center py-4 italic">No features in this column</p>
                                )}
                              </div>
                            </div>

                            {/* COLUMN 3: FUTURE */}
                            <div className="p-4 rounded-2xl bg-purple-950/10 border border-purple-800/15 space-y-4">
                              <h4 className="text-[11px] font-black uppercase tracking-wider text-purple-400 font-mono flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span> Future Expansion
                              </h4>
                              <div className="space-y-3">
                                {features.filter(f => f.category === 'future').map(feat => (
                                  <div 
                                    key={feat.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                      Boolean(feat.is_included) 
                                        ? 'bg-slate-900/85 border-[#C9A84C]/30 shadow-md' 
                                        : 'bg-slate-950/60 border-slate-800 opacity-50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h5 className="text-xs font-bold text-white shrink">{feat.feature_name}</h5>
                                      <input 
                                        type="checkbox"
                                        checked={Boolean(feat.is_included)}
                                        onChange={(e) => handleToggleIncludeFeature(feat.id, e.target.checked)}
                                        className="rounded border-slate-700 bg-slate-900 text-[#C9A84C] focus:ring-0 cursor-pointer"
                                      />
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-normal mb-3">{feat.feature_description}</p>
                                    
                                    {/* Action Select to move column */}
                                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/50">
                                      <span className="text-[9.5px] font-mono text-slate-500 uppercase leading-none">Move:</span>
                                      <select 
                                        value={feat.category}
                                        onChange={(e) => handleChangeFeatureCategory(feat.id, e.target.value as any)}
                                        className="text-[9.5px] bg-slate-900 border border-slate-800 rounded font-bold px-1.5 py-0.5 text-[#C9A84C] outline-none"
                                      >
                                        <option value="must_have">Must Have</option>
                                        <option value="nice_to_have">Nice To Have</option>
                                        <option value="future">Future</option>
                                      </select>
                                    </div>
                                  </div>
                                ))}
                                {features.filter(f => f.category === 'future').length === 0 && (
                                  <p className="text-[10px] text-slate-500 text-center py-4 italic">No features in this column</p>
                                )}
                              </div>
                            </div>

                          </div>

                          {/* Add Custom Feature Sub-Form */}
                          <form onSubmit={handleAddCustomFeature} className="p-5 border border-slate-800 bg-slate-950/50 rounded-2xl space-y-4">
                            <h5 className="text-xs font-bold text-white flex items-center gap-2">
                              <Plus className="w-4 h-4 text-[#C9A84C]" />
                              Add Custom Feature
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <input 
                                type="text"
                                placeholder="Feature Name (e.g., Live Sync)"
                                value={customFeatureName}
                                onChange={(e) => setCustomFeatureName(e.target.value)}
                                className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-[#C9A84C] outline-none"
                              />

                              <select 
                                value={customFeatureCategory}
                                onChange={(e) => setCustomFeatureCategory(e.target.value as any)}
                                className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-xs text-[#C9A84C] focus:border-[#C9A84C] outline-none"
                              >
                                <option value="must_have">Must Have</option>
                                <option value="nice_to_have">Nice To Have</option>
                                <option value="future">Future</option>
                              </select>
                            </div>

                            <textarea 
                              placeholder="Write a clear feature description..."
                              value={customFeatureDesc}
                              onChange={(e) => setCustomFeatureDesc(e.target.value)}
                              rows={2}
                              className="w-full bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-[#C9A84C] outline-none"
                            />

                            <button 
                              type="submit"
                              disabled={isAddingFeature}
                              className="w-full py-2 px-4 rounded-xl border border-[#C9A84C]/30 hover:border-[#C9A84C] text-[#C9A84C] text-xs font-bold transition-all flex items-center justify-center gap-1.5 uppercase disabled:opacity-50"
                            >
                              {isAddingFeature ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                              Add Feature
                            </button>
                          </form>

                          {/* Lock-In button */}
                          <div className="pt-4">
                            <button 
                              disabled={isSubmitting}
                              onClick={handleApproveFeatures}
                              className="w-full inline-flex items-center justify-center bg-[#C9A84C] hover:bg-[#E3C268] text-slate-950 font-black text-xs tracking-wider py-4 rounded-xl shadow-xl transition-all disabled:opacity-50 uppercase cursor-pointer"
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Structuring User Journeys...
                                </>
                              ) : (
                                <>
                                  Lock In My Features →
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 3: User Journey View
                       ***********************************************************/}
                      {item.step === 3 && (
                        <div className="space-y-6">
                          <p className="text-xs text-slate-400">
                            This is how someone will use <strong className="text-white">{projectName || 'your app'}</strong> from start to finish.
                          </p>

                          {/* Horizontal Sequence Flow */}
                          {userJourney && userJourney.steps ? (
                            <div className="flex flex-col md:flex-row gap-6 md:items-stretch overflow-x-auto py-4 px-1 scrollbar-thin">
                              {userJourney.steps.map((uStep, index) => (
                                <React.Fragment key={uStep.step_number}>
                                  <div className="flex-1 min-w-[200px] p-5 rounded-2xl bg-slate-900/45 border border-slate-800 flex flex-col justify-between hover:border-cyan-500/30 transition-all">
                                    <div>
                                      <div className="w-6 h-6 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/25 text-[10px] font-black font-mono flex items-center justify-center mb-4 leading-none">
                                        {uStep.step_number}
                                      </div>
                                      <h5 className="text-xs font-bold text-white mb-2">{uStep.title}</h5>
                                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{uStep.description}</p>
                                    </div>
                                    <div className="pt-4 flex justify-end">
                                      <span className="text-[9.5px] font-mono text-slate-500 font-bold uppercase">Journey Step</span>
                                    </div>
                                  </div>
                                  
                                  {index < userJourney.steps.length - 1 && (
                                    <div className="hidden md:flex items-center justify-center text-slate-700 shrink-0 select-none">
                                      <ArrowRight className="w-5 h-5" />
                                    </div>
                                  )}
                                </React.Fragment>
                              ))}
                              
                              {/* SUCCESS OR SUCCESSIVE TAG */}
                              <div className="flex-1 min-w-[140px] p-5 rounded-2xl bg-[#C9A84C]/5 border border-[#C9A84C]/15 flex flex-col items-center justify-center text-center max-w-[200px]">
                                <Sparkles className="w-8 h-8 text-[#C9A84C] mb-2 animate-bounce" />
                                <span className="text-xs font-bold text-white">End Goal Met!</span>
                                <p className="text-[10px] text-slate-400 mt-1 leading-normal">Solve client pain-point</p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 bg-slate-900/50 rounded-xl text-center text-xs text-slate-500 italic">
                              No active journey loaded.
                            </div>
                          )}

                          <div className="pt-4">
                            <button 
                              disabled={isSubmitting}
                              onClick={handleApproveJourney}
                              className="w-full inline-flex items-center justify-center bg-[#C9A84C] hover:bg-[#E3C268] text-slate-950 font-black text-xs tracking-wider py-4 rounded-xl shadow-xl transition-all disabled:opacity-50 uppercase cursor-pointer"
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Designing Product Screens Preview...
                                </>
                              ) : (
                                <>
                                  Looks Right →
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 4: Product Screens Mock preview
                       ***********************************************************/}
                      {item.step === 4 && (
                        <div className="space-y-6">
                          <p className="text-xs text-slate-400">
                            Here are your pre-arranged user interfaces. Click on any template layout to review the simulated design preview in full size.
                          </p>

                          {/* Scrollable Row of Screen Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {screens.map(scr => (
                              <div 
                                key={scr.id}
                                className="group rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden flex flex-col hover:border-[#C9A84C]/35 transition-all"
                              >
                                {/* Header */}
                                <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-white truncate">{scr.screen_name}</h4>
                                  <button 
                                    onClick={() => setSelectedScreen(scr)}
                                    className="p-1 hover:bg-slate-900 rounded text-[#C9A84C] hover:text-white transition-colors"
                                    title="View full preview"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Miniature Iframe Preview container */}
                                <div className="h-44 bg-slate-100 flex items-center justify-center relative overflow-hidden select-none pointer-events-none">
                                  <iframe 
                                    title={scr.screen_name}
                                    srcDoc={`
                                      <!DOCTYPE html>
                                      <html>
                                        <head>
                                          <script src="https://cdn.tailwindcss.com"></script>
                                          <style>
                                            body { font-family: system-ui, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 12px; margin: 0; width: 100%; height: 100%; overflow: hidden; font-size: 10px; }
                                            * { box-sizing: border-box; }
                                          </style>
                                        </head>
                                        <body>
                                          ${scr.layout_html}
                                        </body>
                                      </html>
                                    `}
                                    className="w-full h-full border-none pointer-events-none scale-90"
                                  />
                                </div>

                                {/* Desc */}
                                <div className="p-4 space-y-1 mt-auto">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono">Purpose:</span>
                                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans line-clamp-2">{scr.screen_purpose}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Request Changes Form */}
                          <div className="flex flex-col gap-2 pt-4">
                            <label className="text-xs font-semibold tracking-wider font-mono text-[#C9A84C] uppercase flex items-center gap-1.5">
                              Request changes (optional)
                            </label>
                            <textarea 
                              placeholder="e.g. Try a dark blue layout theme, or change screen titles to be clearer..."
                              value={changeRequests}
                              onChange={(e) => setChangeRequests(e.target.value)}
                              rows={2.5}
                              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-750 focus:border-[#C9A84C] text-xs text-white px-4 py-3 rounded-xl outline-none"
                            />
                            <p className="text-[10px] text-slate-500">Provide adjustments instructions to re-generate modified visual drafts above.</p>
                          </div>

                          {/* Build Activation Button */}
                          <div className="pt-4">
                            <button 
                              disabled={isSubmitting}
                              onClick={handleApproveScreensAndBuild}
                              className="w-full inline-flex items-center justify-center bg-gradient-to-r from-[#C9A84C] to-[#E3C268] hover:from-[#E3C268] hover:to-[#C9A84C] text-black font-extrabold tracking-wider text-xs sm:text-sm py-4 rounded-xl shadow-xl shadow-[#C9A84C]/5 transition-all disabled:opacity-50 uppercase cursor-pointer"
                            >
                              Build My Product →
                            </button>
                          </div>
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 5: Loading Build View
                       ***********************************************************/}
                      {item.step === 5 && (
                        <div className="py-12 flex flex-col justify-center items-center text-center space-y-6">
                          <div className="relative">
                            {/* Golden Spinner Circle */}
                            <div className="w-16 h-16 border-4 border-[#C9A84C]/10 border-t-[#C9A84C] rounded-full animate-spin"></div>
                            <Sparkles className="w-6 h-6 text-[#C9A84C] absolute top-5 left-5 animate-pulse" />
                          </div>

                          <div>
                            <h2 className="font-bebas text-5xl tracking-widest text-[#C9A84C] inline-block animate-pulse mb-3 leading-none">
                              BUILDING YOUR PRODUCT
                            </h2>
                            <p className="text-xs text-slate-400 font-mono tracking-wider max-w-sm mx-auto uppercase mt-2">
                              {cyclingMessages[loadingMsgIdx]}
                            </p>
                          </div>

                          <div className="p-4 bg-slate-950/70 border border-slate-800/60 rounded-2xl max-w-md text-left flex gap-3">
                            <Info className="w-4.5 h-4.5 text-[#C9A84C] shrink-0 mt-0.5" />
                            <p className="text-[10px] text-slate-400 leading-normal">
                              VibeLab is compiling your entire single-file HTML/CSS/JS MVP code on the server-side, integrating mock analytics models, interactive templates, and navigation features. Please hold on!
                            </p>
                          </div>
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Premium Full-Screen Visual Screen Modal Overlay */}
      <AnimatePresence>
        {selectedScreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/60 shrink-0">
                <div>
                  <h4 className="text-sm font-black uppercase text-[#C9A84C] tracking-widest font-mono">Screen Preview</h4>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedScreen.screen_name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedScreen(null)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all uppercase cursor-pointer"
                >
                  Close ×
                </button>
              </div>

              {/* Full view wrapper */}
              <div className="flex-1 overflow-hidden bg-slate-950 flex flex-col p-4">
                <div className="flex-1 border border-slate-800/60 rounded-2xl overflow-hidden bg-slate-100 relative">
                  <iframe 
                    title={selectedScreen.screen_name}
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            body { font-family: system-ui, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; margin: 0; min-height: 100vh; overflow-y: auto; }
                            * { box-sizing: border-box; }
                          </style>
                        </head>
                        <body>
                          ${selectedScreen.layout_html}
                        </body>
                      </html>
                    `}
                    className="w-full h-full border-none"
                  />
                </div>
              </div>

              {/* Footer specs */}
              <div className="p-6 border-t border-slate-800/60 bg-slate-950/40 text-[11px] text-slate-400 font-medium leading-relaxed shrink-0 flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-[#C9A84C]" />
                <span><strong>Purpose spec:</strong> {selectedScreen.screen_purpose}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
