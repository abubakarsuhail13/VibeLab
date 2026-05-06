import { useState, useRef, ChangeEvent } from "react";
import { motion } from "motion/react";
import { 
  Rocket, 
  BookOpen, 
  Users, 
  MessageSquare, 
  ChevronRight, 
  Settings,
  Bell,
  Search,
  Zap,
  Star,
  Clock,
  LogOut,
  Camera,
  ShieldCheck,
  AlertTriangle,
  Upload
} from "lucide-react";

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onUpdateUser: (user: any) => void;
}

export default function Dashboard({ user, onLogout, onUpdateUser }: DashboardProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = [
    { label: "Active Projects", value: "3", icon: <Rocket className="w-5 h-5 text-cyan-500" />, bg: "bg-cyan-50" },
    { label: "Skills Earned", value: "12", icon: <Star className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50" },
    { label: "Total Hours", value: "48", icon: <Clock className="w-5 h-5 text-emerald-500" />, bg: "bg-emerald-50" },
    { label: "Learning Streak", value: "5 Days", icon: <Zap className="w-5 h-5 text-indigo-500" />, bg: "bg-indigo-50" },
  ];

  const projects = [
    { name: "Autonomous Drone System", progress: 65, category: "Robotics", date: "2 days ago" },
    { name: "Smart Garden IoT", progress: 40, category: "Hardware", date: "5 days ago" },
    { name: "Personal AI Assistant", progress: 90, category: "Software", date: "Just now" },
  ];

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large. Max 2MB.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const token = localStorage.getItem('vibelab_token');
      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        const updatedUser = { ...user, avatar_url: data.avatarUrl };
        localStorage.setItem('vibelab_user', JSON.stringify(updatedUser));
        onUpdateUser(updatedUser);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      alert("Error uploading avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-slate-200 hidden lg:flex flex-col p-8 pt-24 sticky top-0 h-screen">
        <div className="relative group mb-10">
          <div className="flex items-center gap-4 px-2 py-3 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
            <div 
              onClick={handleAvatarClick}
              className="relative w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl uppercase overflow-hidden cursor-pointer group/avatar shrink-0"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || 'U'
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
            <div className="truncate">
              <p className="font-bold text-slate-900 truncate">{user?.name || 'User'}</p>
              <div className="flex items-center gap-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.role || 'Member'}</p>
                {user?.is_verified ? (
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-amber-500" title="Unverified" />
                )}
              </div>
            </div>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { label: 'Overview', icon: <Rocket className="w-5 h-5" />, active: true },
            { label: 'Curriculum', icon: <BookOpen className="w-5 h-5" />, active: false },
            { label: 'Community', icon: <Users className="w-5 h-5" />, active: false },
            { label: 'Mentors', icon: <MessageSquare className="w-5 h-5" />, active: false },
            { label: 'Settings', icon: <Settings className="w-5 h-5" />, active: false },
          ].map((item, i) => (
            <button 
              key={i}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${
                item.active ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <button 
          onClick={onLogout}
          className="mt-auto flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 md:p-12 pt-16 lg:pt-32 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Mobile Profile Bar */}
          <div className="lg:hidden flex items-center justify-between mb-8 pb-8 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div 
                onClick={handleAvatarClick}
                className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl uppercase overflow-hidden relative"
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.[0] || 'U'
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-slate-900">{user?.name || 'User'}</p>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.role || 'Member'}</p>
                  {user?.is_verified && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                </div>
              </div>
            </div>
            <button onClick={onLogout} className="p-2 text-red-500">
              <LogOut className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
            <div>
              <h1 className="text-4xl font-display font-bold text-slate-900 mb-2">Hello, {user?.name?.split(' ')[0] || 'there'}!</h1>
              <p className="text-slate-500 font-medium italic">"Every project is a step towards mastery."</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search labs..." 
                  className="pl-11 pr-6 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:border-slate-900 transition-all font-medium text-sm w-44 lg:w-64"
                />
              </div>
              <button className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
              >
                <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-4`}>
                  {stat.icon}
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-900 mb-1">{stat.value}</h3>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Active Projects */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-slate-900">Active Lab Projects</h2>
                <button className="text-cyan-600 font-bold text-sm hover:underline">View All</button>
              </div>
              
              <div className="space-y-4">
                {projects.map((project, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{project.category}</span>
                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-cyan-600 transition-colors">{project.name}</h3>
                      </div>
                      <span className="text-xs font-medium text-slate-400">{project.date}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-slate-900">{project.progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-cyan-500" 
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900">Recommended Next Step</h2>
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-cyan-500/30 transition-all" />
                
                <h3 className="text-2xl font-display font-bold mb-4 relative z-10">Advanced Neural Networks</h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed relative z-10">
                  Ready to dive deeper? Your next project focuses on building a custom LLM fine-tuned for creative writing.
                </p>
                
                <button className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group relative z-10">
                  Start Project
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-6">Upcoming Workshops</h3>
                <div className="space-y-6">
                  {[
                    { title: "Generative Art with Three.js", time: "Today, 4:00 PM" },
                    { title: "Building Scalable Backends", time: "Tomorrow, 2:00 PM" }
                  ].map((workshop, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-1 h-12 bg-cyan-500 rounded-full" />
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{workshop.title}</h4>
                        <p className="text-xs font-medium text-slate-400 mt-1">{workshop.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
