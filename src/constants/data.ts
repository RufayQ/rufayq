export interface JourneyStep {
  id: number;
  titleEn: string;
  titleAr: string;
  date: string;
  status: 'done' | 'active' | 'pending';
  details?: string;
}

export const journeySteps: JourneyStep[] = [
  { id: 1, titleEn: "Medical Visa Approved", titleAr: "تمت الموافقة على التأشيرة الطبية", date: "Mar 1", status: "done" },
  { id: 2, titleEn: "Flight to Berlin", titleAr: "رحلة إلى برلين", date: "Mar 5", status: "done" },
  { id: 3, titleEn: "Hospital Registration", titleAr: "تسجيل في المستشفى", date: "Mar 6", status: "done" },
  { id: 4, titleEn: "Pre-Op Consultations", titleAr: "استشارات ما قبل العملية", date: "Mar 7", status: "done" },
  { id: 5, titleEn: "Lab Work & Imaging", titleAr: "تحاليل وأشعة", date: "Mar 8", status: "done" },
  { id: 6, titleEn: "Surgery Complete", titleAr: "اكتملت العملية الجراحية", date: "Mar 10", status: "done" },
  { id: 7, titleEn: "Discharge Pack Ready", titleAr: "حزمة الخروج جاهزة", date: "Mar 12", status: "active", details: "Your discharge pack includes medication schedule, follow-up appointments, and translated medical reports." },
  { id: 8, titleEn: "Post-Op Follow-up", titleAr: "متابعة ما بعد العملية", date: "Mar 14", status: "pending" },
  { id: 9, titleEn: "Return Flight", titleAr: "رحلة العودة", date: "Mar 17", status: "pending" },
  { id: 10, titleEn: "KSA Doctor Handover", titleAr: "تسليم للطبيب في السعودية", date: "Mar 20", status: "pending" },
];

export interface Medication {
  name: string;
  nameAr: string;
  dosage: string;
  time: string;
  status: 'taken' | 'upcoming' | 'missed';
}

export const medications: Medication[] = [
  { name: "Paracetamol 500mg", nameAr: "باراسيتامول ٥٠٠ ملغ", dosage: "2 tablets", time: "8:00 AM", status: "taken" },
  { name: "Omeprazole 20mg", nameAr: "أوميبرازول ٢٠ ملغ", dosage: "1 capsule", time: "1:00 PM", status: "taken" },
  { name: "Ibuprofen 400mg", nameAr: "ايبوبروفين ٤٠٠ ملغ", dosage: "1 tablet", time: "9:00 PM", status: "upcoming" },
];

export interface DocRecord {
  emoji: string;
  titleEn: string;
  titleAr: string;
  isNew?: boolean;
  date: string;
}

export const records: DocRecord[] = [
  { emoji: "📋", titleEn: "Discharge Pack", titleAr: "حزمة الخروج", isNew: true, date: "Today" },
  { emoji: "💊", titleEn: "Medication Schedule", titleAr: "جدول الأدوية", date: "Mar 12" },
  { emoji: "🩻", titleEn: "MRI Right Knee", titleAr: "رنين مغناطيسي", date: "Mar 8" },
  { emoji: "🔬", titleEn: "Lab Results", titleAr: "نتائج التحاليل", date: "Mar 8" },
  { emoji: "📄", titleEn: "Surgical Report", titleAr: "التقرير الجراحي", date: "Mar 10" },
];

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'ai' | 'user';
  time: string;
}

export const initialMessages: ChatMessage[] = [
  { id: 1, text: "مرحباً محمد، أنا رُفَيِّق مساعدك الطبي. كيف أقدر أساعدك اليوم؟", sender: "ai", time: "7:30 PM" },
  { id: 2, text: "ممكن تشرح لي أدويتي بعد العملية؟", sender: "user", time: "7:31 PM" },
  { id: 3, text: "بالتأكيد! عندك ثلاثة أدوية حالياً:\n\n١. باراسيتامول ٥٠٠ ملغ — مسكن للألم، حبتين كل ٨ ساعات\n٢. أوميبرازول ٢٠ ملغ — لحماية المعدة، كبسولة واحدة قبل الغداء\n٣. ايبوبروفين ٤٠٠ ملغ — مضاد للالتهاب، حبة واحدة مساءً", sender: "ai", time: "7:31 PM" },
  { id: 4, text: "هل في أعراض جانبية لازم أنتبه لها؟", sender: "user", time: "7:33 PM" },
  { id: 5, text: "نعم، انتبه للأعراض التالية:\n\n⚠️ غثيان أو ألم في المعدة\n⚠️ دوخة أو صداع شديد\n⚠️ تورم أو احمرار في مكان العملية\n\nإذا حسيت بأي من هذه الأعراض، تواصل مع الطبيب فوراً أو أرسل لي وأساعدك.", sender: "ai", time: "7:33 PM" },
];
