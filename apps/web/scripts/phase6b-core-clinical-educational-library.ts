import "dotenv/config";

import { getPrisma } from "../src/lib/server/prisma";
import {
  approveEducationPackage,
  createEducationPackage,
  createEducationPackageVersion,
  generateEducationEvidencePackage,
  linkEducationPackageToConsentTemplate,
} from "../src/lib/server/education-library-service";

type LocalizedLine = { ar: string; en: string };
type LocalizedFaq = { questionAr: string; answerAr: string; questionEn: string; answerEn: string };

type PackageSpec = {
  packageKey: string;
  titleAr: string;
  titleEn: string;
  clinicalDomain: string;
  procedureCode: string;
  procedureFamily: string;
  baselineSummary: LocalizedLine;
  productionSummary: LocalizedLine;
  risks: LocalizedLine[];
  benefits: LocalizedLine[];
  faq: LocalizedFaq[];
  preProcedureInstructions: LocalizedLine[];
  postProcedureInstructions: LocalizedLine[];
};

type ValidationResult = {
  packageKey: string;
  packageId: string;
  versionId: string;
  evidencePackageId: string;
  contentHash: string;
  auditEventCount: number;
  validation: {
    packageCreated: boolean;
    packageApproved: boolean;
    versionGenerated: boolean;
    contentHashGenerated: boolean;
    evidencePackageGenerated: boolean;
    auditTrailGenerated: boolean;
    consentTemplateLinked: boolean;
  };
};

