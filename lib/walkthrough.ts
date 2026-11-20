export interface TourStep {
  id: string;
  href: string;
  target: string;
  title: string;
  body: string;
  /** Header targets stay put. The hero needs the page scrolled to the top so the first scene is the one on screen. */
  align: "header" | "top" | "content";
}

interface StepCopy {
  title: string;
  body: string;
}

const META = [
  { id: "banner", href: "/", target: "demo-banner", align: "header" },
  { id: "nav", href: "/", target: "main-nav", align: "header" },
  { id: "hero", href: "/", target: "hero-story", align: "top" },
  { id: "flows", href: "/", target: "home-flows", align: "content" },
  { id: "kpis", href: "/cases", target: "board-kpis", align: "content" },
  { id: "queue", href: "/cases", target: "board-queue", align: "content" },
  { id: "inspector", href: "/cases", target: "board-inspector", align: "content" },
  { id: "milestones", href: "/cases/FIT-26771", target: "record-milestones", align: "content" },
  { id: "readiness", href: "/cases/FIT-26771", target: "record-readiness", align: "content" },
  { id: "consult", href: "/cases/FIT-26771", target: "record-sbar", align: "content" },
  { id: "lock", href: "/cases/FIT-26771", target: "record-lock", align: "content" },
  { id: "routing", href: "/cases/FIT-26771", target: "record-routing", align: "content" },
  { id: "radar", href: "/facilities", target: "facility-radar", align: "content" },
  { id: "facility", href: "/facilities", target: "facility-table", align: "content" },
  { id: "worklist", href: "/facilities", target: "facility-worklist", align: "content" },
  { id: "rebalance", href: "/facilities", target: "facility-rebalance", align: "content" },
  { id: "simulator", href: "/simulator", target: "sim-controls", align: "content" },
  { id: "pareto", href: "/simulator", target: "sim-pareto", align: "content" },
  { id: "governance", href: "/governance", target: "governance-safety", align: "content" },
] as const;

export type TourStepId = (typeof META)[number]["id"];

