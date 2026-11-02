"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "แคปชัน" },
  { href: "/schedule", label: "ตารางงาน" },
  { href: "/history", label: "ประวัติ" },
  { href: "/settings", label: "ตั้งค่า" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo" aria-hidden>
            ป
          </div>
          <div>
            <h1>โพสต์โซเชียล</h1>
            <p>เผยแพร่ผ่าน Blotato · Paknam</p>
          </div>
        </div>
        <nav className="nav">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href))
                  ? "active"
                  : undefined
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="wrap">{children}</main>
      <p className="footer-note">
        API key ถูกเก็บใน cookie ฝั่งเซิร์ฟเวอร์ของเครื่องนี้ ไม่ถูก commit เข้า git
      </p>
    </div>
  );
}