const PACKAGE_SPECS: PackageSpec[] = [
  {
    packageKey: "blood-transfusion-education-package",
    titleAr: "حزمة التثقيف الخاصة بنقل الدم",
    titleEn: "Blood Transfusion Education Package",
    clinicalDomain: "hematology",
    procedureCode: "blood-transfusion",
    procedureFamily: "transfusion",
    baselineSummary: {
      ar: "يشرح هذا المحتوى سبب نقل الدم وخطوات التحقق والمراقبة قبل نقل الدم وأثناءه وبعده.",
      en: "This package explains why a blood transfusion is needed and how verification and monitoring happen before, during, and after transfusion.",
    },
    productionSummary: {
      ar: "نقل الدم هو إعطاء مكونات دم متوافقة لتعويض نقص الدم أو الصفائح أو عوامل التخثر مع إجراءات صارمة للتحقق من المطابقة ومراقبة أي تفاعل أثناء النقل وبعده.",
      en: "Blood transfusion is the administration of compatible blood components to replace deficient blood, platelets, or clotting factors under strict matching and monitoring processes to detect any reaction during and after transfusion.",
    },
    risks: [
      {
        ar: "تفاعل تحسسي أو حمى أثناء النقل وقد يتطلب إيقاف النقل وإعطاء علاج داعم.",
        en: "An allergic reaction or fever may occur during transfusion and may require the transfusion to be stopped and supportive treatment to be given.",
      },
      {
        ar: "زيادة السوائل أو ضيق التنفس، خاصة لدى المرضى المصابين بأمراض القلب أو الكلى.",
        en: "Fluid overload or shortness of breath may occur, especially in patients with heart or kidney disease.",
      },
      {
        ar: "تفاعل انحلالي نادر إذا حدثت مشكلة في المطابقة، ولذلك تتم مراجعة الهوية والعينة بدقة شديدة.",
        en: "A rare hemolytic reaction can happen if there is a compatibility problem, which is why identity and specimen matching are checked very carefully.",
      },
      {
        ar: "يبقى خطر انتقال بعض العدوى منخفضاً جداً بسبب الفحوصات المخبرية الصارمة لكنه ليس صفراً تماماً.",
        en: "The risk of transmitting certain infections remains very low because of strict blood screening, but it is not absolutely zero.",
      },
    ],
    benefits: [
      {
        ar: "رفع مستوى الهيموغلوبين أو تعويض الصفائح أو عوامل التخثر عند الحاجة الطبية.",
        en: "Improves hemoglobin levels or replaces platelets or clotting factors when medically necessary.",
      },
      {
        ar: "يساعد على تحسين توصيل الأكسجين وتقليل أعراض فقر الدم أو النزيف.",
        en: "Helps improve oxygen delivery and reduce symptoms related to anemia or bleeding.",
      },
      {
        ar: "يدعم استقرار المريض قبل الجراحة أو أثناء النزيف أو خلال العلاجات المعقدة.",
        en: "Supports patient stability before surgery, during bleeding, or throughout complex treatments.",
      },
    ],
    faq: [
      {
        questionAr: "كيف تتأكدون أن الدم مناسب لي؟",
        answerAr: "تتم مطابقة فصيلة الدم وإجراء اختبارات توافق ومراجعة هوية المريض ووحدة الدم أكثر من مرة قبل بدء النقل.",
        questionEn: "How do you make sure the blood is right for me?",
        answerEn: "Your blood type is matched, compatibility testing is performed, and both patient identity and the blood unit are checked multiple times before transfusion starts.",
      },
      {
        questionAr: "كم يستغرق نقل الدم؟",
        answerAr: "يعتمد ذلك على نوع المكون المنقول وحالتك السريرية، لكن كثيراً من عمليات النقل تستغرق من ساعة إلى عدة ساعات.",
        questionEn: "How long does a transfusion take?",
        answerEn: "It depends on the type of blood component and your clinical condition, but many transfusions take from about one hour to several hours.",
      },
      {
        questionAr: "ماذا أفعل إذا شعرت بحكة أو قشعريرة أثناء النقل؟",
        answerAr: "أبلغ الطاقم فوراً لأن الفريق قد يوقف النقل مؤقتاً ويقيّم الأعراض مباشرة.",
        questionEn: "What should I do if I feel itchy or chilled during the transfusion?",
        answerEn: "Tell the staff immediately because the team may pause the transfusion and assess your symptoms right away.",
      },
    ],
    preProcedureInstructions: [
      {
        ar: "أخبر الفريق عن أي تفاعل سابق لنقل الدم أو أي حساسية دوائية معروفة.",
        en: "Tell the team about any previous transfusion reaction or any known medication allergy.",
      },
      {
        ar: "تأكد من سوار الهوية وشارك في التحقق من اسمك ورقمك الطبي إذا طلب منك ذلك.",
        en: "Make sure your identification band is in place and help verify your name and medical number if you are asked.",
      },
      {
        ar: "أبلغ الفريق عن أي أعراض حالية مثل الحمى أو ضيق التنفس قبل بدء النقل.",
        en: "Tell the team about any current symptoms such as fever or shortness of breath before the transfusion begins.",
      },
    ],
    postProcedureInstructions: [
      {
        ar: "أبلغ الطاقم فوراً إذا ظهرت حمى أو طفح أو ضيق نفس أو ألم صدري خلال النقل أو بعده.",
        en: "Tell the staff immediately if you develop fever, rash, shortness of breath, or chest discomfort during or after the transfusion.",
      },
      {
        ar: "قد يطلب منك الفريق مراقبة العلامات الحيوية أو إجراء تحاليل دم متابعة بعد النقل.",
        en: "The team may continue to monitor your vital signs or order follow-up blood tests after transfusion.",
      },
      {
        ar: "إذا غادرت المستشفى وظهرت عليك أعراض غير معتادة، فتواصل مع المستشفى أو راجع الطوارئ فوراً.",
        en: "If you leave the hospital and then develop unusual symptoms, contact the hospital or seek emergency care immediately.",
      },
    ],
  },
  {
    packageKey: "endoscopy-education-package",
    titleAr: "حزمة التثقيف الخاصة بالمنظار العلوي",
    titleEn: "Endoscopy Education Package",
    clinicalDomain: "gastroenterology",
    procedureCode: "endoscopy",
    procedureFamily: "endoscopy",
    baselineSummary: {
      ar: "يشرح هذا المحتوى كيف يُستخدم المنظار العلوي لفحص المريء والمعدة والاثني عشر وما المتوقع قبل الإجراء وبعده.",
      en: "This package explains how upper endoscopy is used to examine the esophagus, stomach, and duodenum, and what to expect before and after the procedure.",
    },
    productionSummary: {
      ar: "المنظار العلوي إجراء يُدخل فيه أنبوب مرن مزود بكاميرا عبر الفم لفحص الجهاز الهضمي العلوي وتشخيص النزيف أو الالتهاب أو القرحة أو أخذ عينات نسيجية عند الحاجة.",
      en: "Upper endoscopy is a procedure in which a flexible camera-equipped tube is passed through the mouth to inspect the upper digestive tract and diagnose bleeding, inflammation, ulcers, or obtain tissue samples when needed.",
    },
    risks: [
      {
        ar: "التهاب حلق أو انتفاخ أو انزعاج بسيط بعد الإجراء ويكون عادة مؤقتاً.",
        en: "A sore throat, bloating, or mild discomfort may occur after the procedure and is usually temporary.",
      },
      {
        ar: "نزيف قد يحدث بعد أخذ خزعة أو إزالة آفة ويكون غالباً محدوداً لكنه قد يحتاج إلى تدخل.",
        en: "Bleeding can occur after a biopsy or lesion removal and is often limited, but it may need further intervention.",
      },
      {
        ar: "ثقب في الجهاز الهضمي العلوي نادر لكنه من المضاعفات الخطيرة التي قد تتطلب جراحة.",
        en: "A perforation of the upper gastrointestinal tract is rare but serious and may require surgery.",
      },
      {
        ar: "مضاعفات مرتبطة بالمهدئات مثل انخفاض الأكسجين أو انخفاض الضغط وتتم مراقبتها أثناء الإجراء.",
        en: "Sedation-related complications such as low oxygen levels or low blood pressure can occur and are monitored during the procedure.",
      },
    ],
    benefits: [
      {
        ar: "يساعد على تشخيص أسباب الألم أو النزيف أو صعوبة البلع بدقة مباشرة.",
        en: "Helps diagnose causes of pain, bleeding, or difficulty swallowing through direct visualization.",
      },
      {
        ar: "يسمح بأخذ عينات نسيجية أو تنفيذ علاجات محددة أثناء نفس الإجراء في بعض الحالات.",
        en: "Allows tissue samples to be taken or certain treatments to be performed during the same procedure in some cases.",
      },
      {
        ar: "قد يقلل الحاجة إلى إجراءات أكثر تدخلاً إذا أمكن الوصول إلى التشخيص أو العلاج بالمنظار.",
        en: "May reduce the need for more invasive procedures if diagnosis or treatment can be achieved endoscopically.",
      },
    ],
    faq: [
      {
        questionAr: "هل سأكون مستيقظاً أثناء المنظار؟",
        answerAr: "يعتمد ذلك على الخطة الطبية، لكن كثيراً من المرضى يتلقون مهدئاً يجعلهم مرتاحين وقد لا يتذكرون تفاصيل الإجراء.",
        questionEn: "Will I be awake during the endoscopy?",
        answerEn: "It depends on the medical plan, but many patients receive sedation that keeps them comfortable and may not remember the details of the procedure.",
      },
      {
        questionAr: "هل يمكنني الأكل بعد الإجراء؟",
        answerAr: "عادة يسمح لك بالأكل أو الشرب بعد زوال تأثير التخدير الموضعي وعودة القدرة على البلع وفق تعليمات الطبيب.",
        questionEn: "Can I eat after the procedure?",
        answerEn: "You are usually allowed to eat or drink after the throat numbing effect wears off and swallowing returns safely, according to your doctor's instructions.",
      },
      {
        questionAr: "متى أطلب المساعدة بعد المنظار؟",
        answerAr: "اطلب المساعدة إذا ظهر ألم شديد أو قيء دموي أو براز أسود أو حرارة أو صعوبة تنفس.",
        questionEn: "When should I seek help after endoscopy?",
        answerEn: "Seek help if you develop severe pain, bloody vomiting, black stool, fever, or breathing difficulty.",
      },
    ],
    preProcedureInstructions: [
      {
        ar: "التزم بتعليمات الصيام قبل الإجراء حتى تكون المعدة فارغة وآمنة للفحص.",
        en: "Follow fasting instructions before the procedure so the stomach is empty and the examination can be done safely.",
      },
      {
        ar: "أخبر الطبيب عن مميعات الدم أو السكري أو أي حساسية أو أسنان متحركة.",
        en: "Tell the doctor about blood thinners, diabetes, allergies, or removable dental appliances.",
      },
      {
        ar: "رتب وسيلة نقل للعودة إلى المنزل إذا كنت ستتلقى مهدئاً.",
        en: "Arrange transportation home if you will receive sedation.",
      },
    ],
    postProcedureInstructions: [
      {
        ar: "لا تقد السيارة أو تستخدم آلات خطرة في يوم الإجراء إذا تلقيت مهدئاً.",
        en: "Do not drive or operate dangerous machinery on the day of the procedure if you received sedation.",
      },
      {
        ar: "قد تشعر باحتقان حلق بسيط أو غازات بعد المنظار وهذا غالباً يتحسن سريعاً.",
        en: "You may have a mild sore throat or gas after the endoscopy, and this usually improves quickly.",
      },
      {
        ar: "تواصل مع المستشفى فوراً إذا حدث ألم متزايد أو نزيف أو حرارة أو صعوبة بلع شديدة.",
        en: "Contact the hospital immediately if you develop worsening pain, bleeding, fever, or severe difficulty swallowing.",
      },
    ],
  },
  {
    packageKey: "colonoscopy-education-package",
    titleAr: "حزمة التثقيف الخاصة بمنظار القولون",
    titleEn: "Colonoscopy Education Package",
    clinicalDomain: "gastroenterology",
    procedureCode: "colonoscopy",
    procedureFamily: "endoscopy",
    baselineSummary: {
      ar: "يشرح هذا المحتوى كيف يُستخدم منظار القولون لفحص القولون والمستقيم وما الذي يجب فعله للتحضير للإجراء.",
      en: "This package explains how colonoscopy is used to examine the colon and rectum and what you need to do to prepare for the procedure.",
    },
    productionSummary: {
      ar: "منظار القولون إجراء يُستخدم فيه أنبوب مرن مزود بكاميرا لفحص القولون والمستقيم وتشخيص النزيف أو الالتهاب أو الزوائد اللحمية وإزالتها أو أخذ عينات عند الحاجة.",
      en: "Colonoscopy is a procedure that uses a flexible camera-equipped tube to inspect the colon and rectum, diagnose bleeding, inflammation, or polyps, and remove polyps or take biopsies when needed.",
    },
    risks: [
      {
        ar: "انتفاخ أو تقلصات أو انزعاج بطني مؤقت بعد الفحص.",
        en: "Temporary bloating, cramping, or abdominal discomfort may occur after the examination.",
      },
      {
        ar: "نزيف قد يحدث بعد إزالة زائدة لحمية أو أخذ خزعة.",
        en: "Bleeding may occur after a polyp is removed or a biopsy is taken.",
      },
      {
        ar: "ثقب في القولون نادر لكنه من المضاعفات الخطيرة وقد يحتاج إلى جراحة.",
        en: "A perforation of the colon is rare but serious and may require surgery.",
      },
      {
        ar: "مضاعفات المهدئات مثل النعاس الشديد أو انخفاض الأكسجين أو الضغط وتتم مراقبتها أثناء الإجراء.",
        en: "Sedation-related complications such as excessive drowsiness, low oxygen, or low blood pressure can occur and are monitored during the procedure.",
      },
    ],
    benefits: [
      {
        ar: "يساعد على تشخيص أسباب النزيف أو فقر الدم أو تغير عادات الإخراج أو الألم.",
        en: "Helps diagnose causes of bleeding, anemia, bowel habit changes, or pain.",
      },
      {
        ar: "يسمح باكتشاف الزوائد اللحمية وإزالتها بما قد يقلل خطر تطور سرطان القولون.",
        en: "Allows polyps to be detected and removed, which may reduce the risk of colon cancer developing.",
      },
      {
        ar: "يوفر رؤية مباشرة للقولون مع إمكانية أخذ عينات لتأكيد التشخيص.",
        en: "Provides direct visualization of the colon with the ability to take samples to confirm diagnosis.",
      },
    ],
    faq: [
      {
        questionAr: "لماذا يعتبر التحضير مهماً جداً؟",
        answerAr: "لأن تنظيف القولون بشكل جيد يسمح للطبيب برؤية البطانة بوضوح واكتشاف المشكلات أو الزوائد الصغيرة.",
        questionEn: "Why is the bowel preparation so important?",
        answerEn: "Because a well-cleaned colon allows the doctor to see the lining clearly and detect problems or small polyps.",
      },
      {
        questionAr: "هل سأشعر بالألم أثناء الفحص؟",
        answerAr: "كثير من المرضى يتلقون مهدئاً يقلل الانزعاج، وقد يشعر بعضهم بضغط أو تقلصات بسيطة أثناء الفحص.",
        questionEn: "Will I feel pain during the examination?",
        answerEn: "Many patients receive sedation that reduces discomfort, though some may still feel pressure or mild cramping during the examination.",
      },
      {
        questionAr: "متى أطلب المساعدة بعد منظار القولون؟",
        answerAr: "اطلب المساعدة إذا ظهر ألم شديد أو نزيف غزير أو حرارة أو دوخة مستمرة.",
        questionEn: "When should I seek help after colonoscopy?",
        answerEn: "Seek help if you develop severe pain, heavy bleeding, fever, or persistent dizziness.",
      },
    ],
    preProcedureInstructions: [
      {
        ar: "التزم بتعليمات تنظيف القولون وشرب محلول التحضير في الأوقات المحددة.",
        en: "Follow the bowel-cleansing instructions and drink the preparation solution at the times you were given.",
      },
      {
        ar: "اتبع تعليمات الطعام والسوائل الصافية قبل الإجراء كما يحددها الفريق الطبي.",
        en: "Follow the food and clear-liquid instructions before the procedure as directed by the clinical team.",
      },
      {
        ar: "ناقش مع الطبيب أدوية السكري ومميعات الدم وأي أمراض مزمنة قبل موعد الإجراء.",
        en: "Discuss diabetes medicines, blood thinners, and any chronic illnesses with the doctor before the procedure date.",
      },
    ],
    postProcedureInstructions: [
      {
        ar: "لا تقد السيارة في يوم الفحص إذا تلقيت مهدئاً، ورتب وجود مرافق إذا طُلب منك ذلك.",
        en: "Do not drive on the day of the examination if you received sedation, and arrange for someone to accompany you if instructed.",
      },
      {
        ar: "قد تشعر بانتفاخ أو خروج غازات بعد الإجراء وهذا شائع عادة.",
        en: "You may feel bloated or pass gas after the procedure, and this is commonly expected.",
      },
      {
        ar: "راجع الطوارئ أو تواصل مع المستشفى إذا كان لديك ألم شديد أو نزيف متكرر أو حرارة.",
        en: "Go to emergency care or contact the hospital if you have severe pain, repeated bleeding, or fever.",
      },
    ],
  },
  {
    packageKey: "mri-contrast-education-package",
    titleAr: "حزمة التثقيف الخاصة بصبغة الرنين المغناطيسي",
    titleEn: "MRI Contrast Education Package",
    clinicalDomain: "radiology",
    procedureCode: "mri-contrast",
    procedureFamily: "contrast-imaging",
    baselineSummary: {
      ar: "يشرح هذا المحتوى سبب استخدام صبغة الرنين المغناطيسي وكيف تتم مراقبتك قبل الفحص وبعده.",
      en: "This package explains why MRI contrast is used and how you are monitored before and after the scan.",
    },
    productionSummary: {
      ar: "تُستخدم صبغة الرنين المغناطيسي لتحسين وضوح بعض الأنسجة أو الأوعية أو الأورام في صور الرنين، ويتم تقييم وظائف الكلى والحساسية والتاريخ المرضي قبل إعطائها عند الحاجة.",
      en: "MRI contrast is used to improve visualization of certain tissues, vessels, or tumors on MRI scans, and kidney function, allergy history, and relevant medical risks are reviewed before it is given when needed.",
    },
    risks: [
      {
        ar: "تحسس دوائي أو طفح أو حكة، ويكون غالباً خفيفاً لكنه قد يكون شديداً في حالات نادرة.",
        en: "An allergic reaction, rash, or itching can occur and is usually mild, though severe reactions are rare.",
      },
      {
        ar: "غثيان أو دوخة أو إحساس مؤقت بالحرارة بعد الحقن.",
        en: "Nausea, dizziness, or a temporary warm sensation may happen after the injection.",
      },
      {
        ar: "مخاطر أعلى لدى بعض المرضى المصابين بضعف شديد في وظائف الكلى، لذلك قد يلزم تقييم إضافي قبل الحقن.",
        en: "Risk may be higher in some patients with severe kidney impairment, so additional assessment may be required before contrast is given.",
      },
      {
        ar: "انزعاج أو تورم موضعي إذا تسربت الصبغة خارج الوريد.",
        en: "Local discomfort or swelling can occur if contrast leaks outside the vein.",
      },
    ],
    benefits: [
      {
        ar: "تحسين جودة الصور وقدرة الأطباء على تمييز الأنسجة أو الالتهاب أو الأورام.",
        en: "Improves image quality and helps doctors distinguish tissues, inflammation, or tumors more clearly.",
      },
      {
        ar: "قد يزيد دقة التشخيص ويُحسن التخطيط للعلاج أو المتابعة.",
        en: "May improve diagnostic accuracy and support better treatment planning or follow-up.",
      },
      {
        ar: "يساعد على تقييم الأوعية أو المناطق التي يصعب تفسيرها بدون صبغة في بعض الحالات.",
        en: "Helps assess vessels or areas that are harder to interpret without contrast in selected cases.",
      },
    ],
    faq: [
      {
        questionAr: "هل صبغة الرنين هي نفسها صبغة الأشعة المقطعية؟",
        answerAr: "ليست دائماً نفسها؛ فصبغة الرنين غالباً تختلف في التركيب عن صبغة الأشعة المقطعية ويحدد الفريق النوع المناسب للفحص.",
        questionEn: "Is MRI contrast the same as CT contrast?",
        answerEn: "Not always. MRI contrast is usually different in composition from CT contrast, and the team chooses the appropriate type for the scan.",
      },
      {
        questionAr: "هل أحتاج إلى فحص وظائف الكلى قبل الصبغة؟",
        answerAr: "قد تحتاج إلى ذلك بحسب عمرك وأمراضك المزمنة ونتائجك السابقة، خاصة إذا كان لديك مرض كلوي معروف.",
        questionEn: "Do I need kidney function testing before contrast?",
        answerEn: "You may need it depending on your age, chronic conditions, and prior results, especially if you have known kidney disease.",
      },
      {
        questionAr: "متى أبلغ عن الأعراض بعد الفحص؟",
        answerAr: "أبلغ فوراً إذا ظهرت صعوبة تنفس أو تورم أو طفح شديد أو ألم متزايد في موضع الحقن.",
        questionEn: "When should I report symptoms after the scan?",
        answerEn: "Report immediately if you develop breathing difficulty, swelling, a severe rash, or increasing pain at the injection site.",
      },
    ],
    preProcedureInstructions: [
      {
        ar: "أخبر الفريق عن أي حساسية سابقة للصبغات أو أي مرض كلوي أو حمل أو أجهزة معدنية مزروعة.",
        en: "Tell the team about any prior contrast allergy, kidney disease, pregnancy, or implanted metal devices.",
      },
      {
        ar: "أحضر نتائج وظائف الكلى الحديثة إذا طُلب منك ذلك قبل الفحص.",
        en: "Bring recent kidney function results if you were asked to have them checked before the scan.",
      },
      {
        ar: "اتبع تعليمات الطعام أو السوائل أو الأدوية إذا أعطاك الفريق تعليمات محددة قبل الموعد.",
        en: "Follow any food, fluid, or medication instructions given to you before the appointment.",
      },
    ],
    postProcedureInstructions: [
      {
        ar: "اشرب السوائل حسب توجيهات الفريق إذا لم تكن لديك قيود طبية للمساعدة في التعافي بعد الفحص.",
        en: "Drink fluids as directed by the team, unless you have medical restrictions, to help recovery after the scan.",
      },
      {
        ar: "راقب موضع الحقن وأبلغ عن أي ألم شديد أو تورم أو احمرار متزايد.",
        en: "Monitor the injection site and report any severe pain, swelling, or increasing redness.",
      },
      {
        ar: "اطلب المساعدة فوراً إذا ظهرت أعراض تحسسية متأخرة مثل طفح شديد أو ضيق تنفس.",
        en: "Seek immediate help if delayed allergic symptoms such as a severe rash or shortness of breath occur.",
      },
    ],
  },
  {
    packageKey: "ct-contrast-education-package",
    titleAr: "حزمة التثقيف الخاصة بصبغة الأشعة المقطعية",
    titleEn: "CT Contrast Education Package",
    clinicalDomain: "radiology",
    procedureCode: "ct-contrast",
    procedureFamily: "contrast-imaging",
    baselineSummary: {
      ar: "يشرح هذا المحتوى سبب استخدام صبغة الأشعة المقطعية وكيفية التحضير والمراقبة بعد الحقن.",
      en: "This package explains why CT contrast is used and how to prepare for the scan and monitoring after injection.",
    },
    productionSummary: {
      ar: "تُستخدم صبغة الأشعة المقطعية لزيادة وضوح الأوعية والأعضاء وبعض الالتهابات أو الكتل في صور الأشعة، مع تقييم الحساسية ووظائف الكلى والأدوية ذات الصلة قبل إعطائها عند الحاجة.",
      en: "CT contrast is used to improve visualization of blood vessels, organs, and certain inflammatory or mass lesions on CT imaging, with allergy history, kidney function, and relevant medications reviewed before administration when needed.",
    },
    risks: [
      {
        ar: "إحساس بالحرارة أو طعم معدني أو غثيان خفيف أثناء الحقن ويكون عادة مؤقتاً.",
        en: "A warm sensation, metallic taste, or mild nausea may occur during injection and is usually temporary.",
      },
      {
        ar: "تفاعل تحسسي قد يكون خفيفاً مثل الحكة أو نادراً شديداً مثل صعوبة التنفس.",
        en: "An allergic reaction can occur, ranging from mild itching to rare severe breathing difficulty.",
      },
      {
        ar: "قد تتأثر وظائف الكلى لدى بعض المرضى المعرضين للخطر، خصوصاً من لديهم مرض كلوي سابق.",
        en: "Kidney function may be affected in some higher-risk patients, especially those with prior kidney disease.",
      },
      {
        ar: "ألم أو تورم موضعي إذا حدث تسرب للصبغة خارج الوريد.",
        en: "Pain or local swelling can occur if the contrast leaks outside the vein.",
      },
    ],
    benefits: [
      {
        ar: "يزيد وضوح الصور ويساعد الطبيب على تقييم الأوعية والأعضاء والالتهابات أو الكتل بشكل أدق.",
        en: "Improves image clarity and helps the doctor assess vessels, organs, inflammation, or masses more accurately.",
      },
      {
        ar: "قد يسرّع الوصول إلى التشخيص الصحيح وخطة العلاج المناسبة.",
        en: "May speed up the path to the correct diagnosis and an appropriate treatment plan.",
      },
      {
        ar: "يساعد على تحديد مدى المشكلة أو وجود مضاعفات بدقة أكبر في بعض الحالات الطارئة أو المعقدة.",
        en: "Helps define the extent of a problem or identify complications more accurately in certain urgent or complex situations.",
      },
    ],
    faq: [
      {
        questionAr: "هل سأشعر بشيء عند حقن الصبغة؟",
        answerAr: "يشعر بعض المرضى بدفء مؤقت أو طعم معدني في الفم وهذا غالباً يزول بسرعة.",
        questionEn: "Will I feel anything when the contrast is injected?",
        answerEn: "Some patients feel temporary warmth or a metallic taste in the mouth, and this usually goes away quickly.",
      },
      {
        questionAr: "هل يمكنني تناول أدوية السكري أو الأدوية الأخرى؟",
        answerAr: "يجب مراجعة أدوية السكري وبعض الأدوية الأخرى مع الفريق قبل الفحص لأن بعض المرضى يحتاجون تعليمات خاصة.",
        questionEn: "Can I take my diabetes medicines or other medications?",
        answerEn: "Diabetes medicines and some other drugs should be reviewed with the team before the scan because some patients need special instructions.",
      },
      {
        questionAr: "متى أطلب المساعدة بعد الفحص؟",
        answerAr: "اطلب المساعدة إذا ظهر طفح شديد أو صعوبة تنفس أو قلة بول أو ألم شديد في موضع الحقن.",
        questionEn: "When should I seek help after the scan?",
        answerEn: "Seek help if you develop a severe rash, breathing difficulty, reduced urine output, or severe pain at the injection site.",
      },
    ],
    preProcedureInstructions: [
      {
        ar: "أخبر الفريق عن أي حساسية سابقة للصبغات أو الربو أو أمراض الكلى أو الحمل.",
        en: "Tell the team about any prior contrast allergy, asthma, kidney disease, or pregnancy.",
      },
      {
        ar: "أحضر نتائج وظائف الكلى الحديثة إذا طلبها الطبيب قبل الفحص.",
        en: "Bring recent kidney function results if your doctor requested them before the scan.",
      },
      {
        ar: "اتبع تعليمات الصيام أو الأدوية الخاصة بك كما يحددها فريق الأشعة.",
        en: "Follow any fasting or medication instructions provided by the radiology team.",
      },
    ],
    postProcedureInstructions: [
      {
        ar: "اشرب السوائل حسب التوجيهات الطبية إذا لم تكن لديك قيود على السوائل.",
        en: "Drink fluids as medically directed if you do not have fluid restrictions.",
      },
      {
        ar: "راقب أعراض الحساسية المتأخرة أو ألم موضع الإبرة وأبلغ عنها عند حدوثها.",
        en: "Watch for delayed allergy symptoms or pain at the needle site and report them if they occur.",
      },
      {
        ar: "تواصل مع المستشفى إذا ظهرت صعوبة تنفس أو طفح شديد أو قلة بول أو تورم متزايد.",
        en: "Contact the hospital if you develop breathing difficulty, a severe rash, reduced urine output, or increasing swelling.",
      },
    ],
  },
];

