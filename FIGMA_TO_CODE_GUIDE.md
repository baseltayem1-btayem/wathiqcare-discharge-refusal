# 🎨 دليل سريع: تحويل Figma إلى كود باستخدام Anima/Quest

## 🚀 الطريقة 1: استخدام Anima (موصى به)

### الخطوة 1: تثبيت Anima في Figma

1. افتح تصميمك في Figma: https://sweet-heavy-75341945.figma.site/
2. اذهب إلى **Resources** → **Plugins** → ابحث عن **"Anima"**
3. انقر **Install** أو **Run**

### الخطوة 2: تحويل التصميم إلى كود

1. **حدد الصفحة/الإطار** الذي تريد تحويله
2. انقر بالزر الأيمن → **Plugins** → **Anima**
3. في نافذة Anima:
   - اختر **"Export to Code"**
   - اختر Framework: **React** أو **Next.js**
   - اختر **Tailwind CSS** (لأن المشروع يستخدمه)
4. انقر **"Generate Code"**
5. **حمّل الملفات** (ZIP)

### الخطوة 3: استخراج الملفات ودمجها

```bash
# 1. فك ضغط ملف ZIP الذي حملته من Anima
unzip anima-export.zip -d ~/Downloads/anima-output

# 2. انسخ المكونات إلى مشروع WathiqCare
cp -r ~/Downloads/anima-output/components/* /workspaces/wathiqcare-discharge-refusal/frontend/components/figma/

# 3. انسخ الصور
cp -r ~/Downloads/anima-output/assets/* /workspaces/wathiqcare-discharge-refusal/frontend/public/figma-assets/

# 4. انسخ الأنماط (إذا وجدت)
cp -r ~/Downloads/anima-output/styles/* /workspaces/wathiqcare-discharge-refusal/frontend/app/figma-styles/
```

---

## 🚀 الطريقة 2: استخدام Quest.ai

### الخطوة 1: تثبيت Quest في Figma

1. افتح Figma → **Resources** → **Plugins**
2. ابحث عن **"Quest"**
3. انقر **Install** أو **Run**

### الخطوة 2: تحويل التصميم

1. **حدد الصفحة** التي تريد تحويلها
2. شغّل **Quest Plugin**
3. في نافذة Quest:
   - اضغط **"Push to Quest"**
   - سيتم رفع التصميم إلى Quest.ai
4. افتح التصميم في Quest.ai في المتصفح
5. من لوحة Quest:
   - اختر **Export** → **React**
   - اختر **Next.js** + **Tailwind CSS**
   - اضغط **Download Code**

### الخطوة 3: دمج الكود

```bash
# استخرج ملفات Quest
unzip quest-export.zip -d ~/Downloads/quest-output

# انسخ إلى المشروع
cp -r ~/Downloads/quest-output/src/components/* /workspaces/wathiqcare-discharge-refusal/frontend/components/figma/
cp -r ~/Downloads/quest-output/public/* /workspaces/wathiqcare-discharge-refusal/frontend/public/figma-assets/
```

---

## 🚀 الطريقة 3: استخدام Locofy (بديل قوي)

### الخطوة 1: استخدام Locofy

1. افتح Figma → **Plugins** → ابحث عن **"Locofy.ai"**
2. **حدد الإطارات** → شغّل **Locofy**
3. اختر:
   - Framework: **Next.js**
   - Styling: **Tailwind CSS**
   - Export: **Download ZIP**

### الخطوة 2: الدمج

```bash
unzip locofy-export.zip -d ~/Downloads/locofy-output
cp -r ~/Downloads/locofy-output/* /workspaces/wathiqcare-discharge-refusal/frontend/components/figma/
```

---

## 📂 هيكل المشروع بعد الدمج

بعد دمج الملفات من Anima/Quest/Locofy، سيكون لديك:

```
frontend/
├── components/
│   ├── figma/                    # 🆕 المكونات من Figma
│   │   ├── HeroSection.tsx
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── FeatureCard.tsx
│   │   └── ...
│   └── ... (المكونات الموجودة)
├── public/
│   ├── figma-assets/             # 🆕 الصور من Figma
│   │   ├── hero-image.png
│   │   ├── icons/
│   │   └── illustrations/
│   └── ...
├── app/
│   ├── figma-styles/             # 🆕 أنماط مخصصة
│   │   └── custom.css
│   └── page.tsx                  # ستعدّل هنا لاستخدام مكونات Figma
```

