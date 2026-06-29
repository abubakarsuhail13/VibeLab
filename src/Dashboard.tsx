import React, { useState, useRef, ChangeEvent, useEffect, FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
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
  CheckCircle2,
  Send,
  GraduationCap,
  X,
  Plus,
  Trash2,
  BrainCircuit,
  Menu
} from "lucide-react";
import PhaseView from "./PhaseView";
import Leaderboard from "./Leaderboard";

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onUpdateUser: (user: any) => void;
  onNavigate?: (page: string) => void;
}

interface Phase {
  id: number;
  order_index: number;
  name: string;
  description: string;
  status: 'locked' | 'active' | 'completed';
  progress_percentage: number;
}

export function formatPhaseNameForUI(name: string): string {
  if (!name) return name;
  let parsedName = name;
  
  // Map textual phase names to standard numbers
  const wordMap: { [key: string]: string } = {
    'one': '1',
    'two': '2',
    'three': '3',
    'four': '4',
    'five': '5',
    'six': '6',
    'seven': '7',
    'eight': '8'
  };
  
  Object.keys(wordMap).forEach(key => {
    const regex = new RegExp(`Phase\\s+${key}`, 'gi');
    parsedName = parsedName.replace(regex, `Phase ${wordMap[key]}`);
  });
  
  // If the parsed string doesn't start with "Phase X", prepend it based on standard named matching
  if (!/Phase\s+\d+/i.test(parsedName)) {
    if (parsedName.toLowerCase().includes('discovery') || parsedName.toLowerCase().includes('ideation')) {
      return `Phase 1 — Discovery & Ideation`;
    }
    if (parsedName.toLowerCase().includes('product') || parsedName.toLowerCase().includes('creation')) {
      return `Phase 2 — Product Creation`;
    }
    if (parsedName.toLowerCase().includes('testing') || parsedName.toLowerCase().includes('validation')) {
      return `Phase 3 — Testing & Validation`;
    }
    if (parsedName.toLowerCase().includes('deployment')) {
      return `Phase 4 — Deployment`;
    }
    if (parsedName.toLowerCase().includes('portfolio') || parsedName.toLowerCase().includes('showcase')) {
      return `Phase 5 — Portfolio & Showcase`;
    }
  }
  
  return parsedName;
}

