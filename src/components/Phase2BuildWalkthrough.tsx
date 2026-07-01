import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Star,
  Save,
  Folder,
  FolderOpen,
  File,
  Search,
  Maximize2,
  Minimize2,
  Layout,
  BookOpen,
  FileText,
  PlaySquare,
  Type,
  Grid,
  BarChart3,
  LayoutTemplate,
  Box,
  Code2,
  Terminal
} from 'lucide-react';
import { EducationalAiBackground } from "./EducationalAiBackground";
import { AILoader } from "./AILoader";

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

const getComponentIcon = (type?: string) => {
  const t = (type || '').toLowerCase();
  if (t === 'button') return <PlaySquare className="w-4 h-4" />;
  if (t === 'form') return <Grid className="w-4 h-4" />;
  if (t === 'nav') return <LayoutTemplate className="w-4 h-4" />;
  if (t === 'display') return <BarChart3 className="w-4 h-4" />;
  if (t === 'input') return <Type className="w-4 h-4" />;
  return <Box className="w-4 h-4" />;
};

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
      // Capture and post state update to parent window
      function captureAndPostState() {
        try {
          const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map((el, idx) => ({
            id: el.id,
            name: el.name,
            type: el.type,
            value: el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value,
            className: el.className,
            index: idx
          }));
          
          window.parent.postMessage({
            type: 'SANDBOX_STATE_UPDATE',
            state: {
              inputs: inputs,
              timestamp: Date.now()
            }
          }, '*');
        } catch (err) {
          console.warn('Failed to capture sandbox state:', err);
        }
      }

      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'RESTORE_SANDBOX_STATE') {
          const state = event.data.state;
          if (state && Array.isArray(state.inputs)) {
            const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
            state.inputs.forEach(inputData => {
              try {
                let el = null;
                if (inputData.id) el = document.getElementById(inputData.id);
                if (!el && inputData.name) el = document.querySelector('[name="' + inputData.name + '"]');
                if (!el && typeof inputData.index === 'number') el = allInputs[inputData.index];
                
                if (el) {
                  if (inputData.type === 'checkbox' || inputData.type === 'radio') {
                    el.checked = !!inputData.value;
                  } else {
                    el.value = inputData.value;
                  }
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                }
              } catch (e) {}
            });
          }
        }

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
            overlay.style.border = '3px solid #2563eb';
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
            tag.style.backgroundColor = '#2563eb';
            tag.style.color = '#ffffff';
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

      // Bind interaction listeners to DOM elements
      document.addEventListener('input', captureAndPostState);
      document.addEventListener('change', captureAndPostState);
      document.addEventListener('click', (event) => {
        const target = event.target;
        if (target && (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'A' || target.closest('a'))) {
          setTimeout(captureAndPostState, 150);
        }
      });

      // Hover Tooltip System for Component Explanations
      function attachHoverListeners() {
        document.querySelectorAll('[data-component-id]').forEach(el => {
          if (el.dataset.hoverBound) return;
          el.dataset.hoverBound = 'true';
          el.addEventListener('mouseenter', (e) => {
            const rect = el.getBoundingClientRect();
            window.parent.postMessage({
              type: 'COMPONENT_HOVER',
              componentId: el.dataset.componentId,
              rect: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
              }
            }, '*');
          });
          el.addEventListener('mouseleave', () => {
            window.parent.postMessage({ type: 'COMPONENT_HOVER_END' }, '*');
          });
        });
      }

      attachHoverListeners();
      setInterval(attachHoverListeners, 1000);
    </script>
  `;

  if (codeText.includes('</body>')) {
    return codeText.replace('</body>', scriptToInject + '</body>');
  }
  return codeText + scriptToInject;
};

const STEP_LABELS = [
  { step: 1, label: 'Understand Your Idea', desc: 'Review and confirm your foundational MVP ideas.' },
  { step: 2, label: 'Plan Your Features', desc: 'Identify must-haves, nice-to-haves, and future plans.' },
  { step: 3, label: 'Design the User Experience', desc: 'Model how people will navigate through your application.' },
  { step: 4, label: 'Create Your Product Design', desc: 'Review high-fidelity wireframes and visual layouts.' },
  { step: 5, label: 'Build Your Product', desc: 'Compiling your code, assets, and wiring up views.' },
  { step: 6, label: 'Learn How Your Product Works', desc: 'Inspect your full screen, interactive MVP application.' },
  { step: 7, label: 'Tell Your Product Story', desc: 'Add descriptive features and the core story of your product.' },
  { step: 8, label: 'Understand the Technology', desc: 'Highlight the technical opportunities and systems.' },
  { step: 9, label: 'Practice Your Presentation', desc: 'Write down a step-by-step presentation script.' },
  { step: 10, label: 'Graduate & Get Certified', desc: 'Unlock your certification and submit your project!' }
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

export default function Phase2BuildWalkthrough({ 
  onClose, 
  initialStep 
}: { 
  onClose?: () => void;
  initialStep?: number;
}) {
  const [session, setSession] = useState<ProductSession | null>(null);
  const [activeStep, setActiveStep] = useState<number>(initialStep || 1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isEditingApprovedStep, setIsEditingApprovedStep] = useState<boolean>(false);

  useEffect(() => {
    setIsEditingApprovedStep(false);
  }, [activeStep]);

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
  const [buildProgress, setBuildProgress] = useState(5);
  const [buildError, setBuildError] = useState<string | null>(null);

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
  const [selectedComponent8, setSelectedComponent8] = useState<any | null>(null);

  useEffect(() => {
    if (session?.id && activeStep === 8) {
      const fetchComponents8 = async () => {
        try {
          const token = localStorage.getItem('vibelab_token');
          const res = await fetch(`/api/product/components/${session.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setComponentMetadata(data);
            if (data.length > 0) {
              setSelectedComponent8(data[0]);
            }
          }
        } catch (err) {
          console.error('Failed to pre-fetch components for active Step 8 in walkthrough:', err);
        }
      };
      fetchComponents8();
    }
  }, [session?.id, activeStep]);

  // STEP 9 State
  const [timerSeconds, setTimerSeconds] = useState<number>(180);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerCompleted, setTimerCompleted] = useState<boolean>(false);
  const [demoScript, setDemoScript] = useState<string>('');

  // STEP 10 State
  const [showFullProductModal, setShowFullProductModal] = useState<boolean>(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [screenshotError, setScreenshotError] = useState<boolean>(false);
  const [skillsLearnedJson, setSkillsLearnedJson] = useState<any | null>(null);
  const [aiContributionSummary, setAiContributionSummary] = useState<string>('');

  useEffect(() => {
    if (activeStep === 10 && session?.id) {
      const takeScreenshot = async () => {
        try {
          // Find the active walkthrough iframe elements in DOM
          const iframe = document.getElementById('walkthrough-preview-iframe') as HTMLIFrameElement || document.querySelector('iframe');
          let base64 = '';

          if (iframe && iframe.contentWindow?.document?.body) {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(iframe.contentWindow.document.body, {
              useCORS: true,
              allowTaint: true,
              scale: 0.85
            });
            base64 = canvas.toDataURL('image/png');
          }

          const token = localStorage.getItem('vibelab_token');
          const res = await fetch('/api/product/screenshot/save', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              session_id: session.id,
              screenshot_base64: base64 || 'DATA_MOCK_FALLBACK'
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.screenshot_url) {
              setScreenshotUrl(data.screenshot_url);
            }
          }
        } catch (err) {
          console.warn('html2canvas iframe capture bypassed. Utilizing aesthetic fallback:', err);
        }
      };

      const timeout = setTimeout(takeScreenshot, 1500);
      return () => clearTimeout(timeout);
    }
  }, [activeStep, session?.id]);

  // Virtual Code Sandbox States for Step 6
  const [guidePanelTab, setGuidePanelTab] = useState<'tasks' | 'explorer'>('tasks');
  const [selectedCommonTag, setSelectedCommonTag] = useState<any | null>(null);
  const [fileQuery, setFileQuery] = useState<string>('');
  const [isAddingFile, setIsAddingFile] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [workspaceIsMaximized, setWorkspaceIsMaximized] = useState<boolean>(false);

  const [virtualFiles, setVirtualFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [openTabs, setOpenTabs] = useState<string[]>(['index.html']);
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'src/pages': true,
    'src/components': true,
    'src/apis': false,
    'src/db': false,
    'public': false,
    'src/styles': false,
    'config': false
  });
  const [showFullScreenPreview, setShowFullScreenPreview] = useState<boolean>(false);
  const [workspaceLayout, setWorkspaceLayout] = useState<'split' | 'code' | 'preview'>('split');
  const [isGuideHidden, setIsGuideHidden] = useState<boolean>(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(230);
  const [guideWidth, setGuideWidth] = useState<number>(300);
  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage for editor column

  const dragStartRef = useRef<{
    type: 'sidebar' | 'guide' | 'splitter';
    startX: number;
    startWidthOrRatio: number;
  } | null>(null);

  const handleMouseDown = (type: 'sidebar' | 'guide' | 'splitter', e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startValue = type === 'sidebar' ? sidebarWidth : type === 'guide' ? guideWidth : splitRatio;
    dragStartRef.current = { type, startX, startWidthOrRatio: startValue };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const { type, startX, startWidthOrRatio } = dragStartRef.current;
      const deltaX = e.clientX - startX;
      if (type === 'sidebar') {
        const newWidth = Math.max(150, Math.min(400, startWidthOrRatio + deltaX));
        setSidebarWidth(newWidth);
      } else if (type === 'guide') {
        const newWidth = Math.max(200, Math.min(500, startWidthOrRatio + deltaX));
        setGuideWidth(newWidth);
      } else if (type === 'splitter') {
        const container = document.getElementById('workspace-panels-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          const activeSidebarWidth = (!isSidebarHidden && workspaceLayout !== 'preview') ? sidebarWidth : 0;
          const activeGuideWidth = (!isGuideHidden && workspaceLayout !== 'preview') ? guideWidth : 0;
          const remainingWidth = rect.width - activeSidebarWidth - activeGuideWidth - 16;
          if (remainingWidth > 0) {
            const editorLeft = rect.left + activeSidebarWidth + activeGuideWidth;
            const relativeX = e.clientX - editorLeft;
            const newRatio = Math.max(15, Math.min(85, (relativeX / remainingWidth) * 100));
            setSplitRatio(newRatio);
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [sidebarWidth, guideWidth, splitRatio, isSidebarHidden, isGuideHidden, workspaceLayout]);

  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'dashboard' | 'emulator' | 'screens' | 'features' | 'pitch'>('dashboard');

  // Step 6 hover and tutor states
  const [explanationMode, setExplanationMode] = useState<'simple' | 'technical'>('simple');
  const [componentMetadata, setComponentMetadata] = useState<any[]>([]);
  const [hoveredComponent, setHoveredComponent] = useState<any | null>(null);
  const [hoverRect, setHoverRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Tutor chat states
  const [isTutorExpanded, setIsTutorExpanded] = useState<boolean>(false);
  const [tutorQuestion, setTutorQuestion] = useState<string>('');
  const [tutorChatHistory, setTutorChatHistory] = useState<Array<{ sender: 'user' | 'tutor'; text: string }>>([]);
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'COMPONENT_HOVER') {
        const meta = componentMetadata.find(
          c => c.component_id === event.data.componentId
        );
        if (meta) {
          setHoveredComponent(meta);
          if (event.data.rect) {
            setHoverRect(event.data.rect);
          }
        }
      }
      if (event.data && event.data.type === 'COMPONENT_HOVER_END') {
        setHoveredComponent(null);
        setHoverRect(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [componentMetadata]);

  const COMMON_TAGS = [
    {
      tag: '<body>',
      selector: 'body',
      tagKey: '<body>',
      whatItDoes: 'This is the main container of the webpage. All visible content appears inside it.',
      whyItExists: 'To serve as the root of all user-visible structural boxes and layouts across the product.',
      whatItAffects: 'Governs global styling properties, background colors, defaults, scroll behavior, and overall body heights.',
      productConnection: 'Main canvas of your application. All user journey views and control bars are drawn inside here.'
    },
    {
      tag: '<div>',
      selector: 'div',
      tagKey: '<div',
      whatItDoes: 'This is a division or layout container used to structure, group and partition visual elements together.',
      whyItExists: 'Allows creating separate compartments (e.g. headers, sidebars, forms) for modular style groupings.',
      whatItAffects: 'No inherent meaning (non-semantic); used for flexbox layouts, grids, padding blocks, borders, and margins.',
      productConnection: 'Groups sections of your pitch page, e.g. your high-fidelity feature list card or your screenshot container.'
    },
    {
      tag: '<button>',
      selector: 'button',
      tagKey: '<button',
      whatItDoes: 'This creates an interactive element users can click or tap to trigger actions.',
      whyItExists: 'Provides an explicit control target ensuring accessibility and default keyboard-activated form submissions.',
      whatItAffects: 'Fires JavaScript `onClick` triggers, updates state, submits user input arrays, or opens visual overlays.',
      productConnection: 'Represents your primary call-to-action buttons like "Try the App", "Generate Feature Blueprint", or "Claim Certificate".'
    },
    {
      tag: '<input>',
      selector: 'input',
      tagKey: '<input',
      whatItDoes: 'This creates interactive data fields where users can type text, numbers, select options, or toggle checkboxes.',
      whyItExists: 'Enables real-time data input, customization, and interactivity inside web tools.',
      whatItAffects: 'Fires character change and input event emissions, binding typed details directly to sandbox state variables.',
      productConnection: 'Crucial for capturing your customer ideas, emails, draft descriptions, and options selections.'
    },
    {
      tag: '<p>',
      selector: 'p',
      tagKey: '<p',
      whatItDoes: 'Groups text into readable body paragraphs with cohesive blocks of copy.',
      whyItExists: 'Ensures structured formatting, proper text flow, and separation of paragraphs.',
      whatItAffects: 'Applies clean paragraph break-line heights and sizing constraints.',
      productConnection: 'Renders explanations, customer reviews, descriptions, and guide copy in a friendly readable manner.'
    },
    {
      tag: '<h1> - <h6>',
      selector: 'h1, h2, h3, h4',
      tagKey: '<h',
      whatItDoes: 'Represents section headings of varying size and hierarchical importance.',
      whyItExists: 'Tells search engines and screen readers how your content is structured and what is most important.',
      whatItAffects: 'Impacts title visibility, typeface weights, and margins.',
      productConnection: 'Provides impressive display headings for your product name, landing titles, and section sections.'
    },
    {
      tag: '<img>',
      selector: 'img',
      tagKey: '<img',
      whatItDoes: 'Embeds and displays pictures, illustration icons, product logos, or visual mockups.',
      whyItExists: 'To provide essential illustration context reinforcing text content and engaging visitors.',
      whatItAffects: 'Sizing frames, responsiveness, source path fetches, and pixel aspect ratios.',
      productConnection: 'Visualizes your digital product mockups, customer portrait avatars, and brand assets.'
    },
    {
      tag: '<span>',
      selector: 'span',
      tagKey: '<span',
      whatItDoes: 'Serves as an inline container used to style small specific pieces of text or inline icons.',
      whyItExists: 'Enables micro-styling (e.g. highlighting a single word) without changing structure or wrapping lines.',
      whatItAffects: 'Inline alignment and micro color, weight, or size updates of wrapped text elements.',
      productConnection: 'Renders micro-badges, indicators like [live], or specific bold text accents.'
    },
    {
      tag: '<header>',
      selector: 'header',
      tagKey: '<header',
      whatItDoes: 'Marks the top navigation bar or introductory branding container.',
      whyItExists: 'Provides an intuitive global entry point for navigating views, search bars, and logotype symbols.',
      whatItAffects: 'Creates sticky top or bordered bars that house corporate logos, navigation buttons, and actions.',
      productConnection: 'Presents your clean logo header and navigation menus at the top of your landing.'
    }
  ];

  const handleHighlightEditorAndPreview = (tagKey: string, selector: string) => {
    // Highlight preview
    const iframe = document.getElementById('walkthrough-preview-iframe') as HTMLIFrameElement | null;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        action: 'highlight',
        selector: selector
      }, '*');
    }

    // Highlight editor
    if (editorRef.current && monacoRef.current) {
      const editor = editorRef.current;
      const model = editor.getModel();
      if (model) {
        const matches = model.findMatches(tagKey, true, false, false, null, true);
        if (matches && matches.length > 0) {
          const match = matches[0];
          editor.setSelection(match.range);
          editor.revealRangeInCenter(match.range);
        }
      }
    }
  };

  const getInitialVirtualFiles = (pName: string, mvpCode: string) => {
    const projName = pName || projectName || 'Campaign Product';
    return {
      'index.html': mvpCode || `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; background: #0b0f19; color: #fff; padding: 40px; text-align: center; }
  </style>
</head>
<body>
  <h1>${projName}</h1>
  <p>Developer Sandbox Environment Active.</p>
</body>
</html>`,
      'src/pages/Landing.tsx': `import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

// Landing Page view for ${projName}
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/35 rounded-full text-blue-400 text-xs font-mono font-bold uppercase tracking-widest leading-none mb-3">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '4s' }} /> Welcome to ${projName}
        </div>
        <h1 className="text-5xl font-black tracking-tight leading-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Unleash Dynamic Creative Workflows
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed max-w-lg mx-auto">
          Scale your startup idea into reality with beautiful components, interactive workflows, and generative AI mechanics.
        </p>
        <div className="pt-4">
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all shadow-lg shadow-blue-600/20 inline-flex items-center gap-2 cursor-pointer">
            Explore My Space <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}`,
      'src/pages/Dashboard.tsx': `import React, { useState } from 'react';
import { BarChart3, Users, Settings, Plus, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'audience'>('analytics');

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">${projName}</h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase mt-1 tracking-wider">Campaign Portfolio Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sandbox Active
          </span>
        </div>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider font-mono">Conversion rate</span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-950 mt-2">12.48%</p>
          <span className="text-[10px] text-emerald-500 font-bold font-mono">+1.85% vs yesterday</span>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider font-mono">Simulated visits</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-950 mt-2">1,540</p>
          <span className="text-[10px] text-emerald-500 font-bold font-mono">+12.4% this week</span>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider font-mono">Completion Score</span>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-3xl font-black text-slate-950 mt-2">94 / 100</p>
          <span className="text-[10px] text-blue-500 font-bold font-mono">Passing requirements met</span>
        </div>
      </div>
    </div>
  );
}`,
      'src/components/Navigation.tsx': `import React from 'react';

export default function Navigation() {
  return (
    <nav className="flex justify-between items-center px-6 py-4.5 bg-white border-b border-slate-150 shadow-sm font-sans">
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-[#2563eb] tracking-widest text-sm font-mono uppercase">${projName.toUpperCase()}</span>
        <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-[9px] text-[#2563eb] font-bold">MVP</span>
      </div>
      <div className="flex items-center gap-5 text-xs font-bold text-slate-500">
        <a href="#overview" className="hover:text-[#2563eb] transition-colors font-sans">Overview</a>
        <a href="#features" className="hover:text-[#2563eb] transition-colors font-sans">Features</a>
        <a href="#code" className="hover:text-[#2563eb] transition-colors font-sans">Source Code</a>
      </div>
    </nav>
  );
}`,
      'src/components/InteractiveWidget.tsx': `import React, { useState } from 'react';
import { Play, RotateCw, HelpCircle, Activity } from 'lucide-react';

export default function InteractiveWidget() {
  const [telemetry, setTelemetry] = useState<string[]>([]);
  const [clickCount, setClickCount] = useState(0);

  const handleTrigger = (flowName: string) => {
    setClickCount(prev => prev + 1);
    setTelemetry(prev => [\`\${new Date().toLocaleTimeString()} - Triggered \${flowName} (\${clickCount + 1})\`, ...prev]);
  };

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-[#2563eb]" /> Sandbox Client Simulation
        </h4>
        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-mono">v1.0</span>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        Test interactive campaign states in this safe environment. Clicking triggers updates and live log events.
      </p>
      <div className="flex flex-wrap gap-2.5">
        <button 
          onClick={() => handleTrigger('Feature Execution')}
          className="px-4 py-2 bg-[#2563eb] hover:bg-[#3b82f6] text-white rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all"
        >
          Execute Feature State
        </button>
        <button 
          onClick={() => handleTrigger('Fallback Trigger')}
          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          Dispatch Fallback
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-mono uppercase text-[#2563eb]">
          <span>Telemetry Logs</span>
          <button 
            disabled={telemetry.length === 0}
            onClick={() => setTelemetry([])} 
            className="text-[9px] text-slate-400 hover:text-slate-500 uppercase flex items-center gap-1 font-bold border-none bg-transparent cursor-pointer"
          >
            <RotateCw className="w-2.5 h-2.5" /> Clear Logs
          </button>
        </div>
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl h-28 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1 scrollbar-thin">
          {telemetry.length === 0 ? (
            <p className="text-slate-500 italic">Listening for trigger actions...</p>
          ) : (
            telemetry.map((log, idx) => <p key={idx} className="animate-fade-in">&bull; {log}</p>)
          )}
        </div>
      </div>
    </div>
  );
}`,
      'public/logo-accent.svg': `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="45" fill="url(#gradient)" fill-opacity="0.15" stroke="url(#gradient)" stroke-width="4"/>
  <circle cx="50" cy="50" r="23" fill="url(#gradient)"/>
  <path d="M45 40 L58 50 L45 60 Z" fill="#ffffff" />
</svg>`,
      'public/banner.png': `[Asset: Large responsive binary mock template placeholder image. Refers to visual assets in Phase 2 builder screen.]`,
      'src/styles/theme.css': `@import "tailwindcss";

@theme {
  --color-brand-blue: #2563eb;
  --color-brand-light: #eff6ff;
  --font-bebas: "Bebas Neue", sans-serif;
}

body {
  margin: 0;
  font-family: "Inter", sans-serif;
  background-color: #f8fafc;
  color: #0f172a;
}`,
      'src/styles/style.css': `/* Custom style.css for additional user interface styling and overrides */

.custom-interactive-element {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.custom-interactive-element:hover {
  transform: translateY(-2px);
}`,
      'src/components/script.js': `// Custom JavaScript file containing interactive client behavior and animations

console.log("Interactive script successfully compiled in VibeLab Sandbox!");

document.addEventListener("DOMContentLoaded", () => {
  const triggerButton = document.getElementById("sandbox-trigger-btn");
  if (triggerButton) {
    triggerButton.addEventListener("click", () => {
      console.log("Trigger button clicked! Initiating custom visual feedback...");
    });
  }
});`,
      'tailwind.config.js': `module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        vibelab: {
          blue: "#2563eb",
          slate: "#0f172a"
        }
      }
    }
  },
  plugins: []
};`,
      'src/apis/geminiProxy.ts': `import { GoogleGenAI } from "@google/genai";

// Dynamic Prompt and Generation Endpoint using @google/genai
export default async function generateMvpResponse(promptText: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY must be supplied in .env configuration variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: promptText,
    config: {
      temperature: 0.7,
      maxOutputTokens: 1000
    }
  });

  return response.text;
}`,
      'src/apis/analytics.ts': `// Telementry and conversion trackers
export const analytics = {
  trackPageview: (pageName: string) => {
    console.log("[Analytical Log] Pageview -> " + pageName);
  },
  trackAction: (actionLabel: string, value?: number) => {
    console.log("[Analytical Log] Action Trigger -> " + actionLabel, value !== undefined ? { value } : {});
  }
};`,
      'src/db/schema.sql': `-- PostgreSQL DDL configuration template for persistent student session stores
CREATE TABLE IF NOT EXISTS student_projects (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(120) NOT NULL,
  founder_email VARCHAR(255) NOT NULL,
  mvp_description TEXT,
  rehearsed_seconds INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_features (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES student_projects(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  is_approved BOOLEAN DEFAULT TRUE
);`,
      'src/db/localStore.ts': `// Robust mock database storage proxying browser-side persistence securely
export const localStore = {
  get: <T>(key: string): T | null => {
    try {
      const data = localStorage.getItem(\`vibelab_store_\${key}\`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  save: (key: string, val: any): void => {
    localStorage.setItem(\`vibelab_store_\${key}\`, JSON.stringify(val));
  }
};`,
      'package.json': `{
  "name": "vibelab-generated-mvp",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3000",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.300.0",
    "motion": "^10.16.2"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.2.2"
  }
}`,
      'readme.md': `# Campaign Launch Portfolio — Source Code Build
This codebase is compiled dynamically with **VibeLab Product Builder Tools**.

## Prerequisites
- Node.js LTS version

## Getting Started
To boot this locally, execute command stack:
\`\`\`bash
npm install
npm run dev
\`\`\`

## Architecture & Integration
Handles routing via custom React layouts, templates, and server-side model grounding coordinates.`,
      'metadata.json': `{
  "name": "${projName} Blueprint",
  "description": "Student campaign portfolio generated with VibeLab Product Builder.",
  "majorCapabilities": ["MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"]
}`
    };
  };

  useEffect(() => {
    if (session?.id) {
      localStorage.setItem(`vibelab_workspace_${session.id}_active_file`, activeFile);
      localStorage.setItem(`vibelab_workspace_${session.id}_open_tabs`, JSON.stringify(openTabs));
      localStorage.setItem(`vibelab_workspace_${session.id}_preview_device`, previewDevice);
      localStorage.setItem(`vibelab_workspace_${session.id}_sidebar_hidden`, String(isSidebarHidden));
      localStorage.setItem(`vibelab_workspace_${session.id}_expanded_folders`, JSON.stringify(expandedFolders));
      localStorage.setItem(`vibelab_workspace_${session.id}_workspace_layout`, workspaceLayout);
      localStorage.setItem(`vibelab_workspace_${session.id}_guide_hidden`, String(isGuideHidden));
      if (Object.keys(virtualFiles).length > 0) {
        localStorage.setItem(`vibelab_workspace_${session.id}_code_changes`, JSON.stringify(virtualFiles));
      }
    }
  }, [activeFile, openTabs, previewDevice, isSidebarHidden, expandedFolders, virtualFiles, session?.id, workspaceLayout, isGuideHidden]);

  const cyclingMessages = [
    'Turning your idea into reality...',
    projectName ? `Building ${projectName}...` : 'Building your project...',
    'Wiring up your features...',
    'Almost ready...'
  ];

  useEffect(() => {
    let interval: any;
    if (activeStep === 5) {
      setLoadingMsgIdx((prev) => (prev + 1) % cyclingMessages.length);
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % cyclingMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [activeStep, projectName]);

  useEffect(() => {
    let interval: any;
    if (activeStep === 5) {
      setBuildProgress(5);
      const start = Date.now();
      const duration = 24000; // estimated duration

      interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const ratio = Math.min(elapsed / duration, 1);
        const nextProgress = Math.floor(5 + (93 * (1 - Math.pow(1 - ratio, 2))));
        setBuildProgress(Math.min(nextProgress, 98));
      }, 250);
    }
    return () => clearInterval(interval);
  }, [activeStep]);

  // Keep the address bar URL path matching the active step
  useEffect(() => {
    const stepPaths: Record<number, string> = {
      1: '/phase/2',
      2: '/phase/2/features',
      3: '/phase/2/journey',
      4: '/phase/2/screens',
      5: '/phase/2/building',
      6: '/phase/2/review',
      7: '/phase/2/description',
      8: '/phase/2/explain',
      9: '/phase/2/demo',
      10: '/phase/2/complete',
    };
    const targetPath = stepPaths[activeStep];
    if (targetPath && window.location.pathname !== targetPath) {
      window.history.replaceState(null, '', targetPath);
    }
  }, [activeStep]);

  // Load context on mount
  useEffect(() => {
    fetchSessionAndProgress();
  }, []);

  // Listen for sandbox state updates and write them to localStorage
  useEffect(() => {
    if (!session?.id) return;
    
    const handleSandboxMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SANDBOX_STATE_UPDATE') {
        localStorage.setItem(
          `vibelab_sandbox_${session.id}`,
          JSON.stringify(event.data.state)
        );
      }
    };

    window.addEventListener('message', handleSandboxMessage);
    return () => {
      window.removeEventListener('message', handleSandboxMessage);
    };
  }, [session?.id]);

  const restoreSandboxState = (iframeId: string) => {
    if (!session?.id) return;
    const saved = localStorage.getItem(`vibelab_sandbox_${session.id}`);
    if (saved) {
      try {
        const savedState = JSON.parse(saved);
        const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            { type: 'RESTORE_SANDBOX_STATE', state: savedState },
            '*'
          );
        }
      } catch (e) {
        console.warn('Failed to parse and restore sandbox state', e);
      }
    }
  };

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
          const mappedStep = initialStep || STEP_MAP_ORDER[data.session.current_step] || 1;
          setActiveStep(mappedStep);

          let pName = '';
          let pStatement = '';
          let tUsers = '';
          let mScope = '';

          if (data.blueprint) {
            pName = data.blueprint.project_name || '';
            pStatement = data.blueprint.problem_statement || '';
            tUsers = data.blueprint.target_users || '';
            mScope = data.blueprint.mvp_scope || '';
          }

          // Fallback to the ideation endpoint data if fields are empty
          if (!pName || !pStatement || !tUsers || !mScope) {
            try {
              const idRes = await fetch('/api/ideation/blueprint', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              if (idRes.ok) {
                const ideationData = await idRes.json();
                if (ideationData) {
                  pName = pName || ideationData.product_name || ideationData.project_name || '';
                  pStatement = pStatement || ideationData.problem_statement || '';
                  tUsers = tUsers || ideationData.target_user_persona || ideationData.target_users || '';
                  mScope = mScope || ideationData.mvp_definition || ideationData.mvp_scope || '';
                }
              }
            } catch (fallbackErr) {
              console.warn('Failed to load fallback blueprint state:', fallbackErr);
            }
          }

          setProjectName(pName);
          setProblemStatement(pStatement);
          setTargetUsers(tUsers);
          setMvpScope(mScope);

          if (data.features) {
            setFeatures(data.features);
          }

          if (data.user_journey) {
            setUserJourney(data.user_journey);
          }

          if (data.screens) {
            setScreens(data.screens);
          }

          if (data.component_metadata) {
            setComponentMetadata(data.component_metadata);
          }

          if (data.mvp) {
            setMvp(data.mvp);
            setProductDescription(data.mvp.product_description || '');
            setDemoScript(data.mvp.demo_script || '');
            if (data.mvp.screenshot_url) {
              setScreenshotUrl(data.mvp.screenshot_url);
            }
            if (data.mvp.skills_learned) {
              try {
                setSkillsLearnedJson(typeof data.mvp.skills_learned === 'string' ? JSON.parse(data.mvp.skills_learned) : data.mvp.skills_learned);
              } catch (skillsParseError) {
                console.warn('Could not parse database skills_learned field:', skillsParseError);
              }
            }
            if (data.mvp.ai_contribution_summary) {
              setAiContributionSummary(data.mvp.ai_contribution_summary);
            }
            
            const initialRationales: Record<number, string> = {};
            const initialFeedback: Record<number, string> = {};
            data.features.forEach((f: any) => {
              initialRationales[f.id] = f.student_rationale || '';
              initialFeedback[f.id] = f.ai_feedback || '';
            });
            setFeatureRationales(initialRationales);
            setFeatureFeedback(initialFeedback);

            // Restore virtual sandbox workspace and code edits
            const finalMvpCode = data.mvp.mvp_html || '';
            const pName = data.blueprint?.project_name || '';
            const initialFiles = getInitialVirtualFiles(pName, finalMvpCode);

            const storedCodeChanges = localStorage.getItem(`vibelab_workspace_${data.session.id}_code_changes`);
            const storedActiveFile = localStorage.getItem(`vibelab_workspace_${data.session.id}_active_file`);
            const storedOpenTabs = localStorage.getItem(`vibelab_workspace_${data.session.id}_open_tabs`);
            const storedPreviewDevice = localStorage.getItem(`vibelab_workspace_${data.session.id}_preview_device`);
            const storedSidebarHidden = localStorage.getItem(`vibelab_workspace_${data.session.id}_sidebar_hidden`);
            const storedExpandedFolders = localStorage.getItem(`vibelab_workspace_${data.session.id}_expanded_folders`);
            const storedLayout = localStorage.getItem(`vibelab_workspace_${data.session.id}_workspace_layout`);
            const storedGuideHidden = localStorage.getItem(`vibelab_workspace_${data.session.id}_guide_hidden`);

            if (storedCodeChanges) {
              try {
                const parsed = JSON.parse(storedCodeChanges);
                setVirtualFiles({ ...initialFiles, ...parsed });
              } catch (e) {
                setVirtualFiles(initialFiles);
              }
            } else {
              setVirtualFiles(initialFiles);
            }

            if (storedActiveFile) {
              setActiveFile(storedActiveFile);
            }
            if (storedOpenTabs) {
              try {
                setOpenTabs(JSON.parse(storedOpenTabs));
              } catch (e) {
                setOpenTabs(['index.html']);
              }
            }
            if (storedPreviewDevice) {
              setPreviewDevice(storedPreviewDevice as any || 'desktop');
            }
            if (storedSidebarHidden) {
              setIsSidebarHidden(storedSidebarHidden === 'true');
            }
            if (storedExpandedFolders) {
              try {
                setExpandedFolders(JSON.parse(storedExpandedFolders));
              } catch (e) {}
            }
            if (storedLayout) {
              setWorkspaceLayout(storedLayout as any || 'split');
            }
            if (storedGuideHidden) {
              setIsGuideHidden(storedGuideHidden === 'true');
            }
          } else {
            // Setup fallback default empty workspace if MVP is not loaded
            const pName = data.blueprint?.project_name || '';
            setVirtualFiles(getInitialVirtualFiles(pName, ''));
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

  // 0. Save-in-progress Draft helpers
  const handleSaveBlueprintDraft = async (showToast = true) => {
    if (!session?.id) return;
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/blueprint/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session.id,
          project_name: projectName,
          problem_statement: problemStatement,
          target_users: targetUsers,
          mvp_scope: mvpScope
        })
      });
      if (res.ok && showToast) {
        toast.success('Blueprint draft saved!', { icon: '💾' });
      }
    } catch (error) {
      console.error('Failed to save blueprint draft:', error);
    }
  };

  const handleSaveScreensDraft = async (showToast = true) => {
    if (!session?.id) return;
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/screens/save-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session.id,
          change_requests: changeRequests
        })
      });
      if (res.ok && showToast) {
        toast.success('Screen remarks saved!', { icon: '💾' });
      }
    } catch (error) {
      console.error('Failed to save screen requests:', error);
    }
  };

  const handleSaveDescriptionDraft = async (showToast = true) => {
    if (!session?.id) return;
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/description/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session.id,
          product_description: productDescription
        })
      });
      if (res.ok && showToast) {
        toast.success('Launch description saved!', { icon: '💾' });
      }
    } catch (error) {
      console.error('Failed to save description:', error);
    }
  };

  const handleSaveDemoDraft = async (showToast = true) => {
    if (!session?.id) return;
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/demo/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session.id,
          demo_script: demoScript,
          key_talking_points: mvp?.key_talking_points || []
        })
      });
      if (res.ok && showToast) {
        toast.success('Demo script draft saved!', { icon: '💾' });
      }
    } catch (error) {
      console.error('Failed to save demo draft:', error);
    }
  };

  const handleSaveGlobalDraft = async (showToast = true) => {
    setIsSubmitting(true);
    try {
      if (activeStep === 1) {
        await handleSaveBlueprintDraft(false);
      } else if (activeStep === 2) {
        await syncFeaturesWithServer(features);
      } else if (activeStep === 4) {
        await handleSaveScreensDraft(false);
      } else if (activeStep === 7) {
        await handleSaveDescriptionDraft(false);
      } else if (activeStep === 8) {
        for (const feat of features.filter(f => f.category === 'must_have' && (f.is_included === 1 || f.is_included === true))) {
          const rationale = featureRationales[feat.id] || '';
          if (rationale.trim()) {
            await handleExplainFeatureStep8(feat.id, rationale);
          }
        }
      } else if (activeStep === 9) {
        await handleSaveDemoDraft(false);
      }

      if (showToast) {
        toast.success('Progress Saved! Feel free to exit or continue later.', {
          icon: '💾',
          style: {
            borderRadius: '12px',
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid rgba(37, 99, 235, 0.4)'
          }
        });
      }
    } catch (err) {
      console.error('Error saving global draft:', err);
      toast.error('Could not save draft progress.');
    } finally {
      setIsSubmitting(false);
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
      toast.success('Your blueprint is saved! Vibelab generated feature recommendations.');
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
      toast.success('Features locked! Vibelab formulated a user journey flow.');
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
    setBuildError(null);
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
      const errMsg = error.message || 'MVP full build execution failed.';
      toast.error(errMsg);
      setBuildError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-trigger build or retry compilation when activeStep is 5
  useEffect(() => {
    if (activeStep === 5 && !isSubmitting && !buildError) {
      handleApproveScreensAndBuild();
    }
  }, [activeStep, isSubmitting, buildError]);

  const handleAskTutor = async (questionText: string) => {
    if (!hoveredComponent || !session?.id || isTutorLoading) return;
    setIsTutorLoading(true);
    setTutorQuestion('');
    
    // Add User Message to Chat History
    setTutorChatHistory(prev => [...prev, { sender: 'user', text: questionText }]);
    
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/tutor/ask', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session.id,
          component_id: hoveredComponent.component_id,
          question: questionText
        })
      });
      
      if (res.ok) {
        const resultData = await res.json();
        setTutorChatHistory(prev => [...prev, { sender: 'tutor', text: resultData.answer }]);
      } else {
        setTutorChatHistory(prev => [...prev, { sender: 'tutor', text: "Hmm, I'm having trouble connecting right now. Please test again!" }]);
      }
    } catch (err) {
      console.error(err);
      setTutorChatHistory(prev => [...prev, { sender: 'tutor', text: "I couldn't contact my tutor brain. Please check your network connection!" }]);
    } finally {
      setIsTutorLoading(false);
    }
  };

  const handleComponentClickStep8 = (comp: any) => {
    setSelectedComponent8(comp);

    const html = virtualFiles['index.html'] || mvp?.mvp_html || '';
    if (!html) return;

    const lines = html.split('\n');
    const compAttr = `data-component-id="${comp.component_id}"`;
    const lineIndex = lines.findIndex(l => l.includes(compAttr));

    if (lineIndex !== -1 && editorRef.current && monacoRef.current) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const startLine = lineIndex + 1;
      const endLine = Math.min(startLine + 8, lines.length);
      editor.revealLineInCenter(startLine);

      const newDecorations = [
        {
          range: new monaco.Range(startLine, 1, endLine, 1),
          options: {
            isWholeLine: true,
            className: 'monaco-highlight-gold',
            marginClassName: 'monaco-margin-gold'
          }
        }
      ];
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current || [], newDecorations);
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
  }, [activeStep, mvp?.mvp_html]);

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
      
      // Save description and complete step in parallel to eliminate sequential API request latency
      const [res, completeRes] = await Promise.all([
        fetch('/api/product/description/save', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: session?.id,
            product_description: productDescription
          })
        }),
        fetch('/api/product/step/complete', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: session?.id,
            step: 'description'
          })
        })
      ]);

      if (!res.ok) throw new Error('Failed to save description in database.');
      if (!completeRes.ok) throw new Error('Failed to register description step as complete.');

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
      
      // Save demo script and complete step in parallel to optimize latency and rendering cycles
      const [res, completeRes] = await Promise.all([
        fetch('/api/product/demo/save', {
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
        }),
        fetch('/api/product/step/complete', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: session?.id,
            step: 'demo'
          })
        })
      ]);

      if (!res.ok) throw new Error('Failed to save demo presentation details.');
      if (!completeRes.ok) throw new Error('Failed to register demo step as complete.');

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
        <Loader2 className="w-8 h-8 text-[#2563eb] animate-spin mb-3" />
        <p className="text-[#2563eb] font-mono text-xs tracking-wider">SYNCING PRODUCT STEPPER CONTEXT...</p>
      </div>
    );
  }

  const activeItem = STEP_LABELS[activeStep - 1] || STEP_LABELS[0];

  const farthestStep = (session?.status === 'completed' || session?.current_step === 'approved' || session?.current_step === 'complete') 
    ? 10 
    : (session ? (STEP_MAP_ORDER[session.current_step] || 1) : 1);
  const isFieldDisabled = activeStep < farthestStep && !isEditingApprovedStep;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#f8fafc] flex flex-col font-sans overflow-hidden text-slate-800 animate-fade-in">
      <EducationalAiBackground isDark={false} />
      
      {/* Header Bar */}
      <header className="px-6 py-4 bg-white/75 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onClose ? onClose() : (window.location.href = '/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer font-bold text-xs uppercase tracking-widest bg-transparent border-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit</span>
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#2563eb]">Phase 2 &bull; Product Builder</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase">{projectName || 'Your Custom MVP'}</p>
          </div>
        </div>
        
        <div>
           <span className="px-3 py-1 bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb] text-[10px] uppercase font-bold tracking-widest rounded-full">
             Step {activeStep} of 10 &bull; {Math.round((activeStep / 10) * 100)}% Complete
           </span>
        </div>
      </header>

      {/* Progression Timeline Tracker */}
      <div className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 px-4 md:px-12 py-2 flex items-center shrink-0 overflow-x-auto scrollbar-none z-20">
        <div className="flex items-center gap-2 w-full justify-between">
          {STEP_LABELS.map((stepItem) => {
            const farthestStep = (session?.status === 'completed' || session?.current_step === 'approved' || session?.current_step === 'complete') 
              ? 10 
              : (session ? (STEP_MAP_ORDER[session.current_step] || 1) : 1);
            const isStepCompleted = stepItem.step < farthestStep;
            const isStepActive = stepItem.step === activeStep;
            const isStepLocked = stepItem.step > farthestStep;
            return (
              <button
                key={stepItem.step}
                disabled={isStepLocked}
                onClick={() => setActiveStep(stepItem.step)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-[11px] font-bold ${
                  isStepActive
                    ? 'bg-[#2563eb] text-white border-[#2563eb] hover:bg-[#1d4ed8] hover:border-[#1d4ed8] shadow-md cursor-pointer'
                    : isStepLocked
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : isStepCompleted
                        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200/60 hover:bg-emerald-500/20 hover:border-emerald-300 cursor-pointer'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 cursor-pointer'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono border ${
                  isStepActive
                    ? 'bg-white border-white text-[#2563eb]'
                    : isStepLocked
                      ? 'bg-slate-50 border-slate-200 text-slate-400'
                      : isStepCompleted
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  {isStepCompleted ? <Check className="w-2.5 h-2.5" /> : stepItem.step}
                </span>
                <span className="hidden lg:inline text-[10px] whitespace-nowrap">{stepItem.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable container for the single active step content */}
      <div className={`flex-1 ${activeStep === 6 ? 'p-0 overflow-hidden min-h-0' : 'overflow-y-auto px-4 py-6 md:px-12 md:py-8'} relative z-10 flex flex-col justify-start`}>
        <div className={`w-full bg-white/70 backdrop-blur-md ${activeStep === 6 ? 'rounded-none border-none p-0 flex-1 flex flex-col h-full overflow-hidden' : 'rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-xl shadow-slate-900/5 h-auto overflow-visible max-w-6xl mx-auto'}`}>
          {activeStep !== 6 && (
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#2563eb]/10 border border-[#2563eb]/20 flex items-center justify-center text-[10px] font-mono text-[#2563eb]">
                  {activeStep}
                </span>
                {activeItem.label}
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">{activeItem.desc}</p>
            </div>
          )}

          {activeStep !== 6 && activeStep < farthestStep && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold font-sans">This Section is Approved</h5>
                  <p className="text-[10px] text-emerald-600 leading-normal font-medium">
                    You have already completed this step. You can review the details or make changes if needed.
                  </p>
                </div>
              </div>
              
              {!isEditingApprovedStep ? (
                <button
                  type="button"
                  onClick={() => setIsEditingApprovedStep(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none shadow-sm"
                >
                  Edit Section
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSaveGlobalDraft(true);
                      setIsEditingApprovedStep(false);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none shadow-sm"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingApprovedStep(false);
                      fetchSessionAndProgress();
                    }}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-slate-200 cursor-pointer shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {STEP_LABELS.map((item) => {
            const isCompleted = item.step < activeStep;
            const isActive = item.step === activeStep;
            const isLocked = item.step > activeStep;

            if (!isActive) return null;

            return (
              <div 
                key={item.step}
                id={`step-block-${item.step}`}
                className="flex-1 flex flex-col"
              >
                {/* Collapsible Expanded Component Content Section */}
                <div className={activeStep === 6 ? "flex-1 flex flex-col h-full overflow-hidden" : "space-y-6"}>

                      {/**********************************************************
                       * STEP 1: Blueprint Approver View
                       ***********************************************************/}
                      {item.step === 1 && (
                        isSubmitting ? (
                          <AILoader type="blueprint" />
                        ) : (
                          <div className="space-y-6">
                            <p className="text-xs font-semibold text-slate-500 font-sans tracking-wide">
                              Based on your Phase 1 ideation — review and confirm.
                            </p>

                            <div className="grid grid-cols-1 gap-5">
                              {/* Project Name Field */}
                              <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase tracking-wider font-mono text-[#2563eb] font-semibold">Project Name</label>
                                <input 
                                  type="text"
                                  value={projectName}
                                  onChange={(e) => setProjectName(e.target.value)}
                                  placeholder="Enter project name..."
                                  disabled={isFieldDisabled}
                                  className="w-full bg-white border border-slate-200 focus:border-[#2563eb] text-sm text-slate-800 px-4 py-3 rounded-xl outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                                />
                              </div>

                              {/* Problem Statement Field */}
                              <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase tracking-wider font-mono text-[#2563eb] font-semibold">Problem Statement</label>
                                <textarea 
                                  value={problemStatement}
                                  onChange={(e) => setProblemStatement(e.target.value)}
                                  rows={2}
                                  placeholder="Describe the pain point..."
                                  disabled={isFieldDisabled}
                                  className="w-full bg-white border border-slate-200 focus:border-[#2563eb] text-sm text-slate-800 px-4 py-3 rounded-xl outline-none resize-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                                />
                              </div>

                              {/* Target Users Field */}
                              <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase tracking-wider font-mono text-[#2563eb] font-semibold">Target Users</label>
                                <textarea 
                                  value={targetUsers}
                                  onChange={(e) => setTargetUsers(e.target.value)}
                                  rows={2}
                                  placeholder="Who are your primary target users?"
                                  disabled={isFieldDisabled}
                                  className="w-full bg-white border border-slate-200 focus:border-[#2563eb] text-sm text-slate-800 px-4 py-3 rounded-xl outline-none resize-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                                />
                              </div>

                              {/* MVP Scope Field */}
                              <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase tracking-wider font-mono text-[#2563eb] font-semibold">MVP Scope</label>
                                <textarea 
                                  value={mvpScope}
                                  onChange={(e) => setMvpScope(e.target.value)}
                                  rows={3}
                                  placeholder="What core features are inside the MVP?"
                                  disabled={isFieldDisabled}
                                  className="w-full bg-white border border-slate-200 focus:border-[#2563eb] text-sm text-slate-800 px-4 py-3 rounded-xl outline-none resize-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
                                />
                              </div>
                            </div>

                            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                              <Info className="w-4 h-4 text-[#2563eb] shrink-0" />
                              <span>Verify your project blueprint. Once satisfied, click <strong>Confirm Blueprint</strong> in the footer below to lock in ideas and generate feature scopes!</span>
                            </div>
                          </div>
                        )
                      )}

                      {/**********************************************************
                       * STEP 2: Feature Discovery View
                       ***********************************************************/}
                      {item.step === 2 && (
                        isSubmitting ? (
                          <AILoader type="features" />
                        ) : (
                          <div className="space-y-8">
                            <p className="text-xs text-slate-500">
                              Below are your product features generated which you can prioritize. Organize them across columns, include/exclude them, or add custom ones!
                            </p>

                          {/* 3 Columns Layout */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* COLUMN 1: MUST HAVE */}
                            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-4">
                              <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-800 font-mono flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span> Must Have
                              </h4>
                              <div className="space-y-3">
                                {features.filter(f => f.category === 'must_have').map(feat => (
                                  <div 
                                    key={feat.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                      Boolean(feat.is_included) 
                                        ? 'bg-slate-50/85 border-[#2563eb]/30 shadow-md' 
                                        : 'bg-white/65 border-slate-200 opacity-50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h5 className="text-xs font-bold text-slate-800 shrink">{feat.feature_name}</h5>
                                      <input 
                                        type="checkbox"
                                        checked={Boolean(feat.is_included)}
                                        onChange={(e) => handleToggleIncludeFeature(feat.id, e.target.checked)}
                                        disabled={isFieldDisabled}
                                        className="rounded border-slate-300 bg-white text-[#2563eb] focus:ring-0 cursor-pointer disabled:opacity-50"
                                      />
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-normal mb-3">{feat.feature_description}</p>
                                    
                                    {/* Action Select to move column */}
                                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/50">
                                      <span className="text-[9.5px] font-mono text-slate-500 uppercase leading-none">Move:</span>
                                      <select 
                                        value={feat.category}
                                        onChange={(e) => handleChangeFeatureCategory(feat.id, e.target.value as any)}
                                        disabled={isFieldDisabled}
                                        className="text-[9.5px] bg-white border border-slate-200 rounded font-bold px-1.5 py-0.5 text-[#2563eb] outline-none disabled:opacity-50"
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
                            <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 space-y-4">
                              <h4 className="text-[11px] font-black uppercase tracking-wider text-cyan-800 font-mono flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span> Nice To Have
                              </h4>
                              <div className="space-y-3">
                                {features.filter(f => f.category === 'nice_to_have').map(feat => (
                                  <div 
                                    key={feat.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                      Boolean(feat.is_included) 
                                        ? 'bg-slate-50/85 border-[#2563eb]/30 shadow-md' 
                                        : 'bg-white/65 border-slate-200 opacity-50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h5 className="text-xs font-bold text-slate-800 shrink">{feat.feature_name}</h5>
                                      <input 
                                        type="checkbox"
                                        checked={Boolean(feat.is_included)}
                                        onChange={(e) => handleToggleIncludeFeature(feat.id, e.target.checked)}
                                        disabled={isFieldDisabled}
                                        className="rounded border-slate-300 bg-white text-[#2563eb] focus:ring-0 cursor-pointer disabled:opacity-50"
                                      />
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-normal mb-3">{feat.feature_description}</p>
                                    
                                    {/* Action Select to move column */}
                                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/50">
                                      <span className="text-[9.5px] font-mono text-slate-500 uppercase leading-none">Move:</span>
                                      <select 
                                        value={feat.category}
                                        onChange={(e) => handleChangeFeatureCategory(feat.id, e.target.value as any)}
                                        disabled={isFieldDisabled}
                                        className="text-[9.5px] bg-white border border-slate-200 rounded font-bold px-1.5 py-0.5 text-[#2563eb] outline-none disabled:opacity-50"
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
                            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-4">
                              <h4 className="text-[11px] font-black uppercase tracking-wider text-purple-800 font-mono flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span> Future Expansion
                              </h4>
                              <div className="space-y-3">
                                {features.filter(f => f.category === 'future').map(feat => (
                                  <div 
                                    key={feat.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                      Boolean(feat.is_included) 
                                        ? 'bg-slate-50/85 border-[#2563eb]/30 shadow-md' 
                                        : 'bg-white/65 border-slate-200 opacity-50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h5 className="text-xs font-bold text-slate-800 shrink">{feat.feature_name}</h5>
                                      <input 
                                        type="checkbox"
                                        checked={Boolean(feat.is_included)}
                                        onChange={(e) => handleToggleIncludeFeature(feat.id, e.target.checked)}
                                        disabled={isFieldDisabled}
                                        className="rounded border-slate-300 bg-white text-[#2563eb] focus:ring-0 cursor-pointer disabled:opacity-50"
                                      />
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-normal mb-3">{feat.feature_description}</p>
                                    
                                    {/* Action Select to move column */}
                                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/50">
                                      <span className="text-[9.5px] font-mono text-slate-500 uppercase leading-none">Move:</span>
                                      <select 
                                        value={feat.category}
                                        onChange={(e) => handleChangeFeatureCategory(feat.id, e.target.value as any)}
                                        disabled={isFieldDisabled}
                                        className="text-[9.5px] bg-white border border-slate-200 rounded font-bold px-1.5 py-0.5 text-[#2563eb] outline-none disabled:opacity-50"
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
                          {!isFieldDisabled && (
                            <form onSubmit={handleAddCustomFeature} className="p-5 border border-slate-200 bg-white/50 rounded-2xl space-y-4">
                              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <Plus className="w-4 h-4 text-[#2563eb]" />
                                Add Custom Feature
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input 
                                  type="text"
                                  placeholder="Feature Name (e.g., Live Sync)"
                                  value={customFeatureName}
                                  onChange={(e) => setCustomFeatureName(e.target.value)}
                                  className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs text-slate-800 placeholder:text-slate-500 focus:border-[#2563eb] outline-none"
                                />

                                <select 
                                  value={customFeatureCategory}
                                  onChange={(e) => setCustomFeatureCategory(e.target.value as any)}
                                  className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs text-[#2563eb] focus:border-[#2563eb] outline-none"
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
                                className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs text-slate-800 placeholder:text-slate-500 focus:border-[#2563eb] outline-none"
                              />

                              <button 
                                type="submit"
                                disabled={isAddingFeature}
                                className="w-full py-2 px-4 rounded-xl border border-[#2563eb]/30 hover:border-[#2563eb] text-[#2563eb] text-xs font-bold transition-all flex items-center justify-center gap-1.5 uppercase disabled:opacity-50"
                              >
                                {isAddingFeature ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                Add Feature
                              </button>
                            </form>
                          )}

                          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                            <Info className="w-4 h-4 text-[#2563eb] shrink-0" />
                            <span>Confirm your prioritized feature scope, then click <strong>Confirm Features</strong> in the footer below to map out the User Journey!</span>
                          </div>
                        </div>
                        )
                      )}

                      {/**********************************************************
                       * STEP 3: User Journey View
                       ***********************************************************/}
                      {item.step === 3 && (
                        isSubmitting ? (
                          <AILoader type="journey" />
                        ) : (
                          <div className="space-y-6">
                            <p className="text-xs text-slate-500">
                              This is how someone will use <strong className="text-slate-800">{projectName || 'your app'}</strong> from start to finish.
                            </p>

                          {/* Horizontal Sequence Flow */}
                          {userJourney && userJourney.steps ? (
                            <div className="flex flex-col md:flex-row gap-6 md:items-stretch overflow-x-auto py-4 px-1 scrollbar-thin">
                              {userJourney.steps.map((uStep, index) => (
                                <React.Fragment key={uStep.step_number}>
                                  <div className="flex-1 min-w-[200px] p-5 rounded-2xl bg-slate-50/45 border border-slate-200 flex flex-col justify-between hover:border-cyan-500/30 transition-all">
                                    <div>
                                      <div className="w-6 h-6 rounded-full bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/25 text-[10px] font-black font-mono flex items-center justify-center mb-4 leading-none">
                                        {uStep.step_number}
                                      </div>
                                      <h5 className="text-xs font-bold text-slate-800 mb-2">{uStep.title}</h5>
                                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{uStep.description}</p>
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
                              <div className="flex-1 min-w-[140px] p-5 rounded-2xl bg-[#2563eb]/5 border border-[#2563eb]/15 flex flex-col items-center justify-center text-center max-w-[200px]">
                                <Sparkles className="w-8 h-8 text-[#2563eb] mb-2 animate-bounce" />
                                <span className="text-xs font-bold text-emerald-700">End Goal Met!</span>
                                <p className="text-[10px] text-slate-500 mt-1 leading-normal">Solve client pain-point</p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 bg-white/50 rounded-xl text-center text-xs text-slate-500 italic">
                              No active journey loaded.
                            </div>
                          )}

                          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                            <Info className="w-4 h-4 text-[#2563eb] shrink-0" />
                            <span>Read through the user journey steps. When everything looks accurate, click <strong>Approve Journey</strong> in the footer below to generate the product wireframes & screens!</span>
                          </div>
                        </div>
                        )
                      )}

                      {/**********************************************************
                       * STEP 4: Product Screens Mock preview
                       ***********************************************************/}
                      {item.step === 4 && (
                        <div className="space-y-6">
                          <p className="text-xs text-slate-500">
                            Here are your pre-arranged user interfaces. Click on any template layout to review the simulated design preview in full size.
                          </p>

                          {/* Scrollable Row of Screen Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {screens.map(scr => (
                              <div 
                                key={scr.id}
                                onClick={() => setSelectedScreen(scr)}
                                className="group rounded-2xl border border-slate-200 bg-white/70 overflow-hidden flex flex-col hover:border-[#2563eb]/50 hover:shadow-md transition-all cursor-pointer"
                              >
                                {/* Header */}
                                <div className="p-4 border-b border-slate-200/60 flex items-center justify-between bg-slate-50/50">
                                  <h4 className="text-xs font-bold text-slate-800 truncate">{scr.screen_name}</h4>
                                  <span className="p-1.5 bg-slate-150 group-hover:bg-blue-50 rounded-lg text-slate-500 group-hover:text-[#2563eb] transition-colors">
                                    <Eye className="w-3.5 h-3.5 animate-pulse" />
                                  </span>
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
                                  <p className="text-[11px] text-slate-600 leading-relaxed font-sans line-clamp-2">{scr.screen_purpose}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Request Changes Form */}
                          <div className="flex flex-col gap-2 pt-4">
                            <label className="text-xs font-semibold tracking-wider font-mono text-[#2563eb] uppercase flex items-center gap-1.5">
                              Request changes (optional)
                            </label>
                            <textarea 
                              placeholder="e.g. Try a dark blue layout theme, or change screen titles to be clearer..."
                              value={changeRequests}
                              onChange={(e) => setChangeRequests(e.target.value)}
                              disabled={isFieldDisabled}
                              rows={2.5}
                              className="w-full bg-white border border-slate-200 hover:border-slate-200 focus:border-[#2563eb] text-xs text-slate-800 px-4 py-3 rounded-xl outline-none disabled:bg-slate-50 disabled:text-slate-500"
                            />
                            <p className="text-[10px] text-slate-500">Provide adjustments instructions to re-generate modified visual drafts above.</p>
                          </div>

                          {/* Build Activation Button */}
                          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                            <Info className="w-4.5 h-4.5 text-[#2563eb] shrink-0" />
                            <span>When screens are verified, click <strong>Approve & Click-to-Build</strong> in the footer below to compile and preview your full interactive MVP!</span>
                          </div>
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 5: Loading Build View
                       ***********************************************************/}
                      {item.step === 5 && (
                        <div className="py-12 flex flex-col justify-center items-center text-center space-y-6">
                          {buildError ? (
                            <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl w-full max-w-md text-center space-y-4 shadow-sm animate-in fade-in duration-300">
                              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
                                <AlertTriangle className="w-6 h-6" />
                              </div>
                              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                Build Compilation Failed
                              </h3>
                              <p className="text-xs text-rose-700 leading-relaxed font-semibold">
                                {buildError}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                The VibeLab compiler cores encountered an unexpected timeout or network error. You can retry the compile process or go back to adjust your screens.
                              </p>
                              <div className="flex items-center justify-center gap-3 pt-2">
                                <button
                                  onClick={() => setActiveStep(4)}
                                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-sm"
                                >
                                  Go Back to Screens
                                </button>
                                <button
                                  onClick={() => {
                                    setBuildError(null);
                                    handleApproveScreensAndBuild();
                                  }}
                                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-md"
                                >
                                  Retry Compile
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="relative">
                                {/* Golden Spinner Circle */}
                                <div className="w-16 h-16 border-4 border-[#2563eb]/10 border-t-[#2563eb] rounded-full animate-spin"></div>
                                <Sparkles className="w-6 h-6 text-[#2563eb] absolute top-5 left-5 animate-pulse" />
                              </div>

                              <div className="w-full max-w-md">
                                <h2 className="font-bebas text-5xl tracking-widest text-[#2563eb] inline-block animate-pulse mb-3 leading-none">
                                  BUILDING YOUR PRODUCT
                                </h2>
                                <p className="text-xs text-slate-500 font-mono tracking-wider max-w-sm mx-auto uppercase mt-2">
                                  {cyclingMessages[loadingMsgIdx]}
                                </p>
                                
                                {/* Modern Progress HUD */}
                                <div className="mt-5 space-y-2">
                                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500">
                                    <span>COMPILING SANDBOX BUNDLE</span>
                                    <span className="text-[#2563eb]">{buildProgress}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200/65 rounded-full h-2.5 overflow-hidden border border-slate-200/50 p-0.5">
                                    <div 
                                      style={{ width: `${buildProgress}%` }} 
                                      className="h-full bg-gradient-to-r from-[#2563eb] to-rose-500 rounded-full transition-all duration-300 ease-out"
                                    ></div>
                                  </div>
                                </div>
                              </div>

                              {/* Interactive Developer Telemetry Log */}
                              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4 font-mono text-left space-y-2 shadow-inner">
                                <div className="flex items-center justify-between text-[9px] text-slate-500 border-b border-slate-800 pb-2 mb-2">
                                  <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span> VibeLab Compiler Cores</span>
                                  <span className="text-rose-400 font-bold uppercase animate-pulse">LIVE SYNTHESIS</span>
                                </div>
                                <div className="space-y-1.5 text-[10px]">
                                  <div className="text-slate-300 flex items-start gap-2">
                                    <span className="text-blue-500">▶</span> 
                                    <span>[system] Initializing Vibelab AST structure parser... <span className="text-emerald-400 font-bold">Done</span></span>
                                  </div>
                                  <div className={`transition-all duration-300 flex items-start gap-2 ${buildProgress > 25 ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span className={buildProgress > 25 ? 'text-blue-500' : ''}>▶</span> 
                                    <span>[compiler] Processing screen routing paths & wiring layouts... {buildProgress > 25 ? <span className="text-emerald-400 font-bold">Done</span> : <span className="animate-pulse">Active</span>}</span>
                                  </div>
                                  <div className={`transition-all duration-300 flex items-start gap-2 ${buildProgress > 55 ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span className={buildProgress > 55 ? 'text-blue-500' : ''}>▶</span> 
                                    <span>[linker] Injecting custom styling classes & Tailwind modules... {buildProgress > 55 ? <span className="text-emerald-400 font-bold">Done</span> : (buildProgress > 25 ? <span className="text-amber-500 animate-pulse">Pending...</span> : <span className="text-slate-600">Waiting</span>)}</span>
                                  </div>
                                  <div className={`transition-all duration-300 flex items-start gap-2 ${buildProgress > 80 ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span className={buildProgress > 80 ? 'text-blue-500' : ''}>▶</span> 
                                    <span>[optimizer] Packaging standalone index.html interactive bundle... {buildProgress > 80 ? <span className="text-emerald-400 font-bold">Optimized</span> : (buildProgress > 55 ? <span className="text-amber-500 animate-pulse">Pending...</span> : <span className="text-slate-600">Waiting</span>)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 bg-white/70 border border-slate-200/60 rounded-2xl max-w-md text-left flex gap-3">
                                <Info className="w-4.5 h-4.5 text-[#2563eb] shrink-0 mt-0.5" />
                                <p className="text-[10px] text-slate-500 leading-normal">
                                  VibeLab is compiling your entire single-file HTML/CSS/JS MVP code on the server-side, integrating mock analytics models, interactive templates, and navigation features. Please hold on!
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 6: Understand Your Code (Interactive 3-Panel Walkthrough)
                       ***********************************************************/}
                      {item.step === 6 && (
                        <div className="flex-1 flex flex-col h-full w-full bg-white overflow-hidden">
                          {/* Modern Google AI Studio-style Workspace Control Toolbar */}
                          <div className="h-11 px-4 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm flex items-center justify-between shrink-0 select-none text-[11px] font-sans">
                            <div className="flex items-center gap-2 text-slate-600 truncate">
                              <span className="font-bold text-[#2563eb] tracking-wide uppercase flex items-center gap-1.5 shrink-0 font-sans">
                                <Box className="w-4 h-4 text-[#2563eb]" /> Workspace:
                              </span>
                              <span className="font-mono bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-700 truncate font-semibold">
                                vibelab-sandbox / {projectName || 'app'} / {activeFile}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Sidebar Toggle */}
                            <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setIsSidebarHidden(prev => !prev)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 border-none cursor-pointer ${
                                    !isSidebarHidden 
                                      ? 'bg-blue-50 text-[#2563eb]' 
                                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                  }`}
                                  title={isSidebarHidden ? "Show Files Sidebar" : "Hide Files Sidebar"}
                                >
                                  <FolderOpen className="w-3 h-3" />
                                  <span className="hidden sm:inline font-sans">Files</span>
                                </button>

                                {/* Guide Panel Toggle */}
                                <button
                                  type="button"
                                  onClick={() => setIsGuideHidden(prev => !prev)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 border-none cursor-pointer ${
                                    !isGuideHidden 
                                      ? 'bg-blue-50 text-[#2563eb]' 
                                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                  }`}
                                  title={isGuideHidden ? "Show Guide Panel" : "Hide Guide Panel"}
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span className="hidden sm:inline font-sans">Guide</span>
                                </button>
                              </div>

                              <div className="w-px h-4 bg-slate-200" />

                              {/* Workspace View Presets */}
                              <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setWorkspaceLayout('split')}
                                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wide flex items-center gap-1 transition-all border-none cursor-pointer ${
                                    workspaceLayout === 'split' 
                                      ? 'bg-[#2563eb] text-white font-extrabold' 
                                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                  }`}
                                >
                                  <Columns className="w-3 h-3" />
                                  <span className="hidden sm:inline font-sans">Split View</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWorkspaceLayout('code');
                                    setIsGuideHidden(true); // default to hide guide for full code space
                                  }}
                                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wide flex items-center gap-1 transition-all border-none cursor-pointer ${
                                    workspaceLayout === 'code' 
                                      ? 'bg-[#2563eb] text-white font-extrabold' 
                                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                  }`}
                                >
                                  <Code2 className="w-3 h-3" />
                                  <span className="hidden sm:inline font-sans">Code Only</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWorkspaceLayout('preview')}
                                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wide flex items-center gap-1 transition-all border-none cursor-pointer ${
                                    workspaceLayout === 'preview' 
                                      ? 'bg-[#2563eb] text-white font-extrabold' 
                                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                  }`}
                                >
                                  <PlaySquare className="w-3 h-3" />
                                  <span className="hidden sm:inline font-sans">Preview Only</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Outer Flex Container for Step 6 Panels */}
                          <div id="workspace-panels-container" className="flex-1 flex flex-col lg:flex-row h-full w-full bg-white overflow-y-auto lg:overflow-hidden">
                            
                            {/* Left Panel 0: Collapsible File Tree Sidebar (Pages, Components, Assets, etc.) */}
                            {!isSidebarHidden && workspaceLayout !== 'preview' && (
                              <>
                                <div 
                                  className="w-full border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0 font-sans transition-all duration-300 select-none h-[220px] lg:h-full overflow-hidden"
                                  style={{ width: `${sidebarWidth}px`, maxWidth: '100%' }}
                                >
                              <div className="p-3 border-b border-slate-200 bg-[#f8fafc] flex justify-between items-center text-[10px] text-slate-500 font-mono shrink-0 uppercase tracking-widest font-black">
                                <span className="flex items-center gap-1.5"><FolderOpen className="w-3.5 h-3.5 text-[#2563eb]" /> Sandbox Files</span>
                                <button
                                  onClick={() => setIsSidebarHidden(true)}
                                  className="text-[10px] text-slate-400 hover:text-[#2563eb] font-mono border-none bg-transparent cursor-pointer font-bold"
                                  title="Collapse sidebar workspace files"
                                >
                                  [hide]
                                </button>
                              </div>
                              <div className="px-2.5 pt-2 pb-1 bg-slate-100/50 border-b border-slate-200/50 flex items-center gap-1.5 shrink-0">
                                <Search className="w-3.5 h-3.5 text-slate-400" />
                                <input
                                  type="text"
                                  value={fileQuery}
                                  onChange={(e) => setFileQuery(e.target.value)}
                                  placeholder="Find file..."
                                  className="w-full text-xs font-sans tracking-wide text-slate-700 bg-transparent py-1 leading-normal border-none outline-none placeholder-slate-400"
                                />
                                {fileQuery && (
                                  <button 
                                    onClick={() => setFileQuery('')} 
                                    type="button"
                                    className="p-0.5 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer text-[10px]"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              {/* Create File Section */}
                              <div className="px-2.5 py-1.5 bg-slate-100/40 border-b border-slate-200/40 flex flex-col gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setIsAddingFile(!isAddingFile)}
                                  className="text-[10px] font-sans font-extrabold text-[#2563eb] hover:bg-[#2563eb]/5 px-2 py-1.5 rounded-lg border border-[#2563eb]/20 text-left flex items-center justify-between cursor-pointer bg-white transition-all w-full leading-tight"
                                >
                                  <span className="flex items-center gap-1"><span>+</span> Create New File</span>
                                  <span className="font-mono text-[9px] text-slate-400">src/components/</span>
                                </button>

                                {isAddingFile && (
                                  <form 
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      const trimmed = newFileName.trim();
                                      if (!trimmed) return;
                                      
                                      let resolvedPath = trimmed;
                                      if (!trimmed.includes('/')) {
                                        resolvedPath = `src/components/${trimmed}`;
                                      }

                                      setVirtualFiles(prev => ({
                                        ...prev,
                                        [resolvedPath]: `// File: ${resolvedPath}\n// Purpose: Dynamic modular addition to your product MVP\n\nexport default function CustomModule() {\n  return (\n    <div className="p-4 border rounded-xl bg-slate-50">\n      <h4 className="text-sm font-bold text-slate-800">Custom Feature Component</h4>\n      <p className="text-xs text-slate-500 mt-1">Ready for product presentation!</p>\n    </div>\n  );\n}`
                                      }));

                                      if (!openTabs.includes(resolvedPath)) {
                                        setOpenTabs(prev => [...prev, resolvedPath]);
                                      }
                                      setActiveFile(resolvedPath);
                                      setNewFileName('');
                                      setIsAddingFile(false);
                                      toast.success(`Registered virtual file: ${resolvedPath}`);
                                    }} 
                                    className="mt-1 flex items-center gap-1 bg-white border border-[#2563eb]/35 rounded-lg p-1.5 shadow-sm"
                                  >
                                    <input
                                      type="text"
                                      value={newFileName}
                                      onChange={(e) => setNewFileName(e.target.value)}
                                      placeholder="new-screen.tsx"
                                      className="flex-1 text-[11px] px-1.5 py-1 bg-transparent border-none outline-none font-mono text-slate-800"
                                      autoFocus
                                    />
                                    <button type="submit" className="p-1 text-emerald-600 hover:text-emerald-700 bg-transparent border-none font-black text-xs cursor-pointer">
                                      ✓
                                    </button>
                                    <button type="button" onClick={() => setIsAddingFile(false)} className="p-1 text-slate-400 hover:text-slate-600 bg-transparent border-none text-xs cursor-pointer">
                                      ✕
                                    </button>
                                  </form>
                                )}
                              </div>

                              <div className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-thin">
                                {(() => {
                                  // Build tree list statically but dynamic lookup
                                  const baseFolders = [
                                    {
                                      name: 'Pages',
                                      folderKey: 'src/pages',
                                      children: [
                                        { name: 'Landing.tsx', path: 'src/pages/Landing.tsx' },
                                        { name: 'Dashboard.tsx', path: 'src/pages/Dashboard.tsx' }
                                      ]
                                    },
                                    {
                                      name: 'Components',
                                      folderKey: 'src/components',
                                      children: [
                                        { name: 'Navigation.tsx', path: 'src/components/Navigation.tsx' },
                                        { name: 'InteractiveWidget.tsx', path: 'src/components/InteractiveWidget.tsx' },
                                        { name: 'script.js', path: 'src/components/script.js' }
                                      ]
                                    },
                                    {
                                      name: 'Assets',
                                      folderKey: 'public',
                                      children: [
                                        { name: 'logo-accent.svg', path: 'public/logo-accent.svg' },
                                        { name: 'banner.png', path: 'public/banner.png' }
                                      ]
                                    },
                                    {
                                      name: 'Styles',
                                      folderKey: 'src/styles',
                                      children: [
                                        { name: 'theme.css', path: 'src/styles/theme.css' },
                                        { name: 'style.css', path: 'src/styles/style.css' },
                                        { name: 'tailwind.config.js', path: 'tailwind.config.js' }
                                      ]
                                    },
                                    {
                                      name: 'APIs',
                                      folderKey: 'src/apis',
                                      children: [
                                        { name: 'geminiProxy.ts', path: 'src/apis/geminiProxy.ts' },
                                        { name: 'analytics.ts', path: 'src/apis/analytics.ts' }
                                      ]
                                    },
                                    {
                                      name: 'Database Models',
                                      folderKey: 'src/db',
                                      children: [
                                        { name: 'schema.sql', path: 'src/db/schema.sql' },
                                        { name: 'localStore.ts', path: 'src/db/localStore.ts' }
                                      ]
                                    },
                                    {
                                      name: 'Configuration Files',
                                      folderKey: 'config',
                                      children: [
                                        { name: 'package.json', path: 'package.json' },
                                        { name: 'readme.md', path: 'readme.md' },
                                        { name: 'metadata.json', path: 'metadata.json' },
                                        { name: 'index.html', path: 'index.html' }
                                      ]
                                    }
                                  ];

                                  const allTreePaths = new Set(baseFolders.flatMap(f => f.children.map(c => c.path)));
                                  Object.keys(virtualFiles).forEach(vKey => {
                                    if (!allTreePaths.has(vKey)) {
                                      let folderKey = 'config';
                                      if (vKey.startsWith('src/pages/')) folderKey = 'src/pages';
                                      else if (vKey.startsWith('src/components/')) folderKey = 'src/components';
                                      else if (vKey.startsWith('public/')) folderKey = 'public';
                                      else if (vKey.startsWith('src/styles/')) folderKey = 'src/styles';
                                      else if (vKey.startsWith('src/apis/')) folderKey = 'src/apis';
                                      else if (vKey.startsWith('src/db/')) folderKey = 'src/db';

                                      const targetFolder = baseFolders.find(f => f.folderKey === folderKey) || baseFolders[baseFolders.length - 1];
                                      targetFolder.children.push({ name: vKey.split('/').pop() || vKey, path: vKey });
                                    }
                                  });

                                  // Apply search filter if active
                                  let finalFolders = baseFolders;
                                  if (fileQuery.trim()) {
                                    const q = fileQuery.toLowerCase().trim();
                                    finalFolders = baseFolders.map(folder => {
                                      const matching = folder.children.filter(child => child.name.toLowerCase().includes(q) || child.path.toLowerCase().includes(q));
                                      return { ...folder, children: matching };
                                    }).filter(folder => folder.children.length > 0);
                                  }

                                  return finalFolders.map((node) => {
                                    const isExpanded = expandedFolders[node.folderKey] !== false;
                                    return (
                                      <div key={node.name} className="space-y-0.5 animate-fade-in">
                                        {/* Folder Header */}
                                        <div
                                          onClick={() => {
                                            setExpandedFolders(prev => ({
                                              ...prev,
                                              [node.folderKey]: !isExpanded
                                            }));
                                          }}
                                          className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 cursor-pointer transition-colors"
                                        >
                                          <span className="text-slate-400">
                                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                          </span>
                                          <span className="text-[#2563eb]">
                                            {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                                          </span>
                                          <span className="truncate">{node.name}</span>
                                        </div>

                                        {/* Folder Children */}
                                        {isExpanded && node.children && (
                                          <div className="pl-6 space-y-0.5 border-l border-slate-200 ml-3.5">
                                            {node.children.map((child) => {
                                              const isSelected = activeFile === child.path;
                                              return (
                                                <div
                                                  key={child.path}
                                                  onClick={() => {
                                                    // Lazy initialization of newly registered explorer file in the real virtual state
                                                    if (!virtualFiles[child.path]) {
                                                      setVirtualFiles(prev => ({
                                                        ...prev,
                                                        [child.path]: `// Sandbox file: ${child.path}\n// Enhanced for ${projectName || 'your digital product'}\n\n// Add client layout modules here!`
                                                      }));
                                                    }
                                                    if (!openTabs.includes(child.path)) {
                                                      setOpenTabs(prev => [...prev, child.path]);
                                                    }
                                                    setActiveFile(child.path);
                                                  }}
                                                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] cursor-pointer transition-all ${
                                                    isSelected 
                                                      ? 'bg-[#2563eb]/10 text-[#2563eb] font-extrabold border-l-2 border-l-[#2563eb] pl-1.5' 
                                                      : 'hover:bg-slate-100 text-slate-500'
                                                  }`}
                                                >
                                                  <File className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#2563eb]' : 'text-slate-400'}`} />
                                                  <span className="truncate">{child.name}</span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                            {/* Drag Divider for Sidebar */}
                            <div
                              onMouseDown={(e) => handleMouseDown('sidebar', e)}
                              className="hidden lg:block w-1 hover:w-1.5 bg-slate-200/65 hover:bg-[#2563eb] cursor-col-resize h-full transition-all shrink-0 z-30 relative"
                              title="Drag to resize files panel"
                            />
                            </>
                          )}

                          {/* Left Panel 1: Guide (scrollable description guides) */}
                          {!isGuideHidden && workspaceLayout !== 'preview' && (
                            <>
                              <div 
                                className="w-full bg-white flex flex-col justify-between shrink-0 h-[320px] lg:h-full overflow-y-auto border-r border-slate-200 scrollbar-thin"
                                style={{ width: `${guideWidth}px`, maxWidth: '100%' }}
                              >
                            <div className="space-y-4">
                              <div>
                                <div className="text-[10px] font-bold text-[#2563eb] font-mono tracking-widest uppercase mb-1">
                                  YOUR PRODUCT GUIDE
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 truncate mb-3">
                                  {projectName || 'My Product'} — How It Works
                                </h4>

                                {/* Explanation Mode Toggle */}
                                <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl border border-slate-200/60 mb-1">
                                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 font-mono pl-1.5">Mode:</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setExplanationMode('simple')}
                                      type="button"
                                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all duration-150 border-none cursor-pointer ${
                                        explanationMode === 'simple'
                                          ? 'bg-[#2563eb] text-white shadow'
                                          : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                      }`}
                                    >
                                      Simple
                                    </button>
                                    <button
                                      onClick={() => setExplanationMode('technical')}
                                      type="button"
                                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all duration-150 border-none cursor-pointer ${
                                        explanationMode === 'technical'
                                          ? 'bg-[#2563eb] text-white shadow'
                                          : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                      }`}
                                    >
                                      Technical
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Tab selection */}
                              <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl border border-slate-200/60 mb-2">
                                <button
                                  onClick={() => setGuidePanelTab('tasks')}
                                  type="button"
                                  className={`py-1.5 rounded-lg text-[10.5px] font-bold uppercase transition-all duration-150 border-none cursor-pointer ${
                                    guidePanelTab === 'tasks'
                                      ? 'bg-white text-slate-800 shadow font-black'
                                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                  }`}
                                >
                                  Guided Tasks
                                </button>
                                <button
                                  onClick={() => setGuidePanelTab('explorer')}
                                  type="button"
                                  className={`py-1.5 rounded-lg text-[10.5px] font-bold uppercase transition-all duration-150 border-none cursor-pointer ${
                                    guidePanelTab === 'explorer'
                                      ? 'bg-white text-slate-800 shadow font-black'
                                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                  }`}
                                >
                                  Code Explorer
                                </button>
                              </div>

                              {guidePanelTab === 'tasks' ? (
                                <>
                                  {/* Numbered tasks */}
                                  <div className="space-y-2">
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
                                            ? 'bg-[#2563eb]/10 border-[#2563eb]/45 text-[#2563eb] font-bold' 
                                            : 'bg-slate-50/40 border-slate-200 hover:bg-slate-50/85 text-slate-600'
                                        }`}
                                      >
                                        <span className={`w-5 h-5 rounded-full text-[11px] font-bold font-mono shrink-0 flex items-center justify-center border ${
                                          selectedTaskIdx === idx 
                                            ? 'bg-[#2563eb] border-[#2563eb] text-black' 
                                            : 'bg-white border-slate-200 text-slate-500'
                                        }`}>
                                          {idx + 1}
                                        </span>
                                        <div>
                                          <p className="text-xs font-bold leading-tight">{task.title}</p>
                                          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{task.desc}</p>
                                        </div>
                                      </button>
                                    ))}
                                  </div>

                                  {/* Explanation block */}
                                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                    <p className="text-[10px] font-bold text-[#2563eb] tracking-wide uppercase font-mono">
                                      What this code does
                                    </p>
                                    {isExplaining ? (
                                      <div className="flex items-center gap-2 py-2">
                                        <Loader2 className="w-4 h-4 text-[#2563eb] animate-spin" />
                                        <span className="text-[11px] text-slate-500 animate-pulse font-mono uppercase tracking-wider">Compiling expert review...</span>
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-slate-600 leading-relaxed pl-0.5 font-sans">
                                        {taskExplanations[selectedTaskIdx] || 'Think of this like your app\'s foundation. It defines the central shell that ensures your text, inputs, and screens have space to exist and flow perfectly!'}
                                      </p>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-4">
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                                    Click any element below to reveal it inside your real code edit file and live screen preview:
                                  </div>

                                  <div className="grid grid-cols-3 gap-1.5">
                                    {COMMON_TAGS.map((tagObj) => {
                                      const isSelected = selectedCommonTag?.tag === tagObj.tag;
                                      return (
                                        <button
                                          key={tagObj.tag}
                                          type="button"
                                          onClick={() => {
                                            setSelectedCommonTag(tagObj);
                                            handleHighlightEditorAndPreview(tagObj.tagKey, tagObj.selector);
                                          }}
                                          className={`px-1 py-1.5 text-[10px] font-mono font-bold rounded-lg border text-center transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-[#2563eb] border-[#2563eb] text-white shadow-md'
                                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                          }`}
                                        >
                                          {tagObj.tag}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {selectedCommonTag ? (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="p-4 bg-[#2563eb]/5 border border-[#2563eb]/15 rounded-xl space-y-3 font-sans"
                                    >
                                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/50">
                                        <span className="text-xs font-black font-mono text-[#2563eb]">{selectedCommonTag.tag} Element</span>
                                        <span className="text-[9px] bg-[#2563eb]/10 text-[#2563eb] px-1.5 py-0.5 rounded uppercase font-black tracking-wider">active query</span>
                                      </div>

                                      <div className="space-y-2 text-[11px] leading-relaxed">
                                        <div>
                                          <p className="font-extrabold text-[#2563eb] uppercase text-[9px] font-mono tracking-wider">What it is & does</p>
                                          <p className="text-slate-700 mt-0.5 font-medium">{selectedCommonTag.whatItDoes}</p>
                                        </div>
                                        <div>
                                          <p className="font-extrabold text-[#2563eb] uppercase text-[9px] font-mono tracking-wider">Why it exists</p>
                                          <p className="text-slate-700 mt-0.5 font-medium">{selectedCommonTag.whyItExists}</p>
                                        </div>
                                        <div>
                                          <p className="font-extrabold text-[#2563eb] uppercase text-[9px] font-mono tracking-wider">Live screen action</p>
                                          <p className="text-slate-700 mt-0.5 font-medium">{selectedCommonTag.whatItAffects}</p>
                                        </div>
                                        <div>
                                          <p className="font-extrabold text-[#2563eb] uppercase text-[9px] font-mono tracking-wider">Product connection</p>
                                          <p className="text-slate-700 mt-0.5 font-medium">{selectedCommonTag.productConnection}</p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  ) : (
                                    <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center">
                                      <p className="text-slate-400 text-[10px] font-bold font-mono">Select a tag above to explore its structural role</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Mini AI Tutor Chat widget */}
                              <div className="border border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => setIsTutorExpanded(!isTutorExpanded)}
                                  className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-[11px] font-bold uppercase transition-all tracking-wider font-mono text-slate-700 border-none cursor-pointer"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-[#2563eb] animate-pulse" />
                                    {isTutorExpanded ? "Hide AI Tutor Guide" : "Ask about this part →"}
                                  </span>
                                  <span className="text-slate-400">{isTutorExpanded ? "▼" : "▲"}</span>
                                </button>

                                {isTutorExpanded && (
                                  <div className="p-4 space-y-3.5 font-sans bg-white border-t border-slate-200">
                                    {/* Display hovered/active component indicator */}
                                    <div className="p-2.5 rounded-lg bg-[#2563eb]/5 border border-[#2563eb]/10">
                                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest font-mono block">Selected Segment</span>
                                      <span className="text-xs font-extrabold text-[#2563eb] leading-tight block">
                                        {hoveredComponent ? (
                                          `[${hoveredComponent.component_type}] ${hoveredComponent.component_id.replace(/_/g, ' ')}`
                                        ) : (
                                          "Hover over any element in the preview to analyze!"
                                        )}
                                      </span>
                                    </div>

                                    {/* Chat history list */}
                                    {tutorChatHistory.length > 0 && (
                                      <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                                        {tutorChatHistory.map((msg, midx) => (
                                          <div key={midx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
                                              {msg.sender === 'user' ? 'You' : 'AI Tutor'}
                                            </span>
                                            <div className={`p-2.5 rounded-xl text-xs leading-relaxed max-w-[90%] ${
                                              msg.sender === 'user' 
                                                ? 'bg-[#2563eb] text-white rounded-tr-none' 
                                                : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200/50'
                                            }`}>
                                              {msg.text}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Suggestion Chips */}
                                    <div className="flex flex-wrap gap-1.5">
                                      {["What is this?", "Why is this used?", "How is it built?"].map((chip) => (
                                        <button
                                          key={chip}
                                          type="button"
                                          disabled={!hoveredComponent || isTutorLoading}
                                          onClick={() => handleAskTutor(chip)}
                                          className="px-2.5 py-1.5 rounded-full text-[10px] font-bold border border-slate-200 hover:border-[#2563eb] bg-slate-50 hover:bg-[#2563eb]/5 text-slate-600 hover:text-[#2563eb] disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer"
                                        >
                                          {chip}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Input Form */}
                                    <form 
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        if (tutorQuestion.trim()) {
                                          handleAskTutor(tutorQuestion);
                                        }
                                      }}
                                      className="flex gap-2"
                                    >
                                      <input
                                        type="text"
                                        value={tutorQuestion}
                                        onChange={(e) => setTutorQuestion(e.target.value)}
                                        placeholder={hoveredComponent ? "Ask a question..." : "Hover over a part to ask..."}
                                        disabled={!hoveredComponent || isTutorLoading}
                                        className="flex-1 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#2563eb] text-xs text-slate-800 px-3 py-2 rounded-xl outline-none transition-all disabled:opacity-50"
                                      />
                                      <button
                                        type="submit"
                                        disabled={!hoveredComponent || !tutorQuestion.trim() || isTutorLoading}
                                        className="h-9 w-9 shrink-0 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center border-none disabled:opacity-45 cursor-pointer text-xs font-bold"
                                      >
                                        {isTutorLoading ? "..." : "Ask"}
                                      </button>
                                    </form>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-slate-500 text-[10px] leading-relaxed flex items-start gap-1.5 font-sans">
                                <Info className="w-3.5 h-3.5 text-[#2563eb] mt-0.5 shrink-0" />
                                <span>Study the project structure panel. You can double-click folders and select files to edit code. Click <strong>Lock Walkthrough & Code Review</strong> below to check progress!</span>
                              </div>
                            </div>
                          </div>
                          {/* Drag Divider for Guide */}
                          <div
                            onMouseDown={(e) => handleMouseDown('guide', e)}
                            className="hidden lg:block w-1 hover:w-1.5 bg-slate-200/60 hover:bg-[#2563eb] cursor-col-resize h-full transition-all shrink-0 z-30 relative"
                            title="Drag to resize guide"
                          />
                          </>
                          )}

                          {/* Center Panel 2: Code Editor (flex-1 to expand beautifully) */}
                          {(workspaceLayout === 'split' || workspaceLayout === 'code') && (
                            <>
                              <div 
                                className="flex flex-col bg-slate-950 overflow-hidden h-[450px] lg:h-full shrink-0"
                              style={{ 
                                width: (workspaceLayout === 'split' && window.innerWidth >= 1024) ? `${splitRatio}%` : (workspaceLayout === 'code' ? '100%' : undefined),
                                flexGrow: workspaceLayout === 'split' ? undefined : 1
                              }}
                            >
                            {/* Tab Bar Utilities header */}
                            <div className="flex items-center justify-between px-2 bg-slate-900 border-b border-slate-800 font-mono text-[10px] shrink-0 select-none overflow-x-auto scrollbar-none h-[38px] w-full">
                              <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none h-full">
                                {openTabs.map((tab) => {
                                  const isActive = activeFile === tab;
                                  const parts = tab.split('/');
                                  const displayName = parts[parts.length - 1];
                                  return (
                                    <div
                                      key={tab}
                                      onClick={() => setActiveFile(tab)}
                                      className={`flex items-center gap-2 px-3 h-full cursor-pointer transition-colors border-r border-slate-800 relative group truncate max-w-[130px] ${
                                        isActive 
                                          ? 'bg-slate-950 text-[#2563eb] font-bold border-t-2 border-t-[#2563eb]' 
                                          : 'bg-slate-900 hover:bg-slate-850 text-slate-400'
                                      }`}
                                    >
                                      <File className={`w-3 h-3 shrink-0 ${isActive ? 'text-[#2563eb]' : 'text-slate-500'}`} />
                                      <span className="truncate">{displayName}</span>
                                      
                                      {tab !== 'index.html' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const nextTabs = openTabs.filter(t => t !== tab);
                                            setOpenTabs(nextTabs);
                                            if (activeFile === tab) {
                                              setActiveFile(nextTabs[nextTabs.length - 1] || 'index.html');
                                            }
                                          }}
                                          className="p-0.5 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-all ml-1 bg-transparent border-none text-[8px] line-none"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex items-center gap-3.5 px-2">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(virtualFiles[activeFile] || '');
                                    toast.success(`${activeFile} copied to clipboard!`);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                  }}
                                  className="text-slate-400 hover:text-white flex items-center gap-1 uppercase transition-colors font-bold bg-transparent border-none cursor-pointer"
                                  title="Copy active code"
                                >
                                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  <span className="hidden sm:inline">Copy</span>
                                </button>
                                <button
                                  onClick={() => {
                                    const initial = getInitialVirtualFiles(projectName, mvp?.mvp_html || '');
                                    setVirtualFiles(prev => ({
                                      ...prev,
                                      [activeFile]: (initial as any)[activeFile] || ''
                                    }));
                                    toast.success(`${activeFile} reset to default template version!`);
                                  }}
                                  className="text-slate-400 hover:text-white flex items-center gap-1 uppercase transition-colors font-bold bg-transparent border-none cursor-pointer"
                                  title="Reset code"
                                >
                                  <RotateCw className="w-3 h-3" />
                                  <span className="hidden sm:inline">Reset</span>
                                </button>
                              </div>
                            </div>

                            {/* Monaco Editor React Container */}
                            <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-950">
                              {Object.keys(virtualFiles).length > 0 ? (
                                <MonacoEditor
                                  key={activeFile}
                                  path={activeFile}
                                  height="100%"
                                  language={
                                    activeFile.endsWith('.ts') || activeFile.endsWith('.tsx') ? 'typescript' :
                                    activeFile.endsWith('.js') || activeFile.endsWith('.jsx') ? 'javascript' :
                                    activeFile.endsWith('.json') ? 'json' :
                                    activeFile.endsWith('.css') ? 'css' :
                                    activeFile.endsWith('.sql') ? 'sql' :
                                    activeFile.endsWith('.md') ? 'markdown' :
                                    activeFile.endsWith('.svg') ? 'xml' :
                                    'html'
                                  }
                                  theme="vs-dark"
                                  value={virtualFiles[activeFile] || ''}
                                  onChange={(val) => {
                                    if (val !== undefined) {
                                      setVirtualFiles(prev => ({
                                        ...prev,
                                        [activeFile]: val
                                      }));
                                    }
                                  }}
                                  onMount={(editor, monaco) => {
                                    editorRef.current = editor;
                                    monacoRef.current = monaco;
                                    handleTaskClick(selectedTaskIdx);
                                  }}
                                  options={{
                                    readOnly: isFieldDisabled,
                                    minimap: { enabled: false },
                                    fontSize: 12,
                                    lineNumbers: "on",
                                    lineNumbersMinChars: 3,
                                    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
                                    fontLigatures: true,
                                    smoothScrolling: true,
                                    wordWrap: "on",
                                    automaticLayout: true,
                                    cursorBlinking: "smooth",
                                    cursorSmoothCaretAnimation: "on",
                                    renderLineHighlight: "all",
                                    folding: true,
                                    bracketPairColorization: { enabled: true },
                                    scrollbar: {
                                      vertical: 'visible',
                                      verticalScrollbarSize: 8,
                                      horizontal: 'visible',
                                      horizontalScrollbarSize: 8,
                                      useShadows: false
                                    },
                                    suggestOnTriggerCharacters: true,
                                    quickSuggestions: { other: true, comments: true, strings: true },
                                    tabSize: 2,
                                    insertSpaces: true,
                                    padding: { top: 12, bottom: 12 }
                                  }}
                                />
                              ) : (
                                <div className="absolute inset-0 bg-slate-950 flex flex-col justify-center items-center text-slate-500 gap-2">
                                  <Loader2 className="w-6 h-6 animate-spin text-[#2563eb]" />
                                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#2563eb]">LOADING SOURCE...</span>
                                </div>
                              )}
                            </div>

                            {/* Editor Status Bar */}
                            <div className="h-[24px] bg-[#0b0f19] border-t border-slate-900 flex justify-between items-center px-4 font-mono text-[9px] text-slate-500 select-none uppercase tracking-wider shrink-0">
                              <span>Writable Sandbox Compiler</span>
                              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> Auto-Saved</span>
                            </div>
                            </div>
                            {/* Drag Divider for Splitter (Editor/Preview) */}
                            {workspaceLayout === 'split' && (
                              <div
                                onMouseDown={(e) => handleMouseDown('splitter', e)}
                                className="hidden lg:block w-1 hover:w-1.5 bg-slate-200/60 hover:bg-[#2563eb] cursor-col-resize h-full transition-all shrink-0 z-30 relative"
                                title="Drag to resize panels"
                              />
                            )}
                            </>
                          )}

                          {/* Right Panel 3: Live Interactive Preview */}
                          {(workspaceLayout === 'split' || workspaceLayout === 'preview') && (
                            <div 
                              className="flex flex-col bg-slate-50 overflow-hidden h-[500px] lg:h-full shrink-0"
                              style={{ 
                                width: (workspaceLayout === 'split' && window.innerWidth >= 1024) ? `${100 - splitRatio}%` : (workspaceLayout === 'preview' ? '100%' : undefined),
                                flexGrow: workspaceLayout === 'split' ? undefined : 1
                              }}
                            >
                            {/* Device controls header */}
                            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white shrink-0 select-none">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase font-mono tracking-widest">FLUID PREVIEW</span>
                              </div>
                              
                              {/* Device Toggles & Full Screen Mode Launcher */}
                              <div className="flex items-center gap-1">
                                <div className="flex items-center gap-1 p-0.5 bg-white border border-slate-200 rounded-md">
                                  <button
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={`p-1 rounded transition-colors cursor-pointer border-none bg-transparent ${previewDevice === 'desktop' ? 'bg-[#2563eb] text-white' : 'text-slate-500 hover:text-slate-800'}`}
                                    title="Desktop preview"
                                  >
                                    <Monitor className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setPreviewDevice('tablet')}
                                    className={`p-1 rounded transition-colors cursor-pointer border-none bg-transparent ${previewDevice === 'tablet' ? 'bg-[#2563eb] text-white' : 'text-slate-500 hover:text-slate-800'}`}
                                    title="Tablet preview"
                                  >
                                    <Tablet className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={`p-1 rounded transition-colors cursor-pointer border-none bg-transparent ${previewDevice === 'mobile' ? 'bg-[#2563eb] text-white' : 'text-slate-500 hover:text-slate-800'}`}
                                    title="Mobile preview"
                                  >
                                    <Smartphone className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="w-px h-4 bg-slate-200 mx-1" />

                                <button
                                  onClick={() => {
                                    const el = document.getElementById('walkthrough-preview-iframe') as HTMLIFrameElement;
                                    if (el) el.setAttribute('srcdoc', getInjectedMvpCode(virtualFiles['index.html'] || mvp?.mvp_html || ''));
                                    toast.success('Live preview recompiled successfully!', { icon: '🔄' });
                                  }}
                                  className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-500 hover:text-slate-800 cursor-pointer border-none bg-transparent"
                                  title="Hot Reload Preview"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>

                                <button
                                  onClick={() => setShowFullScreenPreview(true)}
                                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-[#2563eb] transition-colors rounded cursor-pointer border-none bg-transparent"
                                  title="Expand Full Screen Preview Mode"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Iframe stage rendering container */}
                            <div className="flex-1 bg-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
                              <div className={`transition-all duration-300 shadow-2xl h-full border border-slate-200/60 rounded-2xl overflow-hidden bg-white relative ${
                                previewDevice === 'mobile' ? 'w-[290px]' : previewDevice === 'tablet' ? 'w-[440px]' : 'w-full'
                              }`}>
                                {virtualFiles['index.html'] !== undefined ? (
                                  <>
                                    <iframe
                                      id="walkthrough-preview-iframe"
                                      title="Campaign MVP code interactive walkthrough and emulator"
                                      sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                                      srcDoc={getInjectedMvpCode(virtualFiles['index.html'] || mvp?.mvp_html || '')}
                                      className="w-full h-full border-none"
                                      onLoad={() => restoreSandboxState('walkthrough-preview-iframe')}
                                    />

                                    {/* Hover element target highlighter */}
                                    {hoveredComponent && hoverRect && (
                                      <div 
                                        className="absolute pointer-events-none border-2 border-[#2563eb] rounded bg-[#2563eb]/5 z-40 transition-all duration-150 animate-pulse"
                                        style={{
                                          top: hoverRect.top + 'px',
                                          left: hoverRect.left + 'px',
                                          width: hoverRect.width + 'px',
                                          height: hoverRect.height + 'px'
                                        }}
                                      />
                                    )}

                                    {/* Floating explanation tooltip */}
                                    {hoveredComponent && hoverRect && (
                                      <div 
                                        className="absolute z-50 bg-slate-900 text-white rounded-xl shadow-2xl p-3 border border-slate-800 text-[11px] leading-relaxed select-none pointer-events-none animate-in fade-in zoom-in-95 duration-150 max-w-[240px]"
                                        style={{
                                          top: (hoverRect.top + hoverRect.height + 6) + 'px',
                                          left: Math.min(Math.max(6, hoverRect.left), 200) + 'px'
                                        }}
                                      >
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <span className="text-[9px] font-mono uppercase bg-[#2563eb] px-1.5 py-0.5 rounded text-white font-extrabold tracking-wider shrink-0">
                                            {hoveredComponent.component_type}
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-mono truncate font-bold">
                                            ID: {hoveredComponent.component_id}
                                          </span>
                                        </div>
                                        <p className="font-semibold text-slate-100 font-sans">
                                          {explanationMode === 'simple' 
                                            ? hoveredComponent.simple_explanation || hoveredComponent.purpose 
                                            : hoveredComponent.technical_explanation || hoveredComponent.purpose
                                          }
                                        </p>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-full h-full bg-slate-50 flex flex-col justify-center items-center text-slate-500 gap-2">
                                    <RefreshCw className="w-6 h-6 animate-spin text-[#2563eb]" />
                                    <p className="text-[10px] uppercase font-mono tracking-wider text-[#2563eb]">LOADING SANDBOX SCREEN...</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          )}
                          </div>
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 7: Describe Your Product
                       ***********************************************************/}
                      {item.step === 7 && (
                        <div className="p-6 md:p-8 space-y-6">
                          <div>
                            <span className="px-2.5 py-1 bg-[#2563eb]/10 text-[#2563eb] text-[10px] font-black uppercase tracking-widest rounded-md border border-[#2563eb]/20 font-mono">
                              Product Launch Pitch
                            </span>
                            <h3 className="font-bebas text-4xl tracking-widest text-[#2563eb] mt-3 uppercase leading-none">
                              DESCRIBE YOUR PRODUCT
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 pl-0.5">
                              This description serves as the core narrative of your product. Edit the AI-generated starter draft until it sounds perfect!
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase font-[#2563eb] font-mono">
                              Edit this until it sounds like you:
                            </label>
                            <textarea
                              value={productDescription}
                              onChange={(e) => setProductDescription(e.target.value)}
                              rows={10}
                              placeholder="Write a clear startup marketing pitch detailing the user journey and outcomes..."
                              className="w-full bg-white border border-slate-200 hover:border-slate-200 focus:border-[#2563eb] text-sm text-slate-800 px-5 py-4 rounded-xl outline-none transition-all placeholder:text-slate-650 leading-relaxed font-sans resize-y"
                            />
                            
                            {/* Live Word Count Indicator */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono uppercase">
                              <span>WORD COUNT: <strong className="text-emerald-400">{productDescription.trim() ? productDescription.trim().split(/\s+/).length : 0}</strong> words</span>
                              <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-[#2563eb]" /> Drafted with Vibelab AI</span>
                            </div>
                          </div>

                          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                            <Info className="w-4.5 h-4.5 text-[#2563eb] shrink-0" />
                            <span>Customize your startup pitch description above, then click <strong>Save Description & Pitch</strong> in the footer below to lock in the story!</span>
                          </div>
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 8: Explain Your Features
                       ***********************************************************/}
                      {item.step === 8 && (
                        <div className="p-6 md:p-8 space-y-6 animate-fade-in text-left">
                          <div>
                            <span className="px-2.5 py-1 bg-[#2563eb]/10 text-[#2563eb] text-[10px] font-black uppercase tracking-widest rounded-md border border-[#2563eb]/20 font-mono">
                              Under the hood
                            </span>
                            <h3 className="font-bebas text-4xl tracking-widest text-[#2563eb] mt-3 uppercase leading-none">
                              Explore System Components
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 pl-0.5">
                              Understand exactly how each individual system component was built, what its business rationale is, and how the underlying tech mechanics function. Click any component below to highlight its source code range!
                            </p>
                          </div>

                          {/* Split layout: left side list, right side details */}
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Component Selector List (5 cols) */}
                            <div className="lg:col-span-5 space-y-2 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin">
                              <span className="text-[10px] font-mono font-black uppercase text-slate-400 tracking-wider block mb-1">
                                System Components ({componentMetadata.length})
                              </span>
                              {componentMetadata.length === 0 ? (
                                <div className="p-8 border border-slate-200 border-dashed rounded-2xl text-center text-xs text-slate-500 font-sans">
                                  No system components analyzed yet. Submit your screens to compile!
                                </div>
                              ) : (
                                componentMetadata.map((comp) => {
                                  const isSelected = selectedComponent8?.id === comp.id;
                                  return (
                                    <button
                                      key={comp.id}
                                      type="button"
                                      onClick={() => handleComponentClickStep8(comp)}
                                      className={`w-full p-4 rounded-xl flex items-center justify-between text-left transition-all border cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#2563eb]/5 border-[#2563eb] shadow-sm'
                                          : 'bg-white border-slate-200/80 hover:border-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-2.5 rounded-lg shrink-0 ${isSelected ? 'bg-[#2563eb] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                          {getComponentIcon(comp.component_type)}
                                        </div>
                                        <div className="min-w-0">
                                          <h4 className="text-xs font-black text-slate-800 leading-tight truncate">
                                            {comp.component_id.replace(/_/g, ' ')}
                                          </h4>
                                          <span className="text-[9px] font-mono uppercase font-black text-slate-400 tracking-wider">
                                            {comp.component_type}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-xs text-slate-400 font-bold shrink-0 pl-1">
                                        {isSelected ? "▶" : " "}
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>

                            {/* Detailed Explanation Display (7 cols) */}
                            <div className="lg:col-span-7">
                              {selectedComponent8 ? (
                                <div className="p-6 rounded-2xl bg-white border border-slate-200 h-full flex flex-col justify-between space-y-5">
                                  <div className="space-y-4">
                                    {/* Component Tag details */}
                                    <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                                      <div>
                                        <span className="text-[9px] font-mono bg-[#2563eb] px-2 py-0.5 rounded text-white font-black tracking-widest uppercase">
                                          {selectedComponent8.component_type || 'Component'}
                                        </span>
                                        <h3 className="text-sm font-bold text-slate-800 mt-1.5 font-sans">
                                          ID: {selectedComponent8.component_id}
                                        </h3>
                                      </div>

                                      {/* Explanation Mode Switcher in Right Header */}
                                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 scale-90 origin-right">
                                        <button
                                          type="button"
                                          onClick={() => setExplanationMode('simple')}
                                          className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all duration-150 border-none cursor-pointer ${
                                            explanationMode === 'simple'
                                              ? 'bg-white text-[#2563eb] shadow-sm font-bold'
                                              : 'text-slate-500 bg-transparent'
                                          }`}
                                        >
                                          Simple
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setExplanationMode('technical')}
                                          className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all duration-150 border-none cursor-pointer ${
                                            explanationMode === 'technical'
                                              ? 'bg-white text-[#2563eb] shadow-sm font-bold'
                                              : 'text-slate-500 bg-transparent'
                                          }`}
                                        >
                                          Technical
                                        </button>
                                      </div>
                                    </div>

                                    {/* Business Reason */}
                                    <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                      <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-wider block">
                                        Business Reason & User Value
                                      </span>
                                      <p className="text-xs text-slate-705 leading-relaxed font-semibold font-sans pl-0.5">
                                        {selectedComponent8.business_reason || 'To establish intuitive, friction-free interaction workflows.'}
                                      </p>
                                    </div>

                                    {/* Explanation Body */}
                                    <div className="space-y-2">
                                      <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
                                        {explanationMode === 'simple' ? 'Simple Clarification (Beginner-Friendly)' : 'Technical Architecture Detail'}
                                      </span>
                                      <div className="p-4 rounded-xl border border-[#2563eb]/10 bg-[#2563eb]/5">
                                        <p className="text-xs text-[#1e3a8a] leading-relaxed font-sans font-medium">
                                          {explanationMode === 'simple'
                                            ? selectedComponent8.simple_explanation || selectedComponent8.purpose
                                            : selectedComponent8.technical_explanation || selectedComponent8.purpose
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-[10px] text-slate-400 font-mono text-center flex items-center justify-center gap-1">
                                    <Info className="w-3.5 h-3.5 text-[#2563eb]" /> Monaco editor has highlighted the code matching this component.
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full border border-slate-200 border-dashed rounded-2xl flex flex-col justify-center items-center p-8 text-center text-slate-400 text-xs min-h-[250px] bg-slate-50/50">
                                  <Box className="w-8 h-8 opacity-40 mb-2 text-[#2563eb]" />
                                  Please select a component from the list on the left to see explanations.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                            <Info className="w-4.5 h-4.5 text-[#2563eb] shrink-0" />
                            <span>Take notes of how your components function to ace your upcoming product landing and presentation rehearsal demo!</span>
                          </div>
                        </div>
                      )}

                      {/**********************************************************
                       * STEP 9: Demo Preparation
                       ***********************************************************/}
                      {item.step === 9 && (
                        <div className="p-6 md:p-8 space-y-6">
                          <div>
                            <span className="px-2.5 py-1 bg-[#2563eb]/10 text-[#2563eb] text-[10px] font-black uppercase tracking-widest rounded-md border border-[#2563eb]/20 font-mono">
                              Investor Pitch Kit
                            </span>
                            <h3 className="font-bebas text-4xl tracking-widest text-[#2563eb] mt-3 uppercase leading-none">
                              DEMO PREPARATION
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 pl-0.5">
                              Prepare your delivery script, focus on key benefits, and warm-up speaking using our dedicated practice rehearsal tools!
                            </p>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                            {/* DEMO SCRIPT & REHEARSAL TIMER (Left 8 cols) */}
                            <div className="lg:col-span-8 flex flex-col gap-5">
                              {/* 1. Editable Demo Script */}
                              <div className="p-5 rounded-2xl bg-slate-50/40 border border-slate-200 space-y-3">
                                <h4 className="text-xs font-bold text-slate-600 font-mono uppercase tracking-wider flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-[#2563eb] rounded-full"></span>
                                  1. Demo Script Narrative
                                </h4>
                                <textarea
                                  value={demoScript}
                                  onChange={(e) => setDemoScript(e.target.value)}
                                  rows={8}
                                  placeholder="Review and polish your detailed step-by-step presentation narrative..."
                                  className="w-full bg-white border border-slate-200 hover:border-slate-200 focus:border-[#2563eb] text-xs text-slate-800 px-4 py-3 rounded-xl outline-none leading-relaxed font-sans resize-y"
                                />
                              </div>

                              {/* 3. Rehearsal countdown timer */}
                              <div className="p-5 rounded-2xl bg-slate-50/40 border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="space-y-1 block max-w-sm">
                                  <h4 className="text-xs font-bold text-slate-600 font-mono uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-[#2563eb] rounded-full"></span>
                                    3. Practice Mode Rehearsal
                                  </h4>
                                  <p className="text-[10px] text-slate-500 leading-normal font-sans">
                                    Read your demo script aloud and click Start, testing feature walkthrough steps within our 3-minute presentation limit!
                                  </p>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 bg-white px-5 py-3 rounded-xl border border-slate-200">
                                  {/* Timer countdown view */}
                                  <div className="font-mono text-2xl font-black text-[#2563eb] tracking-widest w-16 text-center select-none">
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
                              <div className="p-4 rounded-2xl bg-white/40 border border-slate-805 space-y-3">
                                <h4 className="text-xs font-bold text-slate-650 font-mono uppercase tracking-wider flex items-center gap-1.5 font-sans">
                                  <span className="w-1.5 h-1.5 bg-[#2563eb] rounded-full"></span>
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
                                      className="p-3.5 rounded-xl border border-[#2563eb]/25 bg-[#2563eb]/5 text-[11px] text-slate-700 leading-normal font-sans hover:border-[#2563eb]/45 transition-all"
                                    >
                                      <strong>Benefit #{tpIdx + 1}:</strong> {tp}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                            <Info className="w-4.5 h-4.5 text-[#2563eb] shrink-0" />
                            <span>Prepare your demo rehearsal script above, then click <strong>Lock Demo Script</strong> in the footer below to lock your active rehearsal draft!</span>
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
                              className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#2563eb]/25 to-amber-400/25 border border-[#2563eb]/40 flex items-center justify-center text-[#2563eb] relative shadow-lg shadow-[#2563eb]/5"
                            >
                              <Trophy className="w-10 h-10 animate-pulse text-[#2563eb]" />
                              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#2563eb]"></span>
                              </span>
                            </motion.div>

                            <span className="px-3 py-1 bg-[#2563eb] text-black text-[10px] font-black font-mono tracking-widest rounded-full uppercase shadow-md shadow-[#2563eb]/20 select-none animate-bounce mt-2">
                              READY FOR QA
                            </span>
                          </div>

                          {/* Titles */}
                          <div className="space-y-2">
                            <h2 className="font-bebas text-5xl md:text-7xl tracking-widest text-[#2563eb] leading-none uppercase">
                              YOUR PRODUCT IS READY
                            </h2>
                            <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed pl-0.5">
                              You completed <strong>{projectName || 'your project'}</strong>! Your initial campaign MVP and pitching collateral have compiled flawlessly.
                            </p>
                          </div>

                          {/* Screenshot Capture Section */}
                          <div className="max-w-md mx-auto relative group overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-md hover:shadow-lg transition-all">
                            <span className="absolute top-4 left-4 z-10 bg-slate-900/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#2563eb] rounded-lg font-mono">
                              Automatic Page Capture
                            </span>
                            {screenshotUrl && !screenshotError ? (
                              <img 
                                src={screenshotUrl} 
                                alt="Product Screenshot"
                                className="w-full h-44 object-cover object-top rounded-xl"
                                referrerPolicy="no-referrer"
                                onError={() => setScreenshotError(true)}
                              />
                            ) : (
                              <div className="w-full h-44 rounded-xl bg-gradient-to-br from-slate-900 to-[#1e293b] flex flex-col justify-center items-center text-center p-4 border border-slate-800">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <Monitor className="w-6 h-6 text-[#2563eb]" />
                                </div>
                                <span className="text-[11px] font-mono font-bold text-[#38bdf8] uppercase tracking-wider">NoteBase Live Sandbox Ready</span>
                                <span className="text-[10px] font-sans text-slate-400 mt-1">Direct deployment compilation successfully verified.</span>
                              </div>
                            )}
                          </div>

                          {/* Skills & Mastery Summary */}
                          {skillsLearnedJson && (
                            <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                                <div>
                                  <h4 className="text-xs font-black text-slate-800 font-sans uppercase tracking-wider">
                                    🎓 Course Skill-Tree Mastery
                                  </h4>
                                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium leading-relaxed font-sans">
                                    Your verified technical execution rating mapped directly to Grade 10-12 Computer Science Standards.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xl font-mono font-black text-[#2563eb]">
                                    {skillsLearnedJson.overall_skill_percentage || 65}%
                                  </span>
                                  <span className="text-[10px] font-mono uppercase bg-[#2563eb]/10 text-[#2563eb] px-2 py-0.5 rounded font-black">
                                    Rating
                                  </span>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#2563eb] to-blue-500 rounded-full transition-all duration-1000"
                                  style={{ width: `${skillsLearnedJson.overall_skill_percentage || 65}%` }}
                                />
                              </div>

                              {/* Demonstrated Skills List */}
                              <div className="space-y-2">
                                <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-wider block">
                                  Skills Demonstrated:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {skillsLearnedJson.skills_demonstrated?.map((sk: any, sIdx: number) => (
                                    <span 
                                      key={sIdx}
                                      className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wide rounded-full border border-emerald-200 shadow-sm flex items-center gap-1 font-sans"
                                    >
                                      ✓ {sk.skill}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Next recommended skills */}
                              {skillsLearnedJson.next_skills && (
                                <div className="space-y-2 pt-1">
                                  <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-wider block">
                                    Future Learning Recommendations:
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {skillsLearnedJson.next_skills.map((next: string, nIdx: number) => (
                                      <span 
                                        key={nIdx}
                                        className="px-3 py-1 bg-transparent text-slate-500 text-[10px] font-semibold uppercase tracking-wide rounded-full border border-slate-350 border-dashed flex items-center gap-1 font-sans"
                                      >
                                        ✦ {next}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

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
                                className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2 hover:border-[#2563eb]/25 transition-all font-sans"
                              >
                                <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-700 truncate">{del.label}</span>
                              </motion.div>
                            ))}
                          </div>

                          {/* Buttons */}
                          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4 max-w-lg mx-auto">
                            <button
                              onClick={handleCompletePhase2}
                              disabled={isSubmitting}
                              className="w-full inline-flex items-center justify-center bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] text-white font-extrabold tracking-widest text-xs uppercase px-6 py-4.5 rounded-xl transition-all shadow-xl shadow-[#2563eb]/15 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer text-center font-sans h-12"
                            >
                              Continue — Phase 3: Testing & Validation →
                            </button>
                            
                            <button
                              onClick={() => setShowFullProductModal(true)}
                              className="w-full px-6 py-4 bg-white border border-slate-200 hover:border-slate-200 text-slate-600 hover:text-white font-mono text-xs font-bold tracking-widest uppercase rounded-xl transition-colors cursor-pointer text-center h-12"
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
                            className="w-full text-center text-[10px] uppercase tracking-widest font-mono font-bold text-slate-500 hover:text-[#2563eb] transition-colors cursor-pointer border-none bg-transparent"
                          >
                            Share My Product
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
    
          {/* Footer Navigation Bar */}
          <div className="flex items-center justify-between px-6 py-4.5 md:px-12 z-20 border-t border-slate-200 bg-white/75 backdrop-blur-md shrink-0 select-none">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (activeStep > 1) {
                    setActiveStep(activeStep - 1);
                  } else {
                    if (onClose) onClose();
                    else window.location.href = '/dashboard';
                  }
                }}
                className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-slate-200 shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              {/* On-demand and Automatic Save Status Indicators */}
              <div className="hidden md:flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[9px] uppercase font-mono font-bold tracking-wider select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Auto-Save Active
                </span>
                
                {activeStep !== 3 && activeStep !== 5 && activeStep !== 6 && activeStep !== 10 && (
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleSaveGlobalDraft(true)}
                    className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#2563eb] border border-[#2563eb]/20 hover:border-[#2563eb]/45 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Click to manually back up your current progress"
                  >
                    <Save className="w-3.5 h-3.5 text-[#2563eb]" /> Save Progress
                  </button>
                )}
              </div>
            </div>
    
            {/* Dynamic primary CTA button based on current step */}
            <div>
              {activeStep === 1 && (
                <button
                  onClick={handleApproveBlueprint}
                  disabled={isSubmitting}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 border-none"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Blueprint'} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {activeStep === 2 && (
                <button
                  onClick={handleApproveFeatures}
                  disabled={isSubmitting}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 border-none"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Features'} <ArrowRight className="w-3.5 h-3.5 text-white" />
                </button>
              )}
              {activeStep === 3 && (
                <button
                  onClick={handleApproveJourney}
                  disabled={isSubmitting}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 border-none"
                >
                  {isSubmitting ? 'Generating...' : 'Approve Journey'} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {activeStep === 4 && (
                <button
                  onClick={handleApproveScreensAndBuild}
                  disabled={isSubmitting}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5 cursor-pointer border-none"
                >
                  {isSubmitting ? 'Compiling...' : 'Approve & Click-to-Build'} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {activeStep === 5 && (
                buildError ? (
                  <button
                    onClick={() => {
                      setBuildError(null);
                      handleApproveScreensAndBuild();
                    }}
                    className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5 cursor-pointer border-none"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Build
                  </button>
                ) : (
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> Building MVP Package...
                  </div>
                )
              )}
              {activeStep === 6 && (
                <button
                  onClick={handleCompleteStep6}
                  disabled={isSubmitting}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 border-none"
                >
                  {isSubmitting ? 'Locking...' : 'Lock Walkthrough & Code Review'} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {activeStep === 7 && (
                <button
                  onClick={handleSaveDescriptionStep7}
                  disabled={isSubmitting}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 border-none"
                >
                  {isSubmitting ? 'Saving...' : 'Save Description & Pitch'} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {activeStep === 8 && (
                <button
                  onClick={handleCompleteStep8}
                  disabled={isSubmitting}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5 cursor-pointer border-none"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Technical Exploration'} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {activeStep === 9 && (
                <button
                  onClick={handleSaveDemoStep9}
                  disabled={isSubmitting}
                  className="px-5 py-3 bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 border-none"
                >
                  {isSubmitting ? 'Saving...' : 'Lock Demo Script'} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {activeStep === 10 && (
                <button
                  onClick={handleCompletePhase2}
                  disabled={isSubmitting}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5 cursor-pointer border-none"
                >
                  🎉 {isSubmitting ? 'Submitting...' : 'Complete Phase 2'} <Check className="w-3.5 h-3.5 animate-bounce" />
                </button>
              )}
            </div>
          </div>
      {/* Premium Full-Screen Visual Screen Modal Overlay */}
      <AnimatePresence>
        {selectedScreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div>
                  <h4 className="text-xs font-black uppercase text-[#2563eb] tracking-widest font-mono">Screen Preview</h4>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedScreen.screen_name}</h3>
                </div>
                <button 
                  onClick={() => setSelectedScreen(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all uppercase cursor-pointer"
                >
                  Close ×
                </button>
              </div>

              {/* Full view wrapper */}
              <div className="flex-1 overflow-hidden bg-white flex flex-col p-4">
                <div className="flex-1 border border-slate-200/60 rounded-2xl overflow-hidden bg-slate-100 relative">
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
              <div className="p-6 border-t border-slate-200/60 bg-white/40 text-[11px] text-slate-500 font-medium leading-relaxed shrink-0 flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-[#2563eb]" />
                <span><strong>Purpose spec:</strong> {selectedScreen.screen_purpose}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Full-Screen Showcase Modal Overview Overlay */}
      <AnimatePresence>
        {showFullProductModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 selection:bg-[#2563eb]/30"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col shadow-2xl text-left"
            >
              {/* Header block with elegant dark styling for extreme readability contrast */}
              <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-[#2563eb] tracking-widest font-mono flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#2563eb]" /> VIBELAB FINAL PRODUCT DEMO SHOWCASE
                  </h4>
                  <h3 className="text-lg font-bold text-white mt-1">
                    Live Launch Exhibit: {projectName || 'My Campaign MVP'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowFullProductModal(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all uppercase cursor-pointer"
                >
                  Return to Dashboard ×
                </button>
              </div>

              {/* Horizontal Showcase Navigation Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50 select-none overflow-x-auto shrink-0 scrollbar-none">
                {[
                  { id: 'overview', label: 'Product Narrative', icon: FileText },
                  { id: 'screens', label: 'Interactive Blueprint Screens', icon: Layout },
                  { id: 'preview', label: 'Live Executable App', icon: Monitor },
                  { id: 'milestones', label: 'Timeline & Evidence Credentials', icon: Award }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeShowcaseTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveShowcaseTab(tab.id as any)}
                      className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-r border-slate-200 transition-colors shrink-0 bg-transparent cursor-pointer h-11 ${
                        isActive 
                          ? 'bg-white text-[#2563eb] border-b-2 border-b-[#2563eb]' 
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Scrollable deliverables tab content area */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-55/50">
                
                {/* 1. OVERVIEW TAB PANEL */}
                {activeShowcaseTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Live Screenshot Hero */}
                    {screenshotUrl && !screenshotError ? (
                      <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-2xl">
                        <span className="text-[9px] font-mono uppercase bg-slate-900 text-[#2563eb] px-2.5 py-1 rounded-md font-black tracking-widest block mb-1 text-center">
                          Interactive Live Demo Screen Captured
                        </span>
                        <img 
                          src={screenshotUrl} 
                          alt="Product Live Screen Capture" 
                          className="w-full max-h-[350px] object-cover object-top rounded-xl border border-slate-100 mt-2"
                          onError={() => setScreenshotError(true)}
                        />
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center flex flex-col items-center justify-center min-h-[180px]">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <Terminal className="w-5 h-5 text-[#2563eb]" />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">NoteBase Dev Server Live</span>
                        <span className="text-[10px] text-slate-400 mt-1 font-sans">Active Sandbox VM running on port 3000. All components compiled.</span>
                      </div>
                    )}

                    {/* AI Contribution & Student Agency Breakdown */}
                    <div className="p-6 rounded-2xl bg-[#2563eb]/5 border border-[#2563eb]/20 space-y-3 shadow-inner">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#2563eb]" />
                        <h4 className="text-xs font-black text-[#2563eb] font-mono uppercase tracking-wider">
                          AI COLLABORATION & INTELLECTUAL CONTRIBUTIONS
                        </h4>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
                        {aiContributionSummary || `AI assisted the core development of screen assets and code synthesis during Phase 2 walkthroughs. The founder maintained complete structural authority over critical features, target audiences, and design intent.`}
                      </p>
                    </div>

                    {/* Project Blueprint */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-black text-[#2563eb] font-mono uppercase tracking-wider">
                          I. FOUNDATION BLUEPRINT SPECIFICATION
                        </h4>
                        <span className="text-[10px] bg-[#2563eb]/10 text-[#2563eb] px-2 py-0.5 rounded-full font-mono font-bold">100% SPEC LOCKED</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400 uppercase font-mono text-[9px] font-bold">Project Name</p>
                          <p className="text-slate-800 font-bold mt-1">{projectName || 'My Campaign'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase font-mono text-[9px] font-bold">Target User Base</p>
                          <p className="text-slate-800 font-medium mt-1">{targetUsers || 'General Public/Teens'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-slate-400 uppercase font-mono text-[9px] font-bold">Problem Statement</p>
                          <p className="text-slate-700 mt-1 leading-relaxed">{problemStatement || 'Undefined.'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-slate-400 uppercase font-mono text-[9px] font-bold">Minimum Viable Scope</p>
                          <p className="text-slate-700 mt-1 leading-relaxed">{mvpScope || 'No scope definition assigned.'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Campaign Description & Pitch */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                      <h4 className="text-xs font-black text-[#2563eb] font-mono uppercase tracking-wider">
                        II. MARKETING CAMPAIGN PRODUCT PITCH
                      </h4>
                      <div className="p-4 rounded-xl bg-slate-55/40 border border-slate-100 font-sans text-xs leading-relaxed text-slate-700 whitespace-pre-wrap select-text pl-3.5 border-l-2 border-l-[#2563eb]">
                        {productDescription || 'Explain details locked in Step 7 pitch board.'}
                      </div>
                    </div>

                    {/* Features & Rationales */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-[#2563eb] font-mono uppercase tracking-wider">
                        III. HIGH-PRIORITY MVP SYSTEM FEATURES & STUDENT INTENT
                      </h4>
                      <div className="grid grid-cols-1 gap-3.5">
                        {features.filter(f => f.category === 'must_have' && (f.is_included === 1 || f.is_included === true)).map((feat) => (
                          <div key={feat.id} className="p-4 rounded-xl bg-white border border-slate-200 text-xs hover:shadow-sm transition-all">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>
                              {feat.feature_name}
                              <span className="text-[9px] font-mono bg-blue-50 text-[#2563eb] px-1.5 py-0.2 rounded shrink-0 font-bold">MUST_HAVE</span>
                            </div>
                            <p className="text-slate-500 text-[11px] mt-1 pl-3.5 leading-relaxed">{feat.feature_description}</p>
                            <div className="mt-3 p-3 rounded-lg bg-slate-50/50 border border-slate-100 text-slate-600">
                              <span className="text-[#2563eb] font-mono text-[9px] font-bold uppercase tracking-wide block mb-1">Founder's Design Intent Rationale:</span>
                              <p className="italic text-[11px] leading-relaxed select-text pl-1.5 border-l-2 border-slate-300">"{featureRationales[feat.id] || 'Under development.'}"</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Demo script */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                      <h4 className="text-xs font-black text-[#2563eb] font-mono uppercase tracking-wider">
                        IV. THE PRESENTATION REHEARSAL INSTRUCTIONS
                      </h4>
                      <div className="p-4 rounded-xl bg-slate-55/40 border border-slate-100 text-xs font-serif leading-relaxed text-slate-600 whitespace-pre-wrap select-text pl-3 border-l-2 border-l-[#2563eb]">
                        {demoScript || 'Script details locked in Step 9 presentation rehearsal.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PRODUCT SCREENS TAB PANEL */}
                {activeShowcaseTab === 'screens' && (
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                      <h3 className="text-xs font-bold text-slate-800">Mockup Layout Specifications</h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        These are the individual client interface panels generated to guide your MVP development flow. Click any screen component below to inspect the UI layout parameters.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {screens.length > 0 ? (
                        screens.map((screen, sIdx) => (
                          <div 
                            key={screen.id || sIdx}
                            className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#2563eb]/45 transition-all flex flex-col justify-between shadow-sm relative group"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] font-bold text-[#2563eb] bg-[#2563eb]/10 px-2 py-0.5 rounded-md">
                                  Screen {sIdx + 1}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  COMPLIANT
                                </span>
                              </div>
                              <h4 className="text-xs font-black text-slate-850 truncate uppercase mt-1">
                                {screen.screen_name}
                              </h4>
                              <p className="text-[11px] text-slate-500 leading-relaxed min-h-[38px] line-clamp-2">
                                {screen.screen_purpose || 'No description designated for this mockup card.'}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedScreen(screen);
                              }}
                              className="mt-4 w-full py-2 border border-[#2563eb]/30 hover:border-[#2563eb] text-[#2563eb] text-[10px] font-mono tracking-wider uppercase font-bold rounded-lg transition-colors bg-white flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Inspect UI Blueprint
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 p-12 text-center rounded-2xl bg-white border border-dashed border-slate-205 text-slate-400 space-y-2">
                          <Layout className="w-10 h-10 mx-auto text-slate-300" />
                          <p className="text-xs font-medium">No sandbox viewport prototype screens have been compiled yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. LIVE INTERACTIVE PREVIEW TAB PANEL */}
                {activeShowcaseTab === 'preview' && (
                  <div className="h-full flex flex-col space-y-4">
                    <div className="p-4 rounded-xl bg-[#2563eb]/5 border border-[#2563eb]/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-[#2563eb] flex items-center gap-1.5">
                          <Monitor className="w-4 h-4" /> Live Executable Interactive Simulator
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                          Test features instantly like an end user! The simulator runs the exact code from your active work draft sandbox.
                        </p>
                      </div>

                      {/* Launch external */}
                      <button
                        onClick={() => {
                          const htmlCode = virtualFiles['index.html'] || mvp?.mvp_html || '';
                          const blob = new Blob([htmlCode], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank');
                          toast.success('App launched in full viewport browser screen!');
                        }}
                        className="px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 cursor-pointer border-none"
                        title="Launch app in a secondary window"
                      >
                        <ExternalLink className="w-3 h-3" /> External Launch
                      </button>
                    </div>

                    {/* Simulated Stage Device controls */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col min-h-[500px]">
                      <div className="flex justify-between items-center bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 mb-4 text-[10px]">
                        <span className="text-green-400 font-mono uppercase tracking-widest font-black flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" /> App Running (PORT: 3000)
                        </span>

                        <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-md">
                          <button
                            onClick={() => setPreviewDevice('desktop')}
                            className={`p-1 rounded transition-colors cursor-pointer border-none bg-transparent ${previewDevice === 'desktop' ? 'bg-[#2563eb] text-white' : 'text-slate-400 hover:text-white'}`}
                            title="Desktop layout"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPreviewDevice('tablet')}
                            className={`p-1 rounded transition-colors cursor-pointer border-none bg-transparent ${previewDevice === 'tablet' ? 'bg-[#2563eb] text-white' : 'text-slate-400 hover:text-white'}`}
                            title="Tablet layout"
                          >
                            <Tablet className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPreviewDevice('mobile')}
                            className={`p-1 rounded transition-colors cursor-pointer border-none bg-transparent ${previewDevice === 'mobile' ? 'bg-[#2563eb] text-white' : 'text-slate-400 hover:text-white'}`}
                            title="Mobile layout"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Sized Stage Screen Frame Container */}
                      <div className="flex-1 bg-slate-850 rounded-xl p-3 flex justify-center items-center overflow-hidden">
                        <div className={`transition-all duration-300 shadow-2xl h-full border border-slate-200 bg-white overflow-hidden ${
                          previewDevice === 'mobile' ? 'w-[290px]' : previewDevice === 'tablet' ? 'w-[450px]' : 'w-full'
                        } rounded-xl`}>
                          <iframe
                            id="showcase-simulator-iframe"
                            title="Mockup Emulator Interactive Exhibit Playground"
                            sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                            srcDoc={getInjectedMvpCode(virtualFiles['index.html'] || mvp?.mvp_html || '')}
                            className="w-full h-full border-none bg-white"
                            onLoad={() => restoreSandboxState('showcase-simulator-iframe')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Timeline & BADGE TAB PANEL */}
                {activeShowcaseTab === 'milestones' && (
                  <div className="space-y-6">
                    {/* Badge and certification cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      
                      {/* Left: Credential Certificate Frame */}
                      <div className="md:col-span-2 bg-[#090d16] border border-slate-800 text-white rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                        {/* watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none">
                          <Trophy className="w-60 h-60 text-white" />
                        </div>

                        <div className="z-10 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="text-[9px] font-bold font-mono uppercase tracking-widest text-amber-400">CREDENTIAL DESIGNATION</h5>
                              <h4 className="text-sm font-bold tracking-tight text-white mt-1">VibeLab Campaign MVP Architect</h4>
                            </div>
                            <Award className="w-8 h-8 text-amber-400" />
                          </div>

                          <div className="pt-4 space-y-1">
                            <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">PROJECT FOUNDER</p>
                            <p className="text-lg font-serif italic text-amber-200 font-bold">Certified Innovator Developer</p>
                          </div>

                          <div className="pt-2 text-xs text-slate-300 font-sans leading-relaxed">
                            Has compiled, tested, and structurally certified a functional campaign product pitch MVP for <strong>{projectName || 'Unnamed Campaign App'}</strong>, satisfying the exact standards of iterative user research, screen prototyping, code structural walkthroughs, and executive rehearsal pitch logs.
                          </div>
                        </div>

                        <div className="z-10 border-t border-slate-800/80 pt-4 flex justify-between items-center text-[10px] font-mono text-slate-500">
                          <span>ISSUE REF CODE: {session?.id || 'Ref-Phase2'}</span>
                          <span>ISSUED BY: G-SYSTEMS VIBELAB</span>
                        </div>
                      </div>

                      {/* Right: Milestone checklists */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-slate-500 font-mono tracking-widest">
                            Milestones Met (10/10)
                          </h4>

                          <div className="space-y-1.5 overflow-y-auto max-h-[220px]">
                            {[
                              'Idea Discovery',
                              'Feature Matrix Selection',
                              'Customer User Journeys',
                              'Refining UX Scopes',
                              'Wireframing Screens',
                              'Sandbox Walkthrough',
                              'Launching Pitch Narrative',
                              'Milestone Summaries',
                              'Executive Demo Script',
                              'Certification & Evidence'
                            ].map((mil, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-600 font-bold font-sans">
                                <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 font-black">
                                  ✓
                                </div>
                                <span className="truncate">{mil}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                          <button
                            onClick={() => {
                              const cite = `[VID: ${session?.id || 'Ref-Phase2'}] Portfolio Evidence citation compiled on UTC ${new Date().toISOString().substring(0, 10)} for Campaign MVP projectName: "${projectName || 'My App'}". Verified on VibeLab Sandbox v1.0.`;
                              navigator.clipboard.writeText(cite);
                              toast.success('Citation evidence citation copied for sandbox portfolio record!');
                            }}
                            className="w-full text-center py-2 border border-slate-200 hover:border-[#2563eb] text-[#2563eb] text-[10px] tracking-widest uppercase font-mono font-bold rounded-lg transition-colors bg-transparent cursor-pointer"
                          >
                            Copy Portfolio Evidence Code
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>

              {/* Showcase Footer panel */}
              <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-slate-500 font-mono text-[10px] shrink-0 select-none">
                <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-[#2563eb]" /> VibeLab Campaign Launch Board</span>
                <span>ID: {session?.id || '200'}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Full Screen Emulator Workspace Overlay */}
      <AnimatePresence>
        {showFullScreenPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col selection:bg-[#2563eb]/20"
          >
            {/* Top bar control menu */}
            <div className="h-[56px] px-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-white select-none shrink-0">
              <div className="flex items-center gap-3 justify-start max-w-[40%]">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                <h3 className="text-[10px] font-bold font-mono uppercase tracking-widest text-[#2563eb] truncate">
                  Full Screen Preview: {projectName || 'My Campaign'}
                </h3>
              </div>

              {/* Layout controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 border-none bg-transparent ${previewDevice === 'desktop' ? 'bg-[#2563eb] text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('tablet')}
                    className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 border-none bg-transparent ${previewDevice === 'tablet' ? 'bg-[#2563eb] text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Tablet className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Tablet</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 border-none bg-transparent ${previewDevice === 'mobile' ? 'bg-[#2563eb] text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>

                <div className="w-px h-5 bg-slate-800 mx-1" />

                <button
                  onClick={() => {
                    const el = document.getElementById('full-screen-preview-iframe') as HTMLIFrameElement;
                    if (el) el.setAttribute('srcdoc', getInjectedMvpCode(virtualFiles['index.html'] || mvp?.mvp_html || ''));
                    toast.success('Live Emulator Hot Reload Refreshed!');
                  }}
                  className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer border-none bg-transparent flex items-center justify-center shrink-0"
                  title="Force Hot Reload Simulator Code"
                >
                  <RefreshCw className="w-4 h-4 animate-spin-once" />
                </button>

                <button
                  onClick={() => setShowFullScreenPreview(false)}
                  className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none"
                >
                  Close Preview
                </button>
              </div>
            </div>

            {/* Simulated Frame Canvas Container */}
            <div className="flex-1 bg-slate-900 p-6 flex justify-center items-center overflow-hidden">
              <div className={`transition-all duration-300 shadow-2xl h-full border border-slate-800 bg-white overflow-hidden ${
                previewDevice === 'mobile' ? 'w-[325px]' : previewDevice === 'tablet' ? 'w-[640px]' : 'w-full'
              } rounded-2xl`}>
                <iframe
                  id="full-screen-preview-iframe"
                  title="Full Screen Prototype Sizing Emulator Layout"
                  sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                  srcDoc={getInjectedMvpCode(virtualFiles['index.html'] || mvp?.mvp_html || '')}
                  className="w-full h-full border-none bg-white"
                  onLoad={() => restoreSandboxState('full-screen-preview-iframe')}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
