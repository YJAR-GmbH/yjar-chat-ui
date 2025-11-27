"use client";

import { useEffect, useState, FormEvent } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
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

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<Record<number, boolean>>({});

  // Lead-Formular
  const [leadMode, setLeadMode] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  // sessionId TTL
  useEffect(() => {
    const id = initSessionId();
    if (id) setSessionId(id);
  }, []);

  // load history
  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      try {
        const res = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) return;

        const data = await res.json();
        const history: Message[] = Array.isArray(data.messages)
          ? data.messages
          : [];

        setMessages(history);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    })();
  }, [sessionId]);

  // Nachricht absenden
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const userText = input.trim();
    setLastUserMessage(userText);

    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, sessionId }),
      });

      const data = await res.json();

      const answer: string = data.answer ?? "";
      const intent: string = (data.intent ?? "other") as string;

      if (answer) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: answer },
        ]);
      }

      if (intent === "lead") {
        setLeadMode(true);
        setLeadSubmitted(false);
      } else {
        setLeadMode(false);
      }
    } catch (e) {
      console.error("Chat error", e);
    } finally {
      setLoading(false);
    }
  }

  // Lead Absenden
  async function handleLeadSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    if (!leadName.trim() || !leadEmail.trim()) {
      setLeadError("Bitte Name und E-Mail-Adresse ausfüllen.");
      return;
    }

    try {
      setLeadLoading(true);
      setLeadError(null);

      // sessionId hash
      const encoder = new TextEncoder();
      const data = encoder.encode(sessionId);
      const digest = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(digest));
      const sessionIdHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionIdHash,
          name: leadName.trim(),
          email: leadEmail.trim(),
          message: lastUserMessage ?? null,
          source: "website-chat",
        }),
      });

      setLeadSubmitted(true);
      setLeadMode(false);

      setMessages((prev) => [
        ...prev,
        { role: "user", content: "" },
        {
          role: "assistant",
          content:
            "Vielen Dank! Unser Team meldet sich schnellstmöglich bei Ihnen.",
        },
      ]);
    } catch (error) {
      console.error("Lead Error:", error);
      setLeadError("Es ist ein Fehler aufgetreten. Bitte später erneut versuchen.");
    } finally {
      setLeadLoading(false);
    }
  }

  function resetChat() {
    if (typeof window === "undefined") return;

    const newId = crypto.randomUUID();
    const now = Date.now();

    window.localStorage.setItem(SESSION_KEY, newId);
    window.localStorage.setItem(SESSION_CREATED_AT_KEY, String(now));

    setMessages([]);
    setSessionId(newId);
    setLeadMode(false);
    setLeadSubmitted(false);
    setLeadName("");
    setLeadEmail("");
    setLeadError(null);
  }

  // Feedback senden
  async function sendFeedback(messageIndex: number, vote: "up" | "down") {
    try {
      const message = messages[messageIndex];
      if (!message || message.role !== "assistant") return;
      if (!sessionId) return;

      const encoder = new TextEncoder();
      const data = encoder.encode(sessionId);
      const digest = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(digest));
      const sessionIdHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionIdHash,
          messageId: String(messageIndex),
          vote,
          comment: null,
        }),
      });

      setFeedbackSent((prev) => ({ ...prev, [messageIndex]: true }));
    } catch (error) {
      console.error("Feedback-Fehler (Home):", error);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md rounded-xl bg-slate-800 p-4 shadow-lg flex flex-col gap-3">
      <div className="flex items-center justify-between">
  <div className="text-sm font-semibold">YJAR Chat assistent</div>

  <div className="flex gap-3">
    {/* SUPPORT BUTTON */}
    <button
      onClick={async () => {
        if (!sessionId) return;
        await fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            message: input.trim() || null,
          }),
        });

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Support-Ticket wurde erstellt. Unser Team meldet sich.",
          },
        ]);
      }}
      className="text-xs text-blue-600 hover:text-blue-800"
    >
      Support
    </button>

    {/* RESET BUTTON */}
    <button
      onClick={resetChat}
      className="text-xs text-gray-500 hover:text-black"
    >
      Neuer Chat
    </button>
  </div>
</div>


        <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto rounded-lg bg-slate-900 p-3 space-y-2 text-sm">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "text-right" : "text-left text-slate-200"}
            >
              <span
                className={
                  m.role === "user"
                    ? "inline-block bg-blue-600 text-white px-3 py-2 rounded-lg"
                    : "inline-block bg-slate-700 text-slate-50 px-3 py-2 rounded-lg"
                }
              >
                {m.content}
              </span>

              {m.role === "assistant" && (
                <div className="flex gap-2 mt-1 text-xs text-slate-400">
                  <button
                    className="hover:text-green-400 cursor-pointer disabled:cursor-default"
                    disabled={feedbackSent[i]}
                    onClick={() => sendFeedback(i, "up")}
                  >
                    👍
                  </button>

                  <button
                    className="hover:text-red-400 cursor-pointer disabled:cursor-default"
                    disabled={feedbackSent[i]}
                    onClick={() => sendFeedback(i, "down")}
                  >
                    👎
                  </button>

                  {feedbackSent[i] && (
                    <span className="text-green-500 ml-2">Danke!</span>
                  )}
                </div>
              )}
            </div>
          ))}

          {messages.length === 0 && (
            <div className="text-slate-400 text-center">
              Schreib eine erste Nachricht, um zu beginnen.
            </div>
          )}
        </div>

        {/* LEAD FORM */}
        {leadMode && !leadSubmitted && (
          <form
            onSubmit={handleLeadSubmit}
            className="flex flex-col gap-2 border border-blue-500 rounded-lg p-3 bg-slate-700 text-xs text-slate-100"
          >
            <div className="text-xs mb-1">
              Bitte geben Sie Ihren Namen und Ihre E-Mail-Adresse ein, damit
              sich unser Team schnellstmöglich bei Ihnen melden kann.
            </div>
            <input
              className="rounded bg-slate-800 border border-slate-600 px-2 py-1 text-xs"
              placeholder="Name"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
            />
            <input
              className="rounded bg-slate-800 border border-slate-600 px-2 py-1 text-xs"
              placeholder="E-Mail-Adresse"
              type="email"
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
            />
            {leadError && (
              <div className="text-red-400 text-[11px]">{leadError}</div>
            )}
            <button
              type="submit"
              disabled={leadLoading}
              className="self-start rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {leadLoading ? "Senden…" : "Absenden"}
            </button>
          </form>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Frag etwas…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "..." : "Senden"}
          </button>
        </form>
      </div>
    </main>
  );
}
