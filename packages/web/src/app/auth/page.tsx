"use client";

import { useState } from "react";
import { Activity, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import LoginForm from "@/component/auth/LoginForm";
import RegisterForm from "@/component/auth/RegisterForm";

type AuthMode = "login" | "register";

const TABS: { value: AuthMode; label: string }[] = [
  { value: "login", label: "Iniciar Sesión" },
  { value: "register", label: "Registrarse" },
];

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <div className="w-full max-w-md">

      <div className="pipe relative rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl p-6 sm:p-8" data-pipe="info">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <span className="absolute inset-0 rounded-xl bg-cyan-500/20 blur-md animate-pulse-slow" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-500/15 to-blue-600/10">
              <Activity className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-wider text-slate-100">
            PACKET TOOLS
          </h1>
          <p className="text-sm text-slate-400">
            Tu asistente Inteligente en Redes
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Autenticación"
          className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1"
        >
          {TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={mode === tab.value}
              onClick={() => setMode(tab.value)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200",
                mode === tab.value
                  ? "bg-cyan-500/15 text-cyan-300 shadow-sm shadow-cyan-500/10"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === "login" ? (
          <LoginForm onSwitchToRegister={() => setMode("register")} />
        ) : (
          <RegisterForm onSuccess={() => setMode("login")} />
        )}

        <div className="mt-8 mb-2 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-slate-400">
            Visitanos en:{" "}
            <a
              href="https://packet-tools-ai.vercel.app"
              className="text-cyan-400 hover:text-cyan-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.packet-tools-ai
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 flex flex-col items-center justify-center gap-2 text-slate-500">

        <a
          href="https://github.com/ph0Void/packet-tools-ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] text-slate-400 transition-colors hover:text-cyan-400"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>Ver Código en GitHub</span>
        </a>
      </div>
    </div>
  );
}