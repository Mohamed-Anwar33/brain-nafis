export const Footer = () => {
    return (
        <footer className="w-full py-5 mt-auto bg-white/80 backdrop-blur-xl border-t border-slate-200/60 relative select-none">
            <div className="sadu-strip absolute top-0 left-0 w-full" />
            <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
                <p className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
                    <span>صنع بإتقان في المملكة العربية السعودية</span>
                    <span className="text-base">🇸🇦</span>
                    <span className="text-base">🌴</span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-bold text-slate-500">
                    <span>المتوسطة الثانية والثمانون</span>
                    <span className="text-slate-300">•</span>
                    <span>المعلمة: أ/ هيفا السلمي</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[#1e3a8a] font-black">منصة SCIRISE 2026</span>
                </div>
            </div>
        </footer>
    );
};
