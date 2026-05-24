import { useState, useRef, ChangeEvent, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Rocket, 
  BookOpen, 
  Users, 
  MessageSquare, 
  ChevronRight, 
  Settings,
  Bell,
  Search,
  Zap,
  Star,
  Clock,
  LogOut,
  Camera,
  ShieldCheck,
  AlertTriangle,
  Lock,
  LayoutDashboard,
  Trophy,
  Github,
  Link as LinkIcon,
  FileText,
  CheckCircle2
} from "lucide-react";
import PhaseView from "./PhaseView";
import Leaderboard from "./Leaderboard";

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onUpdateUser: (user: any) => void;
}

interface Phase {
  id: number;
  name: string;
  description: string;
  status: 'locked' | 'active' | 'completed';
  progress_percentage: number;
}

export default function Dashboard({ user, onLogout, onUpdateUser }: DashboardProps) {
  const [uploading, setUploading] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'phase' | 'submissions' | 'certificates' | 'leaderboard' | 'settings'>('overview');
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(true);
  const [progressData, setProgressData] = useState<{ phaseProgress: any[], projectProgress: any[] } | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [settingsError, setSettingsError] = useState<string>("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoadingPhases(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const [phasesRes, progressRes, subsRes, badgesRes] = await Promise.all([
        fetch('/api/phases', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/progress', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/user/submissions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/user/badges', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (phasesRes.ok) setPhases(await phasesRes.json());
      if (progressRes.ok) setProgressData(await progressRes.json());
      if (subsRes.ok) setUserSubmissions(await subsRes.json());
      if (badgesRes.ok) setBadges(await badgesRes.json());
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoadingPhases(false);
    }
  };

  const handlePhaseClick = (phaseId: number) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase?.status === 'locked') return;
    
    setSelectedPhaseId(phaseId);
    setActiveView('phase');
  };

  const completedProjects = progressData?.projectProgress.filter(p => p.is_completed).length || 0;
  const activeProjects = progressData?.projectProgress.filter(p => !p.is_completed).length || 0;
  const totalPhaseProgress = phases.length > 0 
    ? Math.round(phases.reduce((acc, p) => acc + (p.progress_percentage || 0), 0) / phases.length)
    : 0;

  const stats = [
    { label: "Active Projects", value: activeProjects.toString(), icon: <Rocket className="w-5 h-5 text-cyan-500" />, bg: "bg-cyan-50" },
    { label: "Projects Completed", value: completedProjects.toString(), icon: <Star className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50" },
    { label: "Certifications", value: badges.length.toString(), icon: <Trophy className="w-5 h-5 text-indigo-500" />, bg: "bg-indigo-50" },
    { label: "Total Progress", value: `${totalPhaseProgress}%`, icon: <Zap className="w-5 h-5 text-emerald-500" />, bg: "bg-emerald-50" },
  ];

  const underwayProjects = progressData?.projectProgress.filter(p => !p.is_completed).map(p => {
    // We would ideally fetch project titles too, but for simplicity let's just use what we have or 
    // maybe we just show generic "Phase Project" if name isn't in progress table
    const steps = JSON.parse(typeof p.completed_steps === 'string' ? p.completed_steps : JSON.stringify(p.completed_steps || []));
    // Since we don't have titles in projectProgress table, we'd need a join or fetch them
    // For now, let's just use the projects we have in the UI or fetch them
    return { name: `Project #${p.project_id}`, progress: steps.length * 25, category: "Curriculum", date: "In Progress" };
  }) || [];

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large. Max 2MB.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const token = localStorage.getItem('vibelab_token');
      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        const updatedUser = { ...user, avatar_url: data.avatarUrl };
        localStorage.setItem('vibelab_user', JSON.stringify(updatedUser));
        onUpdateUser(updatedUser);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      alert("Error uploading avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-slate-200 hidden lg:flex flex-col p-8 pt-24 sticky top-0 h-screen">
        <div className="relative group mb-10">
          <div className="flex items-center gap-4 px-2 py-3 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
            <div 
              onClick={handleAvatarClick}
              className="relative w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl uppercase overflow-hidden cursor-pointer group/avatar shrink-0"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || 'U'
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
            <div className="truncate">
              <p className="font-bold text-slate-900 truncate">{user?.name || 'User'}</p>
              <div className="flex items-center gap-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.role || 'Member'}</p>
                {user?.is_verified ? (
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-amber-500" title="Unverified" />
                )}
              </div>
            </div>
          </div>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto">
          <button 
            onClick={() => setActiveView('overview')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
              activeView === 'overview' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Overview
          </button>

          <button 
            onClick={() => setActiveView('submissions')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
              activeView === 'submissions' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Github className="w-5 h-5" />
            My Submissions
          </button>

          <button 
            onClick={() => setActiveView('certificates')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
              activeView === 'certificates' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-5 h-5" />
            Certificates
          </button>

          <button 
            onClick={() => setActiveView('leaderboard')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
              activeView === 'leaderboard' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Users className="w-5 h-5" />
            Leaderboard
          </button>

          <button 
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
              activeView === 'settings' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>

          <div className="pt-6 pb-2 px-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Learning Path</p>
          </div>

          {loadingPhases ? (
            <div className="space-y-4 px-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            phases.map((phase) => (
              <button 
                key={phase.id}
                onClick={() => handlePhaseClick(phase.id)}
                disabled={phase.status === 'locked'}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all group ${
                  activeView === 'phase' && selectedPhaseId === phase.id
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                    : phase.status === 'locked'
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  {phase.status === 'locked' ? <Lock className="w-5 h-5 shrink-0" /> : <BookOpen className="w-5 h-5 shrink-0" />}
                  <span className="truncate">{phase.name}</span>
                </div>
                {phase.status === 'completed' && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
              </button>
            ))
          )}
        </nav>

        <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
           <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Public Verification</p>
              <p className="text-[11px] text-slate-500 mb-4 font-medium leading-relaxed">Share your verified builder profile with recruiters.</p>
            <div className="flex gap-2">
              <button 
                onClick={() => window.open(`/verify/${user.id}`, '_blank')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-[11px] font-bold hover:bg-slate-50 transition-all shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                View Profile
              </button>
              <button 
                onClick={() => {
                  const url = `${window.location.origin}/verify/${user.id}`;
                  navigator.clipboard.writeText(url);
                  alert('Link copied to clipboard!');
                }}
                className="flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                title="Copy profile link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
            </div>
           </div>
           
           <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 md:p-12 pt-16 lg:pt-32 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {activeView === 'overview' ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Mobile Profile Bar */}
                <div className="lg:hidden flex items-center justify-between mb-8 pb-8 border-b border-slate-200">
                  <div className="flex items-center gap-4">
                    <div 
                      onClick={handleAvatarClick}
                      className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl uppercase overflow-hidden relative"
                    >
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user?.name?.[0] || 'U'
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{user?.name || 'User'}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.role || 'Member'}</p>
                        {user?.is_verified && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                      </div>
                    </div>
                  </div>
                  <button onClick={onLogout} className="p-2 text-red-500">
                    <LogOut className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                  <div>
                    <h1 className="text-4xl font-display font-bold text-slate-900 mb-2">Hello, {user?.name?.split(' ')[0] || 'there'}!</h1>
                    <p className="text-slate-500 font-medium italic">"Every project is a step towards mastery."</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search labs..." 
                        className="pl-11 pr-6 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:border-slate-900 transition-all font-medium text-sm w-44 lg:w-64"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
                        <Bell className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={fetchDashboardData}
                        className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        <Clock className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Visualization */}
                <div className="mb-12">
                   <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 md:p-10 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                      
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                        <div className="lg:col-span-4 space-y-6">
                           <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Curriculum Journey</p>
                              <h2 className="text-2xl font-display font-bold text-slate-900 leading-tight">Mastering AI & Engineering</h2>
                           </div>
                           
                           <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
                                    <CheckCircle2 size={18} />
                                 </div>
                                 <div>
                                    <p className="text-xs font-bold text-slate-900">{phases.filter(p => p.status === 'completed').length} Completed</p>
                                    <p className="text-[10px] text-slate-400 font-medium tracking-wide">Phases Mastered</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-emerald-900 flex items-center justify-center text-emerald-100 shadow-sm">
                                    <Zap size={18} />
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {phases.find(p => p.status === 'active')?.name || 'None Active'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium tracking-wide">Current Focus</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="lg:col-span-8">
                           <div className="relative">
                              {/* Connector Line */}
                              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${totalPhaseProgress}%` }}
                                   className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                                   transition={{ duration: 1.5, ease: "easeOut" }}
                                 />
                              </div>

                              {/* Progress Markers */}
                              <div className="relative flex justify-between items-center h-20">
                                 {phases.map((phase, idx) => {
                                   const isCompleted = phase.status === 'completed';
                                   const isActive = phase.status === 'active';
                                   return (
                                     <div key={idx} className="relative flex flex-col items-center">
                                       <motion.div 
                                         initial={{ scale: 0 }}
                                         animate={{ scale: 1 }}
                                         transition={{ delay: 0.5 + (idx * 0.1) }}
                                         className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 ${
                                           isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
                                           isActive ? 'bg-white border-4 border-emerald-500 text-emerald-500 shadow-xl' :
                                           'bg-white border-2 border-slate-200 text-slate-300'
                                         }`}
                                       >
                                         {isCompleted ? <CheckCircle2 size={16} /> : <span className="text-xs font-black">{idx + 1}</span>}
                                       </motion.div>
                                       {isActive && (
                                         <motion.div 
                                           initial={{ opacity: 0, y: 10 }}
                                           animate={{ opacity: 1, y: 0 }}
                                           className="absolute -bottom-8 whitespace-nowrap text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100"
                                         >
                                           In Progress
                                         </motion.div>
                                       )}
                                       {idx === phases.length - 1 && (
                                         <div className="absolute -top-8 right-0 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                           Goal: {phases.length}
                                         </div>
                                       )}
                                     </div>
                                   );
                                 })}
                              </div>
                           </div>
                           
                           <div className="mt-14 flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                 <div>
                                    <span className="block text-2xl font-display font-bold text-slate-900">{totalPhaseProgress}%</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Completion</span>
                                 </div>
                                 <div className="w-px h-10 bg-slate-100" />
                                 <div>
                                    <span className="block text-2xl font-display font-bold text-slate-900">{underwayProjects[0]?.name || 'N/A'}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1 max-w-[120px]">Current Build</span>
                                 </div>
                              </div>
                              {phases.some(p => p.status === 'active') && (
                                <button 
                                  onClick={() => {
                                    const activeP = phases.find(p => p.status === 'active');
                                    if (activeP) handlePhaseClick(activeP.id);
                                  }}
                                  className="hidden md:flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 group animate-fade-in"
                                >
                                  Continue Path
                                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                              )}
                           </div>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                  {stats.map((stat, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
                    >
                      <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-4`}>
                        {stat.icon}
                      </div>
                      <h3 className="text-2xl font-display font-bold text-slate-900 mb-1">{stat.value}</h3>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Active Projects */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-bold text-slate-900">Curriculum Progress</h2>
                    </div>
                    
                    <div className="space-y-4">
                      {underwayProjects.length > 0 ? underwayProjects.map((project, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group pointer-events-none"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{project.category}</span>
                              <h3 className="font-bold text-slate-900 text-lg">{project.name}</h3>
                            </div>
                            <span className="text-xs font-medium text-slate-400">{project.date}</span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                              <span className="text-slate-400">Completion</span>
                              <span className="text-slate-900">{project.progress > 100 ? 100 : project.progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-cyan-500" 
                                initial={{ width: 0 }}
                                animate={{ width: `${project.progress > 100 ? 100 : project.progress}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )) : (
                        <div className="p-12 text-center rounded-[2.5rem] bg-slate-50 border border-dashed border-slate-200">
                          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500 font-medium">No projects started yet. Pick a phase to begin!</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900">Recommended Next Step</h2>
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-cyan-500/30 transition-all" />
                      
                      <h3 className="text-2xl font-display font-bold mb-4 relative z-10">Advanced Neural Networks</h3>
                      <p className="text-slate-400 text-sm mb-8 leading-relaxed relative z-10">
                        Ready to dive deeper? Your next project focuses on building a custom LLM fine-tuned for creative writing.
                      </p>
                      
                      <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group relative z-10">
                        Start Project
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                    
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
                      <h3 className="font-bold text-slate-900 mb-6">Upcoming Workshops</h3>
                      <div className="space-y-6">
                        {[
                          { title: "Generative Art with Three.js", time: "Today, 4:00 PM" },
                          { title: "Building Scalable Backends", time: "Tomorrow, 2:00 PM" }
                        ].map((workshop, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="w-1 h-12 bg-cyan-500 rounded-full" />
                            <div>
                              <h4 className="font-bold text-sm text-slate-900">{workshop.title}</h4>
                              <p className="text-xs font-medium text-slate-400 mt-1">{workshop.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeView === 'leaderboard' ? (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Leaderboard />
              </motion.div>
            ) : activeView === 'submissions' ? (
              <motion.div
                key="submissions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h1 className="text-4xl font-display font-bold text-slate-900 mb-2">My Submissions</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Your project history and verified builds.</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-amber-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {userSubmissions.length > 0 ? userSubmissions.map((sub, i) => (
                    <motion.div 
                      key={sub.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-900">{sub.project_title}</h3>
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">Verified</span>
                          </div>
                          <p className="text-slate-500 text-sm font-medium line-clamp-1">{sub.description}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted on {new Date(sub.created_at).toLocaleDateString()}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <a 
                            href={sub.github_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-sm font-bold"
                          >
                            <Github className="w-4 h-4" />
                            GitHub
                          </a>
                          {sub.live_url && (
                             <a 
                              href={sub.live_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all text-sm font-bold shadow-lg shadow-slate-900/10"
                            >
                              <LinkIcon className="w-4 h-4" />
                              Live Demo
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="py-20 text-center rounded-[3rem] bg-slate-50 border border-dashed border-slate-200">
                      <FileText className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                      <h3 className="text-xl font-bold text-slate-900 mb-2">No submissions yet</h3>
                      <p className="text-slate-500 max-w-sm mx-auto">Complete all steps in a project to unlock the submission form and start building your portfolio.</p>
                      <button 
                        onClick={() => setActiveView('overview')}
                        className="mt-8 px-8 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all"
                      >
                        Browse Projects
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeView === 'settings' ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center justify-between mb-12">
                   <div>
                    <h1 className="text-4xl font-display font-bold text-slate-900 mb-2">Profile Settings</h1>
                    <p className="text-slate-500 font-medium">Customize your public presence and preferences.</p>
                  </div>
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900">
                    <Settings className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 shadow-sm max-w-2xl relative overflow-hidden">
                  <AnimatePresence>
                    {saveStatus === 'success' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8"
                      >
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Profile Saved!</h3>
                        <p className="text-slate-600 mb-8 max-w-md">Your profile settings have been successfully updated in the database.</p>
                        <button 
                          type="button"
                          onClick={() => setSaveStatus('idle')}
                          className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl transition-all shadow-md active:scale-95 font-display"
                        >
                          Back to Settings
                        </button>
                      </motion.div>
                    )}

                    {saveStatus === 'error' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8"
                      >
                        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                          <AlertTriangle className="w-10 h-10 text-rose-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Save Failed</h3>
                        <p className="text-rose-600/90 mb-8 max-w-md">{settingsError || "An error occurred while saving your profile settings."}</p>
                        <button 
                          type="button"
                          onClick={() => setSaveStatus('idle')}
                          className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl transition-all shadow-md active:scale-95 font-display"
                        >
                          Try Again
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setSettingsError("");
                    setSaveStatus('loading');
                    const formData = new FormData(e.currentTarget);
                    const updates = {
                      name: formData.get('name'),
                      country: formData.get('country'),
                      bio: formData.get('bio'),
                      github_username: formData.get('github_username')
                    };
                    
                    try {
                      const token = localStorage.getItem('vibelab_token');
                      const res = await fetch('/api/user/profile', {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(updates)
                      });
                      if (res.ok) {
                        const updatedUser = { ...user, ...updates };
                        localStorage.setItem('vibelab_user', JSON.stringify(updatedUser));
                        onUpdateUser(updatedUser);
                        setSaveStatus('success');
                      } else {
                        const data = await res.json();
                        setSettingsError(data.error || 'Update failed');
                        setSaveStatus('error');
                      }
                    } catch (err) {
                      setSettingsError('Error connecting to the server');
                      setSaveStatus('error');
                    }
                  }} className="space-y-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Display Name</label>
                       <input 
                        name="name"
                        defaultValue={user?.name}
                        placeholder="Your full name"
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-slate-900 transition-all font-medium"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Region / Country</label>
                       <select 
                        name="country"
                        defaultValue={user?.country || 'Worldwide'}
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-slate-900 transition-all font-medium appearance-none"
                       >
                         {['Worldwide', 'United States', 'United Kingdom', 'India', 'Pakistan', 'Germany', 'Canada', 'Nigeria', 'Singapore', 'Australia'].map(c => (
                           <option key={c} value={c}>{c}</option>
                         ))}
                       </select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Short Bio</label>
                       <textarea 
                        name="bio"
                        defaultValue={user?.bio}
                        placeholder="Tell the community about your build journey..."
                        rows={4}
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-slate-900 transition-all font-medium resize-none"
                       />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">GitHub Username</label>
                          <div className="relative">
                             <Github className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                             <input 
                              name="github_username"
                              defaultValue={user?.github_username}
                              placeholder="username"
                              className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-slate-900 transition-all font-medium"
                             />
                          </div>
                       </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={saveStatus === 'loading'}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] disabled:opacity-55"
                    >
                      {saveStatus === 'loading' ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              </motion.div>
            ) : activeView === 'certificates' ? (
              <motion.div
                key="certificates"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-5xl mx-auto"
              >
                <div className="flex items-center justify-between mb-12">
                   <div>
                    <h1 className="text-4xl font-display font-bold text-slate-900 mb-2">Certifications</h1>
                    <p className="text-slate-500 font-medium">Verified credentials for completed learning phases.</p>
                  </div>
                  <div className="w-16 h-16 bg-amber-50 rounded-[2rem] flex items-center justify-center shadow-lg shadow-amber-500/10">
                    <Trophy className="w-8 h-8 text-amber-500" />
                  </div>
                </div>

                {badges.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {badges.map((badge, i) => (
                      <motion.div 
                        key={badge.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="group relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all text-center">
                          <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Trophy className="w-10 h-10 text-amber-500" />
                          </div>
                          <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight uppercase tracking-widest">{badge.phase_name}</h3>
                          <div className="flex items-center justify-center gap-2 mb-6">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">Verified</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(badge.created_at).getFullYear()}</span>
                          </div>
                          <button className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 duration-300 shadow-xl shadow-slate-900/20">
                            Download Proof
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-24 text-center rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
                       <Trophy className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Greatness awaits</h3>
                    <p className="text-slate-500 max-w-sm mx-auto font-medium">Complete all projects in a phase to unlock your first verified certification badge.</p>
                    <button 
                      onClick={() => setActiveView('overview')}
                      className="mt-8 px-8 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                    >
                      Start Learning
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={selectedPhaseId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <PhaseView 
                  phaseId={selectedPhaseId!} 
                  onBack={() => {
                    setActiveView('overview');
                    fetchDashboardData(); // Update phases and progress
                  }} 
                  onProgress={fetchDashboardData}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
