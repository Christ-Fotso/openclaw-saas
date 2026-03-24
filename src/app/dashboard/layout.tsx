import { UserButton } from "@clerk/nextjs";
import { Bot, CreditCard, LayoutDashboard, MessageSquare, Settings } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-slate-900/50 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <Bot className="w-5 h-5 text-indigo-400" />
            <span>Myk Agent 23</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-indigo-500/10 text-indigo-400">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          <Link href="/agent/chat" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-slate-50 hover:bg-white/5 transition-colors">
            <MessageSquare className="w-4 h-4" /> Agent Chat
          </Link>
          <Link href="/agent/config" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-slate-50 hover:bg-white/5 transition-colors">
            <Settings className="w-4 h-4" /> Configuration
          </Link>
          <Link href="/billing" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-slate-50 hover:bg-white/5 transition-colors">
            <CreditCard className="w-4 h-4" /> Billing
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-white/10 bg-slate-900/50 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="md:hidden flex items-center gap-2 font-bold">
            <Bot className="w-5 h-5 text-indigo-400" />
            <span>Myk Agent 23</span>
          </div>
          <div className="flex-1" />
          <UserButton />
        </header>
        
        <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
