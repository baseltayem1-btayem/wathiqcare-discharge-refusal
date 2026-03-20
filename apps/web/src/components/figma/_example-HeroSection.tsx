// مثال على مكون Hero Section مُصدّر من Figma
// هذا ملف توضيحي - سيتم استبداله بالمكونات الفعلية من Figma

import Image from 'next/image';
import Link from 'next/link';

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
}

export default function HeroSectionExample({
  title = "واثق كير - منصة إدارة حالات الخروج الطبي",
  subtitle = "حل رقمي شامل لإدارة موافقات ورفض الخروج الطبي بمعايير عالمية",
  ctaText = "الدخول إلى النظام",
  ctaLink = "/login",
  imageUrl = "/figma-assets/images/hero-illustration.png"
}: HeroSectionProps) {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-grid-pattern"></div>
      </div>

      <div className="relative container mx-auto px-4 py-20 lg:py-32">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          
          {/* Content */}
          <div className="flex-1 text-white space-y-8 text-center lg:text-right">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span>منصة معتمدة من وزارة الصحة</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              {title}
            </h1>

            {/* Subtitle */}
            <p className="text-lg lg:text-xl opacity-90 max-w-2xl mx-auto lg:mx-0">
              {subtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link 
                href={ctaLink}
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                {ctaText}
              </Link>
              <Link 
                href="/request-demo"
                className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300"
              >
                طلب عرض توضيحي
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-8 pt-8">
              <div className="text-center lg:text-right">
                <div className="text-3xl font-bold">+500</div>
                <div className="text-sm opacity-75">منشأة صحية</div>
              </div>
              <div className="text-center lg:text-right">
                <div className="text-3xl font-bold">+50K</div>
                <div className="text-sm opacity-75">حالة مُدارة</div>
              </div>
              <div className="text-center lg:text-right">
                <div className="text-3xl font-bold">99.9%</div>
                <div className="text-sm opacity-75">معدل الامتثال</div>
              </div>
            </div>
          </div>

          {/* Illustration/Image */}
          <div className="flex-1 relative">
            <div className="relative w-full aspect-square max-w-xl mx-auto">
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
              <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
              
              {/* Main Image */}
              <div className="relative z-10">
                {imageUrl && (
                  <Image
                    src={imageUrl}
                    alt="WathiqCare Platform"
                    width={600}
                    height={600}
                    className="drop-shadow-2xl"
                    priority
                  />
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-white rounded-full"></div>
        </div>
      </div>
    </section>
  );
}
