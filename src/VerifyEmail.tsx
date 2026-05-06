import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Mail, ShieldCheck, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

export default function VerifyEmail({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage("Verification token is missing.");
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(`/api/auth/verify?token=${token}`);
        const data = await response.json();
        if (response.ok) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error || "Verification failed");
        }
      } catch (err) {
        setStatus('error');
        setMessage("Connection error. Please try again.");
      }
    };

    verify();
  }, []);

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 bg-slate-50 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass p-10 rounded-[3rem] border-slate-200 shadow-2xl text-center"
      >
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-xl ${
          status === 'loading' ? 'bg-slate-900 shadow-slate-900/10' :
          status === 'success' ? 'bg-emerald-500 shadow-emerald-500/10' : 'bg-red-500 shadow-red-500/10'
        }`}>
          {status === 'loading' && <Loader2 className="text-white w-10 h-10 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="text-white w-10 h-10" />}
          {status === 'error' && <AlertCircle className="text-white w-10 h-10" />}
        </div>
        
        <h2 className="font-display text-3xl font-bold text-slate-900 mb-4">
          {status === 'loading' && "One Moment..."}
          {status === 'success' && "Email Verified!"}
          {status === 'error' && "Verification Error"}
        </h2>
        
        <p className="text-slate-500 font-medium mb-10 leading-relaxed">
          {message}
        </p>

        {status !== 'loading' && (
          <button 
            onClick={() => onNavigate('login')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-3 group"
          >
            {status === 'success' ? "Go to Login" : "Return to Login"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </motion.div>
    </div>
  );
}
