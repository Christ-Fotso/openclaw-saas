import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { BillingRepository } from '@/lib/repositories/billing.repository'
import { UserRepository } from '@/lib/repositories/user.repository'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { setupIntentId } = await req.json()

  // Vérifie que le SetupIntent est bien confirmé chez Stripe
  const si = await stripe.setupIntents.retrieve(setupIntentId)
  if (si.status !== 'succeeded') {
    return NextResponse.json({ error: 'Carte non confirmée' }, { status: 400 })
  }

  const user = await UserRepository.findByClerkId(clerkId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Récupère les détails de la carte
  const pm   = await stripe.paymentMethods.retrieve(si.payment_method as string)
  const card = pm.card

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 7)

  await BillingRepository.update(user.id, {
    cardLast4:  card?.last4,
    cardBrand:  card?.brand,
    trialEndsAt,
    status: 'TRIAL',
  })

  return NextResponse.json({ ok: true })
}
