import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const footerKeys = [
    "footer_topic_teacher_title",
    "footer_topic_teacher_body",
    "footer_topic_platform_title",
    "footer_topic_platform_body",
] as const;

type FooterContent = Record<(typeof footerKeys)[number], string>;

const defaultFooterContent: FooterContent = {
    footer_topic_teacher_title: "عن المعلم أو المعلمة",
    footer_topic_teacher_body: "",
    footer_topic_platform_title: "عن براين ساينس",
    footer_topic_platform_body: "",
};

export const Footer = () => {
    const location = useLocation();
    const [content, setContent] = useState<FooterContent>(defaultFooterContent);

    useEffect(() => {
        let active = true;
        const loadContent = () => {
            void supabase.from("app_settings").select("key,value").in("key", [...footerKeys]).then(({ data, error }) => {
                if (error) {
                    console.warn("Could not load public footer sections:", error);
                    return;
                }
                if (!active) return;
                setContent((current) => ({ ...current, ...Object.fromEntries((data || []).map((row) => [row.key, row.value || ""])) }));
            });
        };
        loadContent();
        window.addEventListener("footer-content-updated", loadContent);
        return () => {
            active = false;
            window.removeEventListener("footer-content-updated", loadContent);
        };
    }, []);

    const isStudentExam = location.pathname.startsWith("/exam/") || location.pathname === "/central-exam/play";
    const showFooterContent = !isStudentExam && Boolean(
        content.footer_topic_teacher_body.trim() || content.footer_topic_platform_body.trim(),
    );
    return (
        <footer className="w-full py-4 mt-auto bg-white/80 backdrop-blur-xl border-t border-slate-200/60 relative select-none">
            <div className="sadu-strip absolute top-0 left-0 w-full" />
            {showFooterContent && (
                <div className="container mx-auto px-4 pb-4">
                    <div className="grid gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-4 shadow-sm sm:grid-cols-2 sm:gap-6 sm:p-5">
                        {content.footer_topic_teacher_body.trim() && (
                            <section className="space-y-1 text-right">
                                <h2 className="font-black text-slate-800">{content.footer_topic_teacher_title || "عن المعلم أو المعلمة"}</h2>
                                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{content.footer_topic_teacher_body}</p>
                            </section>
                        )}
                        {content.footer_topic_platform_body.trim() && (
                            <section className="space-y-1 border-slate-100 text-right sm:border-r sm:pr-6">
                                <h2 className="font-black text-slate-800">{content.footer_topic_platform_title || "عن براين ساينس"}</h2>
                                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{content.footer_topic_platform_body}</p>
                            </section>
                        )}
                    </div>
                </div>
            )}
            {!location.pathname.startsWith("/admin") && (
                <div className="container mx-auto px-4 pb-4 flex justify-center">
                    <Link
                        to="/student/dashboard"
                        className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-2xl border-2 border-slate-200/90 bg-white/95 px-6 font-black text-sm text-slate-700 shadow-sm transition-all hover:border-indigo-300 hover:bg-slate-50 hover:text-indigo-600 hover:shadow-md active:scale-95"
                    >
                        <span>العودة لاختيار المسار التعليمي</span>
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            )}
            <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
                <p className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
                    <span>صنع بإتقان في المملكة العربية السعودية</span>
                    <span className="text-base">🇸🇦</span>
                    <span className="text-base">🌴</span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-bold text-slate-500">
                    <span>المعلمة: أ/ هيفاء السلمي</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[#1e3a8a] font-black">منصة براين ساينس للتفوق © جميع الحقوق محفوظة</span>
                </div>
            </div>
        </footer>
    );
};
