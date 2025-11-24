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

// этот ключ должен быть задан в .env.local как NEXT_PUBLIC_INTERNAL_API_KEY
const INTERNAL_API_KEY = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;

function initSessionId(): string | null {
  if (typeof window === "undefined") return null;

  const now = Date.now();
  const ttlMs = TTL_HOURS * 60 * 60 * 1000;

  const storedId = window.localStorage.getItem(SESSION_KEY);
  const storedCreatedAt = window.localStorage.getItem(
    SESSION_CREATED_AT_KEY
  );

  if (storedId && storedCreatedAt) {
    const createdAt = Number(storedCreatedAt);
    if (!Number.isNaN(createdAt) && now - createdAt < ttlMs) {
      // старая сессия ещё жива
      return storedId;
    }
  }

  // TTL вышел или ничего нет → создаём новую
  const newId = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, newId);
  window.localStorage.setItem(SESSION_CREATED_AT_KEY, String(now));
  return newId;
}

export default function Widget() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // инициализация sessionId
  useEffect(() => {
    const id = initSessionId();
    if (id) setSessionId(id);
  }, []);

  // загрузка истории из БД по sessionId
  useEffect(() => {
    if (!sessionId) return;

    if (!INTERNAL_API_KEY) {
      console.error("NEXT_PUBLIC_INTERNAL_API_KEY не задан");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": INTERNAL_API_KEY,
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) {
          console.error("History load failed", res.status);
          return;
        }

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    if (!INTERNAL_API_KEY) {
      console.error("NEXT_PUBLIC_INTERNAL_API_KEY не задан");
      return;
    }

    const userText = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": INTERNAL_API_KEY,
        },
        body: JSON.stringify({ message: userText, sessionId }),
      });

      if (!res.ok) {
        console.error("Chat request failed", res.status);
        return;
      }

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
    <div className="w-full h-full bg-white text-black p-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">YJAR Chat</div>
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

          {messages.length === 0 && (
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
            disabled={loading || !input.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "..." : "Senden"}
          </button>
        </form>
      </div>
    </div>
  );
}
