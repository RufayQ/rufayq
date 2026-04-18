import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight, Check, Plane, Pill, FileText, Sparkles, Shield, Globe,
  Heart, MessageCircle, Star, ChevronDown, Menu, X, Lock, Zap,
} from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";

const Landing = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const features = [
    { icon: Plane, title: "Smart Journey", titleAr: "رحلة ذكية", desc: "Track flights, hotels, and appointments — auto-built from a scan of your tickets." },
    { icon: Pill, title: "Medication Tracker", titleAr: "تتبع الأدوية", desc: "Bilingual schedule with reminders, missed-dose tracking, and notes per medication." },
    { icon: FileText, title: "Records Vault", titleAr: "الملفات الطبية", desc: "Encrypted storage for prescriptions, labs, imaging, and discharge summaries." },
    { icon: MessageCircle, title: "RufayQ AI Companion", titleAr: "رُفَيِّق الذكي", desc: "Ask in Arabic or English about any medical document — instant bilingual answers." },
    { icon: Sparkles, title: "Smart Scan", titleAr: "مسح ذكي", desc: "AI extracts dosages, dates, and key info from prescriptions and reports." },
    { icon: Heart, title: "Care Hub", titleAr: "مركز الرعاية", desc: "Recovery checklists, vitals, exercises, and patient education for post-op care." },
  ];

  const trustPoints = [
    { icon: Lock, label: "End-to-end encrypted" },
    { icon: Globe, label: "Bilingual EN / AR" },
    { icon: Heart, label: "Built for Saudi patients" },
  ];

  const testimonials = [
    { name: "Fatimah A.", role: "Cardiac patient — Cleveland", text: "RufayQ kept my prescriptions, scans, and follow-ups in one place during my treatment in the US. The Arabic translation of every report saved me hours.", rating: 5 },
    { name: "Ahmed K.", role: "Companion — Munich trip", text: "I was caring for my father abroad. Smart Scan turned every German document into something we could understand. Lifesaver.", rating: 5 },
    { name: "Dr. Layla M.", role: "Family physician — Riyadh", text: "I recommend RufayQ to patients traveling for treatment. The medication tracker and AI explainer reduce confusion dramatically.", rating: 5 },
  ];

  const faqs = [
    { q: "Is RufayQ a replacement for my doctor?", a: "No. RufayQ is an AI companion that helps you understand and organize your medical journey. It does not provide medical advice. Always consult your treating physician for medical decisions." },
    { q: "How secure is my data?", a: "All medical documents are encrypted end-to-end. Your data is stored in a secure cloud and is never shared with third parties without your consent." },
    { q: "Do I need an internet connection?", a: "Yes for AI features and syncing. Your stored records and medication schedule are available offline once cached." },
    { q: "Can I share my records with my doctor or family?", a: "Yes. You can export bilingual PDF summaries or share specific documents via secure links." },
    { q: "What languages are supported?", a: "Arabic and English are fully supported across the entire app, including RufayQ AI responses, scans, and exports." },
  ];

  const goToApp = () => navigate("/app");

  // ELITE DARK THEME — applied universally
  const BG_DARK = "#06101A";       // near-black navy
  const BG_DARK_2 = "#0B1A28";     // slightly lighter
  const BORDER = "rgba(197,150,90,0.12)";
  const TEXT = "#E8ECF0";
  const TEXT_MUTED = "rgba(232,236,240,0.55)";
  const GOLD = "#C5965A";
  const GOLD_BRIGHT = "#E6B575";
  const TEAL = "#0FB5C9";

  return (
    <div className="min-h-screen" style={{ background: BG_DARK, color: TEXT, fontFamily: "'DM Sans', system-ui" }}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(6,16,26,0.75)", borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5">
            <RufayQLogo size={32} variant="light" />
            <span className="font-display text-xl tracking-tight">
              <span style={{ color: TEXT }}>Rufay</span>
              <span className="font-bold" style={{ color: GOLD }}>Q</span>
            </span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {[["Features", "#features"], ["How", "#how"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map(([l, h]) => (
              <a key={h} href={h} className="text-[13px] font-medium transition-colors hover:opacity-100" style={{ color: TEXT_MUTED }}>
                {l}
              </a>
            ))}
            <button onClick={goToApp} className="px-5 py-2 rounded-full text-[13px] font-semibold transition-all hover:scale-105" style={{ background: GOLD, color: BG_DARK }}>
              Open app →
            </button>
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} color={TEXT} /> : <Menu size={22} color={TEXT} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden px-6 pb-4 space-y-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            {[["Features", "#features"], ["How it works", "#how"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map(([l, h]) => (
              <a key={h} href={h} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium" style={{ color: TEXT_MUTED }}>{l}</a>
            ))}
            <button onClick={goToApp} className="w-full py-3 rounded-full text-sm font-semibold" style={{ background: GOLD, color: BG_DARK }}>
              Open app →
            </button>
          </div>
        )}
      </nav>

      {/* HERO — elite dark with subtle aurora */}
      <section className="relative overflow-hidden" style={{ background: BG_DARK }}>
        {/* Aurora glows */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-[120px]" style={{ background: `radial-gradient(circle, ${TEAL} 0%, transparent 70%)` }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-25 blur-[100px]" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono mb-7" style={{ background: "rgba(197,150,90,0.08)", color: GOLD, border: `1px solid ${BORDER}` }}>
              <Sparkles size={11} /> AI MEDICAL COMPANION · رُفَيِّق
            </div>
            <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-7 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
              Your medical journey,<br />
              <span style={{ background: `linear-gradient(120deg, ${GOLD} 0%, ${GOLD_BRIGHT} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>understood</span>.
            </h1>
            <p className="text-base md:text-lg mb-2 leading-relaxed max-w-md" style={{ color: TEXT_MUTED }}>
              The bilingual AI companion built for Saudi patients traveling abroad for treatment. Track tickets, medications & appointments — and ask anything about your records.
            </p>
            <p className="font-arabic text-sm mb-9" dir="rtl" style={{ color: "rgba(232,236,240,0.4)" }}>
              رفيقك الذكي ثنائي اللغة لرحلتك العلاجية في الخارج.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={goToApp} className="px-7 py-4 rounded-full font-semibold text-sm flex items-center justify-center gap-2 btn-press transition-all hover:scale-[1.02]" style={{ background: GOLD, color: BG_DARK, boxShadow: `0 10px 40px ${GOLD}40` }}>
                Start free <ArrowRight size={15} />
              </button>
              <a href="#features" className="px-7 py-4 rounded-full font-semibold text-sm text-center transition-all hover:bg-white/10" style={{ background: "rgba(255,255,255,0.05)", color: TEXT, border: `1px solid ${BORDER}` }}>
                See how it works
              </a>
            </div>

            <div className="flex flex-wrap gap-5 mt-10">
              {trustPoints.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <t.icon size={13} color={GOLD} />
                  <span className="text-[11px] font-mono tracking-wide" style={{ color: TEXT_MUTED }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Phone mockup — premium frame */}
          <div className="relative flex justify-center">
            <div
              className="relative w-[290px] h-[580px] rounded-[48px] overflow-hidden"
              style={{
                background: "#000",
                boxShadow: `0 50px 100px rgba(0,0,0,0.6), 0 0 0 9px ${BG_DARK_2}, 0 0 0 11px ${GOLD}40, 0 0 60px ${TEAL}30`,
              }}
            >
              <div className="absolute inset-2.5 rounded-[40px] p-5 flex flex-col" style={{ background: `linear-gradient(180deg, ${BG_DARK} 0%, #0F2530 30%, ${BG_DARK_2} 100%)` }}>
                <div className="flex items-center justify-between mb-6">
                  <RufayQLogo size={26} variant="light" />
                  <span className="text-[10px] font-mono" style={{ color: TEXT_MUTED }}>9:41</span>
                </div>
                <p className="font-display text-2xl mb-1" style={{ color: TEXT, fontWeight: 300 }}>Good morning,</p>
                <p className="text-sm mb-7" style={{ color: TEXT_MUTED }}>Mohammed</p>

                <div className="space-y-2.5">
                  {[
                    { ic: "✈️", t: "Flight to Cleveland", s: "in 2 days · 8:30 AM", accent: TEAL },
                    { ic: "💊", t: "Take Metformin", s: "Due now · 8:00 AM", accent: GOLD },
                    { ic: "🏥", t: "Dr. Smith — Cardiology", s: "Tomorrow · 11:00 AM", accent: TEAL },
                    { ic: "📄", t: "Lab results ready", s: "Tap to view", accent: GOLD },
                  ].map((card, i) => (
                    <div key={i} className="rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base" style={{ background: `${card.accent}20`, border: `1px solid ${card.accent}40` }}>{card.ic}</div>
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold" style={{ color: TEXT }}>{card.t}</p>
                        <p className="text-[9px]" style={{ color: TEXT_MUTED }}>{card.s}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6 relative" style={{ background: BG_DARK }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>EVERYTHING IN ONE APP</p>
            <h2 className="font-display text-4xl md:text-5xl mb-4 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
              One companion for the <em style={{ color: GOLD }}>whole</em> journey
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: TEXT_MUTED }}>
              From booking your flight to recovering at home — RufayQ keeps every detail organized and explained.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="group rounded-2xl p-7 transition-all hover:-translate-y-1 cursor-default" style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all group-hover:scale-110" style={{ background: `${TEAL}15`, border: `1px solid ${TEAL}30` }}>
                  <f.icon size={20} color={TEAL} />
                </div>
                <h3 className="font-display text-xl mb-1" style={{ color: TEXT }}>{f.title}</h3>
                <p className="font-arabic text-xs mb-3" dir="rtl" style={{ color: GOLD }}>{f.titleAr}</p>
                <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 px-6 relative" style={{ background: BG_DARK_2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>HOW IT WORKS</p>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>Three steps to clarity</h2>
          </div>

          <div className="space-y-5">
            {[
              { n: "01", t: "Scan or add your documents", d: "Snap a photo of your flight ticket, prescription, lab result, or discharge summary. RufayQ extracts the key info automatically." },
              { n: "02", t: "RufayQ organizes everything", d: "Your trips, appointments, medications, and records appear in one timeline — translated to Arabic when needed." },
              { n: "03", t: "Ask anything, anytime", d: "Tap any record and ask RufayQ. Get bilingual explanations, dosage clarifications, and red-flag alerts in seconds." },
            ].map((s) => (
              <div key={s.n} className="flex gap-7 items-start p-7 rounded-2xl transition-all hover:bg-white/[0.02]" style={{ background: BG_DARK, border: `1px solid ${BORDER}` }}>
                <div className="font-display text-5xl shrink-0 leading-none tracking-tight" style={{ color: GOLD, fontWeight: 300 }}>{s.n}</div>
                <div>
                  <h3 className="font-display text-2xl mb-2 tracking-tight" style={{ color: TEXT, fontWeight: 400 }}>{s.t}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-6" style={{ background: BG_DARK }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>TRUSTED BY PATIENTS</p>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>Real stories, real journeys</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl p-7" style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}>
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => <Star key={j} size={13} fill={GOLD} color={GOLD} />)}
                </div>
                <p className="text-sm leading-relaxed mb-5 italic" style={{ color: TEXT }}>"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{t.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section id="pricing" className="py-24 px-6 relative overflow-hidden" style={{ background: BG_DARK_2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 50% 50%, ${GOLD}15 0%, transparent 60%)` }} />
        <div className="relative max-w-5xl mx-auto text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>SIMPLE PRICING</p>
          <h2 className="font-display text-4xl md:text-5xl mb-5 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
            Start free. <em style={{ color: GOLD }}>Upgrade</em> anytime.
          </h2>
          <p className="text-base mb-14" style={{ color: TEXT_MUTED }}>
            Free forever for one trip. Upgrade for unlimited journeys, AI, and pay-as-you-go add-ons.
          </p>

          <div className="grid md:grid-cols-3 gap-4 text-left">
            {[
              { name: "Basic", price: "Free", per: "", features: ["1 active trip", "Basic medication tracking", "10 AI msgs/day", "Community support"], cta: "Get started" },
              { name: "Professional", price: "$9.99", per: "/mo", features: ["Unlimited trips", "Unlimited AI", "Smart reminders", "Priority support"], cta: "Start free trial", popular: true },
              { name: "Enterprise", price: "Custom", per: "", features: ["Multi-patient", "Hospital APIs", "HIPAA compliance", "Dedicated manager"], cta: "Contact sales" },
            ].map((p) => (
              <div
                key={p.name}
                className="rounded-2xl p-7 relative transition-all hover:-translate-y-1"
                style={{
                  background: p.popular ? `linear-gradient(160deg, ${BG_DARK} 0%, ${BG_DARK_2} 100%)` : BG_DARK,
                  border: p.popular ? `1px solid ${GOLD}` : `1px solid ${BORDER}`,
                  boxShadow: p.popular ? `0 20px 60px ${GOLD}20` : "none",
                }}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider" style={{ background: GOLD, color: BG_DARK }}>POPULAR</div>
                )}
                <p className="font-display text-xl mb-2" style={{ color: TEXT }}>{p.name}</p>
                <p className="font-display text-4xl mb-2" style={{ color: p.popular ? GOLD : TEXT, fontWeight: 300 }}>
                  {p.price}<span className="text-sm font-normal" style={{ color: TEXT_MUTED }}>{p.per}</span>
                </p>
                <div className="space-y-2.5 my-5">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Check size={13} color={GOLD} />
                      <span className="text-sm" style={{ color: TEXT_MUTED }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={goToApp}
                  className="w-full py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.02]"
                  style={{ background: p.popular ? GOLD : "rgba(255,255,255,0.06)", color: p.popular ? BG_DARK : TEXT, border: p.popular ? "none" : `1px solid ${BORDER}` }}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>

          <p className="mt-10 text-xs" style={{ color: TEXT_MUTED }}>
            See full feature comparison and pay-as-you-go add-ons inside the app.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6" style={{ background: BG_DARK }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>FAQ</p>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>Common questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left rounded-xl p-5 transition-all"
                style={{ background: BG_DARK_2, border: `1px solid ${openFaq === i ? GOLD : BORDER}` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold" style={{ color: TEXT }}>{f.q}</span>
                  <ChevronDown size={16} color={GOLD} className="shrink-0 transition-transform" style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)" }} />
                </div>
                {openFaq === i && (
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{f.a}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-6 text-center relative overflow-hidden" style={{ background: BG_DARK_2 }}>
        <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 50% 0%, ${TEAL}20 0%, transparent 60%)` }} />
        <div className="relative max-w-3xl mx-auto">
          <Sparkles size={28} color={GOLD} className="mx-auto mb-5" />
          <h2 className="font-display text-4xl md:text-5xl mb-5 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
            Travel for treatment with <em style={{ color: GOLD }}>confidence</em>.
          </h2>
          <p className="text-base mb-9" style={{ color: TEXT_MUTED }}>
            Join thousands of Saudi patients using RufayQ to make their medical journey simpler, safer, and clearer.
          </p>
          <button onClick={goToApp} className="px-9 py-4 rounded-full font-semibold text-sm inline-flex items-center gap-2 btn-press transition-all hover:scale-105" style={{ background: GOLD, color: BG_DARK, boxShadow: `0 15px 50px ${GOLD}40` }}>
            Open RufayQ <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 px-6" style={{ background: BG_DARK, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>CONTACT US · تواصل معنا</p>
          <h2 className="font-display text-4xl md:text-5xl mb-10 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
            We're here to <em style={{ color: GOLD }}>help</em>.
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { emoji: "📧", label: "Email", value: "support@rufayq.com", href: "mailto:support@rufayq.com" },
              { emoji: "💬", label: "WhatsApp", value: "+966 50 123 4567", href: "https://wa.me/966501234567" },
              { emoji: "📞", label: "Call 24/7", value: "+966 800 123 456", href: "tel:+966800123456" },
            ].map((c) => (
              <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                className="rounded-2xl p-6 transition-all hover:-translate-y-1 block"
                style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}>
                <div className="text-3xl mb-3">{c.emoji}</div>
                <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: TEXT_MUTED }}>{c.label.toUpperCase()}</p>
                <p className="text-sm font-semibold" style={{ color: GOLD }}>{c.value}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6" style={{ background: BG_DARK, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <RufayQLogo size={26} variant="light" />
            <span className="font-display text-lg">
              <span style={{ color: TEXT }}>Rufay</span><span className="font-bold" style={{ color: GOLD }}>Q</span>
            </span>
          </div>
          <p className="text-xs" style={{ color: TEXT_MUTED }}>© 2026 RufayQ · All rights reserved · جميع الحقوق محفوظة</p>
          <div className="flex gap-5">
            <a href="#" className="text-xs transition-colors hover:text-white" style={{ color: TEXT_MUTED }}>Privacy</a>
            <a href="#" className="text-xs transition-colors hover:text-white" style={{ color: TEXT_MUTED }}>Terms</a>
            <a href="#contact" className="text-xs transition-colors hover:text-white" style={{ color: TEXT_MUTED }}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
