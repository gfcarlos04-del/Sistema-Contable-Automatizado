import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Marangatu — Registro de Comprobantes
      </h1>
      <p className="mt-3 max-w-2xl text-gray-600">
        Pre-captura, validación y exportación de comprobantes contables al formato que exige el
        módulo de Importación de Comprobantes del Sistema Marangatu (SET/DNIT, Paraguay).
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Crear cuenta
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Iniciar sesión
        </Link>
      </div>
      <p className="mt-12 text-xs text-gray-500">En desarrollo. Fase 0 — fundaciones del SaaS.</p>
    </div>
  );
}
