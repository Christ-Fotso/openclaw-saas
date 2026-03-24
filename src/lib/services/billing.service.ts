import Stripe from 'stripe'
import { BillingRepository } from '@/lib/repositories/billing.repository'
import { UserRepository } from '@/lib/repositories/user.repository'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const BillingService = {

  // Crée un customer Stripe + SetupIntent pour enregistrer la carte
  async createSetupIntent(userId: string) {
    const user = await UserRepository.findById(userId)
    if (!user) throw new Error('User not found')

    // Vérifie si un customer Stripe existe déjà
    let billing = await BillingRepository.findByUserId(userId)

    if (!billing) {
      // Crée le customer Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      })

      billing = await BillingRepository.create({
        userId,
        stripeCustomerId: customer.id,
      })
    }

    // Crée le SetupIntent — enregistre la carte SANS débit
    const setupIntent = await stripe.setupIntents.create({
      customer: billing.stripeCustomerId,
      payment_method_types: ['card'],
      metadata: { userId },
    })

    return {
      clientSecret: setupIntent.client_secret!,
      customerId: billing.stripeCustomerId,
    }
  },

  // Appelé par le webhook Stripe quand la carte est confirmée
  async activateTrial(stripeCustomerId: string, paymentMethodId: string) {
    const billing = await BillingRepository.findByCustomerId(stripeCustomerId)
    if (!billing) throw new Error('Billing not found')

    // Attache la méthode de paiement par défaut
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Récupère les détails de la carte
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
    const card = pm.card

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    await BillingRepository.update(billing.userId, {
      cardLast4: card?.last4,
      cardBrand: card?.brand,
      trialEndsAt,
      status: 'TRIAL',
    })

    return billing.userId
  },

  async hasValidPaymentMethod(userId: string): Promise<boolean> {
    const billing = await BillingRepository.findByUserId(userId)
    return billing?.status === 'TRIAL' || billing?.status === 'ACTIVE'
  },
}
