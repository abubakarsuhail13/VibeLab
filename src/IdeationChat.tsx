import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, ArrowRight, Loader2, RefreshCw, Sparkles, BrainCircuit, X, Check } from "lucide-react";
import toast from "react-hot-toast";

interface Message {
  id: string;
  sender: "ai" | "user" | "system";
  text: string;
  canRetry?: boolean;
}

interface IdeationChatProps {
  onNavigate: (page: string) => void;
}

const QUESTIONS = [
  { number: 1, code: "US-01", text: "What do you enjoy doing the most?" },
  { number: 2, code: "US-02", text: "What problem or frustration do you face often?" },
  { number: 3, code: "US-03", text: "Who else faces this problem?" },
  { number: 4, code: "US-04", text: "How are people solving it today?" },
  { number: 5, code: "US-05", text: "What do you dislike about the current solution?" },
  { number: 6, code: "US-06", text: "If you could magically fix this problem, what would your solution do?" },
  { number: 7, code: "US-07", text: "Do you think AI could help solve it? How?" },
  { number: 8, code: "US-08", text: "Would a website, app, chatbot, or smart device work best?" },
  { number: 9, code: "US-09", text: "What is the most important feature of your solution?" },
  { number: 10, code: "US-10", text: "If you had only one week, what is the simplest version you could build?" },
  { number: 11, code: "US-11", text: "How would you know your solution is helping people?" },
  { number: 12, code: "US-12", text: "Why are you excited about building this project?" },
  { number: 13, code: "US-13", text: "If this project succeeds, how will someone's life become easier or better?" }
];

