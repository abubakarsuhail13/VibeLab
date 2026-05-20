import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import MonacoEditor from '@monaco-editor/react';
import { 
  CheckCircle2, 
  Circle, 
  Lock, 
  Play, 
  Trophy, 
  BookOpen, 
  Code2, 
  BarChart3,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Info,
  Star,
  MessageSquare,
  Send,
  X,
  ExternalLink,
  ChevronLeft,
  Download,
  Copy,
  Check,
  Lightbulb,
  Monitor,
  Smartphone,
  Tablet,
  RotateCw
} from "lucide-react";

interface Phase {
  id: number;
  name: string;
  description: string;
  order_index: number;
  status: 'locked' | 'active' | 'completed';
  progress_percentage: number;
}

interface Project {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  requirements: string[];
  steps: { title: string; desc: string }[];
  completed_steps: number[];
  is_completed: boolean;
  tutorial_data?: {
    step: number;
    content: string;
    starterCode?: string;
    exampleCode?: string;
    instructions: string;
  }[];
  last_active_step?: number;
  code_state?: Record<number, string>;
}

interface Submission {
  github_url: string;
  live_url: string;
  description: string;
}

interface PhaseViewProps {
  phaseId: number;
  onBack: () => void;
  onProgress?: () => void;
}

export default function PhaseView({ phaseId, onBack, onProgress }: PhaseViewProps) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'learn' | 'build' | 'progress'>('build');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [submission, setSubmission] = useState<Submission>({ github_url: '', live_url: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isCertifying, setIsCertifying] = useState(false);
  const [hasBadge, setHasBadge] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitProjectId, setSubmitProjectId] = useState<number | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [code, setCode] = useState('');
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [tutorMessages, setTutorMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorInput, setTutorInput] = useState('');
  const [copied, setCopied] = useState(false);

  const [projectCodeState, setProjectCodeState] = useState<Record<number, string>>({});
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const getCodeForStep = (index: number, codeState: Record<number, string>) => {
    if (codeState[index] !== undefined && codeState[index] !== '') {
      return codeState[index];
    }
    for (let i = index - 1; i >= 0; i--) {
      if (codeState[i] !== undefined && codeState[i] !== '') {
        return codeState[i];
      }
    }
    const stepData = selectedProject?.tutorial_data?.find((s: any) => s.step === index);
    if (stepData?.starterCode) {
      return stepData.starterCode;
    }
    const firstStep = selectedProject?.tutorial_data?.find((s: any) => s.step === 0);
    return firstStep?.starterCode || '';
  };

  useEffect(() => {
    if (selectedProject) {
      const activeStep = selectedProject.last_active_step || 0;
      setCurrentStepIndex(activeStep);
      
      const savedCodeState = selectedProject.code_state || {};
      setProjectCodeState(savedCodeState);

      const loaded = getCodeForStep(activeStep, savedCodeState);
      setCode(loaded);
    }
  }, [selectedProject?.id]);

  // Debounced real-time autosave
  useEffect(() => {
    if (!selectedProject || code === '') return;

    const stepData = selectedProject.tutorial_data?.find(s => s.step === currentStepIndex);
    const lastSavedOfCurrentStep = projectCodeState[currentStepIndex];
    const originalStarter = stepData?.starterCode || '';
    
    // Ignore if not modified from last state or original
    if (code === (lastSavedOfCurrentStep !== undefined ? lastSavedOfCurrentStep : originalStarter)) {
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      const updatedCodeState = {
        ...projectCodeState,
        [currentStepIndex]: code
      };
      setProjectCodeState(updatedCodeState);

      try {
        const token = localStorage.getItem('vibelab_token');
        const response = await fetch('/api/progress/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            projectId: selectedProject.id,
            completedSteps: selectedProject.completed_steps,
            isCompleted: selectedProject.is_completed,
            lastActiveStep: currentStepIndex,
            codeState: updatedCodeState
          })
        });

        if (response.ok) {
          setSaveStatus('saved');
          setProjects(prev => prev.map(p => 
            p.id === selectedProject.id 
              ? { ...p, code_state: updatedCodeState } 
              : p
          ));
        } else {
          setSaveStatus('idle');
        }
      } catch (err) {
        console.error("Autosave failed", err);
        setSaveStatus('idle');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [code, currentStepIndex, selectedProject?.id]);

  const handleStepChange = async (index: number) => {
    if (!selectedProject) return;

    const updatedCodeState = {
      ...projectCodeState,
      [currentStepIndex]: code
    };
    setProjectCodeState(updatedCodeState);

    setCurrentStepIndex(index);
    const loadedCode = getCodeForStep(index, updatedCodeState);
    setCode(loadedCode);
    
    try {
      const token = localStorage.getItem('vibelab_token');
      await fetch('/api/progress/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          completedSteps: selectedProject.completed_steps,
          isCompleted: selectedProject.is_completed,
          lastActiveStep: index,
          codeState: updatedCodeState
        })
      });
    } catch (err) {
      console.error("Failed to save active step", err);
    }
  };

  const handleAskTutor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tutorInput.trim() || !selectedProject) return;

    const userMsg = { role: 'user' as const, content: tutorInput };
    setTutorMessages(prev => [...prev, userMsg]);
    setTutorInput('');
    setTutorLoading(true);

    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/tutor/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: userMsg.content,
          context: {
            project: selectedProject.title,
            step: selectedProject.steps[currentStepIndex]?.title,
            code: code
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTutorMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      } else {
        setTutorMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to my central brain. Please check your internet or try again later!" }]);
      }
    } catch (err) {
      setTutorMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to AI Tutor." }]);
    } finally {
      setTutorLoading(false);
    }
  };

  const fetchPhaseData = async () => {
    try {
      const token = localStorage.getItem('vibelab_token');
      const [phaseRes, projectsRes, submissionsRes, badgesRes] = await Promise.all([
        fetch(`/api/phase/${phaseId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/phase/${phaseId}/projects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/user/submissions', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/user/badges', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (phaseRes.ok && projectsRes.ok) {
        setPhase(await phaseRes.json());
        const projectsData = await projectsRes.json();
        const parsedProjects = projectsData.map((p: any) => {
          let codeState = p.code_state || {};
          if (typeof codeState === 'string') {
            try { codeState = JSON.parse(codeState); } catch (_) { codeState = {}; }
          }
          return {
            ...p,
            requirements: typeof p.requirements === 'string' ? JSON.parse(p.requirements) : p.requirements,
            steps: typeof p.steps === 'string' ? JSON.parse(p.steps) : p.steps,
            completed_steps: typeof p.completed_steps === 'string' ? JSON.parse(p.completed_steps) : p.completed_steps,
            tutorial_data: typeof p.tutorial_data === 'string' ? JSON.parse(p.tutorial_data) : p.tutorial_data,
            code_state: codeState
          };
        });
        setProjects(parsedProjects);
        
        if (submissionsRes.ok) {
          const subs = await submissionsRes.json();
          setUserSubmissions(subs);
        }

        if (badgesRes.ok) {
          const badges = await badgesRes.json();
          setHasBadge(badges.some((b: any) => b.phase_id === phaseId));
        }
      }
    } catch (err) {
      console.error("Failed to fetch phase data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCertify = async () => {
    setIsCertifying(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const response = await fetch(`/api/phase/${phaseId}/certify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setHasBadge(true);
        setShowSuccessModal(true);
        fetchPhaseData(); // refresh state
        onProgress?.(); // Refresh dashboard/sidebar
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Certification failed");
      }
    } catch (err) {
      console.error("Failed to certify", err);
    } finally {
      setIsCertifying(false);
    }
  };

  useEffect(() => {
    const targetId = submitProjectId || selectedProject?.id;
    if (targetId) {
      const existing = userSubmissions.find((s: any) => s.project_id === targetId);
      if (existing) {
        setSubmission({
          github_url: existing.github_url || '',
          live_url: existing.live_url || '',
          description: existing.description || ''
        });
      } else {
        setSubmission({ github_url: '', live_url: '', description: '' });
      }
    }
  }, [selectedProject?.id, submitProjectId, userSubmissions]);

  const handleProjectSubmission = async (e: React.FormEvent, projOverride?: any) => {
    e.preventDefault();
    const proj = projOverride || selectedProject;
    if (!proj) return;

    if (!submission.github_url) {
      alert("GitHub URL is required");
      return;
    }

    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    if (!urlPattern.test(submission.github_url)) {
      alert("Please enter a valid GitHub URL");
      return;
    }
    
    if (submission.live_url && !urlPattern.test(submission.live_url)) {
      alert("Please enter a valid Live Demo URL");
      return;
    }

    setIsSubmitting(true);
    setSubmissionStatus('idle');

    try {
      const token = localStorage.getItem('vibelab_token');
      const response = await fetch('/api/submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: proj.id,
          phaseId: phaseId,
          githubUrl: submission.github_url,
          liveUrl: submission.live_url,
          description: submission.description
        })
      });

      if (response.ok) {
        setSubmissionStatus('success');
        fetchPhaseData(); // Recalculate project list & submissions
        onProgress?.();
      } else {
        setSubmissionStatus('error');
      }
    } catch (err) {
      setSubmissionStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPhaseData();
  }, [phaseId]);

  const handleStepToggle = async (projectId: number, stepIndex: number) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    let newCompletedSteps = [...project.completed_steps];
    if (newCompletedSteps.includes(stepIndex)) {
      newCompletedSteps = newCompletedSteps.filter(s => s !== stepIndex);
    } else {
      newCompletedSteps.push(stepIndex);
      newCompletedSteps.sort();
    }

    const isCompleted = newCompletedSteps.length === project.steps.length;

    try {
      const token = localStorage.getItem('vibelab_token');
      const response = await fetch('/api/progress/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          completedSteps: newCompletedSteps,
          isCompleted,
          lastActiveStep: currentStepIndex,
          codeState: projectCodeState
        })
      });

      if (response.ok) {
        // Optimistic update
        setProjects(prev => prev.map(p => 
          p.id === projectId 
            ? { ...p, completed_steps: newCompletedSteps, is_completed: isCompleted } 
            : p
        ));
        
        if (selectedProject?.id === projectId) {
          setSelectedProject(prev => prev ? { ...prev, completed_steps: newCompletedSteps, is_completed: isCompleted } : null);
        }

        // Refresh phase progress
        const phaseRes = await fetch(`/api/phase/${phaseId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (phaseRes.ok) setPhase(await phaseRes.json());
        onProgress?.();
      }
    } catch (err) {
      console.error("Failed to update progress", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!phase) return <div>Phase not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all shadow-sm group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-display font-bold text-slate-900">{phase.name}</h1>
              {hasBadge && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 shadow-sm">
                  <Trophy className="w-3 h-3" />
                  Certified
                </span>
              )}
              {phase.status === 'locked' && <Lock className="text-slate-400 w-5 h-5" />}
            </div>
            <p className="text-slate-500 font-medium">{phase.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {phase.progress_percentage === 100 && !hasBadge && (
             <motion.button 
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               onClick={handleCertify}
               disabled={isCertifying}
               className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2"
             >
               {isCertifying ? (
                 <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
               ) : (
                 <Sparkles className="w-4 h-4" />
               )}
               Claim Certificate
             </motion.button>
          )}

          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200">
          {[
            { id: 'learn', label: 'Learn', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'build', label: 'Build', icon: <Code2 className="w-4 h-4" /> },
            { id: 'progress', label: 'Progress', icon: <BarChart3 className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>

      <AnimatePresence mode="wait">
        {activeTab === 'learn' && (
          <motion.div 
            key="learn"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="glass p-10 rounded-[3rem] border-slate-200 bg-white shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <Sparkles className="text-cyan-500 w-6 h-6" />
                  Core Concepts
                </h2>
                <div className="prose prose-slate max-w-none">
                  <p className="text-lg text-slate-600 leading-relaxed mb-8">
                    In this phase, you will dive deep into the fundamental building blocks of {phase.name.split(':')[1]?.trim() || 'the subject'}. 
                    We focus on practical application rather than just theory.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { title: "Project Lifecycle", desc: "Understand how to manage a project from start to finish." },
                      { title: "Architecture", desc: "Learn the high-level structure of modern applications." },
                      { title: "Best Practices", desc: "Write clean, maintainable, and efficient code." },
                      { title: "AI Workflows", desc: "Learn how to use AI to speed up your development." },
                    ].map((concept, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-white hover:shadow-md transition-all cursor-default group"
                      >
                        <h4 className="font-bold text-slate-900 mb-2 group-hover:text-cyan-600 transition-colors">{concept.title}</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">{concept.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass p-8 rounded-[2.5rem] border-slate-200 bg-white shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Zap className="text-amber-500 w-5 h-5" />
                  Flash Resources
                </h3>
                <div className="space-y-4">
                  {[
                    "Cheatsheet: Core Syntax",
                    "Video: Architecture Overview",
                    "Design: Layout Patterns",
                    "Interactive: Logic Lab"
                  ].map((res, i) => (
                    <button 
                      key={i} 
                      onClick={() => setSelectedResource(res)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-cyan-200 hover:bg-slate-50 transition-all group shadow-sm active:scale-95"
                    >
                      <span className="text-sm font-bold text-slate-600 group-hover:text-cyan-600">{res}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'build' && (
          <motion.div 
            key="build"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full"
          >
            {selectedProject ? (
              <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden sm:p-4">
                {/* Header Bar */}
                <div className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedProject(null)}
                      className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-white font-bold leading-none mb-1">{selectedProject.title}</h2>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                             className="h-full bg-cyan-500"
                             initial={{ width: 0 }}
                             animate={{ width: `${(selectedProject.completed_steps.length / selectedProject.steps.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                           {Math.round((selectedProject.completed_steps.length / selectedProject.steps.length) * 100)}% Complete
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsTutorOpen(!isTutorOpen)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isTutorOpen ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Sparkles className="w-4 h-4" />
                      AI Tutor
                    </button>
                    {selectedProject.is_completed && (
                       <button 
                         onClick={() => setActiveTab('progress')} // Navigate to submission
                         className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                       >
                         <Trophy className="w-4 h-4" />
                         Submit Project
                       </button>
                    )}
                  </div>
                </div>

                {/* Main Builder Area: Three Panels layout */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950">
                  {/* Sidebar: Steps & Instructions */}
                  <div className="w-full lg:w-96 bg-white border-r border-slate-200 flex flex-col overflow-hidden shrink-0 z-10">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                       <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Project Guide</h3>
                       <span className="text-xs font-bold text-slate-500">{currentStepIndex + 1} / {selectedProject.steps.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
                      {/* Current Step Content */}
                      <div>
                        <h4 className="text-xl font-bold text-slate-900 mb-3">{selectedProject.steps[currentStepIndex].title}</h4>
                        <div className="prose prose-sm prose-slate">
                           <p className="text-slate-600 leading-relaxed">
                             {selectedProject.tutorial_data?.find(s => s.step === currentStepIndex)?.content || selectedProject.steps[currentStepIndex].desc}
                           </p>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                         <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                           <Zap className="w-3 h-3 text-amber-500" />
                           Your Tasks
                         </h5>
                         <div className="space-y-4">
                            {(selectedProject.tutorial_data?.find(s => s.step === currentStepIndex)?.instructions || 
                              `1. Review the requirement descriptions for "${selectedProject.steps[currentStepIndex]?.title}".\n2. Open the code workspace and implement the relevant features.\n3. Verify your results on the dynamic visual preview on the right.\n4. Complete the current step and proceed to the next milestone in your Build Roadmap.`)
                              .split('\n').map((inst, i) => (
                              <div key={i} className="flex gap-3 text-sm text-slate-600 font-medium leading-relaxed">
                                <div className="w-5 h-5 rounded-md bg-white border-2 border-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold">
                                  {i + 1}
                                </div>
                                {inst.replace(/^\d+\.\s*/, '')}
                              </div>
                            ))}
                         </div>
                      </div>

                      {/* Step Navigation List */}
                      <div className="pt-8 border-t border-slate-100">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Build Roadmap</h3>
                        <div className="space-y-2">
                          {selectedProject.steps.map((step, i) => (
                            <button 
                              key={i}
                              onClick={() => handleStepChange(i)}
                              className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group ${
                                i === currentStepIndex 
                                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
                                  : 'hover:bg-slate-50 text-slate-500'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all ${
                                i === currentStepIndex 
                                  ? 'border-white/20 bg-white/10' 
                                  : selectedProject.completed_steps.includes(i)
                                    ? 'border-emerald-100 bg-emerald-50 text-emerald-500'
                                    : 'border-slate-100 bg-white group-hover:border-slate-200'
                              }`}>
                                {selectedProject.completed_steps.includes(i) ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <span className="text-[10px] font-bold">{i + 1}</span>
                                )}
                              </div>
                              <div className="text-left overflow-hidden">
                                <div className={`text-xs font-bold leading-tight truncate ${i === currentStepIndex ? 'text-white' : 'text-slate-900'}`}>
                                  {step.title}
                                </div>
                                {i === currentStepIndex && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="text-[10px] text-slate-400 mt-1 font-medium"
                                  >
                                    Active Now
                                  </motion.div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                       <button 
                         onClick={() => handleStepToggle(selectedProject.id, currentStepIndex)}
                         className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                           selectedProject.completed_steps.includes(currentStepIndex)
                             ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                             : 'bg-slate-900 text-white hover:bg-slate-800'
                         }`}
                       >
                         {selectedProject.completed_steps.includes(currentStepIndex) ? (
                           <>
                             <CheckCircle2 className="w-5 h-5" />
                             Completed
                           </>
                         ) : (
                           <>
                             <Circle className="w-5 h-5" />
                             Complete Step {currentStepIndex + 1}
                           </>
                         )}
                       </button>

                       {/* Simple Navigation between steps */}
                       <div className="grid grid-cols-2 gap-3 mt-4">
                          <button 
                            disabled={currentStepIndex === 0}
                            onClick={() => handleStepChange(currentStepIndex - 1)}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-900 transition-all disabled:opacity-30 text-xs font-bold"
                          >
                             <ChevronLeft className="w-4 h-4" /> Previous
                          </button>
                          <button 
                            disabled={currentStepIndex === selectedProject.steps.length - 1}
                            onClick={() => handleStepChange(currentStepIndex + 1)}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-900 transition-all disabled:opacity-30 text-xs font-bold"
                          >
                             Next <ChevronRight className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  </div>

                  {/* Center Panel: Code Workspace (Monaco Editor) */}
                  <div className="flex-1 flex flex-col border-r border-white/5 bg-slate-900 overflow-hidden relative">
                     {/* Editor Settings / Header */}
                     <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-950/80 relative z-10 font-mono">
                        <div className="flex items-center gap-3">
                           <span className="px-2.5 py-1 bg-white/5 text-cyan-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-white/5">
                              index.html
                           </span>
                           {saveStatus === 'saving' && (
                             <span className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                               <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                               Saving...
                             </span>
                           )}
                           {saveStatus === 'saved' && (
                             <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                               <CheckCircle2 className="w-3.5 h-3.5" />
                               Autosaved
                             </span>
                           )}
                        </div>
                        <div className="flex items-center gap-4">
                           <button 
                             onClick={() => {
                               const stepData = selectedProject.tutorial_data?.find(s => s.step === currentStepIndex);
                               const starter = stepData?.starterCode || '';
                               setCode(starter);
                               saveStatus !== 'saving' && setSaveStatus('saving');
                             }}
                             className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-[10px] font-bold uppercase transition-colors"
                             title="Revert template changes to default starter code"
                           >
                              <RotateCw className="w-3 h-3" />
                              Reset Template
                           </button>
                           <button 
                             onClick={() => {
                               navigator.clipboard.writeText(code);
                               setCopied(true);
                               setTimeout(() => setCopied(false), 2000);
                             }}
                             className="flex items-center gap-1.5 text-slate-400 hover:text-white text-[10px] font-bold uppercase transition-colors"
                           >
                              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              Copy starter
                           </button>
                        </div>
                     </div>

                     {/* The Monaco Editor container */}
                     <div className="flex-1 relative overflow-hidden flex flex-col pt-2 bg-slate-900">
                        <MonacoEditor
                          theme="vs-dark"
                          language="html"
                          value={code}
                          onChange={(newVal) => setCode(newVal || '')}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            lineNumbers: "on",
                            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                            cursorBlinking: "smooth",
                            smoothScrolling: true,
                            wordWrap: "on",
                            padding: { top: 16, bottom: 16 }
                          }}
                        />
                     </div>
                  </div>

                  {/* Right Panel: Live Educational Preview Simulator */}
                  <div className="w-full lg:w-[42%] flex flex-col bg-slate-950 relative overflow-hidden border-t lg:border-t-0 border-white/5 shrink-0 z-10">
                     <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-950/80 font-mono font-bold uppercase tracking-widest">
                        {/* Device Emulation Selection */}
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                           <button 
                             onClick={() => setPreviewDevice('desktop')}
                             className={`p-1.5 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}
                             title="Fluid Full Screen size"
                           >
                             <Monitor className="w-3.5 h-3.5" />
                           </button>
                           <button 
                             onClick={() => setPreviewDevice('tablet')}
                             className={`p-1.5 rounded-md transition-all ${previewDevice === 'tablet' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}
                             title="Emulate Tablet size (768px)"
                           >
                             <Tablet className="w-3.5 h-3.5" />
                           </button>
                           <button 
                             onClick={() => setPreviewDevice('mobile')}
                             className={`p-1.5 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}
                             title="Emulate Mobile size (375px)"
                           >
                             <Smartphone className="w-3.5 h-3.5" />
                           </button>
                        </div>

                        {/* Middle Dimension Info Tag */}
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider hidden sm:inline">
                          {previewDevice === 'desktop' && "Fluid Preview"}
                          {previewDevice === 'tablet' && "768px (iPad Air)"}
                          {previewDevice === 'mobile' && "375px (iPhone 15)"}
                        </span>

                        {/* Open Full Sandbox executing page inside Blob URL */}
                        <button 
                          onClick={() => {
                            const blob = new Blob([code], { type: 'text/html' });
                            const blobUrl = URL.createObjectURL(blob);
                            window.open(blobUrl, '_blank');
                          }}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-white transition-all bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 active:scale-95"
                        >
                           <ExternalLink className="w-3 h-3" />
                           Sandbox Page
                        </button>
                     </div>

                     {/* Previews Area with centered simulator frames */}
                     <div className="flex-1 p-6 flex items-center justify-center bg-slate-900/40 overflow-hidden relative">
                         <div className="w-full h-full flex items-center justify-center overflow-auto">
                            {previewDevice === 'desktop' && (
                               <div className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden relative">
                                  <iframe
                                    srcDoc={code}
                                    title="Fluid Preview Workspace"
                                    className="w-full h-full border-0"
                                    sandbox="allow-scripts"
                                  />
                               </div>
                            )}

                            {previewDevice === 'tablet' && (
                               <div className="w-[768px] max-w-full h-full bg-white rounded-3xl shadow-2xl border-[10px] border-slate-800 flex flex-col shrink-0">
                                  <div className="h-6 w-full bg-slate-800 flex items-center justify-center">
                                    <div className="w-12 h-1 bg-slate-700 rounded-full" />
                                  </div>
                                  <div className="flex-1 bg-white relative">
                                     <iframe
                                       srcDoc={code}
                                       title="Tablet Simulation"
                                       className="w-full h-full border-0"
                                       sandbox="allow-scripts"
                                     />
                                  </div>
                               </div>
                            )}

                            {previewDevice === 'mobile' && (
                               <div className="w-[375px] max-w-full h-[640px] bg-white rounded-[2.5rem] shadow-2xl border-[12px] border-slate-800 flex flex-col relative shrink-0">
                                  <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 flex items-center justify-center z-20">
                                    <div className="w-20 h-4 bg-black rounded-b-xl flex items-center justify-center">
                                      <div className="w-2 h-2 rounded-full bg-white/10" />
                                    </div>
                                  </div>
                                  <div className="flex-1 bg-white rounded-[1.8rem] overflow-hidden relative pt-6">
                                     <iframe
                                       srcDoc={code}
                                       title="Smartphone Simulation"
                                       className="w-full h-full border-0"
                                       sandbox="allow-scripts"
                                     />
                                  </div>
                               </div>
                            )}
                         </div>
                     </div>

                     {/* Submission Floating Notification Overlay when all checked */}
                     {selectedProject.completed_steps.length === selectedProject.steps.length && (
                        <motion.div 
                          initial={{ y: 80, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="absolute bottom-6 left-6 right-6 bg-emerald-500 rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 z-20 border border-emerald-400"
                        >
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                 <Trophy className="text-white w-5 h-5" />
                              </div>
                              <div className="text-center sm:text-left">
                                 <h4 className="text-white font-bold text-sm leading-tight leading-none mb-0.5 animate-pulse">Perfect! All steps completed.</h4>
                                 <p className="text-emerald-100 text-[11px]">Submission panel opened in the Progress overview.</p>
                              </div>
                           </div>
                           <button 
                             onClick={() => {
                               setSelectedProject(null);
                               setActiveTab('progress');
                             }}
                             className="w-full sm:w-auto px-6 py-2.5 bg-white text-emerald-600 rounded-xl font-bold text-xs shadow-lg hover:scale-105 transition-all"
                           >
                              Next: Submit urls
                           </button>
                        </motion.div>
                     )}
                  </div>
                </div>

                {/* AI Tutor Sidebar / Overlay */}
                <AnimatePresence>
                  {isTutorOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsTutorOpen(false)}
                        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40"
                      />
                      <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white shadow-2xl z-50 flex flex-col"
                      >
                         <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                               <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                  <Sparkles className="w-6 h-6" />
                               </div>
                               <div>
                                  <h3 className="font-bold text-slate-900 leading-none mb-1">VibeLab AI Tutor</h3>
                                  <div className="flex items-center gap-1.5">
                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Online & Ready</span>
                                  </div>
                               </div>
                            </div>
                            <button onClick={() => setIsTutorOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                               <X className="w-5 h-5 text-slate-400" />
                            </button>
                         </div>

                         <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin">
                            {tutorMessages.length === 0 && (
                               <div className="text-center py-12 px-6">
                                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500 border-2 border-dashed border-slate-200">
                                     <MessageSquare className="w-8 h-8" />
                                  </div>
                                  <h4 className="font-bold text-slate-900 mb-2">Hello! How can I help?</h4>
                                  <p className="text-slate-500 text-sm leading-relaxed">
                                     I'm here to help you with the "{selectedProject.steps[currentStepIndex].title}" step. Ask me about the code, concepts, or if you're stuck!
                                  </p>
                                  <div className="mt-8 flex flex-wrap justify-center gap-2">
                                     {["Explain this step", "Help with my code", "Show me an example"].map((hint, i) => (
                                        <button 
                                          key={i}
                                          onClick={() => {
                                            setTutorInput(hint);
                                          }}
                                          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all"
                                        >
                                           {hint}
                                        </button>
                                     ))}
                                  </div>
                               </div>
                            )}
                            {tutorMessages.map((msg, i) => (
                               <motion.div 
                                 key={i}
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                               >
                                  <div className={`max-w-[85%] rounded-[2rem] p-5 text-sm leading-relaxed ${
                                    msg.role === 'user' 
                                      ? 'bg-slate-900 text-white shadow-lg' 
                                      : 'bg-slate-50 text-slate-700 border border-slate-100'
                                  }`}>
                                     {msg.content}
                                  </div>
                               </motion.div>
                            ))}
                            {tutorLoading && (
                               <div className="flex justify-start">
                                  <div className="bg-slate-50 border border-slate-100 rounded-full px-6 py-4 flex gap-2">
                                     <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                     <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                     <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                                  </div>
                               </div>
                            )}
                         </div>

                         <div className="p-8 border-t border-slate-100 bg-white">
                            <form onSubmit={handleAskTutor} className="relative">
                               <input 
                                 type="text"
                                 placeholder="Type your question..."
                                 className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-6 pr-14 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                                 value={tutorInput}
                                 onChange={e => setTutorInput(e.target.value)}
                               />
                               <button 
                                 type="submit"
                                 disabled={!tutorInput.trim() || tutorLoading}
                                 className="absolute right-2 top-2 w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                               >
                                  <Send className="w-5 h-5" />
                               </button>
                            </form>
                            <p className="text-[10px] text-slate-400 text-center mt-4 font-medium uppercase tracking-widest">
                               Powered by Gemini Flash 3
                            </p>
                         </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.map((project) => (
                  <motion.div
                    key={project.id}
                    whileHover={{ y: -8 }}
                    className="glass p-8 rounded-[2.5rem] border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {project.difficulty}
                      </span>
                      {project.is_completed && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                    </div>
                    
                    <h3 className="text-2xl font-display font-bold text-slate-900 mb-3 group-hover:text-cyan-600 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8 line-clamp-2">
                      {project.description}
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Progress</span>
                        <span>{Math.round((project.completed_steps.length / project.steps.length) * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-cyan-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${(project.completed_steps.length / project.steps.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    <button className="w-full mt-8 py-3 rounded-xl bg-slate-50 text-slate-900 font-bold text-sm group-hover:bg-slate-900 group-hover:text-white transition-all flex items-center justify-center gap-2">
                      {project.is_completed ? 'Review project' : 'Start building'}
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                ))}

                {projects.length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Code2 className="text-slate-400 w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No projects yet</h3>
                    <p className="text-slate-500">We're still crafting the curriculum for this phase.</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'progress' && (
          <motion.div 
            key="progress"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid lg:grid-cols-2 gap-8"
          >
            <div className="space-y-8">
              <div className="glass p-10 rounded-[3rem] border-slate-200 bg-white shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-100/30 rounded-full blur-3xl -mr-32 -mt-32" />
                <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3 relative z-10">
                  <BarChart3 className="text-indigo-500 w-6 h-6" />
                  Phase Stats
                </h2>
                
                <div className="space-y-10 relative z-10">
                  <div className="text-center p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 ring-4 ring-white shadow-inner">
                    <div className="text-6xl font-display font-black text-slate-900 mb-2">{phase.progress_percentage}%</div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Phase Completion</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl border border-slate-100 bg-white/50 text-center shadow-sm">
                      <div className="text-2xl font-bold text-slate-900 mb-1">
                        {projects.filter(p => p.completed_steps.length === p.steps.length).length} / {projects.length}
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projects Finished</p>
                    </div>
                    <div className="p-6 rounded-2xl border border-slate-100 bg-white/50 text-center shadow-sm">
                      <div className="text-2xl font-bold text-slate-900 mb-1">
                        {projects.reduce((acc, p) => acc + (p.completed_steps?.length || 0), 0)}
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Steps Completed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submission Section */}
              <div className="glass p-10 rounded-[3rem] border-slate-200 bg-white shadow-sm overflow-hidden relative">
                 <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3 relative z-10">
                   <Code2 className="text-emerald-500 w-6 h-6" />
                   Project Submissions
                 </h2>
                 
                 <div className="space-y-4 relative z-10">
                   {projects.filter(p => p.completed_steps.length === p.steps.length).length === 0 ? (
                     <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-100">
                        <p className="text-sm text-slate-500">Finish at least one project in the Build tab to enable submission!</p>
                     </div>
                   ) : (
                     projects.filter(p => p.completed_steps.length === p.steps.length).map(proj => {
                        const isSelected = submitProjectId === proj.id;
                        const existingSub = userSubmissions.find((s: any) => s.project_id === proj.id);
                        return (
                          <div key={proj.id} className={`rounded-3xl border transition-all ${isSelected ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-white'}`}>
                             <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                      <CheckCircle2 className="w-5 h-5" />
                                   </div>
                                   <div>
                                      <h4 className="font-bold text-slate-900 leading-none mb-1">{proj.title}</h4>
                                      {existingSub ? (
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Submitted &amp; Ready for Review</p>
                                      ) : (
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Ready to Submit</p>
                                      )}
                                   </div>
                                </div>
                                <button 
                                  onClick={() => setSubmitProjectId(isSelected ? null : proj.id)}
                                  className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${isSelected ? 'bg-white text-slate-400 border border-slate-200' : (existingSub ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-900 text-white shadow-lg shadow-slate-900/10')}`}
                                >
                                   {isSelected ? 'Cancel' : (existingSub ? 'Edit Submission' : 'Submit Now')}
                                </button>
                             </div>

                             {isSelected && (
                               <motion.div 
                                 initial={{ height: 0, opacity: 0 }}
                                 animate={{ height: 'auto', opacity: 1 }}
                                 className="px-6 pb-6 pt-2 border-t border-emerald-100"
                               >
                                 <form 
                                   onSubmit={(e) => {
                                     e.preventDefault();
                                     handleProjectSubmission(e, proj);
                                   }} 
                                   className="space-y-4 mt-4"
                                 >
                                   <div>
                                     <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">GitHub URL</label>
                                     <input 
                                       type="url"
                                       placeholder="https://github.com/vibelab/project"
                                       className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
                                       value={submission.github_url}
                                       onChange={(e) => setSubmission(s => ({ ...s, github_url: e.target.value }))}
                                       required
                                     />
                                   </div>
                                   <div>
                                     <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Live Demo URL</label>
                                     <input 
                                       type="url"
                                       placeholder="https://vibelab-demo.vercel.app"
                                       className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
                                       value={submission.live_url}
                                       onChange={(e) => setSubmission(s => ({ ...s, live_url: e.target.value }))}
                                     />
                                   </div>
                                   <button 
                                     disabled={isSubmitting}
                                     className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all"
                                   >
                                      {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <Sparkles className="w-4 h-4" />
                                          Confirm Submission
                                        </>
                                      )}
                                   </button>
                                   {submissionStatus === 'success' && <p className="text-[10px] font-bold text-emerald-500 text-center uppercase tracking-widest">Saved Successfully!</p>}
                                 </form>
                               </motion.div>
                             )}
                          </div>
                        );
                     })
                   )}
                 </div>
              </div>
            </div>

            <div className="glass p-10 rounded-[3rem] border-slate-200 bg-white shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl -mr-32 -mt-32" />
              <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3 relative z-10">
                <Trophy className="text-amber-500 w-6 h-6" />
                Phase Rewards
              </h2>
              
              <div className="space-y-6 relative z-10">
                {[
                  { title: "Foundations Badge", desc: "Awarded for completing all projects in this phase.", locked: !hasBadge, icon: <Star className="w-8 h-8 text-amber-400 fill-amber-400" /> },
                  { title: "Verified Skills", desc: "Skills from this phase are added to your digital profile.", locked: !hasBadge, icon: <Sparkles className="w-8 h-8 text-cyan-400" />, skills: ["Project Lifecycle", "Architecture", "Best Practices", "AI Workflows"] },
                ].map((reward, i) => (
                  <div key={i} className={`p-6 rounded-3xl border flex flex-col gap-6 transition-all ${reward.locked ? 'opacity-40 grayscale bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-lg ring-1 ring-slate-100'}`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${reward.locked ? 'bg-slate-200' : 'bg-gradient-to-br from-slate-50 to-white shadow-inner'}`}>
                        {React.cloneElement(reward.icon as React.ReactElement, { className: `${(reward.icon as React.ReactElement).props.className} ${reward.locked ? 'text-slate-400 !fill-none' : ''}` })}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 leading-tight">{reward.title}</h4>
                        <p className="text-sm text-slate-500 mt-1">{reward.desc}</p>
                        {!reward.locked && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                             Claimed
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {reward.skills && !reward.locked && (
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                        {reward.skills.map((skill, si) => (
                          <span key={si} className="px-3 py-1 bg-cyan-50 text-cyan-600 rounded-lg text-xs font-bold border border-cyan-100 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {!hasBadge && phase.progress_percentage === 100 && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 text-center shadow-xl shadow-indigo-100"
                   >
                     <p className="text-sm font-bold text-indigo-700 mb-3">You've mastered this phase!</p>
                     <button 
                       onClick={handleCertify}
                       disabled={isCertifying}
                       className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
                     >
                       {isCertifying ? 'Processing...' : 'Claim Phase Certificate'}
                     </button>
                   </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedResource && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedResource(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-indigo-500" />
               <div className="flex items-center justify-between mb-8">
                 <h2 className="text-2xl font-bold text-slate-900">{selectedResource}</h2>
                 <button 
                   onClick={() => setSelectedResource(null)}
                   className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                 >
                   <ArrowLeft className="w-5 h-5 text-slate-400 rotate-90" />
                 </button>
               </div>

               <div className="aspect-video bg-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-400 mb-8 border-2 border-dashed border-slate-200">
                  <Play className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium">Resource content preview for Phase 1</p>
                  <p className="text-[10px] uppercase tracking-widest font-black mt-2">Locked to VibeLab premium</p>
               </div>

               <div className="space-y-4">
                 <p className="text-slate-600 leading-relaxed">
                   This resource covers essential concepts required for the {phase.name.split(':')[1]?.trim()} module. 
                   Review the content carefully as these topics will be directly applied in your builds.
                 </p>
                 <div className="flex gap-3">
                   <button className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-900/10">
                     Download PDF
                   </button>
                   <button className="flex-1 py-3 bg-slate-50 text-slate-600 border border-slate-100 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all">
                     External Link
                   </button>
                 </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowSuccessModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 40 }}
              className="bg-white rounded-[3rem] p-12 max-w-lg w-full shadow-2xl text-center relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 animate-gradient" />
               <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-amber-50/50">
                 <Trophy className="w-12 h-12 text-amber-500" />
               </div>
               
               <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">Congratulations!</h2>
               <p className="text-slate-600 mb-8 leading-relaxed">
                 You have successfully completed all projects and requirements for <strong>{phase.name}</strong>. 
                 Your badge has been issued and your digital profile is updated.
               </p>

               <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 mb-8">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">New Reward Unlocked</p>
                 <div className="flex items-center justify-center gap-3">
                   <Star className="text-amber-400 fill-amber-400 w-5 h-5" />
                   <span className="font-bold text-slate-900">Foundations Phase Badge</span>
                 </div>
               </div>

               <button 
                 onClick={() => {
                   setShowSuccessModal(false);
                   onBack();
                 }}
                 className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"
               >
                 Continue to Next Phase
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
