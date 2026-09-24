# แอปโพสต์โซเชียลผ่าน Blotato

เว็บแอปภาษาไทย: **สร้าง/ตรวจแคปชันก่อน** แล้วค่อยตั้งตารางงาน และเผยแพร่ผ่าน [Blotato](https://help.blotato.com/api/start)

สแต็ก: **Next.js 15 (App Router) + TypeScript + React 19**

โฟลเดอร์ `blotato-app/` แยกจากหน้า landing ของรีโปนี้

## ลำดับการใช้งาน

1. เขียนหรือสร้างแคปชัน (ChatGPT ถ้ามี OpenAI key, หรือพิมพ์เอง)
2. ตรวจ/แก้แคปชัน — ยังไม่ตั้งโพสต์ในขั้นนี้
3. เลือกบัญชี + ตั้งตารางงาน และ/หรือส่งไป Blotato

## รันบนเครื่อง

Node.js 18+

```bash
cd blotato-app
cp .env.example .env.local
# ใส่คีย์ใน .env.local — อย่า commit ไฟล์นี้
npm install
npm run dev
```

เปิด http://localhost:3000

บน macOS ดับเบิลคลิก `โพสต์โยเชียล.command` (วางที่รากรีโป หรือใน `blotato-app/`) จะเปิด Terminal แล้วเปิด http://127.0.0.1:3000/ — ถ้าพอร์ต 3000 ถูกใช้อยู่แล้ว จะเปิดเว็บอย่างเดียว

## คีย์ที่ต้องใช้

ใส่ใน `blotato-app/.env.local` เท่านั้น (gitignored)

| ตัวแปร | จำเป็นต่อ | หมายเหตุ |
| --- | --- | --- |
| `BLOTATO_API_KEY` | โพสต์จริง | Settings → API ใน Blotato; เก็บ `=` ท้ายคีย์ |
| `OPENAI_API_KEY` | ปุ่มสร้างแคปชัน | ไม่มีก็พิมพ์แคปชันเองได้ |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | เลือกไฟล์ใน Drive | OAuth จริง ไม่ใช่สวิตช์ปลอม |
| `GOOGLE_REDIRECT_URI` | Drive | ค่าเริ่มต้น `http://localhost:3000/api/google/callback` |
| `GOOGLE_DRIVE_FOLDER_ID` | โฟลเดอร์สื่อ | ค่าเริ่มต้นโฟลเดอร์งานที่กำหนดแล้ว |

หน้า **ตั้งค่า** ก็วางคีย์เหล่านี้ได้ (เก็บ httpOnly cookie)

### Google Cloud

1. เปิด Google Drive API
2. สร้าง OAuth client (Web application)
3. Authorized redirect URI: `http://localhost:3000/api/google/callback`
4. โฟลเดอร์สื่อเริ่มต้น: https://drive.google.com/drive/folders/1CcCgh6im2KEfwaYEd5iOcIpt1JbxNh46
5. ใน **root** ของโฟลเดอร์: Excel ตารางงาน (ใช้ `posting_schedule_dhamma_pic_updated_2026…` ก่อนไฟล์เก่า) และรูปเช่น `21_09A.jpg` / `21_09B.jpg`

ถ้าโฟลเดอร์เปิดไม่ได้โดยไม่ล็อกอิน Google แอปจะแสดง error จริงจาก Drive API — ยังไม่เชื่อม OAuth จึงยังดึงไฟล์ไม่ได้

## สิ่งที่ทำงาน

- ตรวจ Blotato key กับ `GET /v2/users/me` และดึงบัญชีที่เชื่อมแล้ว
- สร้างแคปชันด้วย OpenAI Chat Completions (`gpt-4o-mini`) เมื่อมีคีย์
- ตารางงานในเครื่อง (`data/schedule.json`, gitignored) แล้วค่อยส่ง `POST /v2/posts` พร้อม `scheduledTime` (Blotato รับตั้งเวลาไม่เกินประมาณ 9 เดือน)
- โหลดตารางงานจาก Excel ใน root ของ Drive แล้วจับคู่ชื่อไฟล์รูปใน root ก่อนเขียนแคปชัน
- เลือกไฟล์จากโฟลเดอร์ Drive หลัง OAuth แล้วอัปโหลดสื่อผ่าน Blotato presigned upload
- ไม่แสร้งว่าสำเร็จถ้าคีย์/OAuth ยังไม่มี
