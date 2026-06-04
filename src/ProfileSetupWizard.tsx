import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, User, Calendar, MapPin, GraduationCap, 
  School, ChevronRight, ChevronLeft, Loader2, 
  Check, Camera, HelpCircle, BookOpen, UserCheck, Shield, AlertCircle, X, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";

// Beautiful Custom Success Toast with smooth, stable countdown matching the Contact success feel
const OnboardingSuccessToast = ({ t, onRedirect }: { t: any; onRedirect: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onRedirect]);

  return (
    <div
      className={`${
        t.visible ? "animate-enter opacity-100 translate-y-0" : "animate-leave opacity-0 -translate-y-4"
      } max-w-md w-full bg-white border border-slate-200/80 shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5 font-sans text-left relative overflow-hidden transition-all duration-300`}
      style={{ borderLeft: "4px solid #C9A84C" }}
    >
      <div className="flex items-start gap-4">
        {/* Emerald green success indicator icon, polished/consistent with the contact form submission page */}
        <div className="flex-shrink-0 bg-emerald-50 text-emerald-600 p-2.5 rounded-full border border-emerald-100 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        
        {/* Content Section */}
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
            Submission Successful! 🚀
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed font-normal font-sans">
            Your educational student profile has been saved successfully.
          </p>
          <div className="text-[11px] font-bold text-amber-600 font-mono mt-2.5 flex items-center gap-1.5 bg-amber-50/50 px-2.5 py-1.5 rounded-xl border border-amber-100/40 w-fit">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Redirecting to Intro Phase in {timeLeft} {timeLeft === 1 ? 'second' : 'seconds'}...
          </div>
        </div>
        
        {/* Close and Navigate Instantly button */}
        <button 
          type="button"
          onClick={() => {
            toast.dismiss(t.id);
            onRedirect();
          }}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface ProfileSetupWizardProps {
  user: any;
  onUpdateUser: (user: any) => void;
  onNavigate: (page: string) => void;
}

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
];

