import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import MonacoEditor from '@monaco-editor/react';
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
  Info,
  RotateCw,
  Copy,
  Monitor,
  Tablet,
  Smartphone,
  Play,
  Pause,
  Trophy,
  Award,
  CheckCircle,
  HelpCircle,
  Star
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

const findLinesForSection = (html: string, sectionIndex: number, f1: string, f2: string) => {
  if (!html) return { start: 1, end: 20 };
  const lines = html.split('\n');
  
  if (sectionIndex === 0) {
    // Structure
    const bodyIdx = lines.findIndex(l => l.toLowerCase().includes('<body') || l.toLowerCase().includes('<body>'));
    const start = bodyIdx !== -1 ? Math.max(1, bodyIdx + 1) : 1;
    return { start, end: Math.min(start + 25, lines.length) };
  }
  
  if (sectionIndex === 1) {
    // Navigation
    const navIdx = lines.findIndex(l => l.toLowerCase().includes('showscreen') || l.toLowerCase().includes('switchscreen') || l.toLowerCase().includes('active') || l.toLowerCase().includes('class="nav') || l.toLowerCase().includes('id="nav'));
    const start = navIdx !== -1 ? Math.max(1, navIdx + 1) : 35;
    return { start, end: Math.min(start + 25, lines.length) };
  }
  
  if (sectionIndex === 2) {
    // Feature 1
    const feat1Idx = lines.findIndex(l => l.toLowerCase().includes(f1.toLowerCase()) || l.toLowerCase().includes('section-') || l.toLowerCase().includes('feature-1'));
    const start = feat1Idx !== -1 ? Math.max(1, feat1Idx + 1) : 60;
    return { start, end: Math.min(start + 30, lines.length) };
  }
  
  if (sectionIndex === 3) {
    // Feature 2
    const feat2Idx = lines.findIndex(l => l.toLowerCase().includes(f2.toLowerCase()) || l.toLowerCase().includes('list-') || l.toLowerCase().includes('feature-2'));
    const start = feat2Idx !== -1 ? Math.max(1, feat2Idx + 1) : 95;
    return { start, end: Math.min(start + 30, lines.length) };
  }
  
  if (sectionIndex === 4) {
    // Memory database/store or state data
    const dataIdx = lines.findIndex(l => (l.includes('const ') || l.includes('let ')) && (l.toLowerCase().includes('data') || l.toLowerCase().includes('sample') || l.toLowerCase().includes('items') || l.toLowerCase().includes('mock')));
    const start = dataIdx !== -1 ? Math.max(1, dataIdx + 1) : Math.max(1, lines.length - 25);
    return { start, end: lines.length };
  }
  
  return { start: 1, end: 20 };
};

