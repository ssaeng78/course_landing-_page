"use client";

import { useEffect, useState } from "react";
import { PLATFORM_LABEL } from "@/lib/platforms";

type PostItem = Record<string, unknown>;

function asItems(data: unknown): PostItem[] {
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.items)) return o.items as PostItem[];
  if (Array.isArray(data)) return data as PostItem[];
  return [];
}

export function HistoryList() {
  const [items, setItems] = useState<PostItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<unknown>(null);

  useEffect(() => {
    void (async () => {
      const session = await fetch("/api/session").then((r) => r.json());
      if (!session.connected) {
        setError(session.error || "ยังไม่ได้ตั้งค่า API key");
        setItems([]);
        return;
      }
      const res = await fetch("/api/posts?limit=20");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ดึงประวัติไม่สำเร็จ");
        setItems([]);
        return;
      }
      setRaw(data);
      setItems(asItems(data));
    })();
  }, []);

  return (
    <div className="card">
      <p className="kicker">History</p>
      <h2>โพสต์ล่าสุด</h2>
      <p className="hint">ข้อมูลจาก GET /v2/posts ของ Blotato — สถานะจริง ไม่ใช่ค่าจำลอง</p>
      {error ? (
        <div className="banner err">
          {error}{" "}
          <a href="/settings" style={{ textDecoration: "underline" }}>
            ตั้งค่า
          </a>
        </div>
      ) : null}
      {items === null ? <p className="muted">กำลังโหลด…</p> : null}
      {items && items.length === 0 && !error ? (
        <div className="empty">ยังไม่มีรายการ หรือ API ไม่ส่งรายการในรูปแบบที่คาดไว้</div>
      ) : null}
      {items?.map((item, i) => {
        const id = String(item.postSubmissionId || item.id || i);
        const status = String(item.status || "—");
        const platform = String(
          (item.platform as string) ||
            ((item.content as Record<string, unknown> | undefined)?.platform as string) ||
            ((item.target as Record<string, unknown> | undefined)?.targetType as string) ||
            "",
        );
        const text =
          (item.text as string) ||
          ((item.content as Record<string, unknown> | undefined)?.text as string) ||
          "";
        const url = item.publicUrl as string | undefined;
        const err = (item.errorMessage as string) || "";
        return (
          <div className="history-item" key={id}>
            <div className="row">
              <strong>{PLATFORM_LABEL[platform] || platform || "โพสต์"}</strong>
              <span className="pill">{status}</span>
            </div>
            {text ? <div>{text}</div> : null}
            <div className="muted">
              <code>{id}</code>
            </div>
            {url ? (
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            ) : null}
            {err ? <div className="banner err">{err}</div> : null}
          </div>
        );
      })}
      {items && items.length === 0 && raw && !error ? (
        <pre className="muted" style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>
          {JSON.stringify(raw, null, 2).slice(0, 2000)}
        </pre>
      ) : null}
    </div>
  );
}
