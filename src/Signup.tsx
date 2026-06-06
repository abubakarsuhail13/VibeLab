import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Mail, Lock, User, GraduationCap, School, ArrowRight, AlertCircle, Loader2, CheckCircle2, Globe, ShieldCheck, BookOpen } from "lucide-react";
import { EducationalAiBackground } from "./components/EducationalAiBackground";

interface SignupProps {
  onNavigate: (page: string) => void;
  onLoginSuccess: (user: any) => void;
}

// List of standard countries for simple visual select
const countries = [
  "United States",
  "India",
  "Bangladesh",
  "Pakistan",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "United Arab Emirates",
  "Singapore",
  "Saudi Arabia",
  "Malaysia",
  "Other"
];

export default function Signup({ onNavigate, onLoginSuccess }: SignupProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<"School Student" | "College / University Student" | "Teacher">("School Student");
  const [country, setCountry] = useState("United Kingdom");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError("You must accept the Terms and Privacy Policy to register");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role: accountType === "Teacher" ? "teacher" : "student",
          account_type: accountType,
          country
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setToastMessage(data.message || "Registration successful! Check your email to verify.");
        setShowToast(true);
        setIsRegistered(true);
        setPassword("");
        setConfirmPassword("");
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
      <EducationalAiBackground />
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
        className="max-w-md w-full glass p-8 md:p-10 rounded-[3rem] border border-slate-200 shadow-2xl relative z-10"
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
            <p className="text-slate-400 text-center text-sm mb-6 font-medium">Start your project-based learning adventure</p>

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

            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              
              {/* Account Type Sector Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Account Type *</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setAccountType("School Student")}
                    className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                      accountType === "School Student" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>School</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("College / University Student")}
                    className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                      accountType === "College / University Student" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>College</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("Teacher")}
                    className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                      accountType === "Teacher" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <School className="w-3.5 h-3.5" />
                    <span>Teacher</span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First & Last Name"
                    autoComplete="name"
                    className="w-full pl-12 pr-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white transition-all outline-none text-slate-900 text-sm font-medium placeholder:text-slate-300 shadow-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full pl-12 pr-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white transition-all outline-none text-slate-900 text-sm font-medium placeholder:text-slate-300 shadow-sm"
                  />
                </div>
              </div>

              {/* Country Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Country *</label>
                <div className="relative">
                  <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={country}
                    required
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full pl-12 pr-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white transition-all outline-none text-slate-900 text-sm font-medium shadow-sm appearance-none"
                  >
                    {countries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none border-l border-slate-100 pl-3">
                    <span className="text-slate-400 text-xs">▼</span>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    className="w-full pl-12 pr-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white transition-all outline-none text-slate-900 text-sm font-medium placeholder:text-slate-300 shadow-sm"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Verify your password"
                    autoComplete="new-password"
                    className="w-full pl-12 pr-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white transition-all outline-none text-slate-900 text-sm font-medium placeholder:text-slate-300 shadow-sm"
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 accent-cyan-600 rounded cursor-pointer w-4 h-4"
                />
                <label htmlFor="accept-terms" className="text-xs text-slate-500 font-medium select-none cursor-pointer leading-relaxed">
                  I accept the <a href="#" onClick={(e) => e.preventDefault()} className="text-cyan-600 hover:underline">Terms of Service</a> & <a href="#" onClick={(e) => e.preventDefault()} className="text-cyan-600 hover:underline">Privacy Policy</a>
                </label>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-cyan-900/10 flex items-center justify-center gap-3 group disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer mt-4"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-150 text-center">
              <p className="text-xs text-slate-500 font-medium font-sans">
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
