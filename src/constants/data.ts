export interface JourneyStep {
  id: number;
  titleEn: string;
  titleAr: string;
  date: string;
  status: 'done' | 'active' | 'pending';
  details?: string;
  detailsAr?: string;
  phase: 'before' | 'during' | 'after';
  actionLabel?: string;
}

export const journeySteps: JourneyStep[] = [
  { id: 1, titleEn: "Medical Records Uploaded", titleAr: "رُفعت الملفات الطبية", date: "Apr 1", status: "done", phase: "before", details: "✓ Completed successfully. All documents saved to your secure vault.", detailsAr: "اكتمل بنجاح. جميع المستندات محفوظة في خزنتك الآمنة." },
  { id: 2, titleEn: "Travel Checklist Complete", titleAr: "اكتملت قائمة السفر", date: "Apr 3", status: "done", phase: "before", details: "✓ Completed successfully. All documents saved to your secure vault.", detailsAr: "اكتمل بنجاح. جميع المستندات محفوظة في خزنتك الآمنة." },
  { id: 3, titleEn: "Appointment Confirmed — Berlin", titleAr: "تأكيد الموعد — برلين", date: "Apr 5", status: "done", phase: "before", details: "✓ Completed successfully. All documents saved to your secure vault.", detailsAr: "اكتمل بنجاح. جميع المستندات محفوظة في خزنتك الآمنة." },
  { id: 4, titleEn: "Arrived & Registered", titleAr: "الوصول والتسجيل", date: "Apr 8", status: "done", phase: "during", details: "✓ Completed successfully. All documents saved to your secure vault.", detailsAr: "اكتمل بنجاح. جميع المستندات محفوظة في خزنتك الآمنة." },
  { id: 5, titleEn: "Pre-Op Consultation", titleAr: "استشارة ما قبل العملية", date: "Apr 9", status: "done", phase: "during", details: "✓ Completed successfully. All documents saved to your secure vault.", detailsAr: "اكتمل بنجاح. جميع المستندات محفوظة في خزنتك الآمنة." },
  { id: 6, titleEn: "Procedure Completed ✓", titleAr: "اكتملت العملية بنجاح", date: "Apr 10", status: "done", phase: "during", details: "✓ Completed successfully. All documents saved to your secure vault.", detailsAr: "اكتمل بنجاح. جميع المستندات محفوظة في خزنتك الآمنة." },
  { id: 7, titleEn: "Discharge Pack Ready", titleAr: "حزمة الخروج جاهزة", date: "Today", status: "active", phase: "during", details: "Your bilingual discharge pack is ready. Tap Records to view and share with your Saudi care team.", detailsAr: "حزمة خروجك ثنائية اللغة جاهزة. اضغط ملفاتي لعرضها ومشاركتها مع طبيبك في السعودية.", actionLabel: "🔔 Action Required" },
  { id: 8, titleEn: "Return to Saudi Arabia", titleAr: "العودة إلى المملكة", date: "Apr 15", status: "pending", phase: "after", details: "Expected return flight Berlin → Riyadh.", detailsAr: "رحلة العودة المتوقعة برلين ← الرياض." },
  { id: 9, titleEn: "7-Day Follow-up", titleAr: "متابعة ٧ أيام", date: "Apr 22", status: "pending", phase: "after", details: "Post-surgery check-up scheduled.", detailsAr: "فحص ما بعد الجراحة مقرر." },
  { id: 10, titleEn: "30-Day Follow-up (KSA)", titleAr: "متابعة ٣٠ يوم (السعودية)", date: "May 15", status: "pending", phase: "after", details: "Follow-up with Saudi care team.", detailsAr: "متابعة مع فريق الرعاية السعودي." },
];

export interface Medication {
  name: string;
  nameAr: string;
  dosage: string;
  time: string;
  frequency: string;
  status: 'taken' | 'upcoming' | 'missed' | 'due';
  period: 'morning' | 'afternoon' | 'evening';
  instructions?: string;
  instructionsAr?: string;
  redFlags?: string;
  redFlagsAr?: string;
}

