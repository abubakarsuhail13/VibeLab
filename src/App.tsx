import { motion, useScroll, useTransform, AnimatePresence, useInView } from "motion/react";
import { 
  ArrowRight, 
  Code2, 
  Cpu, 
  Globe, 
  Layers, 
  Rocket, 
  Sparkles, 
  Zap, 
  CheckCircle2,
  ChevronRight,
  Trophy,
  Mail,
  Users,
  School,
  Play,
  Star,
  BarChart3,
  BrainCircuit,
  MonitorPlay,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Twitter,
  Linkedin,
  Github,
  Menu,
  X,
  ExternalLink,
  ArrowUpRight,
  Heart,
  Sprout,
  Leaf,
  Briefcase,
  Building2,
  ChevronDown,
  LayoutDashboard,
  Settings,
  LogOut,
  User
} from "lucide-react";
import React, { useState, useRef, useEffect, FormEvent } from "react";
import { Toaster } from "react-hot-toast";
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import AboutPage from "./About";
import ContactPage from "./Contact";
import Login from "./Login";
import Signup from "./Signup";
import Dashboard from "./Dashboard";
import VerifyEmail from "./VerifyEmail";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import PublicProfile from "./PublicProfile";
import VerifyCredential from "./VerifyCredential";
import IdeationEntry from "./IdeationEntry";
import IdeationChat from "./IdeationChat";
import IdeationBlueprint from "./IdeationBlueprint";
import ProfileSetupWizard from "./ProfileSetupWizard";
import IntroPage from "./pages/Intro";
import Phase2Page from "./pages/Phase2";
import FeaturesScreen from "./pages/Phase2/FeaturesScreen";
import JourneyScreen from "./pages/Phase2/JourneyScreen";
import ScreensPreview from "./pages/Phase2/ScreensPreview";
import MVPBuilding from "./pages/Phase2/MVPBuilding";
import MVPReview from "./pages/Phase2/MVPReview";
import ProductDescription from "./pages/Phase2/ProductDescription";
import FeatureExplain from "./pages/Phase2/FeatureExplain";
import DemoPrep from "./pages/Phase2/DemoPrep";
import PhaseComplete from "./pages/Phase2/PhaseComplete";
import Leaderboard from "./Leaderboard";
import PricingPlans from "./components/PricingPlans";

