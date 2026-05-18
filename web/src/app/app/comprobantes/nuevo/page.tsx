import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getClienteActivo } from "@/lib/cliente-activo";
import { DropZone } from "../DropZone";

export const metadata = { title: "Cargar comprobante" };

export default async function NuevoComprobantePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const clienteActivo = await getClienteActivo();

  if (!clienteActivo) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cargar comprobante</h1>
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-600">
            Seleccioná un cliente en la barra superior antes de cargar un comprobante.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Encabezado */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/app/comprobantes"
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Volver"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cargar comprobante</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Cliente:{" "}
            <strong>
              {clienteActivo.razonSocial} — {clienteActivo.ruc}-{clienteActivo.dv}
            </strong>
          </p>
        </div>
      </div>

      {/* Zona de carga */}
      <DropZone clienteId={clienteActivo.id} />

      {/* Info */}
      <div className="mt-6 rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <strong>¿Qué pasa después de cargar?</strong> Tavex registra el archivo, detecta duplicados
        automáticamente y lo pone en cola para extracción con Gemini (activo en Fase 2). Podés
        revisar y corregir los datos extraídos antes de registrarlos definitivamente.
      </div>
    </div>
  );
}
