"use client";

import { useState, useEffect, FormEvent } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatUIProps = {
  variant?: "light" | "dark";
};

// --- SESSION CONSTANTS ---
const SESSION_KEY = "yjar_chat_session_id";
const SESSION_CREATED_AT_KEY = "yjar_chat_session_created_at";
const TTL_HOURS = 48;

// --- CREATE / RESTORE SESSION ---
function initSessionId(): string | null {
  if (typeof window === "undefined") return null;

  const now = Date.now();
  const ttlMs = TTL_HOURS * 60 * 60 * 1000;

  const storedId = localStorage.getItem(SESSION_KEY);
  const storedCreated = localStorage.getItem(SESSION_CREATED_AT_KEY);

  if (storedId && storedCreated) {
    const createdAt = Number(storedCreated);
    if (!Number.isNaN(createdAt) && now - createdAt < ttlMs) {
      return storedId;
    }
  }

  const newId = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, newId);
  localStorage.setItem(SESSION_CREATED_AT_KEY, String(now));
  return newId;
}

// --- HASH UTIL ---
async function hashId(id: string) {
  const b = new TextEncoder().encode(id);
  const digest = await crypto.subtle.digest("SHA-256", b);
  return Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export default function ChatUI({ variant = "dark" }: ChatUIProps) {
  // --- MAIN STATE ---
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  // --- LEAD STATE ---
  const [leadMode, setLeadMode] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);

  // --- SUPPORT STATE ---
  const [supportMode, setSupportMode] = useState(false);
  const [supportDone, setSupportDone] = useState(false);
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportError, setSupportError] = useState<string | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);

  // --- INIT SESSION ---
  useEffect(() => {
    const id = initSessionId();
    setTimeout(() => setSessionId(id), 0);
  }, []);

  // --- LOAD HISTORY ---
  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    })();
  }, [sessionId]);

  // --- SEND MESSAGE ---
  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const text = input.trim();
    setLastUserMessage(text);

    setMessages((p) => [...p, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, sessionId }),
    });

    const data = await res.json();

    const answer = data.answer ?? "";
    const intent = data.intent ?? "other";

    if (answer) {
      setMessages((p) => [...p, { role: "assistant", content: answer }]);
    }

    if (intent === "lead") {
      setLeadMode(true);
      setLeadDone(false);
      setSupportMode(false);
    } else if (intent === "support") {
      setSupportMode(true);
      setSupportDone(false);
      setLeadMode(false);
    } else {
      setLeadMode(false);
      setSupportMode(false);
    }

    setLoading(false);
  }

  // --- SUBMIT LEAD ---
  async function submitLead(e: FormEvent) {
    e.preventDefault();
    if (!sessionId) return;

    if (!leadName.trim() || !leadEmail.trim()) {
      setLeadError("Bitte Name und E-Mail eingeben.");
      return;
    }

    setLeadLoading(true);

    const hashed = await hashId(sessionId);

    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionIdHash: hashed,
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

    setLeadLoading(false);
  }

  // --- SUBMIT SUPPORT ---
  async function submitSupport(e: FormEvent) {
    e.preventDefault();
    if (!sessionId) return;

    if (!supportName.trim() || !supportEmail.trim()) {
      setSupportError("Bitte Name und E-Mail eingeben.");
      return;
    }

    setSupportLoading(true);

    const hashed = await hashId(sessionId);

    await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionIdHash: hashed,
        name: supportName.trim(),
        email: supportEmail.trim(),
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

    setSupportLoading(false);
  }

  // --- THEME ---
  const isDark = variant === "dark";
  const bg = isDark ? "bg-slate-800 text-white" : "bg-white text-black";
  const chatBg = isDark ? "bg-slate-900" : "bg-gray-50";
  const border = isDark ? "border-slate-600" : "border-gray-300";

  return (
    <div className={`w-full h-full p-4 rounded-xl flex flex-col gap-3 ${bg}`}>
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">YJAR Chat assistent</div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setSupportMode(true);
              setLeadMode(false);
            }}
            className="text-xs text-blue-400 hover:text-blue-200"
          >
            Support
          </button>

          <button
            onClick={() => location.reload()}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Neuer Chat
          </button>
        </div>
      </div>

      {/* CHAT BOX */}
      <div
        className={`flex-1 min-h-[300px] max-h-[400px] overflow-y-auto rounded-lg p-3 space-y-2 text-sm ${chatBg}`}
      >
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
          <div className="opacity-60 text-center">
            Schreib eine erste Nachricht, um zu beginnen.
          </div>
        )}
      </div>

      {/* LEAD FORM */}
      {leadMode && !leadDone && (
        <form
          onSubmit={submitLead}
          className={`flex flex-col gap-2 border rounded-lg p-3 text-xs ${border}`}
        >
          <input
            className={`rounded px-2 py-1 text-black ${border}`}
            placeholder="Name"
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
          />
          <input
            className={`rounded px-2 py-1 text-black ${border}`}
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
        <form
          onSubmit={submitSupport}
          className={`flex flex-col gap-2 border rounded-lg p-3 text-xs ${border}`}
        >
          <input
            className={`rounded px-2 py-1 text-black ${border}`}
            placeholder="Name"
            value={supportName}
            onChange={(e) => setSupportName(e.target.value)}
          />
          <input
            className={`rounded px-2 py-1 text-black ${border}`}
            placeholder="E-Mail"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
          />

          {supportError && <div className="text-red-400">{supportError}</div>}

          <button
            disabled={supportLoading}
            className="rounded bg-purple-600 text-white px-3 py-1 disabled:opacity-50"
          >
            {supportLoading ? "Senden…" : "Ticket senden"}
          </button>
        </form>
      )}

      {/* INPUT */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          className={`flex-1 rounded-lg px-3 py-2 text-black ${border}`}
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
