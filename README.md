# 💬 GroupChat

Web chat nhóm đơn giản, real-time. Một phòng duy nhất, không cần đăng nhập.

## ✨ Tính năng

- 🚀 Real-time messaging qua Firebase Firestore
- 👤 Nhập tên lần đầu → lưu localStorage (không cần đăng nhập)
- 🎨 Mỗi user có màu avatar riêng
- 📅 Phân tách ngày tháng trong danh sách tin nhắn
- 📱 Responsive trên mobile
- ⚡ Deploy Vercel trong 2 phút

---

## 🛠️ Setup

### 1. Tạo Firebase project

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. **Add project** → đặt tên → Disable Analytics (tùy) → Create
3. **Project Settings** → Your apps → **Add app** → Web (`</>`)
4. Đăng ký app, copy `firebaseConfig`
5. Vào **Firestore Database** → Create database → **Start in test mode** → Next → Done

### 2. Tạo file `.env.local`

```bash
cp .env.example .env.local
```

Mở `.env.local` và điền thông tin từ `firebaseConfig`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=my-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-project
VITE_FIREBASE_STORAGE_BUCKET=my-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 3. Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:5173

---

## 🚀 Deploy lên Vercel

### Option A: Vercel CLI (nhanh nhất)

```bash
npx vercel
```

Nhập các env variables khi được hỏi, hoặc vào Vercel Dashboard → Settings → Environment Variables.

### Option B: GitHub + Vercel Dashboard

1. Push code lên GitHub
2. Vào [vercel.com](https://vercel.com) → Import project từ GitHub
3. **Environment Variables**: thêm tất cả `VITE_*` variables
4. Deploy!

> ⚠️ **Quan trọng**: Thêm env variables trên Vercel Dashboard trước khi deploy.

---

## 📋 Firestore Security Rules (Production)

Khi muốn ra production, vào **Firestore → Rules** và thay bằng:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{messageId} {
      allow read: if true;
      allow create: if request.resource.data.text is string
                    && request.resource.data.text.size() > 0
                    && request.resource.data.text.size() <= 1000
                    && request.resource.data.userName is string
                    && request.resource.data.userName.size() > 0;
      allow update, delete: if false;
    }
  }
}
```

---

## 📁 Cấu trúc

```
src/
├── components/
│   ├── ChatRoom.jsx   # Main chat UI + Firebase subscription
│   ├── Message.jsx    # Message bubble
│   └── NamePopup.jsx  # First-visit name modal
├── firebase.js        # Firebase init
├── utils.js           # Avatar colors, time format
├── App.jsx            # Root — username state management
├── main.jsx           # React entry
└── index.css          # Design system
```
