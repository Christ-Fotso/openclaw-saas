"use client";

import { motion } from "framer-motion";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { ArrowRight, Bot, Zap, Shield, Play } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <Bot className="w-6 h-6 text-indigo-400" />
            <span>Myk Agent 23</span>
          </div>
          <div className="flex items-center gap-4">
            {!isLoaded ? (
              <div className="w-20 h-8 animate-pulse bg-white/10 rounded-md" />
            ) : isSignedIn ? (
              <>
                <Link href="/dashboard" className="text-sm font-medium hover:text-indigo-400 transition-colors">
                  Dashboard
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="text-sm font-medium hover:text-white/80 transition-colors">Sign In</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-white/90 transition-all">
                    Get Started
                  </button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium mb-8 border border-indigo-500/20"
          >
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Myk Agent 23 v3.0 is live
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent"
          >
            Your AI Agent, <br className="hidden md:block" />
            everywhere you work.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto"
          >
            Automate WhatsApp, Telegram, manage your emails, and search the web with your personal, secure Myk Agent 23 running 24/7. Powered by the OpenClaw Engine.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {!isSignedIn ? (
              <SignUpButton mode="modal">
                <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-full font-medium transition-all shadow-lg shadow-indigo-500/25">
                  Start 7-day free trial <ArrowRight className="w-4 h-4" />
                </button>
              </SignUpButton>
            ) : (
              <Link href="/dashboard" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-full font-medium transition-all shadow-lg shadow-indigo-500/25">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-full font-medium transition-all border border-white/10">
              <Play className="w-4 h-4" /> Watch Demo
            </button>
          </motion.div>

          {/* Video Placeholder (Stripe-like UI mockup) */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-20 relative mx-auto max-w-5xl"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-2xl opacity-20" />
            <div className="relative bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl aspect-video flex flex-col">
              <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2 bg-slate-950/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="mx-auto bg-slate-800/50 text-slate-400 text-xs px-4 py-1 rounded-full flex items-center gap-2">
                  <Shield className="w-3 h-3" /> mykagent23.com
                </div>
              </div>
              <div className="flex-1 p-8 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <Bot className="w-16 h-16 text-indigo-400 opacity-50 animate-bounce" />
                  <p className="text-slate-500 font-mono text-sm">OpenClaw Engine executing commands...</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Features snippet */}
      <section className="py-24 border-t border-white/5 relative overflow-hidden text-left">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "OpenClaw Engine", desc: "Built on top of the powerful OpenClaw open-source framework.", icon: Bot },
            { title: "Docker Isolated", desc: "Your agent runs in its own secure 1.2GB memory space.", icon: Shield },
            { title: "Pay as you go", desc: "Only pay when your Gemini API agent is actively thinking or acting.", icon: ArrowRight }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400 relative z-10">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 relative z-10">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed relative z-10">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
