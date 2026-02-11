import { Loader2 } from "lucide-react";

export const SaudiLoader = ({ text = "جاري التجهيز..." }: { text?: string }) => {
    return (
        <div className="flex flex-col items-center justify-center gap-6 p-8 animate-in fade-in duration-500">
            <div className="relative">
                {/* Decorative rotating outer ring with Sadu colors */}
                <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-accent border-l-transparent animate-spin duration-[3s]"></div>

                {/* Inner pulsing circle */}
                <div className="w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center relative z-10 animate-pulse-slow">
                    {/* Custom SVG Palm Tree simplified */}
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-12 h-12 text-primary"
                    >
                        <path d="M12 22v-8" />
                        <path d="M12 8a5 5 0 0 0-5 5" />
                        <path d="M12 8a5 5 0 0 1 5 5" />
                        <path d="M12 14a6 6 0 0 0-6 6" />
                        <path d="M12 14a6 6 0 0 1 6 6" />
                        <path d="M12 2c0 2-2 3-2 3s2 1 4 1 4-1 4-1-2-1-2-3" />
                        <path d="M8 5s-1 2-3 2" />
                        <path d="M16 5s1 2 3 2" />
                    </svg>
                </div>
            </div>

            <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-primary tracking-wide">{text}</h3>
                <div className="flex justify-center gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                </div>
            </div>
        </div>
    );
};
