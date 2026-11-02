import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ScheduleItem = {
  id: string;
  caption: string;
  mediaUrls: string[];
  scheduledTime: string;
  destinations: Array<{
    accountId: string;
    platform: string;
    target?: Record<string, unknown>;
  }>;
  status: "planned" | "queued" | "submitted" | "failed";
  topic?: string;
  notes?: string;
  createdAt: string;
  blotatoIds?: string[];
  lastError?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "schedule.json");

async function readAll(): Promise<ScheduleItem[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as ScheduleItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: ScheduleItem[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function listSchedule() {
  const items = await readAll();
  return items.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

export async function addSchedule(item: ScheduleItem) {
  const items = await readAll();
  items.push(item);
  await writeAll(items);
  return item;
}

export async function updateSchedule(id: string, patch: Partial<ScheduleItem>) {
  const items = await readAll();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  items[idx] = { ...items[idx], ...patch };
  await writeAll(items);
  return items[idx];
}

export async function removeSchedule(id: string) {
  const items = await readAll();
  const next = items.filter((i) => i.id !== id);
  await writeAll(next);
  return next.length < items.length;
}
