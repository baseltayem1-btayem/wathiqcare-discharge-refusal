## 🎨 تحويل تصميم Figma + النشر على Vercel

### ⚡ ابدأ من هنا: [QUICK_START_FIGMA.md](QUICK_START_FIGMA.md)

---

## الخطوات باختصار:

### 1. تحويل Figma إلى كود (20 دقيقة)

```bash
# في Figma:
# 1. Resources → Plugins → "Anima" أو "Quest"
# 2. Export to Next.js + Tailwind
# 3. Download ZIP

# في Terminal:
cd ~/Downloads
unzip export.zip -d figma-output
cp -r figma-output/components/* /workspaces/wathiqcare-discharge-refusal/frontend/components/figma/
cp -r figma-output/assets/* /workspaces/wathiqcare-discharge-refusal/frontend/public/figma-assets/
```

### 2. النشر على Vercel (5 دقائق)

```bash
cd /workspaces/wathiqcare-discharge-refusal
./deploy_vercel.sh
```

---

## 📚 الأدلة الكاملة:

| الملف | الوصف |
|-------|-------|
| **[QUICK_START_FIGMA.md](QUICK_START_FIGMA.md)** | 👈 **ابدأ هنا** - خطوات سريعة (5 خطوات) |
| [FIGMA_TO_CODE_GUIDE.md](FIGMA_TO_CODE_GUIDE.md) | دليل مفصل لاستخدام Anima/Quest/Locofy |
| [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) | دليل شامل للنشر على Vercel |
| [FIGMA_INTEGRATION.md](FIGMA_INTEGRATION.md) | دليل الدمج الكامل |

---

## 🗂️ المجلدات الجاهزة:

```
✅ frontend/components/figma/        # ضع مكونات Figma هنا
✅ frontend/public/figma-assets/     # ضع صور/أيقونات Figma هنا
```

---

## 🎯 اختر طريقتك:

### الطريقة أ: تحويل تلقائي (سريع)
استخدم Anima أو Quest لتحويل Figma → انسخ الملفات → انشر

### الطريقة ب: نشر فوري (أسرع)
انشر المشروع الحالي مباشرة على Vercel بدون تعديل التصميم

---

## 🚀 نشر سريع (بدون Figma):

إذا كنت تريد النشر فقط بدون تعديل التصميم:

```bash
./deploy_vercel.sh
```

---

**المدة الإجمالية:** 25-30 دقيقة فقط! ⚡
