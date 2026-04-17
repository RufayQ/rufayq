import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight, Check, Plane, Pill, FileText, Sparkles, Shield, Globe,
  Heart, MessageCircle, Star, ChevronDown, ChevronUp, Menu, X
} from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";

const Landing = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const features = [
    { icon: Plane, title: "Smart Journey", titleAr: "رحلة ذكية", desc: "Track flights, hotels, and appointments — all auto-built from a scan of your tickets." },
    { icon: Pill, title: "Medication Tracker", titleAr: "تتبع الأدوية", desc: "Bilingual schedule with reminders, missed-dose tracking, and notes per medication." },
    { icon: FileText, title: "Records Vault", titleAr: "الملفات الطبية", desc: "Secure storage for prescriptions, labs, imaging, and discharge summaries." },
    { icon: MessageCircle, title: "RufayQ AI Companion", titleAr: "رُفَيِّق الذكي", desc: "Ask questions in Arabic or English about any of your medical documents — instantly." },
    { icon: Sparkles, title: "Smart Scan", titleAr: "مسح ذكي", desc: "AI extracts dosages, dates, and key info from prescriptions and reports." },
    { icon: Heart, title: "Care Hub", titleAr: "مركز الرعاية", desc: "Recovery checklists, vitals, exercises, and patient education for post-op care." },
  ];

  const trustPoints = [
    { icon: Shield, label: "End-to-end encrypted" },
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

  return (
    <div className="min-h-screen" style={{ background: "var(--off-white)" }}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-md" style={{ background: "rgba(248,246,242,0.85)", borderBottom: "1px solid var(--gray-light)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2">
            <RufayQLogo size={32} variant="dark" />
            <span className="font-display text-xl">
              <span style={{ color: "var(--teal-deep)" }}>Rufay</span>
              <span className="font-bold" style={{ color: "var(--gold)" }}>Q</span>
            </span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium" style={{ color: "var(--navy)" }}>Features</a>
            <a href="#how" className="text-sm font-medium" style={{ color: "var(--navy)" }}>How it works</a>
            <a href="#pricing" className="text-sm font-medium" style={{ color: "var(--navy)" }}>Pricing</a>
            <a href="#faq" className="text-sm font-medium" style={{ color: "var(--navy)" }}>FAQ</a>
            <button onClick={goToApp} className="px-5 py-2 rounded-full text-sm font-semibold text-white" style={{ background: "var(--teal-deep)" }}>
              Open app
            </button>
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} color="var(--navy)" /> : <Menu size={22} color="var(--navy)" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden px-6 pb-4 space-y-3 border-t" style={{ borderColor: "var(--gray-light)" }}>
            {[["Features", "#features"], ["How it works", "#how"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map(([l, h]) => (
              <a key={h} href={h} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium" style={{ color: "var(--navy)" }}>{l}</a>
            ))}
            <button onClick={goToApp} className="w-full py-3 rounded-full text-sm font-semibold text-white" style={{ background: "var(--teal-deep)" }}>
              Open app
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(160deg, var(--teal-deep) 0%, var(--teal-mid) 60%, var(--navy) 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #C5965A 0%, transparent 40%), radial-gradient(circle at 80% 70%, #00929F 0%, transparent 50%)" }} />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono mb-6" style={{ background: "rgba(197,150,90,0.15)", color: "var(--gold)", border: "1px solid rgba(197,150,90,0.3)" }}>
              <Sparkles size={12} /> AI MEDICAL COMPANION · رُفَيِّق
            </div>
            <h1 className="font-display text-4xl md:text-6xl leading-tight mb-6 text-white">
              Your medical journey,<br />
              <span style={{ color: "var(--gold)" }}>understood</span>.
            </h1>
            <p className="text-base md:text-lg mb-2" style={{ color: "rgba(255,255,255,0.85)" }}>
              RufayQ is the bilingual AI companion built for Saudi patients traveling abroad for treatment. Track tickets, medications, and appointments — and ask anything about your records in Arabic or English.
            </p>
            <p className="font-arabic text-sm mb-8" dir="rtl" style={{ color: "rgba(255,255,255,0.65)" }}>
              رفيقك الذكي ثنائي اللغة لرحلتك العلاجية في الخارج.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={goToApp} className="px-6 py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 btn-press" style={{ background: "var(--gold)", color: "var(--navy)" }}>
                Start free <ArrowRight size={16} />
              </button>
              <a href="#features" className="px-6 py-3.5 rounded-full font-semibold text-sm text-center" style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>
                See how it works
              </a>
            </div>

            <div className="flex flex-wrap gap-5 mt-10">
              {trustPoints.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <t.icon size={14} color="var(--gold)" />
                  <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.75)" }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Phone mockup preview */}
          <div className="relative flex justify-center">
            <div className="relative w-[280px] h-[560px] rounded-[44px] overflow-hidden" style={{ background: "#000", boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 8px rgba(197,150,90,0.3)" }}>
              <div className="absolute inset-2 rounded-[36px] p-5 flex flex-col" style={{ background: "linear-gradient(180deg, var(--teal-deep), var(--off-white) 30%)" }}>
                <div className="flex items-center justify-between mb-6">
                  <RufayQLogo size={24} variant="light" />
                  <span className="text-[10px] text-white opacity-60 font-mono">9:41</span>
                </div>
                <p className="font-display text-xl text-white mb-1">Good morning,</p>
                <p className="text-sm text-white opacity-80 mb-6">Mohammed</p>

                <div className="space-y-2.5">
                  {[
                    { ic: "✈️", t: "Flight to Cleveland", s: "in 2 days · 8:30 AM" },
                    { ic: "💊", t: "Take Metformin", s: "Due now · 8:00 AM" },
                    { ic: "🏥", t: "Dr. Smith — Cardiology", s: "Tomorrow · 11:00 AM" },
                    { ic: "📄", t: "Lab results ready", s: "Tap to view" },
                  ].map((card, i) => (
                    <div key={i} className="rounded-xl p-3 flex items-center gap-3" style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                      <span className="text-xl">{card.ic}</span>
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold" style={{ color: "var(--navy)" }}>{card.t}</p>
                        <p className="text-[9px]" style={{ color: "var(--gray)" }}>{card.s}</p>
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
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[11px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>EVERYTHING IN ONE APP</p>
            <h2 className="font-display text-3xl md:text-5xl mb-3" style={{ color: "var(--navy)" }}>One companion for the whole journey</h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "var(--gray)" }}>
              From booking your flight to recovering at home — RufayQ keeps every detail organized and explained.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="rounded-2xl p-6 transition-all hover:-translate-y-1" style={{ background: "white", border: "1px solid var(--gray-light)", boxShadow: "0 4px 20px rgba(13,27,42,0.04)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--teal-light)" }}>
                  <f.icon size={22} color="var(--teal-deep)" />
                </div>
                <h3 className="font-display text-xl mb-1" style={{ color: "var(--navy)" }}>{f.title}</h3>
                <p className="font-arabic text-xs mb-2" dir="rtl" style={{ color: "var(--gold)" }}>{f.titleAr}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--gray)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20 px-6" style={{ background: "var(--white)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[11px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>HOW IT WORKS</p>
            <h2 className="font-display text-3xl md:text-5xl" style={{ color: "var(--navy)" }}>Three steps to clarity</h2>
          </div>

          <div className="space-y-6">
            {[
              { n: "01", t: "Scan or add your documents", d: "Snap a photo of your flight ticket, prescription, lab result, or discharge summary. RufayQ extracts the key info automatically." },
              { n: "02", t: "RufayQ organizes everything", d: "Your trips, appointments, medications, and records appear in one timeline — translated to Arabic when needed." },
              { n: "03", t: "Ask anything, anytime", d: "Tap any record and ask RufayQ. Get bilingual explanations, dosage clarifications, and red-flag alerts in seconds." },
            ].map((s) => (
              <div key={s.n} className="flex gap-6 items-start p-6 rounded-2xl" style={{ background: "var(--off-white)" }}>
                <div className="font-display text-4xl font-bold shrink-0" style={{ color: "var(--gold)" }}>{s.n}</div>
                <div>
                  <h3 className="font-display text-xl mb-2" style={{ color: "var(--navy)" }}>{s.t}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--gray)" }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[11px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>TRUSTED BY PATIENTS</p>
            <h2 className="font-display text-3xl md:text-5xl" style={{ color: "var(--navy)" }}>Real stories, real journeys</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--gray-light)" }}>
                <div className="flex gap-1 mb-3">
                  {[...Array(t.rating)].map((_, j) => <Star key={j} size={14} fill="var(--gold)" color="var(--gold)" />)}
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--navy)" }}>"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{t.name}</p>
                  <p className="text-xs" style={{ color: "var(--gray)" }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section id="pricing" className="py-20 px-6" style={{ background: "var(--navy)" }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-mono text-[11px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>SIMPLE PRICING</p>
          <h2 className="font-display text-3xl md:text-5xl mb-4 text-white">Start free. Upgrade anytime.</h2>
          <p className="text-base mb-12" style={{ color: "rgba(255,255,255,0.7)" }}>
            Free forever for one trip. Upgrade for unlimited journeys, AI, and pay-as-you-go add-ons.
          </p>

          <div className="grid md:grid-cols-3 gap-5 text-left">
            {[
              { name: "Basic", price: "Free", per: "", features: ["1 active trip", "Basic medication tracking", "10 AI msgs/day", "Community support"], cta: "Get started" },
              { name: "Professional", price: "$9.99", per: "/mo", features: ["Unlimited trips", "Unlimited AI", "Smart reminders", "Priority support"], cta: "Start free trial", popular: true },
              { name: "Enterprise", price: "Custom", per: "", features: ["Multi-patient", "Hospital APIs", "HIPAA compliance", "Dedicated manager"], cta: "Contact sales" },
            ].map((p) => (
              <div key={p.name} className="rounded-2xl p-6 relative" style={{ background: p.popular ? "var(--teal-deep)" : "rgba(255,255,255,0.05)", border: p.popular ? "2px solid var(--gold)" : "1px solid rgba(255,255,255,0.1)" }}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: "var(--gold)", color: "var(--navy)" }}>POPULAR</div>
                )}
                <p className="font-display text-xl mb-1 text-white">{p.name}</p>
                <p className="font-display text-3xl font-bold mb-1" style={{ color: p.popular ? "var(--gold)" : "white" }}>
                  {p.price}<span className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.6)" }}>{p.per}</span>
                </p>
                <div className="space-y-2 my-5">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check size={14} color="var(--gold)" />
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={goToApp} className="w-full py-2.5 rounded-full text-sm font-semibold" style={{ background: p.popular ? "var(--gold)" : "white", color: "var(--navy)" }}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            See full feature comparison and pay-as-you-go add-ons inside the app.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-mono text-[11px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>FAQ</p>
            <h2 className="font-display text-3xl md:text-5xl" style={{ color: "var(--navy)" }}>Common questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left rounded-2xl p-5 transition-all"
                style={{ background: "white", border: openFaq === i ? "1px solid var(--teal-deep)" : "1px solid var(--gray-light)" }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-base" style={{ color: "var(--navy)" }}>{f.q}</p>
                  {openFaq === i ? <ChevronUp size={18} color="var(--teal-deep)" /> : <ChevronDown size={18} color="var(--gray)" />}
                </div>
                {openFaq === i && (
                  <p className="text-sm mt-3 pt-3 leading-relaxed" style={{ color: "var(--gray)", borderTop: "1px solid var(--gray-light)" }}>
                    {f.a}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-6" style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl mb-4 text-white">
            Ready to begin your journey<br /><span style={{ color: "var(--gold)" }}>with RufayQ?</span>
          </h2>
          <p className="text-base mb-8" style={{ color: "rgba(255,255,255,0.85)" }}>
            Free to start. No credit card needed.
          </p>
          <button onClick={goToApp} className="px-8 py-4 rounded-full font-semibold text-sm inline-flex items-center gap-2 btn-press" style={{ background: "var(--gold)", color: "var(--navy)" }}>
            Open RufayQ <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6" style={{ background: "var(--navy)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <RufayQLogo size={28} variant="light" />
                <span className="font-display text-xl">
                  <span className="text-white">Rufay</span>
                  <span className="font-bold" style={{ color: "var(--gold)" }}>Q</span>
                </span>
              </div>
              <p className="text-xs max-w-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                Bilingual AI medical companion for Saudi patients traveling abroad.
              </p>
            </div>
            <div className="flex gap-12 text-xs">
              <div>
                <p className="font-semibold mb-3 text-white">Product</p>
                <div className="space-y-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <a href="#features" className="block">Features</a>
                  <a href="#pricing" className="block">Pricing</a>
                  <button onClick={goToApp} className="block">Open app</button>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-3 text-white">Company</p>
                <div className="space-y-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <a href="#faq" className="block">FAQ</a>
                  <span className="block opacity-60">Privacy</span>
                  <span className="block opacity-60">Terms</span>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t flex flex-col md:flex-row justify-between gap-3 text-[11px]" style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
            <p>© 2026 RufayQ · رُفَيِّق. All rights reserved.</p>
            <p>RufayQ is not a substitute for professional medical advice.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
