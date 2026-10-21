import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceso | Packet Tools",
  description: "Inicia sesión o regístrate para acceder a Packet Tools.",
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="dark relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      {/* Grid técnico de fondo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.09) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 75% 60% at 50% 25%, black 10%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 60% at 50% 25%, black 10%, transparent 75%)",
        }}
      />

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="auth-circuit"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M10 0 V40 H60 V120 M60 40 H120"
              fill="none"
              stroke="rgb(34 211 238)"
              strokeWidth="1"
            />
            <circle cx="10" cy="40" r="2" fill="rgb(34 211 238)" />
            <circle cx="60" cy="40" r="2" fill="rgb(34 211 238)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-circuit)" />
      </svg>

      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[130px]" />
      <div className="pointer-events-none absolute top-1/3 -left-44 h-[380px] w-[380px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse-slow" />
      <div
        className="pointer-events-none absolute bottom-0 -right-36 h-[440px] w-[440px] rounded-full bg-indigo-500/15 blur-[140px] animate-pulse-slow"
        style={{ animationDelay: "1.5s" }}
      />


      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

      <div className="relative z-10 flex w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
}