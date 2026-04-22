import { useState, FormEvent } from "react";
import { motion } from "motion/react";
import { 
  ArrowRight, 
  Mail, 
  Globe, 
  Twitter, 
  Linkedin, 
  Github,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";

const ContactHero = () => {
  return (
    <section className="relative pt-48 pb-20 px-6 overflow-hidden hero-gradient">
      <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] -z-10" />

      <div className="max-w-4xl mx-auto text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight text-slate-900">
            Let’s Build the <span className="gradient-text">Future of Learning</span> Together
          </h1>
          <p className="text-xl text-slate-600 mb-12 leading-relaxed">
            Connect with VibeLab — whether you're an investor, school, or partner, we’d love to collaborate.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    role: "",
    interest_type: "",
    message: "",
    source: "vibelab_landing_v1"
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Full Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email Address is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.role) newErrors.role = "Please select a role";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('loading');

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setStatus('success');
        setFormData({
          name: "",
          email: "",
          organization: "",
          role: "",
          interest_type: "",
          message: "",
          source: "vibelab_landing_v1"
        });
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error("Submission error:", error);
      setStatus('error');
    }
  };

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="glass p-8 md:p-12 rounded-[2.5rem] border-slate-200 shadow-2xl relative overflow-hidden">
          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h3>
              <p className="text-slate-600 mb-8">Our team will reach out shortly.</p>
              <button 
                onClick={() => setStatus('idle')}
                className="text-cyan-600 font-bold hover:underline"
              >
                Send another message
              </button>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Full Name *</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                  className={`w-full px-6 py-4 rounded-2xl bg-slate-50 border ${errors.name ? 'border-red-300' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all`}
                />
                {errors.name && <p className="text-xs text-red-500 ml-1">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Email Address *</label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="john@example.com"
                  className={`w-full px-6 py-4 rounded-2xl bg-slate-50 border ${errors.email ? 'border-red-300' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all`}
                />
                {errors.email && <p className="text-xs text-red-500 ml-1">{errors.email}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Organization / Company</label>
                <input 
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({...formData, organization: e.target.value})}
                  placeholder="Company Name"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Role *</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className={`w-full px-6 py-4 rounded-2xl bg-slate-50 border ${errors.role ? 'border-red-300' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all appearance-none`}
                >
                  <option value="">Select your role</option>
                  <option value="Investor">Investor</option>
                  <option value="School / Educator">School / Educator</option>
                  <option value="Student">Student</option>
                  <option value="Partner / Collaborator">Partner / Collaborator</option>
                </select>
                {errors.role && <p className="text-xs text-red-500 ml-1">{errors.role}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Investment Interest?</label>
              <div className="flex gap-4">
                {['Yes', 'No'].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio"
                      name="interest"
                      value={option}
                      checked={formData.interest_type === option}
                      onChange={(e) => setFormData({...formData, interest_type: e.target.value})}
                      className="hidden"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.interest_type === option ? 'border-cyan-600 bg-cyan-600' : 'border-slate-300 group-hover:border-cyan-400'}`}>
                      {formData.interest_type === option && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="text-sm font-medium text-slate-600">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Message *</label>
              <textarea 
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="How can we help you?"
                rows={5}
                className={`w-full px-6 py-4 rounded-2xl bg-slate-50 border ${errors.message ? 'border-red-300' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none`}
              />
              {errors.message && <p className="text-xs text-red-500 ml-1">{errors.message}</p>}
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">Something went wrong. Please try again.</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-5 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-cyan-600/30 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {status === 'loading' ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Submit Inquiry <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

const ContactInfo = () => {
  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="p-10 rounded-[2.5rem] glass border-slate-200 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 mb-8">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Email Us</h3>
            <a href="mailto:vibelab@nexaforgetech.com" className="text-xl font-medium text-cyan-600 hover:underline mb-6 block">
              vibelab@nexaforgetech.com
            </a>
            <p className="text-slate-500 font-medium">
              Global EdTech Initiative by NexaForge Technologies
            </p>
          </div>

          <div className="p-10 rounded-[2.5rem] glass border-slate-200 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 mb-8">
              <Globe className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Follow Our Journey</h3>
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
                  className="w-12 h-12 rounded-xl glass flex items-center justify-center hover:bg-cyan-500/5 hover:text-cyan-600 transition-all border-slate-200 text-slate-500"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ContactCTA = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  return (
    <section className="py-32 px-6 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display text-4xl md:text-6xl font-bold mb-12 text-slate-900 leading-tight">
          Join the <span className="gradient-text">Builders of Tomorrow</span>
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-cyan-600/30 transition-all"
          >
            Join Early Access
          </button>
          <button 
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 text-slate-900 font-bold px-10 py-5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    </section>
  );
};

export default function ContactPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <ContactHero />
      <ContactForm />
      <ContactInfo />
      <ContactCTA onNavigate={onNavigate} />
    </div>
  );
}
