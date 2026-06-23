import { motion } from "motion/react";
import { 
  ArrowRight, 
  Sparkles, 
  Target, 
  Lightbulb, 
  Cpu, 
  Globe, 
  ShieldCheck,
  Mail,
  Rocket
} from "lucide-react";

const AboutHero = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  return (
    <section className="relative pt-48 pb-32 px-6 overflow-hidden hero-gradient">
      <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] -z-10" />

      <div className="max-w-5xl mx-auto text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-600 mb-8 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>THE FUTURE-READY WORKFORCE</span>
          </div>
          
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-8 leading-tight text-slate-900">
            VibeLab is not a coding program. <br />
            <span className="gradient-text">It is a future-skills and innovation platform</span> that teaches students how to identify problems, build solutions, and use AI responsibly to create value.
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <button 
              onClick={() => onNavigate('signup')}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-cyan-600/30 transition-all flex items-center gap-3 group shadow-lg"
            >
              Start the Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => onNavigate('contact')}
              className="flex items-center gap-3 text-slate-900 bg-white font-bold px-8 py-5 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all shadow-sm"
            >
              Partner With Us
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const WhatIsVibeLab = () => {
  return (
    <section className="py-24 px-6 bg-slate-50 relative overflow-hidden border-y border-slate-100">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-600 mb-6 uppercase tracking-widest">
          <span>WHAT IS VIBELAB</span>
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-extrabold mb-6 text-slate-900 tracking-tight leading-snug">
          An AI-Powered Innovation & Product Creation Platform
        </h2>
        <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-semibold max-w-3xl mx-auto">
          VibeLab is an AI-powered innovation and product creation platform designed to help students transform ideas into real-world solutions. The platform combines Artificial Intelligence, entrepreneurship, problem-solving, and project-based learning to prepare students for the future workforce.
        </p>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -z-0" />
    </section>
  );
};

