import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { Download, Printer, Award, X, FileText } from "lucide-react";

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  score: number;
  totalQuestions: number;
  percentage?: number;
  date?: string;
  examTitle?: string;
}

export function CertificateModal({
  isOpen,
  onClose,
  studentName,
  score,
  totalQuestions,
  percentage: customPercentage,
  date,
  examTitle = "الاختبار المركزي - منصة SCIRISE",
}: CertificateModalProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const calculatedPercentage =
    customPercentage !== undefined
      ? customPercentage
      : totalQuestions > 0
        ? Math.round((score / totalQuestions) * 100)
        : 100;

  const currentDate = date || new Date().toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const generatePDF = async (): Promise<jsPDF | null> => {
    if (!certificateRef.current) return null;
    if (document.fonts) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(certificateRef.current, {
      scale: 3, // Ultra-sharp 3x resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 5000,
    });

    const imgData = canvas.toDataURL("image/png", 1.0);
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // A4 landscape dimensions: exactly 297mm x 210mm
    pdf.addImage(imgData, "PNG", 0, 0, 297, 210, undefined, "FAST");
    return pdf;
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("جاري إنشاء ملف PDF بدقة عالية...");

    try {
      const pdf = await generatePDF();
      if (!pdf) throw new Error("تعذر إنشاء ملف PDF");
      const cleanName = (studentName || "طالب").trim().replace(/\s+/g, "_");
      pdf.save(`شهادة_شكر_${cleanName}.pdf`);
      toast.success("تم تحميل ملف PDF بنجاح! 🎓", { id: toastId });
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("حدث خطأ أثناء تحميل ملف PDF", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPNG = async () => {
    if (!certificateRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("جاري توليد الشهادة بدقة فائقة...");

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(certificateRef.current, {
        scale: 3, // Ultra-sharp 3x resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 5000,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const cleanName = (studentName || "طالب").trim().replace(/\s+/g, "_");
      link.download = `شهادة_شكر_${cleanName}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("تم تحميل الشهادة بنجاح! 🎓", { id: toastId });
    } catch (err) {
      console.error("Certificate export error:", err);
      toast.error("حدث خطأ أثناء تحميل الشهادة", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!certificateRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("جاري تجهيز نافذة الطباعة الرسمية...");

    try {
      const pdf = await generatePDF();
      if (!pdf) throw new Error("تعذر تجهيز ملف الطباعة");

      pdf.autoPrint();
      const blobUrl = String(pdf.output("bloburl"));

      // Open print iframe using the native PDF blob (inherits true A4 Landscape)
      const printFrame = document.createElement("iframe");
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      printFrame.src = blobUrl;
      document.body.appendChild(printFrame);

      toast.success("تم تجهيز نافذة الطباعة! 🖨️", { id: toastId });

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch {
          window.open(blobUrl, "_blank");
        }
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 60000);
      }, 500);

    } catch (err) {
      console.error("Print error:", err);
      toast.error("حدث خطأ أثناء فتح الطباعة", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl p-4 sm:p-6 bg-slate-900/95 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl overflow-y-auto max-h-[95vh]" dir="rtl">
        {/* Controls bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 no-print">
          <DialogTitle className="flex items-center gap-2 text-amber-400 font-black text-base sm:text-lg">
            <Award className="w-6 h-6" />
            <span>شهادة شكر وتقدير رسمية</span>
          </DialogTitle>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black shadow-lg shadow-emerald-500/20 text-xs sm:text-sm rounded-xl px-4 py-2"
            >
              <FileText className="w-4 h-4 ml-1.5" />
              <span>تحميل كملف (PDF)</span>
            </Button>

            <Button
              onClick={handleDownloadPNG}
              disabled={isExporting}
              className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black shadow-lg shadow-amber-500/20 text-xs sm:text-sm rounded-xl px-4 py-2"
            >
              <Download className="w-4 h-4 ml-1.5" />
              <span>تحميل كصورة (PNG)</span>
            </Button>

            <Button
              onClick={handlePrint}
              disabled={isExporting}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs sm:text-sm rounded-xl px-4 py-2"
            >
              <Printer className="w-4 h-4 ml-1.5" />
              <span>طباعة فورية (A4)</span>
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white/60 hover:text-white rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Certificate Container Preview */}
        <div className="my-2 flex justify-center overflow-x-auto py-2">
          <div
            ref={certificateRef}
            id="official-print-certificate"
            className="printable-certificate relative w-[860px] h-[590px] bg-[#ffffff] text-slate-900 p-8 rounded-2xl shadow-2xl border-[12px] border-[#1e3a8a] flex flex-col justify-between overflow-hidden select-none"
            style={{
              fontFamily: "'Tajawal', sans-serif",
              backgroundColor: "#ffffff",
              boxSizing: "border-box",
            }}
          >
            {/* Inner Golden Borders */}
            <div className="absolute inset-3 border-2 border-[#d97706] rounded-lg pointer-events-none" />
            <div className="absolute inset-4 border border-[#f59e0b]/40 rounded-lg pointer-events-none" />

            {/* Corner Ornamental Accents */}
            <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-[#d97706] rounded-tr-lg pointer-events-none" />
            <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-[#d97706] rounded-tl-lg pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-[#d97706] rounded-br-lg pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-[#d97706] rounded-bl-lg pointer-events-none" />

            {/* Top Header */}
            <div
              className="relative flex items-center justify-between border-b-2 border-slate-100 pb-3"
              style={{ zIndex: 10 }}
            >
              <div className="text-right space-y-1">
                <p className="text-xs font-bold text-slate-500">المملكة العربية السعودية</p>
                <p className="text-xs font-bold text-slate-500">وزارة التعليم</p>
                <p className="text-sm font-black text-[#1e3a8a]">المتوسطة الثانية والثمانون</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full p-1 bg-white shadow-md border border-slate-100 mb-1 flex items-center justify-center overflow-hidden">
                  <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-[11px] font-black text-[#1e3a8a] tracking-wider">SCIRISE</span>
              </div>

              <div className="text-left space-y-1">
                <p className="text-xs font-bold text-slate-500">منصة SCIRISE التعليمية</p>
                <p className="text-xs font-bold text-slate-500">مادة العلوم</p>
                <p className="text-xs font-bold text-[#d97706]">{currentDate}</p>
              </div>
            </div>

            {/* Certificate Body */}
            <div
              className="relative text-center my-auto space-y-3 py-1"
              style={{ zIndex: 10 }}
            >
              {/* Prestigious Royal Certificate Title - Centered & Clean without background noise */}
              <div style={{ margin: "6px auto 14px auto", textAlign: "center" }}>
                <h1
                  style={{
                    margin: 0,
                    padding: 0,
                    fontSize: "36px",
                    fontWeight: "900",
                    color: "#1e3a8a",
                    letterSpacing: "1.5px",
                    lineHeight: "1.2",
                    fontFamily: "'Tajawal', sans-serif",
                    textAlign: "center"
                  }}
                >
                  شهادة شكر وتقدير
                </h1>
                {/* Elegant Royal Golden Flourish */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    marginTop: "8px"
                  }}
                >
                  <div style={{ width: "90px", height: "2px", background: "linear-gradient(to left, #d97706, transparent)" }} />
                  <span style={{ color: "#d97706", fontSize: "14px", lineHeight: "1" }}>✦</span>
                  <div style={{ width: "90px", height: "2px", background: "linear-gradient(to right, #d97706, transparent)" }} />
                </div>
              </div>

              <p className="text-sm font-bold text-slate-600 leading-relaxed max-w-xl mx-auto pt-1">
                تسر إدارة <span className="text-[#1e3a8a] font-black">المتوسطة الثانية والثمانون</span> ومعلمة المادة الأستاذة / <span className="text-[#1e3a8a] font-black">هيفا السلمي</span>
              </p>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500">أن تمنح الطالب / الطالبة:</p>
                {/* Student Name with comfortable underline spacing */}
                <div style={{ margin: "8px auto 4px auto", textAlign: "center" }}>
                  <div
                    style={{
                      display: "inline-block",
                      borderBottom: "3px solid #d97706",
                      paddingBottom: "8px",
                      paddingLeft: "36px",
                      paddingRight: "36px",
                      minWidth: "300px"
                    }}
                  >
                    <span
                      style={{
                        fontSize: "30px",
                        fontWeight: "900",
                        color: "#1e3a8a",
                        display: "block",
                        lineHeight: "1.4"
                      }}
                    >
                      {studentName || "طالب متميز"}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm font-medium text-slate-700 max-w-2xl mx-auto leading-relaxed">
                هذه الشهادة تقديراً لتميزه وإتمامه بنجاح <span className="font-black text-[#1e3a8a]">{examTitle}</span> وحصوله على نسبة{" "}
                <span
                  style={{
                    display: "inline-block",
                    fontWeight: "900",
                    color: "#047857",
                    backgroundColor: "#ecfdf5",
                    padding: "2px 10px",
                    borderRadius: "6px",
                    border: "1px solid #a7f3d0"
                  }}
                >
                  {calculatedPercentage}%
                </span>
                {totalQuestions > 0 && (
                  <span className="text-slate-600 font-bold mr-1">
                    {" "}بمجموع درجات ({score} من {totalQuestions})
                  </span>
                )}
              </p>

              <p className="text-xs font-bold text-[#d97706] pt-0.5">
                سائلين المولى له دوام التفوق والنجاح والتميز المستمر 🌟
              </p>
            </div>

            {/* Certificate Footer / Signatures */}
            <div
              className="relative grid grid-cols-3 items-end pt-3 border-t-2 border-slate-100"
              style={{ zIndex: 10 }}
            >
              <div className="text-right space-y-1">
                <p className="text-xs font-bold text-slate-500">معلمة مادة العلوم</p>
                <p className="text-sm font-black text-[#1e3a8a]">أ/ هيفا السلمي</p>
                <div className="w-20 h-0.5 bg-slate-300 mt-1" />
              </div>

              {/* Official Gold Seal */}
              <div className="flex justify-center">
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #d97706, #f59e0b, #d97706)",
                    padding: "3px",
                    boxShadow: "0 4px 12px rgba(217, 119, 6, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto"
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      border: "2px dashed #ffffff",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      textAlign: "center"
                    }}
                  >
                    <span style={{ fontSize: "16px", lineHeight: "1" }}>✓</span>
                    <span style={{ fontSize: "9px", fontWeight: "900", lineHeight: "1.2", marginTop: "2px" }}>معتمد رسمياً</span>
                    <span style={{ fontSize: "8px", fontWeight: "700", lineHeight: "1" }}>2026</span>
                  </div>
                </div>
              </div>

              <div className="text-left space-y-1">
                <p className="text-xs font-bold text-slate-500">الختم والاعتماد</p>
                <p className="text-xs font-black text-[#1e3a8a]">إدارة المدرسة</p>
                <div className="w-20 h-0.5 bg-slate-300 mt-1 mr-auto" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
