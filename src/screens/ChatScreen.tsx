import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, MoreVertical, ChevronRight, X, Camera, Upload, Mic, Square, Trash2 } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";
import { initialMessages, quickPrompts, type ChatMessage } from "@/constants/data";

const aiResponse = "شكراً لسؤالك. رُفَيِّق هنا دائماً ويعمل على طلبك.\n\nسأرسل لك التفاصيل المطلوبة خلال لحظات. هل هناك شيء آخر تريده؟";

const promptPills = [
  { emoji: "📎", text: "ارفع وثيقة" },
  { emoji: "📋", text: "فسّر نتائجي" },
  { emoji: "💊", text: "اشرح وصفتي" },
  { emoji: "🩻", text: "اشرح الأشعة" },
  { emoji: "🗺️", text: "الخطوة القادمة؟" },
  { emoji: "📤", text: "أرسل تقريري" },
  { emoji: "🇸🇦", text: "احجز متابعة" },
  { emoji: "⚠️", text: "أعراض الخطر" },
];

const ChatScreen = ({ onOpenScanner }: { onOpenScanner?: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [uploadInstruction, setUploadInstruction] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<{ duration: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now(),
      text: text.trim(),
      sender: "user",
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => setIsTyping(true), 400);
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: "ai",
        time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, aiMsg]);
    }, 1800);
  };

  const handleUploadSend = () => {
    if (uploadedFile) {
      sendMessage(`📎 ${uploadedFile.name}\n${uploadInstruction || "ارفع وثيقة"}`);
      setUploadedFile(null);
      setUploadInstruction("");
      setShowUploadSheet(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div className="relative px-5 pt-3 pb-4 overflow-hidden shrink-0" style={{ background: "linear-gradient(160deg, #0D1B2A, #004D5B)", minHeight: 120 }}>
        {/* Decorative rings */}
        <div className="absolute -top-8 -right-8 w-[100px] h-[100px] rounded-full" style={{ border: "1px solid rgba(197,150,90,0.1)" }} />
        <div className="absolute -top-16 -right-16 w-[160px] h-[160px] rounded-full" style={{ border: "1px solid rgba(197,150,90,0.06)" }} />
        {/* ECG wave */}
        <svg className="absolute bottom-0 left-0 w-full" height="20" style={{ opacity: 0.12 }}>
          <polyline
            points="0,10 20,10 30,4 35,16 40,8 50,10 70,10 90,10 100,4 105,16 110,8 120,10 140,10 160,10 170,4 175,16 180,8 190,10 210,10 230,10 240,4 245,16 250,8 260,10 280,10 300,10 310,4 315,16 320,8 330,10 350,10 370,10 380,4 385,16 390,8 400,10"
            stroke="#C5965A" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          >
            <animateTransform attributeName="transform" type="translate" values="-200,0;0,0" dur="8s" repeatCount="indefinite" />
          </polyline>
        </svg>

        <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>04 — AI COMPANION</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center" style={{ background: "var(--navy)", border: "2px solid var(--gold)", boxShadow: "0 0 12px rgba(197,150,90,0.25)" }}>
                <RufayQLogo size={28} variant="dark" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: "var(--success)", borderColor: "#0D1B2A" }} />
            </div>
            <div>
              <p className="text-[18px] font-bold text-white" style={{ fontFamily: "'DM Sans'" }}>RufayQ AI</p>
              <p className="font-arabic text-[13px]" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>رُفَيِّق الذكاء الاصطناعي</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.55)" }}>Always On · Arabic · Medical AI</p>
              </div>
            </div>
          </div>
          <MoreVertical size={18} color="white" />
        </div>
      </div>

      {/* Context Card */}
      <div className="mx-3 mt-2 rounded-r-lg px-3.5 py-2 flex items-center justify-between shrink-0" style={{ background: "var(--navy)", borderLeft: "3px solid var(--gold)" }}>
        <div>
          <p className="font-mono text-[9px]" style={{ color: "var(--gold)" }}>Active trip: Berlin — Orthopedic, Day 7</p>
          <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>رحلة برلين — جراحة عظام — اليوم ٧</p>
        </div>
        <ChevronRight size={14} style={{ color: "var(--gold)" }} />
      </div>

      {/* Quick Prompts — 8 pills */}
      <div className="flex gap-2 px-3 py-2.5 overflow-x-auto shrink-0" style={{ background: "var(--off-white)" }}>
        {promptPills.map((p) => (
          <button
            key={p.text}
            onClick={() => sendMessage(p.text)}
            className="font-arabic text-[11px] px-3.5 py-1.5 rounded-full whitespace-nowrap btn-press flex items-center gap-1"
            style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid var(--gray-light)" }}
          >
            <span>{p.emoji}</span> {p.text}
          </button>
        ))}
      </div>

      {/* Disclaimer */}
      {showDisclaimer && (
        <div className="mx-3.5 my-1 rounded-lg px-3 py-2 flex items-start gap-2 shrink-0" style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)" }}>
          <p className="font-arabic text-[9px] flex-1 leading-relaxed" dir="rtl" style={{ color: "var(--gold)" }}>
            ⚠️ رُفَيِّق يُقدم معلومات صحية فقط ولا يُغني عن استشارة الطبيب المختص
          </p>
          <button onClick={() => setShowDisclaimer(false)}><X size={12} style={{ color: "var(--gold)" }} /></button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-3 space-y-3" style={{ background: "var(--off-white)", WebkitOverflowScrolling: "touch" }}>
        {/* Date separator */}
        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
          <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>Today</span>
          <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
        </div>

        {messages.map((msg) => {
          const isAi = msg.sender === "ai";
          return (
            <div key={msg.id} className={`flex ${isAi ? "justify-start" : "justify-end"} animate-fade-in-up`}>
              {isAi && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1" style={{ background: "var(--teal-deep)", border: "1.5px solid rgba(197,150,90,0.4)" }}>
                  <RufayQLogo size={14} variant="dark" />
                </div>
              )}
              <div
                className="max-w-[78%] px-3.5 py-3 font-arabic text-[13px] leading-relaxed"
                dir="rtl"
                style={{
                  background: isAi ? "var(--white)" : "var(--teal-deep)",
                  color: isAi ? "var(--ink)" : "#fff",
                  borderRadius: isAi ? "3px 14px 14px 14px" : "14px 3px 14px 14px",
                  boxShadow: isAi ? "0 2px 8px rgba(0,0,0,0.06)" : "0 3px 12px rgba(0,77,91,0.25)",
                  whiteSpace: "pre-line",
                }}
              >
                {msg.text}
                <span className="block font-mono text-[9px] mt-1" style={{ opacity: 0.5, direction: "ltr", textAlign: isAi ? "left" : "right" }}>
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1" style={{ background: "var(--teal-deep)", border: "1.5px solid rgba(197,150,90,0.4)" }}>
              <RufayQLogo size={14} variant="dark" />
            </div>
            <div className="px-4 py-3 rounded-2xl flex gap-1.5" style={{ background: "var(--white)", borderRadius: "3px 14px 14px 14px" }}>
              <div className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: "var(--teal-bright)" }} />
              <div className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: "var(--teal-bright)" }} />
              <div className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: "var(--teal-bright)" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0" style={{ background: "var(--white)", borderTop: "1px solid var(--gray-light)" }}>
        {/* Quick action pills when input empty */}
        {!input.trim() && (
          <div className="flex gap-2 px-3 pt-2">
            {[
              { icon: <Camera size={13} />, label: "Scan", onClick: () => onOpenScanner?.() },
              { icon: <Upload size={13} />, label: "Upload", onClick: () => setShowUploadSheet(true) },
              { icon: <Mic size={13} />, label: "Voice", onClick: () => {} },
            ].map((a) => (
              <button key={a.label} onClick={a.onClick} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium btn-press" style={{ background: "var(--off-white)", color: "var(--teal-deep)", border: "1px solid var(--gray-light)" }}>
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        )}
        <div className="px-3 py-2.5 flex items-center gap-2">
          <button onClick={() => onOpenScanner ? onOpenScanner() : setShowUploadSheet(true)} className="shrink-0">
            <Paperclip size={24} style={{ color: "var(--teal-deep)" }} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="اسأل رُفَيِّق..."
            dir="rtl"
            className="flex-1 font-arabic text-[14px] px-4 py-2.5 rounded-full outline-none transition-all"
            style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
          />
          <button
            onClick={() => sendMessage(input)}
            className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 transition-all btn-press"
            style={{ background: input.trim() ? "var(--teal-deep)" : "var(--gray-light)" }}
            disabled={!input.trim()}
          >
            <Send size={16} style={{ color: input.trim() ? "#fff" : "var(--gray)" }} />
          </button>
        </div>
      </div>

      {/* Upload Bottom Sheet */}
      {showUploadSheet && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={() => setShowUploadSheet(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="relative animate-slide-up rounded-t-3xl" style={{ background: "var(--white)", maxHeight: "70%" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3"><div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} /></div>
            <div className="px-5 pt-4 pb-2">
              <p className="font-display text-xl" style={{ color: "var(--navy)" }}>Upload to RufayQ</p>
              <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>ارفع وثيقة إلى رُفَيِّق</p>
            </div>

            {/* Medical document type selector */}
            <div className="px-5 mb-3">
              <p className="text-[10px] font-mono tracking-wider mb-2" style={{ color: "var(--gold)" }}>DOCUMENT TYPE · نوع الوثيقة</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { emoji: "🔬", label: "Lab Results", ar: "تحاليل" },
                  { emoji: "🩻", label: "Radiology", ar: "أشعة" },
                  { emoji: "💊", label: "Prescription", ar: "وصفة طبية" },
                  { emoji: "📋", label: "Discharge", ar: "ملخص خروج" },
                  { emoji: "🫀", label: "ECG / ECHO", ar: "قلب" },
                  { emoji: "🛡️", label: "Insurance", ar: "تأمين" },
                ].map((t) => (
                  <button
                    key={t.label}
                    onClick={() => {
                      setUploadedFile({ name: `${t.label.toLowerCase().replace(/\s+/g, "_")}_scan.pdf`, size: "1.2 MB" });
                      setUploadInstruction(t.label);
                    }}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl card-press"
                    style={{ background: uploadInstruction === t.label ? "var(--teal-light)" : "var(--off-white)", border: uploadInstruction === t.label ? "2px solid var(--teal-deep)" : "1px solid var(--gray-light)" }}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    <span className="text-[10px] font-bold" style={{ color: "var(--navy)" }}>{t.label}</span>
                    <span className="font-arabic text-[8px]" style={{ color: "var(--gray)" }}>{t.ar}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Source buttons */}
            <div className="flex gap-2 px-5">
              {[
                { emoji: "📷", label: "Camera", ar: "كاميرا" },
                { emoji: "📁", label: "Files", ar: "ملفات" },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => setUploadedFile({ name: `sample_${s.label.toLowerCase()}.pdf`, size: "1.2 MB" })}
                  className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl card-press"
                  style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
                >
                  <span className="text-xl">{s.emoji}</span>
                  <span className="text-[11px] font-bold" style={{ color: "var(--navy)" }}>{s.label}</span>
                  <span className="font-arabic text-[9px]" style={{ color: "var(--gray)" }}>{s.ar}</span>
                </button>
              ))}
            </div>

            {/* File preview */}
            {uploadedFile && (
              <div className="mx-5 mt-3 rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <span className="text-xl">📄</span>
                <div className="flex-1">
                  <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>{uploadedFile.name}</p>
                  <p className="text-[10px]" style={{ color: "var(--gray)" }}>{uploadedFile.size}</p>
                </div>
                <button onClick={() => setUploadedFile(null)}><X size={14} style={{ color: "var(--gray)" }} /></button>
              </div>
            )}

            {/* Instruction textarea */}
            {uploadedFile && (
              <div className="mx-5 mt-2">
                <textarea
                  value={uploadInstruction}
                  onChange={(e) => setUploadInstruction(e.target.value)}
                  placeholder="أضف تعليمات للذكاء الاصطناعي... (اختياري)"
                  dir="rtl"
                  rows={2}
                  className="w-full font-arabic text-[13px] px-3 py-2 rounded-xl outline-none resize-none"
                  style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
                />
              </div>
            )}

            {/* Send button */}
            {uploadedFile && (
              <div className="px-5 mt-3">
                <button onClick={handleUploadSend} className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 btn-press" style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}>
                  <RufayQLogo size={16} variant="light" />
                  <span>Send to RufayQ · أرسل إلى رُفَيِّق</span>
                </button>
              </div>
            )}

            <button onClick={() => setShowUploadSheet(false)} className="w-full py-3 text-[13px] font-medium mt-2 mb-4 btn-press" style={{ color: "var(--gray)" }}>
              Cancel · <span className="font-arabic">إلغاء</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatScreen;