export const medications: Medication[] = [
  { name: "Enoxaparin 40mg", nameAr: "إينوكساپارين ٤٠ ملغ", dosage: "1 injection", time: "8:00 AM", frequency: "Once daily", status: "taken", period: "morning", instructions: "Inject subcutaneously in the abdomen", instructionsAr: "حقن تحت الجلد في البطن", redFlags: "Unusual bleeding or bruising", redFlagsAr: "نزيف أو كدمات غير عادية" },
  { name: "Amoxicillin 500mg", nameAr: "أموكسيسيلين ٥٠٠ ملغ", dosage: "1 capsule", time: "8:00 AM", frequency: "Every 12h", status: "taken", period: "morning", instructions: "Take with food", instructionsAr: "تناول مع الطعام", redFlags: "Rash, difficulty breathing", redFlagsAr: "طفح جلدي أو صعوبة في التنفس" },
  { name: "Ibuprofen 400mg", nameAr: "إيبوبروفين ٤٠٠ ملغ", dosage: "1 tablet", time: "12:00 PM", frequency: "Every 8h", status: "taken", period: "afternoon", instructions: "Take with food to avoid stomach upset", instructionsAr: "تناول مع الطعام لتجنب اضطراب المعدة", redFlags: "Stop if stomach pain or black stools", redFlagsAr: "توقف عند ألم المعدة أو البراز الأسود" },
  { name: "Ibuprofen 400mg", nameAr: "إيبوبروفين ٤٠٠ ملغ", dosage: "1 tablet", time: "8:00 PM", frequency: "Every 8h", status: "due", period: "evening", instructions: "Take with food to avoid stomach upset", instructionsAr: "تناول مع الطعام لتجنب اضطراب المعدة" },
  { name: "Amoxicillin 500mg", nameAr: "أموكسيسيلين ٥٠٠ ملغ", dosage: "1 capsule", time: "8:00 PM", frequency: "Every 12h", status: "due", period: "evening", instructions: "Take with food", instructionsAr: "تناول مع الطعام" },
];

export interface DocRecord {
  emoji: string;
  titleEn: string;
  titleAr: string;
  isNew?: boolean;
  date: string;
  meta: string;
  bgColor: string;
  accentColor: string;
  category: string;
}

export const records: DocRecord[] = [
  { emoji: "📋", titleEn: "Discharge Pack", titleAr: "حزمة الخروج", isNew: true, date: "Today", meta: "Bilingual AR/EN · 5 pages · Updated today", bgColor: "var(--gold-pale)", accentColor: "var(--gold)", category: "Discharge" },
  { emoji: "💊", titleEn: "Medication Schedule", titleAr: "جدول الأدوية", date: "Apr 11", meta: "5 medications · Starts Apr 11 · 2 pages", bgColor: "var(--teal-light)", accentColor: "var(--teal-deep)", category: "Prescriptions" },
  { emoji: "🩻", titleEn: "MRI – Right Knee", titleAr: "رنين مغناطيسي – الركبة اليمنى", date: "Apr 2", meta: "DICOM format · 2.3 GB · Charité Hospital", bgColor: "#F0F2F5", accentColor: "var(--gray)", category: "Imaging" },
  { emoji: "🔬", titleEn: "Pre-Op Lab Results", titleAr: "نتائج التحاليل قبل العملية", date: "Apr 9", meta: "All values normal · 3 pages · PDF", bgColor: "#E8F5EE", accentColor: "var(--success)", category: "Lab Results" },
  { emoji: "📄", titleEn: "Surgical Report", titleAr: "التقرير الجراحي", date: "Apr 10", meta: "Dr. Mueller · 4 pages · German/English", bgColor: "var(--teal-light)", accentColor: "var(--teal-mid)", category: "Consultations" },
];

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'ai' | 'user';
  time: string;
}

