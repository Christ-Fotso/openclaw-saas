'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { CreditCard, ShieldCheck } from 'lucide-react'

// Load Stripe outside of component render to avoid recreating Stripe object on every render
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
)

function CardForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setMessage('')

    const card = elements.getElement(CardElement)!

    // 1. Confirme la carte chez Stripe
    const { setupIntent, error } = await stripe.confirmCardSetup(
      clientSecret,
      { payment_method: { card } }
    )

    if (error) {
      setMessage(error.message ?? 'Erreur lors de la vérification de la carte.')
      setLoading(false)
      return
    }

    // 2. Notifie notre API pour mettre à jour la DB
    const res = await fetch('/api/billing/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupIntentId: setupIntent!.id }),
    })

    if (res.ok) {
      setMessage('Carte enregistrée avec succès. Configuration de l\'espace...')
      setTimeout(() => window.location.reload(), 1500)
    } else {
      setMessage('Un problème est survenu lors de la confirmation serveur.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <CreditCard className="w-6 h-6 text-indigo-400" />
          Activate 7-Day Free Trial
        </h2>
        <p className="text-slate-400">
          We need a payment method to verify your identity and prevent abuse.
          <strong className="text-indigo-300 ml-1">You won't be charged today.</strong>
        </p>
      </div>

      <div className="p-4 bg-slate-900 border border-white/10 rounded-xl mb-6 shadow-inner">
        <CardElement 
          options={{ 
            hidePostalCode: true,
            style: {
              base: {
                color: '#f8fafc',
                fontFamily: '"Inter", sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '16px',
                '::placeholder': {
                  color: '#475569',
                },
              },
              invalid: {
                color: '#ef4444',
                iconColor: '#ef4444',
              },
            }
          }} 
        />
      </div>

      {message && (
        <p className={`mb-6 p-4 rounded-lg text-sm border ${message.includes('Erreur') || message.includes('problème') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full py-4 px-6 rounded-xl font-medium transition-all shadow-lg flex justify-center items-center gap-2
                 bg-indigo-500 hover:bg-indigo-600 focus:ring-4 focus:ring-indigo-500/30 text-white
                 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin"></span>
        ) : (
          <>
            <ShieldCheck className="w-5 h-5" />
            Securely Link Card
          </>
        )}
      </button>
      
      <p className="text-xs text-center text-slate-500 mt-4 flex items-center justify-center gap-1">
        Payments are processed securely via Stripe.
      </p>
    </form>
  )
}

export function PaymentSetup() {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/billing/setup-intent', { method: 'POST' })
      .then(async r => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(data.error || 'Server error occurred')
        }
        return data;
      })
      .then(d => {
        if (d.clientSecret) {
          setClientSecret(d.clientSecret)
        } else {
          setErrorMsg('No client secret returned from the server.')
        }
      })
      .catch(e => {
        console.error("Error fetching setup intent", e)
        setErrorMsg(e.message)
      })
  }, [])

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <p className="font-bold mb-1">Configuration Error</p>
          <p className="text-sm">{errorMsg}</p>
          <p className="text-xs mt-2 text-red-400/70">Check your Stripe Secret/Publishable API keys in .env</p>
        </div>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
        <p className="text-slate-400">Initializing secure payment gateway...</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto relative mt-10">
      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl rounded-[2rem] opacity-50" />
      <div className="relative bg-slate-950/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
          <CardForm clientSecret={clientSecret} />
        </Elements>
      </div>
    </div>
  )
}
