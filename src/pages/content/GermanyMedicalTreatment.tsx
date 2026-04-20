import ContentPage from "@/components/ContentPage";
import { Seo } from "@/seo/Seo";
import { useLocation } from "react-router-dom";
import { medicalWebPageSchema, breadcrumbSchema, faqSchema, AUTHORS } from "@/seo/schema";

const GermanyMedicalTreatment = () => {
  const isAr = useLocation().pathname.startsWith("/ar");
  const url = isAr ? "/ar/destinations/germany-medical-treatment" : "/destinations/germany-medical-treatment";

  const titleEn = "Medical Treatment in Germany: A Complete Guide for Saudi & Gulf Patients (2026)";
  const titleAr = "العلاج الطبي في ألمانيا: دليل شامل لمرضى السعودية والخليج (٢٠٢٦)";
  const descEn = "Why Germany dominates Gulf medical-tourism referrals: top hospitals, costs, visa process, language logistics, and how Saudi insurance works abroad.";
  const descAr = "لماذا تهيمن ألمانيا على إحالات السياحة العلاجية الخليجية: أفضل المستشفيات، التكاليف، التأشيرة، اللغة، وآلية تعامل التأمين السعودي مع العلاج الخارجي.";

  const sections = [
    {
      id: "why-germany",
      h2En: "Why Germany — and why Gulf patients in particular",
      h2Ar: "لماذا ألمانيا — ولماذا مرضى الخليج تحديداً",
      bodyEn: <>
        <p>Germany has been the single most-referenced medical-tourism destination for Saudi and Gulf patients for over two decades. Three structural factors explain this. First, the German university-hospital system (Universitätsklinikum) blends academic research with high case volumes — Heidelberg performs more pancreatic resections in a year than most countries do in five. Second, Germany's price-quality ratio is the best in developed-world healthcare: a complex cardiac procedure costs 25–35% of the US equivalent at the same outcome benchmark. Third, German hospitals built International Patient Offices specifically to serve Gulf families starting in the late 1990s — Arabic-speaking case managers, halal kitchens, prayer rooms, and family-residence apartments are standard, not exceptional.</p>
        <p className="mt-3">For Gulf patients with private payment or international insurance, Germany also offers something the UK and US do not: predictable case-rate pricing. A Whipple procedure at Heidelberg has a published all-in case rate (surgery + 14-day stay + standard ICU + first follow-up) that varies by less than 8% case-to-case. Compare that to a US center where the bill can swing 40% based on length of stay alone.</p>
      </>,
      bodyAr: <>
        <p>ألمانيا الوجهة الأولى للسياحة العلاجية لمرضى السعودية والخليج لأكثر من عقدين. ثلاثة عوامل هيكلية تفسّر ذلك. أولاً، نظام المستشفيات الجامعية الألمانية يمزج البحث الأكاديمي بأحجام حالات عالية — هايدلبرغ تجري عمليات استئصال بنكرياس في السنة أكثر مما تجريه دول كاملة في خمس سنوات. ثانياً، نسبة السعر إلى الجودة الأفضل في الرعاية الصحية المتقدمة: عملية قلب معقدة تكلّف ٢٥–٣٥٪ من نظيرها الأمريكي بنفس مستوى النتائج. ثالثاً، المستشفيات الألمانية بنت مكاتب مرضى دوليين خصيصاً لخدمة العائلات الخليجية منذ أواخر التسعينيات — مديرو حالات يتحدثون العربية، مطابخ حلال، مصلّيات، وشقق سكن عائلي معيار وليس استثناء.</p>
        <p className="mt-3">لمرضى الخليج بالدفع الخاص أو التأمين الدولي، ألمانيا توفر ما لا توفره بريطانيا وأمريكا: تسعير حالات قابل للتنبؤ. عملية ويبل في هايدلبرغ لها سعر شامل منشور (جراحة + ١٤ يوم إقامة + عناية مركزة + متابعة أولى) يتفاوت أقل من ٨٪ بين الحالات. قارن ذلك بمركز أمريكي حيث الفاتورة قد تتأرجح ٤٠٪ بناءً على مدة الإقامة فقط.</p>
      </>,
    },
    {
      id: "top-hospitals",
      h2En: "The top German hospitals for Gulf medical referrals",
      h2Ar: "أفضل المستشفيات الألمانية للإحالات الخليجية",
      bodyEn: <>
        <p><strong>University Hospital Heidelberg</strong> — Europe's leading center for pancreatic and hepatobiliary surgery, with a long-established International Patient Office and dedicated Saudi liaison.</p>
        <p className="mt-3"><strong>Charité Berlin</strong> — Germany's largest university hospital. Strongest for neurosurgery, neuro-oncology, transplant medicine, and rare adult diseases. Multiple Arabic-speaking case managers.</p>
        <p className="mt-3"><strong>LMU Klinikum Munich</strong> — Cardiology, cardiothoracic surgery, and pediatric specialties. Operates a dedicated Gulf-patient ward at Großhadern campus.</p>
        <p className="mt-3"><strong>Universitätsklinikum Frankfurt</strong> — Oncology and stem-cell transplant. Strong relationship with Tawuniya and BUPA Arabia for direct billing.</p>
        <p className="mt-3"><strong>Asklepios Klinik Barmbek (Hamburg)</strong> and <strong>Schön Klinik Vogtareuth</strong> — orthopedics, spine surgery, and pediatric epilepsy. Particularly popular with UAE and Kuwaiti families.</p>
      </>,
      bodyAr: <>
        <p><strong>مستشفى هايدلبرغ الجامعي</strong> — مركز أوروبا الرائد لجراحة البنكرياس والكبد والقنوات الصفراوية، بمكتب مرضى دوليين راسخ ومنسّق سعودي مخصص.</p>
        <p className="mt-3"><strong>شاريتيه برلين</strong> — أكبر مستشفى جامعي في ألمانيا. الأقوى في جراحة الأعصاب وأورام الجهاز العصبي وزراعة الأعضاء والأمراض النادرة. عدد من مديري الحالات يتحدثون العربية.</p>
        <p className="mt-3"><strong>إل إم يو ميونخ</strong> — أمراض القلب وجراحة القلب والصدر وتخصصات الأطفال. تشغّل جناحاً مخصصاً للمرضى الخليجيين في حرم غروسهادرن.</p>
        <p className="mt-3"><strong>مستشفى فرانكفورت الجامعي</strong> — الأورام وزراعة الخلايا الجذعية. علاقة قوية مع التعاونية وبوبا العربية للفوترة المباشرة.</p>
        <p className="mt-3"><strong>أسكليبيوس بارمبيك (هامبورغ)</strong> و<strong>شون فوغتاريوث</strong> — جراحة العظام والعمود الفقري وصرع الأطفال. شائعة جداً لدى العائلات الإماراتية والكويتية.</p>
      </>,
    },
    {
      id: "costs-insurance",
      h2En: "Real costs and how Saudi insurance handles Germany",
      h2Ar: "التكاليف الحقيقية وكيف يتعامل التأمين السعودي مع ألمانيا",
      bodyEn: <>
        <p>Indicative all-in case rates at top German university hospitals (2026 figures, including 14–21 day stay where applicable):</p>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>CABG (coronary bypass): €38,000–€52,000</li>
          <li>Whipple procedure (pancreas): €45,000–€65,000</li>
          <li>Knee replacement: €18,000–€26,000</li>
          <li>Spine fusion (single level): €22,000–€32,000</li>
          <li>Liver transplant: €180,000–€240,000</li>
          <li>Bone-marrow transplant (allogeneic): €200,000–€300,000</li>
        </ul>
        <p className="mt-3">BUPA Arabia's GlobalHealth and Tawuniya's International rider both pre-authorize named German university hospitals. Direct billing (cashless) is available at Heidelberg, Charité, LMU, Frankfurt, and Hamburg-Eppendorf for these two insurers. With other Saudi insurers (Medgulf, Allianz Saudi, Bupa standard) the family typically pays out-of-pocket and submits for reimbursement after return — RufayQ's Insurance Claims Concierge add-on can handle this submission for Saudi insurers.</p>
      </>,
      bodyAr: <>
        <p>أسعار حالات إرشادية شاملة في أفضل المستشفيات الجامعية الألمانية (أرقام ٢٠٢٦، شاملة إقامة ١٤–٢١ يوم حيث ينطبق):</p>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>قسطرة قلب جراحية (CABG): ٣٨٠٠٠–٥٢٠٠٠ يورو</li>
          <li>عملية ويبل (البنكرياس): ٤٥٠٠٠–٦٥٠٠٠ يورو</li>
          <li>تبديل ركبة: ١٨٠٠٠–٢٦٠٠٠ يورو</li>
          <li>دمج فقرات (مستوى واحد): ٢٢٠٠٠–٣٢٠٠٠ يورو</li>
          <li>زراعة كبد: ١٨٠٠٠٠–٢٤٠٠٠٠ يورو</li>
          <li>زراعة نخاع عظم (متبرع): ٢٠٠٠٠٠–٣٠٠٠٠٠ يورو</li>
        </ul>
        <p className="mt-3">بوبا غلوبال هيلث والتعاونية الدولية يعتمدان مسبقاً المستشفيات الجامعية الألمانية المسماة. الفوترة المباشرة (بدون كاش) متاحة في هايدلبرغ وشاريتيه وإل إم يو وفرانكفورت وهامبورغ-إيبندورف لهاتين الشركتين. مع باقي شركات التأمين السعودية (ميدغلف، أليانز، بوبا القياسية) العائلة تدفع ذاتياً وتقدّم للاسترداد بعد العودة — إضافة مساعد المطالبات في رُفَيِّق تتولى ذلك.</p>
      </>,
    },
    {
      id: "language",
      h2En: "Language: how Arabic and English fit into German hospitals",
      h2Ar: "اللغة: كيف يتناسب العربي والإنجليزي مع المستشفيات الألمانية",
      bodyEn: <>
        <p>The clinical-team working language at every major German university hospital is German. The International Patient Office, however, operates in English by default and offers Arabic interpretation as a documented service — typically billed at €60–€90/hour or bundled into the case rate above a certain treatment value.</p>
        <p className="mt-3">Critical detail: the discharge summary will be issued in German. You must explicitly request a structured English-language summary at the time of discharge planning (3–4 days before discharge), not after the fact. Translation requests submitted post-discharge take 2–4 weeks and incur fees of €0.18–€0.25 per word for medical-grade output.</p>
        <p className="mt-3">RufayQ's Records vault accepts the original German document and produces an Arabic plain-language summary in 90 seconds, plus a structured English clinical summary suitable for handoff to the receiving Saudi physician. For full medico-legal certification (insurance reimbursement, sponsor reports), the Rush Translation add-on delivers a human-certified Arabic translation in under 6 hours.</p>
      </>,
      bodyAr: <>
        <p>لغة العمل السريري في كل مستشفى جامعي ألماني كبير هي الألمانية. لكن مكتب المرضى الدوليين يعمل بالإنجليزية افتراضياً ويوفر ترجمة عربية كخدمة موثّقة — عادةً ٦٠–٩٠ يورو/ساعة أو مدمجة في سعر الحالة فوق قيمة علاج معينة.</p>
        <p className="mt-3">تفصيلة حاسمة: تقرير الخروج يُكتب بالألمانية. يجب طلب ملخص إنجليزي منظّم وقت تخطيط الخروج (٣–٤ أيام قبله) وليس بعده. طلبات الترجمة بعد الخروج تستغرق ٢–٤ أسابيع وبرسوم ٠.١٨–٠.٢٥ يورو/كلمة لمستوى طبي.</p>
        <p className="mt-3">خزانة ملفات رُفَيِّق تقبل الوثيقة الألمانية الأصلية وتنتج ملخصاً عربياً مبسّطاً خلال ٩٠ ثانية، بالإضافة إلى ملخص سريري إنجليزي منظّم مناسب للتسليم للطبيب السعودي. للتصديق الطبي-القانوني (استرداد التأمين، تقارير الكفيل)، إضافة الترجمة العاجلة تسلّم ترجمة عربية معتمدة بشرياً خلال ٦ ساعات.</p>
      </>,
    },
    {
      id: "logistics-stay",
      h2En: "Logistics during your stay",
      h2Ar: "اللوجستيات خلال إقامتك",
      bodyEn: <>
        <p>Most Gulf families plan for a 14–28 day stay for surgical journeys, longer for oncology and transplant. Accommodation options near the major hospitals (Heidelberg, Munich, Berlin, Frankfurt, Hamburg) range from hospital-affiliated serviced apartments at €80–€140/night through to four-star hotels at €180–€280/night. Bookings made through the hospital's social-services office unlock medical-rate discounts of 15–25%.</p>
        <p className="mt-3">All five major destination cities have direct flights from Riyadh, Jeddah, and Dubai operated by Saudia, Emirates, Lufthansa, and Qatar Airways. Frankfurt and Munich are the most-served. Direct flight time from Riyadh to Frankfurt is 5 hours 45 minutes; to Munich, 5 hours 30 minutes.</p>
        <p className="mt-3">Halal food is widely available at all major university hospitals — most have dedicated halal-certified kitchens or contracts with adjacent halal caterers. Prayer rooms are standard in international wings. Pharmacies near hospitals stock most Gulf-region brand-name medications; for less common items, plan to bring a 30-day supply from home.</p>
      </>,
      bodyAr: <>
        <p>أغلب العائلات الخليجية تخطط لإقامة ١٤–٢٨ يوم للرحلات الجراحية، وأطول للأورام والزراعة. خيارات الإقامة قرب المستشفيات الكبرى (هايدلبرغ، ميونخ، برلين، فرانكفورت، هامبورغ) تتراوح بين شقق فندقية تابعة للمستشفى بـ٨٠–١٤٠ يورو/ليلة، وفنادق أربع نجوم بـ١٨٠–٢٨٠ يورو/ليلة. الحجوزات عبر مكتب الخدمات الاجتماعية بالمستشفى تفتح خصومات ١٥–٢٥٪.</p>
        <p className="mt-3">جميع المدن الخمس لها رحلات مباشرة من الرياض وجدة ودبي عبر السعودية والإمارات ولوفتهانزا والقطرية. فرانكفورت وميونخ الأكثر خدمة. الرحلة المباشرة من الرياض إلى فرانكفورت ٥ ساعات و٤٥ دقيقة، إلى ميونخ ٥ ساعات و٣٠ دقيقة.</p>
        <p className="mt-3">الطعام الحلال متوفر في كل المستشفيات الجامعية الكبرى — معظمها لديه مطابخ معتمدة حلال أو عقود مع مزوّدين خارجيين. مصلّيات معيار في الأجنحة الدولية. الصيدليات المجاورة تخزّن أغلب الأدوية الخليجية الشائعة؛ للأدوية النادرة خطّط لإحضار مخزون ٣٠ يوماً من الوطن.</p>
      </>,
    },
    {
      id: "rufayq-germany",
      h2En: "Using RufayQ for your Germany journey",
      h2Ar: "استخدام رُفَيِّق لرحلتك الألمانية",
      bodyEn: <>
        <p>RufayQ's Smart Journey module auto-builds your itinerary from a scan of your Lufthansa or Saudia ticket. The Records vault stores German-language documents in their original form while producing instant Arabic and English summaries. The AI Companion answers questions about any uploaded medical document in your preferred language. The Care Hub provides post-operative checklists calibrated to standard German clinical pathways. All data syncs to your Saudi physician on return via a single bilingual handoff PDF.</p>
        <p className="mt-3">For cardiothoracic, oncology, and transplant journeys, the Companion tier's included Medical Consultant session is particularly valuable — used most often as a 45-minute pre-flight call to walk through what to expect at admission, what questions to ask the German team, and what documents to specifically request before discharge.</p>
      </>,
      bodyAr: <>
        <p>وحدة الرحلة الذكية في رُفَيِّق تبني جدولك تلقائياً من مسح تذكرة لوفتهانزا أو السعودية. خزانة الملفات تحفظ الوثائق الألمانية بشكلها الأصلي مع توليد ملخصات فورية بالعربية والإنجليزية. الرفيق الذكي يجيب على أي سؤال حول أي وثيقة طبية بلغتك المفضلة. مركز الرعاية يوفر قوائم مهام بعد الجراحة معايرة للمسارات السريرية الألمانية المعيارية. كل البيانات تتزامن مع طبيبك السعودي بعد العودة عبر ملف PDF تسليم ثنائي اللغة.</p>
        <p className="mt-3">لرحلات القلب والصدر والأورام والزراعة، جلسة المستشار الطبي المضمّنة في باقة كومبانيون قيّمة جداً — تُستخدم غالباً كمكالمة ما قبل السفر لمدة ٤٥ دقيقة لمراجعة ما يُتوقع عند الإدخال، والأسئلة للفريق الألماني، والوثائق المحددة المطلوب طلبها قبل الخروج.</p>
      </>,
    },
  ];

  const faqEn = [
    { q: "Do German hospitals require payment upfront?", a: "Yes for self-pay families — typically 80–100% of the case-rate estimate is required as a deposit before admission. With approved insurance Letters of Guarantee, no upfront payment is required at the major university hospitals." },
    { q: "How long do German medical visas take?", a: "Standard processing: 4–6 weeks. Expedited (with hospital urgency letter): 7–10 days. Apply through the German Embassy in Riyadh or VFS Global in Jeddah/Khobar." },
    { q: "Will I need to learn German?", a: "No. Every major German university hospital operates its International Patient Office in English, and Arabic interpretation is available as a documented service." },
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
            conditionName: isAr ? "السياحة العلاجية في ألمانيا" : "Medical Tourism in Germany",
            lastReviewed: "2026-04-15",
            author: AUTHORS.drMorsy,
          }),
          breadcrumbSchema([
            { name: isAr ? "الرئيسية" : "Home", path: isAr ? "/ar" : "/" },
            { name: isAr ? "الوجهات" : "Destinations", path: isAr ? "/ar/destinations" : "/destinations" },
            { name: isAr ? "ألمانيا" : "Germany", path: url },
          ]),
          faqSchema(faqEn),
        ]}
      />
      <ContentPage
        eyebrowEn="Destinations · Germany"
        eyebrowAr="الوجهات · ألمانيا"
        titleEn={titleEn}
        titleAr={titleAr}
        leadEn={descEn}
        leadAr={descAr}
        sections={sections}
      />
    </>
  );
};

export default GermanyMedicalTreatment;
