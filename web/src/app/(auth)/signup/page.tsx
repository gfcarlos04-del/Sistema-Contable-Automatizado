import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">
              T
            </div>
            <span className="text-lg font-semibold text-gray-900">Tavex</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Crear cuenta</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Creá tu organización y tu usuario administrador.
          </p>

          <SignupForm />
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
