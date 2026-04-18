import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Clock, CheckCircle, AlertCircle, MessageCircle, ChevronDown, Star } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";
import ReviewForm from "@/components/ReviewForm";

type TicketRow = {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: "billing" | "technical" | "medical" | "general";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
};

type ViewMode = "list" | "create" | "detail" | "feedback";

const categoryOptions = [
  { value: "billing", emoji: "💳", en: "Billing", ar: "الفواتير" },
  { value: "technical", emoji: "🔧", en: "Technical", ar: "تقني" },
  { value: "medical", emoji: "🩺", en: "Medical", ar: "طبي" },
  { value: "general", emoji: "📩", en: "General", ar: "عام" },
];

const priorityOptions = [
  { value: "low", en: "Low", ar: "منخفض", color: "var(--success)" },
  { value: "medium", en: "Medium", ar: "متوسط", color: "var(--warning)" },
  { value: "high", en: "High", ar: "عالي", color: "#E07020" },
  { value: "urgent", en: "Urgent", ar: "عاجل", color: "var(--error)" },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  open: { label: "Open", color: "var(--gold)", bg: "rgba(197,150,90,0.1)", icon: Clock },
  in_progress: { label: "In Progress", color: "var(--teal-deep)", bg: "var(--teal-light)", icon: AlertCircle },
  resolved: { label: "Resolved", color: "var(--success)", bg: "rgba(61,170,110,0.1)", icon: CheckCircle },
  closed: { label: "Closed", color: "var(--gray)", bg: "var(--gray-light)", icon: CheckCircle },
};

