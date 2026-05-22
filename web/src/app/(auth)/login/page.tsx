import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left — brand panel */}
      <div className="hidden flex-col justify-between bg-slate-900 p-12 lg:flex lg:w-1/2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">
            T
          </div>
          <span className="text-lg font-semibold text-white">Tavex</span>
        </div>

        <div>
          <blockquote className="space-y-3">
            <p className="text-xl leading-relaxed font-medium text-white">
              Pre-captura, validación y exportación de comprobantes contables para el Sistema
              Marangatu.
            </p>
            <footer className="text-sm text-slate-400">SET / DNIT · Paraguay</footer>
          </blockquote>
        </div>

        <div className="flex flex-col gap-3">
          <Feature label="Extracción automática con Gemini AI" />
          <Feature label="Validaciones DNIT V-001…V-022 completas" />
          <Feature label="Exportación ZIP Marangatu en un clic" />
          <Feature label="Libros IVA e IRP en Excel formato oficial" />
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-xs font-bold text-white">
              T
            </div>
            <span className="text-base font-semibold">Tavex</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Iniciar sesión</h1>
          <p className="mt-1.5 text-sm text-gray-500">Ingresá tus credenciales para acceder.</p>

          <LoginForm />

          <p className="mt-8 text-center text-sm text-gray-500">
            ¿No tenés cuenta?{" "}
            <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              Crear una cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        className="h-4 w-4 shrink-0 text-indigo-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
      <span className="text-sm text-slate-300">{label}</span>
    </div>
  );
}
