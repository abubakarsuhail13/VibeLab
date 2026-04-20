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

const AboutHero = () => {
  return (
    <section className="relative pt-48 pb-32 px-6 overflow-hidden hero-gradient">
      <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] -z-10" />

      <div className="max-w-4xl mx-auto text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-600 mb-8 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Our Mission</span>
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight text-slate-900">
            We Don’t Just Teach Technology — <br />
            <span className="gradient-text">We Help Students Build It.</span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-12 leading-relaxed">
            VibeLab is an educational initiative by NexaForge Technologies, designed to redefine how students learn coding, AI, and digital skills through real-world project building.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-cyan-600/30 transition-all flex items-center gap-3 group">
              Join Early Access <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="flex items-center gap-3 text-slate-900 font-bold px-8 py-5 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all">
              Partner With Us
            </button>
          </div>
        </motion.div>
      </div>
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
              An Education Initiative by <br />
              <span className="gradient-text">NexaForge Technologies</span>
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              VibeLab is powered by NexaForge Technologies, a UK-based company specializing in AI and scalable software systems for startups and enterprises. 
            </p>
            <p className="text-lg text-slate-600 leading-relaxed">
              Through VibeLab, we bring real-world engineering experience into education, helping students learn by building instead of memorizing theory.
            </p>
          </motion.div>
          <div className="relative">
            <div className="aspect-video rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80" 
                alt="Engineering Excellence" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-8 -right-8 glass p-8 rounded-3xl border-cyan-500/20 shadow-xl max-w-xs">
              <ShieldCheck className="w-10 h-10 text-cyan-600 mb-4" />
              <p className="text-sm font-bold text-slate-900">Industry-standard practices applied to every learning module.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const WhyExists = () => {
  return (
    <section className="py-32 px-6 bg-slate-50">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 text-slate-900">Why VibeLab Exists</h2>
        <div className="space-y-8 text-lg text-slate-600 leading-relaxed">
          <p>
            Traditional education focuses heavily on theory, but today’s digital world demands practical skills. Students often learn concepts without ever building real systems.
          </p>
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-900 italic">
              "VibeLab was created to bridge this gap — transforming students from passive learners into active creators."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const OurApproach = () => {
  const points = [
    { icon: <Rocket className="w-6 h-6" />, text: "Create real applications" },
    { icon: <Cpu className="w-6 h-6" />, text: "Develop AI-powered tools" },
    { icon: <Target className="w-6 h-6" />, text: "Solve real-world problems" },
    { icon: <Sparkles className="w-6 h-6" />, text: "Build portfolios from day one" }
  ];

  return (
    <section className="py-32 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-slate-900">Our Approach: Build-to-Learn</h2>
          <p className="text-lg text-slate-600">We believe learning should lead to creation. VibeLab follows a build-first model.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {points.map((point, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="p-8 rounded-3xl glass border-slate-200 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 mb-6">
                {point.icon}
              </div>
              <p className="font-bold text-slate-900">{point.text}</p>
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
              Powered by Real <br />
              <span className="text-cyan-400">Industry Experience</span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed mb-8">
              VibeLab is backed by a team that actively builds AI systems, SaaS platforms, and scalable cloud solutions. 
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              This ensures students learn skills that are relevant, practical, and aligned with modern technology demands.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: "AI Systems", icon: <Cpu /> },
              { label: "SaaS Platforms", icon: <Globe /> },
              { label: "Cloud Solutions", icon: <ShieldCheck /> },
              { label: "Innovation", icon: <Lightbulb /> }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-cyan-400 mb-4">{item.icon}</div>
                <p className="font-bold">{item.label}</p>
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
            <p className="font-display text-3xl md:text-5xl font-bold leading-tight">
              "To become the global platform where the next generation doesn’t just learn technology — they build it."
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
              <div className="absolute -top-6 -left-6 glass p-6 rounded-2xl border-cyan-500/20 shadow-xl">
                <Globe className="w-8 h-8 text-cyan-600" />
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 text-slate-900">Backed by NexaForge Technologies</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              NexaForge Technologies works with startups and enterprises globally, delivering innovation through software, AI, and system design. 
            </p>
            <p className="text-lg text-slate-600 leading-relaxed">
              VibeLab is our initiative to shape the future workforce through practical, build-focused education.
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
        <h2 className="font-display text-4xl md:text-6xl font-bold mb-12 text-slate-900 leading-tight">
          We’re not just preparing students for the future — <span className="gradient-text">we’re enabling them to build it.</span>
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <button className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl">
            Join Early Access
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
      <AboutHero />
      <InitiativeSection />
      <WhyExists />
      <OurApproach />
      <IndustryBacking />
      <VisionSection />
      <CompanyBacking />
      <FinalCTA onNavigate={onNavigate} />
    </div>
  );
}
