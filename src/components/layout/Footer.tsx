import { Heart } from "lucide-react";

export const Footer = () => {
    return (
        <footer className="w-full py-6 mt-auto bg-slate-50 border-t border-slate-100 relative">
            <div className="sadu-strip absolute top-0 left-0 w-full" />
            <div className="container mx-auto px-4 flex flex-col items-center justify-center gap-2 text-center">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <span>صنع بحب في المملكة العربية السعودية</span>
                    <span className="text-xl">🇸🇦</span>
                    <span className="text-xl">🌴</span>
                </p>
                <p className="text-xs text-slate-400">
                    جميع الحقوق محفوظة © {new Date().getFullYear()} براين نافس
                </p>
            </div>
        </footer>
    );
};
