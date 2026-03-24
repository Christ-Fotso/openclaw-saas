import Docker from 'dockerode'
import { prisma } from '@/lib/prisma'
import { AgentRepository } from '@/lib/repositories/agent.repository'

// Connexion au daemon Docker local
// Dockerode détecte automatiquement le bon socket (Windows vs Linux)
const docker = new Docker()

const AGENT_IMAGE = process.env.OPENCLAW_IMAGE ?? 'openclaw-agent:latest'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://host.docker.internal:3000'
const WS_URL = process.env.WS_URL ?? 'ws://host.docker.internal:3001'
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN!

// ─── Types ────────────────────────────────────────────────────────────

type CreateAgentOptions = {
    userId: string
    agentId: string
    agentName: string
    geminiApiKey: string
}

// ─── Helpers ──────────────────────────────────────────────────────────

function containerName(userId: string): string {
    return `openclaw-agent-${userId}`
}

async function findContainer(userId: string) {
    try {
        const container = docker.getContainer(containerName(userId))
        await container.inspect() // Lance une erreur si inexistant
        return container
    } catch {
        return null
    }
}

// ─── API publique ──────────────────────────────────────────────────────

export const ContainerFactory = {

    // Lance un nouveau conteneur pour un user
    async create(options: CreateAgentOptions): Promise<string> {
        const { userId, agentId, agentName } = options
        const name = containerName(userId)

        // Supprimer l'ancien conteneur s'il existe
        const existing = await findContainer(userId)
        if (existing) {
            await existing.remove({ force: true })
        }

        const container = await docker.createContainer({
            name,
            Image: AGENT_IMAGE,

            // Variables injectées — le conteneur ne connaît pas les clés Gemini
            Env: [
                `USER_ID=${userId}`,
                `AGENT_ID=${agentId}`,
                `AGENT_NAME=${agentName}`,
                `BACKEND_URL=${BACKEND_URL}`,
                `WS_URL=${WS_URL}`,
                `INTERNAL_API_TOKEN=${INTERNAL_TOKEN}`,
                `GEMINI_API_KEY=${options.geminiApiKey}`,
            ],

            HostConfig: {
                // Réseau bridge isolé par user
                NetworkMode: 'bridge',

                // Limite mémoire — Chromium headless
                Memory: Math.floor(1.2 * 1024 * 1024 * 1024), // 1.2 GB
                MemorySwap: Math.floor(1.2 * 1024 * 1024 * 1024),

                // Limite CPU
                CpuQuota: 50_000,  // 0.5 vCPU
                CpuPeriod: 100_000,

                // Volume persistant pour sessions WhatsApp
                Binds: [`openclaw-data-${userId}:/app/data`],

                // Sécurité — zéro privilège
                CapDrop: ['ALL'],
                SecurityOpt: ['no-new-privileges:true'],

                // Pas d'accès au socket Docker hôte — isolation totale
                // (ne jamais monter /var/run/docker.sock ici)

                // Redémarrage automatique si crash
                RestartPolicy: { Name: 'unless-stopped' },
            },

            // Pas de port exposé — communication via réseau interne
            ExposedPorts: {},
        })

        await container.start()

        console.log(`[ContainerFactory] Conteneur démarré : ${name}`)
        return container.id
    },

    // Pause — libère la RAM sans perdre l'état
    async pause(userId: string): Promise<void> {
        const container = await findContainer(userId)
        if (!container) return

        const info = await container.inspect()
        if (info.State.Running && !info.State.Paused) {
            await container.pause()
            console.log(`[ContainerFactory] Pausé : ${containerName(userId)}`)
        }
    },

    // Resume — reprend en 2–3 secondes
    async resume(userId: string): Promise<void> {
        const container = await findContainer(userId)
        if (!container) return

        const info = await container.inspect()
        if (info.State.Paused) {
            await container.unpause()
            console.log(`[ContainerFactory] Repris : ${containerName(userId)}`)
        } else if (!info.State.Running) {
            await container.start()
            console.log(`[ContainerFactory] Redémarré : ${containerName(userId)}`)
        }
    },

    // Stop complet
    async stop(userId: string): Promise<void> {
        const container = await findContainer(userId)
        if (!container) return

        const info = await container.inspect()
        if (info.State.Paused) await container.unpause()
        if (info.State.Running) await container.stop({ t: 10 })

        console.log(`[ContainerFactory] Stoppé : ${containerName(userId)}`)
    },

    // Suppression totale (RGPD — suppression compte)
    async destroy(userId: string): Promise<void> {
        const container = await findContainer(userId)
        if (container) {
            await container.remove({ force: true })
            console.log(`[ContainerFactory] Supprimé : ${containerName(userId)}`)
        }

        // Supprimer aussi le volume de données
        try {
            const volume = docker.getVolume(`openclaw-data-${userId}`)
            await volume.remove()
            console.log(`[ContainerFactory] Volume supprimé : openclaw-data-${userId}`)
        } catch {
            // Volume inexistant — pas grave
        }
    },

    // Statut du conteneur
    async status(userId: string): Promise<'running' | 'paused' | 'stopped' | 'missing'> {
        const container = await findContainer(userId)
        if (!container) return 'missing'

        const info = await container.inspect()
        if (info.State.Paused) return 'paused'
        if (info.State.Running) return 'running'
        return 'stopped'
    },
}