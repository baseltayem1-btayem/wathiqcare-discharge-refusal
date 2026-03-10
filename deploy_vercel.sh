#!/bin/bash

# WathiqCare - Vercel Deployment Script
# نص نشر WathiqCare على Vercel

echo "🚀 WathiqCare Vercel Deployment Script"
echo "========================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI غير مثبت"
    echo "📦 جاري التثبيت..."
    npm install -g vercel
fi

echo "✅ Vercel CLI مثبت"
echo ""

# Navigate to project root
cd "$(dirname "$0")"

echo "📁 المجلد الحالي: $(pwd)"
echo ""

# Check if frontend exists
if [ ! -d "frontend" ]; then
    echo "❌ خطأ: مجلد frontend غير موجود"
    exit 1
fi

echo "📦 جاري تثبيت المتطلبات..."
cd frontend
npm install

if [ $? -ne 0 ]; then
    echo "❌ فشل تثبيت المتطلبات"
    exit 1
fi

echo "✅ تم تثبيت المتطلبات"
echo ""

# Build the project
echo "🔨 جاري بناء المشروع..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ فشل بناء المشروع"
    echo "💡 تحقق من الأخطاء أعلاه"
    exit 1
fi

echo "✅ تم بناء المشروع بنجاح"
echo ""

# Go back to root
cd ..

# Deploy
echo "🚀 جاري النشر على Vercel..."
echo ""
echo "⚠️  ملاحظة: سيطلب منك تسجيل الدخول إذا لم تكن مسجلاً"
echo ""

vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ✅ ✅ تم النشر بنجاح! ✅ ✅ ✅"
    echo ""
    echo "📊 لعرض المشروع: vercel open"
    echo "📋 لعرض قائمة النشر: vercel ls"
    echo "🔍 لعرض السجلات: vercel logs"
    echo ""
else
    echo ""
    echo "❌ فشل النشر"
    echo "💡 جرب: vercel --debug للحصول على معلومات أكثر"
    exit 1
fi
