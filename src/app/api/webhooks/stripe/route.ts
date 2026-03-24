import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { BillingService } from '@/lib/services/billing.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook invalide: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'setup_intent.succeeded') {
    const si = event.data.object as Stripe.SetupIntent;
    try {
      await BillingService.activateTrial(
        si.customer as string,
        si.payment_method as string
      );
    } catch (e) {
      console.error('Error activating trial after setup_intent:', e);
      return NextResponse.json({ error: 'Error activating trial' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
