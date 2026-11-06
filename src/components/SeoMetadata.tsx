import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://www.brain-scince-edecutioun.com";

type PageMetadata = {
  title: string;
  description: string;
  imageAlt: string;
  imageTitle: string;
};

// Content follows the supplied SEO workbook. Image descriptions are used for
// social previews; decorative UI artwork keeps its empty alt text in the page.
const pageMetadata: Record<string, PageMetadata> = {
  "/": {
    title: "منصة الاختبارات والألعاب التعليمية التفاعلية | براين ساينس للتفوق",
    description: "منصة براين ساينس للاختبارات والألعاب العلمية التفاعلية، الفهم القرائي، الشهادات ولوحة الشرف مع المعلمة هيفاء السلمي.",
    imageAlt: "منصة الاختبارات والألعاب التعليمية التفاعلية براين ساينس للتفوق",
    imageTitle: "منصة الاختبارات والألعاب التعليمية التفاعلية | براين ساينس للتفوق",
  },
  "/student/games": {
    title: "مركز التميز والتحفيز العلمي | ألعاب علوم تفاعلية | براين ساينس",
    description: "العب المطابقة وعجلة العلوم ولغز الترتيب وتحدي السرعة ومغامرة الكنز في ألعاب علمية تفاعلية مع المعلمة هيفاء السلمي.",
    imageAlt: "مركز التميز والتحفيز العلمي ألعاب علوم تفاعلية براين ساينس",
    imageTitle: "مركز التميز والتحفيز العلمي | ألعاب علوم تفاعلية | براين ساينس",
  },
  "/student/science-activities": {
    title: "القراءة والاستكشاف | الفهم القرائي والاستنتاج | منصة براين ساينس",
    description: "اقرأ واستنتج في الفهم القرائي، واستكشف الأنشطة والتجارب العلمية المرتبطة بالمجال في منصة براين ساينس.",
    imageAlt: "القراءة والاستكشاف الفهم القرائي والاستنتاج منصة براين ساينس للتفوق",
    imageTitle: "القراءة والاستكشاف | الفهم القرائي والاستنتاج | منصة براين ساينس",
  },
  "/central-exam": {
    title: "الاختبار المركزي الشامل | المعلمة هيفاء السلمي | منصة براين ساينس",
    description: "استعد للاختبار المركزي ونافس بأسئلة تفاعلية وتصحيح فوري. احصل على شهادة تقدير وتابع تقدمك على منصة براين ساينس.",
    imageAlt: "الاختبار المركزي الشامل المعلمة هيفاء السلمي منصة براين ساينس",
    imageTitle: "الاختبار المركزي الشامل | المعلمة هيفاء السلمي | منصة براين ساينس",
  },
  "/central-exam/games": {
    title: "ألعاب التحدي | ألعاب تفاعلية وتعليمية | منصة براين ساينس للتفوق",
    description: "اختر تحديك: عجلة العلوم أو المطابقة أو تحدي السرعة أو مغامرة الكنز، وتعلّم مع المعلمة هيفاء السلمي.",
    imageAlt: "ألعاب التحدي ألعاب تفاعلية وتعليمية منصة براين ساينس للتفوق",
    imageTitle: "ألعاب التحدي | ألعاب تفاعلية وتعليمية | منصة براين ساينس للتفوق",
  },
  "/games/matching": {
    title: "لعبة المطابقة العلمية | طابق المفاهيم بالصور | منصة براين ساينس للتفوق",
    description: "صِل كل مصطلح علمي بصورته المقابلة. لعبة المطابقة تعزز الذكاء البصري وربط المفاهيم عبر 19 مرحلة تفاعلية.",
    imageAlt: "لعبة المطابقة العلمية طابق المفاهيم بالصور منصة براين ساينس للتفوق",
    imageTitle: "لعبة المطابقة العلمية | طابق المفاهيم بالصور | منصة براين ساينس للتفوق",
  },
  "/games/ordering": {
    title: "لغز الترتيب | اختبر فهمك للتسلسل العلمي | منصة براين ساينس للتفوق",
    description: "رتب مراحل الظواهر والخطوات العلمية بالترتيب الصحيح، واختبر تفكيرك المنطقي وفهمك للتسلسل العلمي.",
    imageAlt: "لغز الترتيب اختبر فهمك للتسلسل العلمي منصة براين ساينس للتفوق",
    imageTitle: "لغز الترتيب | اختبر فهمك للتسلسل العلمي | منصة براين ساينس للتفوق",
  },
  "/games/speed": {
    title: "تحدي السرعة العلمي | المعلمة هيفاء السلمي | منصة براين ساينس للتفوق",
    description: "أسئلة سريعة تختبر سرعة بديهتك ودقة معلوماتك تحت ضغط الوقت. أثبت تفوقك في تحدي السرعة العلمي.",
    imageAlt: "تحدي السرعة العلمي المعلمة هيفاء السلمي منصة براين ساينس للتفوق",
    imageTitle: "تحدي السرعة العلمي | المعلمة هيفاء السلمي | منصة براين ساينس للتفوق",
  },
  "/games/wheel": {
    title: "عجلة العلوم | أدر العجلة واختبر معلوماتك | منصة براين ساينس للتفوق",
    description: "أدر عجلة العلوم واختبر معلوماتك في مجالات متنوعة. أجب عن الأسئلة واجمع النقاط والأوسمة مع المعلمة هيفاء السلمي.",
    imageAlt: "عجلة العلوم أدر العجلة واختبر معلوماتك منصة براين ساينس للتفوق",
    imageTitle: "عجلة العلوم | أدر العجلة واختبر معلوماتك | منصة براين ساينس للتفوق",
  },
  "/games/treasure/active": {
    title: "جزيرة الكنز | مغامرة أسرار العلوم | منصة براين ساينس للتفوق",
    description: "ابحث عن المفتاح واجتز تحديات المراحل الثلاث لفتح صندوق الكنز في مغامرة استكشاف علمية مع هيفاء السلمي.",
    imageAlt: "جزيرة الكنز مغامرة أسرار العلوم منصة براين ساينس للتفوق",
    imageTitle: "جزيرة الكنز | مغامرة أسرار العلوم | منصة براين ساينس للتفوق",
  },
};

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function SeoMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.replace(/\/+$/, "") || "/";
    const isPrivateRoute = path === "/student/dashboard"
      || path.startsWith("/admin")
      || path.startsWith("/exam/")
      || path.startsWith("/result/")
      || path === "/central-exam/play";

    if (isPrivateRoute) {
      document.title = "براين ساينس | صفحة الطالب";
      setMeta('meta[name="robots"]', "name", "robots", "noindex,nofollow");
      document.head.querySelector('link[rel="canonical"]')?.remove();
      return;
    }

    const metadata = pageMetadata[path]
      || (/^\/games\/treasure\/[^/]+$/.test(path) ? pageMetadata["/games/treasure/active"] : null);
    if (!metadata) return;

    const canonicalUrl = `${SITE_URL}${path === "/" ? "/" : path}`;
    document.title = metadata.title;
    setMeta('meta[name="description"]', "name", "description", metadata.description);
    setMeta('meta[property="og:title"]', "property", "og:title", metadata.title);
    setMeta('meta[property="og:description"]', "property", "og:description", metadata.description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:image:alt"]', "property", "og:image:alt", metadata.imageAlt);
    setMeta('meta[property="og:image:title"]', "property", "og:image:title", metadata.imageTitle);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", metadata.title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", metadata.description);
    setMeta('meta[name="twitter:image:alt"]', "name", "twitter:image:alt", metadata.imageAlt);
    setMeta('meta[name="robots"]', "name", "robots", "index,follow");

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [pathname]);

  return null;
}
