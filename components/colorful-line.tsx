import React from "react";

interface ColorfulLineProps {
    className?: string;
}

export const ColorfulLine = ({ className = "" }: ColorfulLineProps) => {
    return (
        <div className={`relative w-full rounded-full ${className}`}>
            <div className="absolute inset-0 opacity-70 blur-[8px] bg-[linear-gradient(90deg,#4285F4,#DB4437,#F4B400,#0F9D58,#4285F4,#DB4437,#F4B400,#0F9D58)] bg-[length:200%_100%] animate-gradient-x" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#4285F4,#DB4437,#F4B400,#0F9D58,#4285F4,#DB4437,#F4B400,#0F9D58)] bg-[length:200%_100%] animate-gradient-x shadow-[0_0_20px_2px_rgba(255,255,255,0.3)]" />
        </div>
    );
};
