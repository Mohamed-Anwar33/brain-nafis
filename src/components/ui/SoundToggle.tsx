import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { audioManager } from "@/lib/audio";
import { cn } from "@/lib/utils";

interface SoundToggleProps {
  className?: string;
}

export function SoundToggle({ className }: SoundToggleProps) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(audioManager.getMuted());
  }, []);

  const handleToggle = () => {
    const nextMute = audioManager.toggleMute();
    setMuted(nextMute);
    if (!nextMute) {
      audioManager.playClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={muted ? "تشغيل المؤثرات الصوتية" : "كتم المؤثرات الصوتية"}
      title={muted ? "تشغيل المؤثرات الصوتية" : "كتم المؤثرات الصوتية"}
      className={cn(
        "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
        "bg-white/80 hover:bg-white text-slate-700 shadow-md border border-slate-200/80 backdrop-blur-md",
        "hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-primary/40",
        className
      )}
    >
      {muted ? (
        <VolumeX className="w-5 h-5 text-rose-500 transition-transform group-hover:scale-110" />
      ) : (
        <Volume2 className="w-5 h-5 text-emerald-600 transition-transform group-hover:scale-110" />
      )}
      <span className="sr-only">{muted ? "صامت" : "صوت"}</span>
    </button>
  );
}
