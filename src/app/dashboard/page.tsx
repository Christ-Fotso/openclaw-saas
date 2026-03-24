import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserRepository } from "@/lib/repositories/user.repository";
import { BillingService } from "@/lib/services/billing.service";
import { Bot, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PaymentSetup } from "@/components/organisms/PaymentSetup";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  // Get full Clerk user details to sync email/name
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  const name = clerkUser?.firstName 
    ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim() 
    : "Unknown";

  // 1. Get or Create user in our PostgreSQL Database
  const upsertedResult = await UserRepository.upsertUser(userId, email, name);
  // Manual check because upsertUser now returns the user directly or throws/errors could happen depending on implementation
  // In my new implementation it returns the user directly. I should handle potential errors.
  
  if (!upsertedResult) {
    return (
      <div className="p-8 text-red-500 bg-red-500/10 rounded-xl border border-red-500/20">
        Error connecting to database. Please try again later.
      </div>
    );
  }

  // 2. Check Stripe Billing Status
  const dbUserId = upsertedResult.id; 
  const hasPaid = await BillingService.hasValidPaymentMethod(dbUserId);

  if (!hasPaid) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Almost there, {clerkUser?.firstName}</h1>
          <p className="text-slate-400">Please link a payment method to start your free trial.</p>
        </div>
        <PaymentSetup />
      </div>
    );
  }

  // 3. Fetch User along with their Agent (if any)
  const dbUser = await UserRepository.findByClerkId(userId);
  const agent = dbUser?.agents?.[0]; // Max 1 agent based on our specs

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, {clerkUser?.firstName || "there"}</h1>
        <p className="text-slate-400">Manage your Myk Agent 23 and active connections.</p>
      </div>

      {!agent ? (
        // No Agent Yet - Prompt to configure (Step 5 Terminal)
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="absolute -inset-24 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-3xl rounded-full opacity-50" />
          <div className="relative z-10 flex-1">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
              <Bot className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Agent Configured</h2>
            <p className="text-indigo-200/70 max-w-lg mb-6">
              Your free trial is active, but you haven't deployed your OpenClaw agent yet.
            </p>
            <Link 
              href="/agent/config" 
              className="inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/25"
            >
              Deploy my Agent <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        // Agent exists - Show basic stats
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Agent Name</p>
              <p className="font-semibold text-lg">{agent.name}</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${agent.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Status</p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-green-400' : 'bg-slate-400 animate-pulse'}`} />
                <p className="font-semibold text-lg">{agent.isActive ? 'Online' : 'Offline / Paused'}</p>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}

