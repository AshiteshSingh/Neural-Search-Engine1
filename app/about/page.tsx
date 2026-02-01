"use client";

import Link from "next/link";
import { ArrowLeft, Github, Linkedin, Twitter } from "lucide-react";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-purple-500/30">
            <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">

                {/* Navigation */}
                <div className="mb-12">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back to Search</span>
                    </Link>
                </div>

                {/* Hero / Header */}
                <div className="space-y-6 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                        About Neural Scholar Search
                    </h1>
                    <div className="h-1 w-20 bg-blue-600 rounded-full"></div>
                </div>

                {/* Content */}
                <div className="prose prose-invert prose-lg text-zinc-300 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">

                    <p className="text-xl leading-relaxed text-zinc-100">
                        We are <span className="font-semibold text-white">Aashay and Ashitesh</span>, creators of <strong className="text-white">Neural Scholar Search</strong>.
                    </p>

                    <p>
                        We are <strong className="text-white">Self Taught ML engineers</strong> and <strong className="text-white">TensorFlow</strong> and <strong className="text-white">Qiskit</strong> enthusiasts,
                        and the creators of <strong className="text-white">Neural Scholar Search</strong>—an experimental AI search engine engineered for real-time,
                        high-precision results that outperform major competitors on niche and local queries.
                    </p>

                    <p>
                        In this update, we are currently working with TensorFlow and Qiskit to explore the intersection of
                        <span className="text-blue-400"> deep learning</span> and <span className="text-purple-400">quantum computing</span>.
                        Powered by Google Search and the latest Reasoning Models, this project provides up-to-date and accurate insights.
                    </p>

                    <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl my-8">
                        <h3 className="text-lg font-semibold text-white mb-3">Addressing the Gap in Commerce AI</h3>
                        <p className="text-base text-zinc-400 m-0">
                            Recognizing a significant gap in AI tools for commerce subjects—particularly <strong className="text-zinc-200">Accounts</strong>,
                            where existing models often fail—we leveraged our experience to develop a specialized
                            <strong className="text-zinc-200"> ISC Domain Agent</strong>. This feature guarantees answers that are not only accurate but also
                            clear and strictly confined to the latest ISC syllabus.
                        </p>
                    </div>

                    {/* Beta Notice Alert */}
                    <div className="flex items-start gap-4 p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mt-8">
                        <div className="text-yellow-500 text-2xl">⚠️</div>
                        <div className="space-y-1">
                            <h4 className="font-semibold text-yellow-500 text-sm uppercase tracking-wider">Experimental Beta</h4>
                            <p className="text-sm text-yellow-500/80 leading-relaxed">
                                This project is currently in experimental beta testing. As such, it may occasionally provide inaccurate results
                                and is not yet in its final form. We are actively working on the codebase and will introduce more advanced features
                                and optimizations in the future.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer / Connect (Optional Placeholder) */}
                <div className="mt-20 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-500 text-sm">
                    <p>© {new Date().getFullYear()} Neural Scholar Search. All rights reserved.</p>
                    <div className="flex gap-4">
                        {/* Add social links here if provided later */}
                    </div>
                </div>

            </div>
        </div>
    );
}
