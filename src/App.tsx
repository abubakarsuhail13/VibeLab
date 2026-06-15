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
  ArrowUpRight
} from "lucide-react";
import { useState, useRef, useEffect, FormEvent } from "react";
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

  const navTo = (page: string) => {
    setIsOpen(false);
    onNavigate(page);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center p-6 pointer-events-none">
      <div className="glass px-6 sm:px-8 py-4 rounded-2xl flex items-center gap-8 max-w-6xl w-full justify-between shadow-xl shadow-slate-200/50 pointer-events-auto border border-white/20 backdrop-blur-md relative z-50">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navTo('home')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
            <BrainCircuit className="text-white w-6 h-6" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-slate-900">VibeLab</span>
        </div>
        <div className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-semibold text-slate-600">
          <button 
            onClick={() => navTo('home')} 
            className={`hover:text-cyan-600 transition-colors ${currentPage === 'home' ? 'text-slate-900 font-extrabold' : ''}`}
          >
            Home
          </button>
          
          <button 
            onClick={handleHowItWorksClick} 
            className="hover:text-cyan-600 transition-colors"
          >
            How It Works
          </button>

          {user && (
            <button 
              onClick={() => navTo('dashboard')} 
              className={`hover:text-cyan-600 transition-colors ${currentPage === 'dashboard' ? 'text-slate-900 font-extrabold' : ''}`}
            >
              Dashboard
            </button>
          )}

          {user && (
            <button 
              onClick={() => navTo('leaderboard')} 
              className={`hover:text-cyan-600 transition-colors ${currentPage === 'leaderboard' ? 'text-cyan-600 font-black' : ''}`}
            >
              Global Leaderboard
            </button>
          )}

          <button 
            onClick={() => navTo('verify-credential')} 
            className={`hover:text-cyan-600 transition-colors ${currentPage === 'verify-credential' ? 'text-slate-900 font-extrabold' : ''}`}
          >
            Verify Credential
          </button>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <>
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-xs font-bold text-slate-900 leading-tight">{user.name}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
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
              <button 
                onClick={onLogout}
                className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all select-none"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => navTo('login')}
                className="text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:text-slate-900 transition-all"
              >
                Login
              </button>
              <button 
                onClick={() => navTo('signup')}
                className="bg-slate-905 text-white bg-slate-900 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
              >
                Sign Up
              </button>
            </>
          )}

          {/* Hamburger Mobile Toggle */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors pointer-events-auto"
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
                className={`w-full py-3 px-4 rounded-xl text-left text-sm font-bold ${currentPage === 'home' ? 'bg-cyan-500/10 text-cyan-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Home
              </button>

              <button 
                onClick={handleHowItWorksClick} 
                className="w-full py-3 px-4 rounded-xl text-left text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                How It Works
              </button>

              {user && (
                <button 
                  onClick={() => navTo('dashboard')} 
                  className={`w-full py-3 px-4 rounded-xl text-left text-sm font-bold ${currentPage === 'dashboard' ? 'bg-cyan-500/10 text-cyan-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Dashboard
                </button>
              )}

              {user && (
                <button 
                  onClick={() => navTo('leaderboard')} 
                  className={`w-full py-3 px-4 rounded-xl text-left text-sm font-bold ${currentPage === 'leaderboard' ? 'bg-cyan-500/10 text-cyan-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Global Leaderboard
                </button>
              )}

              <button 
                onClick={() => navTo('verify-credential')} 
                className={`w-full py-3 px-4 rounded-xl text-left text-sm font-bold ${currentPage === 'verify-credential' ? 'bg-cyan-500/10 text-cyan-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Verify Credential
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const LaunchAnimation = () => {
  const [isLaunching, setIsLaunching] = useState(false);

  // Cycle animation every 6 seconds
  useState(() => {
    const interval = setInterval(() => {
      setIsLaunching(prev => !prev);
    }, 6000);
    return () => clearInterval(interval);
  });

  return (
    <div className="relative w-full aspect-[4/5] flex items-center justify-center">
      {/* Background Atmosphere */}
      <motion.div 
        animate={{ 
          scale: isLaunching ? 1.2 : 1,
          opacity: isLaunching ? 0.8 : 0.4
        }}
        className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent rounded-[3rem] blur-3xl"
      />

      {/* The "App" being built/launched with infinitely looping float and responsive shift */}
      <motion.div
        animate={{ 
          y: isLaunching ? [-35, -42, -35] : [0, -10, 0],
          scale: isLaunching ? 1.05 : 1,
          rotateX: isLaunching ? 4 : 0
        }}
        transition={{ 
          y: { 
            repeat: Infinity, 
            duration: 4.5, 
            ease: "easeInOut" 
          },
          scale: { type: "spring", stiffness: 100 },
          rotateX: { type: "spring", stiffness: 100 }
        }}
        className="relative z-20 w-72 md:w-80 glass p-6 rounded-[2.5rem] border-cyan-500/20 shadow-2xl overflow-hidden"
      >
        {/* App Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/50" />
          </div>
          <motion.div 
            animate={{ opacity: isLaunching ? 1 : 0, x: isLaunching ? 0 : 10 }}
            className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-[10px] font-bold text-emerald-600 uppercase tracking-wider"
          >
            Live
          </motion.div>
        </div>

        {/* App Content Area */}
        <div className="space-y-4">
          <div className="h-44 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center overflow-hidden relative">
            {/* Custom Code Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
            
            {!isLaunching ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 text-center p-2 relative z-10 w-full h-full justify-center"
              >
                {/* Side-by-Side Floating Tech stack representing educational/coding process */}
                <div className="flex items-center justify-center gap-3 relative">
                  {/* Laptop Emoji */}
                  <motion.div
                    animate={{ y: [0, -6, 0], rotate: [0, -2, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="relative w-14 h-14 flex items-center justify-center"
                  >
                    <img 
                      src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Laptop.png" 
                      alt="Laptop" 
                      className="w-12 h-12 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>

                  {/* Connecting Digital Spark Pulsing */}
                  <div className="h-0.5 w-6 bg-gradient-to-r from-blue-500 to-cyan-400 animate-pulse relative">
                    <span className="absolute -top-1 left-1/2 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
                  </div>

                  {/* Technologist Emoji */}
                  <motion.div
                    animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
                    transition={{ repeat: Infinity, duration: 3, delay: 0.5, ease: "easeInOut" }}
                    className="relative w-14 h-14 flex items-center justify-center"
                  >
                    <img 
                      src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People%20with%20professions/Man%20Technologist%20Medium%20Light%20Skin%20Tone.png" 
                      alt="Coder" 
                      className="w-12 h-12 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                </div>

                {/* Micro educational feedback console displaying live Vibe compilation */}
                <div className="flex flex-col items-center w-full px-4">
                  <span className="text-[10px] font-mono text-cyan-400 font-extrabold uppercase tracking-widest bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-800/40 animate-pulse">
                    ⚡ Vibe compiling App
                  </span>
                  
                  {/* Floating Code Snippets with Framer Motion */}
                  <div className="absolute inset-x-0 bottom-1 flex justify-around gap-1 pointer-events-none opacity-40 px-2">
                    <motion.span 
                      animate={{ y: [15, -60], opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                      className="font-mono text-[9px] text-cyan-400 font-bold bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-800/20"
                    >
                      npm run dev
                    </motion.span>
                    <motion.span 
                      animate={{ y: [15, -60], opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 2.2, delay: 0.8, ease: "linear" }}
                      className="font-mono text-[9px] text-indigo-400 font-bold bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-800/20"
                    >
                      {"<VibeCode />"}
                    </motion.span>
                    <motion.span 
                      animate={{ y: [15, -60], opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 2.2, delay: 1.4, ease: "linear" }}
                      className="font-mono text-[9px] text-emerald-400 font-bold bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-800/20"
                    >
                      Gemini.vibe()
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 text-center relative z-10 w-full h-full justify-center"
              >
                {/* Animated Flying Rocket Deploy */}
                <div className="relative w-18 h-18 flex items-center justify-center">
                  <motion.div
                    animate={{ 
                      y: [-4, 4, -4],
                      x: [-2, 2, -2]
                    }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <img 
                      src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Rocket.png" 
                      alt="Rocket" 
                      className="w-14 h-14 object-contain filter drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  {/* Floating Sparkles backdrop */}
                  <img 
                    src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Sparkles.png" 
                    alt="Sparkles" 
                    className="absolute -top-2 -right-2 w-6 h-6 object-contain animate-spin"
                    style={{ animationDuration: '6s' }}
                    referrerPolicy="no-referrer"
                  />
                  {/* Glowing core engine circle behind the rocket */}
                  <span className="absolute bottom-1 w-8 h-8 bg-blue-500/30 rounded-full blur-md animate-pulse" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-mono text-emerald-400 font-extrabold uppercase tracking-widest bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/40">
                    🚀 App Live on VibeLab
                  </span>
                </div>
              </motion.div>
            )}
            
            {/* Floating Cybernetic Code Particles during compilation/launch */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 80, x: 0, opacity: 0 }}
                  animate={{ y: -120, x: (i - 4) * 22, opacity: [0, 0.8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.15 }}
                  className="absolute bottom-0 left-1/2 w-1.5 h-1.5 bg-gradient-to-t from-cyan-400 to-blue-500 rounded-full"
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-2 w-3/4 bg-slate-200 rounded-full" />
            <div className="h-2 w-1/2 bg-slate-200 rounded-full" />
          </div>

          <motion.button
            animate={{ 
              backgroundColor: isLaunching ? "#0891b2" : "#f1f5f9",
              color: isLaunching ? "#ffffff" : "#64748b"
            }}
            className="w-full py-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            {isLaunching ? <CheckCircle2 className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
            {isLaunching ? "Deployment Successful" : "Building App..."}
          </motion.button>
        </div>

        {/* Decorative Glow */}
        <motion.div 
          animate={{ 
            opacity: isLaunching ? [0.2, 0.5, 0.2] : 0,
          }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-cyan-400/20 pointer-events-none"
        />
      </motion.div>

      {/* Floating Elements around the app */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 10, 0],
            opacity: isLaunching ? 0 : 1
          }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="absolute top-1/4 right-10 glass p-3 rounded-2xl border-cyan-500/20 shadow-xl"
        >
          <Layers className="w-6 h-6 text-cyan-500" />
        </motion.div>

        <motion.div
          animate={{ 
            y: [0, 20, 0],
            rotate: [0, -10, 0],
            opacity: isLaunching ? 1 : 0,
            scale: isLaunching ? 1 : 0.5
          }}
          transition={{ repeat: Infinity, duration: 5 }}
          className="absolute bottom-1/4 left-10 glass p-3 rounded-2xl border-blue-500/20 shadow-xl"
        >
          <Globe className="w-6 h-6 text-blue-600" />
        </motion.div>

        {/* Sparkles on Launch */}
        {isLaunching && (
          <>
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-20 left-20"
            >
              <Sparkles className="w-8 h-8 text-amber-400 animate-bounce" />
            </motion.div>
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-20 right-20"
            >
              <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
            </motion.div>
          </>
        )}
      </div>

      {/* Student Representation (Simplified) */}
      <motion.div 
        animate={{ 
          x: isLaunching ? 100 : 0,
          opacity: isLaunching ? 0 : 1
        }}
        className="absolute -bottom-10 -left-10 z-30 flex items-center gap-4 glass p-4 rounded-3xl border-slate-200 shadow-2xl"
      >
        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-cyan-500">
          <img src="https://i.pravatar.cc/100?img=11" alt="Student" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-900">Alex is building...</p>
          <p className="text-[10px] text-slate-500">AI Portfolio App</p>
        </div>
      </motion.div>
    </div>
  );
};

const Hero = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleWaitlistJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setSubmitted(true);
        setEmail("");
      }
    } catch (error) {
      console.error("Waitlist error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative pt-48 pb-32 px-6 overflow-hidden min-h-screen flex flex-col items-center justify-center hero-gradient">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] -z-10" />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-left"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-600 mb-8 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Join the build revolution</span>
          </div>
          
          <h1 className="font-display text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.05] text-slate-900">
            Learn AI & Code. <br />
            <span className="gradient-text">Through 7 Phases.</span>
          </h1>
          
          <p className="text-xl text-slate-600 max-w-xl mb-12 leading-relaxed">
            Master software engineering and AI systems through a project-driven 7-phase journey. From Python foundations to certified AI agent developers and cloud-ready architects.
          </p>

          <form onSubmit={handleWaitlistJoin} className="flex flex-col sm:flex-row gap-3 mb-8 max-w-lg">
            <div className="relative flex-grow">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-6 text-slate-900 focus:outline-none focus:border-cyan-500 transition-colors shadow-sm"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={isSubmitting || submitted}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all whitespace-nowrap shadow-xl shadow-slate-200 disabled:opacity-70"
            >
              {submitted ? "Joined!" : isSubmitting ? "Joining..." : "Join Early Access"}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Early Access Open</span>
            </div>
            <button 
              onClick={() => onNavigate('contact')}
              className="flex items-center gap-3 text-slate-900 font-bold px-8 py-4 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all text-sm group"
            >
              <School className="w-5 h-5 text-cyan-600 group-hover:scale-110 transition-transform" />
              For Schools
            </button>
          </div>

          <div className="mt-16 flex items-center gap-6">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <img 
                  key={i}
                  src={`https://i.pravatar.cc/100?img=${i + 15}`} 
                  alt="User" 
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Trusted by leading schools and students</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <LaunchAnimation />
          <div className="absolute -top-10 -right-10 w-40 h-40 border-2 border-cyan-500/20 rounded-full -z-10 animate-[spin_10s_linear_infinite]" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 border-2 border-blue-500/10 rounded-full -z-10 animate-[spin_15s_linear_infinite_reverse]" />
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
    role: "Stanford Tech Lab",
    title: "NeuroDoc AI",
    metric: "1,500+ Active Beta Users",
    desc: "AI assistant for clinicians to pre-screen medical imaging documents safely.",
    badge: "Built in 4 Days",
    tag: "Beta Launch",
    color: "cyan",
    icon: "Cpu",
    timeAgo: "2h ago",
    bio: "Alex Rivera is a medical researcher at Stanford Tech Lab who wanted to bridge the gap between AI and radiology. Utilizing modern pipeline architectures, he spent four days designing and implementing NeuroDoc AI, which parses MRI and CT scans to produce pre-screen diagnostic reports, helping clinics manage extreme patient overload.",
    techStack: ["React", "Node.js", "Gemini API", "Pinecone Vector Store", "Tailwind CSS"],
    linkUrl: "https://github.com/alexrivera/neurodoc-ai-demo",
    linkLabel: "View GitHub Repository",
    quote: "VibeLab broke open the black box of full-stack AI development. Being able to connect persistent vector stores and design secure APIs directly within one weekend is a game-changer."
  },
  {
    id: 2,
    type: "certification",
    name: "Sarah Jenkins",
    role: "High School Innovator",
    title: "Advanced AI Architect",
    metric: "Score: 98% (Phase 3 Completed)",
    desc: "Validated skill in full-stack cloud architecture and vector database integration.",
    badge: "Faculty Approved",
    tag: "Certified",
    color: "amber",
    icon: "GraduationCap",
    timeAgo: "Just now",
    bio: "Sarah is a self-driven junior high-school student with a deep passion for cognitive systems. Over three weeks of rigorous training, she completed the full developer path, maintaining a 98% score on complex architectural validation challenges. She programmed three distinct autonomous agent systems to pass her final faculty review.",
    techStack: ["System Security", "Prompt Chains", "Vector Embeddings", "Firestore Rules"],
    linkUrl: "https://certs.vibelab.edu/verify/sarah-jenkins-advanced-ai-98c",
    linkLabel: "Verify Certificate Credentials",
    quote: "This platform challenged me beyond simple hello-world templates. The system reviews your rules and forces you to build real, secure, and production-tested data schemas."
  },
  {
    id: 3,
    type: "project",
    name: "Marcus K.",
    role: "MIT Hackathon Winner",
    title: "EcoSave Agent",
    metric: "Optimized Carbon Index by 22%",
    desc: "A smart scheduler using historical power-grid signals to automate high-load compute tasks.",
    badge: "1st Place Award",
    tag: "Greentech MVP",
    color: "emerald",
    icon: "Zap",
    timeAgo: "15m ago",
    bio: "Marcus, an electrical engineering undergrad, won first place at our regional MIT Hackathon. His project, EcoSave Agent, monitors real-time carbon intensity indices across major regional power grids and schedules heavy machine learning training jobs or computational Docker containers during optimal renewable energy hours.",
    techStack: ["IoT Gateways", "D3.js Grid Charts", "Node Cron", "PostgreSQL", "OAuth 2.0"],
    linkUrl: "https://github.com/marcus-k/ecosave-smart-agent",
    linkLabel: "View GitHub Repository",
    quote: "I wanted to build an agent that actually impacts hardware. Coupling VibeLab's server hooks with live power grid APIs was smooth and incredibly rewarding."
  },
  {
    id: 4,
    type: "project",
    name: "Elena Rostova",
    role: "Caltech Bootcamper",
    title: "LingoFlow",
    metric: "Acquired by Language Hub",
    desc: "Real-time speech translation proxy with state-of-the-art latency-budget routing.",
    badge: "Acquired MVP",
    tag: "Acquisition",
    color: "indigo",
    icon: "Globe",
    timeAgo: "1h ago",
    bio: "Elena participated in the Caltech AI Bootcamp and built LingoFlow, a premium real-time speech translation proxy. It utilizes speculative audio chunking to achieve latency-budget speech synthesis and instant routing, allowing multi-language voice streams in under 300 milliseconds.",
    techStack: ["WebSockets", "Vite/React", "Gemini Realtime API", "Whisper TTS"],
    linkUrl: "https://github.com/elenares/lingoflow-realtime-speech",
    linkLabel: "View GitHub Repository",
    quote: "Handling audio chunking over WebSockets is notoriously difficult, but the step-by-step state visualization helped me isolate latency issues immediately. The code was acquired just 2 weeks after launch!"
  },
  {
    id: 5,
    type: "certification",
    name: "Devon Patel",
    role: "Self-Taught Developer",
    title: "Full-Stack MVP Architect",
    metric: "Completed 5 Live Launches",
    desc: "Credential on rigorous server-side SDK deployment & database security validation.",
    badge: "Professional Level",
    tag: "Certified",
    color: "rose",
    icon: "Trophy",
    timeAgo: "3h ago",
    bio: "Devon Patel transitioned from a self-taught enthusiast to a certified MVP Architect by building and pushing 5 distinct production-grade applications under strict cloud-native schemas. His final capstone evaluated his database rules, multi-tenant workspace routing, and clean API resilience.",
    techStack: ["API Resiliency", "Multi-Tenant Architecture", "User Isolation", "Node.js ESM"],
    linkUrl: "https://certs.vibelab.edu/verify/devon-patel-mvparchitect-202",
    linkLabel: "Verify Certificate Credentials",
    quote: "The credentials on VibeLab aren't just badges. They are backed by real, working applications that third-party developers can inspect and verify in real time."
  },
  {
    id: 6,
    type: "project",
    name: "Chloe Dupont",
    role: "Sorbonne AI Fellow",
    title: "Artisanal AI",
    metric: "$4,200 MRR in first week",
    desc: "SaaS engine dynamically generating customized marketing storefront graphics on-demand.",
    badge: "SaaS Launch",
    tag: "Launch Success",
    color: "violet",
    icon: "Sparkles",
    timeAgo: "4d ago",
    bio: "Chloe transformed her visual arts fellowship into a high-growth SaaS business. Artisanal AI automatically scans digital products, matches them with brand style grids, and generates high-converting social media collateral and landing layouts on-demand.",
    techStack: ["Tailwind UX", "Gemini Image Gen", "Next.js Dev Server", "Stripe API"],
    linkUrl: "https://github.com/chloe-dupont/artisanal-ai-saas",
    linkLabel: "View GitHub Repository",
    quote: "As a designer, I had zero backend experience. VibeLab guided me through writing my first Stripe endpoint and securing user content using Firestore rule isolation."
  },
  {
    id: 7,
    type: "certification",
    name: "Akiro Sato",
    role: "Tokyo Tech Graduate",
    title: "Database Security & Scale",
    metric: "Scored 100% on Rules Audit",
    desc: "Expertise in secure firestore rules, multi-user isolation patterns and resilient data blueprints.",
    badge: "Verified Profile",
    tag: "Certified",
    color: "blue",
    icon: "ShieldCheck",
    timeAgo: "5m ago",
    bio: "Akiro is a cyber-security graduate from Tokyo Tech. To earn this elite certification, he underwent automated vulnerability injection checks, developing custom backend mitigations against script attacks and maintaining perfect security structures across multiple environments.",
    techStack: ["Firebase Auth", "Firestore Sec Rules", "Data Masking", "CORS Auditing"],
    linkUrl: "https://certs.vibelab.edu/verify/akiro-sato-security-scale-auditor",
    linkLabel: "Verify Certificate Credentials",
    quote: "Securing student profiles while sharing live dashboard states is tricky. The sandbox testbed gave me instant metrics on rules leakage, resulting in bulletproof coverage."
  },
  {
    id: 8,
    type: "project",
    name: "Elena G.",
    role: "Georgetown Innovator",
    title: "Apex Fin-LLM",
    metric: "12,000 real-time API queries",
    desc: "Sub-second summarization engine extracting structural signal vectors from major trade feeds.",
    badge: "Active Utility",
    tag: "High Volume",
    color: "teal",
    icon: "BarChart3",
    timeAgo: "52m ago",
    bio: "Elena holds a finance degree from Georgetown. She built Apex Fin-LLM to automatically parse structural financial vectors out of quarterly 10-K files and match them against major real-time trade feeds, enabling teams to query complex indexes within milliseconds.",
    techStack: ["Vector DB", "Recharts Visuals", "Financial Parsing", "Gemini Active Search"],
    linkUrl: "https://github.com/elenag-fintech/apex-fin-llm",
    linkLabel: "View GitHub Repository",
    quote: "Financial texts contain thousands of tables. By building a high-fidelity parsing chunker, our teams can extract visual insights in seconds. The MVP handles over 12,000 live queries now!"
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
            Real achievements built and validated on VibeLab, showcasing verified MVPs and expert-level AI credentials. Click any card to expand and review their full stack and codebase.
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


const Problem = () => {
  const gaps = [
    { title: "Theory vs. Practice", desc: "Students consume endless tutorials but rarely build anything from scratch, leading to 'tutorial hell'." },
    { title: "Lack of Real-World Experience", desc: "Most coding platforms use toy problems instead of production-grade architectures used in tech teams." },
    { title: "No Structured Learning Path", desc: "Traditional education lacks a cohesive journey from zero to deploying real-world AI applications." }
  ];

  return (
    <section id="problem" className="py-40 px-6 relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-24 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="glass p-10 rounded-[3rem] border-slate-200 shadow-2xl relative z-10 bg-slate-50/50">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <Zap className="text-red-500 w-7 h-7" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 leading-tight">The Build Gap</h3>
              </div>
              <div className="space-y-8">
                {gaps.map((gap, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-50/50 flex items-center justify-center text-red-500 font-bold border border-red-100 group-hover:bg-red-500 group-hover:text-white transition-all">
                      !
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-2 text-lg">{gap.title}</h4>
                      <p className="text-slate-600 leading-relaxed">{gap.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-red-500/5 rounded-full blur-[100px] -z-10" />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="font-display text-5xl md:text-6xl font-extrabold mb-8 text-slate-900 leading-[1.1]">
              Why Learning <br />
              <span className="text-red-500">Doesn't Mean Building.</span>
            </h2>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed">
              Consuming content is passive. Mastering a skill requires active creation. VibeLab bridges the gap between watching and doing.
            </p>
            <ul className="space-y-6">
              {[
                "Tutorials create a false sense of mastery",
                "Degrees often lack practical engineering skills",
                "Industry demands a portfolio of real projects"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-slate-700 font-medium">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
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

const Solution = () => {
  return (
    <section id="solution" className="py-40 px-6 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-xs font-bold text-emerald-600 mb-8 uppercase tracking-widest">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>The Build-to-Learn Solution</span>
        </div>
        <h2 className="font-display text-5xl md:text-7xl font-extrabold mb-8 text-slate-900 max-w-4xl mx-auto leading-tight">
          Redefining Education Through <span className="text-emerald-600">Creation.</span>
        </h2>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-20 leading-relaxed">
          Master any digital skill by working on production-ready projects with AI-assisted guidance and industrial standards.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <Code2 />, title: "Project-Based", desc: "No more lectures. Start with a project and learn the theory exactly when you need it." },
            { icon: <Cpu />, title: "AI-Assisted", desc: "Get real-time guidance from AI tutors that help you solve problems, not just give answers." },
            { icon: <Zap />, title: "Real-World Output", desc: "Every project you build is a functional piece of software ready for the real world." },
            { icon: <Rocket />, title: "Portfolio Ready", desc: "Build a verified digital portfolio of work that actually proves your engineering skills." }
          ].map((item, i) => (
            <div key={i} className="p-10 rounded-[2.5rem] bg-white border border-slate-100 text-left group hover:shadow-xl hover:shadow-slate-200/50 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/5 flex items-center justify-center text-emerald-600 mb-8 group-hover:scale-110 transition-transform shadow-sm">
                {item.icon}
              </div>
              <h3 className="text-2xl font-extrabold mb-4 text-slate-900 tracking-tight">{item.title}</h3>
              <p className="text-slate-600 leading-relaxed font-medium">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    { number: "01", title: "Join the Curriculum", desc: "Access the 7-Phase learning path designed to take you from foundational logic to AI mastery." },
    { number: "02", title: "Build Real Projects", desc: "Every phase contains production-grade labs where you build actual software using modern stacks." },
    { number: "03", title: "AI-Assisted Learning", desc: "Our AI agents monitor your code, providing instant hints and architectural feedback." },
    { number: "04", title: "Verified Portfolio", desc: "Complete all phases to build a verified digital portfolio that proves your skills to the world." }
  ];

  return (
    <section id="how-it-works" className="py-40 px-6 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="font-display text-5xl md:text-6xl font-extrabold mb-8 text-slate-900 leading-tight">
            How <span className="gradient-text">VibeLab</span> Works
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A seamless journey from absolute beginner to verified production-ready engineer.
          </p>
        </div>
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-12">
            {steps.map((step, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-8 group"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-2xl font-display font-black text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-sm">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold mb-3 text-slate-900 tracking-tight">{step.title}</h3>
                  <p className="text-lg text-slate-600 leading-relaxed font-medium">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="relative">
            <div className="aspect-[4/3] rounded-[3rem] overflow-hidden border border-slate-200 relative group shadow-3xl">
              <img 
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80" 
                alt="Collaboration" 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 fill-slate-900 text-slate-900 ml-1" />
                </div>
              </div>
            </div>
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};

const LearningZones = () => {
  const zones = [
    { title: "Web Development", desc: "Master modern frontend and backend architectures by building production-ready SaaS applications.", color: "from-cyan-500 to-blue-600" },
    { title: "AI & Automation", desc: "Integrate LLMs, vector databases, and AI agents into your workflows and products.", color: "from-blue-600 to-indigo-600" },
    { title: "Startup Building", desc: "Learn the full product lifecycle: from idea and prototyping to launch and user acquisition.", color: "from-indigo-600 to-purple-600" },
    { title: "Freelancing Skills", desc: "Acquire the practical technical and soft skills needed to thrive as an independent developer.", color: "from-purple-600 to-pink-600" }
  ];

  return (
    <section id="zones" className="py-40 px-6 relative bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="font-display text-5xl md:text-6xl font-extrabold mb-8 text-slate-900 leading-tight">
            Explore <span className="gradient-text">Learning Zones.</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Specialized paths designed to help you become a top 1% technical creator in the global market.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {zones.map((zone, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -8 }}
              className="p-10 rounded-[3rem] bg-white border border-slate-100 relative group overflow-hidden shadow-sm hover:shadow-xl transition-all"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${zone.color} opacity-0 group-hover:opacity-[0.03] transition-opacity`} />
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${zone.color} flex items-center justify-center text-white font-black mb-8 shadow-lg shadow-cyan-500/20`}>
                {i + 1}
              </div>
              <h3 className="text-2xl font-extrabold mb-4 text-slate-900 tracking-tight leading-tight">{zone.title}</h3>
              <p className="text-slate-600 leading-relaxed font-medium">{zone.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Audience = () => {
  const targets = [
    { title: "Students", desc: "Build a verified portfolio of production-grade projects while learning the core engineering principles." },
    { title: "Schools", desc: "Bring industry-standard project-based learning to your institution with our structured curriculum and tools." },
    { title: "Career Switchers", desc: "Transition into tech by learning the skills required for today's market: AI, SaaS, and fullstack dev." }
  ];

  return (
    <section className="py-40 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-24 items-center">
          <div>
            <h2 className="font-display text-5xl md:text-6xl font-extrabold mb-10 text-slate-900 leading-[1.1]">
              Built for the <br />
              <span className="gradient-text">Builders of Tomorrow.</span>
            </h2>
            <div className="space-y-10">
              {targets.map((t, i) => (
                <div key={i} className="flex gap-8 group">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-sm border border-cyan-100">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">{t.title}</h4>
                    <p className="text-lg text-slate-600 leading-relaxed font-medium">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="bg-slate-100 p-6 rounded-[3.5rem] border border-slate-200 overflow-hidden relative group">
              <img 
                src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200&q=80" 
                alt="Builders" 
                className="rounded-[2.5rem] w-full h-full object-cover shadow-2xl group-hover:scale-105 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-cyan-500/5 mix-blend-overlay" />
            </div>
            <div className="absolute -bottom-8 -right-8 glass p-8 rounded-[2.5rem] border-white/20 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-5">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/100?img=${i + 30}`} className="w-12 h-12 rounded-full border-2 border-white shadow-md" referrerPolicy="no-referrer" />
                  ))}
                </div>
                <div className="text-slate-900">
                  <p className="font-black text-lg leading-tight uppercase tracking-tighter">Join 50k+</p>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Global Builders</p>
                </div>
              </div>
            </div>
          </div>
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
      role: "Data Scientist at Meta",
      img: "https://i.pravatar.cc/150?img=32"
    },
    {
      text: "I've tried many platforms, but the immersive labs here are on another level. It's the closest thing to real-world experience you can get online.",
      name: "David Chen",
      role: "Security Analyst at Google",
      img: "https://i.pravatar.cc/150?img=12"
    },
    {
      text: "VibeLab's project-based approach helped me land my first role as a Junior Dev in just 4 months. The community is incredibly supportive.",
      name: "Elena Rodriguez",
      role: "Frontend Developer at Vercel",
      img: "https://i.pravatar.cc/150?img=45"
    },
    {
      text: "The ability to build production-ready apps while learning the fundamentals is what sets VibeLab apart. It's the future of education.",
      name: "Marcus Thorne",
      role: "Fullstack Engineer at Stripe",
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

const FinalCTA = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleWaitlistJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setSubmitted(true);
        setEmail("");
      }
    } catch (error) {
      console.error("Waitlist error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-40 px-6 relative overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 via-blue-600/5 to-transparent -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-cyan-500/5 rounded-full blur-[150px] -z-20" />
      
      <div className="max-w-5xl mx-auto text-center glass p-16 md:p-24 rounded-[4rem] border-white/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] relative overflow-hidden bg-white/40 backdrop-blur-2xl">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center shadow-2xl shadow-slate-900/20">
          <Rocket className="text-white w-10 h-10" />
        </div>
        
        <h2 className="font-display text-5xl md:text-7xl font-extrabold mb-8 text-slate-900 leading-tight tracking-tight">
          Start building your <br />
          <span className="gradient-text">future today.</span>
        </h2>
        
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
          Join the early access list and be the first to experience the build-to-learn revolution. No fluff, only production-ready skills.
        </p>

        <div className="flex flex-col items-center gap-10">
          <form onSubmit={handleWaitlistJoin} className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email" 
                className="w-full pl-12 pr-4 py-5 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-bold shadow-sm"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={isSubmitting || submitted}
              className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap shadow-xl shadow-slate-200 disabled:opacity-70"
            >
              {submitted ? "Success!" : isSubmitting ? "Joining..." : "Join Early Access"}
            </button>
          </form>

          <div className="flex items-center gap-8">
            <button 
              onClick={() => onNavigate('contact')}
              className="flex items-center gap-2 text-slate-900 hover:text-cyan-600 font-black uppercase tracking-widest text-xs transition-colors"
            >
              <Mail className="w-5 h-5" />
              Contact Us
            </button>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic leading-relaxed">Early Access is limited to first 1000 applicants.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  return (
    <footer className="pt-32 pb-12 px-6 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-24">
        <div className="col-span-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <BrainCircuit className="text-white w-5 h-5" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-slate-900">VibeLab</span>
          </div>
          <p className="text-slate-600 mb-8 max-w-xs leading-relaxed">
            The world's first project-native learning platform for the next generation of builders.
          </p>
          <div className="space-y-6">
            <div className="flex gap-4">
              {[
                { icon: <Twitter className="w-5 h-5" />, href: "https://twitter.com/vibelab" },
                { icon: <Linkedin className="w-5 h-5" />, href: "https://linkedin.com/company/vibelab" },
                { icon: <Github className="w-5 h-5" />, href: "https://github.com/vibelab" }
              ].map((social, i) => (
                <a 
                  key={i} 
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-cyan-500/5 hover:text-cyan-600 transition-all cursor-pointer border-slate-200 text-slate-500"
                >
                  {social.icon}
                </a>
              ))}
            </div>
            <a href="mailto:vibelab@nexaforgetech.com" className="flex items-center gap-3 text-slate-600 hover:text-cyan-600 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-cyan-50 transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <span className="font-medium">vibelab@nexaforgetech.com</span>
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h4 className="text-slate-900 font-bold uppercase tracking-widest text-xs">Platform</h4>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">Curriculum</a>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">AI Tutors</a>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">VR Labs</a>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">Pricing</a>
        </div>

        <div className="flex flex-col gap-6">
          <h4 className="text-slate-900 font-bold uppercase tracking-widest text-xs">Resources</h4>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">Documentation</a>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">Community</a>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">API Reference</a>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">Blog</a>
        </div>

        <div className="flex flex-col gap-6">
          <h4 className="text-slate-900 font-bold uppercase tracking-widest text-xs">Company</h4>
          <button onClick={() => onNavigate('about')} className="text-left text-slate-600 hover:text-cyan-600 transition-colors">About Us</button>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">Careers</a>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">Press</a>
          <button onClick={() => onNavigate('contact')} className="text-left text-slate-600 hover:text-cyan-600 transition-colors">Contact</button>
        </div>

        <div className="flex flex-col gap-6">
          <h4 className="text-slate-900 font-bold uppercase tracking-widest text-xs">Admin</h4>
          <button 
            onClick={() => onNavigate('admin')}
            className="text-left text-slate-600 hover:text-cyan-600 transition-colors"
          >
            Submissions
          </button>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">Internal Ops</a>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto pt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
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
    { id: 1, name: "Learn Python", desc: "Master variables, HTTP requests, APIs, JSON parsing, and solid OOP fundamentals in Python." },
    { id: 2, name: "LLM & AI Basics", desc: "Understand tokens, context windows, text/image embeddings, prompt techniques, and vector DBs." },
    { id: 3, name: "Build Projects", desc: "Build applications chaining multiple LLM prompts, structured data pipelines, and user flows." },
    { id: 4, name: "AI Agents & MCP", desc: "Explore agent memory, reactive loops, tool-calling pipelines, and Model Context Protocol (MCP)." },
    { id: 5, name: "Academic Literature", desc: "Analyze research papers on ReAct, Toolformer, Tree of Thoughts, and reflective architectures." },
    { id: 6, name: "Live Courses & Certs", desc: "Solve interactive capstone courses from DeepLearning.AI and LangChain to earn verified badges." },
    { id: 7, name: "Deployment & Scale", desc: "Publish production ready, containerized FastAPI and Docker services to cloud clusters with CI/CD." }
  ];

  return (
    <section id="path" className="py-40 px-6 bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] -z-0" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <h2 className="font-display text-5xl md:text-6xl font-extrabold mb-8 leading-tight text-white">
            The 7-Phase <span className="text-cyan-400">Mastery Path.</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
            A cohesive journey designed to bridge the gap between "tutorial student" and "production engineer."
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
              <h3 className="text-2xl font-bold mb-3 text-white tracking-tight leading-tight">{phase.name}</h3>
              <p className="text-slate-400 leading-relaxed text-sm font-medium">{phase.desc}</p>
            </div>
          ))}
          
          <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-cyan-600 to-blue-700 flex flex-col justify-center items-center text-center shadow-2xl shadow-cyan-500/20">
             <Trophy className="w-12 h-12 text-white mb-4" />
             <h3 className="text-2xl font-bold mb-2">Graduation</h3>
             <p className="text-white/80 text-sm font-medium">Verified Portfolio & Global Certification</p>
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
      <LearningPathSection />
      <Problem />
      <Solution />
      <HowItWorks />
      <LearningZones />
      <Audience />
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
      'phase-2': '/phase/2'
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
        // If they completed both, and are on onboarding / intro / login / signup, send them to dashboard
        if (path === '/intro' || path === '/onboarding' || path === '/login' || path === '/signup') {
          navigate('/dashboard', { replace: true });
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
