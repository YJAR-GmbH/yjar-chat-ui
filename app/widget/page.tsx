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
  const [input, setInput] = useState("");
  const [loadingSend, setLoadingSend] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setInput("");
    setLoadingSend(true);

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
      setLoadingSend(false);
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
  }

  const showEmptyPlaceholder =
    historyLoaded && messages.length === 0;

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
            </div>
          ))}

          {showEmptyPlaceholder && (
            <div className="text-gray-400 text-center">
              Schreib eine erste Nachricht, um zu beginnen.
            </div>
          )}
        </div>

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
