"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, Send, Loader2, MessageSquare, Quote, FileText, Mail } from "lucide-react";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportData: {
        content: string;
        userPrompt: string;
    };
    theme?: 'dark' | 'light' | 'blue';
}

const ISSUE_CATEGORIES = [
    "Offensive / Hate Speech",
    "False / Misleading Information",
    "Adult Content",
    "Violence / Harmful",
    "Privacy Violation",
    "Other"
];

export function ReportModal({ isOpen, onClose, reportData, theme = 'dark' }: ReportModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [category, setCategory] = useState(ISSUE_CATEGORIES[0]);
    const [content, setContent] = useState(reportData.content);
    const [userPrompt, setUserPrompt] = useState(reportData.userPrompt);
    const [comments, setComments] = useState("");
    const [email, setEmail] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setContent(reportData.content);
            setUserPrompt(reportData.userPrompt);
            setCategory(ISSUE_CATEGORIES[0]);
            setComments("");
            setEmail("");
            setSuccess(false);
        }
    }, [isOpen, reportData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log("Report Submitted:", {
            category,
            content,
            userPrompt,
            comments,
            email
        });

        setIsLoading(false);
        setSuccess(true);

        setTimeout(() => {
            onClose();
            setSuccess(false);
        }, 2000);
    };

    const getThemeColors = () => {
        switch (theme) {
            case 'light':
                return {
                    bg: 'bg-white',
                    border: 'border-zinc-200',
                    text: 'text-zinc-900',
                    textMuted: 'text-zinc-500',
                    inputBg: 'bg-zinc-50',
                    inputBorder: 'border-zinc-200'
                };
            case 'blue':
                return {
                    bg: 'bg-[#0F172A]',
                    border: 'border-blue-900/30',
                    text: 'text-blue-50',
                    textMuted: 'text-blue-300/70',
                    inputBg: 'bg-[#1E293B]',
                    inputBorder: 'border-blue-500/20'
                };
            default: // dark
                return {
                    bg: 'bg-[#1E1F20]',
                    border: 'border-white/10',
                    text: 'text-white',
                    textMuted: 'text-zinc-400',
                    inputBg: 'bg-black/20',
                    inputBorder: 'border-white/10'
                };
        }
    };

    const colors = getThemeColors();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-2xl ${colors.bg} border ${colors.border} rounded-xl shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]`}>

                {/* Header */}
                <div className={`p-4 border-b ${colors.border} flex items-center justify-between`}>
                    <h2 className={`text-lg font-semibold ${colors.text} flex items-center gap-2`}>
                        <AlertTriangle className="text-amber-500" size={20} />
                        Report Issue
                    </h2>
                    <button onClick={onClose} className={`${colors.textMuted} hover:${colors.text} transition-colors`}>
                        <X size={20} />
                    </button>
                </div>

                {success ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                            <Send className="text-green-500" size={32} />
                        </div>
                        <h3 className={`text-xl font-medium ${colors.text}`}>Report Submitted</h3>
                        <p className={colors.textMuted}>Thank you. Your report has been received and is being reviewed by the Neural Scholar team</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <form id="report-form" onSubmit={handleSubmit} className="space-y-5">

                            {/* Issue Category */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-semibold uppercase tracking-wider ${colors.textMuted}`}>Issue Category</label>
                                <div className="relative">
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className={`w-full appearance-none ${colors.inputBg} border ${colors.inputBorder} rounded-lg px-4 py-2.5 ${colors.text} focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all`}
                                    >
                                        {ISSUE_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat} className="bg-[#1E1F20]">{cat}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Inappropriate Content (Editable) */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-semibold uppercase tracking-wider ${colors.textMuted} flex items-center gap-1.5`}>
                                    <MessageSquare size={12} /> Inappropriate Content
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className={`w-full ${colors.inputBg} border ${colors.inputBorder} rounded-lg px-4 py-3 ${colors.textMuted} text-sm font-mono min-h-[80px] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none`}
                                />
                            </div>

                            {/* User Prompt (Editable) */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-semibold uppercase tracking-wider ${colors.textMuted} flex items-center gap-1.5`}>
                                    <Quote size={12} /> Original Prompt
                                </label>
                                <input
                                    type="text"
                                    value={userPrompt}
                                    onChange={(e) => setUserPrompt(e.target.value)}
                                    className={`w-full ${colors.inputBg} border ${colors.inputBorder} rounded-lg px-4 py-2.5 ${colors.textMuted} text-sm font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all`}
                                />
                            </div>

                            {/* Additional Comments */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-semibold uppercase tracking-wider ${colors.textMuted} flex items-center gap-1.5`}>
                                    <FileText size={12} /> Additional Comments
                                </label>
                                <textarea
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Please explain why you are reporting this content..."
                                    className={`w-full ${colors.inputBg} border ${colors.inputBorder} rounded-lg px-4 py-3 ${colors.text} text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all min-h-[100px]`}
                                    required
                                />
                            </div>

                            {/* Email (Optional) */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-semibold uppercase tracking-wider ${colors.textMuted} flex items-center gap-1.5`}>
                                    <Mail size={12} /> Email (Optional)
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="For follow-up regarding your report"
                                    className={`w-full ${colors.inputBg} border ${colors.inputBorder} rounded-lg px-4 py-2.5 ${colors.text} text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all`}
                                />
                            </div>

                        </form>
                    </div>
                )}

                {/* Footer */}
                {!success && (
                    <div className={`p-4 border-t ${colors.border} flex justify-end gap-3 bg-opacity-50`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${colors.textMuted} hover:${colors.text} transition-colors`}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="report-form"
                            disabled={isLoading}
                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Submit Report"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
