"use client";
import { useEffect, useState } from "react";

interface ShootingStar {
    id: number;
    x: number;
    delay: number;
    duration: number;
    color: string;
}

export const ShootingStars = () => {
    const [stars, setStars] = useState<ShootingStar[]>([]);

    useEffect(() => {
        const createStar = () => {
            const colors = [
                "bg-cyan-400 shadow-[0_0_15px_3px_rgba(34,211,238,0.6)]",
                "bg-purple-400 shadow-[0_0_15px_3px_rgba(192,132,252,0.6)]",
                "bg-blue-400 shadow-[0_0_15px_3px_rgba(96,165,250,0.6)]",
                "bg-pink-400 shadow-[0_0_15px_3px_rgba(244,114,182,0.6)]",
                "bg-green-400 shadow-[0_0_15px_3px_rgba(74,222,128,0.6)]",
                "bg-white shadow-[0_0_15px_3px_rgba(255,255,255,0.6)]"
            ];

            const newStar: ShootingStar = {
                id: Date.now(),
                x: Math.random() * 100, // percentage
                delay: 0,
                duration: Math.random() * 2 + 1.5, // 1.5-3.5 seconds (Faster)
                color: colors[Math.floor(Math.random() * colors.length)],
            };

            setStars((prev) => [...prev, newStar]);

            // Remove star after it finishes
            setTimeout(() => {
                setStars((prev) => prev.filter((s) => s.id !== newStar.id));
            }, newStar.duration * 1000);
        };

        // Create a new star more frequently
        const interval = setInterval(() => {
            createStar();
        }, 200);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden h-full w-full">
            {stars.map((star) => (
                <div
                    key={star.id}
                    className={`absolute top-0 w-[3px] h-[150px] ${star.color} opacity-0 rotate-[215deg] animate-meteor rounded-full`}
                    style={{
                        left: `${star.x}%`,
                        top: '-150px', // Start above screen
                        animationDuration: `${star.duration}s`,
                        animationDelay: `${star.delay}s`,
                        opacity: 1,
                        boxShadow: '0 0 10px 2px currentColor'
                    }}
                >
                    {/* Glowing head of the meteor */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-[6px] h-[6px] bg-white rounded-full shadow-[0_0_20px_4px_rgba(255,255,255,0.9)]" />
                </div>
            ))}
        </div>
    );
};