---

## ✏️ كيفية استخدام المكونات المُصدّرة

بعد نسخ الملفات، عدّل الصفحة الرئيسية:

### مثال: استبدال الصفحة الرئيسية بتصميم Figma

```tsx
// frontend/app/page.tsx
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

## 🔧 تنظيف وتحسين الكود المُصدّر

الأدوات التلقائية تولّد كود جيد لكن قد يحتاج بعض التعديلات:

### 1. تحديث المسارات

```tsx
// قبل (من Anima)
import image from '../assets/hero.png';

// بعد (للمشروع)
import image from '@/public/figma-assets/hero.png';
// أو استخدم next/image
import Image from 'next/image';
<Image src="/figma-assets/hero.png" alt="Hero" width={600} height={400} />
```

### 2. إضافة TypeScript Types

```tsx
// أضف types للProps
interface HeroSectionProps {
  title?: string;
  subtitle?: string;
}

export default function HeroSection({ title, subtitle }: HeroSectionProps) {
  // ...
}
```

### 3. تحسين الـ Responsive Design

تأكد من أن التصميم متجاوب:

```tsx
// استخدم Tailwind breakpoints
<div className="flex flex-col lg:flex-row gap-4">
  {/* Mobile: عمودي | Desktop: أفقي */}
</div>
```

---

## ⚡ الخطوة النهائية: الدمج والنشر

بعد نسخ جميع الملفات:

### 1. تثبيت Dependencies (إذا لزم الأمر)

```bash
cd /workspaces/wathiqcare-discharge-refusal/frontend
npm install
```

### 2. اختبار محلياً

```bash
npm run dev
# افتح http://localhost:3000
```

### 3. النشر على Vercel

```bash
cd /workspaces/wathiqcare-discharge-refusal
./deploy_vercel.sh
```

---

## 📋 Checklist - قائمة التحقق

### تحويل التصميم:
- [ ] تثبيت Anima/Quest في Figma
- [ ] تحديد جميع الصفحات/الإطارات المطلوبة
- [ ] تصدير الكود (React/Next.js + Tailwind)
- [ ] تحميل ملف ZIP

### الدمج:
- [ ] فك ضغط الملفات
- [ ] نسخ المكونات إلى `frontend/components/figma/`
- [ ] نسخ الأصول إلى `frontend/public/figma-assets/`
- [ ] تحديث imports في الصفحات
- [ ] اختبار محلياً

### النشر:
- [ ] البناء المحلي ناجح (`npm run build`)
- [ ] تشغيل `./deploy_vercel.sh`
- [ ] التحقق من الموقع على Vercel

---

## 🐛 مشاكل شائعة وحلولها

### المشكلة 1: أخطاء Import

```bash
Error: Cannot find module '@/components/figma/HeroSection'
```

**الحل:**
```bash
# تأكد من وجود الملف
ls /workspaces/wathiqcare-discharge-refusal/frontend/components/figma/

# وتأكد من اسم الملف صحيح (case-sensitive)
```

### المشكلة 2: الصور لا تظهر

**الحل:**
```tsx
// استخدم next/image بدلاً من <img>
import Image from 'next/image';

<Image 
  src="/figma-assets/hero.png" 
  alt="Hero"
  width={600}
  height={400}
  priority
/>
```

### المشكلة 3: التنسيقات غير متطابقة

**الحل:**
```bash
# تأكد من أن Tailwind يتعرف على المكونات الجديدة
# في frontend/tailwind.config.ts تأكد من:
content: [
  './app/**/*.{js,ts,jsx,tsx,mdx}',
  './components/**/*.{js,ts,jsx,tsx,mdx}',
  './components/figma/**/*.{js,ts,jsx,tsx,mdx}', // أضف هذا
],
```

---

## 🎯 الخطوة التالية

بعد إكمال هذه الخطوات:

1. ✅ تصميم Figma محوّل إلى كود
2. ✅ الملفات مدمجة في المشروع
3. ✅ جاهز للنشر على Vercel

**جرّب الآن:**
```bash
./deploy_vercel.sh
```

---

## 📞 تحتاج مساعدة؟

إذا واجهت أي مشكلة:
1. تأكد من أن الملفات في المكان الصحيح
2. جرّب `npm run build` للتحقق من الأخطاء
3. اطلب المساعدة مع تفاصيل الخطأ

---

**آخر تحديث:** مارس 2026  
**المدة المتوقعة:** 20-30 دقيقة
