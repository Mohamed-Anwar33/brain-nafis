import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Check, RotateCcw, Eye, Target, AlertCircle } from "lucide-react";

interface HotspotVisualEditorProps {
  imageUrl: string;
  targetX: number; // 0 - 100
  targetY: number; // 0 - 100
  toleranceRadius: number; // 3 - 30
  onChange: (coords: {
    targetX: number;
    targetY: number;
    toleranceRadius: number;
  }) => void;
  disabled?: boolean;
}

export function HotspotVisualEditor({
  imageUrl,
  targetX,
  targetY,
  toleranceRadius,
  onChange,
  disabled = false,
}: HotspotVisualEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [testClick, setTestClick] = useState<{ x: number; y: number; isHit: boolean } | null>(null);
  const [testMode, setTestMode] = useState(false);

  // Clear test click when coordinates change
  useEffect(() => {
    setTestClick(null);
  }, [targetX, targetY, toleranceRadius]);

  // Calculate normalized coordinate from natural image render box (accounting for object-fit: contain)
  const calculateNormalizedCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !containerRef.current) return null;

    const img = imageRef.current;
    const rect = img.getBoundingClientRect();

    const naturalWidth = img.naturalWidth || rect.width;
    const naturalHeight = img.naturalHeight || rect.height;

    // Scale factor for object-fit: contain
    const scale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;

    const offsetX = (rect.width - renderedWidth) / 2;
    const offsetY = (rect.height - renderedHeight) / 2;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if clicked inside actual rendered image box
    if (
      clickX < offsetX ||
      clickX > offsetX + renderedWidth ||
      clickY < offsetY ||
      clickY > offsetY + renderedHeight
    ) {
      return null;
    }

    const normX = ((clickX - offsetX) / renderedWidth) * 100;
    const normY = ((clickY - offsetY) / renderedHeight) * 100;

    return {
      x: Math.max(0, Math.min(100, parseFloat(normX.toFixed(2)))),
      y: Math.max(0, Math.min(100, parseFloat(normY.toFixed(2)))),
    };
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    const coords = calculateNormalizedCoords(e);
    if (!coords) return;

    if (testMode) {
      // Simulate student test click
      const dist = Math.sqrt(
        Math.pow(coords.x - targetX, 2) + Math.pow(coords.y - targetY, 2)
      );
      const isHit = dist <= toleranceRadius;
      setTestClick({ x: coords.x, y: coords.y, isHit });
    } else {
      // Set new target
      onChange({
        targetX: coords.x,
        targetY: coords.y,
        toleranceRadius,
      });
    }
  };

  return (
    <div className="space-y-4 bg-card border rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-primary" />
          <h4 className="font-bold text-foreground">محرر النقطة الفعالة البصري (Hotspot Visual Editor)</h4>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={testMode ? "default" : "outline"}
            size="sm"
            onClick={() => setTestMode(!testMode)}
            className="text-xs gap-1.5"
          >
            <Eye className="w-4 h-4" />
            {testMode ? "وضع التحديد (Edit Target)" : "اختبار نقرة الطالب (Test Click)"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {testMode
          ? "🎯 أنت الآن في وضع الاختبار: انقر على الرسم لتجربة هل نقرة الطالب ستقع ضمن النطاق الصحيح أم لا."
          : "📍 انقر مباشرة على الجزء المستهدف في المخطط العلمي لتثبيت إحداثيات الإجابة الصحيحة."}
      </p>

      {/* Interactive Image Container */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={`relative w-full aspect-video bg-muted/40 rounded-xl overflow-hidden border-2 border-dashed flex items-center justify-center select-none ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-crosshair hover:border-primary/50"
        }`}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Target Diagram"
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Target Indicator Ring */}
        {targetX > 0 && targetY > 0 && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500 bg-emerald-500/20 shadow-lg pointer-events-none flex items-center justify-center transition-all duration-150"
            style={{
              left: `${targetX}%`,
              top: `${targetY}%`,
              width: `${toleranceRadius * 2}%`,
              height: `${toleranceRadius * 2}%`,
              maxWidth: "200px",
              maxHeight: "200px",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white shadow-sm" />
          </div>
        )}

        {/* Test Click Feedback Marker */}
        {testClick && (
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center pointer-events-none animate-ping duration-300 ${
              testClick.isHit
                ? "border-emerald-600 bg-emerald-400/50"
                : "border-rose-600 bg-rose-400/50"
            }`}
            style={{
              left: `${testClick.x}%`,
              top: `${testClick.y}%`,
            }}
          />
        )}
      </div>

      {/* Coordinate & Radius Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-foreground">نطاق التسامح والقبول (Tolerance Radius):</span>
            <Badge variant="secondary" className="font-mono">
              {toleranceRadius}%
            </Badge>
          </div>
          <Slider
            min={3}
            max={25}
            step={0.5}
            value={[toleranceRadius]}
            onValueChange={(val) =>
              onChange({
                targetX,
                targetY,
                toleranceRadius: val[0],
              })
            }
            disabled={disabled || testMode}
          />
          <span className="text-[11px] text-muted-foreground">
            تحديد حجم المنطقة المقبولة حول النقطة (كلما كبرت صغرت صعوبة التحدي).
          </span>
        </div>

        <div className="flex flex-col justify-center space-y-1.5 text-xs bg-muted/30 p-3 rounded-lg border">
          <div className="flex justify-between items-center font-mono text-muted-foreground">
            <span>الهدف (Target Coordinates):</span>
            <span className="font-bold text-foreground">
              X: {targetX}% | Y: {targetY}%
            </span>
          </div>
          {testClick && (
            <div className="flex justify-between items-center pt-1 border-t">
              <span>نتيجة آخر نقرة اختبار:</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  testClick.isHit ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {testClick.isHit ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> إصابة صحيحة (Hit)
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" /> خارج النطاق (Miss)
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
