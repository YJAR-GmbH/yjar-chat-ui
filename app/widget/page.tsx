"use client";

import { useEffect, useState, FormEvent } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type HistoryItem = {
  sessionId: string;
  userMessage: string;
  botAnswer: string;
  createdAt: string;
};

export default function Widget() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let id = window.localStorage.getItem("yjar_chat_session_id");
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem("yjar_chat_session_id", id);
    }
    setSessionId(id);
  }, []);

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

        const history: Message[] = data.messages.flatMap(
          (m: HistoryItem): Message[] => [
            { role: "user", content: m.userMessage },
            { role: "assistant", content: m.botAnswer },
          ]
        );

        setMessages(history);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    })();
  }, [sessionId]);

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

  return (
    <div className="w-full h-full bg-white text-black p-3">
      <div className="flex flex-col gap-3">
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
