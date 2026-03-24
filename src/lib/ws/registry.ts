import { WebSocket } from 'ws'

// Registre en mémoire — partagé dans le même process Next.js
// userId → sockets actives

type Entry = {
    agentSocket: WebSocket | null  // socket du conteneur OpenClaw
    clientSocket: WebSocket | null  // socket du dashboard user
}

const registry = new Map<string, Entry>()

// ─── Enregistrement ───────────────────────────────────────────────────

export function registerAgent(userId: string, ws: WebSocket) {
    const entry = registry.get(userId) ?? { agentSocket: null, clientSocket: null }
    entry.agentSocket = ws
    registry.set(userId, entry)

    ws.on('close', () => {
        const e = registry.get(userId)
        if (e) { e.agentSocket = null }
        console.log(`[Registry] Agent déconnecté : ${userId}`)
    })

    console.log(`[Registry] Agent connecté : ${userId}`)
}

export function registerClient(userId: string, ws: WebSocket) {
    const entry = registry.get(userId) ?? { agentSocket: null, clientSocket: null }
    entry.clientSocket = ws
    registry.set(userId, entry)

    ws.on('close', () => {
        const e = registry.get(userId)
        if (e) { e.clientSocket = null }
        console.log(`[Registry] Client déconnecté : ${userId}`)
    })

    console.log(`[Registry] Client connecté : ${userId}`)
}

// ─── Envoi ────────────────────────────────────────────────────────────

// Backend → Dashboard du user (QR, statut, logs)
export function sendToClient(userId: string, data: object) {
    const entry = registry.get(userId)
    const ws = entry?.clientSocket

    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
        return true
    }
    return false
}

// Backend → Conteneur de l'agent (commandes)
export function sendToAgent(userId: string, data: object) {
    const entry = registry.get(userId)
    const ws = entry?.agentSocket

    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
        return true
    }
    return false
}

// ─── Utils ────────────────────────────────────────────────────────────

export function isAgentConnected(userId: string): boolean {
    const entry = registry.get(userId)
    return entry?.agentSocket?.readyState === WebSocket.OPEN
}

export function getStats() {
    let agents = 0, clients = 0
    registry.forEach(e => {
        if (e.agentSocket?.readyState === WebSocket.OPEN) agents++
        if (e.clientSocket?.readyState === WebSocket.OPEN) clients++
    })
    return { agents, clients, total: registry.size }
}