const SupportScreen = ({ onBack }: { onBack: () => void }) => {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [priority, setPriority] = useState<string>("medium");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load tickets");
    } else {
      setTickets((data || []) as TicketRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields · يرجى ملء جميع الحقول");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      title: title.trim(),
      description: description.trim(),
      category: category as any,
      priority: priority as any,
    });
    if (error) {
      toast.error("Failed to create ticket");
    } else {
      toast.success("Ticket created · تم إنشاء التذكرة", { duration: 3000 });
      setTitle("");
      setDescription("");
      setCategory("general");
      setPriority("medium");
      setViewMode("list");
      fetchTickets();
    }
    setSubmitting(false);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div className="relative px-5 pt-3 pb-4 shrink-0" style={{ background: "var(--navy)" }}>
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.12)" }} />
        <div className="flex items-center gap-3">
          <button onClick={viewMode === "list" ? onBack : () => { setViewMode("list"); setSelectedTicket(null); }} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "rgba(255,255,255,0.1)" }}>
            <ArrowLeft size={16} color="#fff" />
          </button>
          <div className="flex-1">
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>CUSTOMER SUPPORT</p>
            <p className="font-display text-xl text-white" style={{ fontWeight: 300 }}>
              {viewMode === "create" ? "New Ticket" : viewMode === "detail" ? "Ticket Details" : viewMode === "feedback" ? "Share Feedback" : "Help Center"}
            </p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>
              {viewMode === "create" ? "تذكرة جديدة" : viewMode === "detail" ? "تفاصيل التذكرة" : viewMode === "feedback" ? "شارك رأيك" : "مركز المساعدة"}
            </p>
          </div>
          {viewMode === "list" && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setViewMode("feedback")} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium btn-press" style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>
                <Star size={11} /> Review
              </button>
              <button onClick={() => setViewMode("create")} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium btn-press" style={{ background: "var(--gold)", color: "#fff" }}>
                <Plus size={12} /> New
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 pt-3" style={{ background: "var(--off-white)", WebkitOverflowScrolling: "touch" }}>
        {/* LIST VIEW */}
        {viewMode === "list" && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Open", count: tickets.filter(t => t.status === "open").length, color: "var(--gold)" },
                { label: "In Progress", count: tickets.filter(t => t.status === "in_progress").length, color: "var(--teal-deep)" },
                { label: "Resolved", count: tickets.filter(t => t.status === "resolved" || t.status === "closed").length, color: "var(--success)" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
                  <p className="font-display text-2xl" style={{ color: s.color }}>{s.count}</p>
                  <p className="text-[9px] font-mono" style={{ color: "var(--gray)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* FAQ Section */}
            <div className="rounded-xl p-4" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>QUICK HELP · مساعدة سريعة</p>
              {[
                { q: "How do I add medications?", a: "Go to Medications from Home or Records", qAr: "كيف أضيف الأدوية؟" },
                { q: "How to scan documents?", a: "Use the Scanner from Chat or Records", qAr: "كيف أمسح المستندات؟" },
                { q: "How to contact my doctor?", a: "Use the Chat or Appointments section", qAr: "كيف أتواصل مع طبيبي؟" },
              ].map((faq, i) => (
                <div key={i} className="py-2" style={{ borderTop: i > 0 ? "1px solid var(--gray-light)" : "none" }}>
                  <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>{faq.q}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--gray)" }}>{faq.a}</p>
                </div>
              ))}
            </div>

            {/* Tickets */}
            <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gray)" }}>YOUR TICKETS — {tickets.length}</p>

            {loading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 rounded-full mx-auto mb-2" style={{ border: "2px solid var(--teal-deep)", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                <p className="text-[12px]" style={{ color: "var(--gray)" }}>Loading...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 rounded-xl" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
                <span className="text-3xl">🎫</span>
                <p className="text-[14px] font-semibold mt-2" style={{ color: "var(--navy)" }}>No tickets yet</p>
                <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>لا توجد تذاكر بعد</p>
                <button onClick={() => setViewMode("create")} className="mt-3 px-4 py-2 rounded-full text-[12px] font-medium btn-press" style={{ background: "var(--teal-deep)", color: "#fff" }}>
                  Create your first ticket
                </button>
              </div>
            ) : (
              [...tickets].sort((a, b) => {
                const order: Record<string, number> = { in_progress: 0, open: 1, resolved: 2, closed: 3 };
                return (order[a.status] ?? 9) - (order[b.status] ?? 9);
              }).map(ticket => {
                const sc = statusConfig[ticket.status];
                const Icon = sc.icon;
                return (
                  <button key={ticket.id} onClick={() => { setSelectedTicket(ticket); setViewMode("detail"); }}
                    className="w-full rounded-xl p-4 text-left card-press" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: sc.bg }}>
                        <Icon size={16} style={{ color: sc.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>{ticket.title}</p>
                          <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0 ml-2" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                        </div>
                        <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--gray)" }}>{ticket.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="font-mono text-[9px]" style={{ color: "var(--teal-deep)" }}>{ticket.ticket_number}</span>
                          <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{timeAgo(ticket.created_at)}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: priorityOptions.find(p => p.value === ticket.priority)?.color || "var(--gray)", color: "#fff" }}>
                            {ticket.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}

            {/* Contact Channels */}
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <div className="px-4 pt-3 pb-2">
                <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>CONTACT US · تواصل معنا</p>
                <p className="text-[10px]" style={{ color: "var(--gray)" }}>Reach our team directly via your preferred channel</p>
              </div>
              {[
                { emoji: "📧", label: "Email Support", labelAr: "البريد الإلكتروني", value: "support@rufayq.com", sub: "Reply within 24 hours", href: "mailto:support@rufayq.com?subject=RufayQ%20Support%20Request", color: "var(--teal-deep)" },
                { emoji: "💬", label: "WhatsApp · Fast Support", labelAr: "واتساب", value: "+966 56 959 0418", sub: "Live · 8AM–10PM AST", href: "https://wa.me/966569590418?text=Hello%20RufayQ%20support%2C%20I%20need%20help%20with%3A", color: "var(--success)" },
                { emoji: "📞", label: "Mobile (Direct)", labelAr: "اتصل بنا", value: "+966 56 959 0418", sub: "For urgent cases", href: "tel:+966569590418", color: "var(--gold)" },
                { emoji: "🌐", label: "Visit website", labelAr: "زيارة الموقع", value: "rufayq.com", sub: "FAQs · Privacy · Terms", href: "https://rufayq.com", color: "var(--teal-mid)" },
              ].map((c, i, arr) => (
                <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 btn-press"
                  style={{ borderTop: i > 0 ? "1px solid var(--gray-light)" : "none" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: "var(--off-white)" }}>
                    {c.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>{c.label}</p>
                    <p className="text-[10px] truncate" style={{ color: c.color }}>{c.value}</p>
                    {(c as any).sub && <p className="text-[9px] truncate" style={{ color: "var(--gray)" }}>{(c as any).sub}</p>}
                  </div>
                  <span className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{c.labelAr}</span>
                </a>
              ))}
            </div>

            {/* Feedback CTA */}
            <button onClick={() => setViewMode("feedback")}
              className="w-full rounded-xl p-4 flex items-center gap-3 btn-press"
              style={{ background: "var(--white)", border: "1px solid var(--gold)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(197,150,90,0.12)" }}>
                <Star size={18} fill="var(--gold)" color="var(--gold)" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>Share your feedback</p>
                <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>شاركنا رأيك واقتراحاتك</p>
              </div>
              <span className="text-[10px] font-mono" style={{ color: "var(--gold)" }}>RATE →</span>
            </button>

            {/* Urgent banner */}
            <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, var(--navy), var(--teal-deep))" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <RufayQLogo size={20} variant="light" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-white">Need urgent medical help?</p>
                  <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>تحتاج مساعدة طبية عاجلة؟</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--gold)" }}>Call your local emergency number — RufayQ is not a medical service.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* CREATE VIEW */}
        {viewMode === "create" && (
          <>
            <div className="rounded-xl p-4 space-y-4" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              {/* Category */}
              <div>
                <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>CATEGORY · التصنيف</p>
                <div className="grid grid-cols-4 gap-2">
                  {categoryOptions.map(c => (
                    <button key={c.value} onClick={() => setCategory(c.value)}
                      className="rounded-xl py-3 flex flex-col items-center gap-1 card-press"
                      style={{ background: category === c.value ? "var(--teal-light)" : "var(--off-white)", border: category === c.value ? "2px solid var(--teal-deep)" : "1px solid var(--gray-light)" }}>
                      <span className="text-xl">{c.emoji}</span>
                      <span className="text-[9px] font-bold" style={{ color: "var(--navy)" }}>{c.en}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>PRIORITY · الأولوية</p>
                <div className="flex gap-2">
                  {priorityOptions.map(p => (
                    <button key={p.value} onClick={() => setPriority(p.value)}
                      className="flex-1 rounded-lg py-2 text-center text-[11px] font-bold btn-press"
                      style={{ background: priority === p.value ? p.color : "var(--off-white)", color: priority === p.value ? "#fff" : "var(--gray)", border: priority === p.value ? "none" : "1px solid var(--gray-light)" }}>
                      {p.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>SUBJECT · الموضوع</p>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief description of your issue..."
                  className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
              </div>

              {/* Description */}
              <div>
                <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>DETAILS · التفاصيل</p>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Please describe your issue in detail..."
                  rows={4} className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none resize-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
              </div>
            </div>

            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 btn-press"
              style={{ background: submitting ? "var(--gray)" : "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Submitting..." : "Submit Ticket · إرسال التذكرة"}
            </button>
          </>
        )}

        {/* DETAIL VIEW */}
        {viewMode === "detail" && selectedTicket && (() => {
          const sc = statusConfig[selectedTicket.status];
          const catInfo = categoryOptions.find(c => c.value === selectedTicket.category);
          const priInfo = priorityOptions.find(p => p.value === selectedTicket.priority);
          return (
            <>
              <div className="rounded-xl p-5" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[11px] font-bold" style={{ color: "var(--teal-deep)" }}>{selectedTicket.ticket_number}</span>
                  <span className="font-mono text-[9px] px-2 py-1 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                </div>
                <p className="text-[16px] font-bold" style={{ color: "var(--navy)" }}>{selectedTicket.title}</p>
                <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--gray)" }}>{selectedTicket.description}</p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[9px] px-2 py-1 rounded-full" style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}>
                    {catInfo?.emoji} {catInfo?.en}
                  </span>
                  <span className="text-[9px] px-2 py-1 rounded-full" style={{ background: priInfo?.color, color: "#fff" }}>
                    {priInfo?.en} Priority
                  </span>
                  <span className="text-[9px] px-2 py-1 rounded-full" style={{ background: "var(--off-white)", color: "var(--gray)", border: "1px solid var(--gray-light)" }}>
                    {new Date(selectedTicket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-xl p-4" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
                <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>TICKET TIMELINE</p>
                <div className="pl-4 space-y-3 relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5" style={{ background: "var(--gray-light)" }} />
                  {[
                    { label: "Ticket Created", time: selectedTicket.created_at, color: "var(--teal-deep)" },
                    ...(selectedTicket.status !== "open" ? [{ label: "Under Review", time: selectedTicket.updated_at, color: "var(--gold)" }] : []),
                    ...(selectedTicket.status === "resolved" || selectedTicket.status === "closed" ? [{ label: "Resolved", time: selectedTicket.updated_at, color: "var(--success)" }] : []),
                  ].map((ev, i) => (
                    <div key={i} className="relative flex items-start gap-3">
                      <div className="absolute -left-[9px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ background: ev.color }} />
                      <div>
                        <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>{ev.label}</p>
                        <p className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{new Date(ev.time).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTicket.resolution_notes && (
                <div className="rounded-xl p-4" style={{ background: "rgba(61,170,110,0.06)", border: "1px solid rgba(61,170,110,0.2)" }}>
                  <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: "var(--success)" }}>RESOLUTION</p>
                  <p className="text-[13px]" style={{ color: "var(--navy)" }}>{selectedTicket.resolution_notes}</p>
                </div>
              )}

              <button onClick={() => { setViewMode("list"); setSelectedTicket(null); }}
                className="w-full py-3 rounded-xl text-[13px] font-medium btn-press"
                style={{ border: "1px solid var(--gray-light)", color: "var(--gray)" }}>
                Back to Tickets · العودة للتذاكر
              </button>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default SupportScreen;
