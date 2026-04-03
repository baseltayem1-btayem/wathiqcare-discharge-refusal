# 🖼️ مجلد أصول Figma

## الغرض

هذا المجلد مخصص لتخزين الصور والأيقونات والملفات المرئية المُصدّرة من Figma.

## هيكل المجلد

```
figma-assets/
├── images/              # الصور
│   ├── hero-bg.png
│   ├── features/
│   │   ├── feature-1.png
│   │   └── feature-2.png
│   └── team/
│       ├── member-1.jpg
│       └── member-2.jpg
├── icons/              # الأيقونات
│   ├── logo.svg
│   ├── menu.svg
│   └── social/
│       ├── twitter.svg
│       └── linkedin.svg
└── illustrations/      # الرسومات التوضيحية
    ├── workflow.svg
    └── dashboard.svg
```

## كيفية التصدير من Figma

### 1. تصدير الصور

في Figma:
1. حدد الصورة/الأيقونة
2. انقر بالزر الأيمن → **Export**
3. اختر التنسيق:
   - **SVG** للأيقونات والشعارات
   - **PNG** للصور (اختر 2x للشاشات عالية الدقة)
   - **WebP** لتحسين الأداء
4. انقر **Export**

### 2. نسخ الملفات

```bash
# نسخ الصور المُصدّرة
cp ~/Downloads/figma-exports/* /workspaces/wathiqcare-discharge-refusal/apps/web/public/figma-assets/images/

# نسخ الأيقونات
cp ~/Downloads/icons/* /workspaces/wathiqcare-discharge-refusal/apps/web/public/figma-assets/icons/
```

## استخدام الصور في الكود

### باستخدام next/image (موصى به)

```tsx
import Image from 'next/image';

export default function HeroSection() {
  return (
    <Image
      src="/figma-assets/images/hero-bg.png"
      alt="خلفية Hero"
      width={1920}
      height={1080}
      priority
    />
  );
}
```

### للأيقونات SVG

```tsx
import Image from 'next/image';

export default function Icon() {
  return (
    <Image
      src="/figma-assets/icons/logo.svg"
      alt="Logo"
      width={120}
      height={40}
    />
  );
}
```

### للصور الخلفية CSS

```tsx
export default function Section() {
  return (
    <div 
      className="bg-cover bg-center h-screen"
      style={{ backgroundImage: "url('/figma-assets/images/hero-bg.png')" }}
    >
      {/* المحتوى */}
    </div>
  );
}
```

## تحسين الأداء

### 1. تحسين حجم الصور

```bash
# تثبيت أداة تحسين الصور (اختياري)
npm install -g sharp-cli

# تحسين الصور
sharp -i input.png -o output.webp --webp
```

### 2. استخدام WebP

WebP أصغر حجماً وأسرع في التحميل:
```tsx
<Image
  src="/figma-assets/images/hero.webp"
  alt="Hero"
  width={1200}
  height={800}
/>
```

## 📝 ملاحظات هامة

1. **الأسماء:** استخدم أسماء واضحة ومتسقة (kebab-case)
   - ✅ `hero-background.png`
   - ❌ `HeroBackground.PNG`

2. **المسارات:** جميع الصور تُستخدم من `/figma-assets/...`
   - المجلد `public/` لا يُكتب في المسار

3. **الأحجام:** صدّر الصور بالحجم المناسب
   - Hero images: 1920x1080 أو أكبر
   - Icons: 24x24, 32x32, 48x48
   - Thumbnails: 300x300

4. **الأداء:** استخدم `priority` للصور المهمة التي تظهر مباشرة

## 📋 Checklist

- [ ] تصدير جميع الصور من Figma
- [ ] تنظيم الملفات في مجلدات فرعية
- [ ] استخدام next/image في الكود
- [ ] تحسين الصور (اختياري)
- [ ] اختبار تحميل الصور في المتصفح

---

**ملاحظة:** هذا المجلد حالياً فارغ - سيتم ملؤه بعد تصدير الأصول من Figma.
