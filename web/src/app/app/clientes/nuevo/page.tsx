import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { crearClienteAction } from "../actions";
import { ClienteForm } from "../ClienteForm";

export const metadata = { title: "Nuevo cliente" };

export default async function NuevoClientePage() {
  const session = (await auth())!;
  if (session.user.rol !== "ADMIN") redirect("/app/clientes");

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/app/clientes" className="text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors">
          ← Volver a clientes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">Nuevo cliente</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <ClienteForm action={crearClienteAction} submitLabel="Crear cliente" />
      </div>
    </div>
  );
}