export default function Dashboard({ user, onLogout, onUpdateUser, onNavigate }: DashboardProps) {
  const [uploading, setUploading] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'phase' | 'submissions' | 'blueprints' | 'certificates' | 'leaderboard' | 'settings' | 'grading' | 'support'>('overview');
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(true);
  const [progressData, setProgressData] = useState<{ phaseProgress: any[], projectProgress: any[] } | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [loadingBlueprints, setLoadingBlueprints] = useState(false);
  const [expandedBlueprintId, setExpandedBlueprintId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [settingsError, setSettingsError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Teacher Workspace State Parameters
  const [cohortStudents, setCohortStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [cohortSubmissions, setCohortSubmissions] = useState<any[]>([]);
  const [loadingCohortSubmissions, setLoadingCohortSubmissions] = useState(false);
  
  // Scoring / review variables
  const [selectedReviewSubmission, setSelectedReviewSubmission] = useState<any | null>(null);
  const [reviewGrade, setReviewGrade] = useState("A");
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  // Academic support session variables
  const [supportSessions, setSupportSessions] = useState<any[]>([]);
  const [activeSessionStudent, setActiveSessionStudent] = useState<any | null>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Student communication helper
  const [studentChatOpen, setStudentChatOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMobileMenuOpen(false);
    const path = location.pathname;
    if (path === '/dashboard') {
      setActiveView('overview');
      setSelectedPhaseId(null);
    } else if (path === '/dashboard/blueprints') {
      setActiveView('blueprints');
      setSelectedPhaseId(null);
    } else if (path === '/dashboard/submissions') {
      setActiveView('submissions');
      setSelectedPhaseId(null);
    } else if (path === '/dashboard/certificates') {
      setActiveView('certificates');
      setSelectedPhaseId(null);
    } else if (path === '/settings') {
      setActiveView('settings');
      setSelectedPhaseId(null);
    } else if (path === '/leaderboard') {
      setActiveView('leaderboard');
      setSelectedPhaseId(null);
    } else if (path === '/dashboard/grading') {
      setActiveView('grading');
      setSelectedPhaseId(null);
    } else if (path === '/dashboard/support') {
      setActiveView('support');
      setSelectedPhaseId(null);
    } else if (path.startsWith('/phase/')) {
      const match = path.match(/\/phase\/(\d+)/);
      if (match) {
        const phaseId = parseInt(match[1], 10);
        if (phaseId === 1) {
          if (user?.ideation_completed) {
            setSelectedPhaseId(1);
            setActiveView('phase');
          } else {
            if (onNavigate) {
              onNavigate('ideation');
            } else {
              navigate('/ideation');
            }
          }
        } else {
          setSelectedPhaseId(phaseId);
          setActiveView('phase');
        }
      }
    }
  }, [location.pathname, user?.ideation_completed, navigate, onNavigate]);

  useEffect(() => {
    if (location.pathname === '/dashboard') {
      const showToast = localStorage.getItem('show_phase2_complete_toast');
      if (showToast === 'true') {
        localStorage.removeItem('show_phase2_complete_toast');
        toast.success(
          React.createElement('div', { className: 'space-y-1 py-1' },
            React.createElement('strong', { className: 'text-sm font-bold block text-slate-900 border-b border-slate-100 pb-1 mb-1' }, 'Phase 2 Complete 🎉'),
            React.createElement('p', { className: 'text-xs text-slate-500 font-medium leading-relaxed' }, 'Your MVP is ready. Phase 3 — Testing & Validation is now unlocked. You can review your full project anytime from the Product Creation section.')
          ),
          { duration: 7000 }
        );
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    if (user?.role === 'teacher') {
      fetchTeacherData();
    } else {
      fetchDashboardData();
    }
  }, [user]);

  const fetchTeacherData = async () => {
    setLoadingStudents(true);
    setLoadingCohortSubmissions(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const [studentsRes, submissionsRes, sessionsRes] = await Promise.all([
        fetch('/api/teacher/students', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/teacher/submissions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/teacher/support/sessions', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (studentsRes.ok) setCohortStudents(await studentsRes.json());
      if (submissionsRes.ok) setCohortSubmissions(await submissionsRes.json());
      if (sessionsRes.ok) setSupportSessions(await sessionsRes.json());
    } catch (err) {
      console.error("Failed to fetch teacher datasets", err);
    } finally {
      setLoadingStudents(false);
      setLoadingCohortSubmissions(false);
    }
  };

  const handleManualOverride = async (studentId: number, phaseId: number, status: string, progressPercentage: number) => {
    try {
      const token = localStorage.getItem('vibelab_token');
      const response = await fetch('/api/teacher/override-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentId, phaseId, status, progressPercentage })
      });
      if (response.ok) {
        alert("Progress override applied successfully!");
        fetchTeacherData();
      } else {
        const d = await response.json();
        alert(d.error || "Override failed");
      }
    } catch (e) {
      alert("Error connection mapping.");
    }
  };

  const handleReviewSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewSubmission) return;
    setIsSubmittingReview(true);
    setReviewMessage("");
    try {
      const token = localStorage.getItem('vibelab_token');
      const response = await fetch('/api/teacher/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          submissionId: selectedReviewSubmission.id,
          status: reviewStatus,
          grade: reviewGrade,
          reviewComment: reviewComment
        })
      });

      if (response.ok) {
        setReviewMessage("Review applied successfully!");
        setTimeout(() => {
          setSelectedReviewSubmission(null);
          setReviewComment("");
          setReviewMessage("");
        }, 1500);
        fetchTeacherData();
      } else {
        const data = await response.json();
        setReviewMessage(data.error || "Review submission failed.");
      }
    } catch (err) {
      setReviewMessage("Error connecting to server.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const fetchSupportMessages = async (studentId: number) => {
    setLoadingMessages(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const response = await fetch(`/api/teacher/support/messages?studentId=${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSupportMessages(await response.json());
      }
    } catch (err) {
      console.error("Failed to fetch support conversation logs", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendSupportMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportInput.trim()) return;

    // Target is either first active session (tutor-student) or student self ID
    const studentId = user.role === 'teacher' ? activeSessionStudent?.id : user.id;
    if (!studentId) return;

    setSendingSupport(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const response = await fetch('/api/teacher/support/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: supportInput, studentId })
      });

      if (response.ok) {
        setSupportInput("");
        fetchSupportMessages(studentId);
      }
    } catch (err) {
      console.error("Failed to transmit support comment", err);
    } finally {
      setSendingSupport(false);
    }
  };

  // Run messaging cycles based on state updates
  useEffect(() => {
    let interval: any;
    const targetId = user.role === 'teacher' ? activeSessionStudent?.id : user.id;
    if (targetId && (activeView === 'support' || studentChatOpen)) {
      fetchSupportMessages(targetId);
      interval = setInterval(() => {
        fetchSupportMessages(targetId);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [activeSessionStudent, activeView, studentChatOpen]);

  const fetchDashboardData = async () => {
    setLoadingPhases(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const [phasesRes, progressRes, subsRes, badgesRes, blueprintsRes] = await Promise.all([
        fetch('/api/phases', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/progress', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/user/submissions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/user/badges', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/ideation/blueprints', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (phasesRes.ok) setPhases(await phasesRes.json());
      if (progressRes.ok) setProgressData(await progressRes.json());
      if (subsRes.ok) setUserSubmissions(await subsRes.json());
      if (badgesRes.ok) setBadges(await badgesRes.json());
      if (blueprintsRes.ok) setBlueprints(await blueprintsRes.json());
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoadingPhases(false);
    }
  };

  const handleReuseBlueprint = async (blueprintId: number) => {
    setActionLoading(blueprintId);
    try {
      const token = localStorage.getItem('vibelab_token');
      const response = await fetch(`/api/ideation/blueprints/${blueprintId}/reuse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        await fetchDashboardData();
        alert("This blueprint has been successfully restored as your active project track!");
      } else {
        const d = await response.json();
        alert(d.error || "Failed to restore blueprint");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting the server.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBlueprint = async (blueprintId: number) => {
    if (!confirm("Are you sure you want to delete this blueprint from your history? \nThis action cannot be undone.")) return;
    setActionLoading(blueprintId);
    try {
      const token = localStorage.getItem('vibelab_token');
      const response = await fetch(`/api/ideation/blueprints/${blueprintId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        await fetchDashboardData();
      } else {
        const d = await response.json();
        alert(d.error || "Failed to delete blueprint");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting the server.");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePhaseClick = (phaseId: number) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase?.status === 'locked') return;
    
    navigate(`/phase/${phaseId}`);
  };

  const completedProjects = progressData?.projectProgress.filter(p => p.is_completed).length || 0;
  const activeProjects = progressData?.projectProgress.filter(p => !p.is_completed).length || 0;
  const ideationProgress = user?.ideation_completed ? 100 : 0;
  const dbPhasesProgressTotal = phases.length > 0 
    ? phases.reduce((acc, p) => acc + (p.progress_percentage || 0), 0)
    : 0;
  const totalPhaseProgress = Math.round((ideationProgress + dbPhasesProgressTotal) / 8);

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

  const renderSidebarContent = (isMobile: boolean = false) => {
    return (
      <div className={`flex flex-col ${isMobile ? 'min-h-full justify-between' : 'h-full'}`}>
        {isMobile && (
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-150">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm">V</div>
              <span className="font-display font-bold text-lg text-slate-900">VibeLab</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
        
        <div className="relative group mb-6">
          <div className="flex items-center gap-3.5 px-3 py-2.5 bg-slate-50/50 rounded-xl border border-slate-100/50 overflow-hidden">
            <div 
              onClick={handleAvatarClick}
              className="relative w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg uppercase overflow-hidden cursor-pointer group/avatar shrink-0"
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
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="truncate">
              <p className="font-bold text-slate-900 text-sm truncate">{user?.name || 'User'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{user?.role || 'Member'}</p>
                {user?.is_verified ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-black uppercase tracking-wider shadow-sm select-none leading-none">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black uppercase tracking-wider shadow-sm select-none leading-none">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                    Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <nav className={`space-y-2 ${isMobile ? 'shrink-0' : 'flex-1 overflow-y-auto custom-scrollbar'}`}>
          {user?.role === "teacher" ? (
            <>
              <button 
                onClick={() => { navigate('/dashboard'); fetchTeacherData(); if (isMobile) setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeView === 'overview' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Student Cohort
              </button>

              <button 
                onClick={() => { navigate('/dashboard/grading'); fetchTeacherData(); if (isMobile) setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeView === 'grading' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                Review Submissions
              </button>

              <button 
                onClick={() => { navigate('/dashboard/support'); fetchTeacherData(); if (isMobile) setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeView === 'support' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                Faculty Support
              </button>

              <button 
                onClick={() => { navigate('/leaderboard'); fetchDashboardData(); if (isMobile) setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeView === 'leaderboard' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="w-5 h-5" />
                Leaderboard
              </button>

              <button 
                onClick={() => { navigate('/settings'); if (isMobile) setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeView === 'settings' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => { navigate('/dashboard'); if (isMobile) setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeView === 'overview' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Overview
              </button>

              <button 
                onClick={() => { navigate('/dashboard/blueprints'); if (isMobile) setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeView === 'blueprints' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <FileText className="w-5 h-5" />
                My Blueprints
              </button>

              <button 
                onClick={() => { navigate('/dashboard/submissions'); if (isMobile) setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeView === 'submissions' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Github className="w-5 h-5" />
                My Submissions
              </button>

              <button 
                onClick={() => { navigate('/dashboard/certificates'); if (isMobile) setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeView === 'certificates' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Trophy className="w-5 h-5" />
                Certificates
              </button>

              <button 
                onClick={() => { navigate('/leaderboard'); if (isMobile) setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
                  activeView === 'leaderboard' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="w-5 h-5" />
                Leaderboard
              </button>

              <button 
                onClick={() => { navigate('/settings'); if (isMobile) setIsMobileMenuOpen(false); }}
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
                <>
                  <button
                    onClick={() => {
                      if (user?.ideation_completed) {
                        setSelectedPhaseId(1);
                        setActiveView('phase');
                        navigate('/phase/1');
                      } else {
                        if (onNavigate) {
                          onNavigate('ideation');
                        } else {
                          navigate('/ideation');
                        }
                      }
                      if (isMobile) setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all group ${
                      (activeView === 'ideation' || (activeView === 'phase' && selectedPhaseId === 1))
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      {user?.ideation_completed ? (
                        <BookOpen className="w-5 h-5 shrink-0 text-emerald-500" />
                      ) : (
                        <BrainCircuit className="w-5 h-5 shrink-0 text-cyan-600" />
                      )}
                      <span className="truncate">Phase 1 — Discovery & Ideation</span>
                    </div>
                    {user?.ideation_completed && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </button>

                  {phases.filter(p => p.id !== 1).map((phase) => {
                    let displayStatus = phase.status;
                    let displayName = formatPhaseNameForUI(phase.name);
                    
                    if (phase.order_index === 2 && user?.ideation_completed) {
                      if (displayStatus === 'locked') {
                        displayStatus = 'active';
                      }
                    }
                    
                    const isLocked = displayStatus === 'locked';

                    return (
                      <button 
                        key={phase.id}
                        onClick={() => {
                          handlePhaseClick(phase.id);
                          if (isMobile) setIsMobileMenuOpen(false);
                        }}
                        disabled={isLocked}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all group ${
                          activeView === 'phase' && selectedPhaseId === phase.id
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                            : isLocked
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          {isLocked ? (
                             <Lock className="w-5 h-5 shrink-0" />
                          ) : (
                             <BookOpen className="w-5 h-5 shrink-0" />
                          )}
                          <span className="truncate">{displayName}</span>
                        </div>
                        {displayStatus === 'completed' && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-wider">Completed ✓</span>
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}
        </nav>

        <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
           <div className="p-4 rounded-xl bg-slate-50/40 border border-slate-100/80">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Public Verification</p>
              <p className="text-[10px] text-slate-450 mb-3 font-medium leading-relaxed">Share your verified builder profile with recruiters.</p>
            <div className="flex gap-1.5">
              <a 
                href={`/profile/${user.vl_id || user.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-950 text-[10px] font-bold hover:bg-slate-50 transition-all shadow-sm text-center"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                View Profile
              </a>
              <button 
                onClick={() => {
                  const url = `${window.location.origin}/profile/${user.vl_id || user.id}`;
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`flex items-center justify-center p-2 rounded-lg bg-white border transition-all shadow-sm ${copied ? 'border-emerald-200 text-emerald-600 bg-emerald-50/50' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                title="Copy profile link"
              >
                {copied ? <span className="text-[9px] font-bold px-1 text-emerald-600">Copied!</span> : <LinkIcon className="w-3.5 h-3.5" />}
              </button>
            </div>
           </div>
           
           <button 
            onClick={() => {
              onLogout();
              if (isMobile) setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50/50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Invisible file input for Avatar Uploading */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />

      {/* Sticky Top Mobile Header (only visible on mobile/tablets) */}
      <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-35 w-full shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm">V</div>
          <span className="font-display font-bold text-lg text-slate-900">VibeLab</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Animated Sliding Menu Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden"
            />
            
            {/* Slide-over Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="fixed inset-y-0 left-0 w-80 bg-white border-r border-slate-200 z-50 lg:hidden flex flex-col p-6 overflow-y-auto"
            >
              {renderSidebarContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="w-72 bg-white border-r border-slate-200 hidden lg:flex flex-col p-6 pt-20 sticky top-0 h-screen shrink-0">
        {renderSidebarContent(false)}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-10 pt-16 lg:pt-28 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {user?.role === "teacher" ? (
              // TEACHER SYSTEM WORKSPACE
              activeView === 'overview' ? (
                <motion.div
                  key="teacher-cohort"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 animate-fade-in"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                      <h1 className="text-4xl font-display font-black text-slate-900 mb-2">Student Cohort</h1>
                      <p className="text-slate-500 font-medium">Monitor pacing, override course locks, and check academic stats.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 flex flex-col items-center justify-center min-w-[140px] shadow-lg">
                        <span className="text-3xl font-black">{cohortStudents.length}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total Enrolled</span>
                      </div>
                      <div className="bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center min-w-[140px] shadow-sm">
                        <span className="text-3xl font-black text-indigo-600">
                          {cohortSubmissions.filter(s => s.status === 'pending').length}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Pending Grade</span>
                      </div>
                    </div>
                  </div>

                  {loadingStudents ? (
                    <div className="text-center py-24 bg-white border border-slate-200 rounded-[2.5rem]">
                      <div className="w-12 h-12 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-slate-500 font-medium font-display text-sm">Loading Student Cohort Directory...</p>
                    </div>
                  ) : cohortStudents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {cohortStudents.map((student) => (
                        <div key={student.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm text-slate-900 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-4 mb-6">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-bold font-display text-lg flex items-center justify-center overflow-hidden">
                                  {student.avatar_url ? (
                                    <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
                                  ) : (
                                    student.name[0]
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-bold text-lg text-slate-905 truncate">{student.name}</h3>
                                  <p className="text-slate-500 text-xs font-mono">{student.email}</p>
                                </div>
                              </div>
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200/80">
                                {student.vl_id || `ID: ${student.id}`}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-4">Academic Progression metrics</p>
                            <div className="grid grid-cols-3 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <div className="text-center">
                                <span className="block text-lg font-bold text-slate-990">{student.completed_projects}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">Projects</span>
                              </div>
                              <div className="text-center">
                                <span className="block text-lg font-bold text-slate-990">{student.total_submissions}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">Submissions</span>
                              </div>
                              <div className="text-center">
                                <span className="block text-lg font-bold text-slate-990">{student.total_badges}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">Certificates</span>
                              </div>
                            </div>

                            {student.phases && student.phases.length > 0 && (
                              <div className="space-y-2 mb-6">
                                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Phase Locking statuses</p>
                                {student.phases.map((ph: any) => (
                                  <div key={ph.phase_id} className="flex items-center justify-between text-xs font-medium">
                                    <span className="text-slate-600">{ph.phase_name}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                      ph.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                      ph.status === 'active' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                      {ph.status} ({ph.progress_percentage}%)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pt-4 border-t border-slate-100">
                            <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-3">Academic Control Actions</p>
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              const form = e.currentTarget;
                              const phaseId = parseInt((form.elements.namedItem('overridePhase') as HTMLSelectElement).value);
                              const status = (form.elements.namedItem('overrideStatus') as HTMLSelectElement).value;
                              const progress = parseInt((form.elements.namedItem('overrideProgress') as HTMLInputElement).value || '0');
                              handleManualOverride(student.id, phaseId, status, progress);
                            }} className="flex flex-col gap-2">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <select name="overridePhase" className="p-2 border border-slate-200 rounded-lg outline-none font-semibold">
                                  <option value="1">Phase 1 (Basic Dev)</option>
                                  <option value="2">Phase 2 (Cloud AI)</option>
                                  <option value="3">Phase 3 (Capstone)</option>
                                </select>
                                <select name="overrideStatus" className="p-2 border border-slate-200 rounded-lg outline-none font-semibold">
                                  <option value="active">Unlock / Active</option>
                                  <option value="completed">Complete Phase</option>
                                  <option value="locked">Lock Phase</option>
                                </select>
                              </div>
                              <div className="flex gap-2 text-xs">
                                <input name="overrideProgress" type="number" min="0" max="100" placeholder="Prog %" className="w-1/3 p-2 border border-slate-200 rounded-lg outline-none font-semibold" />
                                <button type="submit" className="flex-1 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all text-xs">
                                  Override progress
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-24 bg-white border border-slate-200 rounded-[2.5rem]">
                      <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="font-bold text-slate-950 text-xl">No Students Found</h3>
                      <p className="text-slate-500 max-w-sm mx-auto mt-1">There are no registered student accounts on VibeLab yet.</p>
                    </div>
                  )}
                </motion.div>
              ) : activeView === 'grading' ? (
                <motion.div
                  key="teacher-grading"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="mb-8">
                    <h1 className="text-4xl font-display font-black text-slate-900 mb-2">Grading Suite</h1>
                    <p className="text-slate-500 font-medium">Review submitted project repository artifacts, live URLs, code, and assign grades.</p>
                  </div>

                  {selectedReviewSubmission ? (
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm text-slate-900">
                      <div className="flex items-center justify-between pb-6 border-b border-slate-200 mb-6 font-display">
                        <button 
                          onClick={() => { setSelectedReviewSubmission(null); setReviewMessage(""); }}
                          className="text-xs font-bold text-slate-500 hover:text-slate-950 transition-colors uppercase tracking-widest"
                        >
                          &larr; Return to Submission lists
                        </button>
                        <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 text-[10px] font-black uppercase tracking-widest">
                          Reviewing Submission
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-xs text-slate-800">
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 mb-2 font-display">{selectedReviewSubmission.project_title}</h2>
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Submitted by: {selectedReviewSubmission.student_name} ({selectedReviewSubmission.student_vl_id})</p>
                          <div className="space-y-3 mb-6">
                            <p className="text-sm font-semibold text-slate-700">Student Description Commentary:</p>
                            <p className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-600 text-sm whitespace-pre-wrap font-medium">{selectedReviewSubmission.description || "No project description provided."}</p>
                          </div>
                          <div className="flex gap-4">
                            {selectedReviewSubmission.github_url && (
                              <a href={selectedReviewSubmission.github_url} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 text-center bg-slate-100 text-slate-900 font-bold rounded-xl border border-slate-200 hover:bg-slate-200 transition-all text-xs">
                                Github Repository
                              </a>
                            )}
                            {selectedReviewSubmission.live_url && (
                              <a href={selectedReviewSubmission.live_url} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 text-center bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-505 transition-all text-xs shadow-lg shadow-indigo-600/15">
                                Live Deployment Url
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Grading Review feedback board */}
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                          <h3 className="font-bold text-slate-905 text-lg mb-4">Academic Review Grading Form</h3>
                          
                          {reviewMessage && (
                            <div className="mb-4 p-4 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl">
                              {reviewMessage}
                            </div>
                          )}

                          <form onSubmit={handleReviewSubmission} className="space-y-4 text-xs text-slate-700">
                            <div className="space-y-1">
                              <label className="font-bold text-slate-500 uppercase tracking-wider">Evaluation Outcome Status</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 font-bold cursor-pointer">
                                  <input type="radio" checked={reviewStatus === "approved"} onChange={() => setReviewStatus("approved")} />
                                  Approve & Pass
                                </label>
                                <label className="flex items-center gap-2 font-bold cursor-pointer">
                                  <input type="radio" checked={reviewStatus === "rejected"} onChange={() => setReviewStatus("rejected")} />
                                  Request Revision
                                </label>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-500 uppercase tracking-wider">Assign Score Grade Level</label>
                              <select 
                                value={reviewGrade} 
                                onChange={(e) => setReviewGrade(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none font-bold"
                              >
                                {["A+", "A", "B+", "B", "C", "Pass", "Fail"].map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="font-bold text-slate-500 uppercase tracking-wider">Tutor Review Commentary</label>
                              <textarea 
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                placeholder="Provide comprehensive feedback, architecture pointers, or guidelines for revision..."
                                className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none h-24 font-medium resize-none"
                              />
                            </div>

                            <button 
                              type="submit" 
                              disabled={isSubmittingReview}
                              className="w-full py-3 bg-slate-990 hover:bg-slate-800 text-white font-bold rounded-xl transition-all"
                            >
                              {isSubmittingReview ? "Saving Academic review..." : "Publish Grade & Commentary"}
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Display source code state if available */}
                      {selectedReviewSubmission.code_state && (
                        <div className="mt-8 border-t border-slate-200 pt-6">
                          <h4 className="font-bold text-slate-900 text-sm mb-3">Student Source Code Snapshot:</h4>
                          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
                            <pre>{typeof selectedReviewSubmission.code_state === 'object' 
                              ? JSON.stringify(selectedReviewSubmission.code_state, null, 2) 
                              : selectedReviewSubmission.code_state
                            }</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden text-slate-900 animate-fade-in">
                      <div className="p-6 border-b border-slate-105 flex items-center justify-between bg-slate-50/50 font-display">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Project submission list</span>
                        <span className="text-xs font-bold text-slate-400">Total: {cohortSubmissions.length} submissions</span>
                      </div>

                      {loadingCohortSubmissions ? (
                        <div className="text-center py-24 font-display">
                          <div className="w-12 h-12 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-slate-500 text-sm font-medium">Downloading Cohort Project Submissions...</p>
                        </div>
                      ) : cohortSubmissions.length > 0 ? (
                        <div className="divide-y divide-slate-100 text-sm text-slate-700">
                          {cohortSubmissions.map((sub) => (
                            <div key={sub.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                              <div>
                                <h3 className="font-bold text-slate-909 text-base">{sub.project_title}</h3>
                                <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">
                                  {sub.phase_name} | By: {sub.student_name} ({sub.student_vl_id})
                                </p>
                                <p className="text-slate-500 text-xs mt-1 italic font-medium">
                                  {sub.description ? `${sub.description.substring(0, 100)}...` : "No description provided."}
                                </p>
                              </div>

                              <div className="flex items-center gap-4 shrink-0 font-display">
                                <div className="text-right">
                                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    sub.status === 'approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                    sub.status === 'rejected' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                                    'bg-amber-50 border-amber-100 text-amber-700 font-black animate-pulse'
                                  }`}>
                                    {sub.status === 'approved' ? `APPROVED (${sub.grade})` : sub.status === 'rejected' ? 'REVISIONS REQ' : 'PENDING REVIEW'}
                                  </span>
                                  <span className="block text-[10px] font-medium text-slate-400 mt-1">{new Date(sub.created_at).toLocaleDateString()}</span>
                                </div>
                                <button 
                                  onClick={() => {
                                    setSelectedReviewSubmission(sub);
                                    setReviewStatus(sub.status || 'approved');
                                    setReviewGrade(sub.grade || 'A');
                                    setReviewComment(sub.review_comment || '');
                                  }}
                                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
                                >
                                  Review & Grade
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-24 font-display">
                          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <h3 className="font-bold text-slate-950 text-xl">All Caught Up!</h3>
                          <p className="text-slate-500 max-w-sm mx-auto mt-1">There are no pending project submissions across all student phases.</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : activeView === 'support' ? (
                <motion.div
                  key="teacher-support"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 animate-fade-in"
                >
                  <div className="mb-8 font-display">
                    <h1 className="text-4xl font-display font-black text-slate-900 mb-2">Faculty Support Center</h1>
                    <p className="text-slate-500 font-medium font-sans">Answer questions, provide guidance reviews, and tutor cohort students.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px] bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
                    {/* Conversations list sidebar */}
                    <div className="lg:col-span-4 col-span-1 border-r border-slate-100 h-full flex flex-col font-display">
                      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Active Channels</span>
                      </div>
                      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {supportSessions.length > 0 ? supportSessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={() => {
                              setActiveSessionStudent(session);
                              fetchSupportMessages(session.id);
                            }}
                            className={`w-full p-5 text-left flex items-start gap-4 transition-colors ${
                              activeSessionStudent?.id === session.id ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                              {session.avatar_url ? (
                                <img src={session.avatar_url} alt={session.name} className="w-full h-full object-cover" />
                              ) : (
                                session.name[0]
                              )}
                            </div>
                            <div className="min-w-0 flex-1 font-sans">
                              <p className="font-bold text-slate-900 text-sm font-display">{session.name}</p>
                              <p className="text-slate-400 text-xs truncate mt-0.5 font-medium">{session.last_message || "Active chat help requested..."}</p>
                              <span className="text-[10px] text-slate-300 font-medium font-mono">{session.vl_id}</span>
                            </div>
                          </button>
                        )) : (
                          <p className="text-center text-xs text-slate-400 p-8 font-medium">No active student chat requests yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Chat communication portal */}
                    <div className="lg:col-span-8 col-span-1 h-full flex flex-col justify-between bg-slate-50/20">
                      {activeSessionStudent ? (
                        <>
                          {/* Thread header */}
                          <div className="p-6 border-b border-slate-105 bg-white flex items-center justify-between font-display">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-905 text-white font-bold text-sm flex items-center justify-center overflow-hidden">
                                {activeSessionStudent.avatar_url ? (
                                  <img src={activeSessionStudent.avatar_url} alt={activeSessionStudent.name} className="w-full h-full object-cover" />
                                ) : (
                                  activeSessionStudent.name[0]
                                )}
                              </div>
                              <div className="font-sans">
                                <p className="font-bold text-slate-900 text-sm font-display">Review Chat with {activeSessionStudent.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono font-medium">Academic ID: {activeSessionStudent.vl_id}</p>
                              </div>
                            </div>
                          </div>

                          {/* Message bubbles */}
                          <div className="flex-1 p-6 overflow-y-auto space-y-4 font-sans">
                            {loadingMessages && supportMessages.length === 0 ? (
                              <div className="text-center py-10 text-xs text-slate-400">Loading chat logs...</div>
                            ) : supportMessages.length > 0 ? (
                              supportMessages.map((msg) => {
                                const isMe = msg.sender_role === "teacher";
                                return (
                                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] p-4 rounded-3xl text-sm ${
                                      isMe ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border text-slate-800 rounded-tl-none'
                                    }`}>
                                      <p className="font-semibold">{msg.message}</p>
                                      <span className="block text-[9px] font-mono text-slate-400 mt-2 text-right font-medium">
                                        {msg.sender_name} | {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-24 text-slate-400 text-sm font-medium">No support messages on this thread yet. Send a hello to get started!</div>
                            )}
                          </div>

                          {/* Input box */}
                          <form onSubmit={handleSendSupportMessage} className="p-4 border-t border-slate-100 bg-white flex gap-3 text-xs">
                            <input 
                              type="text"
                              value={supportInput}
                              onChange={(e) => setSupportInput(e.target.value)}
                              placeholder={`Type guidance reply to ${activeSessionStudent.name}...`}
                              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 outline-none rounded-xl font-medium focus:border-slate-900 transition-all font-display"
                            />
                            <button 
                              type="submit"
                              disabled={sendingSupport || !supportInput.trim()}
                              className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-md flex items-center gap-2 font-bold font-display"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Send
                            </button>
                          </form>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                          <MessageSquare className="w-14 h-14 text-slate-305 mb-4 animate-pulse" />
                          <h4 className="font-bold text-slate-950 text-xl font-display">Faculty Communications Channel</h4>
                          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1 font-sans font-medium">Please select an active student request from the sidebar directory to begin review chats.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : activeView === 'leaderboard' ? (
                <motion.div
                  key="teacher-leaderboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Leaderboard />
                </motion.div>
              ) : (
                <motion.div
                  key="teacher-settings"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-200 shadow-sm max-w-2xl mx-auto text-slate-800">
                    <h2 className="text-2xl font-black text-slate-950 mb-2 font-display">Faculty Account Settings</h2>
                    <p className="text-slate-500 mb-8 font-medium">Manage your teacher profile credentials and info.</p>
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-bold mb-4">
                      Academic instructor settings are connected. Use normal settings inputs below for modifications.
                    </div>
                  </div>
                </motion.div>
              )
            ) : (
              // ORIGINAL STUDENT WORKSPACE
              activeView === 'overview' ? (
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.role || 'Member'}</p>
                        {user?.is_verified ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-150 text-[8px] font-black uppercase tracking-wider shadow-sm select-none">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-150 text-[8px] font-black uppercase tracking-wider shadow-sm select-none">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                            Pending
                          </span>
                        )}
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
                                    <p className="text-xs font-bold text-slate-900">{phases.filter(p => p.status === 'completed' || (p.id === 1 && !!user?.ideation_completed)).length} Completed</p>
                                    <p className="text-[10px] text-slate-400 font-medium tracking-wide">Phases Mastered</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-emerald-900 flex items-center justify-center text-emerald-100 shadow-sm">
                                    <Zap size={18} />
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {(() => {
                                         if (!user?.ideation_completed) {
                                            return "Phase 1 — Discovery & Ideation";
                                         }
                                         const activePhase = phases.find(p => p.status === 'active' || (p.order_index === 2 && !phases.some(x => x.order_index === 2 && x.status === 'completed')));
                                         if (activePhase) {
                                            return formatPhaseNameForUI(activePhase.name);
                                         }
                                         return "Completed Curriculum!";
                                      })()}
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
                                 {(() => {
                                    const checkpoints = phases.map((p) => {
                                      const isP1 = p.id === 1;
                                      const isCompleted = isP1 ? !!user?.ideation_completed : (!!user?.ideation_completed && p.status === 'completed');
                                      let isActive = isP1 ? !user?.ideation_completed : false;
                                      
                                      if (!isP1 && !!user?.ideation_completed) {
                                        const isP2Active = p.order_index === 2 && !phases.some(x => x.order_index === 2 && x.status === 'completed');
                                        isActive = p.status === 'active' || isP2Active;
                                      }
                                      
                                      return {
                                        name: formatPhaseNameForUI(p.name),
                                        isCompleted,
                                        isActive
                                      };
                                    });
                                    return checkpoints.map((chk, idx) => {
                                     const isCompleted = chk.isCompleted;
                                     const isActive = chk.isActive;
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
                                         {idx === checkpoints.length - 1 && (
                                           <div className="absolute -top-8 right-0 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                             Goal: {checkpoints.length}
                                           </div>
                                         )}
                                       </div>
                                     );
                                   });
                                 })()}
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
                        onClick={() => navigate('/dashboard')}
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
            ) : activeView === 'blueprints' ? (
              <motion.div
                key="blueprints"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                  <div>
                    <h1 className="text-4xl font-display font-bold text-slate-900 mb-2">My Discovery Blueprints</h1>
                    <p className="text-slate-500 font-medium font-sans">Access, review, and restore your completed project blueprints to reuse them as your primary course track.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (onNavigate) onNavigate('ideation');
                    }}
                    className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm transition-all shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    New Discovery Session
                  </button>
                </div>

                <div className="space-y-6">
                  {blueprints.length > 0 ? blueprints.map((bp, i) => {
                    const isActive = i === 0; // The latest one generated is active by default
                    const isExpanded = expandedBlueprintId === bp.id;

                    const opportunities = Array.isArray(bp.ai_opportunity_map) ? bp.ai_opportunity_map : [];
                    const learningPath = Array.isArray(bp.learning_path) ? bp.learning_path : [];
                    const features = Array.isArray(bp.product_features) ? bp.product_features : [];

                    return (
                      <motion.div
                        key={bp.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`bg-white rounded-[2.5rem] border ${
                          isActive ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-lg' : 'border-slate-200 shadow-sm'
                        } overflow-hidden transition-all`}
                      >
                        {/* Header Area */}
                        <div className="p-8 md:p-10 font-sans">
                          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-2xl font-display font-black text-slate-900 tracking-wide uppercase">
                                  {bp.product_name}
                                </h3>
                                {isActive && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    Active Project Track
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-slate-500 flex flex-wrap items-center gap-3">
                                <span>🛠️ {bp.recommended_track}</span>
                                <span>•</span>
                                <span>⏳ {bp.estimated_build_time}</span>
                                <span>•</span>
                                <span className={`capitalize inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                  bp.complexity === 'beginner' ? 'bg-emerald-50 text-emerald-600' :
                                  bp.complexity === 'intermediate' ? 'bg-amber-50 text-amber-600' :
                                  'bg-red-50 text-red-600'
                                }`}>🧠 {bp.complexity}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setExpandedBlueprintId(isExpanded ? null : bp.id)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
                              >
                                {isExpanded ? 'Hide Spec' : 'View Full Spec'}
                              </button>
                              {!isActive && (
                                <button
                                  onClick={() => handleReuseBlueprint(bp.id)}
                                  disabled={actionLoading !== null}
                                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-md"
                                >
                                  {actionLoading === bp.id ? 'Restoring...' : 'Reuse / Set Active'}
                                </button>
                              )}
                              {!isActive && (
                                <button
                                  onClick={() => handleDeleteBlueprint(bp.id)}
                                  disabled={actionLoading !== null}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-105"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-slate-600 text-base leading-relaxed font-normal">
                            {bp.solution_concept}
                          </p>

                          {/* Quick details summary */}
                          <div className="mt-6 flex flex-wrap gap-4 pt-6 border-t border-slate-100 text-sm font-medium text-slate-500">
                            <div>
                              <span className="text-slate-400">Problem:</span> {bp.problem_statement}
                            </div>
                          </div>
                        </div>

                        {/* Expandable full specification details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-slate-100 bg-slate-50/50"
                            >
                              <div className="p-8 md:p-10 space-y-8 text-sm font-sans">
                                <div className="grid md:grid-cols-2 gap-8">
                                  {/* Left col */}
                                  <div className="space-y-6">
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Target User Persona</p>
                                      <p className="text-slate-700 leading-relaxed font-medium bg-white p-5 rounded-2xl border border-slate-100">{bp.target_user_persona}</p>
                                    </div>

                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Core Features Checklist</p>
                                      <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-2">
                                        {features.map((f, idx) => (
                                          <div key={idx} className="flex gap-2 items-center text-slate-700">
                                            <span className="text-cyan-500">✓</span>
                                            <span className="font-medium">{f}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right col */}
                                  <div className="space-y-6">
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">How AI Can Help</p>
                                      <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-wrap gap-2 animate-pulse">
                                        {opportunities.map((o, idx) => (
                                          <span key={idx} className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-lg text-xs font-bold border border-cyan-100">
                                            ✨ {o}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">1-Week MVP Scope</p>
                                      <p className="text-slate-700 leading-relaxed font-medium bg-white p-5 rounded-2xl border border-slate-100">{bp.mvp_definition}</p>
                                    </div>
                                  </div>
                                </div>

                                {bp.mvp_note && (
                                  <div className="bg-blue-50/50 border-l-4 border-blue-500 p-5 rounded-r-2xl">
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Guiding Scope Reduction Advice</p>
                                    <p className="text-slate-700 font-medium leading-relaxed">{bp.mvp_note}</p>
                                  </div>
                                )}

                                <div>
                                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Suggested Learning Milestones Pattern</p>
                                  <div className="grid sm:grid-cols-3 gap-4">
                                    {learningPath.map((itm, idx) => (
                                      <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 flex gap-3 text-slate-700">
                                        <div className="w-6 h-6 rounded-md bg-slate-950 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                          {idx + 1}
                                        </div>
                                        <span className="font-medium leading-normal">{itm}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  }) : (
                    <div className="py-24 text-center bg-white border border-slate-200 rounded-[3rem] shadow-sm font-sans">
                      <FileText className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                      <h3 className="text-2xl font-bold font-display text-slate-900 mb-2">No discovery blueprints found</h3>
                      <p className="text-slate-500 max-w-sm mx-auto font-medium">To generate and save your completed professional project blueprints, initiate a Discovery session.</p>
                      <button
                        onClick={() => {
                          if (onNavigate) onNavigate('ideation');
                        }}
                        className="mt-8 px-8 py-3.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-md"
                      >
                        Launch Discovery Session
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeView === 'certificates' ? (
              <motion.div
                key="certificates"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full"
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
                      onClick={() => navigate('/dashboard')}
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
                {(selectedPhaseId !== 1 && selectedPhaseId !== null) && (user?.ideation_completed === false || user?.ideation_completed === undefined) ? (
                  <div className="relative bg-white border border-slate-200 rounded-[2.5rem] p-12 text-center text-slate-800 shadow-xl overflow-hidden min-h-[500px] flex flex-col justify-center items-center font-dmsans">
                    {/* Decorative premium lighting glows */}
                    <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-bl from-blue-500/5 to-transparent blur-[120px] pointer-events-none" />
                    
                    <div className="relative space-y-6 max-w-lg mx-auto">
                      <div className="inline-flex p-4 rounded-full border border-blue-200 bg-blue-50/50 mb-2 hover:scale-105 transition-transform">
                        <Lock className="w-10 h-10 text-blue-600" />
                      </div>
                      
                      <h2 className="font-bebas text-3xl sm:text-5xl text-slate-900 tracking-widest leading-none">
                        Complete Phase 1 Ideation first
                      </h2>
                      
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">
                        Discover your project idea in Phase 1 before you start coding in Phase 2
                      </p>
                      
                      <div className="pt-4">
                        <button
                          onClick={() => {
                            if (onNavigate) {
                              onNavigate('ideation');
                            } else {
                              window.location.href = '/ideation';
                            }
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm px-8 py-4 rounded-xl transition-all shadow-xl shadow-blue-500/15 active:scale-[0.98] cursor-pointer"
                        >
                          Go to Phase 1 Ideation →
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <PhaseView 
                    phaseId={selectedPhaseId!} 
                    onBack={() => {
                      navigate('/dashboard');
                      fetchDashboardData(); // Update phases and progress
                    }} 
                    onProgress={fetchDashboardData}
                  />
                )}
              </motion.div>
            )
          )}
          </AnimatePresence>
        </div>
      </div>

      {/* Student support chat sliding drawer overlay */}
      <AnimatePresence>
        {studentChatOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs font-sans">
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-950 text-base font-display">VibeLab Faculty Helpdesk</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">1-on-1 Academic Support Chat</p>
                  </div>
                </div>
                <button 
                  onClick={() => setStudentChatOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                {loadingMessages ? (
                  <div className="text-center py-10 text-xs font-medium text-slate-400">Loading academic thread...</div>
                ) : supportMessages.length > 0 ? (
                  supportMessages.map((msg) => {
                    const isMe = msg.sender_role === "student";
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-3xl text-sm ${
                          isMe ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border text-slate-800 rounded-tl-none'
                        }`}>
                          <p className="font-semibold leading-relaxed">{msg.message}</p>
                          <span className="block text-[9px] font-mono text-slate-400 mt-2 text-right font-medium">
                            {msg.sender_name} | {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16 text-slate-400 space-y-3 font-medium">
                    <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-600">Need academic support or review feedback clarification?</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">Ask your teacher questions directly right here! Your instructor will receive these and reply in your workspace.</p>
                  </div>
                )}
              </div>

              {/* Feed Input form */}
              <form onSubmit={handleSendSupportMessage} className="p-4 border-t border-slate-100 flex gap-3 bg-white text-xs">
                <input 
                  type="text"
                  value={supportInput}
                  onChange={(e) => setSupportInput(e.target.value)}
                  placeholder="Type Message to VibeLab review faculty..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 outline-none rounded-xl font-medium focus:border-slate-900 transition-all font-display"
                />
                <button 
                  type="submit"
                  disabled={sendingSupport || !supportInput.trim()}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-md flex items-center gap-2 font-bold font-display"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