const InitiativeSection = () => {
  return (
    <section className="py-32 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 text-slate-900 leading-tight">
              An Educational Initiative by <br />
              <span className="gradient-text">NexaForge Technologies</span>
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-8 font-medium">
              VibeLab is powered by NexaForge Technologies. We bring practical value-creation thinking, professional product development standards, and responsible artificial intelligence principles into youth education.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed font-medium">
              Through VibeLab, we replace rote memorization with creative, real-world project building. Students learn to think critically, communicate ideas, and design solutions that have local and national utility.
            </p>
          </motion.div>
          <div className="relative">
            <div className="aspect-video rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80" 
                alt="Youth Collaboration" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-8 -right-8 glass p-8 rounded-3xl border-cyan-500/20 shadow-xl max-w-xs bg-white/85 backdrop-blur-md">
              <ShieldCheck className="w-10 h-10 text-cyan-600 mb-4" />
              <p className="text-sm font-bold text-slate-900">Industry-led innovation principles adapted for young creators.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const WhyExists = () => {
  return (
    <section className="py-32 px-6 bg-slate-50 border-t border-slate-100">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 text-slate-900">Why VibeLab Exists</h2>
        <div className="space-y-8 text-lg text-slate-600 leading-relaxed font-semibold">
          <p className="text-xl md:text-2xl text-slate-800 tracking-tight">
            Traditional education teaches students how to answer questions. VibeLab teaches students how to identify problems, design solutions, and create products. Students learn by building rather than memorizing.
          </p>
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm max-w-2xl mx-auto">
            <p className="font-bold text-slate-900 italic leading-relaxed text-sm md:text-base">
              "We believe every student should have the opportunity to become an innovator and problem-solver. VibeLab provides the guided pathway, Urdu-accessible voice tools, and AI literacy to make that aspiration a reality."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const AccessibilityCommitment = () => {
  return (
    <section className="py-32 px-6 bg-white border-y border-slate-100">
      <div className="max-w-5xl mx-auto">
        <div className="p-12 md:p-20 rounded-[3rem] border border-cyan-500/20 bg-cyan-50/20 relative overflow-hidden shadow-lg shadow-cyan-500/5">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-400/10 rounded-full blur-3xl -z-10" />
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-600 mb-6 uppercase tracking-widest">
              <Globe className="w-3.5 h-3.5" />
              <span>OUR COMMITMENT TO ACCESSIBILITY</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">
              Innovation Accessible to Everyone
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed font-semibold mb-8">
              We believe innovation should be accessible to every student — regardless of background, language, or technical experience. That is why VibeLab supports Urdu, English, and voice-based interaction from day one.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-sm shadow-sm">Urdu Language Support</span>
              <span className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-sm shadow-sm">Voice Narration Mode</span>
              <span className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-sm shadow-sm">Zero Coding Background Required</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const OurApproach = () => {
  const points = [
    { icon: <Target className="w-6 h-6" />, text: "Identify local community problems" },
    { icon: <Lightbulb className="w-6 h-6" />, text: "Formulate solution concepts" },
    { icon: <Cpu className="w-6 h-6" />, text: "Leverage AI to shape products" },
    { icon: <Rocket className="w-6 h-6" />, text: "Publish verified innovation portfolios" }
  ];

  return (
    <section className="py-32 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-slate-900">Our Paradigm: Learn by Creating</h2>
          <p className="text-lg text-slate-600 font-medium">We replace technical coding barriers with voice-first and natural language AI systems so every student can focus on problem-solving.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {points.map((point, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="p-8 rounded-3xl bg-white border border-slate-200/80 flex flex-col items-center text-center shadow-sm"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 mb-6">
                {point.icon}
              </div>
              <p className="font-bold text-slate-900 leading-snug">{point.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const IndustryBacking = () => {
  return (
    <section className="py-32 px-6 bg-slate-900 text-white overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 leading-tight">
              Grounded in Modern <br />
              <span className="text-cyan-400">Value-Creation Dynamics</span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed mb-8 font-medium">
              VibeLab is designed by professional builders who actively deploy artificial intelligence and software products globally.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed font-medium">
              We translate those industry methodologies into an accessible, voice-guided curriculum that emphasizes logical design, customer demand, and product execution over low-level coding syntax.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: "AI Literacy", icon: <Cpu /> },
              { label: "Design Thinking", icon: <Globe /> },
              { label: "Strategic Problem Solving", icon: <ShieldCheck /> },
              { label: "Entrepreneurship", icon: <Lightbulb /> }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-cyan-400 mb-4">{item.icon}</div>
                <p className="font-bold text-sm tracking-tight">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const VisionSection = () => {
  return (
    <section className="py-32 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="p-16 md:p-24 rounded-[3rem] bg-gradient-to-br from-cyan-600 to-blue-700 text-white text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative z-10"
          >
            <h2 className="text-xl font-bold uppercase tracking-[0.3em] mb-12 opacity-80">Our Vision</h2>
            <p className="font-display text-2xl md:text-3xl font-medium leading-relaxed max-w-4xl mx-auto">
              "To empower every student to become a creator, innovator, and problem solver by using Artificial Intelligence to transform ideas into real-world solutions. Our goal is to make innovation accessible to every student, regardless of background, language, or technical experience. VibeLab aims to create the next generation of builders, entrepreneurs, and AI-powered innovators."
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const CompanyBacking = () => {
  return (
    <section className="py-32 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80" 
                alt="Global Innovation" 
                className="rounded-[2.5rem] shadow-2xl border border-slate-200"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -top-6 -left-6 glass p-6 rounded-2xl border-cyan-500/20 shadow-xl bg-white/80 backdrop-blur-sm">
                <Globe className="w-8 h-8 text-cyan-600" />
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 text-slate-900">Empowering National Competitiveness</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-8 font-medium">
              By working with schools and governments, VibeLab prepares youth to leverage modern machine intelligence responsibly and constructively.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed font-medium">
              Our platform allows local institutions to instantly establish state-of-the-art innovation programs that enhance digital literacy, cultivate problem-solving cultures, and build proud public portfolios of student achievement.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const FinalCTA = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  return (
    <section className="py-32 px-6 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-5xl font-bold mb-12 text-slate-900 leading-tight">
          We’re not just preparing students for the future — <span className="gradient-text">we’re enabling them to innovate today.</span>
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <button 
            onClick={() => onNavigate('signup')}
            className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl"
          >
            Start the Journey
          </button>
          <button 
            onClick={() => onNavigate('contact')}
            className="flex items-center gap-3 text-slate-900 font-bold px-10 py-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
          >
            <Mail className="w-5 h-5 text-cyan-600" />
            Contact Us
          </button>
        </div>
      </div>
    </section>
  );
};

export default function AboutPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AboutHero onNavigate={onNavigate} />
      <WhatIsVibeLab />
      <InitiativeSection />
      <WhyExists />
      <AccessibilityCommitment />
      <OurApproach />
      <IndustryBacking />
      <VisionSection />
      <CompanyBacking />
      <FinalCTA onNavigate={onNavigate} />
    </div>
  );
}
