import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, ChevronRight, X, Camera, Upload, Mic, Square, Trash2, Copy, Share2, Sparkles } from "lucide-react";
import { FileUploadPreview } from "@/shared/ui";
import HeaderMenu, { type HeaderMenuItem } from "@/components/HeaderMenu";
import { toast } from "sonner";
import RufayQLogo from "@/components/RufayQLogo";
import UpgradePrompt from "@/components/UpgradePrompt";
import { quickPrompts } from "@/constants/data";
import { getDeviceId } from "@/hooks/useDeviceId";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useGuestCredits } from "@/hooks/useGuestCredits";

interface ChatMessage {
  id: number;
  text: string;
  sender: "ai" | "user";
  time: string;
}

type ChatPersona = "medical" | "shopping" | "tour";

const PERSONAS: Record<ChatPersona, {
  en: string; ar: string; emoji: string; tagline: string; taglineAr: string;
  greeting: string; pills: { emoji: string; text: string }[];
}> = {
  medical: {
    en: "Medical AI", ar: "الذكاء الطبي", emoji: "🩺",
    tagline: "Medications, reports & care", taglineAr: "الأدوية والتقارير والرعاية",
    greeting: "مرحباً 👋 أنا رُفَيِّق الطبي. اسألني عن أدويتك أو تقاريرك أو خطوات التعافي.",
    pills: [
      { emoji: "📋", text: "فسّر نتائجي" },
      { emoji: "💊", text: "اشرح وصفتي" },
      { emoji: "🩻", text: "اشرح الأشعة" },
      { emoji: "⚠️", text: "أعراض الخطر" },
    ],
  },
  shopping: {
    en: "Shopping AI", ar: "ذكاء التسوق", emoji: "🛍️",
    tagline: "Compare, deals & sizing", taglineAr: "المقارنة والعروض والمقاسات",
    greeting: "أهلاً 👋 أنا رفيقك للتسوق. اسألني عن أفضل العروض، المقارنات، المقاسات، أو الجمارك.",
    pills: [
      { emoji: "💰", text: "أفضل سعر؟" },
      { emoji: "📏", text: "حوّل المقاس" },
      { emoji: "🛒", text: "قارن منتجين" },
      { emoji: "🛃", text: "الجمارك السعودية" },
    ],
  },
  tour: {
    en: "Tour Guide AI", ar: "المرشد السياحي", emoji: "🗺️",
    tagline: "Places, history & logistics", taglineAr: "الأماكن والتاريخ والتنقل",
    greeting: "مرحباً 👋 أنا مرشدك السياحي. اسألني عن المعالم القريبة، التاريخ، أو التنقل والمطاعم الحلال.",
    pills: [
      { emoji: "📍", text: "أماكن قريبة" },
      { emoji: "🕌", text: "مطاعم حلال" },
      { emoji: "🚇", text: "كيف أصل؟" },
      { emoji: "🏛️", text: "تاريخ المدينة" },
    ],
  },
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const makeGreeting = (persona: ChatPersona): ChatMessage[] => [
  { id: 1, text: PERSONAS[persona].greeting, sender: "ai", time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) },
];