export default function ProfileSetupWizard({ user, onUpdateUser, onNavigate }: ProfileSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Personal Coordinates
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || AVATAR_PRESETS[0]);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState(user?.country || "United Kingdom");
  const [stateProvince, setStateProvince] = useState("");
  const [city, setCity] = useState("");

  // Step 2: Educational Profiles
  const [institutionName, setInstitutionName] = useState("");
  const [educationLevel, setEducationLevel] = useState(user?.account_type === "Teacher" ? "Teacher" : "Class 10");
  const [fieldOfStudy, setFieldOfStudy] = useState("Computer Science");

  // Avatar upload mechanics
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const token = localStorage.getItem("vibelab_token");
      const response = await fetch("/api/user/upload-avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok && data.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
      } else {
        setError(data.error || "Failed to upload profile photo");
      }
    } catch (err) {
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleNextStep = () => {
    setError("");
    if (step === 1) {
      if (!dob) {
        setError("Please provide your Date of Birth");
        return;
      }
      if (!stateProvince) {
        setError("Please fill in your State / Province");
        return;
      }
      if (!city) {
        setError("Please enter your City");
        return;
      }
      setStep(2);
    }
  };

  const handleFormSubmit = async () => {
    setError("");
    if (!institutionName) {
      setError("Please key in your School / College / University Name");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("vibelab_token");
      const response = await fetch("/api/user/profile-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          avatar_url: avatarUrl,
          date_of_birth: dob,
          gender: gender || null,
          country,
          state_province: stateProvince,
          city,
          institution_name: institutionName,
          education_level: educationLevel,
          field_of_study: fieldOfStudy
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Logged-in user is successfully upgraded!
        const updatedUser = {
          ...user,
          avatar_url: avatarUrl,
          country,
          profile_completed: true,
          onboarding_completed: true,
          account_type: user?.account_type || (educationLevel === "Teacher" ? "Teacher" : "School Student")
        };
        localStorage.setItem("vibelab_user", JSON.stringify(updatedUser));
        onUpdateUser(updatedUser);

        // Show success toast with a smooth 3-second countdown redirect to the Intro Phase
        toast.custom((t) => (
          <OnboardingSuccessToast t={t} onRedirect={() => onNavigate("intro")} />
        ), {
          duration: 4000,
          position: "top-center"
        });
      } else {
        setError(data.error || "Failed to complete profile registration");
      }
    } catch (err) {
      setError("Connection breakdown. Please submit again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 bg-slate-50 flex items-center justify-center relative overflow-hidden">
      
      {/* Background aesthetics */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl w-full flex flex-col md:flex-row gap-8 items-stretch font-sans">
        
        {/* Left Side: Dynamic Info Sidebar */}
        <div className="w-full md:w-[280px] flex flex-col justify-between bg-slate-900 text-white p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden shrink-0 shadow-xl">
          <div className="space-y-6 z-10">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/30">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 font-display">Personalize VibeLab</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Configure your learner profile to match projects, personalizing your path to success.
              </p>
            </div>

            {/* Stepper tracker */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 1 ? "bg-cyan-500 text-slate-950 font-bold" : "bg-cyan-900 text-cyan-200"
                }`}>
                  {step > 1 ? <Check className="w-3 h-3" /> : "1"}
                </div>
                <div className="text-xs font-semibold text-slate-200">Personal Details</div>
              </div>
              <div className="h-4 border-l border-slate-800 ml-3" />
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === 2 ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-500"
                }`}>
                  "2"
                </div>
                <div className="text-xs font-semibold text-slate-400">Education Details</div>
              </div>
            </div>
          </div>

          <div className="pt-8 md:pt-0 z-10 border-t border-slate-800/60 mt-8 md:mt-0">
            <div className="flex gap-2.5 items-center text-slate-400">
              <Shield className="w-4 h-4 text-cyan-500 shrink-0" />
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Secure Profile</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Your details are verified to provide authentic credentials and learning tracking.
            </p>
          </div>
        </div>

        {/* Right Side: Setup Wizard Panel */}
        <div className="flex-1 bg-white border border-slate-200/80 p-6 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Step {step} of 2</span>
              <span className="text-xs text-cyan-600 font-bold bg-cyan-50 px-2.5 py-1 rounded-full">{step === 1 ? "Coordinates" : "Academics"}</span>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-5"
                >
                  <h2 className="text-xl font-bold text-slate-900 font-display">Personal Coordinates</h2>
                  <p className="text-xs text-slate-400 -mt-3">Help peers and mentors connect with you</p>

                  {/* Profile Photo upload */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase ml-1">Profile Photo</label>
                    <div className="flex items-center gap-5 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      <div className="relative shrink-0">
                        <img 
                          src={avatarUrl} 
                          alt="Avatar" 
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 bg-slate-100" 
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          className="absolute -bottom-1 -right-1 bg-cyan-600 hover:bg-cyan-700 text-white p-1.5 rounded-xl border-2 border-white transition-all shadow-md cursor-pointer disabled:opacity-75"
                        >
                          {uploadingAvatar ? (
                            <Loader2 className="w-3" />
                          ) : (
                            <Camera className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <input 
                          type="file"
                          ref={fileInputRef}
                          disabled={uploadingAvatar}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-800 font-bold">Upload Custom Photo</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Recommended format: PNG, JPG (Max 5MB). Or select from preset avatars below:
                        </p>
                        <div className="flex gap-2">
                          {AVATAR_PRESETS.map((preset, idx) => (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => setAvatarUrl(preset)}
                              className={`w-8 h-8 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                avatarUrl === preset ? "border-cyan-500 scale-105" : "border-transparent opacity-75 hover:opacity-100"
                              }`}
                            >
                              <img src={preset} referrerPolicy="no-referrer" alt={`preset-${idx}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dob & Gender Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase ml-1">Date of Birth *</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input 
                          type="date" 
                          required
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white text-sm font-medium outline-none text-slate-800 placeholder:text-slate-350"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase ml-1">Gender (Optional)</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select 
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white text-sm font-medium outline-none text-slate-800 appearance-none"
                        >
                          <option value="">Select...</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px] font-mono">▼</div>
                      </div>
                    </div>
                  </div>

                  {/* Location Coordinate Subdivisions */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase ml-1">Location Details</label>
                    <div className="grid grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">State / Province *</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input 
                            type="text"
                            required
                            value={stateProvince}
                            onChange={(e) => setStateProvince(e.target.value)}
                            placeholder="e.g. Maharashtra"
                            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white text-sm font-medium outline-none text-slate-800 placeholder:text-slate-300"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest ml-1">City *</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input 
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. Mumbai"
                            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white text-sm font-medium outline-none text-slate-800 placeholder:text-slate-300"
                          />
                        </div>
                      </div>

                    </div>
                  </div>

                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-5"
                >
                  <h2 className="text-xl font-bold text-slate-900 font-display">Academic Personalization</h2>
                  <p className="text-xs text-slate-400 -mt-3">Tell us what you study to curate matching challenges</p>

                  {/* Institution Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase ml-1">School / College / University Name *</label>
                    <div className="relative">
                      <School className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input 
                        type="text"
                        required
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        placeholder="Select or type your institution..."
                        className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white text-sm font-medium outline-none text-slate-800 placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* Education level selector */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase ml-1">Current Education Level *</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select 
                          value={educationLevel}
                          onChange={(e) => setEducationLevel(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white text-sm font-medium outline-none text-slate-800 appearance-none"
                        >
                          {user?.account_type === "Teacher" ? (
                            <option value="Teacher">Teacher / Instructor</option>
                          ) : (
                            <>
                              <option value="Class 8">Class 8 (School)</option>
                              <option value="Class 9">Class 9 (School)</option>
                              <option value="Class 10">Class 10 (School)</option>
                              <option value="Class 11">Class 11 (School)</option>
                              <option value="Class 12">Class 12 (School)</option>
                              <option value="Diploma">Diploma</option>
                              <option value="Bachelor's">Bachelor's Degree</option>
                              <option value="Master's">Master's Degree</option>
                            </>
                          )}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px] font-mono">▼</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase ml-1">Field of Study *</label>
                      <div className="relative">
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select 
                          value={fieldOfStudy}
                          onChange={(e) => setFieldOfStudy(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-cyan-500 focus:bg-white text-sm font-medium outline-none text-slate-800 appearance-none"
                        >
                          <option value="Computer Science">Computer Science / IT</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Commerce">Commerce / Business</option>
                          <option value="Arts">Humanities & Arts</option>
                          <option value="Science">Natural Sciences</option>
                          <option value="Other">Other Category</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px] font-mono">▼</div>
                      </div>
                    </div>
                  </div>

                  {/* Notice Alert for employer verification */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-start gap-3 mt-2">
                    <UserCheck className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed text-slate-500">
                      <strong className="text-slate-800">Employer & Verification Personalization:</strong>
                      <p className="mt-0.5">We will securely expose this verified learning background to corporate validators or potential employers seeking verified project records upon completions.</p>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Controls inside Wizard */}
          <div className="flex gap-4 border-t border-slate-100 pt-6 mt-8">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3 rounded-2xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-2 cursor-pointer text-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-xs ml-auto group"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4 shadow-sm group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-cyan-650 hover:bg-cyan-700 text-white bg-cyan-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-75"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Finish Setup</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
