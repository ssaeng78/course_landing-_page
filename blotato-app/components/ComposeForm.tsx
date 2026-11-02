"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultTarget, needsSubaccounts, PLATFORM_LABEL } from "@/lib/platforms";

type Account = {
  id: string;
  platform: string;
  fullname?: string;
  username?: string;
  name?: string;
};
type Subaccount = { id: string; name?: string };
type DriveFile = { id: string; name: string; mimeType: string };
type PlanRow = {
  index: number;
  date?: string;
  caption?: string;
  topic?: string;
  imageName?: string;
  matchedImage?: string | null;
  scheduledTime?: string;
};

type DestState = {
  selected: boolean;
  pageId: string;
  facebookMediaType: string;
  instagramMediaType: string;
  tiktokPrivacy: string;
  tiktokCommentsOff: boolean;
  tiktokAi: boolean;
};

const emptyDest = (): DestState => ({
  selected: false,
  pageId: "",
  facebookMediaType: "",
  instagramMediaType: "reel",
  tiktokPrivacy: "PUBLIC_TO_EVERYONE",
  tiktokCommentsOff: false,
  tiktokAi: false,
});

type Step = "caption" | "review" | "schedule";

export function ComposeForm() {
  const [step, setStep] = useState<Step>("caption");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [openaiOn, setOpenaiOn] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dest, setDest] = useState<Record<string, DestState>>({});
  const [subs, setSubs] = useState<Record<string, Subaccount[]>>({});

  const [topic, setTopic] = useState("");
  const [outline, setOutline] = useState("");
  const [tone, setTone] = useState("อบอุ่น สุภาพ");
  const [length, setLength] = useState("medium");
  const [caption, setCaption] = useState("");
  const [captionConfirmed, setCaptionConfirmed] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");

  const [drive, setDrive] = useState<{
    configured: boolean;
    connected: boolean;
    folderId: string;
    folderUrl: string;
  } | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [workbookName, setWorkbookName] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  const [mode, setMode] = useState<"now" | "schedule">("schedule");
  const [scheduledTime, setScheduledTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [results, setResults] = useState<Array<Record<string, unknown>> | null>(null);

  const load = useCallback(async () => {
    const [session, openai, g] = await Promise.all([
      fetch("/api/session").then((r) => r.json()),
      fetch("/api/openai/session").then((r) => r.json()),
      fetch("/api/google/status").then((r) => r.json()),
    ]);
    setOpenaiOn(Boolean(openai.connected));
    setDrive({
      configured: Boolean(g.configured),
      connected: Boolean(g.connected),
      folderId: g.folderId,
      folderUrl: g.folderUrl,
    });
    if (!session.connected) {
      setConnected(false);
      return;
    }
    setConnected(true);
    const accRes = await fetch("/api/accounts");
    const accData = await accRes.json();
    const list = (accData.items || []) as Account[];
    setAccounts(Array.isArray(list) ? list : []);
    setDest((prev) => {
      const next = { ...prev };
      for (const a of list) if (!next[a.id]) next[a.id] = emptyDest();
      return next;
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadDrivePlan() {
    setDriveError(null);
    const res = await fetch("/api/google/plan");
    const data = await res.json();
    if (!res.ok) {
      setDriveError(data.error || "เปิดโฟลเดอร์ Drive ไม่ได้");
      setFiles([]);
      setPlanRows([]);
      return;
    }
    setFiles(data.images || data.files || []);
    setPlanRows(data.rows || []);
    setWorkbookName(data.workbookName || null);
    if (data.parseError) setDriveError(data.parseError);
    setInfo(
      data.workbookName
        ? `ใช้ไฟล์ตาราง ${data.workbookName} และรูปใน root`
        : "ยังไม่พบไฟล์ Excel ตารางงานใน root",
    );
  }

  async function usePlanRow(row: PlanRow) {
    setStep("caption");
    setCaptionConfirmed(false);
    setTopic(row.topic || row.imageName || "โพสต์จากตารางงาน");
    setOutline(
      [row.caption, row.matchedImage ? `รูป: ${row.matchedImage}` : "", row.date ? `วันที่ในตาราง: ${row.date}` : ""]
        .filter(Boolean)
        .join("\n"),
    );
    if (row.caption) setCaption(row.caption);
    if (row.scheduledTime) {
      const d = new Date(row.scheduledTime);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduledTime(local);
    }
    const image = files.find((f) => f.name === row.matchedImage || f.name === row.imageName);
    if (image) await attachDrive(image);
    setInfo("เลือกแถวจากตารางแล้ว — ตรวจแคปชันก่อนตั้งโพสต์");
  }

  async function generate() {
    setBusy(true);
    setFormError(null);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, outline, tone, length }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error || "สร้างแคปชันไม่สำเร็จ");
    } else {
      setCaption(data.caption);
      setCaptionConfirmed(false);
      setInfo("ได้แคปชันจาก OpenAI แล้ว — ตรวจและแก้ก่อนตั้งโพสต์");
    }
    setBusy(false);
  }

  async function attachDrive(file: DriveFile) {
    setBusy(true);
    setFormError(null);
    const res = await fetch("/api/google/attach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(file),
    });
    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error || "แนบไฟล์ไม่สำเร็จ");
    } else if (data.kind === "text") {
      setOutline((o) => [o, `\n--- ${data.name} ---\n${data.text}`].join("").trim());
      setInfo(`ดึงข้อความจาก ${data.name} เป็นร่างงานแล้ว`);
    } else if (data.publicUrl) {
      setMediaUrls((u) => [...u, data.publicUrl]);
      setInfo(`แนบสื่อ ${data.name} แล้ว`);
    }
    setBusy(false);
  }

  function goReview() {
    if (!caption.trim()) {
      setFormError("ต้องมีแคปชันก่อน — พิมพ์เองหรือกดสร้างแคปชัน");
      return;
    }
    setFormError(null);
    setStep("review");
  }

  function confirmCaption() {
    if (!caption.trim()) return;
    setCaptionConfirmed(true);
    setStep("schedule");
  }

  function patchDest(id: string, patch: Partial<DestState>) {
    setDest((prev) => ({ ...prev, [id]: { ...(prev[id] ?? emptyDest()), ...patch } }));
  }

  async function toggleAccount(account: Account) {
    const current = dest[account.id] ?? emptyDest();
    const selected = !current.selected;
    patchDest(account.id, { selected });
    if (selected && needsSubaccounts(account.platform) && !subs[account.id]) {
      const res = await fetch(`/api/accounts/${account.id}/subaccounts`);
      const data = await res.json();
      const items = (data.items || []) as Subaccount[];
      setSubs((s) => ({ ...s, [account.id]: items }));
      if (account.platform === "facebook" && items[0]) {
        patchDest(account.id, { selected: true, pageId: items[0].id });
      }
    }
  }

  const selectedAccounts = useMemo(
    () => accounts.filter((a) => dest[a.id]?.selected),
    [accounts, dest],
  );

  function buildTarget(account: Account): Record<string, unknown> {
    const d = dest[account.id] ?? emptyDest();
    const target = defaultTarget(account.platform);
    if (account.platform === "facebook") {
      target.pageId = d.pageId;
      if (d.facebookMediaType) target.mediaType = d.facebookMediaType;
    }
    if (account.platform === "linkedin" && d.pageId) target.pageId = d.pageId;
    if (account.platform === "instagram" && d.instagramMediaType) {
      target.mediaType = d.instagramMediaType;
    }
    if (account.platform === "tiktok") {
      target.privacyLevel = d.tiktokPrivacy;
      target.disabledComments = d.tiktokCommentsOff;
      target.isAiGenerated = d.tiktokAi;
    }
    return target;
  }

  function destinations() {
    return selectedAccounts.map((a) => ({
      accountId: a.id,
      platform: a.platform,
      target: buildTarget(a),
    }));
  }

  async function saveToCalendar() {
    if (!captionConfirmed) {
      setFormError("ต้องตรวจแคปชันก่อนตั้งโพสต์");
      return;
    }
    if (!scheduledTime) {
      setFormError("เลือกวันเวลาในตารางงาน");
      return;
    }
    if (selectedAccounts.length === 0) {
      setFormError("เลือกบัญชีปลายทาง");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption,
        mediaUrls,
        scheduledTime: new Date(scheduledTime).toISOString(),
        destinations: destinations(),
        topic,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setFormError(data.error || "บันทึกตารางงานไม่สำเร็จ");
      return;
    }
    setInfo("บันทึกในตารางงานแล้ว — ส่งไป Blotato ได้จากหน้านั้น");
    window.location.href = "/schedule";
  }

  async function publishNow() {
    if (!captionConfirmed) {
      setFormError("ต้องตรวจแคปชันก่อนโพสต์");
      return;
    }
    if (selectedAccounts.length === 0) {
      setFormError("เลือกบัญชีปลายทาง");
      return;
    }
    for (const a of selectedAccounts) {
      if (a.platform === "facebook" && !dest[a.id]?.pageId) {
        setFormError("Facebook ต้องเลือกเพจ");
        return;
      }
    }
    setBusy(true);
    setResults(null);
    const payload = {
      text: caption,
      mediaUrls,
      destinations: destinations(),
      scheduledTime:
        mode === "schedule" && scheduledTime
          ? new Date(scheduledTime).toISOString()
          : undefined,
    };
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok && !data.results) {
      setFormError(data.error || "ส่งโพสต์ไม่สำเร็จ");
      return;
    }
    setResults(data.results || []);
    setInfo("ส่งคำขอไป Blotato แล้ว — ดูสถานะด้านล่าง");
  }

  if (connected === false) {
    return (
      <div className="card">
        <h2>ยังไม่ได้เชื่อม Blotato</h2>
        <p className="hint">ใส่คีย์ที่หน้าตั้งค่า หรือในไฟล์ .env.local ก่อนโพสต์จริง</p>
        <a className="btn" href="/settings">
          ไปตั้งค่า
        </a>
      </div>
    );
  }

  return (
    <div className="grid compose-grid">
      <section className="card">
        <ol className="steps">
          <li className={step === "caption" ? "on" : ""}>1. แคปชัน</li>
          <li className={step === "review" ? "on" : ""}>2. ตรวจแคปชัน</li>
          <li className={step === "schedule" ? "on" : ""}>3. ตั้งโพสต์</li>
        </ol>
        {formError ? <div className="banner err">{formError}</div> : null}
        {info ? <div className="banner ok">{info}</div> : null}

        {step === "caption" ? (
          <>
            <p className="kicker">ขั้นที่ 1</p>
            <h2>เขียน / สร้างแคปชันก่อน</h2>
            <p className="hint">ยังไม่ตั้งโพสต์ในขั้นนี้ — ต้องมีแคปชันที่อ่านได้ก่อน</p>
            <label className="field">
              <span>หัวข้อ</span>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="เช่น กิจกรรมวันอาทิตย์" />
            </label>
            <label className="field">
              <span>ร่างงาน / เอาท์ไลน์ (ถ้ามี)</span>
              <textarea
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                placeholder="จุดที่อยากให้พูดถึง…"
                style={{ minHeight: 90 }}
              />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                <span>โทน</span>
                <input value={tone} onChange={(e) => setTone(e.target.value)} />
              </label>
              <label className="field" style={{ width: 150, marginBottom: 0 }}>
                <span>ความยาว</span>
                <select value={length} onChange={(e) => setLength(e.target.value)}>
                  <option value="short">สั้น</option>
                  <option value="medium">กลาง</option>
                  <option value="long">ยาว</option>
                </select>
              </label>
            </div>
            <div className="row" style={{ margin: "0.8rem 0" }}>
              <button className="btn" type="button" disabled={busy || !openaiOn} onClick={() => void generate()}>
                {busy ? "กำลังสร้าง…" : "สร้างแคปชันด้วย ChatGPT"}
              </button>
              {!openaiOn ? (
                <a className="btn ghost" href="/settings">
                  ยังไม่มี OpenAI key
                </a>
              ) : null}
            </div>
            <label className="field">
              <span>แคปชัน (แก้ได้)</span>
              <textarea
                value={caption}
                onChange={(e) => {
                  setCaption(e.target.value);
                  setCaptionConfirmed(false);
                }}
                placeholder="พิมพ์แคปชันที่นี่ ถ้ายังไม่มีคีย์ OpenAI"
              />
            </label>
            <div className="label">สื่อ</div>
            <div className="row">
              <input
                type="url"
                placeholder="URL สาธารณะ"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  if (urlInput.trim()) {
                    setMediaUrls((u) => [...u, urlInput.trim()]);
                    setUrlInput("");
                  }
                }}
              >
                เพิ่ม URL
              </button>
              <label className="btn secondary" style={{ cursor: "pointer" }}>
                อัปโหลดไฟล์
                <input
                  type="file"
                  hidden
                  accept="image/*,video/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    const fd = new FormData();
                    fd.set("file", f);
                    setBusy(true);
                    const res = await fetch("/api/media", { method: "POST", body: fd });
                    const data = await res.json();
                    setBusy(false);
                    if (!res.ok) setFormError(data.error);
                    else setMediaUrls((u) => [...u, data.publicUrl]);
                  }}
                />
              </label>
            </div>
            <div className="media-list">
              {mediaUrls.map((u, i) => (
                <div className="media-item" key={`${u}-${i}`}>
                  <span>{u}</span>
                  <button className="btn ghost" type="button" onClick={() => setMediaUrls((l) => l.filter((_, j) => j !== i))}>
                    ลบ
                  </button>
                </div>
              ))}
            </div>
            <button className="btn" type="button" onClick={goReview}>
              ไปตรวจแคปชัน
            </button>
          </>
        ) : null}

        {step === "review" ? (
          <>
            <p className="kicker">ขั้นที่ 2</p>
            <h2>ตรวจแคปชันก่อนตั้งโพสต์</h2>
            <div className="preview">{caption}</div>
            {mediaUrls.length ? (
              <p className="muted">สื่อ {mediaUrls.length} ไฟล์</p>
            ) : (
              <p className="muted">ยังไม่มีสื่อแนบ</p>
            )}
            <label className="field">
              <span>แก้ครั้งสุดท้าย</span>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} />
            </label>
            <div className="row">
              <button className="btn secondary" type="button" onClick={() => setStep("caption")}>
                กลับไปแก้
              </button>
              <button className="btn" type="button" onClick={confirmCaption}>
                ยืนยันแคปชัน แล้วไปตั้งโพสต์
              </button>
            </div>
          </>
        ) : null}

        {step === "schedule" ? (
          <>
            <p className="kicker">ขั้นที่ 3</p>
            <h2>ตั้งโพสต์ / ตารางงาน</h2>
            <div className="preview">{caption}</div>
            <p className="muted">แคปชันนี้ผ่านการตรวจแล้ว</p>
            <div className="row" style={{ margin: "0.8rem 0" }}>
              <label className="checkbox">
                <input type="radio" checked={mode === "now"} onChange={() => setMode("now")} />
                โพสต์ทันทีทาง Blotato
              </label>
              <label className="checkbox">
                <input type="radio" checked={mode === "schedule"} onChange={() => setMode("schedule")} />
                ลงตารางงาน
              </label>
            </div>
            {mode === "schedule" ? (
              <label className="field">
                <span>วันและเวลา</span>
                <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
              </label>
            ) : null}
            <div className="row">
              <button className="btn secondary" type="button" onClick={() => setStep("review")}>
                กลับไปแก้แคปชัน
              </button>
              {mode === "schedule" ? (
                <button className="btn" type="button" disabled={busy || !captionConfirmed} onClick={() => void saveToCalendar()}>
                  ตั้งโพสต์ในตารางงาน
                </button>
              ) : null}
              <button className="btn" type="button" disabled={busy || !captionConfirmed} onClick={() => void publishNow()}>
                {mode === "schedule" ? "ตั้งเวลาที่ Blotato เลย" : "โพสต์ผ่าน Blotato"}
              </button>
            </div>
            {results ? (
              <div style={{ marginTop: "1rem" }}>
                {results.map((r, i) => (
                  <div className="status-card" key={i}>
                    <strong>{String(r.platform)}</strong>
                    <div className="muted">{r.ok ? "รับคำขอแล้ว" : String(r.error)}</div>
                    {r.postSubmissionId ? <code>{String(r.postSubmissionId)}</code> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <aside className="stack">
        <section className="card">
          <h2>ตารางงานจาก Drive</h2>
          <p className="hint">
            โฟลเดอร์ root{" "}
            {drive?.folderUrl ? (
              <a href={drive.folderUrl} target="_blank" rel="noreferrer">
                เปิดโฟลเดอร์
              </a>
            ) : null}{" "}
            — รูปอยู่ที่ root เช่น 21_09A.jpg · Excel เป็นตารางงาน (ใช้ไฟล์ updated 2026 ก่อน)
          </p>
          {driveError ? <div className="banner err">{driveError}</div> : null}
          {!drive?.configured ? (
            <div className="banner warn">
              ยังไม่มี Google OAuth — โฟลเดอร์นี้ยังเปิดไม่ได้จนกว่าจะเชื่อมบัญชี
            </div>
          ) : !drive.connected ? (
            <a className="btn secondary" href="/api/google/login">
              เชื่อมบัญชี Google
            </a>
          ) : (
            <button className="btn secondary" type="button" onClick={() => void loadDrivePlan()}>
              โหลดตาราง + รูปใน root
            </button>
          )}
          {workbookName ? <p className="muted">ไฟล์ตาราง: {workbookName}</p> : null}
          <div className="accounts" style={{ marginTop: "0.7rem" }}>
            {planRows.map((row) => (
              <div className="account" key={row.index}>
                <div className="meta">
                  <strong>{row.topic || row.caption?.slice(0, 48) || `แถว ${row.index + 1}`}</strong>
                  <small>
                    {row.date || "ไม่มีวันที่"} · {row.matchedImage || row.imageName || "ยังไม่จับคู่รูป"}
                  </small>
                </div>
                <button className="btn secondary" type="button" disabled={busy} onClick={() => void usePlanRow(row)}>
                  ใช้แถวนี้
                </button>
              </div>
            ))}
            {files.map((f) => (
              <div className="account" key={f.id}>
                <div className="meta">
                  <strong>{f.name}</strong>
                  <small>รูปใน root</small>
                </div>
                <button className="btn secondary" type="button" disabled={busy} onClick={() => void attachDrive(f)}>
                  แนบรูป
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>บัญชีปลายทาง</h2>
          {accounts.length === 0 ? (
            <div className="empty">{connected === null ? "กำลังโหลด…" : "ยังไม่มีบัญชีใน Blotato"}</div>
          ) : (
            <div className="accounts">
              {accounts.map((a) => {
                const d = dest[a.id] ?? emptyDest();
                return (
                  <div className={`account ${d.selected ? "on" : ""}`} key={a.id}>
                    <input type="checkbox" checked={d.selected} onChange={() => void toggleAccount(a)} />
                    <div className="meta">
                      <strong>{a.fullname || a.username || a.id}</strong>
                      <small>{a.username ? `@${a.username}` : a.platform}</small>
                      {d.selected && a.platform === "facebook" ? (
                        <div className="extra">
                          <select value={d.pageId} onChange={(e) => patchDest(a.id, { pageId: e.target.value })}>
                            <option value="">เลือกเพจ</option>
                            {(subs[a.id] || []).map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name || s.id}
                              </option>
                            ))}
                          </select>
                          <select
                            value={d.facebookMediaType}
                            onChange={(e) => patchDest(a.id, { facebookMediaType: e.target.value })}
                          >
                            <option value="">โพสต์ทั่วไป</option>
                            <option value="reel">Reel</option>
                            <option value="story">Story</option>
                          </select>
                        </div>
                      ) : null}
                      {d.selected && a.platform === "instagram" ? (
                        <select
                          value={d.instagramMediaType}
                          onChange={(e) => patchDest(a.id, { instagramMediaType: e.target.value })}
                        >
                          <option value="reel">Reel</option>
                          <option value="story">Story</option>
                        </select>
                      ) : null}
                      {d.selected && a.platform === "tiktok" ? (
                        <select
                          value={d.tiktokPrivacy}
                          onChange={(e) => patchDest(a.id, { tiktokPrivacy: e.target.value })}
                        >
                          <option value="PUBLIC_TO_EVERYONE">สาธารณะ</option>
                          <option value="SELF_ONLY">เฉพาะฉัน</option>
                        </select>
                      ) : null}
                    </div>
                    <span className="pill">{PLATFORM_LABEL[a.platform] || a.platform}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
