const MODELS = [
    { name: 'gemini-3.1-flash-lite', rpm: 15, rpd: 500, priority: 1 },
    { name: 'gemini-3-flash', rpm: 5, rpd: 20, priority: 2 },
    { name: 'gemma-3-27b', rpm: 30, rpd: 14_400, priority: 3 },
] as const

function getKeys(): string[] {
    return [
        process.env.GEMINI_API_KEY_1,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY_4,
        process.env.GEMINI_API_KEY_5,
        process.env.GEMINI_API_KEY_6,
        process.env.GEMINI_API_KEY_7,
        process.env.GEMINI_API_KEY_8,
    ].filter(Boolean) as string[]
}

type Counter = {
    rpm: { count: number; resetAt: number }
    rpd: { count: number; resetAt: number }
}

// Singleton global — partagé entre tous les appels dans le même process
const counters = new Map<string, Counter>()

function getCounter(model: string, key: string): Counter {
    const id = `${model}:${key}`
    const now = Date.now()

    if (!counters.has(id)) {
        counters.set(id, {
            rpm: { count: 0, resetAt: now + 60_000 },
            rpd: { count: 0, resetAt: now + 86_400_000 },
        })
    }

    const c = counters.get(id)!

    if (now > c.rpm.resetAt) {
        c.rpm = { count: 0, resetAt: now + 60_000 }
    }
    if (now > c.rpd.resetAt) {
        c.rpd = { count: 0, resetAt: now + 86_400_000 }
    }

    return c
}

function isAvailable(model: (typeof MODELS)[number], key: string): boolean {
    const c = getCounter(model.name, key)
    return c.rpm.count < model.rpm && c.rpd.count < model.rpd
}

function isModelRpmExhausted(model: (typeof MODELS)[number]): boolean {
    return getKeys().every(key => {
        const c = getCounter(model.name, key)
        return c.rpm.count >= model.rpm
    })
}

export type Slot = { model: string; key: string }

export function getAvailableSlot(): Slot | null {
    const keys = getKeys()

    for (const model of MODELS) {
        // Ne passer au modèle suivant que si tous les meilleurs sont saturés en RPM
        if (model.priority > 1) {
            const betterModels = MODELS.filter(m => m.priority < model.priority)
            const allExhausted = betterModels.every(isModelRpmExhausted)
            if (!allExhausted) continue
        }

        for (const key of keys) {
            if (isAvailable(model, key)) {
                const c = getCounter(model.name, key)
                c.rpm.count++
                c.rpd.count++
                return { model: model.name, key }
            }
        }
    }

    return null
}

export function releaseSlot(slot: Slot): void {
    const c = getCounter(slot.model, slot.key)
    if (c.rpm.count > 0) c.rpm.count--
    if (c.rpd.count > 0) c.rpd.count--
}

export function getRotatorStats() {
    const keys = getKeys()
    return MODELS.map(model => ({
        model: model.name,
        priority: model.priority,
        slots: keys.map((key, i) => {
            const c = getCounter(model.name, key)
            return {
                keyIndex: i + 1,
                rpm: { used: c.rpm.count, max: model.rpm, remaining: model.rpm - c.rpm.count },
                rpd: { used: c.rpd.count, max: model.rpd, remaining: model.rpd - c.rpd.count },
            }
        }),
    }))
}