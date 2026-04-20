import ContentPage from "@/components/ContentPage";
import { Seo } from "@/seo/Seo";
import { useLocation } from "react-router-dom";
import { medicalWebPageSchema, breadcrumbSchema, faqSchema, AUTHORS } from "@/seo/schema";

const CancerTreatmentAbroad = () => {
  const isAr = useLocation().pathname.startsWith("/ar");
  const url = isAr ? "/ar/conditions/cancer-treatment-abroad" : "/conditions/cancer-treatment-abroad";

  const titleEn = "Cancer Treatment Abroad: A Saudi Patient's Guide to Germany, the US & UK";
  const titleAr = "العلاج من السرطان في الخارج: دليل المريض السعودي إلى ألمانيا وأمريكا وبريطانيا";
  const descEn = "How Saudi and Gulf cancer patients plan treatment abroad: choosing a hospital, second opinions, visas, costs, family logistics, and post-return care.";
  const descAr = "كيف يخطط مرضى السرطان من السعودية والخليج للعلاج خارج البلاد: اختيار المستشفى، الرأي الثاني، التأشيرات، التكاليف، ولوجستيات العائلة والمتابعة بعد العودة.";

  const sections = [
    {
      id: "why-abroad",
      h2En: "Why patients in Saudi Arabia consider treatment abroad",
      h2Ar: "لماذا يفكر المرضى في السعودية بالعلاج في الخارج",
      bodyEn: <>
        <p>Saudi Arabia has invested heavily in oncology over the last decade — KFSH&RC, KFMC, and Saudi German Hospitals deliver care that meets international standards for the majority of cancer diagnoses. Yet thousands of Saudi families still travel abroad each year for cancer treatment. Three reasons account for almost all of those journeys: access to a specific clinical trial, a sub-specialist surgeon for a rare tumor type, or a proton-therapy / advanced radiation modality not available domestically.</p>
        <p className="mt-3">If your oncologist in Riyadh, Jeddah, or Dammam has recommended overseas treatment, you are not abandoning the Saudi system — you are extending it. The most successful international journeys begin with a clear written referral letter, a translated pathology report, and a shortlist of two or three institutions abroad that have published outcomes in your exact diagnosis. Resist the urge to search broadly; the goal is depth, not breadth.</p>
        <p className="mt-3">For pediatric oncology and bone-marrow transplant, the most common destinations are St. Jude (Memphis) and Boston Children's. For adult solid tumors with surgical complexity — pancreatic, esophageal, retroperitoneal sarcoma — Heidelberg, Munich, MD Anderson, and Memorial Sloan Kettering dominate the referral pattern. For hematologic malignancies, MD Anderson and the Royal Marsden are the two centers Saudi insurance most readily approves.</p>
      </>,
      bodyAr: <>
        <p>استثمرت المملكة العربية السعودية بشكل كبير في طب الأورام خلال العقد الماضي — مستشفى الملك فيصل التخصصي، ومدينة الملك فهد الطبية، ومستشفيات السعودي الألماني تقدم رعاية بمعايير دولية لأغلبية تشخيصات السرطان. ومع ذلك، يسافر آلاف العائلات السعودية سنوياً للعلاج في الخارج. ثلاثة أسباب تفسّر معظم هذه الرحلات: الوصول إلى تجربة سريرية محددة، أو جرّاح متخصص في نوع ورم نادر، أو علاج بالبروتون أو إشعاع متقدم غير متوفر محلياً.</p>
        <p className="mt-3">إذا أوصى طبيب الأورام في الرياض أو جدة أو الدمام بعلاج خارجي، فأنت لا تتخلى عن المنظومة السعودية — بل توسّعها. الرحلات الدولية الناجحة تبدأ بخطاب إحالة مكتوب وتقرير باثولوجي مترجم وقائمة قصيرة من مؤسستين أو ثلاث نشرت نتائج علمية في تشخيصك بالضبط. تجنّب البحث الواسع؛ الهدف عمق لا اتساع.</p>
        <p className="mt-3">لأورام الأطفال وزرع نخاع العظم، أكثر الوجهات شيوعاً هي ست. جود في ممفيس وبوسطن للأطفال. للأورام الصلبة عند البالغين بتعقيد جراحي — البنكرياس والمريء والساركوما خلف الصفاق — تهيمن هايدلبرغ وميونخ وإم دي أندرسون وميموريال سلون كيترينغ على نمط الإحالة. للأورام الدموية، إم دي أندرسون والرويال مارسدن هما المركزان الأكثر قبولاً من التأمين السعودي.</p>
      </>,
    },
    {
      id: "second-opinion",
      h2En: "Step 1: Get a structured second opinion before you book a flight",
      h2Ar: "الخطوة ١: احصل على رأي ثانٍ منظّم قبل حجز الطيران",
      bodyEn: <>
        <p>Most second opinions delivered to Saudi families abroad are wasted because the receiving institution is sent a 200-page PDF with no narrative. The hospital's tumor board has 20 minutes to review your case. If they cannot find your stage, your prior treatment, and your specific question in the first three pages, you will get a generic reply.</p>
        <p className="mt-3">Build a one-page case summary: diagnosis with ICD-10 code, staging (TNM or equivalent), all biopsies and IHC results, prior chemotherapy regimens with response, and the single specific question you want answered. Pair that summary with raw imaging on a CD or DICOM cloud link, and the original pathology slides if they can be physically shipped (most US/EU centers prefer to re-stain in-house).</p>
        <p className="mt-3">German university hospitals (Charité, Heidelberg, LMU Munich) have International Patient Offices that respond in English within 5–7 business days. UK private centers (HCA, Royal Marsden Private Care) respond within 3 business days but require £400–£800 for the second opinion itself. US academic centers vary: MD Anderson and MSK reply within 10 days but quote treatment costs that are 3–4× European equivalents.</p>
      </>,
      bodyAr: <>
        <p>أغلب الآراء الثانية التي تُرسلها العائلات السعودية للخارج تضيع لأن المستشفى المستلم يصله ملف PDF بـ٢٠٠ صفحة دون سرد منظّم. مجلس الأورام في المستشفى لديه ٢٠ دقيقة لمراجعة حالتك. إن لم يجد المرحلة والعلاج السابق وسؤالك المحدد في أول ثلاث صفحات، ستحصل على رد عام.</p>
        <p className="mt-3">جهّز ملخّص حالة من صفحة واحدة: التشخيص مع رمز ICD-10، التحديد المرحلي (TNM)، جميع الخزعات ونتائج التحليل المناعي، أنظمة العلاج الكيميائي السابقة مع الاستجابة، والسؤال المحدد الوحيد. أرفق التصوير الخام على قرص أو رابط DICOM سحابي، وشرائح الباثولوجيا الأصلية إن أمكن شحنها (معظم المراكز الأمريكية والأوروبية تفضّل إعادة الصبغ داخلياً).</p>
        <p className="mt-3">المستشفيات الجامعية الألمانية (شاريتيه، هايدلبرغ، إل إم يو ميونخ) لديها مكاتب مرضى دوليين تردّ بالإنجليزية خلال ٥–٧ أيام عمل. المراكز الخاصة البريطانية (HCA، رويال مارسدن) تردّ خلال ٣ أيام لكنها تطلب ٤٠٠–٨٠٠ جنيه استرليني للرأي الثاني نفسه. المراكز الأكاديمية الأمريكية تتفاوت: إم دي أندرسون وإم إس كاي يردّان خلال ١٠ أيام لكن أسعار العلاج تساوي ٣–٤ أضعاف نظيراتها الأوروبية.</p>
      </>,
    },
    {
      id: "costs",
      h2En: "Step 2: Understand real cost ranges (and what insurance actually covers)",
      h2Ar: "الخطوة ٢: افهم نطاقات التكلفة الحقيقية (وما يغطيه التأمين فعلاً)",
      bodyEn: <>
        <p>Cancer treatment costs abroad vary by an order of magnitude. A 6-month course of standard chemotherapy at Heidelberg University Hospital runs €35,000–€55,000. The same regimen at MD Anderson is $180,000–$260,000. A Whipple procedure for pancreatic cancer is €45,000 in Munich, £55,000 in London private care, and $180,000–$220,000 in the US. Proton therapy for pediatric brain tumors is €120,000–€180,000 in Essen, $250,000+ in Boston.</p>
        <p className="mt-3">Saudi insurers — BUPA Arabia, Tawuniya, Medgulf, Allianz Saudi — handle international oncology claims very differently. BUPA Arabia's international network policies typically pre-approve named European centers up to a per-condition cap (often SAR 1.5–2.5 million for solid tumors). Tawuniya requires a Letter of Guarantee that must be triggered before admission, and routinely declines US treatment in favor of European equivalents at one-third the cost. Always request the LOG in writing before booking flights — verbal pre-approvals from call centers are not enforceable.</p>
        <p className="mt-3">For self-pay families, request an itemized cost estimate from the international patient office before commitment. The headline number rarely includes pathology, imaging, ICU days, or post-discharge medications. A realistic working budget is the quoted estimate plus 25%.</p>
      </>,
      bodyAr: <>
        <p>تكاليف علاج السرطان في الخارج تتفاوت بأضعاف. كورس علاج كيميائي قياسي ٦ أشهر في مستشفى هايدلبرغ الجامعي يتراوح بين ٣٥٠٠٠–٥٥٠٠٠ يورو. نفس النظام في إم دي أندرسون يكلّف ١٨٠٠٠٠–٢٦٠٠٠٠ دولار. عملية ويبل لسرطان البنكرياس ٤٥٠٠٠ يورو في ميونخ، ٥٥٠٠٠ جنيه استرليني في لندن، و١٨٠٠٠٠–٢٢٠٠٠٠ دولار في أمريكا. العلاج بالبروتون لأورام دماغ الأطفال ١٢٠٠٠٠–١٨٠٠٠٠ يورو في إيسن، أكثر من ٢٥٠٠٠٠ دولار في بوسطن.</p>
        <p className="mt-3">شركات التأمين السعودية — بوبا العربية والتعاونية وميدغلف وأليانز السعودي — تتعامل مع مطالبات الأورام الدولية بشكل مختلف جداً. وثائق بوبا الدولية عادةً تعتمد مسبقاً مراكز أوروبية مسمّاة بحد أقصى (غالباً ١.٥–٢.٥ مليون ر.س للأورام الصلبة). التعاونية تطلب خطاب ضمان قبل الإدخال، وترفض غالباً العلاج الأمريكي لصالح بديل أوروبي بثلث الكلفة. اطلب خطاب الضمان مكتوباً قبل حجز الطيران دائماً — الموافقات الشفهية من مراكز الاتصال غير ملزمة.</p>
        <p className="mt-3">للعائلات التي تدفع ذاتياً، اطلب تقدير كلفة تفصيلي من مكتب المرضى الدوليين قبل الالتزام. الرقم الرئيسي نادراً ما يشمل الباثولوجيا والتصوير وأيام العناية المركزة وأدوية ما بعد الخروج. الميزانية الواقعية = التقدير + ٢٥٪.</p>
      </>,
    },
    {
      id: "logistics",
      h2En: "Step 3: Visa, travel, and accommodation logistics",
      h2Ar: "الخطوة ٣: التأشيرة والسفر والإقامة",
      bodyEn: <>
        <p>Germany issues medical-treatment visas (Schengen Type C for short stays, National D for treatment over 90 days) on the basis of an admission letter from the receiving hospital, proof of funds (typically €60–€100/day plus treatment cost), and travel insurance. Application is at the German Embassy in Riyadh or VFS Global centers in Jeddah and Khobar. Realistic timeline: 4–6 weeks. Fast-track is possible with a written medical-urgency letter from the German hospital, typically reducing wait to 7–10 days.</p>
        <p className="mt-3">For accompanying family, Germany allows up to two accompanying persons on a single application bundle (typically a spouse and one parent for adult patients, or both parents for pediatric cases). UK NHS Private Patient and US visas have similar but stricter financial-proof thresholds — for the US B-2 medical visa, expect to demonstrate $150–$200 per day per person plus treatment escrow.</p>
        <p className="mt-3">Accommodation: every major German university hospital partners with serviced apartments within 2–3 km of campus, charging €80–€140/night for one-bedroom units. Booking through the hospital's social-services office unlocks medical-rate discounts of 15–25% versus public rates. In London, the Marsden and HCA work with corporate-rate hotels in Chelsea and Marylebone. In Houston (MD Anderson), Rotary House and the on-campus Hilton are walk-in-quality and cancellable.</p>
      </>,
      bodyAr: <>
        <p>تُصدر ألمانيا تأشيرات علاج طبي (شنغن نوع C للإقامات القصيرة، الوطنية D للعلاج فوق ٩٠ يوماً) بناءً على خطاب قبول من المستشفى المستقبل، وإثبات الأموال (عادةً ٦٠–١٠٠ يورو/يوم زائد كلفة العلاج)، وتأمين سفر. التقديم في السفارة الألمانية بالرياض أو مراكز VFS Global في جدة والخبر. الجدول الواقعي: ٤–٦ أسابيع. التسريع ممكن بخطاب استعجال طبي من المستشفى الألماني، يُختصر الوقت إلى ٧–١٠ أيام.</p>
        <p className="mt-3">للعائلة المرافقة، تسمح ألمانيا بمرافقَين كحد أقصى في الطلب الواحد (عادةً زوج/زوجة ووالد للبالغين، أو كلا الوالدين للحالات الطفولية). تأشيرات NHS Private البريطانية والـB-2 الأمريكية لديها متطلبات مالية أصعب — للـB-2 الطبية الأمريكية توقّع إثبات ١٥٠–٢٠٠ دولار/يوم/شخص زائد ضمان العلاج.</p>
        <p className="mt-3">الإقامة: كل مستشفى جامعي ألماني كبير له شقق فندقية على بُعد ٢–٣ كم من الحرم الجامعي بسعر ٨٠–١٤٠ يورو/ليلة لشقة غرفة واحدة. الحجز من خلال مكتب الخدمات الاجتماعية بالمستشفى يفتح خصومات بنسبة ١٥–٢٥٪. في لندن، مارسدن وHCA يعملان مع فنادق بأسعار الشركات في تشيلسي وماريليبون. في هيوستن (إم دي أندرسون)، روتاري هاوس وهيلتون داخل الحرم الجامعي بمستوى ممتاز وقابلة للإلغاء.</p>
      </>,
    },
    {
      id: "post-return",
      h2En: "Step 4: Post-return care and continuity in Saudi Arabia",
      h2Ar: "الخطوة ٤: الرعاية بعد العودة والاستمرارية في السعودية",
      bodyEn: <>
        <p>The most common failure point in international cancer journeys is not the surgery — it is the handoff back to Saudi Arabia. A typical case: a Saudi patient is discharged from Heidelberg with a 40-page German-language discharge summary, a port catheter, and a follow-up MRI scheduled in 8 weeks. Three weeks later they present to a Riyadh oncologist who reads no German, has no port-flush protocol from the European center, and orders a duplicate MRI on a different scanner — restarting baseline measurement.</p>
        <p className="mt-3">Avoid this by requesting two parallel discharge documents before leaving the international center: the standard institutional discharge summary in the hospital's working language, and a 2-page bilingual handoff letter (English + Arabic if available, otherwise English) addressed specifically to "the receiving Saudi oncologist." This second document must contain: medication list with brand and generic names, port care schedule, next imaging due date with required protocol, and a single contact email at the international center for the Saudi physician to reach if questions arise.</p>
        <p className="mt-3">RufayQ's Care Hub module is built specifically for this handoff. The Records vault stores both documents in their original languages, the Medication module flags interactions when a Saudi pharmacy substitutes generics, and the Care Plan checklist generates port-care reminders calibrated to the European protocol.</p>
      </>,
      bodyAr: <>
        <p>أكثر نقاط الفشل شيوعاً في رحلات السرطان الدولية ليست الجراحة — بل التسليم العائد إلى السعودية. حالة نموذجية: مريض سعودي يخرج من هايدلبرغ بتقرير خروج ألماني ٤٠ صفحة، وبورت كاثيتر، وتصوير رنين متابعة بعد ٨ أسابيع. بعد ٣ أسابيع يراجع طبيب أورام في الرياض لا يقرأ الألمانية، وليس لديه بروتوكول غسيل البورت من المركز الأوروبي، ويطلب رنيناً مكرراً على جهاز مختلف — معيداً قياس الخط القاعدي.</p>
        <p className="mt-3">تجنّب هذا بطلب وثيقتين متوازيتين قبل المغادرة: تقرير الخروج المؤسسي القياسي بلغة المستشفى، ورسالة تسليم ثنائية اللغة من صفحتين (إنجليزي + عربي إن أمكن) موجّهة تحديداً إلى "طبيب الأورام السعودي المستقبل". يجب أن تحوي: قائمة أدوية بالأسماء التجارية والعلمية، جدول العناية بالبورت، تاريخ التصوير القادم مع البروتوكول المطلوب، وبريد تواصل واحد في المركز الدولي ليتواصل به الطبيب السعودي عند الحاجة.</p>
        <p className="mt-3">وحدة مركز الرعاية في رُفَيِّق مبنية خصيصاً لهذا التسليم. خزانة الملفات تحفظ الوثيقتين بلغتيهما الأصليتين، ووحدة الأدوية ترصد التداخلات عند استبدال الصيدلية السعودية للأدوية الجنيسة، وقائمة خطة الرعاية تولّد تذكيرات بالعناية بالبورت معايرة للبروتوكول الأوروبي.</p>
      </>,
    },
    {
      id: "rufayq",
      h2En: "How RufayQ supports your cancer journey end-to-end",
      h2Ar: "كيف يدعم رُفَيِّق رحلتك العلاجية من البداية للنهاية",
      bodyEn: <>
        <p>RufayQ is an AI medical companion built specifically for Gulf patients pursuing treatment abroad. For oncology journeys it provides: bilingual document summarization (upload your German discharge summary, get an Arabic plain-language version in 90 seconds), a structured journey timeline that links every appointment to its supporting documents, a medication tracker with interaction alerts calibrated to chemotherapy regimens, and Care Hub modules covering nausea management, neutropenic precautions, and PICC/port care.</p>
        <p className="mt-3">For Companion-tier and Family-tier subscribers, the Medical Consultant add-on provides 45-minute video sessions with a physician-coordinator who has reviewed your case before the call — useful for translating a German oncologist's plan into a question list for your Saudi physician, or for preparing the second-opinion submission package.</p>
      </>,
      bodyAr: <>
        <p>رُفَيِّق رفيق طبي ذكي مبني خصيصاً لمرضى الخليج الذين يسعون للعلاج في الخارج. لرحلات الأورام يوفر: تلخيص وثائق ثنائي اللغة (ارفع تقرير خروجك الألماني واحصل على نسخة عربية مبسّطة خلال ٩٠ ثانية)، جدول رحلة منظّم يربط كل موعد بمستنداته، متتبع أدوية بتنبيهات تداخل معايرة لأنظمة العلاج الكيميائي، ووحدات مركز الرعاية تشمل إدارة الغثيان واحتياطات قلة العدلات والعناية بالبورت.</p>
        <p className="mt-3">لمشتركي كومبانيون وفاميلي، إضافة المستشار الطبي توفر جلسات فيديو ٤٥ دقيقة مع طبيب-منسّق راجع حالتك قبل المكالمة — مفيد لترجمة خطة طبيب الأورام الألماني إلى قائمة أسئلة لطبيبك السعودي، أو لتجهيز ملف الرأي الثاني.</p>
      </>,
    },
  ];

  const faqEn = [
    { q: "How long before I can travel after diagnosis?", a: "Most international referrals can be initiated within 2–3 weeks. Visa processing adds 4–6 weeks for Germany, 2–4 weeks for the UK, 6–10 weeks for the US." },
    { q: "Will my Saudi insurance cover treatment abroad?", a: "BUPA Arabia and Tawuniya international policies typically cover named European oncology centers with pre-approval. US treatment is rarely approved when European equivalents exist. Always request a written Letter of Guarantee before booking." },
    { q: "Can my family travel with me?", a: "Yes. Germany allows up to 2 accompanying persons per application; UK and US visas are individual but commonly granted in family groups with shared financial sponsorship." },
  ];

  return (
    <>
      <Seo
        title={isAr ? titleAr : titleEn}
        description={isAr ? descAr : descEn}
        canonical={url}
        jsonLd={[
          medicalWebPageSchema({
            url,
            title: isAr ? titleAr : titleEn,
            description: isAr ? descAr : descEn,
            conditionName: isAr ? "السرطان" : "Cancer",
            conditionDescription: isAr ? "أورام صلبة وسرطانات الدم لدى البالغين والأطفال" : "Solid tumors and hematologic malignancies in adult and pediatric patients",
            lastReviewed: "2026-04-15",
            author: AUTHORS.drMorsy,
          }),
          breadcrumbSchema([
            { name: isAr ? "الرئيسية" : "Home", path: isAr ? "/ar" : "/" },
            { name: isAr ? "الحالات" : "Conditions", path: isAr ? "/ar/conditions" : "/conditions" },
            { name: isAr ? "علاج السرطان في الخارج" : "Cancer Treatment Abroad", path: url },
          ]),
          faqSchema(faqEn),
        ]}
      />
      <ContentPage
        eyebrowEn="Conditions · Oncology"
        eyebrowAr="الحالات · الأورام"
        titleEn={titleEn}
        titleAr={titleAr}
        leadEn={descEn}
        leadAr={descAr}
        sections={sections}
      />
    </>
  );
};

export default CancerTreatmentAbroad;
