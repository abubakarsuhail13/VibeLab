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
  Twitter,
  Linkedin,
  Github
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import AboutPage from "./About";
import ContactPage from "./Contact";

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

const Navbar = ({ onNavigate, currentPage }: { onNavigate: (page: string) => void, currentPage: string }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-6">
      <div className="glass px-8 py-4 rounded-2xl flex items-center gap-8 max-w-6xl w-full justify-between shadow-xl shadow-slate-200/50">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onNavigate('home')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <BrainCircuit className="text-white w-6 h-6" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-slate-900">VibeLab</span>
        </div>
        <div className="hidden lg:flex items-center gap-10 text-sm font-semibold text-slate-600">
          {currentPage === 'home' ? (
            <>
              <a href="#problem" className="hover:text-cyan-600 transition-colors">The Problem</a>
              <a href="#solution" className="hover:text-cyan-600 transition-colors">Our Solution</a>
              <a href="#how-it-works" className="hover:text-cyan-600 transition-colors">How it Works</a>
              <a href="#zones" className="hover:text-cyan-600 transition-colors">Learning Zones</a>
            </>
          ) : (
            <button onClick={() => onNavigate('home')} className="hover:text-cyan-600 transition-colors">Home</button>
          )}
          <button 
            onClick={() => onNavigate('about')} 
            className={`transition-colors ${currentPage === 'about' ? 'text-cyan-600' : 'hover:text-cyan-600'}`}
          >
            About Us
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button className="hidden sm:block text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Login</button>
          <button 
            onClick={() => onNavigate('contact')}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-cyan-600/30 transition-all active:scale-95"
          >
            Get Started
          </button>
        </div>
      </div>
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

      {/* The "App" being built/launched */}
      <motion.div
        animate={{ 
          y: isLaunching ? -40 : 0,
          scale: isLaunching ? 1.05 : 1,
          rotateX: isLaunching ? 5 : 0
        }}
        transition={{ type: "spring", stiffness: 100 }}
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
          <div className="h-32 rounded-2xl bg-slate-100/50 border border-slate-200/50 flex items-center justify-center overflow-hidden relative">
            {!isLaunching ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <Code2 className="w-10 h-10 text-cyan-500 animate-pulse" />
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ height: [4, 12, 4] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      className="w-1 bg-cyan-400 rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <Rocket className="w-12 h-12 text-blue-600" />
                <span className="text-xs font-bold text-slate-900">Project Launched!</span>
              </motion.div>
            )}
            
            {/* Floating Particles during launch */}
            {isLaunching && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 20, x: 0, opacity: 0 }}
                    animate={{ y: -100, x: (i - 3) * 20, opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                    className="absolute bottom-0 left-1/2 w-1 h-1 bg-cyan-400 rounded-full"
                  />
                ))}
              </div>
            )}
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
  return (
    <section className="relative pt-48 pb-32 px-6 overflow-hidden min-h-screen flex flex-col items-center justify-center hero-gradient">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] -z-10" />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-left"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-400 mb-8 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Project-Based AI Learning</span>
          </div>
          
          <h1 className="font-display text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.05] text-slate-900">
            Build <span className="gradient-text">Skills.</span> <br />
            Not Just Learn Them.
          </h1>
          
          <p className="text-xl text-slate-600 max-w-xl mb-12 leading-relaxed">
            Stop studying theory. Start building real applications. VibeLab is the world's first project-native platform for mastering coding and AI through creation.
          </p>

          <div className="flex flex-wrap items-center gap-6">
            <button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-cyan-600/30 transition-all flex items-center gap-3 group">
              Join Early Access <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => onNavigate('contact')}
              className="flex items-center gap-3 text-slate-900 font-bold px-8 py-5 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all"
            >
              <School className="w-5 h-5 text-cyan-600" />
              For Schools
            </button>
          </div>

          <div className="mt-16 flex items-center gap-6">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <img 
                  key={i}
                  src={`https://i.pravatar.cc/100?img=${i + 10}`} 
                  alt="User" 
                  className="w-12 h-12 rounded-full border-4 border-white"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-sm text-slate-500 font-medium">Trusted by 50,000+ students worldwide</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative"
        >
          <LaunchAnimation />
          
          {/* Decorative Rings */}
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

