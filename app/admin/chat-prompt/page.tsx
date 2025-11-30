"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ChatPromptAdminPage() {
  const [token, setToken] = useState("");
  const [storedToken, setStoredToken] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPrompt = useCallback(async (tokenValue: string) => {
    if (!API_BASE) {
      setError("NEXT_PUBLIC_API_BASE_URL ist nicht gesetzt");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/prompt`, {
        method: "GET",
        headers: {
          "x-admin-token": tokenValue,
        },
      });

      if (!res.ok) {
        throw new Error("Unauthorized oder Fehler beim Laden");
      }

      const data = await res.json();
      setPrompt(data.prompt || "");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Unbekannter Fehler beim Laden des Prompts");
      }
      setPrompt("");
    } finally {
      setLoading(false);
    }
  }, []);

  // gespeicherten Token laden
  useEffect(() => {
    const t = localStorage.getItem("admin_prompt_token");
    if (t) {
      setStoredToken(t);
      setToken(t);
      fetchPrompt(t);
    }
  }, [fetchPrompt]);

  function handleTokenSave() {
    localStorage.setItem("admin_prompt_token", token);
    setStoredToken(token);
    setMessage(null);
    setError(null);
    fetchPrompt(token);
  }

  function handleLogout() {
    localStorage.removeItem("admin_prompt_token");
    setToken("");
    setStoredToken("");
    setPrompt("");
    setError(null);
    setMessage(null);
  }

  async function savePrompt() {
    if (!API_BASE) {
      setError("NEXT_PUBLIC_API_BASE_URL ist nicht gesetzt");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": storedToken,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error("Fehler beim Speichern");
      }

      setMessage("Gespeichert.");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Unbekannter Fehler beim Speichern");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-semibold">YJAR Chat – Prompt Editor</h1>

        {/* TOKEN LOGIN */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Admin Token</label>
          <div className="flex gap-2">
            <input
              type="password"
              className="flex-1 rounded-md border border-slate-600 bg-slate-800 p-2 text-sm"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <button
              type="button"
              onClick={handleTokenSave}
              className="px-4 py-2 rounded-md bg-blue-600 text-sm font-medium"
            >
              Login
            </button>
            {storedToken && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 rounded-md border border-red-500 text-red-300 text-sm font-medium"
              >
                Logout
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Der Token wird nur lokal im Browser gespeichert.
          </p>
        </div>

        {loading && <p>Prompt wird geladen…</p>}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* PROMPT EDITOR */}
        {storedToken && !loading && (
          <div className="space-y-4">
            <label className="block text-sm font-medium">System Prompt</label>

            <textarea
              className="w-full h-[600px] rounded-md border border-slate-600 bg-slate-800 p-3 text-sm font-mono"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setMessage(null);
              }}
            />

            <button
              type="button"
              onClick={savePrompt}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-emerald-600 disabled:opacity-50"
            >
              {saving ? "Speichern…" : "Speichern"}
            </button>

            {message && (
              <p className="text-emerald-400 text-sm">{message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
