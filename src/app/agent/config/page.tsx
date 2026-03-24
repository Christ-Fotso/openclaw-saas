"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Bot, Terminal as TerminalIcon, Play, Loader2, CheckCircle, XCircle, Wifi } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

type LogLine = {
  text: string
  type: "system" | "success" | "error" | "info"
  ts: string
}

type DeployState = "idle" | "deploying" | "success" | "error"

// ─── Helpers ──────────────────────────────────────────────────────────

function toLogLine(text: string): LogLine {
  const ts = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  if (text.includes("[ERROR]")) return { text, type: "error", ts }
  if (text.includes("[SYSTEM]")) return { text, type: "system", ts }
  if (text.includes("✓") || text.includes("ready") || text.includes("connecté"))
    return { text, type: "success", ts }
  return { text, type: "info", ts }
}

// ─── Component ────────────────────────────────────────────────────────

export default function AgentConfigPage() {
  const router = useRouter()
  const { user } = useUser()

  const [name, setName] = useState("Mon Agent")
  const [state, setState] = useState<DeployState>("idle")
  const [logs, setLogs] = useState<LogLine[]>([])
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)
  const inactivityRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close()
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
    }
  }, [])

  function addLog(text: string) {
    setLogs(prev => [...prev, toLogLine(text)])
  }

  // ─── Connexion WebSocket au backend ───────────────────────────────
  function connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Connect directly to the custom WebSocket server on port 3001
      const wsUrl = `ws://localhost:3001?userId=${user?.id}&type=client`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        addLog("[SYSTEM] Canal sécurisé établi")
        resolve()
      }

      ws.onerror = () => {
        reject(new Error("WebSocket connection failed"))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          handleWsMessage(msg)
        } catch {
          addLog(event.data)
        }
      }

      ws.onclose = () => {
        addLog("[SYSTEM] Canal fermé")
      }
    })
  }

  // ─── Gestion des messages WebSocket ───────────────────────────────
  function handleWsMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case "AGENT_STATUS":
        if (msg.status === "ready") {
          addLog("[SYSTEM] ✓ Agent opérationnel")
          setState("success")
          setTimeout(() => router.push("/dashboard"), 2500)
        } else if (msg.status === "starting") {
          addLog("[SYSTEM] Agent en cours de démarrage...")
        }
        break

      case "WHATSAPP_QR":
        addLog("[SYSTEM] QR WhatsApp généré — rendez-vous sur le dashboard pour le scanner")
        setState("success")
        setTimeout(() => router.push("/dashboard"), 2000)
        break

      case "WHATSAPP_CONNECTED":
        addLog(`[SYSTEM] ✓ WhatsApp connecté`)
        break

      case "AGENT_ERROR":
        addLog(`[ERROR] ${msg.error}`)
        setState("error")
        setError(String(msg.error))
        break

      default:
        if (msg.message) addLog(String(msg.message))
    }
  }

  // ─── Handler principal ─────────────────────────────────────────────
  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault()
    setState("deploying")
    setError(null)
    setLogs([])

    addLog("[SYSTEM] Initialisation du déploiement...")

    try {
      // 1. Connecter WebSocket pour recevoir les logs en temps réel
      addLog("[SYSTEM] Connexion au canal sécurisé...")
      await connectWebSocket()

      // 2. Appeler l'API de démarrage de l'agent
      addLog("[SYSTEM] Provisionnement du conteneur...")
      const res = await fetch("/api/agent/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Erreur ${res.status}`)
      }

      addLog(`[SYSTEM] Conteneur créé — modèle LLM: ${data.model}`)
      addLog("[SYSTEM] Démarrage de l'agent OpenClaw...")

      // 3. Timeout de sécurité — si rien ne se passe après 60s
      inactivityRef.current = setTimeout(() => {
        if (state === "deploying") {
          addLog("[ERROR] Timeout — l'agent n'a pas répondu dans les 60 secondes")
          setState("error")
          setError("Timeout de démarrage")
        }
      }, 60_000)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue"
      addLog(`[ERROR] ${message}`)
      setState("error")
      setError(message)
    }
  }

  // ─── UI ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200">
      <div className="max-w-4xl mx-auto py-16 px-6 sm:px-12">

        {state === "idle" ? (

          // ── FORMULAIRE ──────────────────────────────────────────────
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-10 text-center">
              <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-400">
                <Bot className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
                Configure ton Agent
              </h1>
              <p className="text-slate-400 max-w-lg mx-auto text-lg">
                Donne un nom à ton agent. Il sera déployé sur le moteur OpenClaw avec Gemini AI.
              </p>
            </div>

            <form
              onSubmit={handleDeploy}
              className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">
                    Nom de l'agent
                  </label>
                  <input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Mon Agent"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                  />
                </div>

                {/* Info sur ce qui se passe */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-indigo-300 font-medium uppercase tracking-wider">Ce qui va se passer</p>
                  {[
                    "Un conteneur Docker isolé sera créé pour toi",
                    "Une clé Gemini AI sera assignée automatiquement",
                    "Tous les canaux seront activés (WhatsApp, Telegram...)",
                    "Tu devras scanner un QR WhatsApp une seule fois",
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-semibold py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Déployer l'agent
                </button>
              </div>
            </form>
          </div>

        ) : (

          // ── TERMINAL ────────────────────────────────────────────────
          <div className="animate-in zoom-in-95 duration-500 relative">

            {/* Glow effect pendant le déploiement */}
            {state === "deploying" && (
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-20 animate-pulse" />
            )}
            {state === "success" && (
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur opacity-20" />
            )}
            {state === "error" && (
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-red-700 rounded-3xl blur opacity-20" />
            )}

            <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative z-10">

              {/* Header terminal */}
              <div className="bg-black/40 border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex items-center gap-2 ml-4 text-slate-500 text-xs font-mono font-medium">
                    <TerminalIcon className="w-3.5 h-3.5" />
                    openclaw-engine ~ agent:{name}
                  </div>
                </div>

                {/* Indicateur de statut */}
                <div className="flex items-center gap-2 text-xs">
                  {state === "deploying" && (
                    <span className="flex items-center gap-1.5 text-indigo-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Déploiement...
                    </span>
                  )}
                  {state === "success" && (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle className="w-3 h-3" />
                      Succès
                    </span>
                  )}
                  {state === "error" && (
                    <span className="flex items-center gap-1.5 text-red-400">
                      <XCircle className="w-3 h-3" />
                      Erreur
                    </span>
                  )}
                </div>
              </div>

              {/* Corps du terminal */}
              <div className="p-6 font-mono text-sm h-[400px] overflow-y-auto flex flex-col gap-2">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="text-slate-600 shrink-0 select-none text-xs pt-0.5">
                      {log.ts}
                    </span>
                    <span className={
                      log.type === "error" ? "text-red-400" :
                        log.type === "success" ? "text-emerald-400" :
                          log.type === "system" ? "text-slate-400" :
                            "text-indigo-200"
                    }>
                      {log.text}
                    </span>
                  </div>
                ))}

                {/* Curseur clignotant */}
                {state === "deploying" && (
                  <div className="flex items-center gap-2 text-indigo-400 mt-1">
                    <Wifi className="w-3 h-3 animate-pulse" />
                    <span className="animate-pulse">En attente de l'agent...</span>
                  </div>
                )}

                {/* Message de succès */}
                {state === "success" && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    Agent déployé — redirection vers le dashboard...
                  </div>
                )}

                {/* Message d'erreur avec retry */}
                {state === "error" && error && (
                  <div className="mt-4 space-y-3">
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                      {error}
                    </div>
                    <button
                      onClick={() => setState("idle")}
                      className="w-full py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all text-sm"
                    >
                      Réessayer
                    </button>
                  </div>
                )}

                <div ref={terminalEndRef} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}