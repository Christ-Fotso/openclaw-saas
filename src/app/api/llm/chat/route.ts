import { NextRequest, NextResponse } from 'next/server'
import { getAvailableSlot, releaseSlot } from '@/lib/factories/gemini-key-rotator'

export async function POST(req: NextRequest) {
    // 1. Vérifier le token interne (seuls les conteneurs autorisés)
    const authHeader = req.headers.get('x-internal-token')
    if (authHeader !== process.env.INTERNAL_API_TOKEN) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // 2. Récupérer le slot disponible
    const slot = getAvailableSlot()
    if (!slot) {
        return NextResponse.json(
            { error: 'Capacité LLM saturée, réessaie dans 60s' },
            { status: 503 }
        )
    }

    // 3. Récupérer le body du conteneur
    const { messages, systemPrompt } = await req.json()

    try {
        // 4. Appeler Gemini avec la clé choisie par le rotator
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${slot.model}:generateContent?key=${slot.key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: messages,
                }),
            }
        )

        if (!response.ok) {
            // Libérer le slot si Gemini retourne une erreur
            releaseSlot(slot)
            const err = await response.json()
            return NextResponse.json({ error: err }, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json({
            text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
            model: slot.model, // pour debug
        })

    } catch (error) {
        releaseSlot(slot)
        return NextResponse.json({ error: 'Erreur réseau' }, { status: 500 })
    }
}