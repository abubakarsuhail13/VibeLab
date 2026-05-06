import { useState, FormEvent } from "react";
import { motion } from "motion/react";
import { Lock, KeyRound, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPassword({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Reset failed");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 bg-slate-50 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass p-8 md:p-10 rounded-[3rem] border-slate-200 shadow-2xl"
      >
        <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-xl shadow-slate-900/10">
          <KeyRound className="text-white w-8 h-8" />
        </div>
        
        <h2 className="font-display text-3xl font-bold text-slate-900 text-center mb-2">New Password</h2>
        <p className="text-slate-500 text-center mb-10 font-medium">Set a secure password for your account</p>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 mb-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-emerald-800 font-bold mb-2">Success!</p>
              <p className="text-emerald-600 text-sm font-medium">Your password has been reset. You can now log in.</p>
            </div>
            <button 
              onClick={() => onNavigate('login')}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold"
            >
              Proceed to Login
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white transition-all outline-none text-slate-900 font-medium placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white transition-all outline-none text-slate-900 font-medium placeholder:text-slate-300"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-3 group disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Update Password
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