export default function IdeationChat({ onNavigate }: IdeationChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  
  // Track current question state index/details
  const [currIndex, setCurrIndex] = useState(0); // index of QUESTIONS, starts at 0 for US-01
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [lastUserPayload, setLastUserPayload] = useState<any>(null); // For retry functionality
  const [completedPercent, setCompletedPercent] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto expand/shrink height logic based on scrollHeight
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      
      const computed = window.getComputedStyle(textarea);
      const lineHeight = parseFloat(computed.lineHeight) || 20;
      const paddingTop = parseFloat(computed.paddingTop) || 12;
      const paddingBottom = parseFloat(computed.paddingBottom) || 12;
      
      const minHeight = 44; // Perfect alignment for single line
      const maxRows = 5;
      const maxHeight = (lineHeight * maxRows) + paddingTop + paddingBottom;

      const currentScrollHeight = textarea.scrollHeight;

      // Bound between single line and maximum 5 rows
      let targetHeight = Math.max(minHeight, currentScrollHeight);
      
      if (targetHeight >= maxHeight) {
        targetHeight = maxHeight;
        textarea.style.overflowY = "auto";
      } else {
        textarea.style.overflowY = "hidden";
      }

      textarea.style.height = `${targetHeight}px`;
    }
  }, [inputValue]);

  // Handle enter key to send message without shift key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, isGeneratingBlueprint]);

  // Initial setup: retrieve session id and load initial questions
  useEffect(() => {
    const sId = sessionStorage.getItem("vibelab_ideation_session_id");
    if (!sId) {
      // Redirect back if no session exists
      onNavigate("ideation");
      return;
    }
    setSessionId(sId);

    // Bootstrap initial message chat sequence
    setMessages([
      {
        id: "init-1",
        sender: "ai",
        text: "Let's discover what is worth building."
      },
      {
        id: "init-2",
        sender: "ai",
        text: QUESTIONS[0].text
      }
    ]);
    setCompletedPercent(Math.round((0 / QUESTIONS.length) * 100));
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || loading || typing || isGeneratingBlueprint) return;

    const trimmedInput = inputValue.trim();
    setInputValue("");

    // Create a student message item
    const studentMessageId = `user-${Date.now()}`;
    const newMessages: Message[] = [
      ...messages,
      { id: studentMessageId, sender: "user", text: trimmedInput }
    ];
    setMessages(newMessages);

    // Begin calling response
    await processResponse(trimmedInput, QUESTIONS[currIndex], newMessages);
  };

  // Dedicated processor method to support retries
  const processResponse = async (userInput: string, question: typeof QUESTIONS[0], currentHistory: Message[]) => {
    setLoading(true);
    setTyping(true);

    const payload = {
      session_id: Number(sessionId),
      story_number: question.number,
      story_code: question.code,
      question_text: question.text,
      user_response: userInput
    };

    setLastUserPayload({ userInput, question, currentHistory });

    try {
      const token = localStorage.getItem("vibelab_token");
      const res = await fetch("/api/ideation/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("HTTP error: " + res.status);
      }

      const data = await res.json();
      setTyping(false);

      // Add AI Response message
      const aiResponseMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: data.ai_message || "I see. Let's move ahead."
      };

      const updatedHistory = [...currentHistory, aiResponseMsg];

      if (data.is_complete) {
        setCompletedPercent(100);
        // Complete state triggers blueprint pipeline
        setMessages([
          ...updatedHistory,
          {
            id: `build-blueprint-${Date.now()}`,
            sender: "ai",
            text: "Amazing. Now let me build your blueprint..."
          }
        ]);
        await triggerGenerateBlueprint();
      } else {
        // Next Question determination
        const nextNum = data.next_story_number;
        const nextQ = data.next_question;

        // Find matches in standard structure
        let nextIdx = currIndex;
        if (nextNum && nextNum !== question.number) {
          nextIdx = QUESTIONS.findIndex(q => q.number === nextNum);
        }

        if (nextIdx !== -1) {
          setCurrIndex(nextIdx);
          setCompletedPercent(Math.round(((nextIdx) / QUESTIONS.length) * 100));
          setMessages(updatedHistory);
        } else {
          setMessages(updatedHistory);
        }
      }
    } catch (err) {
      console.error("Respondent submission error:", err);
      setTyping(false);
      
      // Connection Handoff Dialog
      setMessages([
        ...currentHistory,
        {
          id: `error-${Date.now()}`,
          sender: "system",
          text: "Connection hiccup — tap to retry",
          canRetry: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!lastUserPayload) return;
    
    // Clear last error message
    const filtered = messages.filter(m => m.id !== messages[messages.length - 1].id);
    setMessages(filtered);

    const { userInput, question, currentHistory } = lastUserPayload;
    await processResponse(userInput, question, filtered);
  };

  const triggerGenerateBlueprint = async () => {
    setIsGeneratingBlueprint(true);
    // Mimic the delightful 2-3 seconds build animation feeling
    await new Promise(resolve => setTimeout(resolve, 2500));

    try {
      const token = localStorage.getItem("vibelab_token");
      const res = await fetch("/api/ideation/generate-blueprint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ session_id: Number(sessionId) })
      });

      if (!res.ok) {
        throw new Error("Failed to generate blueprint");
      }

      const data = await res.json();
      
      // Navigate to /dashboard
      onNavigate("dashboard");

      // Immediately show a custom gorgeous toast notification
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? "animate-enter opacity-100 translate-y-0" : "animate-leave opacity-0 -translate-y-4"
          } max-w-md w-full bg-[#0a1126] border border-white/10 shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5 font-sans text-left relative overflow-hidden transition-all duration-300`}
          style={{ borderLeft: "4px solid #C9A84C" }}
        >
          <div className="flex items-start gap-4">
            {/* Green success indicator */}
            <div className="flex-shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2 rounded-xl">
              <Check className="w-5 h-5" />
            </div>
            
            {/* Content block */}
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-bold text-white tracking-wide font-dmsans">
                Ideation Complete 🎉
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal font-dmsans">
                Your blueprint is ready. You can review it anytime from the Ideation section. Phase 2 is now unlocked &mdash; you're ready to start building.
              </p>
              
              {/* Action Button */}
              <div className="pt-1 flex justify-start">
                <button
                  type="button"
                  onClick={() => {
                    toast.dismiss(t.id);
                    onNavigate("ideation-blueprint");
                  }}
                  className="px-3 py-1.5 bg-[#C9A84C] hover:bg-[#D9B95C] text-black font-bold text-xs rounded-xl transition-all tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  View Blueprint →
                </button>
              </div>
            </div>
            
            {/* Close Button */}
            <button 
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ), {
        duration: 8000,
        position: "top-center"
      });
    } catch (err) {
      console.error("Blueprint compilation failure:", err);
      setIsGeneratingBlueprint(false);
      setMessages(prev => [
        ...prev,
        {
          id: `blueprint-fail-${Date.now()}`,
          sender: "system",
          text: "Let me try building the blueprint again."
        }
      ]);
    }
  };

  const currentStoryCode = QUESTIONS[currIndex]?.code || "US-01";
  const currentStoryNum = QUESTIONS[currIndex]?.number || 1;

  return (
    <div className="min-h-screen bg-[#02050e] text-[#E2E8F0] flex flex-col justify-between relative overflow-hidden font-dmsans selection:bg-[#C9A84C]/20 selection:text-[#C9A84C]">
      {/* Absolute dark cyber meshes */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-gradient-to-bl from-[#C9A84C]/5 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-gradient-to-tr from-[#C9A84C]/5 to-transparent blur-[140px] pointer-events-none" />

      {/* TOP FIXED NAV BAR */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-[#02050e]/80 border-b border-white/5 backdrop-blur-xl z-30 px-6 sm:px-12 flex flex-col justify-center">
        <div className="flex justify-between items-center w-full max-w-5xl mx-auto">
          {/* Logo element */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#C9A84C] to-[#E6C66B] rounded-xl flex items-center justify-center shadow-lg shadow-[#C9A84C]/10">
              <BrainCircuit className="text-black w-5.5 h-5.5" />
            </div>
            <span className="font-bebas text-2xl tracking-widest text-white">VibeLab</span>
          </div>

          {/* Question metrics label */}
          <div className="text-right flex flex-col justify-end">
            <span className="font-jetbrains text-xs font-bold text-[#C9A84C] tracking-wide uppercase">
              {currentStoryCode} · {currentStoryNum} of 13
            </span>
            <span className="text-[10px] text-slate-500 font-medium font-mono uppercase tracking-widest mt-0.5">
              Discovery Engine
            </span>
          </div>
        </div>

        {/* Global progress indicator line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-[#C9A84C] to-[#F2D072]"
            initial={{ width: "0%" }}
            animate={{ width: `${completedPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </header>

      {/* SCROLLABLE BULK CHAT CANVAS */}
      <div
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto pt-28 pb-32 px-4 sm:px-8 w-full max-w-4xl mx-auto custom-scrollbar flex flex-col"
      >
        <div className="flex-grow" />
        
        <div className="space-y-6 w-full">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`flex w-full ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "system" && msg.canRetry ? (
                  // Custom retry system bubble style
                  <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-4 flex flex-col items-center gap-3 w-full max-w-md text-center">
                    <p className="font-jetbrains text-sm text-red-400 font-medium">⚠️ {msg.text}</p>
                    <button
                      onClick={handleRetry}
                      className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#D9B95C] text-black text-xs font-bold font-jetbrains px-4 py-2 rounded-xl transition-all active:scale-[0.97]"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                      <span>TAP TO RETRY</span>
                    </button>
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] sm:max-w-xl rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-white font-dmsans self-end ml-12"
                        : "bg-[#091126] border border-white/5 text-slate-300 font-dmsans mr-12"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Micro AI Typing Bubbles */}
            {typing && (
              <motion.div
                key="typing-indicator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start w-full"
              >
                <div className="bg-[#091126] border border-white/5 rounded-2xl px-6 py-4 mr-12 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}

            {/* Blueprint Generating Screen State */}
            {isGeneratingBlueprint && (
              <motion.div
                key="blueprint-generation"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-10 rounded-[2.5rem] border border-[#C9A84C]/30 bg-[#C9A84C]/5 flex flex-col items-center gap-6 text-center w-full shadow-2xl space-y-2"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-t-[#C9A84C] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-[#C9A84C] animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bebas text-3xl text-white tracking-widest uppercase">Building Blueprint</h3>
                  <p className="font-dmsans text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                    Analyzing answers and scaling custom MVP framework architecture logs. Handing off to local compiler tracks...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT ANCHOR FIELD BOTTOM */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#02050e] via-[#02050e]/95 to-transparent pt-6 pb-8 px-4 z-20">
        <form
          onSubmit={handleSend}
          className="max-w-3xl mx-auto flex gap-3 bg-[#0a1126]/90 border border-white/5 rounded-2xl p-2 shadow-2xl backdrop-blur-md items-end"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || typing || isGeneratingBlueprint}
            placeholder={
              isGeneratingBlueprint ? "Assembling framework config..." : "Type your answer..."
            }
            className="flex-grow bg-transparent text-sm text-white px-4 py-3 placeholder-slate-500 focus:outline-none disabled:opacity-50 resize-none min-h-[44px] h-[44px] custom-scrollbar overflow-y-hidden leading-relaxed"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || loading || typing || isGeneratingBlueprint}
            className="bg-[#C9A84C] hover:bg-[#D9B95C] text-black h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-[0.93] disabled:opacity-40 disabled:hover:bg-[#C9A84C] flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </footer>
    </div>
  );
}
