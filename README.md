# FiveMTweak

FiveMTweak is an advanced configuration utility designed specifically for FiveM (GTA V) players. Built as a high-performance desktop application using **Tauri v2** and **React**, it provides an all-in-one window to manage graphics settings, apply True Stretch resolutions, and tweak NVIDIA driver profiles to optimize game performance and visibility.

---

## Features (ความสามารถของโปรแกรม)

1. **True Stretch Engine**
   ระบบปรับความละเอียดลบขอบดำ (True Stretch) ขั้นสูง ช่วยยืดเรโซลูชันเพื่อทำให้โมเดลตัวละครในเกมดูกว้างขึ้นอย่างมีประสิทธิภาพ พร้อมระบบแบ็กอัปและคืนค่า (Rollback) อัตโนมัติเมื่อเลิกใช้งาน
2. **NVIDIA Profile Tweaker**
   เชื่อมต่อและสั่งการ NVIDIA Profile Inspector แบบเบื้องหลัง เพื่อปรับลดคุณภาพกราฟิกระดับลึก (LOD Bias, Transparency Supersampling) รีดเฟรมเรตและให้ภาพที่เหมาะสมสำหรับการเล่น FiveM
3. **Smart Launch Integration**
   เชื่อมทุกการตั้งค่าเข้ากับปุ่ม "Play FiveM" ในโปรแกรมตัวเดียว ตั้งค่าครั้งเดียว พอกดเปิดเกมปุ๊บ ระบบจะปรับระดับความสำคัญ (Priority), จัดการ CPU Affinity, ปรับ NVIDIA และยืด Stretch ให้พร้อมเล่นทันที
4. **System & Memory Optimization**
   ปรับแต่งระบบแบบอัตโนมัติก่อนเข้าเกม ทั้งการล้างแคชแรม (Purge Standby Memory) และลดความหน่วงเมาส์ด้วย Timer Resolution (0.5ms) เพื่อลดอาการกระตุก (Micro-stutters)

---

## Requirements (ระบบที่รองรับ)

- **OS:** Windows 10 หรือ Windows 11
- **GPU:** การ์ดจอ NVIDIA (จำเป็นสำหรับฟังก์ชัน Graphic Presets / LOD Bias)
- **Game:** ต้องติดตั้ง FiveM และ GTA V ไว้ในเครื่อง

---

## For Developers: How to Build & Contribute (สำหรับนักพัฒนา)

หากต้องการนำโปรเจกต์นี้ไปแก้ไข พัฒนาต่อ หรือ Build ใช้งานเอง จำเป็นต้องเตรียม Environment พื้นฐานให้พร้อม ดังนี้:

### 1. Prerequisites (สิ่งที่ต้องเตรียม)
- **Node.js**: เวอร์ชัน 20 ขึ้นไป
- **Rust**: เวอร์ชัน 1.85 ขึ้นไป (ดาวน์โหลดได้ผ่าน `rustup`)
- **Windows Build Tools**: ต้องลงเครื่องมือ "Desktop development with C++" ผ่าน Visual Studio Installer (เพื่อใช้ Windows 10/11 SDK ในการคอมไพล์โค้ดฝั่งระบบปฏิบัติการด้วย C++ MSVC)
- **Tauri CLI**: ติดตั้งผ่านคำสั่งฝั่งเว็บได้เลย

### 2. Setup Commands (คำสั่งสำหรับใช้งาน)
```bash
# 1. ติดตั้ง Dependencies ฝั่ง Frontend
npm install

# 2. เริ่มต้นเซิร์ฟเวอร์โหมด Development (Hot Reloading ของทั้ง React และ Rust)
npm run tauri dev

# 3. สร้างตัวติดตั้งโปรแกรม (Production Build -> จะได้ไฟล์ .exe เป็น NSIS Installer)
npm run tauri build
```

---

**Developed & Maintained by LuckWW**
