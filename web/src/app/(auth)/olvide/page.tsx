import Link from "next/link";
import { OlvideForm } from "./OlvideForm";

export const metadata = { title: "Recuperar contraseña" };

export default function OlvidePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">
            T
          </div>
          <span className="text-lg font-semibold text-gray-900">Tavex</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Recuperar contraseña
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Ingresá tu email y te enviamos un enlace para crear una nueva contraseña.
          </p>

          <OlvideForm />
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Te acordaste?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  );
}
