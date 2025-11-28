"use client";

import { useState, useEffect, FormEvent } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatUIProps = {
  variant?: "light" | "dark";
};

const SESSION_KEY = "yjar_chat_session_id";
const SESSION_CREATED_AT_KEY = "yjar_chat_session_created_at";
const TTL_HOURS = 48;

function initSessionId(): string | null {
  if (typeof window === "undefined") return null;

  const now = Date.now();
  const ttlMs = TTL_HOURS * 60 * 60 * 1000;

  const storedId = window.localStorage.getItem(SESSION_KEY);
  const storedCreatedAt = window.localStorage.getItem(SESSION_CREATED_AT_KEY);

  if (storedId && storedCreatedAt) {
    const createdAt = Number(storedCreatedAt);
    if (!Number.isNaN(createdAt) && now - createdAt < ttlMs) {
      return storedId;
    }
  }

  const newId = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, newId);
  window.localStorage.setItem(SESSION_CREATED_AT_KEY, String(now));
  return newId;
}

export default function ChatUI({ variant = "dark" }: ChatUIProps) {
  // state forv"Neuer Chat"
  const [sessionId, setSessionId] = useState<string | null>(() => initSessionId());

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  // Lead
  const [leadMode, setLeadMode] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);

  // Support
  const [supportMode, setSupportMode] = useState(false);
  const [supportDone, setSupportDone] = useState(false);
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState(""); // НОВОЕ: телефон
  const [supportError, setSupportError] = useState<string | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);

  // loading history
  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      try {
        const res = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      } catch (e) {
        console.error("History error", e);
      }
    })();
  }, [sessionId]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const text = input.trim();
    setLastUserMessage(text);

    setMessages((p) => [...p, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });

      const data = await res.json();
      const answer: string = data.answer ?? "";
      const intent: string = data.intent ?? "other";

      if (answer) {
        setMessages((p) => [...p, { role: "assistant", content: answer }]);
      }

      if (intent === "lead") {
        setLeadMode(true);
        setSupportMode(false);
        setLeadDone(false);
      } else if (intent === "support") {
        setSupportMode(true);
        setLeadMode(false);
        setSupportDone(false);
      } else {
        setLeadMode(false);
        setSupportMode(false);
      }
    } catch (e) {
      console.error("Chat error", e);
    } finally {
      setLoading(false);
    }
  }

  async function hashId(id: string) {
    const bytes = new TextEncoder().encode(id);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function submitLead(e: FormEvent) {
    e.preventDefault();
    if (!sessionId) return;

    if (!leadName.trim() || !leadEmail.trim()) {
      setLeadError("Bitte Name und E-Mail eingeben.");
      return;
    }

    setLeadLoading(true);
    setLeadError(null);

    try {
      const hash = await hashId(sessionId);

      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionIdHash: hash,
          name: leadName.trim(),
          email: leadEmail.trim(),
          message: lastUserMessage,
          source: "website-chat",
        }),
      });

      setLeadDone(true);
      setLeadMode(false);

      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          content:
            "Vielen Dank! Unser Team meldet sich schnellstmöglich bei Ihnen.",
        },
      ]);
    } catch (err) {
      console.error("Lead error", err);
      setLeadError("Fehler – bitte später erneut versuchen.");
    } finally {
      setLeadLoading(false);
    }
  }

  async function submitSupport(e: FormEvent) {
    e.preventDefault();
    if (!sessionId) return;

    // email or tel
    if (
      !supportName.trim() ||
      (!supportEmail.trim() && !supportPhone.trim())
    ) {
      setSupportError(
        "Bitte Name und E-Mail oder Telefonnummer eingeben."
      );
      return;
    }

    setSupportLoading(true);
    setSupportError(null);

    try {
      const hash = await hashId(sessionId);

      await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionIdHash: hash,
          name: supportName.trim(),
          email: supportEmail.trim() || null,
          phone: supportPhone.trim() || null,
          message: lastUserMessage,
        }),
      });

      setSupportDone(true);
      setSupportMode(false);

      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          content: "Support-Ticket wurde erstellt. Unser Team meldet sich.",
        },
      ]);
    } catch (err) {
      console.error("Support error", err);
      setSupportError("Fehler – bitte später erneut versuchen.");
    } finally {
      setSupportLoading(false);
    }
  }

 
  // voll neue chat mit neue session_id
  function handleNewChat() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(SESSION_CREATED_AT_KEY);
    }

    const newId = initSessionId();
    setSessionId(newId);

    setMessages([]);
    setInput("");
    setLastUserMessage(null);

    setLeadMode(false);
    setLeadDone(false);
    setLeadName("");
    setLeadEmail("");
    setLeadError(null);
    setLeadLoading(false);

    setSupportMode(false);
    setSupportDone(false);
    setSupportName("");
    setSupportEmail("");
    setSupportPhone("");
    setSupportError(null);
    setSupportLoading(false);
  }

  const isDark = variant === "dark";

  const containerClasses =
    `w-full max-w-md mx-auto p-4 flex flex-col gap-3 rounded-xl ` +
    (isDark ? "bg-slate-800 text-slate-50" : "bg-white text-black");

  const chatBoxClasses =
    `flex-1 min-h-[300px] max-h-[400px] overflow-y-auto rounded-lg p-3 space-y-2 text-sm ` +
    (isDark ? "bg-slate-900" : "bg-gray-50");

  const inputClasses =
    "flex-1 rounded-lg px-3 py-2 border " +
    (isDark
      ? "bg-slate-900 border-slate-600 text-slate-50 placeholder-slate-400"
      : "bg-white border-gray-300 text-black placeholder-gray-400");

  const formContainerClasses =
    "flex flex-col gap-2 border rounded-lg p-3 text-xs " +
    (isDark ? "border-slate-600 bg-slate-900" : "border-gray-300 bg-gray-50");

  const formInputClasses =
    "rounded px-2 py-1 border " +
    (isDark
      ? "bg-slate-800 border-slate-600 text-slate-50 placeholder-slate-400"
      : "bg-white border-gray-300 text-black placeholder-gray-400");

  return (
    <div className={containerClasses}>
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">YJAR Chat assistent</div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setSupportMode(true);
              setLeadMode(false);
            }}
            className="text-xs text-blue-400 hover:text-blue-600"
          >
            Support
          </button>

          <button
            onClick={handleNewChat}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Neuer Chat
          </button>
        </div>
      </div>

      {/* CHAT */}
      <div className={chatBoxClasses}>
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <span
              className={
                m.role === "user"
                  ? "inline-block bg-blue-600 text-white px-3 py-2 rounded-lg"
                  : "inline-block bg-slate-700 text-white px-3 py-2 rounded-lg"
              }
            >
              {m.content}
            </span>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center opacity-60">
            Schreib eine erste Nachricht, um zu beginnen.
          </div>
        )}
      </div>

      {/* LEAD FORM */}
      {leadMode && !leadDone && (
        <form onSubmit={submitLead} className={formContainerClasses}>
          <input
            className={formInputClasses}
            placeholder="Name"
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
          />
          <input
            className={formInputClasses}
            placeholder="E-Mail"
            value={leadEmail}
            onChange={(e) => setLeadEmail(e.target.value)}
          />

          {leadError && <div className="text-red-400">{leadError}</div>}

          <button
            disabled={leadLoading}
            className="rounded bg-blue-600 text-white px-3 py-1 disabled:opacity-50"
          >
            {leadLoading ? "Senden…" : "Absenden"}
          </button>
        </form>
      )}

      {/* SUPPORT FORM */}
      {supportMode && !supportDone && (
        <form onSubmit={submitSupport} className={formContainerClasses}>
          <input
            className={formInputClasses}
            placeholder="Name"
            value={supportName}
            onChange={(e) => setSupportName(e.target.value)}
          />
          <input
            className={formInputClasses}
            placeholder="E-Mail (optional)"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
          />
          <input
            className={formInputClasses}
            placeholder="Telefon (optional)"
            value={supportPhone}
            onChange={(e) => setSupportPhone(e.target.value)}
          />

          {supportError && (
            <div className="text-red-400">{supportError}</div>
          )}

          <button
            disabled={supportLoading}
            className="rounded bg-blue-600 text-white px-3 py-1 disabled:opacity-50"
          >
            {supportLoading ? "Senden…" : "Ticket senden"}
          </button>
        </form>
      )}

      {/* INPUT */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          className={inputClasses}
          placeholder="Frag etwas…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "..." : "Senden"}
        </button>
      </form>
    </div>
  );
}
