export const SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE = {
  id: "surgery-medical-procedure-consent",
  version: "1.0.0",
  module: "informed-consents",
  category: "SURGERY_MEDICAL_PROCEDURE",
  title: {
    en: "Informed Consent for Surgery / Medical Procedure",
    ar: "إقرار الموافقة على إجراء جراحي أو طبي",
  },
  validityDays: 30,
  requires: {
    patientSignature: true,
    physicianDeclaration: true,
    substituteDecisionMaker: true,
    interpreterIfRequired: true,
    witnesses: 2,
  },
  sections: [
    {
      id: "intro",
      title: {
        en: "Before Signing",
        ar: "قبل التوقيع",
      },
      body: {
        en: "If you have any questions or concerns, please ask your doctor before signing.",
        ar: "إذا كان لديك أي تساؤل أو استفسار، يرجى سؤال الطبيب قبل التوقيع.",
      },
      fields: [
        {
          id: "signerType",
          type: "checkbox-group",
          label: { en: "I, the undersigned below, am the:", ar: "أقر أنا الموقع أدناه:" },
          options: [
            { value: "patient", label: { en: "Patient", ar: "المريض" } },
            { value: "guardian_or_representative", label: { en: "Guardian or representative", ar: "ولي الأمر أو من ينوب عنه" } },
          ],
        },
        {
          id: "relationship",
          type: "text",
          label: { en: "Relationship", ar: "صلة القرابة" },
          conditionalOn: { field: "signerType", value: "guardian_or_representative" },
        },
      ],
    },
    {
      id: "condition-treatment",
      title: {
        en: "Condition and Treatment",
        ar: "الحالة المرضية والعلاج",
      },
      fields: [
        {
          id: "diagnosis",
          type: "textarea",
          required: true,
          label: {
            en: "My doctor has explained that I have the following diagnosis:",
            ar: "أوضح طبيبي أن لدي التشخيص التالي:",
          },
        },
        {
          id: "requiredProcedures",
          type: "textarea",
          required: true,
          label: {
            en: "This diagnosis requires the following procedure/s:",
            ar: "يتطلب هذا التشخيص الإجراء / الإجراءات التالي/ة:",
          },
        },
        {
          id: "procedureDescription",
          type: "textarea",
          required: true,
          label: {
            en: "The following will be performed:",
            ar: "سيتم القيام بالتالي:",
          },
        },
        {
          id: "highRiskProcedure",
          type: "checkbox",
          label: {
            en: "High-risk procedure",
            ar: "إجراء عالي الخطورة",
          },
        },
        {
          id: "highRiskReason",
          type: "textarea",
          label: {
            en: "Reason for high-risk classification",
            ar: "سبب تصنيف الإجراء عالي الخطورة",
          },
          conditionalOn: { field: "highRiskProcedure", value: true },
        },
      ],
    },
    {
      id: "benefits",
      title: {
        en: "Benefits and Expected Results",
        ar: "فوائد الإجراء والنتائج المتوقعة",
      },
      fields: [
        {
          id: "expectedBenefits",
          type: "textarea",
          required: true,
          label: {
            en: "Benefits of the procedure/s and expected results:",
            ar: "فوائد الإجراء / الإجراءات والنتائج المتوقعة:",
          },
        },
      ],
    },
    {
      id: "risks",
      title: {
        en: "Risks Associated with the Procedure",
        ar: "المخاطر المرتبطة بالإجراء",
      },
      fields: [
        {
          id: "specificRisks",
          type: "textarea",
          required: true,
          label: {
            en: "Specific risks:",
            ar: "مخاطر محددة:",
          },
        },
      ],
      riskBlocks: [
        {
          id: "bleeding",
          severity: "high",
          en: "Bleeding could occur and may require a return to the operating room. Bleeding is more common if you have been taking blood thinning drugs such as Warfarin, Aspirin, Clopidogrel, or Dipyridamole.",
          ar: "قد يحدث نزيف مما قد يتطلب العودة مرة أخرى لغرفة العمليات لإيقافه، ويكون النزيف أكثر شيوعًا لدى من يتناولون أدوية سيولة الدم مثل الوارفرين أو الأسبرين أو كلوبيدوجريل أو دايبايردامول.",
        },
        {
          id: "lung-collapse",
          severity: "moderate",
          en: "Small areas of the lung can collapse, increasing the risk of chest infection. This may require antibiotics and physiotherapy.",
          ar: "قد يحدث انغلاق لمناطق صغيرة في الرئة، مما يزيد من مخاطر الإصابة بالتهاب في الصدر، وقد يتطلب علاج ذلك استخدام المضادات الحيوية والعلاج الطبيعي.",
        },
        {
          id: "obesity-risk",
          severity: "moderate",
          en: "In obese patients, the risk of wound infection, chest infection, heart and lung complications, and thrombosis may increase.",
          ar: "عند أصحاب الأوزان الزائدة، تزداد مخاطر الإصابة بعدوى الجرح والصدر ومضاعفات القلب والرئة وجلطات الأوعية الدموية.",
        },
        {
          id: "cardiac-stroke-risk",
          severity: "high",
          en: "Heart attack or stroke could occur due to strain on the heart.",
          ar: "قد ينتج عن إجهاد القلب حدوث أزمة قلبية أو سكتة دماغية.",
        },
        {
          id: "dvt",
          severity: "high",
          en: "A blood clot in the leg may cause pain and swelling. In rare cases, part of the clot may break off and travel to the lungs.",
          ar: "قد تحدث جلطة في أحد أوردة الساق مما يسبب ألمًا وتورمًا، وفي حالات نادرة قد ينفصل جزء من الجلطة ليصل إلى الرئة.",
        },
        {
          id: "death",
          severity: "critical",
          en: "Death as a result of this procedure is possible.",
          ar: "الوفاة محتملة كنتيجة لهذا الإجراء.",
        },
      ],
    },
    {
      id: "alternatives",
      title: {
        en: "Alternatives and Consequences of Not Treating",
        ar: "البدائل والمخاطر في حال عدم الخضوع للإجراء",
      },
      fields: [
        {
          id: "alternatives",
          type: "textarea",
          required: true,
          label: {
            en: "Alternatives and possible risks/complications of these alternatives:",
            ar: "البدائل والمخاطر / المضاعفات المحتملة لهذه البدائل:",
          },
        },
        {
          id: "consequenceOfNotTreating",
          type: "textarea",
          required: true,
          label: {
            en: "Consequences of not treating:",
            ar: "المخاطر في حال عدم الخضوع للإجراء:",
          },
        },
      ],
    },
    {
      id: "patient-consent",
      title: {
        en: "Patient Consent",
        ar: "موافقة المريض",
      },
      fields: [
        {
          id: "interpreterNeedsMet",
          type: "radio",
          label: {
            en: "Interpreter needs met?",
            ar: "تلبية الاحتياج للمترجم؟",
          },
          options: [
            { value: "yes", label: { en: "Yes", ar: "نعم" } },
            { value: "no", label: { en: "No", ar: "لا" } },
          ],
        },
      ],
      declarations: [
        {
          id: "patient-acknowledgment",
          en: "I acknowledge that the information given for the named procedure was explained to my satisfaction, and I had the opportunity to ask questions concerning my condition, the procedure, benefits, alternatives, risks, and to take a copy of this declaration if requested.",
          ar: "أقر بأن المعلومات المقدمة بخصوص الإجراء المسمى قد تم شرحها بشكل يرضيني، وكان لدي الفرصة لطرح أسئلة حول حالتي والإجراء والفوائد والبدائل والمخاطر وأخذ نسخة من هذا الإقرار في حال طلبه.",
        },
        {
          id: "professional-care-no-guarantee",
          en: "I am aware that the procedure will be performed with professional due care and attention; however, no assurance can be made for the outcomes and benefits.",
          ar: "أنا على علم بأنه سيتم تنفيذ الإجراء مع العناية المهنية الواجبة والاهتمام، ولكن لا يوجد ضمان للنتائج والفوائد.",
        },
        {
          id: "anesthesia-method",
          en: "I agree to the assigned method of anesthesia as decided by the anesthesiologist.",
          ar: "أوافق على طريقة التخدير المعينة من قبل أخصائي التخدير.",
        },
        {
          id: "additional-procedure",
          en: "I agree to a different or additional procedure if unforeseen conditions make it medically advisable.",
          ar: "أوافق على إجراء مختلف أو إضافي إذا استدعت الظروف غير المتوقعة ذلك طبيًا.",
        },
        {
          id: "training-delegate",
          en: "A fully supervised delegate undergoing further training may participate in my procedure.",
          ar: "يجوز لمتدرب أو من ينوب تحت الإشراف الكامل المشاركة في الإجراء.",
        },
        {
          id: "blood-transfusion",
          en: "I agree to have a transfusion of blood or blood products as may be required.",
          ar: "أوافق على نقل الدم أو منتجات الدم حسب الحاجة.",
        },
        {
          id: "right-to-refuse",
          en: "I have the right to refuse or change my mind at any time.",
          ar: "لدي الحق في الرفض أو تغيير رأيي في أي وقت.",
        },
        {
          id: "tissue-disposal",
          en: "Removed tissue, organs, or body parts will be disposed of in line with infection control measures and Islamic law.",
          ar: "سيتم التخلص من الأنسجة أو الأعضاء أو أجزاء الجسم المستأصلة وفقًا لتدابير مكافحة العدوى وطبقًا للإجراءات الإسلامية المتبعة.",
        },
        {
          id: "reference-labs",
          en: "My tissue or blood samples may be sent to reference laboratories for testing or analysis, considering potential loss of sample in the case of international laboratories.",
          ar: "يمكن إرسال عينات أنسجتي أو دمي إلى المختبرات المرجعية للفحص أو التحليل، مع مراعاة احتمال فقد العينة في حالة المختبرات الدولية.",
        },
        {
          id: "deidentified-information",
          en: "Relevant de-identified information may be released for education and training of health professionals.",
          ar: "قد يتم الإفصاح عن المعلومات غير المعرفة لتعليم وتدريب العاملين في مجال الصحة.",
        },
        {
          id: "proceed-request",
          en: "Based on the above statements, I request you to proceed with the named procedure.",
          ar: "بناءً على البيانات المذكورة أعلاه، أطلب المضي قدمًا في الإجراء المحدد.",
        },
      ],
    },
    {
      id: "patient-signature",
      title: {
        en: "Patient / Representative Signature",
        ar: "توقيع المريض / الممثل",
      },
      fields: [
        { id: "patientFullName", type: "text", required: true, label: { en: "Patient Full Name", ar: "الاسم الكامل للمريض" } },
        { id: "patientIdNumber", type: "text", required: true, label: { en: "ID Number", ar: "رقم الهوية" } },
        { id: "patientSignature", type: "signature", required: true, label: { en: "Signature", ar: "التوقيع" } },
        { id: "patientSignedAt", type: "datetime", required: true, label: { en: "Date / Time", ar: "التاريخ / الوقت" } },
      ],
    },
    {
      id: "substitute-decision-maker",
      title: {
        en: "Substitute Decision Maker",
        ar: "صانع القرار البديل",
      },
      appliesWhen: "patient_lacks_capacity_or_cannot_legally_sign",
      fields: [
        { id: "substituteName", type: "text", label: { en: "Name of substitute decision maker", ar: "اسم صانع القرار البديل" } },
        { id: "substituteSignature", type: "signature", label: { en: "Signature", ar: "التوقيع" } },
        { id: "substituteRelationship", type: "text", label: { en: "Relationship to patient", ar: "العلاقة بالمريض" } },
        { id: "substituteIdNumber", type: "text", label: { en: "ID Number", ar: "رقم الهوية" } },
        { id: "substituteSignedAt", type: "datetime", label: { en: "Date / Time", ar: "التاريخ / الوقت" } },
      ],
    },
    {
      id: "physician-declaration",
      title: {
        en: "Physician / Physician Delegate Declaration",
        ar: "إقرار الطبيب أو من ينوب عنه",
      },
      declaration: {
        en: "I have fully explained to the patient/substitute decision maker all the points above, and in my opinion the patient/substitute decision maker clearly understood the information related to the procedure/surgery, risks, benefits, alternatives, possible complications, consequences of refusal, and chance of success.",
        ar: "أقر بأنني قد شرحت بالتفصيل للمريض / صانع القرار البديل جميع النقاط أعلاه، وبرأيي أنه قد فهم بوضوح المعلومات المتعلقة بالإجراء / الجراحة، والمخاطر، والفوائد، والبدائل، والمضاعفات المحتملة، ومخاطر عدم تنفيذ الإجراء، وفرصة النجاح.",
      },
      fields: [
        { id: "physicianFullName", type: "text", required: true, label: { en: "Physician Full Name", ar: "اسم الطبيب كاملًا" } },
        { id: "physicianIdNumber", type: "text", required: true, label: { en: "ID Number", ar: "الرقم الوظيفي" } },
        { id: "physicianSignature", type: "signature", required: true, label: { en: "Signature", ar: "التوقيع" } },
        { id: "physicianSignedAt", type: "datetime", required: true, label: { en: "Date / Time", ar: "التاريخ / الوقت" } },
      ],
    },
    {
      id: "translator",
      title: {
        en: "Translator",
        ar: "المترجم",
      },
      appliesWhen: "translation_required",
      fields: [
        { id: "translatorFullName", type: "text", label: { en: "Translator Full Name", ar: "اسم المترجم كاملًا" } },
        { id: "translatorId", type: "text", label: { en: "ID", ar: "الرقم الوظيفي / الهوية" } },
        { id: "translatorSignature", type: "signature", label: { en: "Signature", ar: "التوقيع" } },
        { id: "translatorSignedAt", type: "datetime", label: { en: "Date / Time", ar: "التاريخ / الوقت" } },
      ],
    },
    {
      id: "witnesses",
      title: {
        en: "Witnesses",
        ar: "الشهود",
      },
      fields: [
        { id: "witness1Name", type: "text", label: { en: "Witness 1 Name", ar: "اسم الشاهد الأول" } },
        { id: "witness1Id", type: "text", label: { en: "Witness 1 ID", ar: "رقم هوية / وظيفي الشاهد الأول" } },
        { id: "witness1Signature", type: "signature", label: { en: "Witness 1 Signature", ar: "توقيع الشاهد الأول" } },
        { id: "witness2Name", type: "text", label: { en: "Witness 2 Name", ar: "اسم الشاهد الثاني" } },
        { id: "witness2Id", type: "text", label: { en: "Witness 2 ID", ar: "رقم هوية / وظيفي الشاهد الثاني" } },
        { id: "witness2Signature", type: "signature", label: { en: "Witness 2 Signature", ar: "توقيع الشاهد الثاني" } },
      ],
    },
  ],
  legalFooter: {
    en: "The validity period of this form must not exceed 30 days from the date of signature or as required by the treatment plan.",
    ar: "يجب ألا تتجاوز مدة صلاحية هذا النموذج 30 يومًا من تاريخ التوقيع أو وفق ما تتطلبه الخطة العلاجية.",
  },
} as const;