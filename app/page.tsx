"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Globe, ChevronRight, ArrowRight, Loader2, Sparkles, Plus, CheckCircle2, BookOpen, CornerDownRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChiruSearch() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);

  // State for the "Working..." process visualization
  const [creationStep, setCreationStep] = useState<number>(0);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [reviewingSources, setReviewingSources] = useState<any[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Auto-scroll to bottom when new content appears
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [data, loading, creationStep]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const stopGeneration = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    clearAllTimeouts();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    clearAllTimeouts();

    // Create new controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Update query state if called from related buttons
    setQuery(searchQuery);

    setLoading(true);
    setData(null);
    setCreationStep(0);
    setSearchQueries([]);
    setReviewingSources([]);
    setShowSteps(false);
    setShowAllSources(false);

    // 1. Start "Working..." animation simulation
    // Track timeouts so we can clear them on stop
    const t1 = setTimeout(() => {
      setCreationStep(1);
    }, 500);

    const t2 = setTimeout(() => {
      setCreationStep(2);
      const derivedQueries = [
        `${searchQuery}`,
        `${searchQuery} latest updates 2025`,
        `${searchQuery} official analysis`,
      ];
      setSearchQueries(derivedQueries);
    }, 1500);

    const t3 = setTimeout(() => {
      setCreationStep(3);
    }, 2500); // Shorter wait for reviewing

    timeoutsRef.current.push(t1, t2, t3);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        body: JSON.stringify({ query: searchQuery }),
        signal: controller.signal
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamedText = "";
      let finalSources: any[] = [];

      while (!done) {
        // If aborted externally (e.g. stop button), we should stop processing
        if (controller.signal.aborted) {
          break;
        }

        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (done) break;

        const chunkValue = decoder.decode(value, { stream: true });

        // Check for JSON start
        if (chunkValue.includes("__JSON_START__")) {
          const parts = chunkValue.split("__JSON_START__");
          streamedText += parts[0];

          if (parts[1]) {
            const jsonPart = parts[1].split("__JSON_END__")[0];
            try {
              const parsed = JSON.parse(jsonPart);
              if (parsed.sources) {
                finalSources = parsed.sources;
                setReviewingSources(finalSources.map((s: any) => ({
                  title: s.web?.title || "Source",
                  domain: s.web?.uri ? new URL(s.web.uri).hostname : "web"
                })));
              }
            } catch (e) {
              console.error("Error parsing sources JSON", e);
            }
          }
        } else {
          streamedText += chunkValue;
        }

        // Update data state incrementally
        // We construct a partial data object so the UI renders it
        setData((prev: any) => ({
          ...prev,
          answer: streamedText,
          sources: finalSources.length > 0 ? finalSources : (prev?.sources || [])
        }));

        // If we have some text, we can show "Working" is done for the creation steps
        if (streamedText.length > 10 && creationStep < 4) {
          setCreationStep(4);
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Search aborted');
      } else {
        console.error("Search error:", err);
        // Ensure the UI shows something went wrong instead of disappearing
        if (!data) {
          setData({ answer: "An error occurred while searching. Please check your connection or quota and try again.", sources: [] });
        }
      }
    } finally {
      // Only complete loading if not aborted (or if explicitly stopped, loading is handled in stopGeneration)
      if (abortControllerRef.current === controller) {
        setLoading(false);
        setCreationStep(4); // Done
        abortControllerRef.current = null;
      }
    }
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  // Helper to parse answer
  const getAnswerParts = (fullText: string) => {
    const parts = fullText.split("## Related");
    const mainAnswer = parts[0];
    const relatedSection = parts[1] || "";

    // Parse related questions (assuming they are lines starting with - or numbered)
    const relatedQuestions = relatedSection
      .split("\n")
      .map(line => line.replace(/^-\s*|^\d+\.\s*/, "").trim())
      .filter(line => line.length > 0);

    return { mainAnswer, relatedQuestions };
  };

  const { mainAnswer, relatedQuestions } = data?.answer ? getAnswerParts(data.answer) : { mainAnswer: "", relatedQuestions: [] };

  return (
    <div className="flex flex-col h-screen bg-black text-white selection:bg-blue-500/30 font-sans">

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-zinc-900 bg-black/50 backdrop-blur-md sticky top-0 z-50 relative">
        <div className="flex items-center gap-2 relative z-10">
          {/* Left side spacer - keeping layout balanced */}
          <div className="bg-white text-black p-1 rounded-md">
            <Globe size={16} strokeWidth={3} />
          </div>
        </div>

        {/* Branding in Header - HIDDEN on start screen, visible when searching/results */}
        {(data || loading || creationStep > 0) && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-300">
            <h1 className="text-xl font-semibold tracking-tight font-sans">ChiruSearch</h1>
            <span className="text-cyan-400 font-mono text-lg lowercase opacity-90">pro</span>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 relative z-10">
          {/* History removed as requested */}
        </div>
      </header>

      {/* Main Content */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pb-32 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-end pb-4">

          {/* Default Start Screen */}
          {!data && !loading && creationStep === 0 && (
            <div className="flex flex-col items-center justify-center space-y-8 my-auto animate-in fade-in duration-700 slide-in-from-bottom-5" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>

              {/* Centered Big Branding */}
              <div className="flex flex-col items-center gap-4 mb-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-6xl font-semibold tracking-tight font-sans text-white">ChiruSearch</h1>

                </div>
              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                <SuggestionCard icon={<Globe className="text-pink-500" />} text="Latest global news updates" onClick={() => performSearch("Latest global news updates")} />
                <SuggestionCard icon={<Sparkles className="text-yellow-500" />} text="Explain quantum computing" onClick={() => performSearch("Explain quantum computing")} />
                <SuggestionCard icon={<Search className="text-blue-500" />} text="Deep research on AI agents" onClick={() => performSearch("Deep research on AI agents")} />
                <SuggestionCard icon={<ChevronRight className="text-green-500" />} text="Compare React vs Vue" onClick={() => performSearch("Compare React vs Vue")} />
              </div>
            </div>
          )}

          {/* User Query */}
          {(loading || data) && (
            <div className="mb-0 w-full pt-10">
              <h1 className="text-3xl md:text-5xl font-medium text-white mb-8 border-b border-zinc-900 pb-8 leading-tight">
                {query}
              </h1>

              {/* Thinking Process UI */}
              {loading && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 font-mono">
                  <div className="flex items-center gap-3 text-zinc-400 mb-6">
                    {/* ANIMATING BLUE DOT */}
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <div className="absolute w-3 h-3 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                      <div className="relative w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                    </div>
                    <span className="font-medium text-lg font-sans text-blue-400">Working...</span>
                  </div>

                  <div className="border-l-2 border-zinc-800 ml-3 pl-6 space-y-8">
                    {/* Steps */}
                    {creationStep >= 1 && (
                      <div className="flex items-start gap-3 animate-in fade-in duration-500">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 ring-4 ring-black" />
                        <span className="text-zinc-300">Understanding request details...</span>
                      </div>
                    )}
                    {creationStep >= 2 && (
                      <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest pl-5">
                          Searching
                        </div>
                        <div className="flex flex-wrap gap-2 pl-5">
                          {searchQueries.map((q, i) => (
                            <span key={i} className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-4 py-2 rounded-full text-sm flex items-center gap-2 animate-in zoom-in-95 duration-300">
                              <Search className="w-3 h-3 text-zinc-500" />
                              {q}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {creationStep >= 3 && (
                      <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between text-zinc-500 text-xs font-bold uppercase tracking-widest pl-5">
                          <span>Reviewing sources</span>
                          <span>{reviewingSources.length > 0 ? `${reviewingSources.length} Found` : 'Searching...'}</span>
                        </div>
                        <div className="pl-5 space-y-1">
                          {reviewingSources.slice(0, 3).map((src, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                  {i + 1}
                                </div>
                                <span className="text-sm text-zinc-300 truncate">{src.title}</span>
                              </div>
                              <span className="text-xs text-zinc-600 flex-shrink-0">{src.domain}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Display */}
          {data && !loading && (
            <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

              {/* Sources List (Fixed Filtering) */}
              {data.sources && data.sources.filter((src: any) => src.web && !src.web.uri.includes('vertexaisearch') && !src.web.title.includes('vertexaisearch')).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-sm uppercase tracking-wide text-zinc-300">Sources</span>
                    </div>
                    <button
                      onClick={() => setShowSteps(!showSteps)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                    >
                      {showSteps ? 'Hide process' : 'View process'}
                    </button>
                  </div>

                  {/* Steps Details (Hidden by default, toggleable) */}
                  {showSteps && (
                    <div className="p-4 mb-4 bg-zinc-900/30 border border-zinc-800 rounded-xl space-y-2 text-sm text-zinc-400 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-500" />
                        <span>Identified intent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-500" />
                        <span>Searched {searchQueries.length} queries</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-500" />
                        <span>Analyzed {data.sources?.length || 0} sources</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    {data.sources
                      .filter((src: any) => src.web && !src.web.uri.includes('vertexaisearch') && !src.web.title.includes('vertexaisearch'))
                      .slice(0, 5).map((src: any, i: number) => (
                        <a key={i} href={src.web.uri} target="_blank" rel="noreferrer"
                          className="flex-shrink-0 w-60 p-4 bg-zinc-900/30 border border-zinc-800 hover:border-blue-500/30 hover:bg-zinc-800 rounded-xl transition-all group snap-start flex flex-col justify-between h-[100px] relative overflow-hidden">
                          <div className="absolute top-3 right-3 text-[10px] font-mono text-zinc-700 font-bold group-hover:text-zinc-500 transition-colors">{i + 1}</div>
                          <p className="text-xs text-blue-400/80 truncate mb-1 font-medium">{new URL(src.web.uri).hostname}</p>
                          <p className="text-sm font-semibold text-zinc-300 group-hover:text-blue-100 line-clamp-2 leading-snug">
                            {src.web.title}
                          </p>
                        </a>
                      ))}
                    {data.sources.filter((src: any) => src.web && !src.web.uri.includes('vertexaisearch')).length > 5 && (
                      <button
                        onClick={() => setShowAllSources(!showAllSources)}
                        className="flex-shrink-0 h-[100px] w-24 flex flex-col items-center justify-center p-4 bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 rounded-xl text-xs text-zinc-400 transition-all font-medium gap-2"
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Plus size={14} />
                        </div>
                        <span>{data.sources.filter((src: any) => src.web && !src.web.uri.includes('vertexaisearch')).length - 5} more</span>
                      </button>
                    )}
                  </div>

                  {/* Full Sources View (Toggle) */}
                  {showAllSources && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 animate-in fade-in slide-in-from-top-4">
                      {data.sources
                        .filter((src: any) => src.web && !src.web.uri.includes('vertexaisearch') && !src.web.title.includes('vertexaisearch'))
                        .map((src: any, i: number) => (
                          <a key={i} href={src.web.uri} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 hover:bg-zinc-800 transition-colors">
                            <span className="text-xs font-mono text-zinc-500 w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-zinc-200 truncate">{src.web.title}</div>
                              <div className="text-xs text-zinc-500 truncate">{src.web.uri}</div>
                            </div>
                          </a>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Answer Content */}
              <div className="space-y-6">
                {/* Removed Answer Header as per request */}

                {/* TYPOGRAPHY OVERHAUL based on feedback */}
                <div className="prose prose-invert max-w-none 
                    /* Base text settings - RELAXED & READABLE */
                    prose-p:text-zinc-300 prose-p:text-lg md:prose-p:text-xl prose-p:leading-10 prose-p:my-8
                    
                    /* Heading settings - DISTINCT SEPARATION */
                    prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
                    prose-h1:text-5xl prose-h1:mb-12 prose-h1:font-extrabold
                    prose-h2:text-4xl md:prose-h2:text-5xl prose-h2:mt-16 prose-h2:mb-8 prose-h2:text-white prose-h2:font-bold prose-h2:border-b prose-h2:border-zinc-800/60 prose-h2:pb-4
                    prose-h3:text-3xl prose-h3:mt-12 prose-h3:mb-6 prose-h3:text-zinc-200 prose-h3:font-semibold
                    
                    /* List settings - MORE BREATHING ROOM */
                    prose-li:text-zinc-300 prose-li:text-lg md:prose-li:text-xl prose-li:my-4 prose-li:leading-relaxed
                    prose-ul:my-8 prose-ol:my-8
                    
                    /* key formatting */
                    prose-strong:text-white prose-strong:font-bold prose-strong:text-blue-200
                    prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                    prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-zinc-900/40 prose-blockquote:p-8 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:text-zinc-300 prose-blockquote:text-xl prose-blockquote:my-10 prose-blockquote:shadow-md
                    prose-code:bg-zinc-900 prose-code:px-2 prose-code:py-1 prose-code:rounded-md prose-code:text-base prose-code:text-blue-200 prose-code:font-mono
                    prose-hr:border-zinc-800 prose-hr:my-16">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => {
                        return <a {...props} className="text-blue-400 hover:text-blue-300 no-underline" target="_blank" />
                      }
                    }}
                  >
                    {mainAnswer}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Related Questions - CUSTOM UI */}
              {relatedQuestions.length > 0 && (
                <div className="mt-12 border-t border-zinc-800 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <h3 className="text-lg font-bold text-zinc-200 mb-4 px-2">Related</h3>
                  <div className="flex flex-col">
                    {relatedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          // Trigger auto-search on click
                          performSearch(q);
                        }}
                        className="flex items-center gap-4 py-4 px-2 border-b border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all text-left text-lg group"
                      >
                        <CornerDownRight className="w-5 h-5 text-zinc-600 group-hover:text-blue-500 transition-colors" />
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="p-6 bg-black/80 backdrop-blur-xl border-t border-zinc-900 sticky bottom-0 z-20">
        <form onSubmit={onSearch} className="max-w-3xl mx-auto relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div
            className="relative z-10 flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-full px-2 py-2 shadow-2xl focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-800 transition-all"
          >
            {/* Removed Plus icon as per request */}
            <input
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-zinc-200 placeholder:text-zinc-600 px-4 py-1 text-base focus:ring-0"
              placeholder="Ask anything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {loading ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="p-2.5 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors flex items-center justify-center group"
              >
                <div className="w-3 h-3 bg-zinc-400 rounded-[1px] group-hover:bg-white transition-colors" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!query.trim()}
                className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowRight size={20} className="text-zinc-400" />
              </button>
            )}
          </div>

          <footer className="mt-4 text-center">

          </footer>
        </form>
      </div>
    </div>
  );
}

function SuggestionCard({ icon, text, onClick }: { icon: React.ReactNode; text: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left w-full group">
      <div className="p-2 bg-zinc-900 rounded-lg group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <span className="text-zinc-400 group-hover:text-zinc-200 font-medium">{text}</span>
    </button>
  );
}