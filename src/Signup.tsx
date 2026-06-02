import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Mail, Lock, User, GraduationCap, School, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

interface SignupProps {
  onNavigate: (page: string) => void;
  onLoginSuccess: (user: any) => void;
}

export default function Signup({ onNavigate, onLoginSuccess }: SignupProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setToastMessage(data.message || "Registration successful! Check your email to verify.");
        setShowToast(true);
        setIsRegistered(true);
        setPassword("");
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Premium Toast Notification overlay */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[320px] max-w-md"
          >
            <div className="p-2 bg-cyan-500/10 rounded-xl">
              <Sparkles className="font-sans w-5 h-5 text-cyan-400 shrink-0" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-white mb-0.5 font-sans">Account Created Successfully</p>
              <p className="text-slate-400 font-medium font-sans">{toastMessage}</p>
            </div>
            <button 
              onClick={() => setShowToast(false)} 
              className="ml-auto text-slate-400 hover:text-white font-bold text-sm pl-2 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass p-8 md:p-10 rounded-[3rem] border border-slate-200 shadow-2xl"
      >
        {isRegistered ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-8 mx-auto border border-emerald-100 shadow-lg shadow-emerald-500/5">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            
            <h2 className="font-display text-3xl font-bold text-slate-900 mb-3">Check Your Email</h2>
            <p className="text-slate-500 mb-8 font-medium text-sm leading-relaxed font-sans">
              We have sent a verification link to <span className="font-bold text-slate-800">{email}</span>. Please click the link to activate your account and start your VibeLab learning journey.
            </p>

            <button 
              onClick={() => onNavigate('login')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-3 cursor-pointer group"
            >
              Go to Login Page
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ) : (
          <>
            <div className="w-16 h-16 bg-cyan-600 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-xl shadow-cyan-900/10">
              <Sparkles className="text-white w-8 h-8" />
            </div>
            
            <h2 className="font-display text-3xl font-bold text-slate-900 text-center mb-2">Join VibeLab</h2>
            <p className="text-slate-500 text-center mb-8 font-medium">Start your project-based learning adventure</p>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
              <div className="flex gap-4 p-1 bg-slate-100 rounded-[1.25rem] mb-6">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    role === "student" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    role === "teacher" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <School className="w-4 h-4" />
                  Teacher
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First & Last Name"
                    autoComplete="name"
                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white transition-all outline-none text-slate-900 font-medium placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yours@example.com"
                    autoComplete="email"
                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white transition-all outline-none text-slate-900 font-medium placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white transition-all outline-none text-slate-900 font-medium placeholder:text-slate-300"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-cyan-900/10 flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500 font-medium font-sans">
                Already have an account?{" "}
                <button 
                  onClick={() => onNavigate('login')}
                  className="text-cyan-600 hover:text-cyan-700 font-bold ml-1 transition-colors cursor-pointer"
                >
                  Log in instead
                </button>
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
