import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClienteActivo } from "@/lib/cliente-activo";
import { presignedGetUrl } from "@/lib/storage";
import { GenerarExportacion } from "./GenerarExportacion";

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

      <GenerarExportacion
        clienteId={clienteActivo.id}
        clienteNombre={`${clienteActivo.razonSocial} (${clienteActivo.ruc}-${clienteActivo.dv})`}
      />

      {/* Previous exports */}
      <div>
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Exportaciones anteriores</h2>
        {exportacionesConUrl.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Aún no hay exportaciones para este cliente.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
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
              <tbody className="divide-y divide-gray-100 bg-white">
                {exportacionesConUrl.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{e.tipo.replace("_", " ")}</td>
                    <td className="px-4 py-3 font-mono text-gray-900">
                      {formatPeriodo(e.periodo)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{e.registrosIncluidos}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(e.creadoEn).toLocaleString("es-PY")}
                    </td>
                    <td className="px-4 py-3">
                      {e.url ? (
                        <a href={e.url} className="text-blue-600 hover:underline" download>
                          Descargar
                        </a>
                      ) : (
                        <span className="text-gray-400">No disponible</span>
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
