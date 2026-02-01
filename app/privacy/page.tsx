"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Privacy() {
    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-blue-500/30">
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

                {/* Header */}
                <div className="space-y-6 mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                        Privacy Policy
                    </h1>
                    <p className="text-zinc-400">
                        Last Updated: January 16, 2026
                    </p>
                    <div className="h-1 w-20 bg-blue-600 rounded-full"></div>
                </div>

                {/* Content */}
                <div className="prose prose-invert prose-lg text-zinc-300 space-y-12">

                    {/* Section 1 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 text-sm font-bold border border-blue-500/20">1</span>
                            Information We Collect
                        </h2>
                        <p>
                            When you use <strong className="text-white">Neural Scholar Engine</strong>, we collect the following data to ensure a high-precision search experience:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-base">
                            <li>
                                <strong className="text-zinc-100">Account Data:</strong> Your name and email address provided through Google Sign-In to authenticate your identity and secure your search history.
                            </li>
                            <li>
                                <strong className="text-zinc-100">Query Data:</strong> The search terms and academic prompts you enter so that our engine can generate synthesized research results.
                            </li>
                            <li>
                                <strong className="text-zinc-100">Usage Data:</strong> Standard technical information such as your IP address and device type, which helps us maintain app performance and stability.
                            </li>
                        </ul>
                    </section>

                    {/* Section 2 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 text-sm font-bold border border-blue-500/20">2</span>
                            How We Use Your Information
                        </h2>
                        <p>Your data is strictly used to power the application&apos;s core functionality:</p>
                        <ul className="list-disc pl-6 space-y-2 text-base">
                            <li>To personalize your experience and allow you to revisit previous research threads.</li>
                            <li>To process your queries using advanced Artificial Intelligence to provide accurate, real-time summaries.</li>
                        </ul>
                        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl mt-4">
                            <p className="text-base m-0">
                                <strong className="text-white">No Data Selling:</strong> We value your intellectual privacy. We do not sell or lease your personal information to third-party advertisers or data brokers.
                            </p>
                        </div>
                    </section>

                    {/* Section 3 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 text-sm font-bold border border-blue-500/20">3</span>
                            Data Processing and Security
                        </h2>
                        <ul className="list-disc pl-6 space-y-2 text-base">
                            <li>
                                <strong className="text-zinc-100">Secure Transmission:</strong> All data is encrypted via HTTPS/TLS during transmission to prevent unauthorized access.
                            </li>
                            <li>
                                <strong className="text-zinc-100">Third-Party Processing:</strong> We utilize secure cloud infrastructure to host the application and process AI-driven insights. These providers are prohibited from using your data for any purpose other than providing services to this application.
                            </li>
                            <li>
                                <strong className="text-zinc-100">AI Ethics:</strong> Your input data is used only to generate your specific responses and is not used to train global AI systems without your explicit consent.
                            </li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 text-sm font-bold border border-blue-500/20">4</span>
                            Data Retention and Deletion
                        </h2>
                        <ul className="list-disc pl-6 space-y-2 text-base">
                            <li>We retain your information only as long as your account is active.</li>
                            <li>You have the full right to request the deletion of your account and all associated search data at any time.</li>
                        </ul>
                    </section>

                    {/* Section 5 */}
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 text-sm font-bold border border-blue-500/20">5</span>
                            User Rights and Compliance
                        </h2>
                        <p>
                            In accordance with global privacy standards, you have the right to access, update, or export your data. For any privacy-related inquiries, please contact us directly through the support details provided in the app.
                        </p>
                    </section>

                </div>

                {/* Footer */}
                <div className="mt-20 pt-8 border-t border-zinc-900 text-center text-zinc-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} Neural Scholar Search. All rights reserved.</p>
                </div>

            </div>
        </div>
    );
}