function buildManifest(spec: PackageSpec, revision: "baseline" | "production") {
  const summary = revision === "production" ? spec.productionSummary : spec.baselineSummary;

  return {
    packageKind: "production-educational-package",
    procedureFamily: spec.procedureFamily,
    procedureName: {
      ar: spec.titleAr,
      en: spec.titleEn,
    },
    languages: ["ar", "en"],
    revision,
    educationalSummary: summary,
    risks: spec.risks,
    benefits: spec.benefits,
    faq: spec.faq,
    preProcedureInstructions: spec.preProcedureInstructions,
    postProcedureInstructions: spec.postProcedureInstructions,
    validationChecklist: {
      bilingualContent: true,
      summary: true,
      risks: true,
      benefits: true,
      faq: true,
      preProcedureInstructions: true,
      postProcedureInstructions: true,
      imageAsset: true,
      videoAsset: true,
    },
  };
}

function buildAssets(spec: PackageSpec, revision: "baseline" | "production") {
  const suffix = revision === "production" ? "production" : "baseline";

  return [
    {
      assetKey: `${spec.procedureCode}-image-${suffix}`,
      assetType: "IMAGE",
      title: `${spec.titleEn} Placeholder Image`,
      locale: "bilingual",
      sourceUri: `placeholder://${spec.procedureCode}/${suffix}/image`,
      thumbnailUri: `placeholder://${spec.procedureCode}/${suffix}/image-thumb`,
      sortOrder: 100,
      metadata: { placeholder: true, revision, category: "overview" },
    },
    {
      assetKey: `${spec.procedureCode}-video-${suffix}`,
      assetType: "VIDEO",
      title: `${spec.titleEn} Placeholder Video`,
      locale: "bilingual",
      sourceUri: `placeholder://${spec.procedureCode}/${suffix}/video`,
      thumbnailUri: `placeholder://${spec.procedureCode}/${suffix}/video-thumb`,
      sortOrder: 200,
      metadata: { placeholder: true, revision, category: "education_video" },
    },
  ];
}

