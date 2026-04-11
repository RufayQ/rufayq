import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import { initialMessages, type ChatMessage } from "@/constants/data";

const quickPrompts = [
  "اشرح أدويتي",
  "احجز متابعة",
  "أعراض الخطر",
  "ترجم الخروج",
];

const aiResponses = [
  "بالتأكيد، خليني أساعدك. هل تقدر توضح لي أكثر عن سؤالك؟",
  "تم استلام طلبك. سأرسل لك التفاصيل خلال لحظات.",
  "أنصحك تتواصل مع طبيبك المعالج بخصوص هذا الموضوع. هل تحتاج رقم العيادة؟",
  "حزمة الخروج جاهزة ومترجمة بالكامل للعربية. تقدر تحملها من قسم الملفات.",
];

const ChatScreen = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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
    setIsTyping(true);

    setTimeout(() => {
      const aiText = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        text: aiText,
        sender: "ai",
        time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, aiMsg]);
    }, 1800);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #004D5B, #006D7C)" }}>
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
            <LogoMark size={28} />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: "var(--success)", borderColor: "#004D5B" }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#fff" }}>RufayQ AI</p>
          <p className="text-[10px]" style={{ color: "var(--teal-light)" }}>Online · مساعدك الطبي</p>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto" style={{ background: "var(--teal-light)" }}>
        {quickPrompts.map((p) => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            className="font-arabic text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{ background: "#fff", color: "var(--teal-deep)", border: "1px solid var(--teal-bright)" }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: "var(--off-white)" }}>
        {messages.map((msg) => {
          const isAi = msg.sender === "ai";
          return (
            <div key={msg.id} className={`flex ${isAi ? "justify-start" : "justify-end"}`}>
              <div
                className="max-w-[80%] px-3 py-2.5 font-arabic text-sm leading-relaxed"
                dir="rtl"
                style={{
                  background: isAi ? "#fff" : "var(--teal-deep)",
                  color: isAi ? "var(--navy)" : "#fff",
                  borderRadius: isAi ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                  boxShadow: isAi ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  whiteSpace: "pre-line",
                }}
              >
                {msg.text}
                <span className="block text-[9px] mt-1 opacity-50" style={{ direction: "ltr", textAlign: isAi ? "left" : "right" }}>
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl flex gap-1" style={{ background: "#fff" }}>
              <div className="w-2 h-2 rounded-full typing-dot" style={{ background: "var(--teal-bright)" }} />
              <div className="w-2 h-2 rounded-full typing-dot" style={{ background: "var(--teal-bright)" }} />
              <div className="w-2 h-2 rounded-full typing-dot" style={{ background: "var(--teal-bright)" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ background: "#fff", borderTop: "1px solid var(--gray-light)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="اكتب رسالتك..."
          dir="rtl"
          className="flex-1 font-arabic text-sm px-3 py-2 rounded-full outline-none"
          style={{ background: "var(--off-white)", color: "var(--navy)" }}
        />
        <button
          onClick={() => sendMessage(input)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: input.trim() ? "var(--teal-deep)" : "var(--gray-light)" }}
        >
          <Send size={16} style={{ color: input.trim() ? "#fff" : "var(--gray)" }} />
        </button>
      </div>
    </div>
  );
};

export default ChatScreen;
