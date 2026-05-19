import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Star
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
        setProjects(projectsData);
        
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
    if (selectedProject) {
      fetchUserSubmission(selectedProject.id);
    }
  }, [selectedProject?.id]);

  const fetchUserSubmission = async (projectId: number) => {
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/user/submissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const subs = await res.json();
        const existing = subs.find((s: any) => s.project_id === projectId);
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
    } catch (err) {
      console.error("Failed to fetch submission", err);
    }
  };

  const handleProjectSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
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
          projectId: selectedProject.id,
          phaseId: phaseId,
          githubUrl: submission.github_url,
          liveUrl: submission.live_url,
          description: submission.description
        })
      });

      if (response.ok) {
        setSubmissionStatus('success');
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
          isCompleted
        })
      });

      if (response.ok) {
        // Optimistic update
        setProjects(prev => prev.map(p => 
          p.id === projectId 
            ? { ...p, completed_steps: newCompletedSteps, is_completed: isCompleted } 
            : p
        ));
        
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
          >
            {selectedProject ? (
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="glass p-10 rounded-[3rem] border-slate-200 bg-white shadow-sm overflow-hidden relative">
                    <button 
                      onClick={() => setSelectedProject(null)}
                      className="absolute top-8 left-8 text-slate-400 hover:text-slate-900 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to projects
                    </button>

                    <div className="mt-12">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-3 py-1 bg-cyan-100 text-cyan-600 rounded-full text-[10px] font-black uppercase tracking-widest leading-loose">
                          {selectedProject.difficulty}
                        </span>
                      </div>
                      <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">{selectedProject.title}</h2>
                      <p className="text-slate-500 font-medium mb-10">{selectedProject.description}</p>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-slate-900 uppercase tracking-widest text-[10px]">Build Steps</h3>
                          <span className="text-xs font-bold text-slate-400">
                            {selectedProject.completed_steps.length} / {selectedProject.steps.length}
                          </span>
                        </div>
                        
                        <div className="space-y-4">
                          {selectedProject.steps.map((step, i) => (
                            <div 
                              key={i}
                              className={`p-6 rounded-2xl border transition-all ${
                                selectedProject.completed_steps.includes(i) 
                                  ? 'bg-emerald-50 border-emerald-100' 
                                  : 'bg-slate-50 border-slate-100'
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <button 
                                  onClick={() => handleStepToggle(selectedProject.id, i)}
                                  className={`mt-1 shrink-0 ${
                                    selectedProject.completed_steps.includes(i) 
                                      ? 'text-emerald-500' 
                                      : 'text-slate-300 hover:text-slate-500'
                                  }`}
                                >
                                  {selectedProject.completed_steps.includes(i) ? (
                                    <CheckCircle2 className="w-6 h-6" />
                                  ) : (
                                    <Circle className="w-6 h-6" />
                                  )}
                                </button>
                                <div>
                                  <h4 className={`font-bold transition-all ${
                                    selectedProject.completed_steps.includes(i) 
                                      ? 'text-emerald-900 line-through opacity-60' 
                                      : 'text-slate-900'
                                  }`}>
                                    {step.title}
                                  </h4>
                                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{step.desc}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="glass p-8 rounded-[2.5rem] border-slate-200 bg-white shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Info className="text-blue-500 w-5 h-5" />
                      Requirements
                    </h3>
                    <ul className="space-y-3">
                      {selectedProject.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                          <span className="text-sm font-medium text-slate-600">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                    <h3 className="text-xl font-bold mb-4">Stuck?</h3>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                      Our AI Tutor is available 24/7 to help you troubleshoot your code or explain complex concepts.
                    </p>
                    <button className="w-full bg-white text-slate-900 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                       Ask AI Tutor
                    </button>
                  </div>

                  {selectedProject.is_completed && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass p-8 rounded-[2.5rem] border-emerald-100 bg-white shadow-xl shadow-emerald-500/5 ring-1 ring-emerald-500/20"
                    >
                      <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Trophy className="text-amber-500 w-5 h-5" />
                        Project Submission
                      </h3>
                      
                      <form onSubmit={handleProjectSubmission} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">GitHub URL</label>
                          <input 
                            type="url"
                            placeholder="https://github.com/vibelab/project"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                            value={submission.github_url}
                            onChange={(e) => setSubmission(s => ({ ...s, github_url: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Live URL (Optional)</label>
                          <input 
                            type="url"
                            placeholder="https://project.vercel.app"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                            value={submission.live_url}
                            onChange={(e) => setSubmission(s => ({ ...s, live_url: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Brief Description</label>
                          <textarea 
                            placeholder="What challenges did you face? How did you solve them?"
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all resize-none"
                            value={submission.description}
                            onChange={(e) => setSubmission(s => ({ ...s, description: e.target.value }))}
                          />
                        </div>

                        <button 
                          disabled={isSubmitting}
                          className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            submissionStatus === 'success' 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          ) : submissionStatus === 'success' ? (
                            <>
                              <CheckCircle2 className="w-5 h-5" />
                              Update Submission
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5" />
                              Submit Project
                            </>
                          )}
                        </button>

                        {submissionStatus === 'error' && (
                          <p className="text-rose-500 text-[10px] font-bold text-center">Failed to save submission. Try again.</p>
                        )}
                        {submissionStatus === 'success' && (
                          <p className="text-emerald-500 text-[10px] font-bold text-center">Submission successful! You can update it anytime.</p>
                        )}
                      </form>
                    </motion.div>
                  )}
                </div>
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
                      {projects.filter(p => projects.some(sp => sp.id === p.id && sp.completed_steps.length === sp.steps.length)).length} / {projects.length}
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

            <div className="glass p-10 rounded-[3rem] border-slate-200 bg-white shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl -mr-32 -mt-32" />
              <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3 relative z-10">
                <Trophy className="text-amber-500 w-6 h-6" />
                Phase Rewards
              </h2>
              
              <div className="space-y-6 relative z-10">
                {[
                  { title: "Foundations Badge", desc: "Awarded for completing all projects in this phase.", locked: phase.status !== 'completed', icon: <Star className="w-8 h-8 text-amber-400 fill-amber-400" /> },
                  { title: "Verified Skills", desc: "Skills from this phase are added to your digital profile.", locked: phase.status !== 'completed', icon: <Sparkles className="w-8 h-8 text-cyan-400" /> },
                ].map((reward, i) => (
                  <div key={i} className={`p-6 rounded-3xl border flex items-center gap-6 transition-all ${reward.locked ? 'opacity-40 grayscale bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-lg ring-1 ring-slate-100'}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${reward.locked ? 'bg-slate-200' : 'bg-gradient-to-br from-slate-50 to-white shadow-inner'}`}>
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
                ))}

                {!hasBadge && phase.progress_percentage === 100 && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 text-center"
                   >
                     <p className="text-sm font-bold text-indigo-600 mb-3">You are eligible for certification!</p>
                     <button 
                       onClick={handleCertify}
                       disabled={isCertifying}
                       className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200"
                     >
                       Claim Your Certificate
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
