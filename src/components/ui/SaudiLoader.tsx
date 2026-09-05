import { Loader2, Brain } from "lucide-react";

export const SaudiLoader = ({ text = "جاري التجهيز..." }: { text?: string }) => {
    return (
        <div className="flex flex-col items-center justify-center gap-10 p-12 animate-in fade-in duration-1000">
            <div className="relative group">
                {/* Glowing Aura - Bright Sky */}
                <div className="absolute inset-0 bg-sky-400 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-1000 animate-pulse"></div>
                
                {/* Decorative rotating outer ring with Vibrant colors */}
                <div className="absolute -inset-4 rounded-full border-[6px] border-t-indigo-600 border-r-transparent border-b-sky-400 border-l-transparent animate-spin" style={{ animationDuration: "2s" }}></div>

                {/* Inner pulsing circle - White Glass */}
                <div className="w-32 h-32 bg-white/80 backdrop-blur-xl border-2 border-indigo-100 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.05)] flex items-center justify-center relative z-10 animate-pulse-slow">
                    <Brain className="w-16 h-16 text-indigo-600 animate-bounce" style={{ animationDuration: "3s" }} />
                </div>
            </div>

            <div className="text-center space-y-4">
                <h3 className="text-3xl font-black text-slate-800 tracking-widest animate-pulse">{text}</h3>
                <div className="flex justify-center gap-3">
                    <span className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s] shadow-[0_0_15px_rgba(79,70,229,0.3)]"></span>
                    <span className="w-3 h-3 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s] shadow-[0_0_15px_rgba(56,189,248,0.3)]"></span>
                    <span className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce shadow-[0_0_15px_rgba(16,185,129,0.3)]"></span>
                </div>
            </div>
        </div>
    );
};
