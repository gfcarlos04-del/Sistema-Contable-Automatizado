import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClienteActivo } from "@/lib/cliente-activo";
import type { Prisma } from "@/generated/prisma/client";
import type { EstadoComprobante } from "@/generated/prisma/enums";

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

// Valid enum values for runtime validation
const ESTADOS_VALIDOS: EstadoComprobante[] = [
  "CARGADO",
  "EXTRAYENDO",
  "EXTRAIDO",
  "EN_REVISION",
  "REGISTRADO",
  "RECHAZADO",
  "DUPLICADO",
];

// ── Página ─────────────────────────────────────────────────────────────────

export default async function ComprobantesPage(props: {
  searchParams: Promise<Record<string, string>>;
}) {
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

  const params = await props.searchParams;
  const estadoParam = params.estado ?? "";
  const q = params.q?.trim() ?? "";
  const desde = params.desde ?? "";
  const hasta = params.hasta ?? "";

  // Build where clause
  const andClauses: Prisma.ComprobanteWhereInput[] = [];

  if (estadoParam && (ESTADOS_VALIDOS as string[]).includes(estadoParam)) {
    andClauses.push({ estado: estadoParam as EstadoComprobante });
  }

  if (q) {
    andClauses.push({
      OR: [
        { numero: { contains: q, mode: "insensitive" } },
        { timbrado: { contains: q } },
        { nombreContraparte: { contains: q, mode: "insensitive" } },
        { rucContraparte: { contains: q } },
      ],
    });
  }

  if (desde || hasta) {
    const fechaFilter: { gte?: Date; lte?: Date } = {};
    if (desde) fechaFilter.gte = new Date(desde);
    if (hasta) fechaFilter.lte = new Date(hasta);
    andClauses.push({ fechaEmision: fechaFilter });
  }

  const where: Prisma.ComprobanteWhereInput = {
    organizacionId: session.user.organizacionId,
    clienteId: clienteActivo.id,
    ...(andClauses.length > 0 ? { AND: andClauses } : {}),
  };

  const comprobantes = await prisma.comprobante.findMany({
    where,
    orderBy: { creadoEn: "desc" },
    take: 100,
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

  const hayFiltros = !!estadoParam || !!q || !!desde || !!hasta;

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

      {/* Barra de filtros */}
      <form
        method="get"
        action="/app/comprobantes"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
      >
        {/* Estado */}
        <div>
          <label
            htmlFor="filtro-estado"
            className="block text-xs font-medium text-gray-600"
          >
            Estado
          </label>
          <select
            id="filtro-estado"
            name="estado"
            defaultValue={estadoParam}
            className="mt-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            <option value="CARGADO">Cargado</option>
            <option value="EXTRAYENDO">Extrayendo</option>
            <option value="EXTRAIDO">Extraído</option>
            <option value="EN_REVISION">En revisión</option>
            <option value="REGISTRADO">Registrado</option>
            <option value="RECHAZADO">Rechazado</option>
            <option value="DUPLICADO">Duplicado</option>
          </select>
        </div>

        {/* Búsqueda */}
        <div>
          <label
            htmlFor="filtro-q"
            className="block text-xs font-medium text-gray-600"
          >
            Búsqueda
          </label>
          <input
            id="filtro-q"
            name="q"
            type="text"
            defaultValue={q}
            placeholder="N°, timbrado, contraparte, RUC…"
            className="mt-1 w-56 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>

        {/* Desde */}
        <div>
          <label
            htmlFor="filtro-desde"
            className="block text-xs font-medium text-gray-600"
          >
            Desde
          </label>
          <input
            id="filtro-desde"
            name="desde"
            type="date"
            defaultValue={desde}
            className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>

        {/* Hasta */}
        <div>
          <label
            htmlFor="filtro-hasta"
            className="block text-xs font-medium text-gray-600"
          >
            Hasta
          </label>
          <input
            id="filtro-hasta"
            name="hasta"
            type="date"
            defaultValue={hasta}
            className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            Filtrar
          </button>
          {hayFiltros && (
            <Link
              href="/app/comprobantes"
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {/* Contador */}
      <p className="mt-3 text-sm text-gray-500">
        Mostrando <strong>{comprobantes.length}</strong>{" "}
        {comprobantes.length === 1 ? "comprobante" : "comprobantes"}
        {hayFiltros ? " (con filtros activos)" : ""}
      </p>

      {/* Lista */}
      {comprobantes.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-600">
            {hayFiltros
              ? "No se encontraron comprobantes con los filtros aplicados."
              : `Aún no hay comprobantes para ${clienteActivo.razonSocial}.`}
          </p>
          {!hayFiltros && (
            <Link
              href="/app/comprobantes/nuevo"
              className="mt-5 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Cargar el primero
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
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

          {comprobantes.length === 100 && (
            <p className="border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-500">
              Mostrando los primeros 100 resultados. Usá los filtros para acotar la búsqueda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
