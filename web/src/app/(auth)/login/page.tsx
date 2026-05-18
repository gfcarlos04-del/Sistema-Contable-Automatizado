import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-gray-600">
        ¿Sos nuevo?{" "}
        <Link href="/signup" className="font-medium text-gray-900 underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
