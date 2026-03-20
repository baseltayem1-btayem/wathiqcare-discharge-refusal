# 📂 مجلد مكونات Figma

## الغرض

هذا المجلد مخصص لاستقبال المكونات المُصدّرة من Figma باستخدام أدوات مثل:
- Anima
- Quest.ai
- Locofy
- Builder.io

## كيفية الاستخدام

### 1. تصدير من Figma باستخدام الأداة

```bash
# بعد تصدير الكود من Anima/Quest
unzip figma-export.zip -d ~/Downloads/figma-output

# نسخ المكونات إلى هنا
cp -r ~/Downloads/figma-output/components/* ./
```

### 2. هيكل الملفات المتوقع

```
figma/
├── HeroSection.tsx          # قسم Hero الرئيسي
├── Navbar.tsx               # شريط التنقل
├── Footer.tsx               # التذييل
├── FeatureCard.tsx          # بطاقة مميزات
├── CTASection.tsx           # Call-to-Action
├── ContactForm.tsx          # نموذج التواصل
└── shared/                  # مكونات مشتركة
    ├── Button.tsx
    ├── Card.tsx
    └── Input.tsx
```

### 3. مثال على استخدام المكون

```tsx
// في app/page.tsx
import HeroSection from '@/components/figma/HeroSection';
import FeatureCard from '@/components/figma/FeatureCard';

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <FeatureCard title="ميزة 1" description="وصف الميزة" />
    </main>
  );
}
```

## 📋 قائمة التحقق

- [ ] تصدير المكونات من Figma
- [ ] نسخ الملفات إلى هذا المجلد
- [ ] التأكد من صحة imports
- [ ] اختبار المكونات في الصفحات
- [ ] تحديث الصور في `public/figma-assets/`

## 🔗 روابط مفيدة

- [دليل استخدام Anima/Quest](../FIGMA_TO_CODE_GUIDE.md)
- [دليل النشر على Vercel](../VERCEL_DEPLOYMENT.md)

---

**ملاحظة:** هذا المجلد حالياً فارغ - سيتم ملؤه بعد تصدير التصميم من Figma.
