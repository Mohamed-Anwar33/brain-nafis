import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to load .env manually if dotenv is not installed
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const localEnv = loadEnv();
const SITE_URL = (
  process.argv[2] ||
  process.env.SITE_URL ||
  process.env.VITE_SITE_URL ||
  localEnv.SITE_URL ||
  localEnv.VITE_SITE_URL ||
  'https://www.brain-scince-edecutioun.com'
).replace(/\/+$/, '');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || localEnv.VITE_SUPABASE_URL || "https://cyhssotgsllqaxrrhrsj.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || localEnv.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHNzb3Rnc2xscWF4cnJocnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzODEsImV4cCI6MjA4NTI4NDM4MX0.BLRrPiuDOrBHDuoH_8Xrwjo6aFRycHqxs7edJeXeo1c";

const today = new Date().toISOString().split('T')[0];

// 1. Static Public Pages
const staticRoutes = [
  { path: '', priority: '1.0', changefreq: 'daily', title: 'الرئيسية' },
  { path: '/student/dashboard', priority: '0.9', changefreq: 'daily', title: 'لوحة تحكم الطالب' },
  { path: '/student/games', priority: '0.9', changefreq: 'weekly', title: 'مركز الألعاب التعليمية' },
  { path: '/student/science-activities', priority: '0.8', changefreq: 'weekly', title: 'الأنشطة والتجارب العلمية' },
  { path: '/central-exam', priority: '0.9', changefreq: 'weekly', title: 'الاختبارات المركزية' },
  { path: '/central-exam/games', priority: '0.8', changefreq: 'weekly', title: 'ألعاب التحدي المركزي' },
  { path: '/games/matching', priority: '0.8', changefreq: 'weekly', title: 'لعبة المطابقة العلمية' },
  { path: '/games/ordering', priority: '0.8', changefreq: 'weekly', title: 'لعبة الترتيب والتصنيف' },
  { path: '/games/speed', priority: '0.8', changefreq: 'weekly', title: 'تحدي السرعة' },
  { path: '/games/wheel', priority: '0.8', changefreq: 'weekly', title: 'عجلة الحظ والأسئلة' },
  { path: '/games/treasure/active', priority: '0.8', changefreq: 'weekly', title: 'مغامرات كنز العلوم' }
];

async function fetchDynamicRoutes() {
  const dynamicRoutes = [];
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Fetch published treasure adventures
    const { data: adventures, error } = await supabase
      .from('treasure_adventures')
      .select('id, updated_at, status')
      .eq('status', 'published');

    if (!error && adventures && adventures.length > 0) {
      for (const adv of adventures) {
        dynamicRoutes.push({
          path: `/games/treasure/${adv.id}`,
          priority: '0.7',
          changefreq: 'weekly',
          lastmod: adv.updated_at ? adv.updated_at.split('T')[0] : today
        });
      }
    }
  } catch (err) {
    console.warn('⚠️ Note: Could not fetch dynamic routes from Supabase, using static routes:', err.message);
  }
  return dynamicRoutes;
}

function buildSitemapXml(urls) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
  xml += `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n`;
  xml += `        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`;

  for (const item of urls) {
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}${item.path}</loc>\n`;
    xml += `    <lastmod>${item.lastmod || today}</lastmod>\n`;
    xml += `    <changefreq>${item.changefreq || 'weekly'}</changefreq>\n`;
    xml += `    <priority>${item.priority || '0.7'}</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

function buildRobotsTxt() {
  return `# Robots.txt for Brain Science Educational Platform
# Technical SEO: Crawl control & Sitemap definition
# Website: ${SITE_URL}

User-agent: *
Allow: /

# Disallow Private & Administrative Areas
Disallow: /admin/
Disallow: /admin/*

# Disallow Student Dynamic Session Pages (Non-indexable user state)
Disallow: /exam/
Disallow: /exam/*
Disallow: /result/
Disallow: /result/*
Disallow: /central-exam/play

# Search Engine Crawlers
User-agent: Googlebot
Allow: /
Disallow: /admin/
Disallow: /exam/
Disallow: /result/

User-agent: Bingbot
Allow: /
Disallow: /admin/
Disallow: /exam/
Disallow: /result/

# Sitemap Location
Sitemap: ${SITE_URL}/sitemap.xml
`;
}

async function generate() {
  console.log(`\n🚀 Starting Technical SEO Generator for ${SITE_URL}...`);

  const dynamicRoutes = await fetchDynamicRoutes();
  const allRoutes = [...staticRoutes, ...dynamicRoutes];

  const sitemapContent = buildSitemapXml(allRoutes);
  const robotsContent = buildRobotsTxt();

  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  const robotsPath = path.join(publicDir, 'robots.txt');

  fs.writeFileSync(sitemapPath, sitemapContent, 'utf-8');
  fs.writeFileSync(robotsPath, robotsContent, 'utf-8');

  console.log(`✅ Generated sitemap.xml with ${allRoutes.length} URLs at: ${sitemapPath}`);
  console.log(`✅ Generated robots.txt at: ${robotsPath}`);

  // Also sync to dist if dist exists (e.g. post-build or dev environment)
  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapContent, 'utf-8');
    fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsContent, 'utf-8');
    console.log(`✅ Synced sitemap.xml and robots.txt to: ${distDir}`);
  }

  console.log(`🎉 Technical SEO files created successfully!\n`);
}

generate().catch(err => {
  console.error('❌ Error generating SEO files:', err);
  process.exit(1);
});
