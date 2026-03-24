import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { AgentRepository } from '@/lib/repositories/agent.repository'
import { UserRepository } from '@/lib/repositories/user.repository'
import { getAvailableSlot } from '@/lib/factories/gemini-key-rotator'
import { ContainerFactory } from '@/lib/factories/container.factory'

export async function POST(req: NextRequest) {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const user = await UserRepository.findByClerkId(clerkId)
    if (!user) return NextResponse.json({ error: 'User introuvable' }, { status: 404 })

    const existing = await AgentRepository.findByUserId(user.id)
    // if (existing?.isActive) return NextResponse.json({ error: 'Agent déjà actif' }, { status: 409 })

    const { name } = await req.json()

    const slot = getAvailableSlot()
    if (!slot) return NextResponse.json({ error: 'Capacité LLM saturée' }, { status: 503 })

    const agent = existing ?? await AgentRepository.create({
        userId: user.id,
        name: name || 'Mon Agent',
    })

    await AgentRepository.setActive(agent.id, true)

    // ✅ Lancer le conteneur Docker
    try {
        const containerId = await ContainerFactory.create({
            userId: user.id,
            agentId: agent.id,
            agentName: agent.name,
            geminiApiKey: slot.apiKey,  // ← injecter la clé Gemini
        })

        await AgentRepository.setContainerId(agent.id, containerId)

    } catch (err: any) {
        await AgentRepository.setActive(agent.id, false)
        console.error('[agent/start] Docker error:', err.message)
        return NextResponse.json({ error: 'Échec lancement conteneur' }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        agentId: agent.id,
        model: slot.model,
    })
}