const ChatScreen = ({ onOpenScanner, initialContext, onClearContext, onUpgrade }: { onOpenScanner?: () => void; initialContext?: string | null; onClearContext?: () => void; onUpgrade?: () => void }) => {
  const isGuest = useGuestMode();
  const { remaining: guestRemaining, limit: guestLimit, isExhausted: guestExhausted, resetsAt: guestResetsAt, consume: consumeGuestCredit } = useGuestCredits();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeCtx, setUpgradeCtx] = useState<{ variant: "guest" | "subscriber"; plan?: string; resetsAt?: Date | string | null }>({ variant: "guest", resetsAt: null });
  const [persona, setPersona] = useState<ChatPersona | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [contextProcessed, setContextProcessed] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadInstruction, setUploadInstruction] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<{ duration: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handle incoming context from Records AI inquiry
  useEffect(() => {
    if (initialContext && !contextProcessed) {
      setContextProcessed(true);
      sendMessage(initialContext);
      onClearContext?.();
    }
  }, [initialContext, contextProcessed]);

  useEffect(() => {
    return () => { if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); };
  }, []);

  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingTime(0);
    setRecordedAudio(null);
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordedAudio({ duration: recordingTime });
  }, [recordingTime]);

  const cancelRecording = useCallback(() => {
    setIsRecording(false);
    setRecordingTime(0);
    setRecordedAudio(null);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }, []);

  const sendVoiceNote = useCallback((dur: number) => {
    sendMessage(`🎤 Voice note · ${formatRecTime(dur)}`);
    setRecordedAudio(null);
    setRecordingTime(0);
  }, []);

  /**
   * Minimum visible duration for the typing indicator.
   * Designed to give the bilingual bubble + RTL spacing time to settle
   * and to avoid jarring instant replies when the AI streams quickly.
   */
  const MIN_TYPING_MS = 1800;

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // ---- Guest mode: enforce 5/day locally before hitting the network ----
    if (isGuest) {
      const ok = consumeGuestCredit();
      if (!ok) {
        setUpgradeCtx({ variant: "guest", resetsAt: guestResetsAt });
        setShowUpgrade(true);
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: Date.now(),
      text: text.trim(),
      sender: "user",
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    const typingStartedAt = Date.now();
    const waitForMinTyping = async () => {
      const elapsed = Date.now() - typingStartedAt;
      const remaining = MIN_TYPING_MS - elapsed;
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
    };

    // Build message history for AI
    const allMessages = [...messages, userMsg];
    const apiMessages = allMessages.map(m => ({
      role: m.sender === "ai" ? "assistant" as const : "user" as const,
      content: m.text,
    }));

    try {
      // Device-id based auth (patient app has no auth.users session).
      // The chat edge function validates this against user_trials server-side.
      const deviceId = getDeviceId();
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "x-device-id": deviceId,
        },
        body: JSON.stringify({ messages: apiMessages, persona }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        await waitForMinTyping();
        if (resp.status === 429) {
          // Server-side daily AI cap — show upgrade prompt for subscribers.
          setUpgradeCtx({
            variant: isGuest ? "guest" : "subscriber",
            plan: errData?.plan,
            resetsAt: errData?.resets_at ?? null,
          });
          setShowUpgrade(true);
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted · نفدت رصيد الذكاء الاصطناعي");
        } else {
          toast.error("AI error · خطأ في الذكاء الاصطناعي");
        }
        setIsTyping(false);
        return;
      }

      if (!resp.body) {
        await waitForMinTyping();
        setIsTyping(false);
        return;
      }

      // Stream the response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let assistantMsgCreated = false;
      const assistantId = Date.now() + 1;
      const assistantTime = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

      // Hold the typing indicator for at least MIN_TYPING_MS before showing the
      // first assistant bubble — keeps RTL/LTR bubble layout from snapping in
      // instantly and matches the designed pacing.
      let firstChunkGate: Promise<void> | null = waitForMinTyping().then(() => {
        setIsTyping(false);
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              if (!assistantMsgCreated) {
                if (firstChunkGate) { await firstChunkGate; firstChunkGate = null; }
                assistantMsgCreated = true;
                setMessages(prev => [...prev, { id: assistantId, text: assistantSoFar, sender: "ai", time: assistantTime }]);
              } else {
                const finalText = assistantSoFar;
                setMessages(prev => prev.map((m) => m.id === assistantId ? { ...m, text: finalText } : m));
              }
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const finalText = assistantSoFar;
              setMessages(prev => prev.map((m) => m.id === assistantId ? { ...m, text: finalText } : m));
            }
          } catch { /* ignore */ }
        }
      }

      // If no content was streamed, add a fallback message
      if (!assistantMsgCreated) {
        if (firstChunkGate) { await firstChunkGate; firstChunkGate = null; }
        setMessages(prev => [...prev, {
          id: assistantId,
          text: "عذراً، لم أتمكن من الرد. يرجى المحاولة مرة أخرى.",
          sender: "ai",
          time: assistantTime,
        }]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      await waitForMinTyping();
      setIsTyping(false);
      toast.error("Connection error · خطأ في الاتصال");
    }
  };

  const handleUploadSend = () => {
    if (uploadedFile) {
      sendMessage(`📎 ${uploadedFile.name}\n${uploadInstruction || "ارفع وثيقة"}`);
      setUploadedFile(null);
      setUploadInstruction("");
      setShowUploadSheet(false);
    }
  };

  const handleCopyChat = () => {
    const text = messages.map(m => `[${m.time}] ${m.sender === "user" ? "You" : "RufayQ AI"}: ${m.text}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Chat copied · تم نسخ المحادثة", { duration: 2000 });
  };

  const handleExportChat = () => {
    const text = messages.map(m => `[${m.time}] ${m.sender === "user" ? "You" : "RufayQ AI"}: ${m.text}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rufayq-chat.txt"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported · تم تصدير المحادثة", { duration: 2000 });
  };

  const handleClearChat = () => {
    setMessages(persona ? makeGreeting(persona) : []);
    toast.success("Chat cleared · تم مسح المحادثة", { duration: 2000 });
  };

  const handleNewChat = () => {
    setPersona(null);
    setMessages([]);
  };

  const chatMenuItems: HeaderMenuItem[] = [
    { icon: <Sparkles size={14} />, label: "New Chat", labelAr: "محادثة جديدة", onClick: handleNewChat },
    { icon: <Copy size={14} />, label: "Copy Chat", labelAr: "نسخ المحادثة", onClick: handleCopyChat },
    { icon: <Share2 size={14} />, label: "Export Chat", labelAr: "تصدير المحادثة", onClick: handleExportChat },
    { icon: <Trash2 size={14} />, label: "Clear Chat", labelAr: "مسح المحادثة", onClick: handleClearChat, danger: true },
  ];

  // Persona picker — shown before any conversation starts (and after "New chat").
  if (!persona) {
    return (
      <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden", background: "var(--off-white)" }}>
        <div className="relative px-5 pt-3 pb-4 overflow-hidden shrink-0" style={{ background: "linear-gradient(160deg, var(--header-dark-from), var(--header-teal-from))" }}>
          <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>04 — AI COMPANION</p>
          <p className="text-white text-[18px] font-bold" style={{ fontFamily: "'DM Sans'" }}>Choose your AI</p>
          <p className="font-arabic text-[13px]" dir="rtl" style={{ color: "rgba(255,255,255,0.55)" }}>اختر مساعدك الذكي</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {(Object.keys(PERSONAS) as ChatPersona[]).map((key) => {
            const p = PERSONAS[key];
            return (
              <button
                key={key}
                onClick={() => { setPersona(key); setMessages(makeGreeting(key)); }}
                className="text-left rounded-2xl p-4 btn-press flex items-start gap-3"
                style={{ background: "var(--white)", border: "1px solid var(--gray-light)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: "var(--off-white)" }}>{p.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{p.en}</p>
                  <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>{p.ar}</p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--gray)" }}>{p.tagline}</p>
                  <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{p.taglineAr}</p>
                </div>
                <ChevronRight size={16} style={{ color: "var(--teal-deep)", flexShrink: 0, marginTop: 4 }} />
              </button>
            );
          })}
          <p className="text-[10px] mt-2 text-center" style={{ color: "var(--gray)" }}>
            AI responses are informational only — not professional advice. · المعلومات للاستئناس فقط وليست استشارة مهنية.
          </p>
        </div>
      </div>
    );
  }
  const activePersona = PERSONAS[persona];

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div className="relative px-5 pt-3 pb-4 overflow-hidden shrink-0" style={{ background: "linear-gradient(160deg, var(--header-dark-from), var(--header-teal-from))", minHeight: 120 }}>
        <div className="absolute -top-8 -right-8 w-[100px] h-[100px] rounded-full" style={{ border: "1px solid rgba(197,150,90,0.1)" }} />
        <div className="absolute -top-16 -right-16 w-[160px] h-[160px] rounded-full" style={{ border: "1px solid rgba(197,150,90,0.06)" }} />
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
          <HeaderMenu items={chatMenuItems} />
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

      {/* Quick Prompts */}
      <div className="flex gap-2 px-3 py-2.5 overflow-x-auto shrink-0" style={{ background: "var(--off-white)" }}>
        {activePersona.pills.map((p) => (
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

      {/* Guest credit chip */}
      {isGuest && (
        <button
          onClick={() => {
            if (guestExhausted) {
              setUpgradeCtx({ variant: "guest", resetsAt: guestResetsAt });
              setShowUpgrade(true);
            } else {
              onUpgrade?.();
            }
          }}
          className="mx-3.5 mb-1 rounded-lg px-3 py-1.5 flex items-center gap-2 shrink-0 btn-press"
          style={{
            background: guestExhausted ? "rgba(217,79,79,0.08)" : "var(--teal-light)",
            border: `1px solid ${guestExhausted ? "rgba(217,79,79,0.3)" : "rgba(0,77,91,0.18)"}`,
          }}
        >
          <Sparkles size={12} style={{ color: guestExhausted ? "#D94F4F" : "var(--teal-deep)" }} />
          <p className="text-[10px] flex-1 text-left" style={{ color: guestExhausted ? "#D94F4F" : "var(--teal-deep)" }}>
            {guestExhausted
              ? "Guest AI limit reached · انتهى الحد"
              : `Guest AI · ${guestRemaining} of ${guestLimit} prompts left today`}
          </p>
          <span className="text-[10px] font-bold" style={{ color: "var(--gold)" }}>Upgrade</span>
        </button>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-3 space-y-3" style={{ background: "var(--off-white)", WebkitOverflowScrolling: "touch" }}>
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
                className="max-w-[78%] px-3.5 py-3 text-[13px] leading-relaxed"
                dir="auto"
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
        {isRecording && (
          <div className="px-3 pt-3 pb-1">
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(217,79,79,0.06)", border: "1px solid rgba(217,79,79,0.2)" }}>
              <div className="w-3 h-3 rounded-full" style={{ background: "#D94F4F", animation: "pulse 1s ease-in-out infinite" }} />
              <div className="flex-1">
                <p className="text-[12px] font-bold" style={{ color: "#D94F4F" }}>Recording...<span className="font-arabic" dir="rtl"> · جاري التسجيل</span></p>
                <div className="flex items-center gap-0.5 mt-1.5 h-4">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div key={i} className="w-[3px] rounded-full" style={{
                      background: "#D94F4F",
                      height: `${20 + Math.sin((Date.now() / 200) + i * 0.8) * 60 + Math.random() * 20}%`,
                      opacity: 0.4 + Math.random() * 0.4,
                      transition: "height 150ms ease",
                    }} />
                  ))}
                </div>
              </div>
              <span className="font-mono text-[14px] font-bold" style={{ color: "#D94F4F" }}>{formatRecTime(recordingTime)}</span>
            </div>
          </div>
        )}

        {recordedAudio && !isRecording && (
          <div className="px-3 pt-3 pb-1">
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--teal-light)", border: "1px solid rgba(0,77,91,0.2)" }}>
              <Mic size={18} style={{ color: "var(--teal-deep)" }} />
              <div className="flex-1">
                <p className="text-[12px] font-semibold" style={{ color: "var(--teal-deep)" }}>Voice note ready<span className="font-arabic" dir="rtl"> · ملاحظة صوتية جاهزة</span></p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex items-center gap-0.5 h-3 flex-1">
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div key={i} className="w-[2px] rounded-full" style={{
                        background: "var(--teal-deep)",
                        height: `${25 + Math.sin(i * 0.6) * 50 + (i % 3) * 15}%`,
                        opacity: 0.5,
                      }} />
                    ))}
                  </div>
                  <span className="font-mono text-[11px] shrink-0" style={{ color: "var(--teal-deep)" }}>{formatRecTime(recordedAudio.duration)}</span>
                </div>
              </div>
              <button onClick={cancelRecording} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "rgba(217,79,79,0.1)" }}>
                <Trash2 size={14} style={{ color: "#D94F4F" }} />
              </button>
            </div>
          </div>
        )}

        {!input.trim() && !isRecording && !recordedAudio && (
          <div className="flex gap-2 px-3 pt-2">
            {[
              { icon: <Camera size={13} />, label: "Scan", onClick: () => onOpenScanner?.() },
              { icon: <Upload size={13} />, label: "Upload", onClick: () => setShowUploadSheet(true) },
              { icon: <Mic size={13} />, label: "Voice", onClick: startRecording },
            ].map((a) => (
              <button key={a.label} onClick={a.onClick} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium btn-press" style={{ background: "var(--off-white)", color: "var(--teal-deep)", border: "1px solid var(--gray-light)" }}>
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        )}

        <div className="px-3 py-2.5 flex items-center gap-2">
          {isRecording ? (
            <>
              <button onClick={cancelRecording} className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 btn-press" style={{ background: "rgba(217,79,79,0.1)" }}>
                <Trash2 size={16} style={{ color: "#D94F4F" }} />
              </button>
              <div className="flex-1 flex items-center justify-center">
                <p className="font-arabic text-[13px]" style={{ color: "var(--gray)" }}>اضغط لإيقاف التسجيل</p>
              </div>
              <button onClick={stopRecording} className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 btn-press" style={{ background: "#D94F4F" }}>
                <Square size={14} fill="#fff" style={{ color: "#fff" }} />
              </button>
            </>
          ) : recordedAudio ? (
            <>
              <button onClick={() => onOpenScanner ? onOpenScanner() : setShowUploadSheet(true)} className="shrink-0">
                <Paperclip size={24} style={{ color: "var(--teal-deep)" }} />
              </button>
              <div className="flex-1 flex items-center justify-center">
                <p className="font-arabic text-[12px]" style={{ color: "var(--gray)" }}>أرسل الملاحظة الصوتية أو احذفها</p>
              </div>
              <button
                onClick={() => sendVoiceNote(recordedAudio.duration)}
                className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 btn-press"
                style={{ background: "var(--teal-deep)" }}
              >
                <Send size={16} style={{ color: "#fff" }} />
              </button>
            </>
          ) : (
            <>
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
              {input.trim() ? (
                <button
                  onClick={() => sendMessage(input)}
                  className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 transition-all btn-press"
                  style={{ background: "var(--teal-deep)" }}
                >
                  <Send size={16} style={{ color: "#fff" }} />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 transition-all btn-press"
                  style={{ background: "var(--gray-light)" }}
                >
                  <Mic size={18} style={{ color: "var(--teal-deep)" }} />
                </button>
              )}
            </>
          )}
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
            <div className="px-5 mb-3">
              <p className="text-[10px] font-mono tracking-wider mb-2" style={{ color: "var(--gold)" }}>DOCUMENT TYPE<span className="font-arabic" dir="rtl"> · نوع الوثيقة</span></p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { emoji: "🔬", label: "Lab Results", ar: "تحاليل" },
                  { emoji: "🩻", label: "Radiology", ar: "أشعة" },
                  { emoji: "💊", label: "Prescription", ar: "وصفة طبية" },
                  { emoji: "📋", label: "Discharge", ar: "ملخص خروج" },
                  { emoji: "🛂", label: "Passport/ID", ar: "جواز / هوية" },
                  { emoji: "🛡️", label: "Insurance", ar: "تأمين" },
                ].map((t) => (
                  <button
                    key={t.label}
                    onClick={() => setUploadInstruction(t.label)}
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
            {/* Hidden real file picker shared by Camera / Files buttons */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
            />
            <div className="flex gap-2 px-5">
              {[
                { emoji: "📷", label: "Camera", ar: "كاميرا", capture: true },
                { emoji: "📁", label: "Files", ar: "ملفات", capture: false },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    if (fileInputRef.current) {
                      // Use capture attribute for the camera variant on supporting browsers
                      if (s.capture) fileInputRef.current.setAttribute("capture", "environment");
                      else fileInputRef.current.removeAttribute("capture");
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl card-press"
                  style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
                >
                  <span className="text-xl">{s.emoji}</span>
                  <span className="text-[11px] font-bold" style={{ color: "var(--navy)" }}>{s.label}</span>
                  <span className="font-arabic text-[9px]" style={{ color: "var(--gray)" }}>{s.ar}</span>
                </button>
              ))}
            </div>
            {uploadedFile && (
              <div className="mx-5 mt-3">
                <FileUploadPreview file={uploadedFile} onRemove={() => setUploadedFile(null)} lang="both" maxHeight={180} />
              </div>
            )}
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
            {uploadedFile && (
              <div className="px-5 mt-3">
                <button onClick={handleUploadSend} className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 btn-press" style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}>
                  <RufayQLogo size={16} variant="light" />
                  <span>Send to RufayQ<span className="font-arabic" dir="rtl"> · أرسل إلى رُفَيِّق</span></span>
                </button>
              </div>
            )}
            <button onClick={() => setShowUploadSheet(false)} className="w-full py-3 text-[13px] font-medium mt-2 mb-4 btn-press" style={{ color: "var(--gray)" }}>
              Cancel · <span className="font-arabic">إلغاء</span>
            </button>
          </div>
        </div>
      )}

      <UpgradePrompt
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => { setShowUpgrade(false); onUpgrade?.(); }}
        variant={upgradeCtx.variant}
        plan={upgradeCtx.plan}
        resetsAt={upgradeCtx.resetsAt}
      />
    </div>
  );
};

export default ChatScreen;
