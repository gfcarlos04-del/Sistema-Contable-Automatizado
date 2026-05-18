import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getClienteActivo } from "@/lib/cliente-activo";
import { ImportarXml } from "../ImportarXml";

export const metadata = { title: "Importar e-Kuatia XML" };

export default async function ImportarXmlPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const clienteActivo = await getClienteActivo();

  if (!clienteActivo) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar e-Kuatia XML</h1>
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-600">
            Seleccioná un cliente en la barra superior antes de importar un XML.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
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
          <h1 className="text-2xl font-semibold tracking-tight">Importar e-Kuatia XML</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Cliente:{" "}
            <strong>
              {clienteActivo.razonSocial} — {clienteActivo.ruc}-{clienteActivo.dv}
            </strong>
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <ImportarXml clienteId={clienteActivo.id} />

      {/* Info */}
      <div className="mt-6 rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <strong>¿Qué datos se extraen?</strong> Tavex lee automáticamente el timbrado, número, fecha
        de emisión, RUC del receptor, montos gravados, IVA y totales del XML SIFEN. El comprobante
        queda en estado <span className="font-semibold">Registrado</span> y podés ajustar el tipo de
        registro (Venta/Compra) y la imputación desde el detalle.
      </div>

      <div className="mt-3 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-600">
        <strong>También podés cargar PDF/imagen:</strong>{" "}
        <Link href="/app/comprobantes/nuevo" className="underline hover:text-gray-900">
          Ir a carga por PDF o imagen →
        </Link>
      </div>
    </div>
  );
}
