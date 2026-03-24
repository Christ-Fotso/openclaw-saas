import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { registerAgent, registerClient, sendToClient } from './src/lib/ws/registry'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const WS_PORT = 3001

const server = createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket, req: any) => {
    const url = new URL(req.url!, `http://localhost:${WS_PORT}`)
    const userId = url.searchParams.get('userId')
    const token = url.searchParams.get('token')
    const type = url.searchParams.get('type')

    if (!userId) {
        ws.close(4001, 'userId manquant')
        return
    }

    if (type === 'agent') {
        if (token !== process.env.INTERNAL_API_TOKEN) {
            ws.close(4003, 'Token invalide')
            return
        }
        registerAgent(userId, ws)
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString())
                sendToClient(userId, msg)
            } catch { }
        })
        console.log(`[WS] Agent connecté : ${userId}`)
        return
    }

    // type === 'client' — dashboard
    registerClient(userId, ws)
    console.log(`[WS] Client connecté : ${userId}`)
})

server.listen(WS_PORT, () => {
    console.log(`[WS] Serveur WebSocket sur ws://localhost:${WS_PORT}`)
})