const COPY: Record<"en" | "ar", Record<TourStepId, StepCopy>> = {
  en: {
    banner: {
      title: "This is a synthetic demo",
      body: "The amber bar applies to every page. Actions stay in this browser. Nothing is sent to a hospital, Malaffi, or the Department of Health.",
    },
    nav: {
      title: "Five places, one case file",
      body: "Overview, the case board, facility waits, capacity planning, and the governance notes read the same synthetic cases. A case record opens from the board.",
    },
    hero: {
      title: "Follow up, hand over, close the loop",
      body: "The opening window is the pathway. A positive result, outreach, and a returned referral stay on one case until the report and a disposition are recorded.",
    },
    flows: {
      title: "Four milestones",
      body: "Detection, outreach, colonoscopy, and closure. The last step stays locked until a biopsy file and a disposition are chosen. Attendance and documented closure are counted separately.",
    },
    kpis: {
      title: "The daily worklist",
      body: "Open positive FIT cases, overdue handovers past 14 days, returned referrals, and high stall risk are counted from this file. Mean days uses completed booking transitions only.",
    },
    queue: {
      title: "Pick a case from the queue",
      body: "The queue is sorted by stall score. Select a row to see the stage, the accountable team, and a link into the record. FIT-26771 is the worked example.",
    },
    inspector: {
      title: "Simulated actions stay local",
      body: "The inspector follows the selected case. Its handover and outreach buttons record a simulated action in this browser. Nothing is transmitted.",
    },
    milestones: {
      title: "Attending does not close the case",
      body: "FIT-26771 follows one person from the positive test to the written report.\n\nThey can attend the colonoscopy, and the case can still be open.\n\nIt closes only when two things are on file: the report, and what the care team decided.",
    },
    readiness: {
      title: "Clear the checklist first",
      body: "eGFR, the blood-thinner hold, and sedation risk have to be ticked before a simulated handover can be recorded.\n\nTwo are already ticked on this case. The handover buttons stay off until the third is ticked.\n\nThe checklist lives in this browser. It does not send a referral.",
    },
    consult: {
      title: "Ask the specialist here",
      body: "The thread is a local note between the primary doctor and a GI reply about cardiac risk.\n\nA saved reply stays on this page. It is not delivered, and the referral is not bounced.",
    },
    lock: {
      title: "Closure stays locked",
      body: "Choose a biopsy file and a disposition: Oncology MDT, or a 3-year recall.\n\nThe button stays off until both are set. On this case it also stays off because the colonoscopy has not been attended.\n\nA later save writes a local note. It does not close the shared file.",
    },
    routing: {
      title: "Effective wait, and a female team",
      body: "Fatima asked for a female specialist. Clinics with a female endoscopist are listed first.\n\nEffective wait uses the open booking age plus the queue depth divided by daily slots. The suggestion is calculated from this file, not a live queue.\n\nRecording a handover does not send a referral.",
    },
    radar: {
      title: "Where the wait sits",
      body: "Each facility has three open-case ages: referral intake, booking, and report review.\n\nThe longer bar is the slower stage in this file. A slow facility is not the same as a confirmed capacity blocker.",
    },
    facility: {
      title: "Waits, with a denominator",
      body: "Each cell shows the median age of open cases, then the median of completed transitions. Orange means the open median is over 7 days. That is not, by itself, a confirmed capacity blocker.",
    },
    worklist: {
      title: "The cases behind a cell",
      body: "This list is the open cases for the facility and stage you select, longest current wait first. Review opens that case record.",
    },
    rebalance: {
      title: "Try a quieter clinic",
      body: "The slider diverts a share of routine patients from the longest open booking queue toward a shorter one.\n\nThe two ages update as a projection. No patient is moved.",
    },
    simulator: {
      title: "A model, not a verification",
      body: "Calls, outreach order, slots, and teach-back change the Kaplan–Meier figures for this seeded cohort. The result is model output, not a Department of Health figure.",
    },
    pareto: {
      title: "Gap down, completions up",
      body: "Move interpreter priority along the teaching curve.\n\nThe language gap runs from 31.4% to 2.1%, and the illustrated completion count rises at the same time.\n\nThis curve is separate from the seeded model above. It is not a Department of Health result.",
    },
    governance: {
      title: "What the demo does not do",
      body: "No Malaffi sync, no insurance check, and no live submission. The FHIR-shaped bundle is an example from the local case. You can replay this walkthrough from the header.",
    },
  },
  ar: {
    banner: {
      title: "هذا عرض ببيانات مصطنعة",
      body: "الشريط الكهرماني يسري على كل الصفحات. الإجراءات تبقى في هذا المتصفح، ولا يُرسل شيء إلى مستشفى أو ملفّي أو دائرة الصحة.",
    },
    nav: {
      title: "خمسة مواضع وملف حالات واحد",
      body: "النظرة العامة ولوحة الحالات وانتظار المنشآت وتخطيط السعة وملاحظات الحوكمة تقرأ الحالات المصطنعة نفسها. سجل الحالة يُفتح من اللوحة.",
    },
    hero: {
      title: "تابع، سلّم، وأغلق المسار",
      body: "النافذة الافتتاحية هي المسار. نتيجة إيجابية وتواصل وإحالة معادة تبقى في حالة واحدة حتى يُسجَّل التقرير والقرار.",
    },
    flows: {
      title: "أربع محطات",
      body: "الاكتشاف والتواصل والتنظير والإغلاق. تبقى الخطوة الأخيرة مقفلة حتى يُختار ملف الخزعة والقرار. حضور الإجراء وإغلاق الملف يُحسبان بشكل منفصل.",
    },
    kpis: {
      title: "قائمة العمل اليومية",
      body: "حالات FIT الإيجابية المفتوحة، والتسليم المتأخر بعد 14 يومًا، والإحالات المعادة، وخطر التعثر تُحسب من هذا الملف. متوسط الأيام يستخدم انتقالات الحجز المكتملة فقط.",
    },
    queue: {
      title: "اختر حالة من قائمة الانتظار",
      body: "تُرتَّب القائمة حسب درجة التعثر. اختر صفًا لرؤية المرحلة والفريق المسؤول والرابط إلى السجل. FIT-26771 هي المثال المشروح.",
    },
    inspector: {
      title: "الإجراءات المحاكاة تبقى محلية",
      body: "يتبع المفتش الحالة المختارة. أزرار التسليم والتواصل تسجّل إجراءً محاكىً في هذا المتصفح. لا يُرسل شيء.",
    },
    milestones: {
      title: "الحضور لا يغلق الحالة",
      body: "يتبع FIT-26771 شخصًا واحدًا من الفحص الإيجابي إلى التقرير المكتوب.\n\nيمكنه حضور التنظير وتبقى الحالة مفتوحة.\n\nتُغلق فقط عندما يُحفظ شيئان: التقرير، وما قرره فريق الرعاية.",
    },
    readiness: {
      title: "أكمل القائمة أولًا",
      body: "يجب تعليم وظائف الكلى وخطة إيقاف مميع الدم وخطر التخدير قبل تسجيل تسليم محاكى.\n\nاثنان معلَّمان في هذه الحالة. تبقى أزرار التسليم متوقفة حتى يُعلَّم الثالث.\n\nالقائمة في هذا المتصفح، ولا ترسل إحالة.",
    },
    consult: {
      title: "اسأل الاختصاصي هنا",
      body: "هذا خيط محلي بين طبيب الأسرة ورد اختصاصي الجهاز الهضمي عن الخطر القلبي.\n\nالرد المحفوظ يبقى في الصفحة. لا يُسلَّم، ولا تُعاد الإحالة.",
    },
    lock: {
      title: "الإغلاق يبقى مقفلًا",
      body: "اختر ملف الخزعة وقرارًا: اجتماع الأورام، أو إعادة الفحص بعد 3 سنوات.\n\nيبقى الزر متوقفًا حتى يُختار الاثنان. وفي هذه الحالة يبقى متوقفًا أيضًا لأن التنظير لم يُحضر.\n\nالحفظ لاحقًا يكتب ملاحظة محلية، ولا يغلق الملف المشترك.",
    },
    routing: {
      title: "الانتظار الفعّال وفريق نسائي",
      body: "طلبت فاطمة اختصاصية. العيادات التي لديها منظار نسائي تُعرض أولًا.\n\nالانتظار الفعّال يجمع عمر الحجز المفتوح مع عمق الطابور مقسومًا على المواعيد اليومية. الاقتراح محسوب من هذا الملف، وليس طابورًا حيًا.\n\nتسجيل التسليم لا يرسل إحالة.",
    },
    radar: {
      title: "أين يجلس الانتظار",
      body: "لكل منشأة ثلاثة أعمار للحالات المفتوحة: استقبال الإحالة، والحجز، ومراجعة التقرير.\n\nالشريط الأطول هو المرحلة الأبطأ في هذا الملف. بطء المنشأة ليس بذاته عائق سعة مؤكدًا.",
    },
    facility: {
      title: "الانتظار مع المقام",
      body: "كل خلية تعرض وسيط عمر الحالات المفتوحة، ثم وسيط الانتقالات المكتملة. البرتقالي يعني أن وسيط الحالات المفتوحة يتجاوز 7 أيام. هذا ليس بذاته عائق سعة مؤكدًا.",
    },
    worklist: {
      title: "الحالات خلف الخلية",
      body: "هذه القائمة هي الحالات المفتوحة للمنشأة والمرحلة المختارتين، الأطول انتظارًا أولًا. مراجعة تفتح سجل الحالة.",
    },
    rebalance: {
      title: "جرّب عيادة أهدأ",
      body: "يحوّل المؤشر حصة من المرضى الروتينيين من أطول طابور حجز مفتوح إلى طابور أقصر.\n\nيتحدّث الرقمان كتوقع. لا يُنقل أي مريض.",
    },
    simulator: {
      title: "نموذج وليس تحققًا",
      body: "المكالمات وترتيب التواصل والمواعيد والتعليم الراجع تغيّر أرقام كابلان–ماير لهذه المجموعة المبذورة. الناتج مخرجات نموذج، وليس رقمًا لدائرة الصحة.",
    },
    pareto: {
      title: "الفجوة تنخفض والإكمال يرتفع",
      body: "حرّك أولوية المترجم على منحنى تعليمي.\n\nتنتقل فجوة اللغة من 31.4% إلى 2.1%، ويرتفع عدد الإكمال المرسوم في الوقت نفسه.\n\nهذا المنحنى منفصل عن النموذج المبذور أعلاه، وليس نتيجة لدائرة الصحة.",
    },
    governance: {
      title: "ما لا يفعله هذا العرض",
      body: "لا مزامنة مع ملفّي، ولا فحص تأمين، ولا إرسال حي. حزمة FHIR مثال من الحالة المحلية. يمكن إعادة هذه الجولة من الشريط العلوي.",
    },
  },
};

