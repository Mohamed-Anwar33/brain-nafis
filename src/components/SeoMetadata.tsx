import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://www.brain-scince-edecutioun.com";

type PageMetadata = { title: string; description: string };

const pageMetadata: Record<string, PageMetadata> = {
  "/": {
    title: "اختبارات وألعاب تعليمية تفاعلية | براين ساينس",
    description: "اختبارات وألعاب علمية تفاعلية، فهم قرائي وتجارب افتراضية، مع شهادات تقدير ومتابعة تقدم الطلاب على منصة براين ساينس.",
  },
  "/student/games": {
    title: "ألعاب علوم تفاعلية للطلاب | براين ساينس",
    description: "العب المطابقة وعجلة العلوم ولغز الترتيب وتحدي السرعة ومغامرة الكنز، وتعلّم المفاهيم العلمية بأسلوب تفاعلي ممتع.",
  },
  "/student/science-activities": {
    title: "القراءة العلمية والتجارب الافتراضية | براين ساينس",
    description: "اقرأ نصوصًا علمية مرتبطة بالمجال، واستكشف التجارب الافتراضية، ثم أجب عن الأسئلة وتابع فهمك.",
  },
  "/central-exam": {
    title: "الاختبار المركزي ونافس | منصة براين ساينس",
    description: "استعد للاختبارات المركزية ونافس بأسئلة تفاعلية وتصحيح فوري، وتابع نتائجك وتقدمك على منصة براين ساينس.",
  },
  "/central-exam/games": {
    title: "ألعاب الاختبار المركزي | براين ساينس",
    description: "تدرّب للاختبار المركزي ونافس عبر عجلة العلوم والمطابقة وتحديات السرعة ومغامرة الكنز.",
  },
  "/games/matching": {
    title: "لعبة المطابقة العلمية | براين ساينس",
    description: "طابق المصطلحات العلمية مع صورها، ودرّب مهارات الملاحظة وربط المفاهيم عبر مراحل تفاعلية.",
  },
  "/games/ordering": {
    title: "لغز الترتيب العلمي | براين ساينس",
    description: "رتّب خطوات الظواهر والمراحل العلمية بالترتيب الصحيح، واختبر فهمك ومهاراتك المنطقية.",
  },
  "/games/speed": {
    title: "تحدي السرعة العلمي | براين ساينس",
    description: "أجب عن أسئلة العلوم بسرعة ودقة، وتحدَّ الوقت لتطوير معرفتك ومهاراتك العلمية.",
  },
  "/games/wheel": {
    title: "عجلة العلوم | أسئلة وتحديات تفاعلية | براين ساينس",
    description: "أدر عجلة العلوم وأجب عن أسئلة في مجالات متنوعة، واجمع النقاط والأوسمة خلال اللعب.",
  },
  "/games/treasure/active": {
    title: "مغامرة الكنز العلمي | براين ساينس",
    description: "اجتز مراحل المغامرة وحل التحديات العلمية لفتح الأقفال والوصول إلى كنز المعرفة.",
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
      || (/^\/games\/treasure\/[^/]+$/.test(path) ? {
        title: "مغامرة الكنز العلمي | براين ساينس",
        description: "اجتز مراحل المغامرة وحل التحديات العلمية لفتح الأقفال والوصول إلى كنز المعرفة.",
      } : null);
    if (!metadata) return;

    const canonicalUrl = `${SITE_URL}${path === "/" ? "/" : path}`;
    document.title = metadata.title;
    setMeta('meta[name="description"]', "name", "description", metadata.description);
    setMeta('meta[property="og:title"]', "property", "og:title", metadata.title);
    setMeta('meta[property="og:description"]', "property", "og:description", metadata.description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", metadata.title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", metadata.description);
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
