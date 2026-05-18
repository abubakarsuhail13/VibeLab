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
}

export default function PhaseView({ phaseId, onBack }: PhaseViewProps) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'learn' | 'build' | 'progress'>('build');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [submission, setSubmission] = useState<Submission>({ github_url: '', live_url: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const fetchPhaseData = async () => {
    try {
      const token = localStorage.getItem('vibelab_token');
      const [phaseRes, projectsRes, submissionsRes] = await Promise.all([
        fetch(`/api/phase/${phaseId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/phase/${phaseId}/projects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/submissions/user', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (phaseRes.ok && projectsRes.ok) {
        setPhase(await phaseRes.json());
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
        
        if (submissionsRes.ok) {
          const userSubmissions = await submissionsRes.json();
          // We can populate submission state if the selected project is already submitted
          // But since we just fetched all projects, we'll wait for selection to populate form
          return userSubmissions; // pass it back if needed
        }
      }
    } catch (err) {
      console.error("Failed to fetch phase data", err);
    } finally {
      setLoading(false);
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
      const res = await fetch('/api/submissions/user', {
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
              {phase.status === 'completed' && <Trophy className="text-amber-500 w-6 h-6" />}
              {phase.status === 'locked' && <Lock className="text-slate-400 w-5 h-5" />}
            </div>
            <p className="text-slate-500 font-medium">{phase.description}</p>
          </div>
        </div>

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
                      <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                        <h4 className="font-bold text-slate-900 mb-2">{concept.title}</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">{concept.desc}</p>
                      </div>
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
                    <button key={i} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-cyan-200 hover:bg-slate-50 transition-all group">
                      <span className="text-sm font-bold text-slate-600 group-hover:text-cyan-600">{res}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
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
            <div className="glass p-10 rounded-[3rem] border-slate-200 bg-white shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                <BarChart3 className="text-indigo-500 w-6 h-6" />
                Phase Stats
              </h2>
              
              <div className="space-y-10">
                <div className="text-center p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100">
                  <div className="text-6xl font-display font-black text-slate-900 mb-2">{phase.progress_percentage}%</div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Phase Completion</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl border border-slate-100 text-center">
                    <div className="text-2xl font-bold text-slate-900 mb-1">
                      {projects.filter(p => p.is_completed).length} / {projects.length}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projects Finished</p>
                  </div>
                  <div className="p-6 rounded-2xl border border-slate-100 text-center">
                    <div className="text-2xl font-bold text-slate-900 mb-1">
                       {projects.reduce((acc, p) => acc + p.completed_steps.length, 0)}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Steps Completed</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass p-10 rounded-[3rem] border-slate-200 bg-white shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                <Trophy className="text-amber-500 w-6 h-6" />
                Phase Rewards
              </h2>
              
              <div className="space-y-6">
                {[
                  { title: "Foundations Badge", desc: "Awarded for completing all projects in this phase.", locked: phase.status !== 'completed' },
                  { title: "Verified Skills", desc: "Skills from this phase are added to your digital profile.", locked: phase.status !== 'completed' },
                ].map((reward, i) => (
                  <div key={i} className={`p-6 rounded-2xl border flex items-center gap-6 transition-all ${reward.locked ? 'opacity-50 grayscale' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                      <Star className={`w-8 h-8 ${reward.locked ? 'text-slate-200' : 'text-amber-400 fill-amber-400'}`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight">{reward.title}</h4>
                      <p className="text-sm text-slate-500 mt-1">{reward.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