export const TOUR_UI = {
  en: {
    label: "Walkthrough",
    offerKicker: "New here",
    offerTitle: "Take the walkthrough",
    offerBody: "A short tour of the overview, the case board, and a case record.",
    offerBodyAdmin: "A short tour of the overview, facility waits, capacity planning, and governance.",
    start: "Start walkthrough",
    later: "Not now",
    skip: "Skip",
    back: "Back",
    next: "Next",
    finish: "Finish",
    step: (index: number, total: number) => `Step ${index} of ${total}`,
  },
  ar: {
    label: "جولة",
    offerKicker: "أول زيارة",
    offerTitle: "ابدأ الجولة",
    offerBody: "جولة قصيرة في النظرة العامة ولوحة الحالات وسجل الحالة.",
    offerBodyAdmin: "جولة قصيرة في النظرة العامة وانتظار المنشآت وتخطيط السعة والحوكمة.",
    start: "ابدأ الجولة",
    later: "ليس الآن",
    skip: "تخطي",
    back: "السابق",
    next: "التالي",
    finish: "إنهاء",
    step: (index: number, total: number) => `الخطوة ${index} من ${total}`,
  },
} as const;

export type TourUi = (typeof TOUR_UI)[keyof typeof TOUR_UI];

const USER_STEPS: TourStepId[] = ["banner", "nav", "hero", "flows", "kpis", "queue", "inspector", "milestones", "readiness", "consult", "lock", "routing"];
const ADMIN_STEPS: TourStepId[] = ["banner", "nav", "hero", "flows", "radar", "facility", "worklist", "rebalance", "simulator", "pareto", "governance"];

