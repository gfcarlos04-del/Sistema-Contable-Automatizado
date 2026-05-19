import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClienteActivo } from "@/lib/cliente-activo";
import { presignedGetUrl } from "@/lib/storage";
import { GenerarExportacion } from "./GenerarExportacion";
import { GenerarLibroIva } from "./GenerarLibroIva";
import { GenerarLibroIrp } from "./GenerarLibroIrp";

export const metadata = { title: "Exportaciones" };

function formatPeriodo(p: string): string {
  // p is YYYY-MM
  const [yyyy, mm] = p.split("-");
  return `${mm}/${yyyy}`;
}

export default async function ExportacionesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const clienteActivo = await getClienteActivo();

  if (!clienteActivo) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exportaciones</h1>
        <p className="mt-1 text-sm text-gray-600">
          ZIP Marangatu (obligaciones 955/956), Planilla XLSX y Libros (IVA/IVA+IRE/IRP).
        </p>
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-600">
            Seleccioná un cliente en la barra superior para generar exportaciones.
          </p>
        </div>
      </div>
    );
  }

  // Fetch previous exports for this client
  const exportaciones = await prisma.exportacion.findMany({
    where: {
      organizacionId: session.user.organizacionId,
      clienteId: clienteActivo.id,
    },
    orderBy: { creadoEn: "desc" },
    take: 20,
    select: {
      id: true,
      tipo: true,
      periodo: true,
      registrosIncluidos: true,
      rutaArchivo: true,
      creadoEn: true,
    },
  });

  // Generate presigned URLs for each export
  const exportacionesConUrl = await Promise.all(
    exportaciones.map(async (e) => {
      let url: string | null = null;
      try {
        url = await presignedGetUrl(e.rutaArchivo, 3600);
      } catch {
        // Ignore errors — file may not exist
      }
      return { ...e, url };
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exportaciones</h1>
        <p className="mt-1 text-sm text-gray-600">
          ZIP Marangatu (obligaciones 955/956) para{" "}
          <strong>
            {clienteActivo.razonSocial} — {clienteActivo.ruc}-{clienteActivo.dv}
          </strong>
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <h2 className="text-base font-semibold text-gray-900">Generar exportación</h2>
        <GenerarExportacion
          clienteId={clienteActivo.id}
          clienteNombre={`${clienteActivo.razonSocial} (${clienteActivo.ruc}-${clienteActivo.dv})`}
        />

        <GenerarLibroIva
          clienteId={clienteActivo.id}
          clienteNombre={`${clienteActivo.razonSocial} (${clienteActivo.ruc}-${clienteActivo.dv})`}
        />

        <GenerarLibroIrp
          clienteId={clienteActivo.id}
          clienteNombre={`${clienteActivo.razonSocial} (${clienteActivo.ruc}-${clienteActivo.dv})`}
        />
      </div>

      {/* Previous exports */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-900">Exportaciones anteriores</h2>
        {exportacionesConUrl.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Aún no hay exportaciones para este cliente.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Período
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Registros
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Fecha generación
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Descargar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {exportacionesConUrl.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">{e.tipo.replace("_", " ")}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-700">
                      {formatPeriodo(e.periodo)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">{e.registrosIncluidos}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(e.creadoEn).toLocaleString("es-PY")}
                    </td>
                    <td className="px-4 py-3">
                      {e.url ? (
                        <a
                          href={e.url}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                          download
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Descargar
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">No disponible</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