const AdminPanel = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<{ waitlist: any[], submissions: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/admin/data', {
        headers: { 'x-admin-key': password }
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
        setIsAuthenticated(true);
        // Persist password for session
        sessionStorage.setItem('adminKey', password);
      } else {
        setError("Invalid admin password");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedKey = sessionStorage.getItem('adminKey');
    if (savedKey) {
      setPassword(savedKey);
      // Automatically attempt login if key exists
      const ping = async () => {
        const res = await fetch('/api/admin/data', { headers: { 'x-admin-key': savedKey } });
        if (res.ok) {
          setData(await res.json());
          setIsAuthenticated(true);
        }
      };
      ping();
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-48 pb-20 px-6 bg-slate-50 flex flex-col items-center">
        <div className="max-w-md w-full glass p-10 rounded-[3rem] border-slate-200 shadow-2xl">
          <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mb-8 mx-auto">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h2 className="font-display text-3xl font-bold text-slate-900 text-center mb-8">Admin Access</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Email</label>
              <input 
                type="email" 
                value="vibelab@nexaforgetech.com"
                disabled
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Secure Key</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password (0000)"
                className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            {error && <p className="text-xs text-red-500 text-center font-bold tracking-tight">{error}</p>}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Login to VibeLab Admin"}
            </button>
            <button 
              type="button"
              onClick={() => onNavigate('home')}
              className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-cyan-600 transition-colors"
            >
              Back to Home
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="font-display text-4xl font-black text-slate-900 mb-2">Internal Dashboard</h1>
            <p className="text-slate-500 font-medium">VibeLab Submission Manager • vibelab@nexaforgetech.com</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                sessionStorage.removeItem('adminKey');
                setIsAuthenticated(false);
              }}
              className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Logout
            </button>
            <button 
              onClick={() => onNavigate('home')}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all"
            >
              View Live Website
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Waitlist Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass p-8 rounded-[2.5rem] border-white/50 bg-white/70 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <Users className="text-cyan-600 w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">Waitlist</h3>
                </div>
                <span className="bg-cyan-100 text-cyan-600 px-3 py-1 rounded-full text-xs font-black">{data?.waitlist?.length || 0}</span>
              </div>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {data?.waitlist?.map((w, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-cyan-200 transition-colors">
                    <p className="font-bold text-slate-900 text-sm break-all">{w.email}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">{new Date(w.created_at).toLocaleDateString()} • {w.source}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submissions Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass p-8 rounded-[2.5rem] border-white/50 bg-white/70 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Mail className="text-blue-600 w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">Inquiries</h3>
                </div>
              </div>
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {data?.submissions?.map((s, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-black text-slate-900 leading-tight">{s.name}</h4>
                        <p className="text-cyan-600 text-xs font-bold">{s.email}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">{s.role}</span>
                    </div>
                    {s.organization && <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-tighter">@ {s.organization}</p>}
                    <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl italic border border-slate-100">"{s.message}"</p>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{new Date(s.created_at).toLocaleString()}</p>
                      {s.interest_type === 'Yes' && (
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase">
                          <Star className="w-3 h-3 fill-emerald-600" /> Investment Lead
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CountingNumber = ({ value, suffix = "" }: { value: number, suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const end = value;
      const duration = 2000;
      const increment = end / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return <span ref={ref}>{count}{suffix}</span>;
};

const Navbar = ({ onNavigate, currentPage, user, onLogout }: { 
  onNavigate: (page: string) => void, 
  currentPage: string,
  user: any,
  onLogout: () => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleHowItWorksClick = () => {
    setIsOpen(false);
    if (currentPage === 'home') {
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      onNavigate('home');
      setTimeout(() => {
        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  const handlePricingClick = () => {
    setIsOpen(false);
    if (currentPage === 'home') {
      document.getElementById('pricing-plans-section')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      onNavigate('home');
      setTimeout(() => {
        document.getElementById('pricing-plans-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  const navTo = (page: string) => {
    setIsOpen(false);
    onNavigate(page);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center p-4 md:p-5 pointer-events-none">
      <div className="glass px-6 sm:px-8 py-2.5 rounded-2xl flex items-center gap-6 max-w-6xl w-full justify-between shadow-lg shadow-slate-200/30 pointer-events-auto border border-white/20 backdrop-blur-md relative z-50">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navTo('home')}
        >
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
            <BrainCircuit className="text-white w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-slate-900">VibeLab</span>
        </div>
        <div className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-semibold">
          <button 
            onClick={() => navTo('home')} 
            className={`hover:text-blue-600 transition-colors py-1 ${currentPage === 'home' ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-slate-600'}`}
          >
            Home
          </button>
          
          <button 
            onClick={handleHowItWorksClick} 
            className="text-slate-600 hover:text-blue-600 transition-colors py-1"
          >
            How It Works
          </button>

          <button 
            onClick={handlePricingClick} 
            className="text-slate-600 hover:text-blue-600 transition-colors py-1"
          >
            Pricing
          </button>


        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/50 transition-all select-none text-left cursor-pointer"
              >
                {/* Desktop/Tablet name block */}
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-900 leading-tight">{user.name}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider leading-none">{user.role}</span>
                    {user?.is_verified ? (
                      <span className="text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 border border-emerald-100/80 px-1 py-0.5 rounded flex items-center gap-0.5 leading-none select-none font-mono">
                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
                        Verified
                      </span>
                    ) : (
                      <span className="text-[8px] font-black text-amber-600 uppercase bg-amber-50 border border-amber-100/80 px-1 py-0.5 rounded flex items-center gap-0.5 leading-none select-none font-mono">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Mobile compact block */}
                <div className="flex sm:hidden items-center justify-center w-6 h-6 rounded-lg bg-blue-50 text-blue-600">
                  <User className="w-4 h-4" />
                </div>

                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <>
                    {/* Transparent backdrop for outside click close */}
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsDropdownOpen(false)} />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-900/10 py-2 z-50 overflow-hidden"
                    >
                      {/* Profile Summary in dropdown */}
                      <div className="px-4 py-2.5 border-b border-slate-100/80 bg-slate-50/50 mb-1">
                        <p className="text-xs font-bold text-slate-900 leading-none truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase leading-none">{user.role}</p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          navTo('dashboard');
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer ${
                          currentPage === 'dashboard' ? 'bg-slate-50 text-blue-600 font-extrabold' : ''
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-400" />
                        Dashboard
                      </button>
                      
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          navTo('settings');
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer ${
                          currentPage === 'settings' ? 'bg-slate-50 text-blue-600 font-extrabold' : ''
                        }`}
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        Settings
                      </button>
                      
                      <div className="h-px bg-slate-100/80 my-1" />
                      
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50/50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        Logout
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <button 
                onClick={() => navTo('login')}
                className="text-slate-600 px-3.5 py-2 rounded-xl text-xs font-bold hover:text-slate-900 transition-all cursor-pointer"
              >
                Login
              </button>
              <button 
                onClick={() => navTo('signup')}
                className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200 cursor-pointer"
              >
                Sign Up
              </button>
            </>
          )}

          {/* Hamburger Mobile Toggle */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors pointer-events-auto cursor-pointer"
            aria-label="Toggle Menu"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-6xl mt-3 p-6 rounded-2xl glass border border-white/20 shadow-2xl pointer-events-auto flex flex-col gap-4 lg:hidden relative z-40"
          >
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => navTo('home')} 
                className={`w-full py-3 px-4 rounded-xl text-left text-sm font-bold cursor-pointer ${currentPage === 'home' ? 'bg-cyan-500/10 text-cyan-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Home
              </button>

              <button 
                onClick={handleHowItWorksClick} 
                className="w-full py-3 px-4 rounded-xl text-left text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                How It Works
              </button>

              <button 
                onClick={handlePricingClick} 
                className="w-full py-3 px-4 rounded-xl text-left text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Pricing
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const BrowserFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden text-left flex flex-col h-[340px] md:h-[380px] font-sans">
    {/* Browser Header Bar */}
    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
      <div className="flex items-center gap-1.5 select-none">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
      </div>
      <div className="bg-slate-900 border border-slate-800/80 rounded-md px-3 py-0.5 text-[11px] text-slate-400 font-mono w-40 text-center select-none truncate">
        vibelab.app/sandbox
      </div>
      <div className="w-8" />
    </div>
    {/* Client Area */}
    <div className="p-5 flex-grow bg-slate-950 text-slate-100 overflow-y-auto relative flex flex-col select-none">
      {children}
    </div>
  </div>
);

const Hero = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [activeFrame, setActiveFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFrame((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-44 pb-28 px-6 overflow-hidden hero-gradient min-h-[92vh] flex items-center justify-center">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] -z-10" />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center w-full relative z-10">
        {/* Content Side */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-left"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-600 mb-8 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AN AI-POWERED INNOVATION PLATFORM FOR STUDENTS</span>
          </div>
          
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] text-slate-900">
            Turning Student Ideas <br />
            <span className="gradient-text">Into Real-World Solutions.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-xl mb-10 leading-relaxed font-semibold">
            VibeLab combines AI, entrepreneurship, and project-based learning to help students identify problems, design solutions, and build real innovations — no coding background required.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 max-w-lg mb-8">
            <button 
              onClick={() => onNavigate('signup')}
              className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4.5 rounded-2xl font-black text-sm hover:bg-slate-800 hover:scale-[1.01] transition-all whitespace-nowrap shadow-xl shadow-slate-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              Start the Journey <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#audience-section"
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-slate-700 font-bold px-8 py-4.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all text-sm"
            >
              <School className="w-4 h-4 text-cyan-600" />
              For Schools & Government →
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enrollment Open for Summer 2026</span>
          </div>
        </motion.div>

        {/* Showcase side */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative block"
        >
          <BrowserFrame>
            <AnimatePresence mode="wait">
              {activeFrame === 0 && (
                <motion.div
                  key="frame-0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span className="text-xs font-bold text-slate-400 font-mono">Phase 1: Identify the Problem</span>
                    </div>
                    <div className="flex items-start gap-3 max-w-[90%] font-sans">
                      <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">Student</div>
                      <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl text-xs text-slate-300 leading-relaxed font-semibold">
                        How can we help small neighborhood food stores reduce organic waste?
                      </div>
                    </div>
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                      className="flex items-start gap-3 max-w-[90%] ml-auto flex-row-reverse"
                    >
                      <div className="w-7 h-7 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">AI</div>
                      <div className="bg-cyan-900/50 border border-cyan-500/20 p-3.5 rounded-2xl text-xs text-slate-200 leading-relaxed font-medium shadow-lg shadow-cyan-950/20">
                        Excellent problem. Let's design a solution concept that analyzes perishability and matches excess stock with buyer demand in real time.
                      </div>
                    </motion.div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs text-slate-400 mt-4 font-medium">
                    <span>Structuring problem dynamics and local constraints...</span>
                    <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  </div>
                </motion.div>
              )}

              {activeFrame === 1 && (
                <motion.div
                  key="frame-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span className="text-xs font-bold text-slate-400 font-mono">Phase 2: Idea & Strategy Shaping</span>
                    </div>
                    <div className="space-y-2.5 bg-slate-900/40 p-4 rounded-xl border border-slate-900">
                      <div>
                        <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-wider font-mono">PROJECT CONCEPT</h4>
                        <p className="text-sm font-extrabold text-white">SaveFeed Waste Advisor</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-wider font-mono">COMMUNITY PROBLEM</h4>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">Small neighborhood vendors discard over 15% of fresh fruits and vegetables daily due to stock mismatch.</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-wider font-mono">PROPOSED SOLUTION</h4>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">An intuitive visual assistant that predicts customer demand and schedules automated community alerts in Urdu & English.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl text-xs font-semibold text-center mt-3">
                     ✓ Solution roadmap approved by Innovation Advisor
                  </div>
                </motion.div>
              )}

              {activeFrame === 2 && (
                <motion.div
                  key="frame-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col h-full justify-between font-sans"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span className="text-xs font-bold text-slate-400 font-mono">Phase 3: Interactive Prototyping</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold text-white">Interactive Voice Input</p>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Enables Urdu and English narration for shopkeepers</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20 font-mono">Verified</span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold text-white">Demand Estimation Engine</p>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Suggests smart, time-bound discounts for neighbors</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20 font-mono">Verified</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 text-center font-semibold mt-3">
                    Every feature validated through real-world simulation
                  </div>
                </motion.div>
              )}

              {activeFrame === 3 && (
                <motion.div
                  key="frame-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div className="text-center p-3.5 bg-slate-900/60 rounded-xl border border-slate-850 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 mx-auto flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/20">
                      <Trophy className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">SaveFeed Waste Advisor is LIVE!</h4>
                      <p className="text-xs text-slate-400 font-mono">Published and active on the student showcase platform</p>
                    </div>
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-[9px] font-black text-emerald-400 tracking-wider uppercase select-none">
                      Verified Portfolio Achievement
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="p-2.5 bg-slate-900/40 rounded-lg">Impact: 400kg saved</div>
                    <div className="p-2.5 bg-slate-900/40 rounded-lg font-mono">VibeLab Network</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </BrowserFrame>
          <div className="absolute -top-10 -right-10 w-40 h-40 border-2 border-cyan-500/5 rounded-full -z-10 animate-[spin_10s_linear_infinite]" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 border-2 border-blue-500/5 rounded-full -z-10 animate-[spin_15s_linear_infinite_reverse]" />
        </motion.div>
      </div>
    </section>
  );
};

const TrustedBy = () => {
  return (
    <section className="py-20 border-y border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mb-12">Trusted by Global Leaders</p>
        <div className="flex flex-wrap justify-center items-center gap-16 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          {["Microsoft", "Google", "Stanford", "MIT", "Harvard"].map((name) => (
            <div key={name} className="text-3xl font-display font-black tracking-tighter text-slate-900">{name}</div>
          ))}
        </div>
      </div>
    </section>
  );
};

interface SuccessItem {
  id: number;
  type: "project" | "certification";
  name: string;
  role: string;
  title: string;
  metric: string;
  desc: string;
  badge: string;
  tag: string;
  color: string;
  icon: string;
  timeAgo: string;
  bio: string;
  techStack: string[];
  linkUrl: string;
  linkLabel: string;
  quote?: string;
}

const SUCCESS_ITEMS: SuccessItem[] = [
  {
    id: 1,
    type: "project",
    name: "Alex Rivera",
    role: "High School Innovator",
    title: "SmartCal Study Assistant",
    metric: "250+ Active Classmates",
    desc: "AI study planner that helps high school students balance exam prep and personal projects without stress.",
    badge: "Created in 4 Days",
    tag: "Student Launch",
    color: "cyan",
    icon: "Cpu",
    timeAgo: "2h ago",
    bio: "Alex Rivera, a high school student, wanted to help classmates manage board exam prep. He designed SmartCal to automatically allocate study blocks based on student commitments and goals, making prep simple and personalized.",
    techStack: ["Artificial Intelligence", "Product Design", "Problem Solving", "Time Management"],
    linkUrl: "#",
    linkLabel: "View Project Profile",
    quote: "VibeLab helped me take a frustration from my daily life and build a real solution. Seeing my classmates use it to study smarter is incredibly rewarding."
  },
  {
    id: 2,
    type: "certification",
    name: "Sarah Jenkins",
    role: "VibeLab Fellow",
    title: "Responsible AI & Ethics",
    metric: "Score: 98% (Completed)",
    desc: "Validated understanding of ethical AI design, data privacy, and inclusive technology solutions.",
    badge: "Faculty Approved",
    tag: "Certified",
    color: "amber",
    icon: "GraduationCap",
    timeAgo: "Just now",
    bio: "Sarah is a junior high-school student passionate about the societal impact of AI. Over three weeks of hands-on learning, she mastered ethical design principles and built three community-focused product concepts to pass her final review.",
    techStack: ["Digital Literacy", "Critical Thinking", "Responsible AI", "User Experience"],
    linkUrl: "#",
    linkLabel: "Verify Certificate Credentials",
    quote: "This wasn't about memorizing definitions. VibeLab challenged me to think deeply about how technologies impact real people and how to design responsibly."
  },
  {
    id: 3,
    type: "project",
    name: "Marcus K.",
    role: "Youth Innovation Champion",
    title: "SaveFeed waste optimizer",
    metric: "Saved 400kg of Food Waste",
    desc: "A smart advisor helping local market vendors predict daily stock needs to prevent organic waste.",
    badge: "1st Place Community Award",
    tag: "GreenTech Initiative",
    color: "emerald",
    icon: "Zap",
    timeAgo: "15m ago",
    bio: "Marcus, an aspiring entrepreneur, designed SaveFeed to help local grocery vendors optimize inventory. The AI assistant predicts daily customer traffic and demands, helping small shops reduce waste and improve margins.",
    techStack: ["Problem Solving", "Entrepreneurship", "Data Literacy", "Sustainability"],
    linkUrl: "#",
    linkLabel: "View Project Profile",
    quote: "I wanted to create an impact in my immediate neighborhood. VibeLab gave me the tools to design an AI system that small businesses can easily use."
  },
  {
    id: 4,
    type: "project",
    name: "Chloe Dupont",
    role: "High School Creator",
    title: "SmartSign Urdu",
    metric: "Used by 80+ Families",
    desc: "Voice-based learning aid designed to generate visual educational aids from Urdu narration.",
    badge: "Inclusion Award",
    tag: "Accessibility",
    color: "indigo",
    icon: "Globe",
    timeAgo: "1h ago",
    bio: "Chloe realized that young students in her community struggled with English-only educational apps. She built SmartSign Urdu, which lets parents speak in Urdu to instantly generate interactive visual spelling and vocabulary cards.",
    techStack: ["Urdu & Voice Design", "Product Design", "Inclusion", "Creativity"],
    linkUrl: "#",
    linkLabel: "View Project Profile",
    quote: "Ensuring every child has access to quality education regardless of language was my goal. VibeLab made it possible to bring my voice-first idea to life."
  }
];

const StudentTicker = () => {
  const [selectedItem, setSelectedItem] = useState<SuccessItem | null>(null);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Cpu": return <Cpu className="w-4 h-4 text-cyan-600 animate-pulse" />;
      case "GraduationCap": return <GraduationCap className="w-4 h-4 text-amber-500" />;
      case "Zap": return <Zap className="w-4 h-4 text-emerald-500" />;
      case "Globe": return <Globe className="w-4 h-4 text-indigo-500" />;
      case "Trophy": return <Trophy className="w-4 h-4 text-rose-500" />;
      case "Sparkles": return <Sparkles className="w-4 h-4 text-violet-500" />;
      case "ShieldCheck": return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      case "BarChart3": return <BarChart3 className="w-4 h-4 text-teal-500" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getThemeColors = (color: string) => {
    switch (color) {
      case "cyan":
        return {
          glow: "hover:shadow-cyan-500/10 hover:border-cyan-500/30",
          accentBg: "bg-cyan-50 text-cyan-700 border-cyan-100/60",
          avatarGlow: "from-cyan-500 to-blue-500 shadow-cyan-200",
          gradientText: "from-cyan-600 to-blue-600",
          buttonColor: "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-100",
          badgeBorder: "border-cyan-200 text-cyan-800 bg-cyan-50/50"
        };
      case "amber":
        return {
          glow: "hover:shadow-amber-500/10 hover:border-amber-500/30",
          accentBg: "bg-amber-50 text-amber-700 border-amber-100/60",
          avatarGlow: "from-amber-400 to-orange-500 shadow-amber-200",
          gradientText: "from-amber-600 to-orange-600",
          buttonColor: "bg-amber-600 hover:bg-amber-700 shadow-amber-100",
          badgeBorder: "border-amber-200 text-amber-800 bg-amber-50/50"
        };
      case "emerald":
        return {
          glow: "hover:shadow-emerald-500/10 hover:border-emerald-500/30",
          accentBg: "bg-emerald-50 text-emerald-700 border-emerald-100/60",
          avatarGlow: "from-emerald-400 to-teal-500 shadow-emerald-200",
          gradientText: "from-emerald-600 to-teal-600",
          buttonColor: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100",
          badgeBorder: "border-emerald-200 text-emerald-800 bg-emerald-50/50"
        };
      case "indigo":
        return {
          glow: "hover:shadow-indigo-500/10 hover:border-indigo-500/30",
          accentBg: "bg-indigo-50 text-indigo-700 border-indigo-100/60",
          avatarGlow: "from-indigo-400 to-purple-500 shadow-indigo-200",
          gradientText: "from-indigo-600 to-purple-600",
          buttonColor: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100",
          badgeBorder: "border-indigo-200 text-indigo-800 bg-indigo-50/50"
        };
      case "rose":
        return {
          glow: "hover:shadow-rose-500/10 hover:border-rose-500/30",
          accentBg: "bg-rose-50 text-rose-700 border-rose-100/60",
          avatarGlow: "from-rose-400 to-red-500 shadow-rose-200",
          gradientText: "from-rose-600 to-red-600",
          buttonColor: "bg-rose-600 hover:bg-rose-700 shadow-rose-100",
          badgeBorder: "border-rose-200 text-rose-800 bg-rose-50/50"
        };
      case "violet":
        return {
          glow: "hover:shadow-violet-500/10 hover:border-violet-500/30",
          accentBg: "bg-violet-50 text-violet-700 border-violet-100/60",
          avatarGlow: "from-violet-400 to-fuchsia-500 shadow-violet-200",
          gradientText: "from-violet-600 to-fuchsia-600",
          buttonColor: "bg-violet-600 hover:bg-violet-700 shadow-violet-100",
          badgeBorder: "border-violet-200 text-violet-800 bg-violet-50/50"
        };
      case "blue":
        return {
          glow: "hover:shadow-blue-500/10 hover:border-blue-500/30",
          accentBg: "bg-blue-50 text-blue-700 border-blue-100/60",
          avatarGlow: "from-blue-400 to-indigo-500 shadow-blue-200",
          gradientText: "from-blue-600 to-indigo-600",
          buttonColor: "bg-blue-600 hover:bg-blue-700 shadow-blue-100",
          badgeBorder: "border-blue-200 text-blue-800 bg-blue-50/50"
        };
      case "teal":
        return {
          glow: "hover:shadow-teal-500/10 hover:border-teal-500/30",
          accentBg: "bg-teal-50 text-teal-700 border-teal-100/60",
          avatarGlow: "from-teal-400 to-emerald-500 shadow-teal-200",
          gradientText: "from-teal-600 to-emerald-600",
          buttonColor: "bg-teal-600 hover:bg-teal-700 shadow-teal-100",
          badgeBorder: "border-teal-200 text-teal-800 bg-teal-50/50"
        };
      default:
        return {
          glow: "hover:shadow-cyan-500/10 hover:border-cyan-500/30",
          accentBg: "bg-cyan-50 text-cyan-700 border-cyan-100/60",
          avatarGlow: "from-cyan-500 to-blue-500 shadow-cyan-200",
          gradientText: "from-cyan-600 to-blue-600",
          buttonColor: "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-100",
          badgeBorder: "border-cyan-200 text-cyan-800 bg-cyan-50/50"
        };
    }
  };

  return (
    <section className="py-24 bg-[#f8fafc] border-b border-slate-200 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.25em] text-[#2563eb]">Platform Proof &amp; Velocity</span>
            <h2 className="text-3xl md:text-4xl font-display font-extrabold text-slate-900 mt-2 tracking-tight">Live Student Launches &amp; Certifications</h2>
          </div>
          <p className="text-slate-500 text-sm max-w-md font-medium leading-relaxed">
            Real achievements built and validated on VibeLab, showcasing verified product concepts and expert-level AI credentials. Click any card to expand and review their full project blueprint.
          </p>
        </div>
      </div>

      {/* The scrolling track */}
      <div className="relative w-full overflow-hidden select-none">
        {/* Shadow Overlay Faders */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-[#f8fafc] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-[#f8fafc] to-transparent z-10 pointer-events-none" />

        <div className="animate-scroll-ticker flex gap-6 px-4">
          {[...SUCCESS_ITEMS, ...SUCCESS_ITEMS].map((item, index) => {
            const colors = getThemeColors(item.color);
            return (
              <div 
                key={`${item.id}-${index}`}
                onClick={() => setSelectedItem(item)}
                className={`w-[400px] h-[250px] bg-white border border-slate-200/85 rounded-[2.5rem] p-6 flex flex-col justify-between shrink-0 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1.5 relative group bg-gradient-to-br from-white to-slate-50/50 cursor-pointer ${colors.glow}`}
                id={`ticker-card-${item.id}-${index}`}
              >
                {/* Micro hover interaction overlay */}
                <div className="absolute bottom-4 right-6 text-[11px] font-extrabold text-[#2563eb] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1 bg-blue-50/90 px-3.5 py-2 rounded-full border border-blue-100/50 font-sans tracking-tight">
                  Expand Story <ArrowUpRight className="w-3.5 h-3.5" />
                </div>

                <div>
                  {/* Header Information */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors.avatarGlow} p-0.5 shadow-sm flex items-center justify-center transition-all duration-300 group-hover:scale-105`}>
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-display font-black text-[12px] text-slate-800 tracking-tight">
                          {item.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-[13.5px] leading-tight flex items-center gap-1 group-hover:text-[#2563eb] transition-colors">
                          {item.name}
                        </h4>
                        <p className="text-slate-400 text-[10.5px] font-semibold">{item.role}</p>
                      </div>
                    </div>
                    
                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest leading-none border uppercase font-sans ${colors.accentBg}`}>
                      {item.tag}
                    </span>
                  </div>

                  {/* Project or Credential Title */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-slate-50 border border-slate-100 group-hover:scale-110 transition-transform">
                        {getIcon(item.icon)}
                      </div>
                      <h3 className="font-display font-black text-base text-slate-800 tracking-tight leading-tight group-hover:text-slate-900">{item.title}</h3>
                    </div>
                    
                    {/* Performance metric highlight */}
                    <div className="inline-flex items-center gap-1.5 bg-slate-50/90 px-3 py-1 rounded-xl border border-slate-200/50 mt-1">
                      <span className="text-[11px] font-extrabold text-[#2563eb] tracking-tight">{item.metric}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed font-sans mt-3 pr-2">
                  {item.desc}
                </p>

                {/* Bottom Info Row */}
                <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-slate-400 font-sans text-[10.5px]">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9.5px] text-slate-500">
                    <span className="flex items-center gap-1">🏆 {item.badge}</span>
                  </div>
                  <span className="font-medium text-slate-400/80 group-hover:opacity-0 transition-opacity duration-200">{item.timeAgo}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Renders the Beautiful Expanded Slide-over / Modal popup */}
      <AnimatePresence>
        {selectedItem && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-slate-200 w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden"
              id="student-ticker-modal"
            >
              {/* Top Banner accent matching theme */}
              <div className={`h-2.5 w-full bg-gradient-to-r ${getThemeColors(selectedItem.color).avatarGlow}`} />

              <div className="p-8 sm:p-10">
                {/* Close Button */}
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-55 text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-100 cursor-pointer"
                  id="close-ticker-modal"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getThemeColors(selectedItem.color).avatarGlow} p-0.5 shadow-md flex items-center justify-center`}>
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-display font-black text-lg text-slate-800">
                        {selectedItem.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-black text-slate-900 leading-tight flex items-center gap-1.5">
                        {selectedItem.name}
                      </h3>
                      <p className="text-slate-500 font-semibold text-xs mt-0.5">{selectedItem.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest leading-none border uppercase ${getThemeColors(selectedItem.color).accentBg}`}>
                      {selectedItem.tag}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{selectedItem.timeAgo}</span>
                  </div>
                </div>

                {/* App Content */}
                <div className="mt-8 pt-8 border-t border-slate-100 space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {getIcon(selectedItem.icon)}
                      <h4 className="text-lg font-display font-black text-slate-800 tracking-tight">{selectedItem.title}</h4>
                      <span className="text-[11px] font-extrabold text-[#2563eb] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                        {selectedItem.metric}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line font-medium pr-1">
                      {selectedItem.bio}
                    </p>
                  </div>

                  {/* Student Quote Box */}
                  {selectedItem.quote && (
                    <blockquote className="bg-slate-50/80 border-l-4 border-slate-300 p-5 rounded-r-3xl my-4">
                      <p className="text-slate-600 text-xs font-serif italic leading-relaxed pr-2">
                        "{selectedItem.quote}"
                      </p>
                      <cite className="block text-[10.5px] font-bold text-slate-700 mt-2 font-mono uppercase tracking-[0.05em]">
                        — {selectedItem.name}, {selectedItem.role}
                      </cite>
                    </blockquote>
                  )}

                  {/* Tech Stack List */}
                  <div>
                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-mono mb-2">Technologies Used</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.techStack.map((tech, idx) => (
                        <span 
                          key={idx}
                          className="px-2.5 py-1 bg-slate-100 border border-slate-200/60 rounded-lg text-slate-600 font-mono text-[10.5px] font-bold"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Call to action & badge info */}
                  <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                      <span className="text-amber-500 text-sm">🏆</span> 
                      <span className="uppercase tracking-[0.05em] text-slate-500">{selectedItem.badge}</span>
                    </div>

                    <a
                      href={selectedItem.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${getThemeColors(selectedItem.color).buttonColor}`}
                    >
                      {selectedItem.type === "project" ? (
                        <Github className="w-4 h-4 text-white" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-white" />
                      )}
                      {selectedItem.linkLabel}
                      <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};


const WhyVibeLab = () => {
  return (
    <section id="why-vibelab" className="py-40 px-6 relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-600 mb-6 uppercase tracking-widest">
            <span>THE SHIFT IN PARADIGM</span>
          </div>
          <h2 className="font-display text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight">
            Education Teaches Answers. <br />
            <span className="gradient-text">VibeLab Teaches Creation.</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mt-6 leading-relaxed font-semibold">
            Traditional learning focuses on memorization. VibeLab is a future-skills platform teaching students to identify problems, build solutions, and use AI responsibly to create value.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-stretch max-w-5xl mx-auto">
          {/* Traditional Education */}
          <div className="p-10 rounded-[3rem] border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200/30 rounded-full blur-2xl -z-10" />
            <div>
              <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-500 mb-8 font-black font-mono text-lg">01</div>
              <h3 className="text-3xl font-extrabold mb-6 text-slate-400 tracking-tight">Traditional Education</h3>
              <p className="text-slate-500 leading-relaxed font-medium mb-10">
                Focuses primarily on structured pathways built around memory retrieval and standardized testing rather than hands-on innovation.
              </p>
            </div>
            <ul className="space-y-4">
              {[
                "Answering questions on tests",
                "Memorizing theoretical content",
                "Individual competitive assessments"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-400 font-bold text-sm">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* VibeLab Innovation */}
          <div className="p-10 rounded-[3rem] border border-cyan-500/20 bg-cyan-50/20 flex flex-col justify-between shadow-lg shadow-cyan-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/20 rounded-full blur-2xl -z-10 animate-pulse" />
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white mb-8 shadow-md">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-extrabold mb-6 text-slate-900 tracking-tight">VibeLab Innovation</h3>
              <p className="text-slate-600 leading-relaxed font-medium mb-10">
                A hands-on environment where students design real solutions, acquire practical digital literacy, and understand technological workflows.
              </p>
            </div>
            <ul className="space-y-4">
              {[
                "Identifying real-world local problems",
                "Designing and refining solutions with AI assistance",
                "Building finished, functional products and portfolios"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-cyan-700 font-bold text-sm">
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

const KeyObjectives = () => {
  const objectives = [
    { icon: <BrainCircuit />, title: "Develop AI Literacy", desc: "Equip students with the ability to leverage artificial intelligence responsibly, effectively, and strategically in their creations." },
    { icon: <Sparkles />, title: "Foster Innovation", desc: "Build critical thinking skills to analyze modern challenges and formulate imaginative, viable solution models." },
    { icon: <Rocket />, title: "Encourage Entrepreneurship", desc: "Introduce students to key concepts of value creation, user feedback loops, and sustainable small business design." },
    { icon: <Users />, title: "Build Confidence", desc: "Empower youth with communication skills, team-based coordination, and leadership capabilities through project presentations." },
    { icon: <GraduationCap />, title: "Career & Tech Readiness", desc: "Prepare the next generation for emerging technologies and the evolving requirements of the future workspace." },
    { icon: <School />, title: "School Innovation Culture", desc: "Introduce project-based excellence and AI literacy curricula directly into schools to transform local learning spaces." }
  ];

  return (
    <section className="py-40 px-6 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 mb-6 uppercase tracking-widest">
            <span>CORE OBJECTIVES</span>
          </div>
          <h2 className="font-display text-5xl md:text-6xl font-extrabold text-slate-900 max-w-4xl mx-auto leading-tight">
            Our Key Objectives for <br />
            <span className="text-emerald-600">Youth Transformation.</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mt-6 leading-relaxed font-semibold">
            We are creating a generation of builders, leaders, and problem-solvers ready to lead national development.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {objectives.map((obj, i) => (
            <div key={i} className="p-10 rounded-[3rem] bg-white border border-slate-100 text-left group hover:shadow-xl hover:shadow-slate-200/50 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/5 flex items-center justify-center text-emerald-600 mb-8 group-hover:scale-110 transition-transform shadow-sm">
                {obj.icon}
              </div>
              <h3 className="text-2xl font-extrabold mb-4 text-slate-900 tracking-tight leading-snug">{obj.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm font-semibold">{obj.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SkillsDeveloped = () => {
  const skills = [
    "Artificial Intelligence", "Critical Thinking", "Creativity", "Communication",
    "Product Design", "Problem Solving", "Entrepreneurship", "Teamwork",
    "Digital Literacy", "Leadership"
  ];

  return (
    <section className="py-28 px-6 bg-white border-y border-slate-100">
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-600 mb-6 uppercase tracking-widest">
          <span>COMPETENCY BLUEPRINT</span>
        </div>
        <h2 className="font-display text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 tracking-tight">
          Skills Developed Along the Journey.
        </h2>
        <p className="text-lg text-slate-600 max-w-xl mx-auto mb-12 font-medium leading-relaxed">
          Through active project building, students naturally develop a powerful matrix of practical and cognitive capabilities.
        </p>

        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {skills.map((skill, idx) => (
            <div 
              key={idx}
              className="px-6 py-3 rounded-full bg-slate-50 border border-slate-200/80 text-slate-700 font-bold text-sm hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all cursor-default shadow-sm duration-300"
            >
              {skill}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const UrduVoiceFirst = () => {
  return (
    <section className="py-32 px-6 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-600 mb-6 uppercase tracking-widest">
              <Globe className="w-3.5 h-3.5" />
              <span>URDU & VOICE FIRST SYSTEM</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 tracking-tight leading-tight">
              Built for Every Student, <br />
              <span className="text-indigo-600">In Every Language.</span>
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed font-semibold mb-8 max-w-2xl">
              Students can interact with VibeLab using Urdu, English, or voice-based conversation. This removes barriers to participation and ensures no student is excluded by language or technical comfort.
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { label: "Voice Narration", desc: "No keyboard needed. Build ideas naturally by speaking your thoughts." },
                { label: "Dual Language Support", desc: "Toggle seamlessly between high-context Urdu and global English interfaces." },
                { label: "No Technical Jargon", desc: "Every step is framed in straightforward, friendly human dialogue." }
              ].map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-lg">{item.label}</h4>
                  <p className="text-slate-500 text-sm font-semibold leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="p-8 rounded-[3rem] bg-white border border-slate-200/80 shadow-2xl space-y-6 relative z-10 max-w-sm mx-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-xs font-black uppercase text-indigo-600 tracking-wider font-mono">Accessibility Demo</span>
                <div className="flex gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">URDU</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">ENG</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-200 animate-pulse">
                  <Sparkles className="w-5 h-5 animate-spin-slow" />
                </div>
                <p className="text-slate-700 font-bold text-sm">"اپنا اگلا آئیڈیا یہاں ریکارڈ کریں..."</p>
                <p className="text-slate-400 text-xs font-medium">Speak naturally in your primary language</p>
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500/5 rounded-full blur-[80px] -z-0" />
          </div>
        </div>
      </div>
    </section>
  );
};

const ProjectCategories = () => {
  const categories = [
    { icon: <GraduationCap className="w-6 h-6" />, title: "Education", desc: "Interactive student tutoring, localized digital libraries, and literacy assistants.", color: "from-blue-500 to-cyan-500" },
    { icon: <Heart className="w-6 h-6" />, title: "Health", desc: "First-aid guidance advisors, patient appointment assistants, and visual health tracking helpers.", color: "from-rose-500 to-pink-500" },
    { icon: <Sprout className="w-6 h-6" />, title: "Agriculture", desc: "Crop yield estimators, soil hydration monitors, and local weather advisors.", color: "from-emerald-500 to-green-500" },
    { icon: <Leaf className="w-6 h-6" />, title: "Environment", desc: "Waste tracking systems, clean-air calculators, and recycling incentives.", color: "from-teal-500 to-emerald-500" },
    { icon: <Users className="w-6 h-6" />, title: "Community Development", desc: "Neighborhood clean-up coordinators, blood bank networks, and helper boards.", color: "from-indigo-500 to-purple-500" },
    { icon: <Briefcase className="w-6 h-6" />, title: "Small Businesses", desc: "Visual catalog creators, local product pricing calculators, and sales trackers.", color: "from-amber-500 to-orange-500" },
    { icon: <Building2 className="w-6 h-6" />, title: "Public Services", desc: "Civic complaint trackers, public transportation schedules, and safety portals.", color: "from-sky-500 to-blue-500" },
    { icon: <Cpu className="w-6 h-6" />, title: "Technology", desc: "Productivity automations, voice assistants, and responsive data visualizers.", color: "from-purple-500 to-pink-500" }
  ];

  return (
    <section id="categories-section" className="py-40 px-6 relative bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-600 mb-6 uppercase tracking-widest">
            <span>REAL-WORLD PROBLEM SPACES</span>
          </div>
          <h2 className="font-display text-5xl md:text-6xl font-extrabold mb-8 text-slate-900 leading-tight">
            Real Problems. <span className="gradient-text">Real Impact.</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-semibold">
            Every project connects to a real challenge — local, national, or global.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -8 }}
              className="p-8 rounded-[2.5rem] bg-white border border-slate-100 relative group overflow-hidden shadow-sm hover:shadow-xl transition-all"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-[0.03] transition-opacity`} />
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-700 font-black mb-6 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all shadow-sm">
                {cat.icon}
              </div>
              <h3 className="text-2xl font-extrabold mb-3 text-slate-900 tracking-tight leading-tight">{cat.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm font-semibold">{cat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Audience = () => {
  const audiences = [
    {
      title: "For Schools",
      tagline: "Build a culture of innovation on campus",
      image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80",
      benefits: [
        "Increased student engagement",
        "Structured AI exposure & literacy",
        "Active, project-based learning",
        "Enhanced student portfolios",
        "Future-ready skills on transcripts"
      ],
      cta: "Explore School Programs →"
    },
    {
      title: "For Students",
      tagline: "Build real projects, launch real careers",
      image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=600&q=80",
      benefits: [
        "Build real-world local solutions",
        "Learn strategic AI tools practically",
        "Develop leadership and confidence",
        "Gain entrepreneurial exposure",
        "Acquire verified innovation badges"
      ],
      cta: "Start Your Portfolio →"
    },
    {
      title: "For Government & Partners",
      tagline: "Empower national digital transformation",
      image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80",
      benefits: [
        "Support regional digital literacy",
        "Promote national AI competencies",
        "Encourage localized problem-solving",
        "Secure career pipeline readiness",
        "Enhance national competitiveness"
      ],
      cta: "Connect with VibeLab →"
    }
  ];

  return (
    <section id="audience-section" className="py-40 px-6 bg-white relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-600 mb-6 uppercase tracking-widest">
            <span>WHO WE SERVE</span>
          </div>
          <h2 className="font-display text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight">
            Impact Across Every <span className="gradient-text">Ecosystem.</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mt-6 leading-relaxed font-semibold">
            We partner with schools, students, and government bodies to prepare communities for the AI-driven future.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {audiences.map((aud, i) => (
            <div key={i} className="flex flex-col rounded-[3rem] border border-slate-100 bg-slate-50/30 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
              <div className="h-60 relative overflow-hidden">
                <img 
                  src={aud.image} 
                  alt={aud.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-slate-900/10 mix-blend-multiply" />
              </div>
              <div className="p-8 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">{aud.title}</h3>
                  <p className="text-sm font-bold text-cyan-650 uppercase tracking-widest mb-8">{aud.tagline}</p>
                  <ul className="space-y-4 mb-10">
                    {aud.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-600 font-semibold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <span className="inline-flex items-center gap-2 text-slate-900 font-bold text-sm group-hover:text-cyan-600 transition-colors">
                    {aud.cta}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const testimonials = [
    {
      text: "The AI-driven roadmap was a game-changer. It identified exactly where I was struggling and provided targeted exercises that actually worked.",
      name: "Sarah Jenkins",
      role: "Product Strategist at Meta",
      img: "https://i.pravatar.cc/150?img=32"
    },
    {
      text: "I've tried many platforms, but the immersive labs here are on another level. It's the closest thing to real-world experience you can get online.",
      name: "David Chen",
      role: "Innovation Lead at Google",
      img: "https://i.pravatar.cc/150?img=12"
    },
    {
      text: "VibeLab's project-based approach helped me launch my first local community solution in just 4 months. The community is incredibly supportive.",
      name: "Elena Rodriguez",
      role: "Product Specialist at Vercel",
      img: "https://i.pravatar.cc/150?img=45"
    },
    {
      text: "The ability to build real-world solutions while learning the fundamentals is what sets VibeLab apart. It's the future of education.",
      name: "Marcus Thorne",
      role: "Innovation Consultant at Stripe",
      img: "https://i.pravatar.cc/150?img=68"
    }
  ];

  const next = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  return (
    <section id="testimonials" className="py-32 px-6 bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[150px] -z-10" />
      
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-12 items-center">
          <div className="lg:col-span-1">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 text-slate-900 leading-tight">
              What Our <br />
              <span className="gradient-text">Learners</span> Say.
            </h2>
            <p className="text-slate-600 mb-10">Real stories from students who transformed their careers through VibeLab.</p>
            <div className="flex gap-4">
              <button 
                onClick={prev}
                className="w-14 h-14 rounded-2xl glass flex items-center justify-center hover:bg-slate-50 transition-colors active:scale-95"
              >
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
              <button 
                onClick={next}
                className="w-14 h-14 rounded-2xl glass flex items-center justify-center hover:bg-slate-50 transition-colors active:scale-95"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="lg:col-span-2 relative h-[400px] md:h-[300px] flex items-center">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={activeIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                className="absolute w-full"
              >
                <div className="p-10 rounded-[2.5rem] glass border-slate-200 relative">
                  <MessageSquare className="absolute top-10 right-10 w-12 h-12 text-cyan-500/5" />
                  <p className="text-lg md:text-xl text-slate-700 mb-10 italic leading-relaxed">
                    "{testimonials[activeIndex].text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <img 
                      src={testimonials[activeIndex].img} 
                      alt={testimonials[activeIndex].name} 
                      className="w-14 h-14 rounded-2xl object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                    <div>
                      <h4 className="font-bold text-slate-900">{testimonials[activeIndex].name}</h4>
                      <p className="text-xs text-cyan-600 font-bold uppercase tracking-widest">
                        {testimonials[activeIndex].role}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

const Stats = () => {
  return (
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: "Active Students", value: 50, suffix: "k+" },
            { label: "Course Completion", value: 94, suffix: "%" },
            { label: "Global Partners", value: 120, suffix: "+" },
            { label: "Career Success", value: 88, suffix: "%" }
          ].map((s, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -12 }}
              className="text-center p-10 rounded-[2.5rem] transition-all hover:bg-white hover:shadow-2xl hover:shadow-cyan-500/10 border border-transparent hover:border-slate-100 group"
            >
              <div className="text-5xl md:text-7xl font-display font-black text-slate-900 mb-4 neon-glow group-hover:text-cyan-600 transition-colors">
                <CountingNumber value={s.value} suffix={s.suffix} />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] group-hover:text-slate-600 transition-colors">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const VisionSection = () => {
  return (
    <section id="vision" className="py-36 px-6 bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[150px] -z-0" />
      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-400 mb-10 uppercase tracking-widest">
          <span>OUR VISION</span>
        </div>
        <blockquote className="text-2xl md:text-4xl font-display font-medium leading-relaxed text-slate-100 max-w-4xl mx-auto italic">
          "To empower every student to become a creator, innovator, and problem solver by using Artificial Intelligence to transform ideas into real-world solutions. Our goal is to make innovation accessible to every student, regardless of background, language, or technical experience. VibeLab aims to create the next generation of builders, entrepreneurs, and AI-powered innovators."
        </blockquote>
        <div className="mt-10 flex items-center justify-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <p className="text-xs uppercase tracking-widest font-black text-cyan-400">The VibeLab Manifesto</p>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </div>
      </div>
    </section>
  );
};

const FinalCTA = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  return (
    <section className="py-40 px-6 relative overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 via-blue-600/5 to-transparent -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-cyan-500/5 rounded-full blur-[150px] -z-20" />
      
      <div className="max-w-5xl mx-auto text-center glass p-16 md:p-24 rounded-[4rem] border-white/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] relative overflow-hidden bg-white/40 backdrop-blur-2xl">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center shadow-2xl shadow-slate-900/20">
          <Rocket className="text-white w-10 h-10" />
        </div>
        
        <h2 className="font-display text-4xl md:text-6xl font-extrabold mb-8 text-slate-900 leading-tight tracking-tight">
          Every Student Deserves the Chance <br />
          <span className="gradient-text">to Build Something Real.</span>
        </h2>
        
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed font-semibold">
          Begin your journey with VibeLab today and acquire the innovation skills of tomorrow. No coding required.
        </p>

        <div className="flex flex-col items-center gap-4">
          <button 
            onClick={() => onNavigate('signup')}
            className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap shadow-xl shadow-slate-200 flex items-center gap-2"
          >
            Start the Journey <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">No technical background needed. No cost to start.</p>
        </div>
      </div>
    </section>
  );
};

const Footer = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const user = (() => {
    try {
      const savedUser = localStorage.getItem('vibelab_user');
      return savedUser && savedUser !== 'undefined' ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  })();

  return (
    <footer className="pt-16 pb-8 px-6 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
        <div className="col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <BrainCircuit className="text-white w-5 h-5" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-slate-900">VibeLab</span>
          </div>
          <p className="text-slate-600 mb-6 max-w-xs leading-relaxed text-sm">
            The world's first project-native learning platform for the next generation of builders.
          </p>
          <div className="space-y-4">
            <div className="flex gap-4">
              {[
                { icon: <Twitter className="w-4 h-4" />, href: "https://twitter.com/vibelab" },
                { icon: <Linkedin className="w-4 h-4" />, href: "https://linkedin.com/company/vibelab" },
                { icon: <Github className="w-4 h-4" />, href: "https://github.com/vibelab" }
              ].map((social, i) => (
                <a 
                  key={i} 
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-cyan-500/5 hover:text-cyan-600 transition-all cursor-pointer border border-slate-205 text-slate-500"
                >
                  {social.icon}
                </a>
              ))}
            </div>
            <a href="mailto:vibelab@nexaforgetech.com" className="flex items-center gap-3 text-slate-600 hover:text-cyan-600 transition-colors group text-sm">
              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-cyan-50 transition-colors border border-slate-100/50">
                <Mail className="w-4 h-4" />
              </div>
              <span className="font-medium">vibelab@nexaforgetech.com</span>
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          <h4 className="text-slate-900 font-bold uppercase tracking-widest text-xs mb-1">Platform</h4>
          <a href="#" className="text-slate-600 hover:text-cyan-650 transition-colors">Curriculum</a>
          <a href="#" className="text-slate-600 hover:text-cyan-650 transition-colors">AI Tutors</a>
          <a href="#" className="text-slate-600 hover:text-cyan-650 transition-colors">VR Labs</a>
          <a href="#" className="text-slate-600 hover:text-cyan-650 transition-colors">Pricing</a>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          <h4 className="text-slate-900 font-bold uppercase tracking-widest text-xs mb-1">Resources</h4>
          <a href="#" className="text-slate-600 hover:text-cyan-650 transition-colors">Documentation</a>
          <a href="#" className="text-slate-600 hover:text-cyan-650 transition-colors">Community</a>
          <a href="#" className="text-slate-600 hover:text-cyan-650 transition-colors">API Reference</a>
          <a href="#" className="text-slate-600 hover:text-cyan-650 transition-colors">Blog</a>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          <h4 className="text-slate-900 font-bold uppercase tracking-widest text-xs mb-1">Company</h4>
          <button onClick={() => onNavigate('about')} className="text-left text-slate-600 hover:text-cyan-655 transition-colors cursor-pointer">About Us</button>
          <a href="#" className="text-slate-600 hover:text-cyan-655 transition-colors">Careers</a>
          <button onClick={() => onNavigate('verify-credential')} className="text-left text-slate-600 hover:text-cyan-655 transition-colors cursor-pointer">Verify Credential</button>
          <a href="#" className="text-slate-600 hover:text-cyan-655 transition-colors">Press</a>
          <button onClick={() => onNavigate('contact')} className="text-left text-slate-600 hover:text-cyan-655 transition-colors cursor-pointer">Contact</button>
        </div>

        {user?.role === 'admin' && (
          <div className="flex flex-col gap-4 text-sm">
            <h4 className="text-slate-900 font-bold uppercase tracking-widest text-xs mb-1">Admin</h4>
            <button 
              onClick={() => onNavigate('admin')}
              className="text-left text-slate-600 hover:text-cyan-660 transition-colors"
            >
              Submissions
            </button>
            <a href="#" className="text-slate-600 hover:text-cyan-660 transition-colors">Internal Ops</a>
          </div>
        )}
      </div>
      
      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span>© 2026 VibeLab Inc. All rights reserved.</span>
          <span className="normal-case tracking-normal font-medium text-slate-500">
            An Education Initiated by <a href="https://www.nexaforgetech.com" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">Nexaforge Technologies</a>
          </span>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span>Systems Operational</span>
          </div>
          <a href="#" className="hover:text-slate-900 transition-colors">Status Page</a>
        </div>
      </div>
    </footer>
  );
};

const LearningPathSection = () => {
  const phases = [
    { id: 1, name: "Ideation", desc: "Students identify real-world problems and develop solution concepts using AI-assisted brainstorming." },
    { id: 2, name: "Product Creation", desc: "Students work with AI to transform their concepts into working products and functional prototypes." },
    { id: 3, name: "Testing & Validation", desc: "Students test their solutions, gather feedback from neighbors or peers, and iterate on designs." },
    { id: 4, name: "Product Understanding", desc: "Students learn how their solutions work through self-teaching guides — building genuine comprehension, not just output." },
    { id: 5, name: "Deployment", desc: "Students launch and share their completed solutions with the local and national community." },
    { id: 6, name: "Portfolio & Career", desc: "Students build portfolios showcasing verified projects, achievements, and future-ready skills." }
  ];

  return (
    <section id="how-it-works" className="py-40 px-6 bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] -z-0" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <h2 className="font-display text-5xl md:text-6xl font-extrabold mb-8 leading-tight text-white">
            The 6-Phase <span className="text-cyan-400">Journey.</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-semibold">
            From curious student to confident innovator — a step-by-step pathway designed to empower every learner, regardless of background.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {phases.map((phase) => (
            <div key={phase.id} className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                <span className="text-4xl font-display font-black text-white/10 group-hover:text-cyan-400/20 transition-colors">0{phase.id}</span>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white tracking-tight leading-tight">Phase {phase.id} — {phase.name}</h3>
              <p className="text-slate-400 leading-relaxed text-sm font-medium">{phase.desc}</p>
            </div>
          ))}
          
          <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-cyan-600 to-blue-700 flex flex-col justify-center items-center text-center shadow-2xl shadow-cyan-500/20 lg:col-span-2">
             <Trophy className="w-12 h-12 text-white mb-4" />
             <h3 className="text-2xl font-bold mb-2">Portfolio Readiness</h3>
             <p className="text-white/80 text-sm font-medium">Complete all phases to showcase a verified public portfolio of verified innovations.</p>
          </div>
        </div>
      </div>
    </section>
  );
};



const PublicProfileWrapper = ({ currentUser }: { currentUser: any }) => {
  const { id } = useParams<{ id: string }>();
  return <PublicProfile userId={id || ""} currentUser={currentUser} />;
};

const LandingPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  return (
    <>
      <Hero onNavigate={onNavigate} />
      <TrustedBy />
      <StudentTicker />
      <WhyVibeLab />
      <KeyObjectives />
      <LearningPathSection />
      <SkillsDeveloped />
      <UrduVoiceFirst />
      <ProjectCategories />
      <Audience />
      <PricingPlans onNavigate={onNavigate} />
      <VisionSection />
      <FinalCTA onNavigate={onNavigate} />
    </>
  );
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Load user from localStorage immediately
  const [user, setUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('vibelab_user');
    if (savedUser && savedUser !== 'undefined') {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
    return null;
  });

  const [loadingSession, setLoadingSession] = useState(true);

  const handleNavigate = (page: string) => {
    if (page.startsWith('/')) {
      navigate(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const routeMap: Record<string, string> = {
      home: '/',
      dashboard: '/dashboard',
      login: '/login',
      signup: '/signup',
      'verify-credential': '/verify-credential',
      'verify-email': '/verify-email',
      'reset-password': '/reset-password',
      'forgot-password': '/forgot-password',
      'about': '/about',
      'leaderboard': '/leaderboard',
      'admin': '/admin',
      'contact': '/contact',
      ideation: '/ideation',
      'ideation-chat': '/ideation/chat',
      'ideation-blueprint': '/ideation/blueprint',
      intro: '/intro',
      'profile-setup': '/onboarding',
      'employers': '/employers',
      'phase-2': '/phase/2',
      settings: '/settings'
    };

    const targetPath = routeMap[page];
    if (targetPath) {
      navigate(targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // 1. Process potential OAuth callback query parameters (legacy fallback)
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');
    const oauthUser = params.get('user');

    if (oauthToken && oauthUser) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(oauthUser));
        localStorage.setItem('vibelab_token', oauthToken);
        localStorage.setItem('vibelab_user', JSON.stringify(parsedUser));
        setUser(parsedUser);
        navigate('/dashboard', { replace: true });
        setLoadingSession(false);
      } catch (err) {
        console.error("Failed to parse OAuth callback user parameters", err);
        setLoadingSession(false);
      }
    } else {
      // Fetch latest user status to synchronize session flags
      const storedToken = localStorage.getItem('vibelab_token');
      if (storedToken) {
        fetch('/api/user/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        })
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('Failed to validate session');
          })
          .then(data => {
            if (data.user) {
              localStorage.setItem('vibelab_user', JSON.stringify(data.user));
              setUser(data.user);
            }
          })
          .catch(err => {
            console.error("Session sync failed:", err);
          })
          .finally(() => {
            setLoadingSession(false);
          });
      } else {
        setLoadingSession(false);
      }
    }

    // Clean up modern script-injected OAuth redirection flag if any
    if (localStorage.getItem('vibelab_oauth_redirect') === 'true') {
      localStorage.removeItem('vibelab_oauth_redirect');
    }
  }, [navigate]);

  useEffect(() => {
    if (loadingSession) return;

    const path = location.pathname;
    const isPublicPath = 
      path === '/' || 
      path === '/login' || 
      path === '/signup' || 
      path === '/verify-credential' || 
      path === '/employers' ||
      path === '/leaderboard' || 
      path === '/reset-password' || 
      path === '/forgot-password' || 
      path === '/verify-email' || 
      path === '/about' || 
      path === '/contact' || 
      path.startsWith('/profile/') || 
      path.startsWith('/verify/');

    const token = localStorage.getItem('vibelab_token');
    if (!token || !user) {
      // If NOT logged in, restrict access to private paths
      if (!isPublicPath) {
        navigate('/login', { replace: true });
      }
    } else {
      // If logged in & token valid
      const onboardingCompleted = 
        user.onboarding_completed === true || 
        user.onboarding_completed === 1 || 
        user.onboarding_completed === 'true' || 
        user.onboarding_completed === '1' ||
        user.profile_completed === true || 
        user.profile_completed === 1 ||
        user.profile_completed === 'true' || 
        user.profile_completed === '1';

      const introCompleted = 
        user.intro_completed === true || 
        user.intro_completed === 1 ||
        user.intro_completed === 'true' || 
        user.intro_completed === '1';

      if (!onboardingCompleted) {
        if (path !== '/onboarding') {
          navigate('/onboarding', { replace: true });
        }
      } else if (!introCompleted) {
        if (path !== '/intro') {
          navigate('/intro', { replace: true });
        }
      } else {
        // If they completed both, and are on onboarding / intro / login / signup, send them to dashboard or ideation
        if (path === '/intro' || path === '/onboarding' || path === '/login' || path === '/signup') {
          if (path === '/intro') {
            navigate('/ideation', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }
      }
    }
  }, [user, location.pathname, loadingSession, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('vibelab_user');
    localStorage.removeItem('vibelab_token');
    setUser(null);
    navigate('/', { replace: true });
  };

  // Derive "currentPage" for backwards compatibility of navbar/footers that depend on it
  const getPageNameFromPath = (path: string) => {
    if (path === '/') return 'home';
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path === '/login') return 'login';
    if (path === '/signup') return 'signup';
    if (path === '/onboarding') return 'profile-setup';
    if (path === '/intro') return 'intro';
    if (path === '/ideation') return 'ideation';
    if (path === '/ideation/chat') return 'ideation-chat';
    if (path === '/ideation/blueprint') return 'ideation-blueprint';
    if (path.startsWith('/phase/2')) return 'phase-2';
    if (path.startsWith('/phase/')) return 'phase';
    if (path.startsWith('/profile/') || path.startsWith('/verify/')) return 'verify-profile';
    if (path === '/verify-credential' || path === '/employers') return 'verify-credential';
    if (path === '/leaderboard') return 'leaderboard';
    if (path === '/settings') return 'settings';
    if (path === '/about') return 'about';
    if (path === '/contact') return 'contact';
    if (path === '/admin') return 'admin';
    if (path === '/verify-email') return 'verify-email';
    if (path === '/forgot-password') return 'forgot-password';
    if (path === '/reset-password') return 'reset-password';
    return 'home';
  };

  const currentPage = getPageNameFromPath(location.pathname);

  return (
    <div className="min-h-screen selection:bg-cyan-500/20 selection:text-cyan-900">
      <Toaster position="top-center" reverseOrder={false} />
      {currentPage !== 'ideation-chat' && currentPage !== 'ideation' && currentPage !== 'ideation-blueprint' && currentPage !== 'intro' && currentPage !== 'phase-2' && (
        <Navbar 
          onNavigate={handleNavigate} 
          currentPage={currentPage} 
          user={user}
          onLogout={handleLogout}
        />
      )}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage onNavigate={handleNavigate} />} />
          <Route path="/login" element={<Login onNavigate={handleNavigate} onLoginSuccess={setUser} />} />
          <Route path="/signup" element={<Signup onNavigate={handleNavigate} onLoginSuccess={setUser} />} />
          <Route path="/onboarding" element={<ProfileSetupWizard user={user} onUpdateUser={setUser} onNavigate={handleNavigate} />} />
          <Route path="/intro" element={<IntroPage onNavigate={handleNavigate} onUpdateUser={setUser} />} />
          
          <Route path="/dashboard" element={<Dashboard user={user} onLogout={handleLogout} onUpdateUser={setUser} onNavigate={handleNavigate} />} />
          <Route path="/dashboard/blueprints" element={<Dashboard user={user} onLogout={handleLogout} onUpdateUser={setUser} onNavigate={handleNavigate} />} />
          <Route path="/dashboard/submissions" element={<Dashboard user={user} onLogout={handleLogout} onUpdateUser={setUser} onNavigate={handleNavigate} />} />
          <Route path="/dashboard/certificates" element={<Dashboard user={user} onLogout={handleLogout} onUpdateUser={setUser} onNavigate={handleNavigate} />} />
          <Route path="/dashboard/grading" element={<Dashboard user={user} onLogout={handleLogout} onUpdateUser={setUser} onNavigate={handleNavigate} />} />
          <Route path="/dashboard/support" element={<Dashboard user={user} onLogout={handleLogout} onUpdateUser={setUser} onNavigate={handleNavigate} />} />
          <Route path="/dashboard/leaderboard" element={<Dashboard user={user} onLogout={handleLogout} onUpdateUser={setUser} onNavigate={handleNavigate} />} />
          
          <Route path="/ideation" element={<IdeationEntry onNavigate={handleNavigate} />} />
          <Route path="/ideation/chat" element={<IdeationChat onNavigate={handleNavigate} />} />
          <Route path="/ideation/blueprint" element={<IdeationBlueprint onNavigate={handleNavigate} onUpdateUser={setUser} />} />
          <Route path="/phase/2" element={<Phase2Page onNavigate={handleNavigate} />} />
          <Route path="/phase/2/features" element={<Phase2Page onNavigate={handleNavigate} />} />
          <Route path="/phase/2/journey" element={<Phase2Page onNavigate={handleNavigate} />} />
          <Route path="/phase/2/screens" element={<Phase2Page onNavigate={handleNavigate} />} />
          <Route path="/phase/2/building" element={<Phase2Page onNavigate={handleNavigate} />} />
          <Route path="/phase/2/review" element={<Phase2Page onNavigate={handleNavigate} />} />
          <Route path="/phase/2/description" element={<Phase2Page onNavigate={handleNavigate} />} />
          <Route path="/phase/2/explain" element={<Phase2Page onNavigate={handleNavigate} />} />
          <Route path="/phase/2/demo" element={<Phase2Page onNavigate={handleNavigate} />} />
          <Route path="/phase/2/complete" element={<Phase2Page onNavigate={handleNavigate} />} />
          <Route path="/phase/:id" element={<Dashboard user={user} onLogout={handleLogout} onUpdateUser={setUser} onNavigate={handleNavigate} />} />
          
          <Route path="/profile/:id" element={<PublicProfileWrapper currentUser={user} />} />
          <Route path="/verify/:id" element={<PublicProfileWrapper currentUser={user} />} />
          
          <Route path="/employers" element={<VerifyCredential onNavigate={handleNavigate} />} />
          <Route path="/verify-credential" element={<VerifyCredential onNavigate={handleNavigate} />} />
          
          <Route path="/leaderboard" element={
            <div className="min-h-screen pt-44 pb-20 px-4 bg-slate-50/50 relative overflow-hidden">
              <div className="absolute top-[20%] left-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] -z-10 animate-pulse" />
              <div className="absolute bottom-[20%] right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] -z-10" />
              
              <div className="max-w-6xl mx-auto">
                <Leaderboard 
                  hideRegionFilter={true}
                  onViewProfile={(vlId) => {
                    navigate(`/profile/${vlId}`);
                  }} 
                />
              </div>
            </div>
          } />
          
          <Route path="/settings" element={<Dashboard user={user} onLogout={handleLogout} onUpdateUser={setUser} onNavigate={handleNavigate} />} />
          
          <Route path="/about" element={<AboutPage onNavigate={handleNavigate} />} />
          <Route path="/contact" element={<ContactPage onNavigate={handleNavigate} />} />
          <Route path="/admin" element={<AdminPanel onNavigate={handleNavigate} />} />
          <Route path="/verify-email" element={<VerifyEmail onNavigate={handleNavigate} />} />
          <Route path="/forgot-password" element={<ForgotPassword onNavigate={handleNavigate} />} />
          <Route path="/reset-password" element={<ResetPassword onNavigate={handleNavigate} />} />
        </Routes>
      </main>
      {currentPage !== 'dashboard' && currentPage !== 'verify-profile' && currentPage !== 'ideation' && currentPage !== 'ideation-chat' && currentPage !== 'ideation-blueprint' && currentPage !== 'profile-setup' && currentPage !== 'intro' && <Footer onNavigate={handleNavigate} />}
    </div>
  );
}