async function resolveTenantContext() {
  const prisma = getPrisma();
  const configuredTenantId = process.env.EDUCATION_DEMO_TENANT_ID?.trim() || null;
  const templateVersion = configuredTenantId
    ? await prisma.consentTemplateVersion.findFirst({
        where: { tenantId: configuredTenantId },
        include: {
          template: {
            select: {
              id: true,
              templateCode: true,
            },
          },
        },
        orderBy: [{ approvedAt: "desc" }, { createdAt: "asc" }],
      })
    : await prisma.consentTemplateVersion.findFirst({
        include: {
          template: {
            select: {
              id: true,
              templateCode: true,
            },
          },
        },
        orderBy: [{ approvedAt: "desc" }, { createdAt: "asc" }],
      });

  const resolvedTenantId = configuredTenantId || templateVersion?.tenantId || null;
  const tenant = resolvedTenantId
    ? await prisma.tenant.findUnique({ where: { id: resolvedTenantId }, select: { id: true } })
    : await prisma.tenant.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });

  if (!tenant?.id) {
    throw new Error("No tenant found for Phase 6B package creation");
  }

  const actor = await prisma.user.findFirst({
    where: { tenantId: tenant.id },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const templateVersionForTenant = templateVersion?.tenantId === tenant.id
    ? templateVersion
    : await prisma.consentTemplateVersion.findFirst({
        where: { tenantId: tenant.id },
        include: {
          template: {
            select: {
              id: true,
              templateCode: true,
            },
          },
        },
        orderBy: [{ approvedAt: "desc" }, { createdAt: "asc" }],
      });

  if (!templateVersionForTenant?.template?.id) {
    throw new Error("No consent template version found for Phase 6B validation");
  }

  return {
    prisma,
    tenantId: tenant.id,
    actorUserId: actor?.id,
    templateId: templateVersionForTenant.template.id,
    templateCode: templateVersionForTenant.template.templateCode,
    templateVersionId: templateVersionForTenant.id,
  };
}

async function ensurePackage(context: Awaited<ReturnType<typeof resolveTenantContext>>, spec: PackageSpec): Promise<ValidationResult> {
  let educationPackage = await context.prisma.educationPackage.findFirst({
    where: {
      tenantId: context.tenantId,
      packageKey: spec.packageKey,
    },
    include: {
      currentVersion: true,
      versions: { orderBy: { versionNumber: "asc" } },
    },
  });

  if (!educationPackage) {
    const created = await createEducationPackage({
      tenantId: context.tenantId,
      actorUserId: context.actorUserId,
      packageKey: spec.packageKey,
      titleAr: spec.titleAr,
      titleEn: spec.titleEn,
      summaryAr: spec.baselineSummary.ar,
      summaryEn: spec.baselineSummary.en,
      clinicalDomain: spec.clinicalDomain,
      procedureCode: spec.procedureCode,
      versionLabel: "v1.0-clinical-baseline",
      manifestJson: buildManifest(spec, "baseline"),
      metadata: {
        phase: "phase6b-core-clinical-educational-library",
        contentState: "baseline",
      },
      placeholderAssets: buildAssets(spec, "baseline"),
    });

    await approveEducationPackage({
      tenantId: context.tenantId,
      packageId: created.id,
      actorUserId: context.actorUserId,
      versionId: created.currentVersionId || undefined,
    });

    educationPackage = await context.prisma.educationPackage.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        currentVersion: true,
        versions: { orderBy: { versionNumber: "asc" } },
      },
    });
  }

  await context.prisma.educationPackage.update({
    where: { id: educationPackage.id },
    data: {
      titleAr: spec.titleAr,
      titleEn: spec.titleEn,
      summaryAr: spec.productionSummary.ar,
      summaryEn: spec.productionSummary.en,
      clinicalDomain: spec.clinicalDomain,
      procedureCode: spec.procedureCode,
      metadata: {
        phase: "phase6b-core-clinical-educational-library",
        packageState: "production-content",
      },
    },
  });

  const refreshed = await context.prisma.educationPackage.findUniqueOrThrow({
    where: { id: educationPackage.id },
    include: {
      versions: { orderBy: { versionNumber: "asc" } },
      currentVersion: true,
    },
  });

  const productionVersion = refreshed.versions.find((item) => item.metadata && typeof item.metadata === "object" && (item.metadata as { releaseStage?: string }).releaseStage === "production-approved");
  const lastVersion = refreshed.versions[refreshed.versions.length - 1];

  const ensuredProductionVersion = productionVersion || await createEducationPackageVersion({
    tenantId: context.tenantId,
    packageId: refreshed.id,
    actorUserId: context.actorUserId,
    versionLabel: `v${(lastVersion?.versionNumber || 1) + 1}.0-production`,
    manifestJson: buildManifest(spec, "production"),
    metadata: {
      releaseStage: "production-approved",
      contentCompleteness: "full",
      phase: "phase6b-core-clinical-educational-library",
    },
    placeholderAssets: buildAssets(spec, "production"),
  });

  const approvedProductionVersion = await approveEducationPackage({
    tenantId: context.tenantId,
    packageId: refreshed.id,
    actorUserId: context.actorUserId,
    versionId: ensuredProductionVersion.id,
  });

  const linked = await linkEducationPackageToConsentTemplate({
    tenantId: context.tenantId,
    packageId: refreshed.id,
    actorUserId: context.actorUserId,
    versionId: approvedProductionVersion.currentVersionId || ensuredProductionVersion.id,
    consentTemplateId: context.templateId,
    consentTemplateVersionId: context.templateVersionId,
  });

  const evidencePackage = await generateEducationEvidencePackage({
    tenantId: context.tenantId,
    packageId: refreshed.id,
    actorUserId: context.actorUserId,
    versionId: linked.versionId,
    consentTemplateId: context.templateId,
    consentTemplateVersionId: context.templateVersionId,
    metadata: {
      generatedBy: "phase6b-core-clinical-educational-library-script",
      packageKey: spec.packageKey,
    },
  });

  const snapshot = await context.prisma.educationPackage.findUniqueOrThrow({
    where: { id: refreshed.id },
    include: {
      currentVersion: true,
      versions: { orderBy: { versionNumber: "asc" } },
      assets: { orderBy: [{ versionId: "asc" }, { sortOrder: "asc" }] },
      auditEvents: { orderBy: { createdAt: "asc" } },
      evidencePackages: { orderBy: { createdAt: "asc" } },
    },
  });

  const currentVersion = snapshot.versions.find((item) => item.id === snapshot.currentVersionId) || snapshot.currentVersion;
  const linkedTemplateVersionIds = Array.isArray(currentVersion?.linkedTemplateVersionIds) ? currentVersion.linkedTemplateVersionIds : [];

  return {
    packageKey: spec.packageKey,
    packageId: snapshot.id,
    versionId: currentVersion?.id || linked.versionId,
    evidencePackageId: evidencePackage.id,
    contentHash: currentVersion?.contentHash || "",
    auditEventCount: snapshot.auditEvents.length,
    validation: {
      packageCreated: Boolean(snapshot.id),
      packageApproved: snapshot.status === "APPROVED" && currentVersion?.status === "APPROVED",
      versionGenerated: snapshot.versions.length >= 2,
      contentHashGenerated: Boolean(currentVersion?.contentHash),
      evidencePackageGenerated: snapshot.evidencePackages.some((item) => item.id === evidencePackage.id),
      auditTrailGenerated: snapshot.auditEvents.length > 0,
      consentTemplateLinked: linkedTemplateVersionIds.includes(context.templateVersionId),
    },
  };
}

async function main() {
  const context = await resolveTenantContext();
  const results: ValidationResult[] = [];

  for (const spec of PACKAGE_SPECS) {
    results.push(await ensurePackage(context, spec));
  }

  const status = results.every((result) => Object.values(result.validation).every(Boolean)) ? "PASS" : "FAIL";

  console.log(JSON.stringify({
    status,
    linkedTemplate: {
      templateId: context.templateId,
      templateCode: context.templateCode,
      templateVersionId: context.templateVersionId,
    },
    packages: results,
  }, null, 2));

  if (status !== "PASS") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});