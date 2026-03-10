# دليل النشر على Vercel - WathiqCare

## 📋 المتطلبات الأولية

1. حساب على [Vercel](https://vercel.com)
2. تثبيت Vercel CLI (اختياري):
```bash
npm install -g vercel
```

## 🚀 طريقة النشر

### الطريقة الأولى: عبر واجهة Vercel (سهلة)

1. **اذهب إلى [vercel.com](https://vercel.com) وسجل دخول**

2. **اضغط على "Add New Project"**

3. **اربط مستودع GitHub:**
   - اختر المستودع: `baseltayem1-btayem/wathiqcare-discharge-refusal`
   - اضغط "Import"

4. **إعدادات المشروع:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`

5. **إعداد المتغيرات البيئية:**
   ```
   BACKEND_API_BASE_URL=https://your-backend-url.com
   NEXT_PUBLIC_APP_URL=https://your-frontend-url.vercel.app
   DATABASE_URL=your_database_connection_string
   ```

6. **اضغط "Deploy"** ✅

---

### الطريقة الثانية: عبر سطر الأوامر

```bash
# 1. تثبيت Vercel CLI (إذا لم يكن مثبت)
npm install -g vercel

# 2. تسجيل الدخول
vercel login

# 3. الانتقال إلى مجلد المشروع
cd /workspaces/wathiqcare-discharge-refusal

# 4. تشغيل أمر النشر
vercel

# 5. اتبع التعليمات التفاعلية:
# - Set up and deploy? Yes
# - Which scope? اختر حسابك
# - Link to existing project? No (للمرة الأولى)
# - Project name? wathiqcare-discharge-refusal
# - Directory? ./frontend
# - Override settings? No

# 6. للنشر للإنتاج
vercel --prod
```

---

## 🔧 إعداد المتغيرات البيئية في Vercel

### عبر واجهة Vercel:
1. اذهب إلى Project Settings
2. اضغط على "Environment Variables"
3. أضف المتغيرات التالية:

| Variable | Value | Environment |
|----------|-------|-------------|
| `BACKEND_API_BASE_URL` | رابط الـ Backend API | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | رابط التطبيق على Vercel | Production, Preview |
| `DATABASE_URL` | رابط قاعدة البيانات | Production |

### عبر CLI:
```bash
vercel env add BACKEND_API_BASE_URL
vercel env add NEXT_PUBLIC_APP_URL
vercel env add DATABASE_URL
```

---

## 🔄 النشر التلقائي

بعد الربط بـ GitHub، كل push إلى branch `main` سيتم نشره تلقائياً:

- **Push إلى `main`** → نشر تلقائي للإنتاج
- **Pull Request** → نشر معاينة (Preview)

---

## 📊 مراقبة النشر

### التحقق من حالة النشر:
```bash
vercel ls
```

### عرض سجلات التطبيق:
```bash
vercel logs [deployment-url]
```

### فتح المشروع في المتصفح:
```bash
vercel open
```

---

## 🎨 دمج تصميم Figma

### الخيار 1: استخدام أدوات Figma to Code

1. **استخدم إضافة في Figma:**
   - [Anima](https://www.animaapp.com/) - تصدير إلى React
   - [Builder.io](https://www.builder.io/) - تحويل مرئي
   - [Quest](https://www.quest.ai/) - Figma إلى React/Next.js

2. **صدّر المكونات:**
   - افتح التصميم في Figma
   - استخدم الإضافة لتصدير المكونات كـ React
   - انسخ الكود إلى `frontend/components/`

### الخيار 2: التنفيذ اليدوي

إذا أردت تنفيذ التصميم يدوياً:

1. **استخرج الأصول:**
   - الصور: صدّرها من Figma كـ PNG/SVG
   - الأيقونات: استخدم مكتبة مثل `lucide-react` (مثبتة بالفعل)
   - الألوان: احفظها في ملف التكوين

2. **أنشئ المكونات:**
```bash
# مثال: إنشاء مكون جديد
touch frontend/components/FigmaHeroSection.tsx
```

3. **استخدم Tailwind CSS:**
   - المشروع يستخدم Tailwind CSS بالفعل
   - يمكنك استخدام classes جاهزة

---

## 🐛 حل المشاكل

### خطأ في البناء (Build Error):
```bash
# تحقق من السجلات
vercel logs --follow

# جرب البناء محلياً
cd frontend
npm run build
```

### مشاكل في البيئة:
```bash
# تحقق من المتغيرات البيئية
vercel env ls

# أضف متغير مفقود
vercel env add VARIABLE_NAME
```

---

## 📞 الدعم

- [وثائق Vercel](https://vercel.com/docs)
- [وثائق Next.js](https://nextjs.org/docs)
- [مجتمع Vercel](https://vercel.com/community)

---

## ✅ قائمة التحقق

- [ ] إنشاء حساب Vercel
- [ ] ربط مستودع GitHub
- [ ] إعداد المتغيرات البيئية
- [ ] تشغيل أول نشر
- [ ] التحقق من عمل الموقع
- [ ] إعداد Domain مخصص (اختياري)
- [ ] تفعيل النشر التلقائي

---

**تم إنشاء هذا الدليل بواسطة GitHub Copilot**
