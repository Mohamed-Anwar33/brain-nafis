/**
 * Utility for parsing and validating video and explanation URLs
 * Supports YouTube, Vimeo, Direct Video files (mp4, webm), and Educational Web Links (e.g. Saudi Ain / Madrasati)
 */

export interface ParsedMedia {
  type: 'youtube' | 'vimeo' | 'direct_video' | 'web_link';
  platformName: string;
  url: string;
  embedUrl?: string;
  isValid: boolean;
}

/**
 * Extracts a URL from an arbitrary text if someone pastes a message containing a link
 */
export function extractUrlFromText(text?: string | null): string | null {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
  return match ? match[0] : null;
}

export function parseExplanationUrl(rawUrl?: string | null): ParsedMedia | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let url = rawUrl.trim();
  if (!url) return null;

  // If text contains a URL inside explanation text, extract it
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const extracted = extractUrlFromText(url);
    if (extracted) {
      url = extracted;
    }
  }

  // Basic URL validation
  let validUrl: URL;
  try {
    validUrl = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`);
  } catch {
    return {
      type: 'web_link',
      platformName: 'رابط خارجي',
      url,
      isValid: false,
    };
  }

  const host = validUrl.hostname.toLowerCase();
  const path = validUrl.pathname;

  // 1. YouTube handling (regular, youtu.be, shorts, embed)
  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    let videoId: string | null = null;

    if (host.includes('youtu.be')) {
      // youtu.be/VIDEO_ID
      videoId = path.replace(/^\//, '').split('?')[0].split('/')[0];
    } else if (path.includes('/shorts/')) {
      // youtube.com/shorts/VIDEO_ID
      videoId = path.split('/shorts/')[1]?.split('?')[0].split('/')[0];
    } else if (path.includes('/embed/')) {
      // youtube.com/embed/VIDEO_ID
      videoId = path.split('/embed/')[1]?.split('?')[0].split('/')[0];
    } else {
      // youtube.com/watch?v=VIDEO_ID
      videoId = validUrl.searchParams.get('v');
    }

    if (videoId) {
      return {
        type: 'youtube',
        platformName: 'يوتيوب التعليمي',
        url: validUrl.href,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
        isValid: true,
      };
    }
  }

  // 2. Vimeo handling
  if (host.includes('vimeo.com')) {
    const vimeoId = path.replace(/^\//, '').split('/')[0];
    if (vimeoId && /^\d+$/.test(vimeoId)) {
      return {
        type: 'vimeo',
        platformName: 'فيميو التعليمي',
        url: validUrl.href,
        embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
        isValid: true,
      };
    }
  }

  // 3. Direct video file (mp4, webm, ogg, m4v)
  const isDirectVideo = /\.(mp4|webm|ogg|m4v|mov)($|\?)/i.test(path);
  if (isDirectVideo) {
    return {
      type: 'direct_video',
      platformName: 'مقطع فيديو مباشر',
      url: validUrl.href,
      embedUrl: validUrl.href,
      isValid: true,
    };
  }

  // 4. Saudi Educational Platforms & Generic Web Links
  let platformName = 'منصة تعليمية';
  if (host.includes('ien.edu.sa') || host.includes('ien')) {
    platformName = 'بوابة عين التعليمية الوطنية';
  } else if (host.includes('madrasati.sa')) {
    platformName = 'منصة مدرستي';
  } else if (host.includes('moe.gov.sa')) {
    platformName = 'وزارة التعليم السعودية';
  }

  return {
    type: 'web_link',
    platformName,
    url: validUrl.href,
    embedUrl: validUrl.href,
    isValid: true,
  };
}
