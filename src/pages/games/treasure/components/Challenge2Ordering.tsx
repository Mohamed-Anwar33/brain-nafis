import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowUp, ArrowDown, GripVertical, Sparkles, Key, Zap } from "lucide-react";
import { ClientChallengeItem } from "@/types/treasure";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Challenge2OrderingProps {
  challenge: ClientChallengeItem;
  onSubmitAnswer: (answerPayload: { submitted_order: string[] }) => Promise<void>;
  isSubmitting: boolean;
}

interface SortableCardProps {
  id: string;
  index: number;
  item: { id: string; text: string; imageUrl?: string };
  disabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function SortableItemCard({
  id,
  index,
  item,
  disabled,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`py-2.5 sm:py-3 px-3 sm:px-4 bg-gradient-to-r from-[#2a1308]/95 via-[#3b1d0c]/90 to-[#2a1308]/95 rounded-xl sm:rounded-2xl border-2 transition-all select-none shadow-md flex items-center justify-between gap-2.5 text-amber-100 ${
        isDragging
          ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] scale-[1.02] ring-2 ring-yellow-400/50 bg-[#451a03]"
          : "border-amber-500/40 hover:border-amber-400/80 hover:bg-[#381a0b]"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Drag handle for touch & mouse */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 sm:p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-400/80 hover:text-amber-300 touch-none shrink-0"
          title="اسحب للترتيب"
        >
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        {/* Runic Order Badge */}
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-xs sm:text-sm bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 shadow-md border border-amber-200 shrink-0">
          {index + 1}
        </div>

        <span className="font-black text-xs sm:text-sm md:text-base text-amber-100 leading-snug truncate">
          {item.text}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.text}
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-lg border border-amber-400/40 bg-black/40 p-0.5"
          />
        )}

        {/* Accessible Quick Up/Down Step Buttons for mobile */}
        <div className="flex flex-row gap-0.5 sm:gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isFirst || disabled}
            onClick={onMoveUp}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg hover:bg-amber-500/20 text-amber-300 hover:text-amber-100 disabled:opacity-30"
            title="تحريك لأعلى"
          >
            <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isLast || disabled}
            onClick={onMoveDown}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg hover:bg-amber-500/20 text-amber-300 hover:text-amber-100 disabled:opacity-30"
            title="تحريك لأسفل"
          >
            <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Challenge2Ordering({
  challenge,
  onSubmitAnswer,
  isSubmitting,
}: Challenge2OrderingProps) {
  const initialItems = challenge.content.items || [];
  const [items, setItems] = useState<{ id: string; text: string; imageUrl?: string }[]>(() => {
    return [...initialItems].sort(() => Math.random() - 0.5);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((i) => i.id === active.id);
        const newIndex = currentItems.findIndex((i) => i.id === over.id);
        return arrayMove(currentItems, oldIndex, newIndex);
      });
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const next = [...items];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setItems(next);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const submittedOrder = items.map((i) => i.id);
    await onSubmitAnswer({ submitted_order: submittedOrder });
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-xl mx-auto select-none">
      {/* 📜 Cartouche Scroll Question Box - Ancient Map Feel */}
      <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-[#2a1a0f] via-[#1c120a] to-[#140c07] border-2 border-amber-600/60 shadow-[0_12px_30px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(251,191,36,0.3)] text-center space-y-2.5 overflow-hidden">
        {/* Subtle antique parchment grain texture & seal */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#d9770615,transparent_70%)] pointer-events-none" />
        <div className="absolute top-1.5 left-2 text-amber-500/30 text-xs font-serif select-none pointer-events-none">📜 🧭</div>
        <div className="absolute top-1.5 right-2 text-amber-500/30 text-xs font-serif select-none pointer-events-none">⚓ 📜</div>

        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[11px] font-black tracking-wide shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin [animation-duration:10s]" />
          <span>تَسَلْسُلُ مَسَارَاتِ الخَرِيطَةِ الأَثَرِيَّةِ</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin [animation-duration:10s]" />
        </div>

        <h3 className="text-base sm:text-lg md:text-xl font-black text-amber-100 leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] font-sans px-2">
          {challenge.prompt}
        </h3>

        <p className="text-[11px] sm:text-xs text-amber-200/70 font-medium flex items-center justify-center gap-1.5">
          <span>💡</span>
          <span>اسحب الألواح أو استخدم الأسهم لترتيبها بالتسلسل الصحيح من البداية إلى النهاية</span>
        </p>
      </div>

      {/* Sortable Items Container using @dnd-kit */}
      <div className="space-y-2 sm:space-y-2.5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item, index) => (
              <SortableItemCard
                key={item.id}
                id={item.id}
                index={index}
                item={item}
                disabled={isSubmitting}
                onMoveUp={() => moveItem(index, "up")}
                onMoveDown={() => moveItem(index, "down")}
                isFirst={index === 0}
                isLast={index === items.length - 1}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Grand Altar Activation Mechanism Button */}
      <div className="pt-2 flex justify-center">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || items.length === 0}
          className={`relative overflow-hidden w-full py-3.5 sm:py-4 px-6 rounded-2xl sm:rounded-3xl font-black text-base sm:text-lg transition-all duration-200 flex items-center justify-center gap-2.5 select-none ${
            !isSubmitting && items.length > 0
              ? "border-3 border-[#fef08a] bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#d97706] text-[#451a03] shadow-[0_8px_0_#78350f,0_0_35px_rgba(245,158,11,0.7)] hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#78350f] cursor-pointer group animate-pulse"
              : "border-2 border-stone-700 bg-stone-900/80 text-stone-500 shadow-none cursor-not-allowed opacity-60"
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/70 to-transparent pointer-events-none rounded-t-2xl" />

          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-stone-950" />
              <span>جاري توجيه مسار الطاقة وفك القفل...</span>
            </>
          ) : (
            <>
              <Key className="w-5 h-5 sm:w-6 sm:h-6 text-[#451a03] group-hover:rotate-12 transition-transform" />
              <span>✦ تَأْكِيدُ تَرْتِيبِ المَسَارِ وَفَتْحُ القُفْلِ ✦</span>
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-[#451a03]" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
