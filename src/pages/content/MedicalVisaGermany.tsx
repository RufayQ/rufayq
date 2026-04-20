import ContentPage from "@/components/ContentPage";
import { Seo } from "@/seo/Seo";
import { useLocation } from "react-router-dom";
import { articleSchema, breadcrumbSchema, faqSchema, howToSchema, AUTHORS } from "@/seo/schema";

const MedicalVisaGermany = () => {
  const isAr = useLocation().pathname.startsWith("/ar");
  const url = isAr ? "/ar/guides/medical-visa-germany-saudi-citizens" : "/guides/medical-visa-germany-saudi-citizens";

  const titleEn = "Germany Medical Visa for Saudi Citizens: Step-by-Step Guide (2026)";
  const titleAr = "تأشيرة العلاج الطبي إلى ألمانيا للمواطنين السعوديين: دليل خطوة بخطوة (٢٠٢٦)";
  const descEn = "Complete walkthrough of the Schengen Type-C and National-D medical visa for Saudi citizens traveling to Germany — documents, timelines, costs, fast-track tactics.";
  const descAr = "جولة شاملة لتأشيرة شنغن نوع C والوطنية D للعلاج الطبي للمواطنين السعوديين المسافرين إلى ألمانيا — المستندات، الجداول، التكاليف، وآليات التسريع.";

  const sections = [
    {
      id: "which-visa",
      h2En: "Which visa do you actually need?",
      h2Ar: "أي تأشيرة تحتاج فعلاً؟",
      bodyEn: <>
        <p>Saudi citizens traveling to Germany for medical treatment apply for one of two visa categories. The choice depends entirely on the planned length of stay.</p>
        <p className="mt-3"><strong>Schengen Type C (short-stay)</strong> — for treatment plus recovery up to 90 days within any 180-day window. This covers most surgical journeys: a Whipple procedure with 14-day stay and a 4-week post-discharge follow-up window fits comfortably. The Type-C visa permits travel across all 27 Schengen countries, useful if family members want to visit nearby destinations during recovery.</p>
        <p className="mt-3"><strong>National Type D (long-stay)</strong> — for treatment exceeding 90 days. Required for bone-marrow transplant journeys (typical 100–180 day stay), prolonged oncology regimens (e.g. 6-cycle chemotherapy + assessments = 5–7 months), and complex pediatric cases with multiple staged surgeries. The Type-D visa allows entry to Germany only and requires a German residence registration (Anmeldung) within the first 14 days of arrival.</p>
        <p className="mt-3">If your treatment plan straddles the 90-day boundary, apply for Type D from the start — converting from Type C to Type D inside Germany is bureaucratically painful and not always granted.</p>
      </>,
      bodyAr: <>
        <p>المواطنون السعوديون المسافرون إلى ألمانيا للعلاج يقدّمون لفئتين تأشيريتين. الاختيار يعتمد كلياً على مدة الإقامة المخططة.</p>
        <p className="mt-3"><strong>شنغن نوع C (إقامة قصيرة)</strong> — للعلاج والتعافي حتى ٩٠ يوماً ضمن أي نافذة ١٨٠ يوم. يغطي معظم الرحلات الجراحية: عملية ويبل بإقامة ١٤ يوم ونافذة متابعة ٤ أسابيع بعد الخروج تتسع بسهولة. تأشيرة C تسمح بالسفر عبر دول شنغن الـ٢٧، مفيدة إن أراد المرافقون زيارة وجهات قريبة خلال التعافي.</p>
        <p className="mt-3"><strong>الوطنية نوع D (إقامة طويلة)</strong> — للعلاج فوق ٩٠ يوماً. مطلوبة لزراعة نخاع العظم (إقامة معتادة ١٠٠–١٨٠ يوم)، أنظمة الأورام المطوّلة (٦ دورات كيميائي + تقييمات = ٥–٧ أشهر)، وحالات الأطفال المعقّدة بجراحات متعددة. تأشيرة D تسمح بالدخول إلى ألمانيا فقط وتتطلب تسجيل إقامة (Anmeldung) خلال أول ١٤ يوم من الوصول.</p>
        <p className="mt-3">إن كانت خطة علاجك تتجاوز حد الـ٩٠ يوم، قدّم على D من البداية — التحويل من C إلى D داخل ألمانيا مرهق إدارياً ولا يُمنح دائماً.</p>
      </>,
    },
    {
      id: "documents",
      h2En: "The full document checklist",
      h2Ar: "قائمة المستندات الكاملة",
      bodyEn: <>
        <p>Every medical-treatment visa application to Germany requires the following documents, submitted in original plus one set of photocopies. Missing items result in immediate rejection without refund of the visa fee.</p>
        <ol className="mt-3 space-y-2 list-decimal list-inside">
          <li><strong>Visa application form</strong> — completed online via the German Embassy portal, printed, and signed.</li>
          <li><strong>Two recent biometric photos</strong> (35×45 mm, white background, within last 6 months).</li>
          <li><strong>Saudi passport</strong> valid 6+ months beyond return date, with at least 2 blank pages.</li>
          <li><strong>Hospital admission letter</strong> on official letterhead, in German or English, naming the patient, the diagnosis, the planned treatment, the admission date, and the estimated cost. This is the single most important document.</li>
          <li><strong>Cost-coverage proof</strong> — either a Letter of Guarantee from your insurer (BUPA Arabia, Tawuniya) confirming coverage of the named procedure at the named hospital, OR bank statements demonstrating funds equal to treatment cost + €100/day living expenses.</li>
          <li><strong>Travel medical insurance</strong> covering the full Schengen area, minimum €30,000 coverage, valid for the requested visa period.</li>
          <li><strong>Flight reservation</strong> (a held reservation, not a paid ticket — embassies recommend holding rather than purchasing).</li>
          <li><strong>Accommodation proof</strong> — hotel/apartment booking or hospital-provided housing confirmation.</li>
          <li><strong>Cover letter from referring Saudi physician</strong> explaining medical necessity for treatment abroad.</li>
          <li><strong>Family relationship documents</strong> if traveling with spouse/parent/child accompaniers (marriage certificate, family card, all attested by Saudi Ministry of Foreign Affairs).</li>
        </ol>
      </>,
      bodyAr: <>
        <p>كل طلب تأشيرة علاج إلى ألمانيا يتطلب الوثائق التالية، أصلية + مجموعة نسخ. أي نقص = رفض فوري دون استرداد الرسوم.</p>
        <ol className="mt-3 space-y-2 list-decimal list-inside" style={{ listStylePosition: "inside" }}>
          <li><strong>نموذج طلب التأشيرة</strong> — يُعبّأ إلكترونياً عبر بوابة السفارة الألمانية ويُطبع ويُوقّع.</li>
          <li><strong>صورتان بيومتريتان حديثتان</strong> (٣٥×٤٥ ملم، خلفية بيضاء، خلال آخر ٦ أشهر).</li>
          <li><strong>جواز سفر سعودي</strong> ساري أكثر من ٦ أشهر بعد تاريخ العودة، مع صفحتين فارغتين على الأقل.</li>
          <li><strong>خطاب قبول المستشفى</strong> على ورق رسمي بالألمانية أو الإنجليزية، يذكر اسم المريض والتشخيص والعلاج المخطط وتاريخ الإدخال والتكلفة المقدرة. الوثيقة الأهم.</li>
          <li><strong>إثبات تغطية التكلفة</strong> — إما خطاب ضمان من شركة التأمين (بوبا، التعاونية) يؤكد تغطية الإجراء في المستشفى المسمى، أو كشوف بنكية تثبت أموالاً تساوي كلفة العلاج + ١٠٠ يورو/يوم معيشة.</li>
          <li><strong>تأمين سفر طبي</strong> يغطي منطقة شنغن كاملة، حد أدنى ٣٠٠٠٠ يورو، ساري لمدة التأشيرة.</li>
          <li><strong>حجز طيران</strong> (محجوز لا مدفوع — السفارات توصي بالحجز لا الشراء).</li>
          <li><strong>إثبات إقامة</strong> — حجز فندق/شقة أو تأكيد سكن مقدّم من المستشفى.</li>
          <li><strong>خطاب تغطية من الطبيب السعودي المُحيل</strong> يشرح الضرورة الطبية للعلاج خارج البلاد.</li>
          <li><strong>وثائق صلة القرابة</strong> إن سافر مرافقون (عقد زواج، كرت العائلة، مصدّق من وزارة الخارجية السعودية).</li>
        </ol>
      </>,
    },
    {
      id: "where-to-apply",
      h2En: "Where to apply and what to expect at the appointment",
      h2Ar: "أين تقدّم وماذا تتوقع في الموعد",
      bodyEn: <>
        <p>Saudi citizens apply through one of three channels. The German Embassy in Riyadh (Diplomatic Quarter) handles all national visas (Type D). The two VFS Global centers — in Jeddah (Sahafa District) and Khobar (Al Khobar Mall area) — handle Schengen Type C applications.</p>
        <p className="mt-3">Book your appointment online through the embassy or VFS portal. Lead time during summer (June–August) and Hajj/Umrah seasons is 4–6 weeks. Off-peak (January–March, October–November) it is 1–2 weeks.</p>
        <p className="mt-3">At the appointment: your fingerprints and photograph are captured digitally, your documents are reviewed (often the most thorough step), and you pay the visa fee. Schengen Type C is €90 for adults and €45 for children 6–12. National Type D is €75. Payment is by card or cash in SAR equivalent. The visa officer may ask brief verbal questions in English about your medical condition and travel plan; answer concisely and consistently with your written documents.</p>
        <p className="mt-3">Standard processing time after the appointment is 10–15 working days for Schengen Type C and 4–8 weeks for Type D. Your passport is collected separately once a notification arrives by email or SMS.</p>
      </>,
      bodyAr: <>
        <p>المواطنون السعوديون يقدّمون عبر إحدى ثلاث قنوات. السفارة الألمانية بالرياض (الحي الدبلوماسي) تتولى التأشيرات الوطنية (D). مركزا VFS Global في جدة (السفارة) والخبر (مول الخبر) يتوليان شنغن C.</p>
        <p className="mt-3">احجز موعدك إلكترونياً عبر بوابة السفارة أو VFS. وقت الانتظار في الصيف (يونيو–أغسطس) وفي مواسم الحج/العمرة ٤–٦ أسابيع. خارج الذروة (يناير–مارس، أكتوبر–نوفمبر) ١–٢ أسبوع.</p>
        <p className="mt-3">في الموعد: تُؤخذ بصماتك وصورتك رقمياً، تُراجع وثائقك (غالباً أدقّ خطوة)، وتدفع الرسوم. شنغن C ٩٠ يورو للبالغين و٤٥ يورو للأطفال ٦–١٢. الوطنية D ٧٥ يورو. الدفع بالبطاقة أو نقداً بما يعادل ر.س. قد يسأل الموظف أسئلة شفهية قصيرة بالإنجليزية عن حالتك وخطتك؛ أجب بإيجاز وبتطابق مع وثائقك المكتوبة.</p>
        <p className="mt-3">وقت المعالجة القياسي بعد الموعد ١٠–١٥ يوم عمل لشنغن C، و٤–٨ أسابيع لـD. الجواز يُستلم منفصلاً عند وصول إشعار بالبريد أو رسالة.</p>
      </>,
    },
    {
      id: "fast-track",
      h2En: "Fast-track tactics for medically urgent cases",
      h2Ar: "آليات التسريع للحالات الطبية العاجلة",
      bodyEn: <>
        <p>For genuinely time-critical medical cases — newly diagnosed aggressive cancers, post-trauma reconstructive surgery windows, decompensating cardiac patients — Germany operates a documented expedited procedure that reduces wait time from 4–6 weeks to 7–10 days.</p>
        <p className="mt-3">The expedited path requires three things. First, an urgency letter on hospital letterhead from the German receiving institution, signed by the consultant who will treat you, explicitly stating the medical need to begin treatment within X days. Second, a parallel urgency letter from your Saudi referring physician confirming the diagnosis and the inability to delay. Third, a written request for fast-track processing submitted via email to the embassy's medical-cases mailbox before your appointment.</p>
        <p className="mt-3">Do not abuse this channel. Embassies maintain informal lists of repeated fast-track requesters whose subsequent applications receive heightened scrutiny. Reserve fast-track for genuine emergencies and accept the standard timeline for elective procedures.</p>
      </>,
      bodyAr: <>
        <p>للحالات الطبية ذات الحساسية الزمنية الحقيقية — السرطانات العدوانية حديثة التشخيص، نوافذ جراحة الترميم بعد الصدمة، مرضى القلب المتدهورون — تشغّل ألمانيا إجراء تسريع موثّق يخفّض الانتظار من ٤–٦ أسابيع إلى ٧–١٠ أيام.</p>
        <p className="mt-3">المسار العاجل يتطلب ثلاثة. أولاً، خطاب استعجال على ورق المستشفى الألماني المستقبل موقّع من الاستشاري الذي سيعالجك، يذكر صراحة الحاجة لبدء العلاج خلال X يوم. ثانياً، خطاب استعجال موازٍ من طبيبك السعودي المُحيل يؤكد التشخيص واستحالة التأخير. ثالثاً، طلب مكتوب للتسريع يُرسل بالبريد الإلكتروني إلى صندوق الحالات الطبية بالسفارة قبل موعدك.</p>
        <p className="mt-3">لا تسئ استخدام هذه القناة. السفارات تحتفظ بقوائم غير رسمية للمتكررين، طلباتهم اللاحقة تحظى بتدقيق مشدّد. احتفظ بالتسريع للطوارئ الحقيقية واقبل الجدول القياسي للإجراءات الاختيارية.</p>
      </>,
    },
    {
      id: "rejections",
      h2En: "The most common rejection reasons (and how to avoid them)",
      h2Ar: "أسباب الرفض الأكثر شيوعاً (وكيف تتجنّبها)",
      bodyEn: <>
        <p>German medical visas have a low rejection rate for properly documented applications — under 5% for first-time applicants with hospital admission letters and complete cost-coverage proof. The rejections that do occur cluster around four issues.</p>
        <p className="mt-3"><strong>1. Insufficient cost-coverage proof.</strong> Bank statements alone are often insufficient — the embassy may demand a Letter of Guarantee from a recognised insurer. Self-pay families should arrange an escrow letter from a Saudi bank confirming earmarked funds, not just balance.</p>
        <p className="mt-3"><strong>2. Hospital admission letter too vague.</strong> A letter saying "patient referred for treatment" is not enough. The letter must name the specific procedure, expected length of stay, and estimated cost.</p>
        <p className="mt-3"><strong>3. Family-accompanier documents not attested.</strong> Saudi family cards and marriage certificates must carry the apostille from the Saudi Ministry of Foreign Affairs and a certified German or English translation. Untranslated Arabic documents are routinely rejected.</p>
        <p className="mt-3"><strong>4. Inconsistencies between application and verbal answers.</strong> If your written application says 21-day stay but you tell the visa officer "three or four weeks," the discrepancy can trigger denial. Brief your accompaniers in advance to avoid contradictions.</p>
      </>,
      bodyAr: <>
        <p>تأشيرات العلاج الألمانية لها معدّل رفض منخفض للطلبات الموثّقة جيداً — أقل من ٥٪ للمتقدمين الجدد بخطاب قبول وتغطية كاملة. الرفض الذي يحدث يتمحور حول أربع قضايا.</p>
        <p className="mt-3"><strong>١. إثبات تغطية تكلفة غير كافٍ.</strong> الكشوف البنكية وحدها غير كافية أحياناً — السفارة قد تطلب خطاب ضمان من شركة تأمين معترف بها. العائلات الذاتية الدفع تحتاج خطاب ضمان (escrow) من بنك سعودي يؤكد تخصيص الأموال، لا مجرد الرصيد.</p>
        <p className="mt-3"><strong>٢. خطاب قبول المستشفى مبهم.</strong> خطاب يقول "المريض مُحال للعلاج" غير كافٍ. يجب أن يذكر الإجراء المحدد ومدة الإقامة المتوقعة والتكلفة المقدرة.</p>
        <p className="mt-3"><strong>٣. وثائق المرافقين غير مصدّقة.</strong> كروت العائلة وعقود الزواج السعودية يجب أن تحمل تصديق وزارة الخارجية السعودية وترجمة معتمدة بالألمانية أو الإنجليزية. الوثائق العربية غير المترجمة تُرفض روتينياً.</p>
        <p className="mt-3"><strong>٤. تضارب بين الطلب والإجابات الشفهية.</strong> إن قال طلبك المكتوب ٢١ يوم وقلت للموظف "ثلاثة أو أربعة أسابيع"، التضارب قد يُفعّل الرفض. أحط مرافقيك علماً مسبقاً.</p>
      </>,
    },
    {
      id: "rufayq-visa",
      h2En: "How RufayQ helps with the visa journey",
      h2Ar: "كيف يساعد رُفَيِّق في رحلة التأشيرة",
      bodyEn: <>
        <p>RufayQ's Smart Scan extracts key fields from your hospital admission letter, passport, and insurance LOG and pre-populates a structured visa-document checklist. The Records vault stores Apostille-certified family documents alongside their German translations, so the entire bundle is one-tap downloadable on the day of your VFS appointment.</p>
        <p className="mt-3">For families using the Companion or Family tier, the included Medical Consultant session can be scheduled the week before the visa appointment to walk through expected questions and verify document consistency. The Priority Travel Coordinator add-on books your hotel and ground transport in Frankfurt or Munich, releasing one logistical worry from a stressful pre-departure week.</p>
      </>,
      bodyAr: <>
        <p>المسح الذكي في رُفَيِّق يستخلص الحقول الرئيسية من خطاب قبول المستشفى وجوازك وخطاب ضمان التأمين، ويعبّئ قائمة تأشيرة منظّمة. خزانة الملفات تحفظ وثائق العائلة المصدّقة مع ترجماتها الألمانية، فالحزمة كاملة يمكن تنزيلها بنقرة واحدة يوم موعد VFS.</p>
        <p className="mt-3">للعائلات على باقات كومبانيون أو فاميلي، جلسة المستشار الطبي المضمّنة يمكن جدولتها قبل موعد التأشيرة بأسبوع لمراجعة الأسئلة المتوقعة وتدقيق اتساق الوثائق. إضافة منسّق السفر بأولوية تحجز فندقك ونقلك الأرضي في فرانكفورت أو ميونخ، مزيلةً قلقاً لوجستياً من أسبوع ما قبل السفر المرهق.</p>
      </>,
    },
  ];

  const faqEn = [
    { q: "Can I travel before my Type D visa is issued?", a: "No. Entering Germany on a tourist visa with the intent to begin medical treatment is grounds for entry refusal at Frankfurt or Munich airport. Wait for the issued Type D before booking flights." },
    { q: "Do children need their own visas?", a: "Yes. Each accompanying child needs their own application, photos, and consent letters from both parents (attested if one parent is not traveling)." },
    { q: "What if my hospital admission date changes?", a: "Notify the embassy immediately. Minor date shifts (within 2 weeks) are usually accepted with a hospital amendment letter. Major changes require resubmission." },
  ];

  const howToSteps = [
    { name: "Get hospital admission letter", text: "Request a German-hospital admission letter naming procedure, dates, and estimated cost." },
    { name: "Secure cost coverage", text: "Obtain insurance Letter of Guarantee or bank escrow letter for treatment + €100/day living expenses." },
    { name: "Book embassy/VFS appointment", text: "Schedule online via the German Embassy (Type D) or VFS Global Jeddah/Khobar (Type C) portal." },
    { name: "Submit complete document set", text: "Bring originals plus copies of all 10 required documents to the appointment." },
    { name: "Complete biometrics & pay fee", text: "Fingerprints and photo are captured; pay €90 (Type C) or €75 (Type D) by card or SAR cash." },
    { name: "Collect passport on notification", text: "Standard processing 10–15 working days (Type C) or 4–8 weeks (Type D)." },
  ];

  return (
    <>
      <Seo
        title={isAr ? titleAr : titleEn}
        description={isAr ? descAr : descEn}
        canonical={url}
        jsonLd={[
          articleSchema({
            url,
            title: isAr ? titleAr : titleEn,
            description: isAr ? descAr : descEn,
            datePublished: "2026-04-15",
            author: AUTHORS.drMorsy,
          }),
          breadcrumbSchema([
            { name: isAr ? "الرئيسية" : "Home", path: isAr ? "/ar" : "/" },
            { name: isAr ? "الأدلة" : "Guides", path: isAr ? "/ar/guides" : "/guides" },
            { name: isAr ? "تأشيرة ألمانيا الطبية" : "Germany Medical Visa", path: url },
          ]),
          howToSchema(
            "Apply for a German medical-treatment visa from Saudi Arabia",
            "Step-by-step process for Saudi citizens to obtain a Schengen Type-C or National Type-D visa for treatment in Germany.",
            howToSteps,
            "P30D",
          ),
          faqSchema(faqEn),
        ]}
      />
      <ContentPage
        eyebrowEn="Guides · Visa & Travel"
        eyebrowAr="الأدلة · التأشيرة والسفر"
        titleEn={titleEn}
        titleAr={titleAr}
        leadEn={descEn}
        leadAr={descAr}
        sections={sections}
      />
    </>
  );
};

export default MedicalVisaGermany;
