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

  // sessionId с TTL 48 часов
  useEffect(() => {
    const id = initSessionId();
    if (id) setSessionId(id);
  }, []);

  // загрузка истории
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

  // отправка сообщения
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const userText = input.trim();

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

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch (e) {
      console.error("Chat error", e);
    } finally {
      setLoading(false);
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
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md rounded-xl bg-slate-800 p-4 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-50 text-lg">
            YJAR Chat assistent
          </div>
          <button
            onClick={resetChat}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Neuer Chat starten
          </button>
        </div>

        <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto rounded-lg bg-slate-900 p-3 space-y-2 text-sm">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "text-right"
                  : "text-left text-slate-200"
              }
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
            </div>
          ))}

          {messages.length === 0 && (
            <div className="text-slate-400 text-center">
              Schreib eine erste Nachricht, um zu beginnen.
            </div>
          )}
        </div>

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
