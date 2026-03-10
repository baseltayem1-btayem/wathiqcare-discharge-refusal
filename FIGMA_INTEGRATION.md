# 🎨 دليل دمج تصميم Figma مع WathiqCare

## 📌 نظرة عامة

هذا الدليل يشرح كيفية دمج تصميم Figma الخاص بك مع تطبيق WathiqCare ونشره على Vercel.

**رابط التصميم:** https://sweet-heavy-75341945.figma.site/

---

## 🎯 الخطوات المطلوبة

### المرحلة 1: تحويل تصميم Figma إلى كود

#### الخيار أ: استخدام أدوات التحويل التلقائي (موصى به)

| الأداة | المميزات | الرابط |
|--------|----------|---------|
| **Anima** | تحويل مباشر من Figma إلى React/Next.js | [anima.app](https://www.animaapp.com/) |
| **Builder.io** | محرر مرئي + تصدير كود | [builder.io](https://www.builder.io/) |
| **Quest** | AI-powered Figma إلى React | [quest.ai](https://www.quest.ai/) |
| **Locofy** | تحويل تصميمات إلى كود إنتاجي | [locofy.ai](https://www.locofy.ai/) |

**خطوات استخدام Anima (مثال):**
1. افتح تصميمك في Figma
2. ثبّت إضافة Anima من Figma Plugins
3. حدد الإطارات (Frames) التي تريد تحويلها
4. اختر "Export to React" أو "Export to Next.js"
5. حمّل الكود المُصدّر
6. انقل الملفات إلى مجلد `frontend/components/` أو `frontend/app/`

#### الخيار ب: التنفيذ اليدوي

إذا كنت تفضل كتابة الكود يدوياً:

**1. استخراج الأصول من Figma:**
```bash
# في Figma، اختر كل أيقونة/صورة:
# - انقر بالزر الأيمن → Export
# - اختر التنسيق (SVG للأيقونات، PNG للصور)
# - حمّل الملفات

# ضع الملفات في:
frontend/public/images/      # للصور
frontend/public/icons/       # للأيقونات
```

**2. استخراج الألوان والخطوط:**

قم بإنشاء ملف تكوين Tailwind مخصص:

```typescript
// frontend/tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // استخرج الألوان من Figma وأضفها هنا
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ... الخ
        },
        // ألوان WathiqCare المخصصة
        wathiq: {
          main: '#2563eb',     // اللون الأساسي
          secondary: '#7c3aed', // اللون الثانوي
          accent: '#10b981',    // لون التمييز
        }
      },
      fontFamily: {
        // أضف الخطوط المستخدمة في Figma
        'arabic': ['Tajawal', 'Cairo', 'sans-serif'],
        'english': ['Inter', 'Roboto', 'sans-serif'],
      },
    },
  },
};
```

**3. إنشاء المكونات:**

مثال على مكون بسيط من تصميم Figma:

```tsx
// frontend/components/FigmaHeroSection.tsx
import Image from 'next/image';
import Link from 'next/link';

export default function FigmaHeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-wathiq-main to-wathiq-secondary">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* المحتوى النصي */}
          <div className="flex-1 text-white">
            <h1 className="text-5xl font-bold mb-6 font-arabic">
              واثق كير - منصة إدارة حالات الخروج الطبي
            </h1>
            <p className="text-xl mb-8 opacity-90">
              حل رقمي شامل لإدارة موافقات ورفض الخروج الطبي
            </p>
            <div className="flex gap-4">
              <Link 
                href="/login"
                className="px-8 py-4 bg-white text-wathiq-main rounded-lg hover:shadow-lg transition"
              >
                الدخول إلى النظام
              </Link>
              <Link 
                href="/request-demo"
                className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-wathiq-main transition"
              >
                طلب عرض توضيحي
              </Link>
            </div>
          </div>

          {/* الصورة/الرسومات */}
          <div className="flex-1">
            <Image 
              src="/images/hero-illustration.png" 
              alt="WathiqCare"
              width={600}
              height={500}
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
```

**4. استخدام المكون في الصفحة:**

```tsx
// frontend/app/page.tsx
import FigmaHeroSection from '@/components/FigmaHeroSection';

export default function HomePage() {
  return (
    <>
      <FigmaHeroSection />
      {/* باقي محتوى الصفحة */}
    </>
  );
}
```

---

### المرحلة 2: النشر على Vercel

#### الطريقة السريعة (باستخدام script الجاهز):

```bash
# من مجلد المشروع الرئيسي
./deploy_vercel.sh
```

#### الطريقة اليدوية:

**أ. عبر واجهة Vercel Web:**

1. اذهب إلى [vercel.com](https://vercel.com) وسجل دخول
2. اضغط "Add New Project"
3. اختر المستودع: `baseltayem1-btayem/wathiqcare-discharge-refusal`
4. أعدادات المشروع:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js (سيتم اكتشافه تلقائياً)
5. أضف المتغيرات البيئية (انظر القسم أدناه)
6. اضغط "Deploy"

**ب. عبر سطر الأوامر:**

```bash
# 1. تثبيت Vercel CLI (إذا لم يكن مثبتاً)
npm install -g vercel

# 2. تسجيل الدخول
vercel login

# 3. نشر المشروع
cd /workspaces/wathiqcare-discharge-refusal
vercel --prod
```

---

## 🔐 إعداد المتغيرات البيئية في Vercel

يجب إضافة المتغيرات التالية في إعدادات Vercel:

### المتغيرات المطلوبة:

| Variable | الوصف | قيمة مثالية |
|----------|-------|-------------|
| `DATABASE_URL` | رابط قاعدة بيانات PostgreSQL | `postgresql://user:pass@host/db` |
| `BACKEND_API_BASE_URL` | رابط Backend API | `https://api.wathiqcare.com` |
| `BACKEND_URL` | نفس رابط Backend | `https://api.wathiqcare.com` |
| `JWT_SECRET_KEY` | مفتاح تشفير JWT | `your-secret-key-here` |

### المتغيرات الاختيارية:

| Variable | الوصف |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | رابط الموقع الأمامي |
| `NEXT_PUBLIC_API_BASE_URL` | API base للمتصفح |

### إضافة المتغيرات:

**عبر واجهة Vercel:**
1. اذهب إلى Project → Settings → Environment Variables
2. أضف كل متغير مع القيمة المناسبة
3. اختر البيئات: Production, Preview, Development

**عبر CLI:**
```bash
vercel env add DATABASE_URL
vercel env add BACKEND_API_BASE_URL
vercel env add JWT_SECRET_KEY
```

---

## 🔄 سير العمل بعد النشر

### نشر تلقائي عند كل تحديث:

بعد الربط بـ GitHub، سيتم النشر تلقائياً:

- **Push إلى `main`** → نشر للإنتاج (Production)
- **Pull Request** → نشر معاينة (Preview) مؤقت
- **Commit إلى branch آخر** → معاينة فقط

### إدارة النشر:

```bash
# عرض قائمة بكل عمليات النشر
vercel ls

# فتح المشروع في المتصفح
vercel open

# عرض سجلات النشر الحالي
vercel logs

# عرض سجلات نشر معين
vercel logs [deployment-url]
```

---

## 🎨 بنية المشروع بعد الدمج

```
wathiqcare-discharge-refusal/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # الصفحة الرئيسية (محدّثة من Figma)
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── ...
│   ├── components/
│   │   ├── FigmaHeroSection.tsx     # مكون جديد من Figma
│   │   ├── FigmaNavbar.tsx          # شريط التنقل من Figma
│   │   ├── FigmaFooter.tsx          # تذييل من Figma
│   │   └── ...
│   ├── public/
│   │   ├── images/                  # صور من Figma
│   │   ├── icons/                   # أيقونات من Figma
│   │   └── ...
│   └── styles/
│       └── figma-custom.css         # أنماط مخصصة من Figma
├── vercel.json                      # إعدادات Vercel ✅
├── .vercelignore                    # ملفات يتم تجاهلها ✅
├── deploy_vercel.sh                 # script النشر السريع ✅
├── VERCEL_DEPLOYMENT.md             # دليل النشر الكامل ✅
└── FIGMA_INTEGRATION.md             # هذا الملف ✅
```

---

## ✅ قائمة التحقق النهائية

### تحويل التصميم:
- [ ] تحميل التصميم من Figma
- [ ] تحويل الصفحات الرئيسية إلى مكونات React
- [ ] استخراج الصور والأيقونات
- [ ] نقل الألوان إلى Tailwind config
- [ ] تنفيذ التصميم المتجاوب (Responsive)

### النشر:
- [ ] إنشاء حساب Vercel
- [ ] ربط مستودع GitHub
- [ ] إضافة المتغيرات البيئية
- [ ] تشغيل أول نشر
- [ ] اختبار الموقع المنشور

### بعد النشر:
- [ ] ربط Domain مخصص (اختياري)
- [ ] تفعيل SSL Certificate
- [ ] إعداد Analytics
- [ ] اختبار الأداء

---

## 📞 المساعدة والدعم

### مشاكل شائعة:

**1. خطأ في البناء (Build Failed):**
```bash
# اختبر البناء محلياً أولاً
cd frontend
npm run build
```

**2. الصور لا تظهر:**
- تأكد من وضع الصور في `frontend/public/`
- استخدم `/images/file.png` وليس `./images/file.png`

**3. الخطوط العربية لا تعمل:**
- أضف الخطوط في `frontend/app/layout.tsx`
- استخدم Google Fonts أو خطوط محلية

### الموارد:

- 📖 [وثائق Vercel](https://vercel.com/docs)
- 📖 [وثائق Next.js](https://nextjs.org/docs)
- 📖 [وثائق Tailwind CSS](https://tailwindcss.com/docs)
- 🎨 [Figma to Code - دليل شامل](https://www.figma.com/community)

---

## 📝 ملاحظات هامة

1. **الأداء:** استخدم `next/image` لتحسين تحميل الصور
2. **الأمان:** لا تضع API keys في الكود، استخدم المتغيرات البيئية
3. **SEO:** أضف metadata مناسبة في كل صفحة
4. **التدويل:** المشروع يدعم العربية والإنجليزية بالفعل

---

**آخر تحديث:** مارس 2026  
**تم الإنشاء بواسطة:** GitHub Copilot
