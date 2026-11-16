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
  { id: "routing", href: "/cases/FIT-26771", target: "record-routing", align: "content" },
  { id: "facility", href: "/facilities", target: "facility-table", align: "content" },
  { id: "worklist", href: "/facilities", target: "facility-worklist", align: "content" },
  { id: "simulator", href: "/simulator", target: "sim-controls", align: "content" },
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
      title: "Six places, one case file",
      body: "Overview, the case board, Fatima’s record, facility waits, the policy simulator, and the governance notes all read the same synthetic cases.",
    },
    hero: {
      title: "Follow up, hand over, close the loop",
      body: "The opening story is the pathway. Scroll moves from follow-up, to who owns the handover, to keeping the case open until the outcome is recorded.",
    },
    flows: {
      title: "Where follow-up stalls",
      body: "These ribbons are a teaching picture, and the thickness follows that example. The programme counts further down come from the case file. Attendance and documented closure are counted separately.",
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
      title: "Closure is separate from attendance",
      body: "FIT-26771 runs from the FIT result to the report. A colonoscopy can be attended while closure is still pending. Closure needs the report and a disposition.",
    },
    routing: {
      title: "Destinations come from the case file",
      body: "Options are ranked from this file, including a facility that already returned the case. Recording a handover does not send a referral.",
    },
    facility: {
      title: "Waits, with a denominator",
      body: "Each cell shows the median age of open cases, then the median of completed transitions. Orange means the open median is over 7 days. That is not, by itself, a confirmed capacity blocker.",
    },
    worklist: {
      title: "The cases behind a cell",
      body: "This list is the open cases for the facility and stage you select, longest current wait first. Review opens that case record.",
    },
    simulator: {
      title: "A model, not a verification",
      body: "Calls, outreach order, slots, and teach-back change the Kaplan–Meier figures for this seeded cohort. The result is model output, not a Department of Health figure.",
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
      title: "ستة مواضع وملف حالات واحد",
      body: "النظرة العامة ولوحة الحالات وسجل فاطمة وانتظار المنشآت ومحاكي السياسة وملاحظات الحوكمة تقرأ الحالات المصطنعة نفسها.",
    },
    hero: {
      title: "تابع، سلّم، وأغلق المسار",
      body: "القصة الافتتاحية هي المسار. التمرير ينتقل من المتابعة، إلى من يملك التسليم، إلى إبقاء الحالة مفتوحة حتى يُسجَّل ما حدث.",
    },
    flows: {
      title: "أين تتعثر المتابعة",
      body: "هذه الأشرطة صورة تعليمية، وسمكها يتبع ذلك المثال. أعداد البرنامج أسفل الصفحة مأخوذة من ملف الحالات. حضور الإجراء وإغلاق الملف يُحسبان بشكل منفصل.",
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
      title: "الإغلاق منفصل عن الحضور",
      body: "يعرض FIT-26771 الطريق من نتيجة FIT إلى التقرير. يمكن حضور التنظير مع بقاء الإغلاق معلّقًا. الإغلاق يحتاج التقرير والقرار.",
    },
    routing: {
      title: "الوجهات من ملف الحالات",
      body: "تُرتَّب الخيارات من هذا الملف، بما فيها منشأة أعادت الحالة من قبل. تسجيل التسليم لا يرسل إحالة.",
    },
    facility: {
      title: "الانتظار مع المقام",
      body: "كل خلية تعرض وسيط عمر الحالات المفتوحة، ثم وسيط الانتقالات المكتملة. البرتقالي يعني أن وسيط الحالات المفتوحة يتجاوز 7 أيام. هذا ليس بذاته عائق سعة مؤكدًا.",
    },
    worklist: {
      title: "الحالات خلف الخلية",
      body: "هذه القائمة هي الحالات المفتوحة للمنشأة والمرحلة المختارتين، الأطول انتظارًا أولًا. مراجعة تفتح سجل الحالة.",
    },
    simulator: {
      title: "نموذج وليس تحققًا",
      body: "المكالمات وترتيب التواصل والمواعيد والتعليم الراجع تغيّر أرقام كابلان–ماير لهذه المجموعة المبذورة. الناتج مخرجات نموذج، وليس رقمًا لدائرة الصحة.",
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
    offerBody: "A short tour of the case board, a case record, facility waits, and the simulator. Each step highlights what to look at.",
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
    offerBody: "جولة قصيرة في لوحة الحالات وسجل حالة وانتظار المنشآت والمحاكي. كل خطوة تُبرز ما يُنظر إليه.",
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

export function tourSteps(locale: "en" | "ar"): TourStep[] {
  return META.map((step) => ({
    id: step.id,
    href: step.href,
    target: step.target,
    align: step.align,
    title: COPY[locale][step.id].title,
    body: COPY[locale][step.id].body,
  }));
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
