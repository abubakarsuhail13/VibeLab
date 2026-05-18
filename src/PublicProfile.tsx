import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Github, Link as LinkIcon, CheckCircle2, User, Calendar, ExternalLink } from 'lucide-react';

interface PublicProfileProps {
  userId: string;
}

export default function PublicProfile({ userId }: PublicProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, subsRes, badgesRes] = await Promise.all([
          fetch(`/api/user/${userId}/profile`),
          fetch(`/api/user/${userId}/submissions`),
          fetch(`/api/user/${userId}/badges`)
        ]);

        if (profileRes.ok) {
          setProfile(await profileRes.json());
          setSubmissions(await subsRes.json());
          setBadges(await badgesRes.json());
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Profile Not Found</h1>
          <p className="text-slate-500 mb-6">The verification link you followed may be invalid or expired.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF]">
      {/* Header / Banner */}
      <div className="h-64 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(14,165,233,0.3)_0%,_transparent_70%)]" />
        </div>
        <div className="max-w-5xl mx-auto px-6 h-full flex items-end pb-12">
             <div className="relative z-10 flex flex-col md:flex-row md:items-end gap-8 translate-y-20">
                <div className="w-40 h-40 rounded-[3rem] bg-white p-2 shadow-2xl ring-4 ring-white shrink-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover rounded-[2.5rem]" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-400">
                      <User size={48} />
                    </div>
                  )}
                </div>
                <div className="pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-display font-bold text-slate-900">{profile.name}</h1>
                    <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified Builder
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      Joined {new Date(profile.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      {badges.length} Certifications
                    </div>
                  </div>
                </div>
             </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-32 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                <Github size={24} className="text-slate-400" />
                Verified Submissions
              </h2>
              <div className="space-y-6">
                {submissions.length > 0 ? submissions.map((sub, i) => (
                  <motion.div 
                    key={sub.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                       <div className="space-y-2">
                          <h3 className="text-xl font-bold text-slate-900">{sub.project_title}</h3>
                          <p className="text-slate-500 text-sm font-medium line-clamp-2">{sub.description}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed on {new Date(sub.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                           <a 
                             href={sub.github_url} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             className="p-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all border border-slate-100"
                           >
                              <Github size={20} />
                           </a>
                           {sub.live_url && (
                             <a 
                               href={sub.live_url} 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               className="p-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                             >
                                <LinkIcon size={20} />
                             </a>
                           )}
                        </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="p-12 text-center rounded-[2.5rem] bg-slate-50 border border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium">No public submissions yet.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-12">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <Trophy size={20} className="text-amber-500" />
                Certifications
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {badges.length > 0 ? badges.map((badge, i) => (
                   <motion.div 
                     key={badge.id}
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: i * 0.1 }}
                     className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4"
                   >
                      <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                         <Trophy size={20} className="text-amber-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm tracking-tight">{badge.phase_name}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(badge.created_at).getFullYear()}</p>
                      </div>
                   </motion.div>
                )) : (
                  <p className="text-slate-400 text-sm font-medium">No certifications earned yet.</p>
                )}
              </div>
            </section>

            <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100">
               <h4 className="font-bold text-slate-900 mb-2">Verified by VibeLab</h4>
               <p className="text-slate-500 text-xs leading-relaxed">This profile and all its contents have been verified by VibeLab's automated proof-of-build system.</p>
               <div className="mt-6 pt-6 border-t border-slate-200">
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="inline-flex items-center gap-2 text-slate-900 font-bold text-sm hover:translate-x-1 transition-transform"
                  >
                    Join VibeLab 
                    <ExternalLink size={14} />
                  </button>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
