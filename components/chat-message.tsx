import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, User, ExternalLink, Play, Image as ImageIcon } from 'lucide-react';

// Define the structure for images and videos
interface MediaItem {
    title: string;
    link: string;
    thumbnail: string;
    videoId?: string; // Only for videos
}

// Update props to accept the media object
interface ChatMessageProps {
    role: 'user' | 'bot';
    content: string;
    media?: {
        images: MediaItem[];
        videos: MediaItem[];
    };
}

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, media }) => {
    const isBot = role === 'bot';

    return (
        <div className={`flex gap-4 ${isBot ? 'bg-white/50' : ''} p-4 rounded-xl transition-colors hover:bg-white/80`}>
            {/* Avatar */}
            <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm ${isBot ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                {isBot ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>

            <div className="flex-1 space-y-4 overflow-hidden">

                {/* === MEDIA SECTION (Renders only if media exists) === */}
                {isBot && media && (media.images.length > 0 || media.videos.length > 0) && (
                    <div className="mb-6 space-y-6">
                        {/* Videos Section */}
                        {media.videos.length > 0 && (
                            <div>
                                <h3 className="flex items-center gap-2 font-semibold mb-3 text-sm text-muted-foreground">
                                    <Play className="h-4 w-4" /> Related Videos
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {media.videos.map((video, idx) => (
                                        <div key={idx} className="aspect-video rounded-xl overflow-hidden shadow-sm border bg-black relative group">
                                            <iframe
                                                src={`https://www.youtube.com/embed/${video.videoId}`}
                                                title={video.title}
                                                className="w-full h-full"
                                                allowFullScreen
                                                loading="lazy"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Images Section */}
                        {media.images.length > 0 && (
                            <div>
                                <h3 className="flex items-center gap-2 font-semibold mb-3 text-sm text-muted-foreground">
                                    <ImageIcon className="h-4 w-4" /> Relevant Images
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {media.images.map((img, idx) => (
                                        <a key={idx} href={img.link} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden shadow-sm border relative group hover:opacity-90 transition-opacity bg-gray-100">
                                            <img src={img.thumbnail} alt={img.title} className="w-full h-full object-cover" loading="lazy" />
                                            {/* Hover overlay with title */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                                <p className="text-xs text-white truncate w-full flex items-center gap-1 font-medium">
                                                    {img.title} <ExternalLink className="h-3 w-3 inline opacity-70" />
                                                </p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Separator between media and text */}
                        <hr className="border-gray-200 dark:border-gray-700/50 my-4 opacity-50" />
                    </div>
                )}

                {/* === TEXT CONTENT SECTION === */}
                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none break-words leading-relaxed">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            // Style links nicely
                            a: ({ ...props }) => (
                                <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline inline-flex items-center gap-0.5">
                                    {props.children} <ExternalLink className="h-3 w-3 inline-block opacity-60" />
                                </a>
                            ),
                            // Style "Thought" blocks differently than regular text
                            p: ({ children, ...props }) => {
                                const text = String(children);
                                if (text.startsWith('__THOUGHT_START__')) {
                                    const thoughtContent = text.replace('__THOUGHT_START__', '').replace('__THOUGHT_END__', '');
                                    return (
                                        <div className="bg-gray-50 dark:bg-gray-800/50 border-l-4 border-primary/30 pl-4 py-3 my-4 text-sm text-muted-foreground italic rounded-r-lg bg-opacity-50">
                                            <span className="font-semibold not-italic block mb-1 text-xs uppercase tracking-wider text-primary/70">AI Reasoning:</span>
                                            {thoughtContent}
                                        </div>
                                    );
                                }
                                return <p {...props} className="mb-4 last:mb-0">{children}</p>
                            },
                            // Style citation numbers (e.g., [1])
                            sup: ({ ...props }) => (
                                <sup {...props} className="text-[10px] bg-primary/10 text-primary px-1 rounded-sm font-bold mx-0.5" />
                            ),
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
};

export default ChatMessage;