const NAV_COPY: Record<"en" | "ar", Record<"user" | "admin", StepCopy>> = {
  en: {
    user: {
      title: "Overview and the case board",
      body: "Overview and the case board read the same synthetic cases. A case record opens from the board.",
    },
    admin: {
      title: "Overview, waits, and policy",
      body: "Overview, facility waits, capacity planning, governance, and illness settings. Case records open from a User session.",
    },
  },
  ar: {
    user: {
      title: "النظرة العامة ولوحة الحالات",
      body: "هذان الموضعان يقرآن الحالات المصطنعة نفسها. سجل الحالة يُفتح من اللوحة.",
    },
    admin: {
      title: "النظرة العامة والانتظار والسياسة",
      body: "النظرة العامة وانتظار المنشآت وتخطيط السعة والحوكمة وإعدادات الأمراض. سجلات الحالات تُفتح من جلسة المستخدم.",
    },
  },
};

const WORKLIST_ADMIN: Record<"en" | "ar", StepCopy> = {
  en: {
    title: "The cases behind a cell",
    body: "This list is the open cases for the facility and stage you select, longest current wait first. Opening a record needs the User demo.",
  },
  ar: {
    title: "الحالات خلف الخلية",
    body: "هذه القائمة هي الحالات المفتوحة للمنشأة والمرحلة المختارتين، الأطول انتظارًا أولًا. فتح السجل يحتاج عرض المستخدم.",
  },
};

export function tourSteps(locale: "en" | "ar", role: "user" | "admin"): TourStep[] {
  const ids = role === "user" ? USER_STEPS : ADMIN_STEPS;
  return ids.map((id) => {
    const step = META.find((item) => item.id === id);
    if (!step) throw new Error(`Missing tour step ${id}`);
    const copy = id === "nav" ? NAV_COPY[locale][role] : id === "worklist" && role === "admin" ? WORKLIST_ADMIN[locale] : COPY[locale][id];
    return { id: step.id, href: step.href, target: step.target, align: step.align, title: copy.title, body: copy.body };
  });
}

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function spotlightBox(target: Box, viewport: { width: number; height: number }, reserveBottom: number): Box {
  const pad = 8;
  const top = Math.max(8, target.top - pad);
  const left = Math.max(8, target.left - pad);
  const right = Math.min(viewport.width - 8, target.left + target.width + pad);
  const bottom = Math.min(viewport.height - reserveBottom, target.top + target.height + pad);
  return {
    top,
    left,
    width: Math.max(24, right - left),
    height: Math.max(24, bottom - top),
  };
}

export function tooltipPosition(
  target: Box,
  tip: { width: number; height: number },
  viewport: { width: number; height: number },
): { top: number; left: number } {
  const margin = 12;
  const sheet = () => ({
    top: Math.max(margin, viewport.height - tip.height - margin),
    left: Math.max(margin, Math.min(target.left, viewport.width - tip.width - margin)),
  });
  if (viewport.width < 700 || target.height > viewport.height * 0.5) return sheet();
  const below = target.top + target.height + margin;
  const above = target.top - tip.height - margin;
  const top = below + tip.height <= viewport.height - margin ? below : Math.max(margin, above);
  const left = Math.min(Math.max(margin, target.left), Math.max(margin, viewport.width - tip.width - margin));
  return { top, left };
}
