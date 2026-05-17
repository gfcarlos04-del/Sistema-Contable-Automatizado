import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Crear cuenta — Marangatu" };

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
      <p className="mt-2 text-sm text-gray-600">
        Creá tu organización y tu usuario administrador. Después podrás invitar operadores.
      </p>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-gray-600">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-gray-900 underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
