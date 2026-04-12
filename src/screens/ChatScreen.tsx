import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, MoreVertical, ChevronRight, X } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import { initialMessages, quickPrompts, type ChatMessage } from "@/constants/data";

const aiResponse = "شكراً لسؤالك. رُفَيِّق هنا دائماً ويعمل على طلبك.\n\nسأرسل لك التفاصيل المطلوبة خلال لحظات. هل هناك شيء آخر تريده؟";

const ChatScreen = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div className="px-5 pt-3 pb-3" style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}>
        <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>04 — AI COMPANION</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--navy)", border: "2px solid var(--gold)" }}>
                <LogoMark size={22} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: "var(--success)", borderColor: "var(--teal-deep)" }} />
            </div>
            <div>
              <p className="font-display text-base font-semibold text-white">RufayQ AI — <span className="font-arabic">رُفَيِّق</span></p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.55)" }}>Arabic · Medically Aware · Always On</p>
              </div>
            </div>
          </div>
          <MoreVertical size={18} color="white" />
        </div>
      </div>

      {/* Context Card */}
      <div className="mx-3 mt-2 rounded-r-lg px-3.5 py-2 flex items-center justify-between" style={{ background: "var(--navy)", borderLeft: "3px solid var(--gold)" }}>
        <div>
          <p className="font-mono text-[9px]" style={{ color: "var(--gold)" }}>Active trip: Berlin — Orthopedic, Day 7</p>
          <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>رحلة برلين — جراحة عظام — اليوم ٧</p>
        </div>
        <ChevronRight size={14} style={{ color: "var(--gold)" }} />
      </div>

      {/* Quick Prompts */}
      <div className="flex gap-2 px-3 py-2.5 overflow-x-auto" style={{ background: "var(--off-white)" }}>
        {quickPrompts.map((p) => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            className="font-arabic text-[11px] px-3.5 py-1.5 rounded-full whitespace-nowrap btn-press"
            style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid var(--gray-light)" }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Disclaimer */}
      {showDisclaimer && (
        <div className="mx-3.5 my-1 rounded-lg px-3 py-2 flex items-start gap-2" style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)" }}>
          <p className="font-arabic text-[9px] flex-1 leading-relaxed" dir="rtl" style={{ color: "var(--gold)" }}>
            ⚠️ رُفَيِّق يُقدم معلومات صحية فقط ولا يُغني عن استشارة الطبيب
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
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1" style={{ background: "var(--teal-deep)" }}>
                  <LogoMark size={14} />
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
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1" style={{ background: "var(--teal-deep)" }}>
              <LogoMark size={14} />
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

      {/* Input */}
      <div className="px-3 py-2.5 flex items-center gap-2" style={{ background: "var(--white)", borderTop: "1px solid var(--gray-light)" }}>
        <Paperclip size={20} style={{ color: "var(--gray)" }} className="shrink-0 cursor-pointer" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="اسأل رُفَيِّق..."
          dir="rtl"
          className="flex-1 font-arabic text-[13px] px-4 py-2.5 rounded-full outline-none transition-all"
          style={{
            background: "var(--off-white)",
            color: "var(--navy)",
            border: "1px solid var(--gray-light)",
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all btn-press"
          style={{ background: input.trim() ? "var(--teal-deep)" : "var(--gray-light)" }}
          disabled={!input.trim()}
        >
          <Send size={16} style={{ color: input.trim() ? "#fff" : "var(--gray)" }} />
        </button>
      </div>
    </div>
  );
};

export default ChatScreen;
