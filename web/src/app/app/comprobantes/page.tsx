import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClienteActivo } from "@/lib/cliente-activo";

export const metadata = { title: "Comprobantes" };

// ── Colores y etiquetas de estado ─────────────────────────────────────────

const ESTADO_LABEL: Record<string, string> = {
  CARGADO: "Cargado",
  EXTRAYENDO: "Extrayendo…",
  EXTRAIDO: "Extraído",
  EN_REVISION: "En revisión",
  REGISTRADO: "Registrado",
  PENDIENTE: "Pendiente",
  RECHAZADO: "Rechazado",
  DUPLICADO: "Duplicado",
  REQUIERE_REVISION_MANUAL: "Revisión manual",
};

const ESTADO_BADGE: Record<string, string> = {
  CARGADO: "bg-gray-100 text-gray-700",
  EXTRAYENDO: "bg-blue-100 text-blue-700",
  EXTRAIDO: "bg-yellow-100 text-yellow-800",
  EN_REVISION: "bg-orange-100 text-orange-700",
  REGISTRADO: "bg-green-100 text-green-700",
  PENDIENTE: "bg-gray-100 text-gray-600",
  RECHAZADO: "bg-red-100 text-red-700",
  DUPLICADO: "bg-purple-100 text-purple-700",
  REQUIERE_REVISION_MANUAL: "bg-red-100 text-red-700",
};

// ── Página ─────────────────────────────────────────────────────────────────

export default async function ComprobantesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const clienteActivo = await getClienteActivo();

  if (!clienteActivo) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comprobantes</h1>
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-600">
            Seleccioná un cliente en la barra superior para ver sus comprobantes.
          </p>
        </div>
      </div>
    );
  }

  const comprobantes = await prisma.comprobante.findMany({
    where: {
      organizacionId: session.user.organizacionId,
      clienteId: clienteActivo.id,
    },
    orderBy: { creadoEn: "desc" },
    take: 200,
    select: {
      id: true,
      estado: true,
      tipoComprobante: true,
      timbrado: true,
      numero: true,
      fechaEmision: true,
      total: true,
      creadoEn: true,
      nombreContraparte: true,
    },
  });

  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comprobantes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Cliente:{" "}
            <strong>
              {clienteActivo.razonSocial} — {clienteActivo.ruc}-{clienteActivo.dv}
            </strong>
          </p>
        </div>
        <Link
          href="/app/comprobantes/nuevo"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          + Cargar comprobante
        </Link>
      </div>

      {/* Lista */}
      {comprobantes.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-600">
            Aún no hay comprobantes para <strong>{clienteActivo.razonSocial}</strong>.
          </p>
          <Link
            href="/app/comprobantes/nuevo"
            className="mt-5 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Cargar el primero
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Timbrado / N°
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Contraparte
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Total (₲)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Fecha emisión
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Cargado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {comprobantes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[c.estado] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {ESTADO_LABEL[c.estado] ?? c.estado}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <Link
                      href={`/app/comprobantes/${c.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {c.timbrado && c.numero ? (
                        <span className="font-mono">
                          {c.timbrado} / {c.numero}
                        </span>
                      ) : (
                        <span className="font-normal text-gray-400 italic">
                          Pendiente extracción
                        </span>
                      )}
                    </Link>
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {c.nombreContraparte ?? <span className="text-gray-400">—</span>}
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-gray-900">
                    {Number(c.total) > 0 ? (
                      Number(c.total).toLocaleString("es-PY")
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {c.fechaEmision ? (
                      new Date(c.fechaEmision).toLocaleDateString("es-PY")
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(c.creadoEn).toLocaleDateString("es-PY")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {comprobantes.length === 200 && (
            <p className="border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-500">
              Mostrando los últimos 200 comprobantes. Usá filtros para ver más (disponible en F3).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