const getInjectedMvpCode = (codeText: string) => {
  if (!codeText) return '';
  if (codeText.includes('vibelab-highlight-overlay')) return codeText;

  const scriptToInject = `
    <script>
      window.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'highlight') {
          const existing = document.getElementById('vibelab-highlight-overlay');
          if (existing) existing.remove();

          const targetSelector = event.data.selector;
          let element = document.querySelector(targetSelector);
          if (!element && targetSelector.includes(',')) {
            const list = targetSelector.split(',');
            for (let sel of list) {
              const cleaned = sel.trim();
              const found = document.querySelector(cleaned);
              if (found) {
                element = found;
                break;
              }
            }
          }
          if (!element) {
            // fallback
            element = document.querySelector('button') || document.querySelector('main') || document.body;
          }

          if (element && element !== document.body) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const rect = element.getBoundingClientRect();
            const overlay = document.createElement('div');
            overlay.id = 'vibelab-highlight-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = (rect.top + window.scrollY) + 'px';
            overlay.style.left = (rect.left + window.scrollX) + 'px';
            overlay.style.width = rect.width + 'px';
            overlay.style.height = rect.height + 'px';
            overlay.style.border = '3px solid #C9A84C';
            overlay.style.borderRadius = '8px';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '99999';
            overlay.style.boxShadow = '0 0 15px rgba(201, 168, 76, 0.4)';
            overlay.style.transition = 'all 0.3s ease';

            const tag = document.createElement('div');
            tag.innerText = '← This is what the code does';
            tag.style.position = 'absolute';
            tag.style.top = '-25px';
            tag.style.left = '0';
            tag.style.backgroundColor = '#C9A84C';
            tag.style.color = '#000000';
            tag.style.padding = '2px 8px';
            tag.style.borderRadius = '4px';
            tag.style.fontSize = '10px';
            tag.style.fontWeight = 'bold';
            tag.style.fontFamily = 'monospace';
            tag.style.whiteSpace = 'nowrap';
            tag.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            overlay.appendChild(tag);

            document.body.appendChild(overlay);
          }
        }
      });
    </script>
  `;

  if (codeText.includes('</body>')) {
    return codeText.replace('</body>', scriptToInject + '</body>');
  }
  return codeText + scriptToInject;
};

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

  // STEP 6–10 States
  const [mvp, setMvp] = useState<any>(null);
  const [selectedTaskIdx, setSelectedTaskIdx] = useState<number>(0);
  const [taskExplanations, setTaskExplanations] = useState<Record<number, string>>({});
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<any[]>([]);

  // STEP 7 State
  const [productDescription, setProductDescription] = useState<string>('');

  // STEP 8 State
  const [featureRationales, setFeatureRationales] = useState<Record<number, string>>({});
  const [featureFeedback, setFeatureFeedback] = useState<Record<number, string>>({});
  const [featureSubmitting, setFeatureSubmitting] = useState<Record<number, boolean>>({});

  // STEP 9 State
  const [timerSeconds, setTimerSeconds] = useState<number>(180);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerCompleted, setTimerCompleted] = useState<boolean>(false);
  const [demoScript, setDemoScript] = useState<string>('');

  // STEP 10 State
  const [showFullProductModal, setShowFullProductModal] = useState<boolean>(false);

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

          if (data.mvp) {
            setMvp(data.mvp);
            setProductDescription(data.mvp.product_description || '');
            setDemoScript(data.mvp.demo_script || '');
            
            const initialRationales: Record<number, string> = {};
            const initialFeedback: Record<number, string> = {};
            data.features.forEach((f: any) => {
              initialRationales[f.id] = f.student_rationale || '';
              initialFeedback[f.id] = f.ai_feedback || '';
            });
            setFeatureRationales(initialRationales);
            setFeatureFeedback(initialFeedback);
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

  // STEP 6: Walkthrough Task Click Handler
  const handleTaskClick = async (idx: number) => {
    setSelectedTaskIdx(idx);

    const mustHaves = features.filter(f => f.category === 'must_have' && (f.is_included === 1 || f.is_included === true));
    const f1 = mustHaves[0]?.feature_name || 'Core Feature 1';
    const f2 = mustHaves[1]?.feature_name || 'Core Feature 2';
    const lines = findLinesForSection(mvp?.mvp_html || '', idx, f1, f2);

    if (editorRef.current && monacoRef.current) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      editor.revealLineInCenter(lines.start);

      const newDecorations = [
        {
          range: new monaco.Range(lines.start, 1, lines.end, 1),
          options: {
            isWholeLine: true,
            className: 'monaco-highlight-gold',
            marginClassName: 'monaco-margin-gold'
          }
        }
      ];
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current || [], newDecorations);
    }

    // Trigger iframe message highlight
    const selectors = ['body', '.navigation, nav, header', '.must-have-1, button, .feature-btn', '.must-have-2, input, textarea, form', '.data-section, ul, table, .items-container'];
    const targetSelector = selectors[idx];
    const iframe = document.getElementById('walkthrough-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ action: 'highlight', selector: targetSelector }, '*');
    }

    // Fetch AI explanation
    if (!taskExplanations[idx]) {
      setIsExplaining(true);
      try {
        const token = localStorage.getItem('vibelab_token');
        const res = await fetch('/api/product/walkthrough/explain', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: session?.id,
            section_index: idx,
            project_name: projectName,
            feature_name: idx === 2 ? f1 : idx === 3 ? f2 : ''
          })
        });
        if (res.ok) {
          const resData = await res.json();
          setTaskExplanations(prev => ({ ...prev, [idx]: resData.explanation }));
        } else {
          setTaskExplanations(prev => ({ ...prev, [idx]: 'This digital structure organizes elements clearly to solve your primary user challenge.' }));
        }
      } catch (err) {
        console.error(err);
        setTaskExplanations(prev => ({ ...prev, [idx]: 'Failed to generate real-time mentor walkthrough.' }));
      } finally {
        setIsExplaining(false);
      }
    }
  };

  useEffect(() => {
    if (activeStep === 6 && mvp?.mvp_html) {
      const t = setTimeout(() => {
        handleTaskClick(0);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [activeStep, mvp]);

  const handleCompleteStep6 = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/step/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session?.id,
          step: 'code_walkthrough'
        })
      });
      if (!res.ok) throw new Error('Failed to update step progress.');
      setActiveStep(7);
      toast.success('Step 6 Complete! Time to pitch your product Story.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete step 6.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDescriptionStep7 = async () => {
    if (!productDescription.trim()) {
      return toast.error('Please describe your product.');
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/description/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session?.id,
          product_description: productDescription
        })
      });
      if (!res.ok) throw new Error('Failed to save description.');

      await fetch('/api/product/step/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session?.id,
          step: 'description'
        })
      });

      setActiveStep(8);
      toast.success('Description saved! Let\'s explain your features.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save description.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExplainFeatureStep8 = async (featId: number, rationale: string) => {
    if (!rationale.trim()) return;
    setFeatureSubmitting(prev => ({ ...prev, [featId]: true }));
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/features/explain', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session?.id,
          feature_id: featId,
          student_rationale: rationale
        })
      });
      if (res.ok) {
        const resData = await res.json();
        setFeatureFeedback(prev => ({ ...prev, [featId]: resData.ai_feedback }));
        toast.success('Rationale saved with AI feedback!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFeatureSubmitting(prev => ({ ...prev, [featId]: false }));
    }
  };

  const handleCompleteStep8 = async () => {
     setIsSubmitting(true);
     try {
       const token = localStorage.getItem('vibelab_token');
       const res = await fetch('/api/product/step/complete', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: session?.id,
            step: 'explain'
          })
       });
       if (!res.ok) throw new Error('Failed to advance step');
       setActiveStep(9);
       toast.success('Features rationalized! Next: Demo Prep.');
     } catch (err: any) {
       toast.error(err.message || 'Failed to advance step');
     } finally {
       setIsSubmitting(false);
     }
  };

  const handleSaveDemoStep9 = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/demo/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session?.id,
          demo_script: demoScript,
          key_talking_points: mvp?.key_talking_points || []
        })
      });
      if (!res.ok) throw new Error('Failed to save demo.');

      await fetch('/api/product/step/complete', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           session_id: session?.id,
           step: 'demo'
         })
      });

      setActiveStep(10);
      toast.success('Demo presentation script locked! Complete Phase 2 🎉');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save demo preparation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (activeStep === 9 && isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setTimerCompleted(true);
            toast.success('⏱️ Practice session completed! Dynamic pitch locked in.', { duration: 4000 });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeStep, isTimerRunning, timerSeconds]);

  const handleCompletePhase2 = async () => {
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
          session_id: session?.id,
          builder_reflection: 'Completed all 10 product creation walkthrough phases and developed the initial Campaign Launch Kit.'
        })
      });
      if (!res.ok) throw new Error('Failed to approve MVP launch deliverables.');
      
      toast.success('Phase 2 Complete 🎉 — Phase 3 is now unlocked.', { duration: 5000 });
      window.location.href = '/dashboard';
    } catch (err: any) {
      toast.error(err.message || 'Error completing product campaign step.');
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

                      {/**********************************************************
                       * STEP 6: Understand Your Code (Interactive 3-Panel Walkthrough)
                       ***********************************************************/}
                      {item.step === 6 && (
                        <div className="flex flex-col lg:flex-row min-h-[580px] bg-slate-900/65 rounded-2xl border border-slate-800/80 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
                          {/* Left Panel: Guide (33% width) */}
                          <div className="w-full lg:w-[33%] p-5 flex flex-col justify-between space-y-5 bg-slate-950/40">
                            <div className="space-y-4">
                              <div>
                                <div className="text-[10px] font-bold text-[#C9A84C] font-mono tracking-widest uppercase mb-1">
                                  YOUR PRODUCT GUIDE
                                </div>
                                <h4 className="text-sm font-bold text-white truncate">
                                  {projectName || 'My Product'} — How It Works
                                </h4>
                              </div>

                              {/* Numbered tasks */}
                              <div className="space-y-2.5">
                                {[
                                  { title: 'The Structure', desc: 'How your product is organised' },
                                  { title: 'The Navigation', desc: 'How users move between screens' },
                                  { title: `The ${features.filter(f => f.category === 'must_have' && (f.is_included === 1 || f.is_included === true))[0]?.feature_name || 'Core System'}`, desc: 'What it does and how' },
                                  { title: `The ${features.filter(f => f.category === 'must_have' && (f.is_included === 1 || f.is_included === true))[1]?.feature_name || 'Action Flow'}`, desc: 'What it does and how' },
                                  { title: 'The Data', desc: 'The sample information displayed' }
                                ].map((task, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleTaskClick(idx)}
                                    className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                                      selectedTaskIdx === idx 
                                        ? 'bg-[#C9A84C]/10 border-[#C9A84C]/45 text-white' 
                                        : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/85 text-slate-300'
                                    }`}
                                  >
                                    <span className={`w-5 h-5 rounded-full text-[11px] font-bold font-mono shrink-0 flex items-center justify-center border ${
                                      selectedTaskIdx === idx 
                                        ? 'bg-[#C9A84C] border-[#C9A84C] text-black' 
                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                    <div>
                                      <p className="text-xs font-bold leading-tight">{task.title}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{task.desc}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>

                              {/* Explanation block */}
                              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2">
                                <p className="text-[10px] font-bold text-[#C9A84C] tracking-wide uppercase font-mono">
                                  What this code does
                                </p>
                                {isExplaining ? (
                                  <div className="flex items-center gap-2 py-2">
                                    <Loader2 className="w-4 h-4 text-[#C9A84C] animate-spin" />
                                    <span className="text-[11px] text-slate-400 animate-pulse font-mono uppercase tracking-wider">Compiling expert review...</span>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-300 leading-normal pl-0.5">
                                    {taskExplanations[selectedTaskIdx] || 'Think of this like your app\'s foundation. It defines the central shell that ensures your text, inputs, and screens have space to exist and flow perfectly!'}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="pt-2">
                              <button
                                onClick={handleCompleteStep6}
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-[#C9A84C] hover:bg-[#E3C268] text-black rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#C9A84C]/5 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 font-sans"
                              >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : 'I Understand — Complete Step 6 →'}
                              </button>
                            </div>
                          </div>

                          {/* Center Panel: Monaco Editor (34% width) */}
                          <div className="w-full lg:w-[34%] flex flex-col bg-slate-950">
                            {/* Editor Utilities header */}
                            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950 font-mono text-[10px]">
                              <span className="text-cyan-400 font-bold uppercase tracking-wide">index.html</span>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(mvp?.mvp_html || '');
                                    toast.success('Starter code copied to clipboard!');
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                  }}
                                  className="text-slate-400 hover:text-white flex items-center gap-1 uppercase transition-colors font-bold"
                                >
                                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  Copy
                                </button>
                                <button
                                  onClick={() => {
                                    handleTaskClick(selectedTaskIdx);
                                    toast.success('Template view reset!');
                                  }}
                                  className="text-slate-400 hover:text-white flex items-center gap-1 uppercase transition-colors font-bold opacity-80"
                                >
                                  <RotateCw className="w-3 h-3" />
                                  Reset
                                </button>
                              </div>
                            </div>

                            {/* Monaco Editor React Container */}
                            <div className="flex-1 min-h-[350px] relative overflow-hidden flex flex-col">
                              {mvp?.mvp_html ? (
                                <MonacoEditor
                                  height="100%"
                                  language="html"
                                  theme="vs-dark"
                                  value={mvp.mvp_html}
                                  onMount={(editor, monaco) => {
                                    editorRef.current = editor;
                                    monacoRef.current = monaco;
                                    handleTaskClick(selectedTaskIdx);
                                  }}
                                  options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    fontSize: 11,
                                    lineNumbers: "on",
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    smoothScrolling: true,
                                    wordWrap: "on",
                                    padding: { top: 12, bottom: 12 }
                                  }}
                                />
                              ) : (
                                <div className="absolute inset-0 bg-slate-950 flex flex-col justify-center items-center text-slate-500 gap-2">
                                  <Loader2 className="w-6 h-6 animate-spin text-[#C9A84C]" />
                                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#C9A84C]">LOADING SOURCE...</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Panel: Live Interactive Preview Simulated (33% width) */}
                          <div className="w-full lg:w-[33%] flex flex-col bg-slate-950">
                            {/* Device controls header */}
                            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950">
                              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-widest">FLUID PREVIEW</span>
                              
                              {/* Device Toggles */}
                              <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800/80 rounded-md">
                                <button
                                  onClick={() => setPreviewDevice('desktop')}
                                  className={`p-1 rounded transition-colors ${previewDevice === 'desktop' ? 'bg-[#C9A84C] text-black' : 'text-slate-400 hover:text-white'}`}
                                >
                                  <Monitor className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setPreviewDevice('tablet')}
                                  className={`p-1 rounded transition-colors ${previewDevice === 'tablet' ? 'bg-[#C9A84C] text-black' : 'text-slate-400 hover:text-white'}`}
                                >
                                  <Tablet className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setPreviewDevice('mobile')}
                                  className={`p-1 rounded transition-colors ${previewDevice === 'mobile' ? 'bg-[#C9A84C] text-black' : 'text-slate-400 hover:text-white'}`}
                                >
                                  <Smartphone className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Iframe stage rendering container */}
                            <div className="flex-1 bg-[#050814] flex flex-col justify-center items-center p-3 relative overflow-hidden">
                              <div className={`transition-all duration-300 shadow-2xl h-full border border-slate-850 rounded-xl overflow-hidden bg-[#090d1a] ${
                                previewDevice === 'mobile' ? 'w-[280px]' : previewDevice === 'tablet' ? 'w-[420px]' : 'w-full'
                              }`}>
                                {mvp?.mvp_html ? (
                                  <iframe
                                    id="walkthrough-preview-iframe"
                                    title="Campaign MVP code interactive walkthrough and emulator"
                                    sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                                    srcDoc={getInjectedMvpCode(mvp.mvp_html)}
                                    className="w-full h-full border-none"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-[#02050e] flex flex-col justify-center items-center text-slate-500 gap-2">
                                    <RefreshCw className="w-6 h-6 animate-spin text-[#C9A84C]" />
                                    <p className="text-[10px] uppercase font-mono tracking-wider text-[#C9A84C]">LOADING SANDBOX SCREEN...</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 7: Describe Your Product
                       ***********************************************************/}
                      {item.step === 7 && (
                        <div className="p-6 md:p-8 space-y-6">
                          <div>
                            <span className="px-2.5 py-1 bg-[#C9A84C]/10 text-[#C9A84C] text-[10px] font-black uppercase tracking-widest rounded-md border border-[#C9A84C]/20 font-mono">
                              Product Launch Pitch
                            </span>
                            <h3 className="font-bebas text-4xl tracking-widest text-[#C9A84C] mt-3 uppercase leading-none">
                              DESCRIBE YOUR PRODUCT
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 pl-0.5">
                              This description serves as the core narrative of your product. Edit the AI-generated starter draft until it sounds perfect!
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase font-[#C9A84C] font-mono">
                              Edit this until it sounds like you:
                            </label>
                            <textarea
                              value={productDescription}
                              onChange={(e) => setProductDescription(e.target.value)}
                              rows={10}
                              placeholder="Write a clear startup marketing pitch detailing the user journey and outcomes..."
                              className="w-full bg-slate-900/60 border border-slate-800 hover:border-slate-750 focus:border-[#C9A84C] text-sm text-slate-100 px-5 py-4 rounded-xl outline-none transition-all placeholder:text-slate-650 leading-relaxed font-sans resize-y"
                            />
                            
                            {/* Live Word Count Indicator */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase">
                              <span>WORD COUNT: <strong className="text-emerald-400">{productDescription.trim() ? productDescription.trim().split(/\s+/).length : 0}</strong> words</span>
                              <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" /> Drafted with Gemini AI</span>
                            </div>
                          </div>

                          <div className="flex justify-end pt-4 border-t border-slate-900">
                            <button
                              onClick={handleSaveDescriptionStep7}
                              disabled={isSubmitting}
                              className="px-8 py-3.5 bg-[#C9A84C] hover:bg-[#E3C268] text-black font-extrabold tracking-wider text-xs uppercase rounded-xl transition-all shadow-md shadow-[#C9A84C]/10 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 font-sans"
                            >
                              {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-black" />
                              ) : (
                                <>
                                  Save My Description <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 8: Explain Your Features
                       ***********************************************************/}
                      {item.step === 8 && (
                        <div className="p-6 md:p-8 space-y-6">
                          <div>
                            <span className="px-2.5 py-1 bg-[#C9A84C]/10 text-[#C9A84C] text-[10px] font-black uppercase tracking-widest rounded-md border border-[#C9A84C]/20 font-mono">
                              System Mechanics
                            </span>
                            <h3 className="font-bebas text-4xl tracking-widest text-[#C9A84C] mt-3 uppercase leading-none">
                              EXPLAIN YOUR FEATURES
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 pl-0.5">
                              Startup founders must explain *why* every must-have feature serves user value. Fill out your rationales below, and click away to get real-time encouragement from your startup mentor!
                            </p>
                          </div>

                          {/* Render cards for must-have features */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {features.filter(f => f.category === 'must_have' && (f.is_included === 1 || f.is_included === true)).map((feat) => (
                              <div 
                                key={feat.id}
                                className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/85 flex flex-col justify-between space-y-4"
                              >
                                <div className="space-y-1">
                                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">
                                    <span className="w-2 h-2 rounded-full bg-[#C9A84C]"></span>
                                    {feat.feature_name}
                                  </h4>
                                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                                    {feat.feature_description}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                                    Why did you include this feature?
                                  </label>
                                  <textarea
                                    value={featureRationales[feat.id] || ''}
                                    onChange={(e) => setFeatureRationales(prev => ({ ...prev, [feat.id]: e.target.value }))}
                                    onBlur={() => handleExplainFeatureStep8(feat.id, featureRationales[feat.id] || '')}
                                    rows={2.5}
                                    placeholder="e.g. Because students lose track of paper schedules, putting this dynamic log on their phone helps them remember..."
                                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-750 focus:border-[#C9A84C] text-xs text-slate-200 px-4 py-3 rounded-xl outline-none"
                                  />
                                </div>

                                {/* AI Gold Feedback Bubble */}
                                {(featureFeedback[feat.id] || featureSubmitting[feat.id]) && (
                                  <div className="p-3.5 rounded-xl bg-[#C9A84C]/5 border border-[#C9A84C]/15 flex items-start gap-2 relative overflow-hidden">
                                    <Sparkles className="w-4 h-4 text-[#C9A84C] shrink-0 mt-0.5" />
                                    {featureSubmitting[feat.id] ? (
                                      <div className="flex items-center gap-1.5">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A84C]" />
                                        <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest animate-pulse">Consulting AI Mentor...</span>
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-[#C9A84C] italic font-sans pl-0.5 leading-normal">
                                        "{featureFeedback[feat.id]}"
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end pt-4 border-t border-slate-900">
                            <button
                              onClick={handleCompleteStep8}
                              disabled={isSubmitting}
                              className="px-8 py-3.5 bg-[#C9A84C] hover:bg-[#E3C268] text-black font-extrabold tracking-wider text-xs uppercase rounded-xl transition-all shadow-md shadow-[#C9A84C]/10 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 font-sans"
                            >
                              I've Explained My Features <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 9: Demo Preparation
                       ***********************************************************/}
                      {item.step === 9 && (
                        <div className="p-6 md:p-8 space-y-6">
                          <div>
                            <span className="px-2.5 py-1 bg-[#C9A84C]/10 text-[#C9A84C] text-[10px] font-black uppercase tracking-widest rounded-md border border-[#C9A84C]/20 font-mono">
                              Investor Pitch Kit
                            </span>
                            <h3 className="font-bebas text-4xl tracking-widest text-[#C9A84C] mt-3 uppercase leading-none">
                              DEMO PREPARATION
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 pl-0.5">
                              Prepare your delivery script, focus on key benefits, and warm-up speaking using our dedicated practice rehearsal tools!
                            </p>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                            {/* DEMO SCRIPT & REHEARSAL TIMER (Left 8 cols) */}
                            <div className="lg:col-span-8 flex flex-col gap-5">
                              {/* 1. Editable Demo Script */}
                              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                                <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full"></span>
                                  1. Demo Script Narrative
                                </h4>
                                <textarea
                                  value={demoScript}
                                  onChange={(e) => setDemoScript(e.target.value)}
                                  rows={8}
                                  placeholder="Review and polish your detailed step-by-step presentation narrative..."
                                  className="w-full bg-slate-950 border border-slate-800/80 hover:border-slate-750 focus:border-[#C9A84C] text-xs text-slate-100 px-4 py-3 rounded-xl outline-none leading-relaxed font-sans resize-y"
                                />
                              </div>

                              {/* 3. Rehearsal countdown timer */}
                              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="space-y-1 block max-w-sm">
                                  <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full"></span>
                                    3. Practice Mode Rehearsal
                                  </h4>
                                  <p className="text-[10px] text-slate-400 leading-normal font-sans">
                                    Read your demo script aloud and click Start, testing feature walkthrough steps within our 3-minute presentation limit!
                                  </p>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 bg-slate-950 px-5 py-3 rounded-xl border border-slate-800">
                                  {/* Timer countdown view */}
                                  <div className="font-mono text-2xl font-black text-[#C9A84C] tracking-widest w-16 text-center select-none">
                                    {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:
                                    {(timerSeconds % 60).toString().padStart(2, '0')}
                                  </div>

                                  <button
                                    onClick={() => {
                                      if (timerSeconds === 0) setTimerSeconds(180);
                                      setIsTimerRunning(!isTimerRunning);
                                    }}
                                    className={`p-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                      isTimerRunning 
                                        ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25' 
                                        : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                                    }`}
                                  >
                                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-emerald-400" />}
                                  </button>
                                </div>
                              </div>

                              {timerCompleted && (
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center font-bold text-emerald-200 font-mono uppercase tracking-wider text-xs select-none">
                                  🎉 Great practice! You are fully prepared to demo.
                                </div>
                              )}
                            </div>

                            {/* KEY TALKING POINTS (Right 4 cols) */}
                            <div className="lg:col-span-4 flex flex-col gap-4">
                              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-805 space-y-3">
                                <h4 className="text-xs font-bold text-slate-350 font-mono uppercase tracking-wider flex items-center gap-1.5 font-sans">
                                  <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full"></span>
                                  2. Talking Points
                                </h4>
                                <div className="space-y-2.5">
                                  {(mvp?.key_talking_points || [
                                    `Start with the problem ${projectName || 'your app'} solves daily`,
                                    `Explain how simple user navigation removes administrative confusion`,
                                    `Highlight the core visual mock dashboard components`,
                                    `Introduce your plan for multi-user database scaling`
                                  ]).map((tp: string, tpIdx: number) => (
                                    <div 
                                      key={tpIdx}
                                      className="p-3.5 rounded-xl border border-[#C9A84C]/25 bg-[#C9A84C]/5 text-[11px] text-slate-200 leading-normal font-sans hover:border-[#C9A84C]/45 transition-all"
                                    >
                                      <strong>Benefit #{tpIdx + 1}:</strong> {tp}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end pt-4 border-t border-slate-900">
                            <button
                              onClick={handleSaveDemoStep9}
                              disabled={isSubmitting}
                              className="px-8 py-3.5 bg-[#C9A84C] hover:bg-[#E3C268] text-black font-extrabold tracking-wider text-xs uppercase rounded-xl transition-all shadow-md shadow-[#C9A84C]/10 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 font-sans"
                            >
                              I've Designed My Demo Script <ArrowRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 10: Complete Phase 2
                       ***********************************************************/}
                      {item.step === 10 && (
                        <div className="p-8 text-center space-y-8 max-w-3xl mx-auto py-10">
                          {/* Trophy and Badge */}
                          <div className="flex flex-col items-center gap-3">
                            <motion.div 
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', damping: 12, stiffness: 100 }}
                              className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#C9A84C]/25 to-amber-400/25 border border-[#C9A84C]/40 flex items-center justify-center text-[#C9A84C] relative shadow-lg shadow-[#C9A84C]/5"
                            >
                              <Trophy className="w-10 h-10 animate-pulse text-[#C9A84C]" />
                              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#C9A84C]"></span>
                              </span>
                            </motion.div>

                            <span className="px-3 py-1 bg-[#C9A84C] text-black text-[10px] font-black font-mono tracking-widest rounded-full uppercase shadow-md shadow-[#C9A84C]/20 select-none animate-bounce mt-2">
                              READY FOR QA
                            </span>
                          </div>

                          {/* Titles */}
                          <div className="space-y-2">
                            <h2 className="font-bebas text-5xl md:text-7xl tracking-widest text-[#C9A84C] leading-none uppercase">
                              YOUR PRODUCT IS READY
                            </h2>
                            <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed pl-0.5">
                              You completed <strong>{projectName || 'your project'}</strong>! Your initial campaign MVP and pitching collateral have compiled flawlessly.
                            </p>
                          </div>

                          {/* Deliverables Grid (2x4) */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left max-w-2xl mx-auto select-none pt-2">
                            {[
                              { label: 'Working Product' },
                              { label: 'Project Description' },
                              { label: 'Feature List' },
                              { label: 'User Flow' },
                              { label: 'Product Screens' },
                              { label: 'Demo Script' },
                              { label: 'MVP Summary' },
                              { label: 'Builder Reflection' }
                            ].map((del, dIdx) => (
                              <motion.div
                                key={dIdx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 * dIdx }}
                                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 hover:border-[#C9A84C]/25 transition-all font-sans"
                              >
                                <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-200 truncate">{del.label}</span>
                              </motion.div>
                            ))}
                          </div>

                          {/* Buttons */}
                          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4 max-w-lg mx-auto">
                            <button
                              onClick={handleCompletePhase2}
                              disabled={isSubmitting}
                              className="w-full inline-flex items-center justify-center bg-gradient-to-r from-[#C9A84C] to-[#E3C268] hover:from-[#E3C268] hover:to-[#C9A84C] text-black font-extrabold tracking-widest text-xs uppercase px-6 py-4.5 rounded-xl transition-all shadow-xl shadow-[#C9A84C]/15 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer text-center font-sans h-12"
                            >
                              Continue — Phase 3: Testing & Validation →
                            </button>
                            
                            <button
                              onClick={() => setShowFullProductModal(true)}
                              className="w-full px-6 py-4 bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-300 hover:text-white font-mono text-xs font-bold tracking-widest uppercase rounded-xl transition-colors cursor-pointer text-center h-12"
                            >
                              View My Full Product
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              const shareUrl = `${window.location.origin}/profile/${session?.id || 'share'}`;
                              navigator.clipboard.writeText(shareUrl);
                              toast.success('Campaign share URL copied to clipboard!');
                            }}
                            className="w-full text-center text-[10px] uppercase tracking-widest font-mono font-bold text-slate-500 hover:text-[#C9A84C] transition-colors cursor-pointer border-none bg-transparent"
                          >
                            Share My Product
                          </button>
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
                  className="px-4 py-2 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all uppercase cursor-pointer"
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

      {/* Premium Full-Screen Deliverables Board Modal Overlay */}
      <AnimatePresence>
        {showFullProductModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 selection:bg-[#C9A84C]/30"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl text-left"
            >
              <div className="p-6 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/60 shrink-0">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-[#C9A84C] tracking-widest font-mono">Launch Kit Board</h4>
                  <h3 className="text-lg font-bold text-white mt-1">Campaign Deliverables: {projectName}</h3>
                </div>
                <button 
                  onClick={() => setShowFullProductModal(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all uppercase cursor-pointer"
                >
                  Close ×
                </button>
              </div>

              {/* Scrollable deliverables overview content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. Project Blueprint */}
                <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-850 space-y-3">
                  <h4 className="text-xs font-bold text-[#C9A84C] font-mono uppercase tracking-wider">
                    I. Foundational Project Blueprint
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 uppercase font-mono text-[9px] font-bold">Project Name</p>
                      <p className="text-slate-200 font-bold mt-0.5">{projectName}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase font-mono text-[9px] font-bold">Target User Base</p>
                      <p className="text-slate-200 mt-0.5">{targetUsers}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-slate-500 uppercase font-mono text-[9px] font-bold">Problem Statement</p>
                      <p className="text-slate-200 mt-0.5 leading-relaxed">{problemStatement}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-slate-500 uppercase font-mono text-[9px] font-bold">Minimum Viable Scope</p>
                      <p className="text-slate-200 mt-0.5 leading-relaxed">{mvpScope}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Campaign Description */}
                <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-850 space-y-2">
                  <h4 className="text-xs font-bold text-[#C9A84C] font-mono uppercase tracking-wider">
                    II. Campaign Product Pitch
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text pl-1 border-l-2 border-[#C9A84C]/35">
                    {productDescription || 'Describe details locked in Step 7 pitch board.'}
                  </p>
                </div>

                {/* 3. Features & Rationales */}
                <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-850 space-y-3">
                  <h4 className="text-xs font-bold text-[#C9A84C] font-mono uppercase tracking-wider">
                    III. Core MVP System Features
                  </h4>
                  <div className="space-y-3">
                    {features.filter(f => f.category === 'must_have' && (f.is_included === 1 || f.is_included === true)).map((feat) => (
                      <div key={feat.id} className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]"></span>
                          {feat.feature_name}
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed">{feat.feature_description}</p>
                        <div className="p-2.5 rounded bg-slate-950 border border-slate-855 text-slate-300">
                          <strong className="text-[#C9A84C] font-mono text-[9px] uppercase tracking-wide block mb-1">Founder's Rationale:</strong>
                          <p className="italic text-[11px] leading-normal select-text">"{featureRationales[feat.id] || 'Under development.'}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Demo script */}
                <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-850 space-y-2">
                  <h4 className="text-xs font-bold text-[#C9A84C] font-mono uppercase tracking-wider">
                    IV. Step-by-Step Demo Script
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap select-text pl-1 border-l-2 border-[#C9A84C]/35">
                    {demoScript || 'Script details locked in Step 9 presentation rehearsal.'}
                  </p>
                </div>

              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-800 bg-[#070b16] flex justify-between items-center text-slate-500 font-mono text-[10px] shrink-0">
                <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-[#C9A84C]" /> VibeLab Campaign Launch Board</span>
                <span>ID: {session?.id || '200'}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
