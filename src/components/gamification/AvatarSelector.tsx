import { useState, useEffect } from "react";
import { STUDENT_AVATARS, StudentAvatar } from "@/types/gamification";
import { audioManager } from "@/lib/audio";
import { Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarSelectorProps {
  selectedId: string;
  onSelect: (avatar: StudentAvatar) => void;
  className?: string;
}

export function AvatarSelector({
  selectedId,
  onSelect,
  className,
}: AvatarSelectorProps) {
  const [currentSelected, setCurrentSelected] = useState<string>(
    selectedId || STUDENT_AVATARS[0].id
  );

  useEffect(() => {
    if (selectedId) {
      setCurrentSelected(selectedId);
    } else {
      const saved = localStorage.getItem("brain_student_avatar_id");
      if (saved) {
        setCurrentSelected(saved);
        const found = STUDENT_AVATARS.find((a) => a.id === saved);
        if (found) onSelect(found);
      }
    }
  }, [selectedId, onSelect]);

  const handleChoose = (avatar: StudentAvatar) => {
    setCurrentSelected(avatar.id);
    localStorage.setItem("brain_student_avatar_id", avatar.id);
    audioManager.playClick();
    onSelect(avatar);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between px-1">
        <label className="text-sm sm:text-base font-bold text-slate-700 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>اختر شخصية بطلك العلمي:</span>
        </label>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
          تظهر في لوحة الإنجاز 🏅
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {STUDENT_AVATARS.map((avatar) => {
          const isSelected = currentSelected === avatar.id;
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => handleChoose(avatar)}
              className={cn(
                "relative group flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border-2 transition-all duration-300 outline-none text-center",
                isSelected
                  ? "border-indigo-600 bg-gradient-to-b from-indigo-50 to-white shadow-lg shadow-indigo-500/20 scale-105"
                  : "border-slate-200/80 bg-white/70 hover:border-indigo-300 hover:bg-white hover:scale-102 shadow-sm"
              )}
            >
              {isSelected && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm animate-in zoom-in-50">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}

              <div
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-1.5 transition-transform duration-300 group-hover:scale-110",
                  "bg-gradient-to-br shadow-md text-white",
                  avatar.gradient
                )}
              >
                <span>{avatar.emoji}</span>
              </div>

              <span className="text-xs font-black text-slate-800 line-clamp-1">
                {avatar.name}
              </span>
              <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                {avatar.role}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
