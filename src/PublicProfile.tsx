import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Github, Link as LinkIcon, CheckCircle2, User, Calendar, ExternalLink, Globe } from 'lucide-react';

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
          const profileData = await profileRes.json();
          setProfile(profileData);
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
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-cyan-100/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-100/20 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[25%] h-[25%] rounded-full bg-purple-100/10 blur-[80px]" />
      </div>

      {/* Hero Header */}
      <div className="relative">
        <div className="h-56 md:h-72 bg-slate-900 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/30 via-slate-900 to-indigo-600/30" />
          <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-slate-900 to-transparent" />
          
          {/* Decorative shapes */}
          <div className="absolute top-10 left-1/4 w-32 h-32 border border-white/5 rounded-full animate-pulse" />
          <div className="absolute bottom-10 right-1/4 w-48 h-48 border border-white/5 rounded-full animate-pulse delay-700" />
        </div>

        <div className="max-w-6xl mx-auto px-6">
          <div className="relative -mt-24 md:-mt-32 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10 pb-10 border-b border-slate-200/60">
            {/* Avatar */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative group shrink-0"
            >
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-[3.2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-[3rem] bg-white p-2 shadow-2xl ring-1 ring-slate-200/50">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover rounded-[2.6rem]" />
                ) : (
                  <div className="w-full h-full bg-slate-50 rounded-[2.6rem] flex items-center justify-center text-slate-300">
                    <User size={80} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white p-2.5 rounded-2xl shadow-xl border border-slate-100">
                 <div className="bg-gradient-to-br from-amber-400 to-amber-600 text-white p-2.5 rounded-xl shadow-inner">
                   <Trophy size={24} />
                 </div>
              </div>
            </motion.div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left space-y-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <h1 className="text-4xl md:text-6xl font-display font-black text-slate-900 tracking-tight leading-none">
                  {profile.name}
                </h1>
                <div className="flex justify-center">
                  <motion.span 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100 shadow-sm"
                  >
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Verified Builder
                  </motion.span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start items-center gap-y-4 gap-x-8 text-slate-500 font-bold text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                    <Globe size={16} className="text-cyan-500" />
                  </div>
                  {profile.country || 'Worldwide'}
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                    <Calendar size={16} className="text-indigo-500" />
                  </div>
                  Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                {profile.github_username && (
                  <a 
                    href={`https://github.com/${profile.github_username}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2.5 group/link"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-900 group-hover/link:bg-cyan-500 text-white shadow-sm flex items-center justify-center transition-colors">
                      <Github size={16} />
                    </div>
                    <span className="group-hover/link:text-cyan-600 transition-colors">@{profile.github_username}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Top Score/Stats Display */}
            <div className="hidden xl:flex items-center gap-10 pb-4">
               <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm min-w-28 text-center flex flex-col items-center gap-1">
                  <div className="text-3xl font-display font-black text-slate-900">{submissions.length}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Builds</div>
               </div>
               <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm min-w-28 text-center flex flex-col items-center gap-1">
                  <div className="text-3xl font-display font-black text-slate-900">{badges.length}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery Badges</div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Left Column: Bio & Submissions */}
          <div className="lg:col-span-8 space-y-20">
            
            {/* Bio Section with refined styling */}
            {profile.bio && (
              <section className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                       <User size={18} className="text-indigo-600" />
                    </div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Builder Philosophy</h2>
                  </div>
                </div>
                <div className="relative group p-0.5">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-[2.6rem] blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <div className="relative bg-white p-10 md:p-12 rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                    <div className="absolute top-6 left-6 text-slate-100">
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor"><path d="M10 25h5v5h-5v-5zm0-10h5v5h-5v-5zm10 10h5v5h-5v-5zm0-10h5v5h-5v-5zm10 10h5v5h-5v-5zm0-10h5v5h-5v-5z" opacity=".2"/></svg>
                    </div>
                    <p className="text-slate-700 text-xl leading-relaxed font-medium italic">
                      "{profile.bio}"
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Submissions with improved card design */}
            <section>
               <div className="flex items-center justify-between mb-10 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center">
                       <Github size={18} className="text-cyan-600" />
                    </div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Open Source Proofs</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
                      {submissions.length} Shipments Total
                    </span>
                  </div>
               </div>

               <div className="space-y-8">
                {submissions.length > 0 ? submissions.map((sub, i) => (
                  <motion.div 
                    key={sub.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:border-cyan-500/30 transition-all duration-500 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-cyan-50/50 to-transparent rounded-full -mr-24 -mt-24 transition-all duration-500 group-hover:scale-150" />
                    
                    <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-8">
                       <div className="space-y-6 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-3xl font-display font-black text-slate-900 group-hover:text-cyan-600 transition-colors leading-tight">
                              {sub.project_title}
                            </h3>
                            <div className="flex gap-2">
                              <span className="px-3 py-1 bg-cyan-50 text-cyan-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-cyan-100 shadow-sm">
                                Standard Build
                              </span>
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100 shadow-sm">
                                Verified
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-slate-600 text-lg leading-relaxed font-normal">
                            {sub.description}
                          </p>

                          <div className="flex items-center gap-6 pt-2">
                             <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                   <CheckCircle2 size={12} className="text-emerald-600" />
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  Proof Verified
                                </span>
                             </div>
                             <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-300" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {new Date(sub.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                             </div>
                          </div>
                        </div>

                        <div className="flex md:flex-col items-stretch gap-3 shrink-0 min-w-[160px]">
                           <a 
                             href={sub.github_url} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all font-black text-xs uppercase tracking-widest shadow-sm"
                           >
                              <Github size={18} />
                              Source
                           </a>
                           {sub.live_url && (
                             <a 
                               href={sub.live_url} 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 text-white hover:bg-cyan-600 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 active:scale-95"
                             >
                                <LinkIcon size={18} />
                                Demo
                             </a>
                           )}
                        </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="py-32 text-center rounded-[3.5rem] bg-white border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
                    <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 relative">
                      <div className="absolute inset-0 animate-ping rounded-3xl bg-slate-100 opacity-20" />
                      <Github size={48} />
                    </div>
                    <div className="max-w-xs space-y-2">
                      <p className="text-xl font-display font-bold text-slate-900">Quiet in the Lab</p>
                      <p className="text-slate-500 text-sm font-medium">This builder is currently cooking up something legendary behind the scenes.</p>
                    </div>
                  </div>
                )}
               </div>
            </section>
          </div>

          {/* Right Column: Badges & Info */}
          <div className="lg:col-span-4 space-y-16">
            
            {/* Certifications with Badge Design */}
            <section className="space-y-10">
              <div className="flex items-center gap-3 px-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <Trophy size={18} className="text-amber-500" />
                </div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Verified Mastery</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 px-2">
                {badges.length > 0 ? badges.map((badge, i) => (
                  <motion.div 
                    key={badge.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative group p-0.5 rounded-3xl bg-gradient-to-br from-amber-200/50 via-white to-orange-100/50 shadow-sm border border-slate-100"
                  >
                    <div className="bg-white p-6 rounded-[1.4rem] border border-white/80 shadow-inner flex items-center gap-5">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-12 transition-transform duration-500">
                        <Trophy size={28} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-display font-black text-slate-900 text-base leading-tight">
                          {badge.phase_name.split(':')[0]}
                        </h4>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          {badge.phase_name.split(':')[1]?.trim() || 'Mastery Certification'}
                        </div>
                        <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100">
                           <Calendar size={10} className="text-slate-400" />
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{new Date(badge.created_at).getFullYear()}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4">
                      <Trophy size={20} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Proof-of-Mastery currently in progress</p>
                  </div>
                )}
              </div>
            </section>

            {/* Sidebar Callout */}
            <div className="p-1.5 rounded-[3rem] bg-slate-900 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
               <div className="relative z-10 p-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-95">
                 <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center mb-8 shadow-lg shadow-cyan-900/40">
                   <ExternalLink size={20} className="text-slate-900" />
                 </div>
                 <h4 className="text-2xl font-display font-black text-white mb-4 tracking-tight leading-none italic">Think. Build. Ship.</h4>
                 <p className="text-slate-400 text-sm leading-relaxed mb-10 font-bold">
                   The next era of product building is here. Connect with the best builders in the ecosystem.
                 </p>
                 <button 
                   onClick={() => window.location.href = '/'}
                   className="w-full flex items-center justify-center gap-3 py-5 bg-white hover:bg-cyan-500 hover:text-slate-900 text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 group-hover:shadow-cyan-500/20"
                 >
                   Start Your Build
                   <ExternalLink size={16} />
                 </button>
               </div>
            </div>

            {/* Security Verification Tag */}
            <div className="px-6 space-y-6">
               <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Verification Protocol</p>
                  <div className="h-px flex-1 bg-slate-200" />
               </div>
               <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm font-mono text-[9px] text-slate-400 leading-relaxed break-all">
                  <div className="flex justify-between mb-2 pb-2 border-b border-slate-50 italic">
                    <span>Artifact ID</span>
                    <span>VB-{userId.padStart(6, '0')}</span>
                  </div>
                  <div className="opacity-60">
                    HASH: {btoa(userId + '_' + Date.now()).slice(0, 32)}<br/>
                    STATUS: LIVE_VERIFIED_V1
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>

  );
}
