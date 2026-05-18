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
    <div className="max-w-xl">
      <div>
        <Link href="/app/clientes" className="text-xs text-gray-500 hover:underline">
          ← Volver a clientes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Nuevo cliente</h1>
      </div>

      <ClienteForm action={crearClienteAction} submitLabel="Crear cliente" />
    </div>
  );
}
