import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Medal, Crown, Globe, Calendar, Filter, User, ChevronRight, TrendingUp } from 'lucide-react';

export default function Leaderboard() {
  const [period, setPeriod] = useState<'all-time' | 'monthly'>('all-time');
  const [selectedCountry, setSelectedCountry] = useState('Worldwide');
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const countries = ['Worldwide', 'United States', 'United Kingdom', 'India', 'Germany', 'Canada', 'Nigeria', 'Singapore', 'Australia'];

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/leaderboard?period=${period}&country=${selectedCountry}`);
        if (response.ok) {
          const data = await response.json();
          setLeaders(data);
        }
      } catch (err) {
        console.error('Leaderboard Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [period, selectedCountry]);

  const topThree = leaders.slice(0, 3);
  const others = leaders.slice(3);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Global Leaderboard</h1>
          <p className="text-slate-500 font-medium">Recognizing the builders pushing the boundaries of what's possible.</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setPeriod('all-time')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${period === 'all-time' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
          >
            All-Time
          </button>
          <button 
            onClick={() => setPeriod('monthly')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${period === 'monthly' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-500 shrink-0">
          <Filter size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Region</span>
        </div>
        {countries.map(c => (
          <button
            key={c}
            onClick={() => setSelectedCountry(c)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${selectedCountry === c ? 'bg-white border-slate-900 text-slate-900 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      ) : leaders.length > 0 ? (
        <div className="space-y-12">
          {/* Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-6 pt-10">
            {/* 2nd Place */}
            {topThree[1] && (
              <PodiumSpot leader={topThree[1]} rank={2} color="slate-400" icon={<Medal className="w-6 h-6" />} delay={0.1} />
            )}
            
            {/* 1st Place */}
            {topThree[0] && (
              <PodiumSpot leader={topThree[0]} rank={1} color="amber-400" icon={<Crown className="w-8 h-8" />} delay={0} featured />
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <PodiumSpot leader={topThree[2]} rank={3} color="orange-400" icon={<Medal className="w-6 h-6" />} delay={0.2} />
            )}
          </div>

          {/* List */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-12 gap-4">
              <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</div>
              <div className="col-span-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Builder</div>
              <div className="col-span-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Badges</div>
              <div className="col-span-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Score</div>
            </div>
            
            <div className="divide-y divide-slate-50">
              {others.map((leader, i) => (
                <motion.div 
                  key={leader.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-8 py-6 grid grid-cols-12 gap-4 items-center hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  onClick={() => window.open(`/verify/${leader.vl_id || leader.id}`, '_blank')}
                >
                  <div className="col-span-1 font-mono text-sm text-slate-400">#{i + 4}</div>
                  <div className="col-span-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100">
                      {leader.avatar_url ? (
                        <img src={leader.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <User size={16} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{leader.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">{leader.country} • {leader.vl_id}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold border border-amber-100">
                      <Trophy size={12} />
                      {leader.badges_count} Badge{leader.badges_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="col-span-3 text-right flex items-center justify-end gap-4">
                    <div className="text-right">
                       <span className="block text-lg font-black text-slate-900">{leader.badges_count} Badge{leader.badges_count !== 1 ? 's' : ''}</span>
                       <span className="block text-[10px] text-slate-400 font-medium">{leader.projects_count} submission{leader.projects_count !== 1 ? 's' : ''}</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))}
            </div>

            {others.length === 0 && Array.isArray(leaders) && leaders.length <= 3 && leaders.length > 0 && (
                <div className="p-12 text-center">
                    <p className="text-slate-400 font-medium">Keep building to enter the ranking.</p>
                </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
          <Trophy size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Leaders Found</h3>
          <p className="text-slate-500 mb-6">Be the first to climb the leaderboard!</p>
        </div>
      )}
    </div>
  );
}

function PodiumSpot({ leader, rank, color, icon, delay, featured = false }: any) {
    return (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.5 }}
          className={`flex flex-col items-center group cursor-pointer ${featured ? 'order-first md:order-none' : ''}`}
          onClick={() => window.open(`/verify/${leader.vl_id || leader.id}`, '_blank')}
        >
            <div className="relative mb-6">
                <div className={`w-${featured ? '32' : '24'} h-${featured ? '32' : '24'} rounded-[2.5rem] bg-white p-2 shadow-2xl ring-4 ring-white relative z-10 group-hover:scale-105 transition-transform`}>
                   {leader.avatar_url ? (
                      <img src={leader.avatar_url} className="w-full h-full object-cover rounded-[1.8rem]" alt="" />
                   ) : (
                      <div className="w-full h-full bg-slate-100 rounded-[1.8rem] flex items-center justify-center text-slate-400">
                        <User size={featured ? 32 : 24} />
                      </div>
                   )}
                </div>
                <div className={`absolute -top-4 -right-2 z-20 text-${color} drop-shadow-lg`}>
                    {icon}
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg">
                    {rank}
                </div>
            </div>
            
            <div className="text-center">
                <h4 className={`font-bold text-slate-900 group-hover:text-emerald-600 transition-colors ${featured ? 'text-xl' : 'text-base'}`}>{leader.name}</h4>
                <div className="flex items-center justify-center gap-1.5 mt-1 text-slate-500">
                   <Globe size={12} />
                   <span className="text-xs font-medium">{leader.country}</span>
                </div>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
                   <TrendingUp size={14} className="text-emerald-500" />
                   <span className="text-sm font-black text-slate-900">{leader.badges_count} Badge{leader.badges_count !== 1 ? 's' : ''}</span>
                </div>
            </div>
        </motion.div>
    );
}
