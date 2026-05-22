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
  CARGADO: "bg-gray-100 text-gray-600",
  EXTRAYENDO: "bg-blue-100 text-blue-700",
  EXTRAIDO: "bg-yellow-100 text-yellow-800",
  EN_REVISION: "bg-orange-100 text-orange-700",
  REGISTRADO: "bg-emerald-100 text-emerald-700",
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
  const PAGE_SIZE = 50;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

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

  const [comprobantes, total] = await Promise.all([
    prisma.comprobante.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
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
    }),
    prisma.comprobante.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hayFiltros = !!estadoParam || !!q || !!desde || !!hasta;

  // Build query string helper for pagination links
  function pageUrl(p: number) {
    const qp = new URLSearchParams();
    if (estadoParam) qp.set("estado", estadoParam);
    if (q) qp.set("q", q);
    if (desde) qp.set("desde", desde);
    if (hasta) qp.set("hasta", hasta);
    if (p > 1) qp.set("page", String(p));
    const qs = qp.toString();
    return `/app/comprobantes${qs ? `?${qs}` : ""}`;
  }

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
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          + Cargar comprobante
        </Link>
      </div>

      {/* Barra de filtros */}
      <form
        method="get"
        action="/app/comprobantes"
        className="mt-6 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
      >
        <div className="flex flex-wrap items-end gap-4">
          {/* Estado */}
          <div>
            <label htmlFor="filtro-estado" className="block text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              id="filtro-estado"
              name="estado"
              defaultValue={estadoParam}
              className="mt-1 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
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
            <label htmlFor="filtro-q" className="block text-sm font-medium text-gray-700">
              Búsqueda
            </label>
            <input
              id="filtro-q"
              name="q"
              type="text"
              defaultValue={q}
              placeholder="N°, timbrado, contraparte, RUC…"
              className="mt-1 w-60 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Desde */}
          <div>
            <label htmlFor="filtro-desde" className="block text-sm font-medium text-gray-700">
              Desde
            </label>
            <input
              id="filtro-desde"
              name="desde"
              type="date"
              defaultValue={desde}
              className="mt-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Hasta */}
          <div>
            <label htmlFor="filtro-hasta" className="block text-sm font-medium text-gray-700">
              Hasta
            </label>
            <input
              id="filtro-hasta"
              name="hasta"
              type="date"
              defaultValue={hasta}
              className="mt-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              Filtrar
            </button>
            {hayFiltros && (
              <Link
                href="/app/comprobantes"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Limpiar
              </Link>
            )}
          </div>
        </div>
      </form>

      {/* Contador */}
      <p className="mt-3 text-sm text-gray-500">
        <strong>{total.toLocaleString("es-PY")}</strong>{" "}
        {total === 1 ? "comprobante" : "comprobantes"}
        {hayFiltros ? " (con filtros activos)" : ""}
        {totalPages > 1 && (
          <span className="ml-1">
            — página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </span>
        )}
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
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              Cargar el primero
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
                      className="font-medium text-gray-900 transition-colors hover:text-indigo-600"
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

                  <td className="px-4 py-3 text-sm text-gray-700">
                    {c.nombreContraparte ?? <span className="text-gray-400">—</span>}
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-sm text-gray-700">
                    {Number(c.total) > 0 ? (
                      Number(c.total).toLocaleString("es-PY")
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">
                    {c.fechaEmision ? (
                      new Date(c.fechaEmision).toLocaleDateString("es-PY")
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(c.creadoEn).toLocaleDateString("es-PY")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <span className="text-xs text-gray-500">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={pageUrl(page - 1)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    ← Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={pageUrl(page + 1)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Siguiente →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
