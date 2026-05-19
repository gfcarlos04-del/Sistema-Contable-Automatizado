import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Auditoría" };

export default async function AuditoriaPage(props: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await props.searchParams;
  const entidadFiltro = params["entidad"] ?? "";
  const usuarioFiltro = params["usuarioId"] ?? "";
  const fechaDesde = params["desde"] ?? "";
  const fechaHasta = params["hasta"] ?? "";

  const { organizacionId } = session.user;

  // Fetch org users for filter select
  const usuarios = await prisma.usuario.findMany({
    where: { organizacionId },
    select: { id: true, nombre: true, email: true },
    orderBy: { nombre: "asc" },
  });

  // Build date range filter
  let creadoEnFilter: { gte?: Date; lte?: Date } | undefined = undefined;
  if (fechaDesde || fechaHasta) {
    creadoEnFilter = {};
    if (fechaDesde) creadoEnFilter.gte = new Date(fechaDesde);
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setUTCHours(23, 59, 59, 999);
      creadoEnFilter.lte = hasta;
    }
  }

  const registros = await prisma.auditoriaCambio.findMany({
    where: {
      organizacionId,
      ...(entidadFiltro ? { entidad: { contains: entidadFiltro, mode: "insensitive" } } : {}),
      ...(usuarioFiltro ? { usuarioId: usuarioFiltro } : {}),
      ...(creadoEnFilter ? { creadoEn: creadoEnFilter } : {}),
    },
    orderBy: { creadoEn: "desc" },
    take: 100,
    select: {
      id: true,
      entidad: true,
      idEntidad: true,
      campo: true,
      valorAnterior: true,
      valorNuevo: true,
      motivo: true,
      creadoEn: true,
      usuario: { select: { nombre: true, email: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
      <p className="mt-1 text-sm text-gray-600">
        Historial de cambios sobre comprobantes y entidades — últimos 100 registros.
      </p>

      {/* Filter form */}
      <form method="GET" className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Entidad</label>
            <input
              type="text"
              name="entidad"
              defaultValue={entidadFiltro}
              placeholder="Comprobante, Cliente…"
              className="mt-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Usuario</label>
            <select
              name="usuarioId"
              defaultValue={usuarioFiltro}
              className="mt-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre || u.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Desde</label>
            <input
              type="date"
              name="desde"
              defaultValue={fechaDesde}
              className="mt-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Hasta</label>
            <input
              type="date"
              name="hasta"
              defaultValue={fechaHasta}
              className="mt-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
          >
            Filtrar
          </button>

          <a
            href="/app/auditoria"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Limpiar
          </a>
        </div>
      </form>

      {/* Results */}
      <div className="mt-6">
        {registros.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
            No hay registros de auditoría con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-gray-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Usuario
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Entidad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      ID entidad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Campo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Cambio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Motivo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registros.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-gray-700">
                        {new Date(r.creadoEn).toLocaleString("es-PY")}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {r.usuario.nombre || r.usuario.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.entidad}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500" title={r.idEntidad}>
                          {r.idEntidad.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.campo}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="inline-flex items-center gap-1 flex-wrap">
                          {r.valorAnterior != null && (
                            <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600 line-through">{r.valorAnterior}</span>
                          )}
                          {r.valorAnterior != null && r.valorNuevo != null && (
                            <span className="text-gray-400 font-medium">→</span>
                          )}
                          {r.valorNuevo != null && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{r.valorNuevo}</span>
                          )}
                          {r.valorAnterior == null && r.valorNuevo == null && (
                            <span className="text-gray-400">—</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {r.motivo ?? <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {registros.length === 100 && (
              <p className="mt-2 text-center text-xs text-gray-500">
                Mostrando los 100 registros más recientes. Usá los filtros de fecha para acotar.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
