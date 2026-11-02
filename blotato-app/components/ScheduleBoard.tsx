"use client";

import { useEffect, useState } from "react";
import type { ScheduleItem } from "@/lib/schedule";
import { PLATFORM_LABEL } from "@/lib/platforms";

export function ScheduleBoard() {
  const [items, setItems] = useState<ScheduleItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/schedule");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "โหลดตารางงานไม่สำเร็จ");
      setItems([]);
      return;
    }
    setItems(data.items || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(id: string) {
    setBusy(id);
    const res = await fetch(`/api/schedule/${id}/submit`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setError(data.error || "ส่งไป Blotato ไม่สำเร็จ");
    await load();
    setBusy(null);
  }

  async function remove(id: string) {
    setBusy(id);
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    await load();
    setBusy(null);
  }

  return (
    <div className="card">
      <p className="kicker">ตารางงาน</p>
      <h2>โพสต์ที่วางแผนไว้</h2>
      <p className="hint">
        แคปชันต้องผ่านการตรวจก่อนเข้าตารางนี้ กด “ส่งไป Blotato” เพื่อตั้งเวลาเผยแพร่จริง
      </p>
      {error ? <div className="banner err">{error}</div> : null}
      {items === null ? <p className="muted">กำลังโหลด…</p> : null}
      {items?.length === 0 ? <div className="empty">ยังไม่มีรายการในตารางงาน</div> : null}
      {items?.map((item) => (
        <div className="history-item" key={item.id}>
          <div className="row">
            <strong>{new Date(item.scheduledTime).toLocaleString("th-TH")}</strong>
            <span className="pill">{item.status}</span>
          </div>
          <div>{item.caption}</div>
          <div className="muted">
            {item.destinations
              .map((d) => PLATFORM_LABEL[d.platform] || d.platform)
              .join(" · ")}
          </div>
          {item.lastError ? <div className="banner err">{item.lastError}</div> : null}
          {item.blotatoIds?.length ? (
            <div className="muted">
              Blotato: {item.blotatoIds.map((id) => <code key={id}>{id}</code>)}
            </div>
          ) : null}
          <div className="row">
            <button
              className="btn"
              disabled={busy === item.id || item.status === "submitted"}
              onClick={() => void submit(item.id)}
            >
              {busy === item.id ? "กำลังส่ง…" : "ส่งไป Blotato"}
            </button>
            <button className="btn secondary" disabled={busy === item.id} onClick={() => void remove(item.id)}>
              ลบ
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