const Problem = () => {
  const gaps = [
    { title: "Theoretical Overload", desc: "Traditional courses focus 90% on theory and only 10% on application, leaving students unprepared." },
    { title: "Passive Learning", desc: "Watching videos isn't learning. Without building, knowledge evaporates within 48 hours." },
    { title: "Outdated Tools", desc: "Education systems are lagging 5 years behind the current AI and software industry standards." }
  ];

  return (
    <section id="problem" className="py-32 px-6 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <div className="glass p-8 rounded-[3rem] border-red-500/10 relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <Zap className="text-red-500 w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">The Education Gap</h3>
              </div>
              <div className="space-y-6">
                {gaps.map((gap, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2">{gap.title}</h4>
                    <p className="text-sm text-slate-600">{gap.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-red-500/5 rounded-full blur-[100px] -z-10" />
          </div>
          <div>
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-8 text-slate-900 leading-tight">
              Why Traditional <br />
              <span className="text-red-500">Education Fails.</span>
            </h2>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              The world is moving faster than the classroom. Students are graduating with degrees but without the ability to build production-ready software.
            </p>
            <ul className="space-y-4">
              {["Degrees are losing value", "Industry demands builders, not scholars", "AI is changing the required skill set"].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
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
    <section id="solution" className="py-32 px-6 bg-white relative">
      <div className="max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-xs font-bold text-emerald-600 mb-8 uppercase tracking-widest">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>The Build-to-Learn Model</span>
        </div>
        <h2 className="font-display text-4xl md:text-7xl font-bold mb-8 text-slate-900">
          Mastery Through <span className="text-emerald-600">Creation.</span>
        </h2>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-20">
          VibeLab flips the script. We start with the project and teach you the theory as you need it. It's faster, more engaging, and produces real-world results.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: <Code2 />, title: "Live Coding", desc: "Build real apps in our cloud-native IDE with AI assistance." },
            { icon: <Cpu />, title: "AI Integration", desc: "Learn to leverage LLMs and AI agents in every project." },
            { icon: <Rocket />, title: "Production Ready", desc: "Deploy your work to the cloud and build a real portfolio." }
          ].map((item, i) => (
            <div key={i} className="p-10 rounded-[2.5rem] glass border-emerald-500/10 text-left group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/5 flex items-center justify-center text-emerald-600 mb-8 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-900">{item.title}</h3>
              <p className="text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    { number: "01", title: "Select a Project", desc: "Choose from our library of real-world applications to build." },
    { number: "02", title: "Interactive Build", desc: "Follow our guided build process with just-in-time theory." },
    { number: "03", title: "AI Code Review", desc: "Get instant feedback on your code from our advanced AI agents." },
    { number: "04", title: "Launch & Portfolio", desc: "Deploy your app and add it to your verified digital portfolio." }
  ];

  return (
    <section id="how-it-works" className="py-32 px-6 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 text-slate-900 leading-tight">
              Your Path to <br />
              <span className="gradient-text">Mastery</span> is Simple.
            </h2>
            <div className="space-y-12">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-8 group">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl glass border-cyan-500/10 flex items-center justify-center text-2xl font-display font-black text-cyan-600 group-hover:bg-cyan-500/10 transition-all">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900">{step.title}</h3>
                    <p className="text-slate-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-[3rem] overflow-hidden border border-slate-200 relative group">
              <img 
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80" 
                alt="Learning Process" 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-cyan-500/5 mix-blend-overlay" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-cyan-600 flex items-center justify-center shadow-xl shadow-cyan-600/30 cursor-pointer hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 fill-white text-white ml-1" />
                </div>
              </div>
            </div>
            {/* Decorative Elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};

const LearningZones = () => {
  const zones = [
    { title: "Spark", desc: "The beginning of your journey. Learn the fundamentals by building simple scripts.", color: "from-cyan-500 to-blue-600" },
    { title: "Build", desc: "Create functional web and mobile applications with modern frameworks.", color: "from-blue-600 to-indigo-600" },
    { title: "Forge", desc: "Deep dive into AI integration, backend systems, and complex architectures.", color: "from-indigo-600 to-purple-600" },
    { title: "Launch", desc: "Production-grade deployment, scaling, and professional portfolio completion.", color: "from-purple-600 to-pink-600" }
  ];

  return (
    <section id="zones" className="py-32 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-6 text-slate-900">
            The <span className="gradient-text">Learning Zones.</span>
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Progress through our structured ecosystem designed to take you from zero to production-ready.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {zones.map((zone, i) => (
            <motion.div 
              key={i}
              whileHover={{ scale: 1.05 }}
              className="p-10 rounded-[2.5rem] glass border-slate-200 relative group overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${zone.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${zone.color} flex items-center justify-center text-white font-black mb-8 shadow-lg`}>
                {i + 1}
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-900">{zone.title}</h3>
              <p className="text-slate-600 leading-relaxed">{zone.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Audience = () => {
  const targets = [
    { title: "Aspiring Developers", desc: "Start your career with a portfolio that actually proves you can build." },
    { title: "Career Switchers", desc: "Transition into tech faster by focusing on the skills that matter today." },
    { title: "AI Enthusiasts", desc: "Master the tools of the future by integrating AI into every project." }
  ];

  return (
    <section className="py-32 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 text-slate-900">
              Built for the <br />
              <span className="gradient-text">Next Generation</span> of Creators.
            </h2>
            <div className="space-y-8">
              {targets.map((t, i) => (
                <div key={i} className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-cyan-500/5 flex items-center justify-center">
                    <CheckCircle2 className="text-cyan-600 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">{t.title}</h4>
                    <p className="text-slate-600">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="glass p-4 rounded-[3rem] border-slate-200">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=80" 
                alt="Students collaborating" 
                className="rounded-[2.5rem] w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-10 -right-10 glass p-8 rounded-3xl border-cyan-500/10 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/100?img=${i + 20}`} className="w-10 h-10 rounded-full border-2 border-white" referrerPolicy="no-referrer" />
                  ))}
                </div>
                <div className="text-sm">
                  <p className="text-slate-900 font-bold">Join 5,000+</p>
                  <p className="text-slate-500 text-xs">Early access members</p>
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

  return (
    <section className="py-40 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 via-blue-600/5 to-transparent -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-cyan-500/5 rounded-full blur-[150px] -z-20" />
      
      <div className="max-w-5xl mx-auto text-center glass p-20 rounded-[4rem] border-cyan-500/10 shadow-2xl relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
          <Rocket className="text-white w-10 h-10" />
        </div>
        
        <h2 className="font-display text-5xl md:text-7xl font-bold mb-8 text-slate-900 leading-tight">
          Ready to <span className="gradient-text">Build</span> <br /> Your Future?
        </h2>
        <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
          Join the early access list and be the first to experience the build-to-learn revolution.
        </p>
        
        <div className="max-w-md mx-auto">
          <form className="flex flex-col sm:flex-row gap-4 mb-8" onSubmit={(e) => e.preventDefault()}>
            <div className="relative flex-grow">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 pl-12 pr-6 text-slate-900 focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </div>
            <button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-8 py-5 rounded-2xl font-bold hover:shadow-xl hover:shadow-cyan-600/30 transition-all whitespace-nowrap">
              Join Early Access
            </button>
          </form>
          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={() => onNavigate('contact')}
              className="text-sm font-bold text-cyan-600 hover:underline flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Contact Us for Partnerships
            </button>
            <p className="text-xs text-slate-500">No spam. Only updates on our launch and early access perks.</p>
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
          <h4 className="text-slate-900 font-bold uppercase tracking-widest text-xs">Legal</h4>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">Privacy Policy</a>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">Terms of Service</a>
          <a href="#" className="text-slate-600 hover:text-cyan-600 transition-colors">Cookie Policy</a>
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

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  return (
    <div className="min-h-screen selection:bg-cyan-500/20 selection:text-cyan-900">
      <Navbar onNavigate={setCurrentPage} currentPage={currentPage} />
      <main>
        {currentPage === 'home' ? (
          <>
            <Hero onNavigate={setCurrentPage} />
            <Problem />
            <Solution />
            <HowItWorks />
            <LearningZones />
            <Audience />
            <Testimonials />
            <Stats />
            <FinalCTA onNavigate={setCurrentPage} />
          </>
        ) : currentPage === 'about' ? (
          <AboutPage onNavigate={setCurrentPage} />
        ) : (
          <ContactPage onNavigate={setCurrentPage} />
        )}
      </main>
      <Footer onNavigate={setCurrentPage} />
    </div>
  );
}
