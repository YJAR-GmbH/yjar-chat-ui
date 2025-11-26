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

export default function Widget() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  // 🇩 Speichert, für welche Messages bereits ein Feedback gesendet wurde
  const [feedbackSent, setFeedbackSent] = useState<Record<number, boolean>>({});

  const [input, setInput] = useState("");
  const [loadingSend, setLoadingSend] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // 🇩 Lead-Status
  const [leadMode, setLeadMode] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  // init / restore session
  useEffect(() => {
    const id = initSessionId();
    if (id) setSessionId(id);
  }, []);

  // load history
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    setHistoryLoaded(false);

    (async () => {
      try {
        const res = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) {
          console.error("Failed to load history, status:", res.status);
          if (!cancelled) {
            setMessages([]);
            setHistoryLoaded(true);
          }
          return;
        }

        const data = await res.json();
        const history: Message[] = Array.isArray(data.messages)
          ? data.messages
          : [];

        if (!cancelled) {
          setMessages(history);
          setHistoryLoaded(true);
        }
      } catch (e) {
        console.error("Failed to load history", e);
        if (!cancelled) {
          setMessages([]);
          setHistoryLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // 🇩 Nachricht an Chat-API senden
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const userText = input.trim();
    setLastUserMessage(userText);
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setInput("");
    setLoadingSend(true);
    setLeadError(null);

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

      // 🇩 Lead-Intent erkennen → Formular anzeigen
      if (intent === "lead") {
        setLeadMode(true);
        setLeadSubmitted(false);
      } else {
        setLeadMode(false);
      }
    } catch (e) {
      console.error("Chat error", e);
    } finally {
      setLoadingSend(false);
    }
  }

  // 🇩 Lead-Formular absenden
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

      // Session-ID hashen (wie beim Feedback)
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

      // Kleine Bestätigungsnachricht im Chat anzeigen
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Vielen Dank! Unser Team meldet sich schnellstmöglich bei Ihnen.",
        },
      ]);
    } catch (error) {
      console.error("Lead-Fehler:", error);
      setLeadError("Beim Senden ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.");
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
    setHistoryLoaded(true);
    setLeadMode(false);
    setLeadSubmitted(false);
    setLeadName("");
    setLeadEmail("");
    setLeadError(null);
  }

  const showEmptyPlaceholder = historyLoaded && messages.length === 0;

  // 🇩Sendet Feedback (Daumen hoch / runter) an das Backend
  async function sendFeedback(messageIndex: number, vote: "up" | "down") {
    try {
      const message = messages[messageIndex];
      if (!message || message.role !== "assistant") return;
      if (!sessionId) return;

      // 🇩 Hash des Session-IDs erzeugen (Browser darf echte ID nicht senden)
      const encoder = new TextEncoder();
      const data = encoder.encode(sessionId);
      const digest = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(digest));
      const sessionIdHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // 🇩 Request an UI-Proxy → yjar-chat-api → feedback
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionIdHash,
          messageId: String(messageIndex), // 🇩🇪 wir nutzen Index als messageId
          vote,
          comment: null,
        }),
      });

      // 🇩Merken, dass Feedback abgeschickt wurde → Buttons disabled
      setFeedbackSent((prev) => ({ ...prev, [messageIndex]: true }));
    } catch (error) {
      console.error("Feedback-Fehler:", error);
    }
  }

  return (
    <div className="w-full h-full bg-white text-black p-3">
      <div className="flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">YJAR Chat assistent</div>
          <button
            onClick={resetChat}
            className="text-xs text-gray-500 hover:text-black"
          >
            Neuer Chat
          </button>
        </div>

        <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto rounded border border-gray-200 p-3 space-y-2 text-sm bg-gray-50">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <span
                className={
                  m.role === "user"
                    ? "inline-block bg-blue-600 text-white px-3 py-2 rounded-lg"
                    : "inline-block bg-gray-200 text-black px-3 py-2 rounded-lg"
                }
              >
                {m.content}
              </span>

              {/* 🇩 Feedback-Buttons nur für Antworten des Assistenten */}
              {m.role === "assistant" && (
                <div className="flex gap-2 mt-1 text-xs text-gray-500">
                  <button
                    className="hover:text-green-600 cursor-pointer disabled:cursor-default"
                    disabled={feedbackSent[i]}
                    onClick={() => sendFeedback(i, "up")}
                  >
                    👍
                  </button>

                  <button
                    className="hover:text-red-600 cursor-pointer disabled:cursor-default"
                    disabled={feedbackSent[i]}
                    onClick={() => sendFeedback(i, "down")}
                  >
                    👎
                  </button>

                  {/* 🇩 Nach dem Senden eine kleine Bestätigung anzeigen */}
                  {feedbackSent[i] && (
                    <span className="text-green-700 ml-2">Danke!</span>
                  )}
                </div>
              )}
            </div>
          ))}

          {showEmptyPlaceholder && (
            <div className="text-gray-400 text-center">
              Schreib eine erste Nachricht, um zu beginnen.
            </div>
          )}
        </div>

        {/* 🇩 Lead-Formular bei Intent "lead" */}
        {leadMode && !leadSubmitted && (
          <form
            onSubmit={handleLeadSubmit}
            className="flex flex-col gap-2 border border-blue-200 rounded p-3 bg-blue-50 text-xs"
          >
            <div className="text-xs text-gray-800 mb-1">
              Bitte geben Sie Ihren Namen und Ihre E-Mail-Adresse ein, damit
              sich unser Team schnellstmöglich bei Ihnen melden kann.
            </div>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-xs"
              placeholder="Name"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-xs"
              placeholder="E-Mail-Adresse"
              type="email"
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
            />
            {leadError && (
              <div className="text-red-600 text-[11px]">{leadError}</div>
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
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Frag etwas …"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loadingSend || !input.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loadingSend ? "..." : "Senden"}
          </button>
        </form>
      </div>
    </div>
  );
}
