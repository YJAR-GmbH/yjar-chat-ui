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
  // state for "Neuer Chat"
  const [sessionId, setSessionId] = useState<string | null>(() => initSessionId());

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [botTyping, setBotTyping] = useState(false);


  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  

  // Lead
  const [leadMode, setLeadMode] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");           
  const [leadConsent, setLeadConsent] = useState(false);    
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadAskConfirm, setLeadAskConfirm] = useState(false); 
  const [showLeadPrivacy, setShowLeadPrivacy] = useState(false); 

  // Support
  const [supportMode, setSupportMode] = useState(false);
  const [supportDone, setSupportDone] = useState(false);
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");     
  const [supportConsent, setSupportConsent] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [showSupportPrivacy, setShowSupportPrivacy] = useState(false); 
  const [feedbackSent, setFeedbackSent] = useState(false);

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
    const normalized = text.toLowerCase();

        // Letzte Bot-Nachricht holen
        const lastAssistant =
        [...messages].reverse().find((m) => m.role === "assistant")?.content || "";
  
      // Prüfen, ob Bot zuvor nach Kontaktdaten gefragt hat
      const botAskedForContact =
        /Kontaktdaten/i.test(lastAssistant) ||
        (
          /E-?Mail/i.test(lastAssistant) &&
          /(Name|Namen|heißen|Kontaktaufnahme)/i.test(lastAssistant)
        );
  
    // Typische "Ja"-Antworten des Nutzers
    const userSaidYes =
      [
        "ja",
        "ja.",
        "ja!",
        "ja bitte",
        "ja, bitte",
        "ja gerne",
        "ja, gerne",
      ].includes(normalized);

    // Falls Bot nach Kontaktdaten gefragt hat und User "ja" schreibt,
    // Lead-Bestätigung (Ja/Nein-Block) erzwingen
    const forceLeadConfirm = botAskedForContact && userSaidYes;

    setLastUserMessage(text);

    setMessages((p) => [...p, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setBotTyping(true);


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

      // Wenn User explizit "ja" auf Kontaktdaten-Frage schreibt
      if (forceLeadConfirm) {
        setLeadAskConfirm(true);
        setLeadMode(false);
        setSupportMode(false);
        setLeadDone(false);
        return;
      }

      if (intent === "lead") {
        setLeadAskConfirm(true);
        setLeadMode(false);
        setSupportMode(false);
        setLeadDone(false);
      } else if (intent === "support") {
        setSupportMode(true);
        setLeadMode(false);
        setLeadAskConfirm(false);
        setSupportDone(false);
      } else {
        setLeadMode(false);
        setSupportMode(false);
        setLeadAskConfirm(false);
      }
    } catch (e) {
      console.error("Chat error", e);
    } finally {
      setLoading(false);
      setBotTyping(false);
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

    if (!leadConsent) {
      setLeadError("Bitte bestätigen Sie die Datenschutzerklärung.");
      return;
    }

    setLeadLoading(true);
    setLeadError(null);

    try {
      const hash = await hashId(sessionId);

           
    

      // Letzte User-Nachricht für den Titel finden
      const lastUser =
        [...messages].reverse().find((m) => m.role === "user")?.content ||
        lastUserMessage ||
        "";

      // Titel für Asana-Lead erzeugen
      const ticketTitle =
        "Lead: " +
        (lastUser ? lastUser.slice(0, 80) : "Neue Anfrage über Website");

     // Lead zusätzlich als Ticket an n8n/Asana senden
     await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionIdHash: hash,
        name: leadName.trim(),
        email: leadEmail.trim(),
        phone: leadPhone.trim() || null,
        message: lastUserMessage,
        lastMessages: messages.map((m) => {
          const prefix = m.role === "user" ? "User" : "Bot";
          return `${prefix}: ${m.content}`;
        }),
        ticketTitle,
        url: typeof window !== "undefined" ? window.location.href : null,
        consent: leadConsent,
        type: "lead", 
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

  // Kurz-Titel für ein Support-Ticket vom KI erzeugen
  async function generateShortTitle(message: string) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Erstelle einen sehr kurzen Titel für ein Support-Ticket (max. 4–6 Wörter): "${message}". Antworte nur mit dem Titel.`,
        sessionId: "support-title-generator",
      }),
    });

    const data = await res.json();
    return data.answer?.replace(/\n/g, "").trim() || "Support Anfrage";
  }

  async function submitSupport(e: FormEvent) {
    e.preventDefault();
    if (!sessionId) return;

    // Name ist Pflicht, außerdem mindestens E-Mail ODER Telefon
    if (!supportName.trim() || (!supportEmail.trim() && !supportPhone.trim())) {
      setSupportError("Bitte Name und E-Mail oder Telefonnummer eingeben.");
      return;
    }

    if (!supportConsent) {
      setSupportError("Bitte bestätigen Sie die Datenschutzerklärung.");
      return;
    }

    setSupportLoading(true);
    setSupportError(null);

    try {
      const hash = await hashId(sessionId);

      // Letzte User-Nachricht suchen
      const lastUser =
        [...messages].reverse().find((m) => m.role === "user")?.content ||
        lastUserMessage ||
        "";

      // Titel vom KI generieren lassen
      const aiTitle = await generateShortTitle(lastUser);

      // Finaler Titel + Name
      const ticketTitle = `${aiTitle}, ${supportName.trim()}`;

      // Letzte Chat-Nachrichten für das Ticket vorbereiten (z.B. letzte 6 Einträge)
      const lastMessagesPayload = messages
        .slice(-6)
        .map((m) => `${m.role === "user" ? "User" : "Bot"}: ${m.content}`);

      // Aktuelle URL der Seite (optional)
      const currentUrl =
        typeof window !== "undefined" ? window.location.href : null;

        await fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionIdHash: hash,
            name: supportName.trim(),
            email: supportEmail.trim() || null,
            phone: supportPhone.trim() || null,
            message: lastUserMessage,
            lastMessages: lastMessagesPayload,
            url: currentUrl,
            ticketTitle,
            consent: supportConsent,
            type: "support", 
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

  // Feedback (Daumen hoch / runter) an /api/feedback senden
  async function sendFeedback(vote: "up" | "down") {
    if (!sessionId || feedbackSent) return;

    try {
      const hash = await hashId(sessionId);

      const lastAssistant =
        [...messages].reverse().find((m) => m.role === "assistant")
          ?.content || null;

      const lastUser =
        [...messages].reverse().find((m) => m.role === "user")?.content ||
        lastUserMessage ||
        null;

      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionIdHash: hash,
          vote,
          userMessage: lastUser,
          botAnswer: lastAssistant,
        }),
      });

      setFeedbackSent(true);
    } catch (err) {
      console.error("Feedback error", err);
    }
  }


  function handleLeadConfirmYes() {
    setLeadAskConfirm(false);
    setLeadMode(true);
    setMessages((p) => [
      ...p,
      {
        role: "assistant",
        content:
          "Gerne, bitte füllen Sie kurz das Formular aus, damit wir Sie kontaktieren können.",
      },
    ]);
  }

  function handleLeadConfirmNo() {
    setLeadAskConfirm(false);
    setLeadMode(false);
    setMessages((p) => [
      ...p,
      {
        role: "assistant",
        content:
          "Alles klar, ich helfe Ihnen gerne hier im Chat weiter. Stellen Sie mir einfach Ihre Fragen.",
      },
    ]);
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
    setLeadPhone("");
    setLeadConsent(false);
    setLeadError(null);
    setLeadLoading(false);
    setLeadAskConfirm(false);

    setSupportMode(false);
    setSupportDone(false);
    setSupportName("");
    setSupportEmail("");
    setSupportPhone("");
    setSupportConsent(false);
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
        
        {botTyping && (
          <div className="mt-1">
            <span className="inline-block bg-slate-700 text-white px-3 py-2 rounded-lg text-xs opacity-80">
              Assistent schreibt …
            </span>
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center opacity-60">
            Schreib eine erste Nachricht, um zu beginnen.
          </div>
        )}
      </div>


            {/* FEEDBACK – Daumen hoch / runter */}
            {messages.length > 0 && !feedbackSent && (
        <div className="flex items-center justify-end gap-2 text-xs opacity-80">
          <span>Feedback:</span>
          <button
            type="button"
            onClick={() => sendFeedback("up")}
            className="px-2 py-1 hover:bg-slate-700"
          >
            👍
          </button>
          <button
            type="button"
            onClick={() => sendFeedback("down")}
            className="px-2 py-1 hover:bg-slate-700"
          >
            👎
          </button>
        </div>
      )}


            {/* LEAD CONFIRMATION (Ja/Nein) */}
            {leadAskConfirm && !leadDone && (
        <div className={formContainerClasses}>
          <p className="text-xs">
            Möchten Sie mit einem unserer Spezialisten sprechen? Wir können Ihre
            Kontaktdaten aufnehmen und melden uns persönlich bei Ihnen.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleLeadConfirmYes}
              className="rounded bg-blue-600 text-white px-3 py-1 text-xs"
            >
              Ja, ich möchte Kontakt
            </button>
            <button
              type="button"
              onClick={handleLeadConfirmNo}
              className="rounded border px-3 py-1 text-xs"
            >
              Nein, jetzt nicht
            </button>
          </div>
        </div>
      )}


      {/* LEAD FORM */}
      {leadMode && !leadDone && (
        <>
          <form onSubmit={submitLead} className={formContainerClasses}>
            <input
              className={formInputClasses}
              placeholder="Name"
              value={leadName}
              onChange={(e) => {
                setLeadName(e.target.value);
                if (leadError) setLeadError(null);
              }}
            />
            <input
              className={formInputClasses}
              placeholder="E-Mail"
              value={leadEmail}
              onChange={(e) => {
                setLeadEmail(e.target.value);
                if (leadError) setLeadError(null);
              }}
            />
            <input
              className={formInputClasses}
              placeholder="Telefon (optional)"
              value={leadPhone}
              onChange={(e) => {
                setLeadPhone(e.target.value);
                if (leadError) setLeadError(null);
              }}
            />

            <label className="flex items-center gap-2 text-[11px] leading-snug">
              {/* DSGVO Checkbox (Lead) */}
              <input
                type="checkbox"
                checked={leadConsent}
                onChange={(e) => {
                  setLeadConsent(e.target.checked);
                  if (leadError) setLeadError(null);
                }}
              />
              <span>
                Ich akzeptiere die{" "}
                <button
                  type="button"
                  onClick={() => setShowLeadPrivacy(true)}
                  className="underline text-blue-400 hover:text-blue-500"
                >
                  Datenschutzhinweise
                </button>{" "}
                und bin mit der Verarbeitung meiner Daten einverstanden.
              </span>
            </label>

            {leadError && <div className="text-red-400">{leadError}</div>}

            <button
              disabled={leadLoading}
              className="rounded bg-blue-600 text-white px-3 py-1 disabled:opacity-50"
            >
              {leadLoading ? "Senden…" : "Absenden"}
            </button>
          </form>

          {/* Modal für Datenschutz (Lead) */}
          {showLeadPrivacy && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div
                className={
                  "max-w-sm w-full p-4 rounded-lg text-[10px] leading-snug " +
                  (isDark ? "bg-slate-800 text-slate-50" : "bg-white text-black")
                }
              >
                <div className="max-h-64 overflow-y-auto space-y-2">
                  <p>
                    Die von mir in diesem Formular angegebenen personenbezogenen Daten
                    (z. B. Name, E-Mail-Adresse, Telefonnummer sowie Inhalte meiner
                    Anfrage) werden von der YJAR GmbH erhoben, gespeichert und
                    verarbeitet, um meine Anfrage zu bearbeiten, mit mir Kontakt
                    aufzunehmen und mir passende Informationen, Angebote oder
                    Rückfragen zukommen zu lassen.
                  </p>
                  <p>
                    Eine Weitergabe meiner Daten an Dritte zu Werbe- oder
                    Vertriebszwecken findet nicht statt. Eine Übermittlung erfolgt
                    nur, wenn dies zur Erfüllung meiner Anfrage erforderlich ist
                    (z. B. im Rahmen der technischen Verarbeitung) oder eine
                    gesetzliche Verpflichtung besteht.
                  </p>
                  <p>
                    Meine Daten werden nur so lange gespeichert, wie es für die
                    Bearbeitung meiner Anfrage und eine anschließende Kommunikation
                    erforderlich ist oder gesetzliche Aufbewahrungspflichten
                    bestehen. Danach werden sie gelöscht oder anonymisiert.
                  </p>
                  <p>
                    Ich kann meine Einwilligung zur Verarbeitung meiner
                    personenbezogenen Daten jederzeit mit Wirkung für die Zukunft
                    widerrufen, zum Beispiel per E-Mail oder über die im Impressum
                    genannten Kontaktdaten. Im Falle eines Widerrufs wird meine
                    Anfrage nicht weiter bearbeitet und die Daten – soweit keine
                    gesetzlichen Pflichten entgegenstehen – gelöscht.
                  </p>
                  <p>
                    Weitere Informationen zum Umgang mit personenbezogenen Daten
                    sowie zu meinen Rechten (Auskunft, Berichtigung, Löschung,
                    Einschränkung der Verarbeitung, Widerspruch, Datenübertragbarkeit)
                    finde ich in der vollständigen Datenschutzerklärung auf der
                    Website der YJAR GmbH.
                  </p>
                </div>

                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    className="px-3 py-1 border rounded text-[11px]"
                    onClick={() => setShowLeadPrivacy(false)}
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}


      {/* SUPPORT FORM */}
      {supportMode && !supportDone && (
        <>
          <form onSubmit={submitSupport} className={formContainerClasses}>
            <p className="text-xs">
              Bitte füllen Sie Ihre Kontaktdaten aus, damit unser Support-Team
              sich schnellstmöglich bei Ihnen melden kann.
            </p>

            <input
              className={formInputClasses}
              placeholder="Name"
              value={supportName}
              onChange={(e) => {
                setSupportName(e.target.value);
                if (supportError) setSupportError(null);
              }}
            />

            <input
              className={formInputClasses}
              placeholder="E-Mail (optional)"
              value={supportEmail}
              onChange={(e) => {
                setSupportEmail(e.target.value);
                if (supportError) setSupportError(null);
              }}
            />

            <input
              className={formInputClasses}
              placeholder="Telefon (optional)"
              value={supportPhone}
              onChange={(e) => {
                setSupportPhone(e.target.value);
                if (supportError) setSupportError(null);
              }}
            />

            <label className="flex items-center gap-2 text-[11px] leading-snug">
              {/* DSGVO Checkbox Support */}
              <input
                type="checkbox"
                checked={supportConsent}
                onChange={(e) => {
                  setSupportConsent(e.target.checked);
                  if (supportError) setSupportError(null);
                }}
              />

              <span>
                Ich akzeptiere die{" "}
                <button
                  type="button"
                  onClick={() => setShowSupportPrivacy(true)}
                  className="underline text-blue-400 hover:text-blue-500"
                >
                  Datenschutzhinweise
                </button>{" "}
                und bin mit der Verarbeitung meiner Daten einverstanden.
              </span>
            </label>

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

          {/* Modal für Datenschutz (Support) */}
          {showSupportPrivacy && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div
                className={
                  "max-w-sm w-full p-4 rounded-lg text-[10px] leading-snug " +
                  (isDark ? "bg-slate-800 text-slate-50" : "bg-white text-black")
                }
              >
                <div className="max-h-64 overflow-y-auto space-y-2">
                  <p>
                    Die von mir im Support-Formular angegebenen personenbezogenen
                    Daten (Name, E-Mail, Telefonnummer sowie Inhalte meiner
                    Support-Anfrage) werden von der YJAR GmbH erhoben,
                    gespeichert und verarbeitet, um mein Anliegen zu bearbeiten,
                    technische Unterstützung zu leisten und mich zu Rückfragen
                    oder Lösungswegen zu kontaktieren.
                  </p>
                  <p>
                    Eine Weitergabe meiner Daten an Dritte erfolgt nicht, außer
                    es ist zwingend zur Bearbeitung meiner Support-Anfrage
                    notwendig (z. B. technische Dienstleister im Rahmen der
                    Auftragsverarbeitung) oder gesetzlich vorgeschrieben.
                  </p>
                  <p>
                    Die Daten werden nur so lange gespeichert, wie dies für die
                    Bearbeitung des Support-Falls erforderlich ist oder gesetzliche
                    Aufbewahrungspflichten bestehen. Danach erfolgt eine Löschung
                    oder Anonymisierung.
                  </p>
                  <p>
                    Ich kann meine Einwilligung jederzeit mit Wirkung für die
                    Zukunft widerrufen. Ein Widerruf kann dazu führen, dass der
                    Support-Fall nicht weiter bearbeitet werden kann. Die
                    Kontaktdaten für den Widerruf finden sich im Impressum der
                    YJAR GmbH.
                  </p>
                  <p>
                    Weitere Informationen zu meinen Rechten (Auskunft,
                    Löschung, Einschränkung, Widerspruch, Datenübertragbarkeit)
                    befinden sich in der vollständigen Datenschutzerklärung auf
                    der Website der YJAR GmbH.
                  </p>
                </div>

                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    className="px-3 py-1 border rounded text-[11px]"
                    onClick={() => setShowSupportPrivacy(false)}
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
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
