"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Search, Globe, ChevronRight, ArrowRight, Loader2, Sparkles, Plus, CheckCircle2, BookOpen, CornerDownRight, MessageSquare, PlusCircle, Trash2, Menu, Settings as SettingsIcon, X, ChevronLeft, Bot, Zap, ChevronDown, ChevronUp, Image as ImageIcon, XCircle, Check, Copy, ThumbsUp, ThumbsDown, Info, Lock, Flag, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { ShootingStars } from "@/components/shooting-stars";

import { ReportModal } from "@/components/report-modal";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thoughts?: string;
  thoughtSteps?: string[];
  sources?: any[];
  relatedQuestions?: string[];
  media?: {
    images: { title: string; link: string; src: string; thumbnail: string; height: number; width: number; }[];
    videos: { title: string; link: string; thumbnail: string; videoId: string; }[];
  };
  type?: 'search' | 'academic';
  error?: string;
}

interface Thread {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface Settings {
  provider: string;
  theme: 'dark' | 'light' | 'blue';
}

const CustomCode = ({ node, inline, className, children, ...props }: any) => {
  if (inline) {
    return (
      <span className="font-mono text-sm font-semibold text-zinc-200 bg-zinc-800/50 px-1 rounded not-prose">
        {children}
      </span>
    );
  }
  return (
    <div className="w-full overflow-x-auto my-4 rounded-lg bg-[#1e1e1e] border border-white/10">
      <code className={`${className} block p-4 min-w-full`} {...props}>
        {children}
      </code>
    </div>
  );
};

export default function ChatInterface({ user }: { user?: any }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    provider: 'native',
    theme: 'dark',
  });
  const [searchMode, setSearchMode] = useState<'search' | 'academic'>('search');

  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  const [creationStep, setCreationStep] = useState<number>(0);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<number, boolean>>({});
  const [showWorkingState, setShowWorkingState] = useState(false);

  const [selectedImages, setSelectedImages] = useState<{ base64: string, mimeType: string, preview: string }[]>([]);
  const [academicSubMode, setAcademicSubMode] = useState<'computer' | 'accounts' | 'physics'>('accounts');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSourceSidebar, setShowSourceSidebar] = useState(false);
  const [sidebarSources, setSidebarSources] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, 'like' | 'dislike' | null>>({});

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({ content: "", userPrompt: "" });
  const [isSummarizingId, setIsSummarizingId] = useState<number | null>(null);

  const handleReport = (content: string, userPrompt: string) => {
    setReportData({ content, userPrompt });
    setShowReportModal(true);
  };

  const handleReportWithSummary = async (content: string, userPrompt: string, idx: number) => {
    setIsSummarizingId(idx);
    try {
      const res = await fetch('/api/summarize-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, userPrompt })
      });
      const data = await res.json();
      if (data.contentSummary) {
        setReportData({ content: data.contentSummary, userPrompt: data.promptSummary || userPrompt });
      } else {
        setReportData({ content, userPrompt }); // Fallback
      }
    } catch (e) {
      console.error("Summarization failed", e);
      console.error("Summarization failed", e);
      setReportData({ content, userPrompt });
    } finally {
      setIsSummarizingId(null);
      setShowReportModal(true);
    }
  };

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (idx: number, type: 'like' | 'dislike') => {
    setFeedback(prev => ({
      ...prev,
      [idx]: prev[idx] === type ? null : type
    }));
  };

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const themes = {
    dark: {
      appBg: 'bg-[#131314]',
      sidebarBg: 'bg-[#1e1f20]',
      sidebarBorder: 'border-[#2d2e30]',
      text: 'text-zinc-200',
      textMuted: 'text-zinc-500',
      elementBg: 'bg-[#1e1f20]',
      elementBorder: 'border-[#2d2e30]',
      elementHover: 'hover:bg-[#2d2e30]',
      inputBg: 'bg-[#1e1f20]',
      accent: 'text-blue-500',
    },
    light: {
      appBg: 'bg-[#F8F9FA]',
      sidebarBg: 'bg-white/80 backdrop-blur-xl',
      sidebarBorder: 'border-zinc-200',
      text: 'text-[#1F2937]',
      textMuted: 'text-[#6B7280]',
      elementBg: 'bg-white/60 backdrop-blur-md',
      elementBorder: 'border-zinc-200',
      elementHover: 'hover:bg-zinc-100',
      inputBg: 'bg-white',
      accent: 'text-blue-600',
    },
    blue: {
      appBg: 'bg-[#0B1120]',
      sidebarBg: 'bg-[#0F172A]/80 backdrop-blur-xl',
      sidebarBorder: 'border-blue-900/30',
      text: 'text-blue-50',
      textMuted: 'text-blue-300/70',
      elementBg: 'bg-[#1E293B]/60 backdrop-blur-md',
      elementBorder: 'border-blue-500/20',
      elementHover: 'hover:bg-blue-800/30',
      inputBg: 'bg-[#1E293B]/80',
      accent: 'text-cyan-400',
    }
  };

  const currentTheme = themes[settings.theme as keyof typeof themes] || themes.dark;

  const SourceSidebar = () => {
    if (!showSourceSidebar) return null;
    return (
      <>
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowSourceSidebar(false)} />
        <div className={`fixed inset-y-0 right-0 z-[70] w-full md:w-[450px] ${currentTheme.sidebarBg} border-l ${currentTheme.sidebarBorder} shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col`}>
          <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/5">
            <h2 className={`font-semibold text-lg ${currentTheme.text} flex items-center gap-2`}><BookOpen size={18} className="text-blue-400" />{sidebarSources.length} Sources</h2>
            <button onClick={() => setShowSourceSidebar(false)} className={`p-2 rounded-full ${currentTheme.elementHover} ${currentTheme.textMuted} hover:${currentTheme.text} transition-colors`}><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sidebarSources.map((source, idx) => {
              if (!source.web) return null;
              let domain = "", cleanDomain = "";
              try {
                const urlObj = new URL(source.web.uri);
                cleanDomain = urlObj.hostname;
                domain = cleanDomain.replace('www.', '');
                if (domain.includes('vertexaisearch') || domain.includes('googleusercontent')) {
                  if (source.web.title && source.web.title.includes('.') && !source.web.title.includes(' ')) { domain = source.web.title; cleanDomain = source.web.title; }
                  else { domain = "Source"; cleanDomain = "google.com"; }
                }
              } catch (e) { domain = "link"; cleanDomain = "google.com"; }
              return (
                <a key={idx} href={source.web.uri} target="_blank" rel="noreferrer" className={`block p-4 rounded-xl ${currentTheme.elementBg} border ${currentTheme.elementBorder} hover:border-blue-500/30 hover:bg-white/5 transition-all group`}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-white/10 p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img src={`https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                      <p className={`text-xs font-semibold ${currentTheme.textMuted} uppercase tracking-wide`}>{domain}</p>
                    </div>
                    <h3 className={`text-sm font-bold ${currentTheme.text} leading-snug group-hover:text-blue-400 transition-colors`}>{source.web.title}</h3>
                    {source.web.snippet && <p className={`text-xs ${currentTheme.textMuted} line-clamp-3 leading-relaxed`}>{source.web.snippet}</p>}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  useEffect(() => {
    const saved = localStorage.getItem('chiru_threads');
    if (saved) { try { setThreads(JSON.parse(saved).sort((a: Thread, b: Thread) => b.updatedAt - a.updatedAt)); } catch (e) { console.error(e); } }
    const savedSettings = localStorage.getItem('chiru_settings');
    if (savedSettings) { try { setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) })); } catch (e) { console.error(e); } }
    if (typeof window !== 'undefined' && window.innerWidth < 768) setIsSidebarOpen(false);
  }, []);

  useEffect(() => { if (threads.length > 0) localStorage.setItem('chiru_threads', JSON.stringify(threads)); }, [threads]);

  const saveSettings = (newSettings: Settings) => {
    const normalized = { ...newSettings, provider: newSettings.provider.toLowerCase().trim() };
    setSettings(normalized);
    localStorage.setItem('chiru_settings', JSON.stringify(normalized));
    setShowSettings(false);
  };

  const SettingsDialog = () => {
    if (!showSettings) return null;
    const [local, setLocal] = useState<Settings>(settings);
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
        <div className={`w-[90%] max-w-md ${currentTheme.appBg} border ${currentTheme.elementBorder} rounded-xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200`}>
          <button onClick={() => setShowSettings(false)} className={`absolute top-4 right-4 ${currentTheme.textMuted} hover:${currentTheme.text}`}><X size={20} /></button>
          <h2 className={`text-xl font-semibold ${currentTheme.text} mb-6 flex items-center gap-2`}><SettingsIcon size={20} className={currentTheme.accent} />Settings</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className={`text-sm font-medium ${currentTheme.textMuted}`}>Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {(['dark', 'light', 'blue'] as const).map((t) => (
                  <button key={t} onClick={() => setLocal(p => ({ ...p, theme: t }))} className={`px-3 py-2 rounded-lg text-sm font-medium capitalize border transition-all ${local.theme === t ? `${currentTheme.accent} ${currentTheme.elementBorder} bg-black/5` : `${currentTheme.textMuted} border-transparent hover:${currentTheme.elementHover}`}`}>{t}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4"><button onClick={() => saveSettings(local)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors">Save Configuration</button></div>
        </div>
      </div>
    );
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { if (loading && creationStep === 0) scrollToBottom(); }, [loading, creationStep]);

  const clearAllTimeouts = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const stopGeneration = (e?: React.MouseEvent) => { e?.preventDefault(); e?.stopPropagation(); clearAllTimeouts(); if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; } setLoading(false); };
  const handleNewThread = () => { stopGeneration(); setMessages([]); setQuery(""); setCreationStep(0); setCurrentThreadId(null); };
  const loadThread = (thread: Thread) => { stopGeneration(); setCurrentThreadId(thread.id); setMessages(thread.messages); setQuery(""); };
  const deleteThread = (e: React.MouseEvent, id: string) => { e.stopPropagation(); const newThreads = threads.filter(t => t.id !== id); setThreads(newThreads); localStorage.setItem('chiru_threads', JSON.stringify(newThreads)); if (currentThreadId === id) handleNewThread(); };

  const saveCurrentThread = (msgs: Message[], userQuery: string) => {
    const now = Date.now();
    let threadId = currentThreadId;
    let newThreads = [...threads];
    if (!threadId) {
      threadId = crypto.randomUUID();
      setCurrentThreadId(threadId);
      newThreads = [{ id: threadId, title: userQuery.slice(0, 40) + (userQuery.length > 40 ? "..." : ""), messages: msgs, updatedAt: now }, ...threads];
    } else {
      const idx = newThreads.findIndex(t => t.id === threadId);
      if (idx !== -1) { newThreads[idx] = { ...newThreads[idx], messages: msgs, updatedAt: now }; const t = newThreads.splice(idx, 1)[0]; newThreads.unshift(t); }
    }
    setThreads(newThreads);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedImages.length >= 2) { alert("Maximum 2 images allowed."); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImages(prev => [...prev, { base64: (event.target?.result as string).split(',')[1], mimeType: file.type, preview: event.target?.result as string }]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const removeImage = (index: number) => setSelectedImages(prev => prev.filter((_, i) => i !== index));

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() && selectedImages.length === 0) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    clearAllTimeouts();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setShowWorkingState(false);
    setQuery("");
    setLoading(true);
    setCreationStep(0);
    setSearchQueries([`${searchQuery}`, `${searchQuery} key details`, `${searchQuery} analysis`]);

    const userMsg: Message = { role: 'user', content: searchQuery };
    const initialAssistantMsg: Message = { role: 'assistant', content: '', thoughts: searchMode === 'search' ? 'Answering...' : 'Thinking...', thoughtSteps: searchMode === 'search' ? ['Answering...'] : ['Thinking...'], type: searchMode };
    const newHistory = [...messages, userMsg];
    setMessages([...newHistory, initialAssistantMsg]);
    saveCurrentThread([...newHistory, initialAssistantMsg], searchQuery);

    const assistantMsgIndex = newHistory.length;
    setCreationStep(3);
    timeoutsRef.current.push(setTimeout(() => setExpandedThoughts(prev => ({ ...prev, [assistantMsgIndex]: true })), 4000));

    // Minimal history payload
    const historyPayload = newHistory.slice(0, -1).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));

    try {
      let endpoint = searchMode === 'academic' ? (academicSubMode === 'computer' ? "/api/computer" : (academicSubMode === 'physics' ? "/api/physics" : "/api/academic")) : "/api/search";
      const payload: any = { query: searchQuery, history: historyPayload };
      if (searchMode === 'academic') {
        payload.mode = academicSubMode === 'computer' ? 'isc_computer' : (academicSubMode === 'physics' ? 'isc_physics' : 'isc_accounts');
        if (selectedImages.length > 0) payload.images = selectedImages.map(img => ({ base64: img.base64, mimeType: img.mimeType }));
        setSelectedImages([]);
      }

      const res = await fetch(endpoint, { method: "POST", body: JSON.stringify(payload), signal: controller.signal });

      if (res.status === 429) throw new Error("Resource exhausted. You have hit the rate limit. Please wait a moment and try again.");
      if (res.status >= 500) throw new Error("Server error. Our systems are experiencing issues. Please try again later.");
      if (!res.ok) throw new Error(res.statusText || "An error occurred while fetching the response.");
      if (!res.body) throw new Error("No body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamedText = "";
      let finalSources: any[] = [];
      let finalMedia = { images: [], videos: [] };
      let buffer = "";
      let isStatus = false, isJson = false, isMedia = false, isThinking = false;
      let statusBuffer = "", jsonBuffer = "", mediaBuffer = "", thoughtBuffer = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split(/(__STATUS_START__|__STATUS_END__|__JSON_START__|__JSON_END__|__THOUGHT_START__|__THOUGHT_END__|__MEDIA_START__|__MEDIA_END__)/g);

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!done && i === parts.length - 1) { buffer = part; break; } // Keep incomplete chunk

          if (part === '__STATUS_START__' || part === '__THOUGHT_START__') { isStatus = true; statusBuffer = ""; }
          else if (part === '__STATUS_END__' || part === '__THOUGHT_END__') { isStatus = false; }
          else if (part === '__JSON_START__') { isJson = true; jsonBuffer = ""; }
          else if (part === '__JSON_END__') { isJson = false; try { if (jsonBuffer.trim()) { const p = JSON.parse(jsonBuffer.trim()); if (p.sources) finalSources = p.sources; } } catch (e) { } jsonBuffer = ""; }
          else if (part === '__MEDIA_START__') { isMedia = true; mediaBuffer = ""; }
          else if (part === '__MEDIA_END__') { isMedia = false; try { if (mediaBuffer.trim()) finalMedia = JSON.parse(mediaBuffer.trim()); } catch (e) { } mediaBuffer = ""; }
          else {
            if (isStatus) statusBuffer += part;
            else if (isJson) jsonBuffer += part;
            else if (isMedia) mediaBuffer += part;
            else streamedText += part;
          }
        }

        setMessages(prev => {
          const updated = [...prev];
          updated[assistantMsgIndex] = {
            ...updated[assistantMsgIndex],
            content: streamedText,
            sources: finalSources.length > 0 ? finalSources : updated[assistantMsgIndex].sources,
            media: (finalMedia.images.length > 0 || finalMedia.videos.length > 0) ? finalMedia : updated[assistantMsgIndex].media,
            thoughts: statusBuffer && statusBuffer.length > 0 ? statusBuffer : updated[assistantMsgIndex].thoughts
          };
          return updated;
        });
        if (streamedText.length > 0 && creationStep < 4) setCreationStep(4);
      }

      saveCurrentThread([...newHistory, { role: 'assistant', content: streamedText, sources: finalSources, media: finalMedia, type: searchMode }], searchQuery);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          updated[assistantMsgIndex] = { ...updated[assistantMsgIndex], error: err.message || "Error" };
          return updated;
        });
      }
    } finally { if (abortControllerRef.current === controller) setLoading(false); }
  };

  const onSearch = (e: React.FormEvent) => { e.preventDefault(); performSearch(query); };
  const getAnswerParts = (fullText: string) => {
    const parts = fullText.split(/###\s*Related\s*Questions/i);
    return {
      mainAnswer: parts[0],
      relatedQuestions: (parts[1] || "").split("\n").reduce((acc: string[], line) => {
        const trimmed = line.trim();
        if (!trimmed) return acc;
        // Check for bullet points (-, *) or numbered lists (1.)
        if (/^[-*]\s|^\d+\.\s/.test(trimmed)) {
          acc.push(trimmed.replace(/^[-*]\s|^\d+\.\s/, "").replace(/\*\*/g, "").trim());
        } else if (acc.length > 0) {
          // Append to previous question if it's a continuation line
          acc[acc.length - 1] += " " + trimmed.replace(/\*\*/g, "").trim();
        }
        return acc;
      }, [])
    };
  };
  return (
    <div className={`flex h-[100dvh] w-full max-w-[100vw] overflow-x-hidden ${currentTheme.appBg} ${currentTheme.text} selection:bg-blue-500/30 font-sans transition-colors duration-300`}>
      <div className={`fixed inset-0 z-0 ${currentTheme.appBg} ${messages.length > 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} />
      <div className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />

      <SourceSidebar />

      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] md:relative md:z-auto overflow-hidden flex flex-col h-full border-r ${currentTheme.sidebarBorder} ${currentTheme.sidebarBg} transition-[width,transform,opacity] duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 md:w-[260px] md:opacity-100' : '-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden md:border-r-0'}`}>
        <div className="w-[280px] md:w-[260px] p-4 flex flex-col gap-4 h-full">
          <div className="flex items-center justify-between md:hidden pb-4 border-b border-white/5"><span className="font-semibold text-lg ml-2">Menu</span><button onClick={() => setIsSidebarOpen(false)} className={`p-2 text-zinc-400 hover:${currentTheme.text}`}><X size={20} /></button></div>
          <button onClick={() => { handleNewThread(); if (window.innerWidth < 768) setIsSidebarOpen(false); }} className={`flex items-center gap-2 w-full px-4 py-3 ${currentTheme.elementBg} ${currentTheme.elementHover} ${currentTheme.text} rounded-lg border ${currentTheme.elementBorder} transition-colors whitespace-nowrap`}><PlusCircle size={18} /><span className="font-medium">New Thread</span></button>
          <div className="flex-1 overflow-y-auto -mx-2 px-2"><div className={`text-xs font-semibold ${currentTheme.textMuted} mb-4 px-2 uppercase tracking-wider mt-4`}>Recent</div><div className="space-y-1">{threads.length === 0 ? (<div className={`text-sm ${currentTheme.textMuted} px-4 italic whitespace-nowrap`}>No history saved</div>) : (threads.map((thread) => (<div key={thread.id} className="group relative"><button onClick={() => { loadThread(thread); if (window.innerWidth < 768) setIsSidebarOpen(false); }} className={`block w-full text-left px-3 py-3 rounded-md text-sm truncate transition-colors ${currentThreadId === thread.id ? `${currentTheme.elementBg} ${currentTheme.text}` : `${currentTheme.textMuted} ${currentTheme.elementHover}`}`}>{thread.title}</button><button onClick={(e) => deleteThread(e, thread.id)} className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 ${currentTheme.textMuted} hover:text-red-400 transition-opacity`}><Trash2 size={12} /></button></div>)))}</div></div>

          <div className="pt-2 mt-auto border-t border-white/5">
            <Link href="/about" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium ${currentTheme.textMuted} hover:${currentTheme.text} transition-colors group rounded-md hover:bg-white/5`}>
              <Info size={18} className="group-hover:text-blue-400 transition-colors" />
              <span>About Us</span>
            </Link>
            <Link href="/privacy" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium ${currentTheme.textMuted} hover:${currentTheme.text} transition-colors group rounded-md hover:bg-white/5`}>
              <Lock size={18} className="group-hover:text-blue-400 transition-colors" />
              <span>Privacy Policy</span>
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <SettingsDialog />
        <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} reportData={reportData} theme={settings.theme} />
        <header className={`w-full px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b ${currentTheme.sidebarBorder} ${currentTheme.appBg}/50 backdrop-blur-md sticky top-0 z-30`}>
          <div className="flex items-center gap-3 md:gap-4"><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`h-11 w-11 flex items-center justify-center ${currentTheme.textMuted} hover:${currentTheme.text} transition-colors p-0`}><Menu size={24} /></button><h1 className={`md:hidden text-lg font-semibold tracking-tight font-sans ${currentTheme.text} ml-0`}>Neural Scholar Search</h1></div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-1.5 pointer-events-none"><h1 className="text-xl font-semibold tracking-tight font-sans border-b-2 border-current pb-0.5">Neural Scholar Search</h1></div>
          <div className="flex items-center gap-4">


          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pb-32 [&::-webkit-scrollbar]:hidden [overflow-anchor:none]">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            {messages.length === 0 && (<div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in duration-700"><div className="flex flex-col items-center gap-4 w-full"><h1 className={`text-4xl md:text-6xl font-semibold tracking-tight font-sans ${currentTheme.text} text-center`}>Neural Scholar Search</h1></div></div>)}

            {messages.map((msg, idx) => {
              if (msg.role === 'user') {
                return (
                  <div key={idx} className="w-full flex justify-end mb-8 pl-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className={`px-5 py-3 rounded-2xl ${settings.theme === 'light' ? 'bg-[#F0F4F9] text-[#1F1F1F]' : 'bg-[#2f2f2f] text-[#E3E3E3]'} text-base md:text-lg leading-relaxed max-w-full md:max-w-[80%] break-words whitespace-pre-wrap`}>
                      {msg.content}
                    </div>
                  </div>
                );
              } else {
                const { mainAnswer, relatedQuestions } = getAnswerParts(msg.content);
                const processedAnswer = mainAnswer.replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, p1) => `[[${p1}]](#citation-${p1.replace(/\s/g, '')})`);
                const isStreaming = loading && idx === messages.length - 1;

                return (
                  <div key={idx} className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">

                    {(() => {
                      const isThinking = isStreaming && !msg.content;
                      return (
                        <div className="w-full max-w-3xl mb-4">
                          {(msg.content || isThinking) && (
                            <div className="relative pl-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                              <div className="absolute -left-[9px] top-0 w-5 h-5 flex items-center justify-center z-10 bg-[#0a0a0a] rounded-full">{isStreaming ? (<Loader2 className="w-4 h-4 text-red-500 animate-spin" />) : (<div className="w-2 h-2 bg-red-500 rounded-full" />)}</div>
                              <div className="flex flex-col">{isStreaming && showWorkingState ? (<><span className={`text-sm font-medium ${currentTheme.text}`}>Working</span><span className="text-xs text-zinc-500 animate-pulse">Initiating...</span></>) : (<><span className={`text-sm font-medium ${currentTheme.text}`}>Answering</span>{isStreaming && <span className="text-xs text-zinc-500 animate-pulse">{(msg.thoughts?.length || 0) > 60 ? msg.thoughts?.substring(0, 60) + "..." : msg.thoughts || "Answering..."}</span>}</>)}</div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {(msg.content || isStreaming) && (<div className="w-full my-6 border-b border-white/5" />)}



                    {msg.content?.trim() && msg.type !== 'academic' && msg.media && (msg.media.images.length > 0 || msg.media.videos.length > 0) && (
                      <div className="space-y-6 mb-8 animate-in fade-in duration-500">
                        {msg.media.images.length > 0 && (<div className="space-y-2"><div className="flex gap-2 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden snap-x">{msg.media.images.map((img, iIdx) => (<a key={iIdx} href={img.link} target="_blank" rel="noreferrer" className={`flex-shrink-0 aspect-[4/3] w-48 md:w-60 rounded-lg overflow-hidden border ${currentTheme.elementBorder} relative group snap-start`}><img src={img.src || img.thumbnail} alt={img.title} onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" /></a>))}</div></div>)}
                        {msg.media.videos.length > 0 && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{msg.media.videos.map((vid, vIdx) => (<a key={vIdx} href={vid.link} target="_blank" rel="noreferrer" className={`block group relative aspect-video rounded-xl overflow-hidden border ${currentTheme.elementBorder}`}><img src={vid.thumbnail} alt={vid.title} onError={(e) => { if (!e.currentTarget.src.includes('hqdefault')) { e.currentTarget.src = `https://img.youtube.com/vi/${vid.videoId}/hqdefault.jpg`; } else { e.currentTarget.parentElement!.style.display = 'none'; } }} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center"><div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><svg className="w-6 h-6 text-white map-fill" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></div></div><div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent"><p className="text-white text-xs font-medium line-clamp-1">{vid.title}</p></div></a>))}</div>)}
                      </div>
                    )}

                    <div className={`prose max-w-none w-full min-w-0 overflow-hidden break-words ${settings.theme === 'light' ? 'prose-stone' : 'prose-invert'} prose-p:${currentTheme.text} prose-headings:${currentTheme.text} prose-blockquote:border-l-4 prose-blockquote:border-blue-500`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{
                        a: ({ node, href, children, ...props }) => {
                          if (href?.startsWith('#citation-')) { return <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-xs font-bold text-zinc-600 bg-black/5 rounded-full mx-0.5 select-none hover:bg-blue-500 hover:text-white transition-colors cursor-pointer align-middle">{children}</span>; }


                          if (!href || href.includes('v_v_v_v') || href === 'https://www.youtube.com/watch?v=' || href.endsWith('www') || href.endsWith('www.') || href === 'https://') {
                            return <span className="text-zinc-500 italic decoration-dotted underline cursor-not-allowed" title="Link unavailable">{children}</span>;
                          }

                          if (href?.includes('youtube.com') || href?.includes('youtu.be')) {
                            return (
                              <a href={href} {...props} className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors no-underline font-medium text-sm border border-red-500/20" target="_blank" rel="noopener noreferrer">
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                                {children}
                              </a>
                            );
                          }

                          return <a href={href} {...props} className="text-blue-400 hover:text-blue-300 break-words" target="_blank" rel="noopener noreferrer">{children}</a>;
                        },
                        code: CustomCode,
                        table: ({ children }) => (<div className={`my-6 w-full overflow-hidden rounded-xl border ${currentTheme.elementBorder} ${currentTheme.elementBg} shadow-sm`}><div className="overflow-x-auto"><table className="w-full text-left text-sm border-collapse min-w-full">{children}</table></div></div>),
                        thead: ({ children }) => <thead className={`${currentTheme.elementBg} ${currentTheme.text} uppercase tracking-wider text-xs font-medium`}>{children}</thead>,
                        tbody: ({ children }) => <tbody className={`divide-y ${currentTheme.elementBorder}`}>{children}</tbody>,
                        tr: ({ children }) => <tr className={`transition-colors ${currentTheme.elementHover} group`}>{children}</tr>,
                        th: ({ children }) => <th className={`px-6 py-4 font-semibold border-b ${currentTheme.elementBorder} whitespace-nowrap`}>{children}</th>,
                        td: ({ children }) => <td className={`px-6 py-4 align-top border-b ${currentTheme.elementBorder} leading-relaxed ${currentTheme.text}`}>{children}</td>,
                      }}>{processedAnswer}</ReactMarkdown>
                    </div>


                    {!isStreaming && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-8 animate-in fade-in duration-500">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sources</span>
                          <div className="h-px bg-black/10 flex-grow max-w-[200px]" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          {msg.sources.slice(0, 3).map((s: any, i: number) => {
                            let domain = "", displayUrl = "";
                            try {
                              const u = new URL(s.web?.uri || "");
                              domain = u.hostname.replace('www.', '');
                              displayUrl = u.hostname + u.pathname;

                              // FIX: Handle Vertex/Google internal URLs
                              if (domain.includes('vertexaisearch') || domain.includes('googleusercontent')) {
                                if (s.web?.title && s.web.title.includes('.') && !s.web.title.includes(' ')) {
                                  domain = s.web.title;
                                  displayUrl = s.web.title;
                                } else {
                                  domain = "google.com";
                                  displayUrl = "Source";
                                }
                              }
                            } catch (e) { domain = "google.com"; displayUrl = "Source"; }

                            return (
                              <button key={i} onClick={() => { setSidebarSources(msg.sources || []); setShowSourceSidebar(true); }} className="flex items-start gap-3 p-3 rounded-xl border border-black/5 bg-black/5 hover:bg-black/10 hover:border-black/10 transition-all text-left group min-w-0">
                                <div className="w-5 h-5 rounded-full bg-black/5 border border-black/5 p-0.5 flex-shrink-0 mt-0.5 overflow-hidden"><img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="favicon" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /></div>
                                <div className="flex flex-col min-w-0 overflow-hidden"><span className={`text-sm font-medium truncate w-full ${currentTheme.text} group-hover:text-blue-600 transition-colors`}>{s.web?.title || domain}</span><span className="text-[11px] text-zinc-500 truncate w-full font-mono opacity-70">{displayUrl}</span></div>
                              </button>
                            );
                          })}
                          {msg.sources.length > 3 && (
                            <button onClick={() => { setSidebarSources(msg.sources || []); setShowSourceSidebar(true); }} className="flex items-center justify-center p-3 rounded-xl border border-black/5 bg-black/5 hover:bg-black/10 hover:border-black/10 transition-all text-sm font-medium text-zinc-500 hover:text-zinc-900">
                              + {msg.sources.length - 3} more
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {(msg.content && msg.content.trim().length > 0) && (
                      <div className="flex items-center gap-2 mt-4 animate-in fade-in duration-500 delay-100">
                        <button onClick={() => handleCopy(getAnswerParts(msg.content).mainAnswer, idx)} className={`p-2 rounded-lg ${currentTheme.elementHover} ${currentTheme.textMuted} hover:${currentTheme.text} transition-colors relative group`} title="Copy Answer">{copiedId === idx ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}</button>
                        <div className={`h-4 w-[1px] ${currentTheme.sidebarBorder} mx-1`} />
                        <button onClick={() => handleFeedback(idx, 'like')} className={`p-2 rounded-lg ${currentTheme.elementHover} ${feedback[idx] === 'like' ? 'text-green-500 bg-green-500/10' : currentTheme.textMuted} hover:${currentTheme.text} transition-colors`}><ThumbsUp size={18} fill={feedback[idx] === 'like' ? "currentColor" : "none"} /></button>
                        <button onClick={() => handleFeedback(idx, 'dislike')} className={`p-2 rounded-lg ${currentTheme.elementHover} ${feedback[idx] === 'dislike' ? 'text-red-500 bg-red-500/10' : currentTheme.textMuted} hover:${currentTheme.text} transition-colors`}><ThumbsDown size={18} fill={feedback[idx] === 'dislike' ? "currentColor" : "none"} /></button>
                        <div className={`h-4 w-[1px] ${currentTheme.sidebarBorder} mx-1`} />
                        <button onClick={() => handleReport(getAnswerParts(msg.content).mainAnswer, messages[idx - 1]?.content || "Unknown prompt")} className={`p-2 rounded-lg ${currentTheme.elementHover} ${currentTheme.textMuted} hover:text-amber-500 transition-colors`} title="Report Issue"><Flag size={18} /></button>
                        <button
                          onClick={() => handleReportWithSummary(getAnswerParts(msg.content).mainAnswer, messages[idx - 1]?.content || "Unknown prompt", idx)}
                          disabled={isSummarizingId === idx}
                          className={`ml-2 text-xs font-bold text-red-500 hover:text-red-600 underline decoration-dotted transition-colors flex items-center gap-1 opacity-100`}
                        >
                          {isSummarizingId === idx ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          {isSummarizingId === idx ? "Summarizing..." : "Report with AI Summary"}
                        </button>
                      </div>
                    )}
                    {(relatedQuestions.length > 0) && (<div className={`mt-8 border-t ${currentTheme.elementBorder} pt-8`}><h3 className={`text-lg font-bold ${currentTheme.text} mb-4 px-2`}>Related</h3><div className="flex flex-col gap-2">{relatedQuestions.slice(0, 5).map((q, i) => (<button key={i} onClick={() => performSearch(q)} className={`flex items-center gap-3 p-3 rounded-xl border ${currentTheme.elementBorder} ${currentTheme.elementBg}/50 hover:${currentTheme.elementBg} hover:border-blue-500/30 transition-all text-left group`}><CornerDownRight className={`w-4 h-4 ${currentTheme.textMuted} group-hover:text-blue-400 transition-colors flex-shrink-0`} /><span className="text-sm font-medium">{q}</span></button>))}</div></div>)}
                    {msg.error && (<div className={`mt-4 p-4 rounded-xl border border-red-500/50 bg-red-500/10 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300`}><div className="p-1.5 bg-red-500/20 rounded-full flex-shrink-0"><XCircle className="w-5 h-5 text-red-500" /></div><div className="flex-1"><h4 className="text-red-400 font-semibold text-sm mb-1">Issue Encountered</h4><p className={`text-sm ${currentTheme.text} opacity-90`}>{msg.error}</p></div></div>)}
                  </div>
                );
              }
            })}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        <div className={`p-6 ${currentTheme.appBg}/80 backdrop-blur-xl border-t ${currentTheme.sidebarBorder} sticky bottom-0 z-20`}>
          <form onSubmit={onSearch} className="max-w-4xl mx-auto relative group flex items-center gap-3">
            <div className={`relative z-10 flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3 ${currentTheme.elementBg}/50 border border-white/20 focus-within:border-white/50 rounded-2xl md:rounded-full px-2 py-2 shadow-2xl transition-all`}>
              <input className={`flex-1 bg-transparent border-none outline-none ${currentTheme.text} placeholder:text-zinc-500 px-4 py-1 text-base min-h-[44px] md:min-h-0 focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed`} placeholder={!user ? "Please login..." : (loading ? "Answering..." : "Ask anything...")} value={query} onChange={(e) => setQuery(e.target.value)} disabled={loading || !user} />
              <div className="flex w-full items-center justify-between gap-2 md:w-auto md:justify-start md:contents">
                <div className="relative md:pl-2 md:border-l md:border-white/10 md:ml-2 order-1 md:order-2">
                  <button type="button" onClick={() => setShowModeSelector(!showModeSelector)} className={`h-11 px-2 text-[10px] md:text-xs font-mono font-bold tracking-wider hover:${currentTheme.text} transition-colors uppercase flex items-center gap-1.5 ${showModeSelector ? currentTheme.text : 'text-zinc-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${searchMode === 'search' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                    <span className="hidden sm:inline">{searchMode === 'search' ? 'INTERNET' : 'ACADEMIC'}</span>
                    <span className="sm:hidden">{searchMode === 'search' ? 'WEB' : 'ACA'}</span>
                    <ChevronUp size={12} className={`transform transition-transform ${showModeSelector ? 'rotate-180' : ''}`} />
                  </button>
                  {showModeSelector && (
                    <div className="absolute bottom-full left-0 md:left-auto md:right-0 mb-2 w-48 bg-[#1E1F20] border border-zinc-800 rounded-xl shadow-2xl p-2 flex flex-col gap-1 animate-in fade-in z-50">
                      <button type="button" onClick={() => { setSearchMode('search'); setShowModeSelector(false); }} className={`text-xs font-mono font-bold px-3 py-2 rounded-lg text-left uppercase transition-colors flex items-center gap-2 ${searchMode === 'search' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}><div className="w-2 h-2 rounded-full bg-blue-500" />INTERNET</button>
                      <button type="button" onClick={() => setSearchMode('academic')} className={`text-xs font-mono font-bold px-3 py-2 rounded-lg text-left uppercase transition-colors flex items-center gap-2 ${searchMode === 'academic' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}><div className="w-2 h-2 rounded-full bg-purple-500" />ACADEMIC</button>
                      {searchMode === 'academic' && (<div className="flex flex-col gap-1 pl-4 mt-1 border-l border-zinc-700 ml-2"><button onClick={(e) => { e.stopPropagation(); setAcademicSubMode('accounts'); setShowModeSelector(false); }} className={`text-[10px] font-mono font-medium px-2 py-1.5 rounded text-left uppercase ${academicSubMode === 'accounts' ? 'text-white' : 'text-zinc-500'}`}>ACCOUNTS</button><button onClick={(e) => { e.stopPropagation(); setAcademicSubMode('computer'); setShowModeSelector(false); }} className={`text-[10px] font-mono font-medium px-2 py-1.5 rounded text-left uppercase ${academicSubMode === 'computer' ? 'text-white' : 'text-zinc-500'}`}>COMPUTER</button><button onClick={(e) => { e.stopPropagation(); setAcademicSubMode('physics'); setShowModeSelector(false); }} className={`text-[10px] font-mono font-medium px-2 py-1.5 rounded text-left uppercase ${academicSubMode === 'physics' ? 'text-white' : 'text-zinc-500'}`}>PHYSICS</button></div>)}
                    </div>
                  )}
                </div>
                <div className="order-2 md:order-1 flex items-center gap-1">
                  {loading ? (<button type="button" onClick={stopGeneration} className={`h-11 w-11 flex items-center justify-center ${currentTheme.elementHover} rounded-full transition-colors`}><div className={`w-3 h-3 ${currentTheme.textMuted} rounded-[1px]`} /></button>) : (<>{searchMode === 'academic' && (<button type="button" onClick={() => fileInputRef.current?.click()} className={`h-11 w-11 flex items-center justify-center ${currentTheme.elementHover} rounded-full transition-colors ${selectedImages.length > 0 ? 'text-blue-500' : currentTheme.textMuted} hover:text-blue-400`} disabled={selectedImages.length >= 2}><ImageIcon size={20} /></button>)}<button type="submit" disabled={!query.trim() && selectedImages.length === 0} className={`h-11 w-11 flex items-center justify-center ${currentTheme.elementHover} rounded-full disabled:opacity-50 transition-colors`}><ArrowRight size={20} className={currentTheme.textMuted} /></button></>)}
                </div>
              </div>
            </div>
            {selectedImages.length > 0 && (
              <div className="absolute -top-24 left-0 p-2 animate-in fade-in slide-in-from-bottom-2 flex gap-2">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative inline-block">
                    <img src={img.preview} alt={`Selected ${idx}`} className={`h-20 w-auto rounded-lg border ${currentTheme.elementBorder} shadow-lg`} />
                    <button type="button" onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"><XCircle size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </form>
          <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
          <div className="flex justify-center mt-2">
            <button onClick={() => { setReportData({ content: "General Report", userPrompt: "N/A" }); setShowReportModal(true); }} className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-red-500 hover:text-red-600 transition-colors opacity-100`}>
              <AlertTriangle size={12} />
              <span>Report Issue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
