export type LabVideoSource =
  | { kind: "iframe"; url: string; externalUrl: string }
  | { kind: "file"; url: string; externalUrl: string }
  | { kind: "invalid"; url: null; externalUrl: null };

/** Convert common watch links into embeddable player URLs without breaking direct video files. */
export function getLabVideoSource(input: string | null | undefined): LabVideoSource {
  if (!input?.trim()) return { kind: "invalid", url: null, externalUrl: null };

  try {
    const parsed = new URL(input.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { kind: "invalid", url: null, externalUrl: null };
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const externalUrl = parsed.toString();

    if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const segments = parsed.pathname.split("/").filter(Boolean);
      const id = host === "youtu.be"
        ? segments[0]
        : parsed.searchParams.get("v") || (segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "live" ? segments[1] : null);
      if (!id || !/^[\w-]{6,}$/.test(id)) return { kind: "invalid", url: null, externalUrl: null };
      return { kind: "iframe", url: `https://www.youtube-nocookie.com/embed/${id}`, externalUrl };
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
      if (!id) return { kind: "invalid", url: null, externalUrl: null };
      return { kind: "iframe", url: `https://player.vimeo.com/video/${id}`, externalUrl };
    }

    if (/\.(mp4|webm|ogg|m4v)(?:$|\?)/i.test(`${parsed.pathname}${parsed.search}`)) {
      return { kind: "file", url: externalUrl, externalUrl };
    }

    return { kind: "iframe", url: externalUrl, externalUrl };
  } catch {
    return { kind: "invalid", url: null, externalUrl: null };
  }
}
