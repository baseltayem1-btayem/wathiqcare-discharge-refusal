# ⚡ البدء السريع - Anima/Quest

## 📍 أنت هنا الآن

تم إعداد المشروع لاستقبال تصميم Figma. اتبع الخطوات التالية:

---

## 🎯 الخطوات (5 خطوات بسيطة)

### 1️⃣ افتح تصميمك في Figma
```
رابط تصميمك: https://sweet-heavy-75341945.figma.site/
```

### 2️⃣ ثبّت أداة التحويل في Figma

اختر أحد الخيارات:

#### الخيار أ: Anima (سهل - موصى به)
1. في Figma: **Resources** → **Plugins** → ابحث عن **"Anima"**
2. انقر **Run**
3. حدد الصفحات → **Export to React/Next.js**
4. اختر **Tailwind CSS**
5. اضغط **Generate** → **Download**

#### الخيار ب: Quest.ai (أكثر ذكاءً)
1. في Figma: **Resources** → **Plugins** → ابحث عن **"Quest"**
2. انقر **Run** → **Push to Quest**
3. افتح quest.ai في المتصفح
4. **Export** → **Next.js + Tailwind** → **Download**

#### الخيار ج: Locofy (احترافي)
1. في Figma: **Plugins** → **"Locofy.ai"**
2. حدد الإطارات → **Export**
3. اختر **Next.js** + **Tailwind CSS**
4. **Download ZIP**

### 3️⃣ استخرج ملفات ZIP

بعد تحميل ملف ZIP من Anima/Quest:

```bash
# في terminal، نفّذ:
cd ~/Downloads
unzip anima-export.zip -d figma-output
# أو
unzip quest-export.zip -d figma-output
# أو
unzip locofy-export.zip -d figma-output
```

### 4️⃣ انسخ الملفات إلى المشروع

```bash
# انسخ المكونات
cp -r ~/Downloads/figma-output/components/* /workspaces/wathiqcare-discharge-refusal/apps/web/components/figma/

# أو إذا كان المجلد اسمه src:
cp -r ~/Downloads/figma-output/src/components/* /workspaces/wathiqcare-discharge-refusal/apps/web/components/figma/

# انسخ الصور والأيقونات
cp -r ~/Downloads/figma-output/assets/* /workspaces/wathiqcare-discharge-refusal/apps/web/public/figma-assets/

# أو:
cp -r ~/Downloads/figma-output/public/* /workspaces/wathiqcare-discharge-refusal/apps/web/public/figma-assets/
```

### 5️⃣ استخدم المكونات في الصفحات

عدّل الصفحة الرئيسية لاستخدام مكونات Figma:

```tsx
// apps/web/app/page.tsx
import HeroSection from '@/components/figma/HeroSection';
import FeaturesSection from '@/components/figma/FeaturesSection';
import Footer from '@/components/figma/Footer';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <Footer />
    </>
  );
}
```

---

## ✅ جرّب محلياً

```bash
cd /workspaces/wathiqcare-discharge-refusal/frontend
npm install
npm run dev
```

افتح: http://localhost:3000

---

## 🚀 انشر على Vercel

بعد التأكد من أن كل شيء يعمل:

```bash
cd /workspaces/wathiqcare-discharge-refusal
./deploy_vercel.sh
```

---

## 📂 الهيكل النهائي

```
wathiqcare-discharge-refusal/
├── apps/web/
│   ├── components/
│   │   └── figma/              # ✅ مكونات Figma هنا
│   │       ├── HeroSection.tsx
│   │       ├── Navbar.tsx
│   │       └── Footer.tsx
│   ├── public/
│   │   └── figma-assets/       # ✅ صور Figma هنا
│   │       ├── images/
│   │       └── icons/
│   └── app/
│       └── page.tsx            # عدّله لاستخدام مكونات Figma
└── deploy_vercel.sh            # للنشر
```

---

## 🆘 حل المشاكل

### المكونات لا تعمل؟
```bash
# تأكد من الأسماء صحيحة
ls /workspaces/wathiqcare-discharge-refusal/apps/web/components/figma/

# تأكد من imports صحيحة في page.tsx
```

### الصور لا تظهر؟
```tsx
// استخدم next/image
import Image from 'next/image';

<Image 
  src="/figma-assets/images/hero.png" 
  alt="Hero"
  width={600}
  height={400}
/>
```

### خطأ في Build؟
```bash
# جرّب البناء محلياً للتشخيص
cd frontend
npm run build
```

---

## 📚 المراجع

- [دليل شامل Figma to Code](FIGMA_TO_CODE_GUIDE.md)
- [دليل النشر Vercel](VERCEL_DEPLOYMENT.md)
- [دليل دمج Figma](FIGMA_INTEGRATION.md)

---

## ⏱️ المدة المتوقعة

- تثبيت Plugin: **2 دقيقة**
- تصدير الكود: **5 دقائق**
- نسخ الملفات: **2 دقيقة**
- التعديل واختبار: **10 دقائق**
- النشر: **5 دقائق**

**المجموع: ~25 دقيقة** ⚡

---

## ✨ جاهز للبدء!

اذهب الآن إلى Figma وابدأ بالخطوة 1️⃣

**بالتوفيق! 🎉**
