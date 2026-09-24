"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Flags = {
  blotato: boolean;
  openai: boolean;
  googleConfigured: boolean;
  googleConnected: boolean;
  folderId: string;
  folderUrl: string;
};

export function SettingsForm() {
  const [flags, setFlags] = useState<Flags | null>(null);
  const [blotatoKey, setBlotatoKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [kind, setKind] = useState<"ok" | "err" | "warn">("warn");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [b, o, g] = await Promise.all([
      fetch("/api/session").then((r) => r.json()),
      fetch("/api/openai/session").then((r) => r.json()),
      fetch("/api/google/status").then((r) => r.json()),
    ]);
    setFlags({
      blotato: Boolean(b.connected),
      openai: Boolean(o.connected),
      googleConfigured: Boolean(g.configured),
      googleConnected: Boolean(g.connected),
      folderId: g.folderId || "",
      folderUrl: g.folderUrl || "",
    });
    if (b.error && !b.connected) {
      setKind("err");
      setMsg(b.error);
    }
  }

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    const ge = params.get("google_error");
    if (ge) {
      setKind("err");
      setMsg(`Google OAuth: ${ge}`);
    }
    if (params.get("google") === "missing") {
      setKind("warn");
      setMsg("ยังไม่มี Google client id/secret — กรอกด้านล่างหรือใส่ใน .env.local");
    }
  }, []);

  async function saveBlotato(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: blotatoKey }),
    });
    const data = await res.json();
    setKind(res.ok ? "ok" : "err");
    setMsg(res.ok ? "เชื่อม Blotato สำเร็จ" : data.error || "Blotato ปฏิเสธคีย์");
    if (res.ok) setBlotatoKey("");
    await load();
    setBusy(false);
  }

  async function saveOpenai(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/openai/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: openaiKey }),
    });
    const data = await res.json();
    setKind(res.ok ? "ok" : "err");
    setMsg(res.ok ? "บันทึก OpenAI key แล้ว" : data.error || "บันทึกไม่สำเร็จ");
    if (res.ok) setOpenaiKey("");
    await load();
    setBusy(false);
  }

  async function saveGoogle(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/google/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    const data = await res.json();
    setKind(res.ok ? "ok" : "err");
    setMsg(res.ok ? "บันทึก Google credentials แล้ว — กดเชื่อมบัญชีต่อ" : data.error);
    if (res.ok) {
      setClientId("");
      setClientSecret("");
    }
    await load();
    setBusy(false);
  }

  return (
    <div className="stack">
      {msg ? <div className={`banner ${kind}`}>{msg}</div> : null}

      <section className="card">
        <p className="kicker">Blotato</p>
        <h2>คีย์สำหรับโพสต์</h2>
        <p className="hint">
          {flags?.blotato
            ? "เชื่อมต่อแล้ว — ใช้คีย์จากเซิร์ฟเวอร์หรือที่บันทึกไว้"
            : "ยังไม่พร้อมโพสต์ จนกว่าคีย์จะใช้ได้จริง"}
        </p>
        <form onSubmit={saveBlotato}>
          <label className="field">
            <span>Blotato API key</span>
            <input
              type="password"
              autoComplete="off"
              value={blotatoKey}
              onChange={(e) => setBlotatoKey(e.target.value)}
              placeholder="วางคีย์ — รวมเครื่องหมาย = ท้ายคีย์"
            />
          </label>
          <div className="row">
            <button className="btn" disabled={busy || !blotatoKey.trim()}>
              บันทึกและทดสอบ
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={async () => {
                await fetch("/api/session", { method: "DELETE" });
                await load();
              }}
            >
              ลบคีย์ในเบราว์เซอร์
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <p className="kicker">ChatGPT / OpenAI</p>
        <h2>สร้างแคปชันอัตโนมัติ</h2>
        <p className="hint">
          {flags?.openai
            ? "มีคีย์แล้ว — ปุ่มสร้างแคปชันใช้งานได้"
            : "ยังไม่มีคีย์: พิมพ์แคปชันเองได้ตามปกติ ไม่บล็อกแอป"}
        </p>
        <form onSubmit={saveOpenai}>
          <label className="field">
            <span>OpenAI API key</span>
            <input
              type="password"
              autoComplete="off"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-…"
            />
          </label>
          <div className="row">
            <button className="btn" disabled={busy || !openaiKey.trim()}>
              บันทึกคีย์ OpenAI
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={async () => {
                await fetch("/api/openai/session", { method: "DELETE" });
                await load();
              }}
            >
              ลบคีย์ OpenAI
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <p className="kicker">Google Drive</p>
        <h2>โฟลเดอร์สื่อ</h2>
        <p className="hint">
          โฟลเดอร์เริ่มต้น:{" "}
          <a href={flags?.folderUrl} target="_blank" rel="noreferrer">
            เปิดใน Drive
          </a>
          {flags?.folderId ? (
            <>
              {" "}
              · <code>{flags.folderId}</code>
            </>
          ) : null}
        </p>
        <p className="hint">
          ต้องสร้าง OAuth client ใน Google Cloud (เปิด Drive API) แล้วใส่ Authorized
          redirect URI: <code>http://localhost:3000/api/google/callback</code>
        </p>
        {flags?.googleConnected ? (
          <div className="banner ok">เชื่อม Google แล้ว — เลือกไฟล์จากโฟลเดอร์ได้ในหน้าเขียนโพสต์</div>
        ) : flags?.googleConfigured ? (
          <div className="banner warn">มี credentials แล้ว แต่ยังไม่ได้ OAuth — กดเชื่อมบัญชี</div>
        ) : (
          <div className="banner warn">ยังไม่มี Google client id/secret — กรอกหรือใส่ใน .env.local</div>
        )}
        <form onSubmit={saveGoogle}>
          <label className="field">
            <span>Google client id</span>
            <input value={clientId} onChange={(e) => setClientId(e.target.value)} />
          </label>
          <label className="field">
            <span>Google client secret</span>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </label>
          <div className="row">
            <button className="btn" disabled={busy || !clientId || !clientSecret}>
              บันทึก credentials
            </button>
            <a className="btn secondary" href="/api/google/login">
              เชื่อมบัญชี Google
            </a>
            <button
              className="btn ghost"
              type="button"
              onClick={async () => {
                await fetch("/api/google/status", { method: "DELETE" });
                await load();
              }}
            >
              ยกเลิกการเชื่อม
            </button>
          </div>
        </form>
      </section>

      <Link className="btn" href="/">
        ไปเขียนแคปชัน
      </Link>
    </div>
  );
}
