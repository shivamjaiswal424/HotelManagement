import React, { useState, useRef, useEffect } from "react";
import { api } from "../api";

const SUGGESTIONS = [
  "Who is checking out today?",
  "How many rooms are available?",
  "Which guests are currently checked in?",
  "How many check-ins are due today?",
];

export default function AIChatWidget() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I'm your hotel assistant. Ask me anything about rooms, guests, or reservations." }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const res = await api.post("/ai/chat", { message: msg });
      setMessages(prev => [...prev, { role: "ai", text: res.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Sorry, I couldn't reach the AI. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 900,
        width: 54, height: 54, borderRadius: "50%",
        background: "var(--accent)", border: "none", cursor: "pointer",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center",
        transition: "transform 0.2s",
      }}
        title="AI Assistant"
      >
        {open ? "✕" : "✨"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 92, right: 28, zIndex: 900,
          width: 360, height: 500, borderRadius: "var(--radius)",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            background: "var(--accent-glow)", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>✨</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>AI Assistant</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Annapurna Banquets & Inn</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "82%", padding: "9px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                  background: m.role === "user" ? "var(--accent)" : "var(--bg-input)",
                  color: m.role === "user" ? "#fff" : "var(--text-primary)",
                  borderBottomRightRadius: m.role === "user" ? 2 : 10,
                  borderBottomLeftRadius:  m.role === "ai"   ? 2 : 10,
                  whiteSpace: "pre-wrap",
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "9px 14px", borderRadius: 10, background: "var(--bg-input)",
                  fontSize: 20, letterSpacing: 2 }}>
                  <span style={{ animation: "pulse 1s infinite" }}>•••</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestion chips (only on first open) */}
          {messages.length === 1 && (
            <div style={{ padding: "0 14px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 12,
                  background: "var(--accent-glow)", color: "var(--accent)",
                  border: "1px solid var(--accent)", cursor: "pointer",
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: "10px 12px", borderTop: "1px solid var(--border)",
            display: "flex", gap: 8,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask something…"
              disabled={loading}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)",
                background: "var(--bg-input)", border: "1px solid var(--border)",
                color: "var(--text-primary)", fontSize: 13,
              }}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()} style={{
              padding: "8px 14px", borderRadius: "var(--radius-sm)",
              background: "var(--accent)", color: "#fff", border: "none",
              fontWeight: 700, cursor: "pointer", fontSize: 14,
            }}>
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}