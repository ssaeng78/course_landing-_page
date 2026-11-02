export type DrivePlanRow = {
  index: number;
  date?: string;
  time?: string;
  scheduledTime?: string;
  caption?: string;
  topic?: string;
  imageName?: string;
  matchedImage?: string | null;
  platform?: string;
  raw: Record<string, string>;
};

const IMAGE_KEYS = ["image", "filename", "file", "photo", "รูป", "ไฟล์", "ภาพ", "pic"];
const DATE_KEYS = ["date", "day", "วันที่", "วัน"];
const TIME_KEYS = ["time", "เวลา"];
const CAPTION_KEYS = ["caption", "text", "message", "แคปชัน", "ข้อความ", "content"];
const TOPIC_KEYS = ["topic", "title", "หัวข้อ", "เรื่อง"];
const PLATFORM_KEYS = ["platform", "แพลตฟอร์ม", "ช่องทาง"];

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

function pick(row: Record<string, string>, keys: string[]) {
  const entries = Object.entries(row);
  for (const key of keys) {
    const hit = entries.find(([k]) => norm(k) === norm(key) || norm(k).includes(norm(key)));
    if (hit && hit[1].trim()) return hit[1].trim();
  }
  return "";
}

function excelDateToIso(value: string): string | undefined {
  if (!value) return undefined;
  const asNum = Number(value);
  if (!Number.isNaN(asNum) && asNum > 20000 && asNum < 80000) {
    const utc = Date.UTC(1899, 11, 30) + Math.round(asNum * 86400000);
    return new Date(utc).toISOString();
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return undefined;
}

export function matchImageName(hint: string, rootImages: string[]): string | null {
  if (!hint) return null;
  const h = hint.trim().toLowerCase();
  const exact = rootImages.find((n) => n.toLowerCase() === h);
  if (exact) return exact;
  const noExt = h.replace(/\.[a-z0-9]+$/, "");
  const byStem = rootImages.find((n) => n.toLowerCase().replace(/\.[a-z0-9]+$/, "") === noExt);
  if (byStem) return byStem;
  const contains = rootImages.find((n) => n.toLowerCase().includes(noExt) || noExt.includes(n.toLowerCase().replace(/\.[a-z0-9]+$/, "")));
  return contains || null;
}

export function pickScheduleWorkbook(names: string[]): string | null {
  const xlsx = names.filter((n) => /\.xlsx?$/i.test(n));
  if (!xlsx.length) return null;
  const updated = xlsx.filter((n) => /updated/i.test(n) && /2026/.test(n));
  if (updated.length) {
    return updated.sort((a, b) => b.localeCompare(a))[0];
  }
  const named = xlsx.filter((n) => /posting_schedule/i.test(n));
  return (named[0] || xlsx[0]) ?? null;
}

export function parseScheduleSheet(
  rows: Record<string, string>[],
  rootImages: string[],
): DrivePlanRow[] {
  return rows
    .map((raw, index) => {
      const imageHint = pick(raw, IMAGE_KEYS);
      const date = pick(raw, DATE_KEYS);
      const time = pick(raw, TIME_KEYS);
      const caption = pick(raw, CAPTION_KEYS);
      const topic = pick(raw, TOPIC_KEYS);
      const platform = pick(raw, PLATFORM_KEYS);
      const scheduledTime = excelDateToIso(date && time ? `${date} ${time}` : date);
      const matchedImage = matchImageName(imageHint, rootImages) || guessImageFromText(`${imageHint} ${caption} ${topic}`, rootImages);
      return {
        index,
        date: date || undefined,
        time: time || undefined,
        scheduledTime,
        caption: caption || undefined,
        topic: topic || undefined,
        imageName: imageHint || matchedImage || undefined,
        matchedImage,
        platform: platform || undefined,
        raw,
      };
    })
    .filter((row) => row.caption || row.topic || row.imageName || row.date);
}

function guessImageFromText(text: string, rootImages: string[]): string | null {
  const t = text.toLowerCase();
  return rootImages.find((n) => t.includes(n.toLowerCase().replace(/\.[a-z0-9]+$/, ""))) || null;
}

export const KNOWN_ROOT_FILES = [
  "posting_schedule_dhamma_pic.xlsx",
  "posting_schedule_dhamma_pic_updated_2026.xlsx",
  "21_09B.jpg",
  "21_09A.jpg",
];
