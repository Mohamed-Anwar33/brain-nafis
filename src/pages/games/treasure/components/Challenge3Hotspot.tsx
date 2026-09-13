import React, { useState, useRef } from "react";
import { Loader2, Target, Crosshair, Sparkles, Key, Zap } from "lucide-react";
import { ClientChallengeItem } from "@/types/treasure";
import { treasureHalalAudio } from "@/lib/treasureAudio";

interface Challenge3HotspotProps {
  challenge: ClientChallengeItem;
  onSubmitAnswer: (answerPayload: { x_percent: number; y_percent: number }) => Promise<any>;
  isSubmitting: boolean;
}

export function Challenge3Hotspot({
  challenge,
  onSubmitAnswer,
  isSubmitting,
}: Challenge3HotspotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [clickedCoords, setClickedCoords] = useState<{ x: number; y: number } | null>(null);
  const [imageError, setImageError] = useState(false);

  const imageUrl = challenge.image_url || (challenge.content as any)?.image_url;

  const handlePointerInteraction = (clientX: number, clientY: number) => {
    if (isSubmitting || !containerRef.current) return;

    const container = containerRef.current;
    const img = imageRef.current;

    let normX: number;
    let normY: number;

    if (img && img.naturalWidth && !imageError) {
      const rect = img.getBoundingClientRect();
      const naturalWidth = img.naturalWidth || rect.width;
      const naturalHeight = img.naturalHeight || rect.height;

      // Strict normalization for object-fit: contain
      const scale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
      const renderedWidth = naturalWidth * scale;
      const renderedHeight = naturalHeight * scale;

      const offsetX = (rect.width - renderedWidth) / 2;
      const offsetY = (rect.height - renderedHeight) / 2;

      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;

      if (
        clickX < offsetX ||
        clickX > offsetX + renderedWidth ||
        clickY < offsetY ||
        clickY > offsetY + renderedHeight
      ) {
        return;
      }

      normX = ((clickX - offsetX) / renderedWidth) * 100;
      normY = ((clickY - offsetY) / renderedHeight) * 100;
    } else {
      const rect = container.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;

      normX = (clickX / rect.width) * 100;
      normY = (clickY / rect.height) * 100;
    }

    try {
      treasureHalalAudio.playCrystalPulse();
    } catch (e) {}

    setClickedCoords({
      x: Math.max(0, Math.min(100, parseFloat(normX.toFixed(2)))),
      y: Math.max(0, Math.min(100, parseFloat(normY.toFixed(2)))),
    });
  };

  const handleSubmit = async () => {
    if (!clickedCoords || isSubmitting) return;
    await onSubmitAnswer({
      x_percent: clickedCoords.x,
      y_percent: clickedCoords.y,
    });
  };

  return (
    <div className="space-y-2.5 sm:space-y-3.5 max-w-xl mx-auto select-none">
      {/* 📜 Cartouche Scroll Question Box - Ancient Map Feel */}
      <div className="relative rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-gradient-to-b from-[#2a1a0f] via-[#1c120a] to-[#140c07] border-2 border-amber-600/60 shadow-[0_10px_25px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(251,191,36,0.3)] text-center space-y-1.5 sm:space-y-2 overflow-hidden">
        {/* Subtle antique parchment grain texture & seal */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#d9770615,transparent_70%)] pointer-events-none" />
        <div className="absolute top-1.5 left-2 text-amber-500/30 text-xs font-serif select-none pointer-events-none">📜 🧭</div>
        <div className="absolute top-1.5 right-2 text-amber-500/30 text-xs font-serif select-none pointer-events-none">⚓ 📜</div>

        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] sm:text-[11px] font-black tracking-wide shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin [animation-duration:10s]" />
          <span>تَنْشِيطُ النَّوَاةِ البَصَرِيَّةِ لِلخَرِيطَةِ الأَثَرِيَّةِ</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin [animation-duration:10s]" />
        </div>

        <h3 className="text-sm sm:text-base md:text-lg font-black text-amber-100 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] font-sans px-1">
          {challenge.prompt}
        </h3>

        <p className="text-[10px] sm:text-xs text-amber-200/70 font-medium flex items-center justify-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-amber-400" />
          <span>المس أو انقر بدقة فوق النواة في مركز المخطط العلمي</span>
        </p>
      </div>

      {/* Interactive Diagram Stage */}
      <div className="max-w-xl mx-auto">
        <div
          ref={containerRef}
          onClick={(e) => handlePointerInteraction(e.clientX, e.clientY)}
          onTouchEnd={(e) => {
            if (e.changedTouches.length > 0) {
              const t = e.changedTouches[0];
              handlePointerInteraction(t.clientX, t.clientY);
            }
          }}
          className="relative w-full h-52 sm:h-64 bg-stone-950/95 rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-3 border-amber-500/60 shadow-[0_10px_30px_rgba(0,0,0,0.8)] cursor-crosshair select-none flex items-center justify-center p-1"
        >
          {imageUrl && !imageError ? (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Scientific Diagram"
              onError={() => setImageError(true)}
              className="w-full h-full object-contain pointer-events-none rounded-xl"
            />
          ) : (
            /* High-Precision Interactive Scientific Atom Model SVG */
            <svg
              viewBox="0 0 500 320"
              className="w-full h-full object-contain pointer-events-none select-none"
            >
              <defs>
                <radialGradient id="nucleusGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#ef4444" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="protonGrad" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="60%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#991b1b" />
                </radialGradient>
                <radialGradient id="neutronGrad" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#e7e5e4" />
                  <stop offset="60%" stopColor="#78716c" />
                  <stop offset="100%" stopColor="#292524" />
                </radialGradient>
                <filter id="atomGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Background Coordinate Cross */}
              <line x1="250" y1="20" x2="250" y2="300" stroke="#f59e0b" strokeWidth="0.75" strokeDasharray="4 6" opacity="0.25" />
              <line x1="40" y1="160" x2="460" y2="160" stroke="#f59e0b" strokeWidth="0.75" strokeDasharray="4 6" opacity="0.25" />
              <circle cx="250" cy="160" r="140" fill="none" stroke="#d97706" strokeWidth="1" strokeDasharray="3 5" opacity="0.2" />

              {/* Electron Orbit 1 (Tilted 35 deg) */}
              <g transform="rotate(35 250 160)">
                <ellipse cx="250" cy="160" rx="175" ry="60" fill="none" stroke="#38bdf8" strokeWidth="2.5" opacity="0.75" />
                {/* Electron 1 */}
                <circle cx="425" cy="160" r="8" fill="#38bdf8" filter="url(#atomGlow)" />
                <text x="425" y="163" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">-</text>
                {/* Electron 2 */}
                <circle cx="75" cy="160" r="8" fill="#38bdf8" filter="url(#atomGlow)" />
                <text x="75" y="163" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">-</text>
              </g>

              {/* Electron Orbit 2 (Tilted -35 deg) */}
              <g transform="rotate(-35 250 160)">
                <ellipse cx="250" cy="160" rx="175" ry="60" fill="none" stroke="#818cf8" strokeWidth="2.5" opacity="0.75" />
                {/* Electron 3 */}
                <circle cx="425" cy="160" r="8" fill="#818cf8" filter="url(#atomGlow)" />
                <text x="425" y="163" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">-</text>
                {/* Electron 4 */}
                <circle cx="75" cy="160" r="8" fill="#818cf8" filter="url(#atomGlow)" />
                <text x="75" y="163" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">-</text>
              </g>

              {/* Electron Orbit 3 (Vertical 90 deg) */}
              <g transform="rotate(90 250 160)">
                <ellipse cx="250" cy="160" rx="135" ry="52" fill="none" stroke="#a78bfa" strokeWidth="2.5" opacity="0.75" />
                {/* Electron 5 */}
                <circle cx="385" cy="160" r="8" fill="#a78bfa" filter="url(#atomGlow)" />
                <text x="385" y="163" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">-</text>
              </g>

              {/* Central Nucleus Glow Aura at (250, 160) = 50%, 50% */}
              <circle cx="250" cy="160" r="58" fill="url(#nucleusGlow)" />
              <circle cx="250" cy="160" r="36" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4" opacity="0.8" />

              {/* Protons (+) and Neutrons (n) packed in the central nucleus */}
              <circle cx="241" cy="151" r="13" fill="url(#protonGrad)" stroke="#fecaca" strokeWidth="1.5" />
              <text x="241" y="156" textAnchor="middle" fill="white" fontSize="13" fontWeight="black">+</text>

              <circle cx="259" cy="153" r="13" fill="url(#protonGrad)" stroke="#fecaca" strokeWidth="1.5" />
              <text x="259" y="158" textAnchor="middle" fill="white" fontSize="13" fontWeight="black">+</text>

              <circle cx="249" cy="169" r="13" fill="url(#protonGrad)" stroke="#fecaca" strokeWidth="1.5" />
              <text x="249" y="174" textAnchor="middle" fill="white" fontSize="13" fontWeight="black">+</text>

              <circle cx="258" cy="167" r="12" fill="url(#neutronGrad)" stroke="#f5f5f4" strokeWidth="1.5" />
              <text x="258" y="171" textAnchor="middle" fill="white" fontSize="11" fontWeight="black">n</text>

              <circle cx="239" cy="165" r="12" fill="url(#neutronGrad)" stroke="#f5f5f4" strokeWidth="1.5" />
              <text x="239" y="169" textAnchor="middle" fill="white" fontSize="11" fontWeight="black">n</text>

              <circle cx="250" cy="145" r="12" fill="url(#neutronGrad)" stroke="#f5f5f4" strokeWidth="1.5" />
              <text x="250" y="149" textAnchor="middle" fill="white" fontSize="11" fontWeight="black">n</text>

              {/* Scientific Arabic Labels */}
              <g>
                {/* Pointer to Nucleus */}
                <line x1="250" y1="110" x2="250" y2="132" stroke="#f59e0b" strokeWidth="2" />
                <rect x="175" y="88" width="150" height="24" rx="6" fill="#1c1917" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="250" y="104" textAnchor="middle" fill="#fde047" fontSize="11" fontWeight="bold">النواة المركزية (بروتونات + نيوترونات)</text>

                {/* Pointer to Electron Orbit */}
                <line x1="380" y1="230" x2="330" y2="210" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />
                <rect x="340" y="230" width="130" height="22" rx="6" fill="#1c1917" stroke="#38bdf8" strokeWidth="1" />
                <text x="405" y="245" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontWeight="medium">مدارات الإلكترونات (-)</text>
              </g>
            </svg>
          )}

          {/* Student's Current Click Marker (High-tech / Ancient Rune Crosshair) */}
          {clickedCoords && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-yellow-300 bg-yellow-400/30 shadow-[0_0_15px_#fde047] pointer-events-none flex items-center justify-center animate-pulse"
              style={{
                left: `${clickedCoords.x}%`,
                top: `${clickedCoords.y}%`,
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white shadow-md" />
            </div>
          )}
        </div>

        {clickedCoords ? (
          <div className="text-center text-[10px] sm:text-xs text-emerald-300 font-black pt-1.5 flex items-center justify-center gap-1.5 animate-in fade-in">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>تم توجيه الإحداثيات ({clickedCoords.x}%، {clickedCoords.y}%)! اضغط لتأكيد الإجابة ⚡</span>
          </div>
        ) : (
          <div className="text-center text-[10px] sm:text-xs text-amber-300/80 pt-1 font-bold flex items-center justify-center gap-1">
            <span>🎯</span>
            <span>انقر فوق النواة في مركز الذرة (المحددة بالإطار الذهبي)</span>
          </div>
        )}
      </div>

      {/* Grand Altar Activation Mechanism Button (زر تأكيد الإجابة) */}
      <div className="pt-1 flex justify-center">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!clickedCoords || isSubmitting}
          className={`relative overflow-hidden w-full py-3 sm:py-3.5 px-6 rounded-xl sm:rounded-2xl font-black text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 select-none shadow-md ${
            clickedCoords && !isSubmitting
              ? "border-3 border-[#fef08a] bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#d97706] text-[#451a03] shadow-[0_5px_0_#78350f,0_10px_25px_rgba(245,158,11,0.6)] hover:brightness-105 active:translate-y-1 active:shadow-[0_1px_0_#78350f] cursor-pointer group animate-pulse"
              : "border-2 border-amber-600/60 bg-gradient-to-r from-amber-100 to-amber-200/90 text-[#78350f] shadow-sm cursor-not-allowed opacity-80"
          }`}
        >
          {clickedCoords && !isSubmitting && (
            <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/70 to-transparent pointer-events-none rounded-t-xl" />
          )}

          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-[#451a03]" />
              <span>جاري توجيه الطاقة وفك القفل...</span>
            </>
          ) : clickedCoords ? (
            <>
              <Key className="w-5 h-5 text-[#451a03] group-hover:rotate-12 transition-transform" />
              <span>✦ تَأْكِيدُ الإِجَابَةِ وَفَتْحُ القُفْلِ ✦</span>
              <Zap className="w-5 h-5 text-[#451a03]" />
            </>
          ) : (
            <>
              <Key className="w-4 h-4 text-[#78350f]" />
              <span>تَأْكِيدُ الإِجَابَةِ (انقر فوق النواة المركزية أولاً 🎯)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