export const initialMessages: ChatMessage[] = [
  { id: 1, text: "مرحباً محمد 👋 حزمة خروجك جاهزة اليوم. هل تريد أن أشرح لك تعليمات ما بعد العملية؟", sender: "ai", time: "2:14 PM" },
  { id: 2, text: "نعم من فضلك", sender: "user", time: "2:15 PM" },
  { id: 3, text: "بعد عملية الركبة ستحتاج إلى:\n\n• راحة تامة لمدة ٦ أسابيع\n• رفع الرجل ٣ مرات يومياً\n• مسكنات الألم كل ٨ ساعات\n• علاج طبيعي خلال ٤٨ ساعة من العودة\n• تجنب حمل الأثقال أكثر من ٢ كغ\n\nهل تريد مني حجز موعد العلاج الطبيعي في السعودية؟", sender: "ai", time: "2:15 PM" },
  { id: 4, text: "نعم، احجز لي الموعد", sender: "user", time: "2:16 PM" },
  { id: 5, text: "✅ تم إرسال طلب الحجز لمركز الرعاية في الرياض.\n\nسيتواصل معك الفريق خلال ٢-٤ ساعات لتأكيد الموعد.\n\n📋 هل تريد مني إرسال تقرير خروجك كاملاً للطبيب السعودي الآن؟", sender: "ai", time: "2:16 PM" },
];

export const quickPrompts = [
  "اشرح أدويتي",
  "احجز متابعة",
  "أعراض الخطر",
  "ترجم حزمة الخروج",
  "متى أعود للسعودية؟",
  "ما هي قيود الحركة؟",
  "أحتاج مترجم",
  "اتصل بطبيبي",
];

export const filterCategories = ["All", "Discharge", "Lab Results", "Prescriptions", "Imaging", "Consultations"];

import type { TransportSegment } from "@/components/TransportCard";

export const defaultTransportSegments: TransportSegment[] = [
  {
    id: "t1", type: "flight", status: "completed",
    fromCode: "RUH", fromCity: "Riyadh", fromFull: "King Khalid Intl",
    toCode: "BER", toCity: "Berlin", toFull: "Brandenburg Intl",
    departureDateTime: "2026-04-05T08:30", arrivalDateTime: "2026-04-05T14:00",
    duration: "~5h 30m", airline: "Saudia", flightNumber: "SV 301",
    bookingRef: "AB1234", seatClass: "Business", seatNumber: "24A",
  },
  {
    id: "t2", type: "taxi", status: "completed",
    fromCity: "Berlin Brandenburg Airport", toCity: "Charité Hospital, Charitéplatz 1, Berlin",
    departureDateTime: "2026-04-05T14:45", arrivalDateTime: "2026-04-05T15:30",
    duration: "~45 min", taxiProvider: "Uber", bookingRef: "UBR-4821",
    distance: "32km", fare: "€38",
  },
  {
    id: "t3", type: "medical", status: "completed",
    fromCity: "Charité Hospital, Charitéplatz 1", toCity: "Mitte Recovery Apartment, Rosenthaler Str. 38",
    departureDateTime: "2026-04-10T16:00", arrivalDateTime: "2026-04-10T16:45",
    duration: "~45 min", hospital: "Charité Hospital", hospitalPhone: "+493045050",
    mobilityType: "Wheelchair Assisted", arrangedBy: "Charité Hospital", costInfo: "Covered",
    bookingRef: "CHB-TRANS-001",
  },
  {
    id: "t4", type: "flight", status: "upcoming",
    fromCode: "BER", fromCity: "Berlin", fromFull: "Brandenburg Intl",
    toCode: "RUH", toCity: "Riyadh", toFull: "King Khalid Intl",
    departureDateTime: "2026-04-15T15:00", arrivalDateTime: "2026-04-15T23:30",
    duration: "~6h 30m", airline: "Saudia", flightNumber: "SV 302",
    bookingRef: "AB1234", seatClass: "Business", seatNumber: "24A",
    medicalAssistance: "Wheelchair at gate requested",
  },
];
