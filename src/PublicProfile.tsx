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
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-cyan-100/30 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-100/30 blur-[100px]" />
      </div>

      {/* Hero Header */}
      <div className="relative">
        <div className="h-48 md:h-64 bg-slate-900 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 via-slate-900 to-indigo-600/20" />
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-900 to-transparent" />
        </div>

        <div className="max-w-6xl mx-auto px-6">
          <div className="relative -mt-20 md:-mt-24 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10 pb-8 border-b border-slate-200">
            {/* Avatar */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative group shrink-0"
            >
              <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-[2.8rem] bg-white p-1.5 shadow-2xl ring-1 ring-slate-200/50">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover rounded-[2.5rem]" />
                ) : (
                  <div className="w-full h-full bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-300">
                    <User size={64} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-2xl shadow-xl border border-slate-100">
                 <div className="bg-cyan-500 text-white p-2 rounded-xl">
                   <Trophy size={20} />
                 </div>
              </div>
            </motion.div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 tracking-tight">
                  {profile.name}
                </h1>
                <div className="flex justify-center">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-cyan-50 text-cyan-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-cyan-100 shadow-sm">
                    <CheckCircle2 size={12} className="text-cyan-500" />
                    Verified Builder
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start items-center gap-y-3 gap-x-6 text-slate-500 font-medium text-sm">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-slate-400" />
                  {profile.country || 'Worldwide'}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                {profile.github_username && (
                  <a 
                    href={`https://github.com/${profile.github_username}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-slate-900 hover:text-cyan-600 transition-colors bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm"
                  >
                    <Github size={16} />
                    @{profile.github_username}
                  </a>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden lg:flex items-center gap-8 pb-4">
               <div className="text-center">
                  <div className="text-2xl font-display font-bold text-slate-900">{submissions.length}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Builds</div>
               </div>
               <div className="w-px h-8 bg-slate-200" />
               <div className="text-center">
                  <div className="text-2xl font-display font-bold text-slate-900">{badges.length}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Certs</div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-16">
            
            {/* Bio Section */}
            {profile.bio && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                     <User size={16} className="text-indigo-600" />
                  </div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Product Bio</h2>
                </div>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 rounded-[2.5rem] blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <div className="relative bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm text-slate-600 leading-relaxed font-medium text-lg">
                    {profile.bio}
                  </div>
                </div>
              </section>
            )}

            {/* Submissions Section */}
            <section>
               <div className="flex items-center justify-between mb-8 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                       <Github size={16} className="text-cyan-600" />
                    </div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Verified Shipments</h2>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{submissions.length} Total</span>
               </div>

               <div className="space-y-6">
                {submissions.length > 0 ? submissions.map((sub, i) => (
                  <motion.div 
                    key={sub.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-cyan-500/20 transition-all duration-300"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                       <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-display font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">
                              {sub.project_title}
                            </h3>
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider">
                              Phase Build
                            </span>
                          </div>
                          
                          <p className="text-slate-500 text-base leading-relaxed font-medium">
                            {sub.description}
                          </p>

                          <div className="pt-2 flex items-center gap-2">
                             <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center">
                                <CheckCircle2 size={10} className="text-emerald-500" />
                             </div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               Shipped on {new Date(sub.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                             </p>
                          </div>
                        </div>

                        <div className="flex md:flex-col lg:flex-row items-center gap-3 shrink-0">
                           <a 
                             href={sub.github_url} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             title="View Source"
                             className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all border border-slate-200 shadow-sm font-bold text-sm"
                           >
                              <Github size={18} />
                              <span className="md:hidden lg:inline">Source Code</span>
                           </a>
                           {sub.live_url && (
                             <a 
                               href={sub.live_url} 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               title="View Live App"
                               className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white hover:bg-cyan-600 transition-all shadow-xl shadow-slate-900/10 font-bold text-sm"
                             >
                                <LinkIcon size={18} />
                                <span className="md:hidden lg:inline">Live Demo</span>
                             </a>
                           )}
                        </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="p-20 text-center rounded-[3rem] bg-white border border-dashed border-slate-200 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                      <Github size={32} />
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold">No Public Shipments</p>
                      <p className="text-slate-400 text-sm font-medium">This builder is currently heads down in the lab.</p>
                    </div>
                  </div>
                )}
               </div>
            </section>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-12">
            
            {/* Certifications Card */}
            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Trophy size={16} className="text-amber-500" />
                    </div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Credentials</h2>
                  </div>
                </div>

                <div className="space-y-4">
                  {badges.length > 0 ? badges.map((badge, i) => (
                    <motion.div 
                      key={badge.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-amber-200 transition-colors flex items-center gap-4"
                    >
                      <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                        <Trophy size={24} className="text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-display font-bold text-slate-900 text-sm">{badge.phase_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Certified</span>
                           <div className="w-1 h-1 rounded-full bg-slate-300" />
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{new Date(badge.created_at).getFullYear()}</span>
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No Certs Yet</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="p-4 bg-slate-900 rounded-2xl">
                    <p className="text-white font-bold text-sm mb-1">VibeLab Proof-of-Build</p>
                    <p className="text-slate-400 text-[10px] leading-relaxed font-medium">All credentials above are cryptographically verified through project submission and peer review.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Call to Action */}
            <div className="relative group p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-indigo-950 text-white overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] -mr-32 -mt-32 animate-pulse" />
               <div className="relative z-10">
                 <h4 className="text-xl font-display font-bold mb-3">Join the Builder Economy</h4>
                 <p className="text-slate-400 text-sm leading-relaxed mb-8 font-medium">
                   Build real products, earn verified credentials, and showcase your talent to the global ecosystem.
                 </p>
                 <button 
                   onClick={() => window.location.href = '/'}
                   className="w-full flex items-center justify-center gap-2 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-cyan-900/20 active:scale-95"
                 >
                   Start Your Journey 
                   <ExternalLink size={14} />
                 </button>
               </div>
            </div>

            {/* Verification Footer */}
            <div className="px-4 text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Verification Artifact ID</p>
               <code className="text-[10px] font-mono text-slate-300 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                 VB-{userId.padStart(6, '0')}-{Date.now().toString().slice(-6)}
               </code>
            </div>

          </div>
        </div>
      </div>
    </div>

  );
}
