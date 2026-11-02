#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/package.json" ]; then
  PROJECT_DIR="$SCRIPT_DIR"
elif [ -f "$SCRIPT_DIR/blotato-app/package.json" ]; then
  PROJECT_DIR="$SCRIPT_DIR/blotato-app"
else
  PROJECT_DIR="/Users/admin/Desktop/blotato-app"
fi

URL="http://127.0.0.1:3000/"

cd "$PROJECT_DIR" || {
  echo "ไม่พบโฟลเดอร์งาน: $PROJECT_DIR"
  echo "วางไฟล์นี้ไว้ในโฟลเดอร์ blotato-app หรือโฟลเดอร์โปรเจกต์ที่มี blotato-app"
  read -p "กด Enter เพื่อปิดหน้าต่าง..."
  exit 1
}

if lsof -iTCP:3000 -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  echo "โพสต์โยเชียลเปิดอยู่แล้ว"
  echo "กำลังเปิดเว็บ: $URL"
  open "$URL"
  read -p "กด Enter เพื่อปิดหน้าต่าง..."
  exit 0
fi

echo "กำลังเปิดโพสต์โยเชียล..."
echo "โฟลเดอร์งาน: $PROJECT_DIR"
echo "URL: $URL"
echo ""
echo "อย่าปิดหน้าต่างนี้ระหว่างใช้งานเว็บ"
echo "ถ้าต้องการหยุดเว็บ ให้กด Control + C หรือปิดหน้าต่างนี้"
echo ""

if [ ! -d node_modules ]; then
  echo "กำลังติดตั้งแพ็กเกจ (ครั้งแรก)..."
  npm install || {
    echo "ติดตั้งไม่สำเร็จ"
    read -p "กด Enter เพื่อปิดหน้าต่าง..."
    exit 1
  }
fi

(sleep 1.5 && open "$URL") &
npm run dev
