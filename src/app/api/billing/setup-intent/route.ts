import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { BillingService } from '@/lib/services/billing.service'
import { UserRepository } from '@/lib/repositories/user.repository'

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = await UserRepository.findByClerkId(clerkId)
    if (!user) {
      return NextResponse.json({ error: 'User not found in mapping' }, { status: 404 })
    }

    const { clientSecret } = await BillingService.createSetupIntent(user.id)
    return NextResponse.json({ clientSecret })
  } catch (error: any) {
    console.error("[SETUP_INTENT_ERROR]", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
