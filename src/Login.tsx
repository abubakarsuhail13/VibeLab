import { useState, FormEvent } from "react";
import { motion } from "motion/react";
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Loader2, Github } from "lucide-react";

const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
    <path
      d="M21.35 11.1H12v2.7h5.38c-.24 1.28-.96 2.37-2.04 3.1v2.57h3.3c1.93-1.78 3.04-4.4 3.04-7.48 0-.61-.06-1.21-.17-1.79z"
      fill="#4285F4"
    />
    <path
      d="M12 20.6c2.43 0 4.47-.8 5.96-2.18l-3.3-2.57c-.91.61-2.08.98-3.3.98-2.34 0-4.33-1.58-5.03-3.71l-3.41 2.64c1.48 2.95 4.54 4.84 8.08 4.84z"
      fill="#34A853"
    />
    <path
      d="M6.97 13.16a6.016 6.016 0 0 1 0-3.82L3.56 6.7a9.985 9.985 0 0 0 0 9.1l3.41-2.64z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.32 0 2.51.45 3.44 1.35l2.58-2.58C16.46 2.63 14.42 1.8 12 1.8c-3.54 0-6.6 1.89-8.08 4.84l3.41 2.64c.7-2.13 2.69-3.71 5.03-3.71z"
      fill="#EA4335"
    />
  </svg>
);

interface LoginProps {
  onNavigate: (page: string) => void;
  onLoginSuccess: (user: any) => void;
}

export default function Login({ onNavigate, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('vibelab_token', data.token);
        localStorage.setItem('vibelab_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        onNavigate('dashboard');
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 bg-slate-50 flex flex-col items-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass p-8 md:p-10 rounded-[3rem] border-slate-200 shadow-2xl"
      >
        <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-xl shadow-slate-900/10">
          <ShieldCheck className="text-white w-8 h-8" />
        </div>
        
        <h2 className="font-display text-3xl font-bold text-slate-900 text-center mb-2">Welcome Back</h2>
        <p className="text-slate-500 text-center mb-8 font-medium">Progress your learning journey</p>

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

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Password</label>
              <button 
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-[10px] font-bold text-cyan-600 hover:text-cyan-700 uppercase tracking-wider"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white transition-all outline-none text-slate-900 font-medium placeholder:text-slate-300"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Continue to Platform
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <span className="relative bg-white px-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">or</span>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              window.location.href = '/api/auth/github';
            }}
            className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 hover:border-slate-300 shadow-sm animate-in fade-in duration-300"
          >
            <Github className="w-5 h-5 text-slate-900" />
            Continue with GitHub
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = '/api/auth/google';
            }}
            className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 hover:border-slate-300 shadow-sm animate-in fade-in duration-300"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500 font-medium">
            New to VibeLab?{" "}
            <button 
              onClick={() => onNavigate('signup')}
              className="text-cyan-600 hover:text-cyan-700 font-bold ml-1 transition-colors"
            >
              Join for Early Access
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
