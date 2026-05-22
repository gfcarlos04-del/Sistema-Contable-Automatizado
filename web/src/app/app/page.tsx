import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClienteActivo } from "@/lib/cliente-activo";

export const metadata = { title: "Inicio" };

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

export default async function AppHome() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { organizacionId } = session.user;
  const clienteActivo = await getClienteActivo();

  if (!clienteActivo) {
    const [clientesCount, comprobantesCount] = await Promise.all([
      prisma.cliente.count({ where: { organizacionId } }),
      prisma.comprobante.count({ where: { organizacionId } }),
    ]);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Bienvenido, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Seleccioná un cliente en la barra lateral para comenzar.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Clientes registrados" value={clientesCount} icon="clients" />
          <StatCard label="Comprobantes totales" value={comprobantesCount} icon="docs" />
        </div>

        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
            <svg
              className="h-6 w-6 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">Seleccioná un cliente</h3>
          <p className="mt-1 text-sm text-gray-500">
            Usá el selector del panel lateral para ver estadísticas y comprobantes.
          </p>
          <Link
            href="/app/clientes"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Ir a Clientes
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [totalMes, pendientes, registrados, rechazados, recientes] = await Promise.all([
    prisma.comprobante.count({
      where: { organizacionId, clienteId: clienteActivo.id, creadoEn: { gte: startOfMonth } },
    }),
    prisma.comprobante.count({
      where: {
        organizacionId,
        clienteId: clienteActivo.id,
        estado: {
          in: ["CARGADO", "EXTRAIDO", "EN_REVISION", "EXTRAYENDO", "REQUIERE_REVISION_MANUAL"],
        },
      },
    }),
    prisma.comprobante.count({
      where: { organizacionId, clienteId: clienteActivo.id, estado: "REGISTRADO" },
    }),
    prisma.comprobante.count({
      where: { organizacionId, clienteId: clienteActivo.id, estado: "RECHAZADO" },
    }),
    prisma.comprobante.findMany({
      where: { organizacionId, clienteId: clienteActivo.id },
      orderBy: { creadoEn: "desc" },
      take: 8,
      select: {
        id: true,
        estado: true,
        timbrado: true,
        numero: true,
        total: true,
        fechaEmision: true,
        nombreContraparte: true,
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Hola, {session.user.name?.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Trabajando con{" "}
            <span className="font-medium text-gray-700">{clienteActivo.razonSocial}</span>
            <span className="ml-1.5 font-mono text-xs text-gray-400">
              ({clienteActivo.ruc}-{clienteActivo.dv})
            </span>
          </p>
        </div>
        <Link
          href="/app/comprobantes/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Cargar comprobante
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Cargados este mes" value={totalMes} icon="docs" />
        <StatCard
          label="Pendientes de revisión"
          value={pendientes}
          icon="clock"
          accent="amber"
          href="/app/comprobantes?estado=EN_REVISION"
        />
        <StatCard
          label="Registrados"
          value={registrados}
          icon="check"
          accent="emerald"
          href="/app/comprobantes?estado=REGISTRADO"
        />
        <StatCard
          label="Rechazados"
          value={rechazados}
          icon="x"
          accent="red"
          href="/app/comprobantes?estado=RECHAZADO"
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          href="/app/comprobantes/nuevo"
          title="Cargar comprobante"
          desc="Subir PDF o imagen"
          icon="upload"
        />
        <QuickAction
          href="/app/comprobantes/importar-xml"
          title="Importar e-Kuatia"
          desc="XML SIFEN en lote"
          icon="xml"
        />
        <QuickAction
          href="/app/exportaciones"
          title="Exportar Marangatu"
          desc="Generar ZIP o Excel"
          icon="export"
        />
      </div>

      {/* Recent */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Últimos comprobantes</h2>
          <Link
            href="/app/comprobantes"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            Ver todos →
          </Link>
        </div>

        {recientes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-500">
              Aún no hay comprobantes para <strong>{clienteActivo.razonSocial}</strong>.
            </p>
            <Link
              href="/app/comprobantes/nuevo"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Cargar el primero
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="bg-gray-50">
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
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recientes.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[c.estado] ?? "bg-gray-100 text-gray-600"}`}
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
                          <span className="font-mono text-xs">
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
                    <td className="px-4 py-3 text-gray-500">
                      {c.fechaEmision ? (
                        new Date(c.fechaEmision).toLocaleDateString("es-PY")
                      ) : (
                        <span className="text-gray-400">—</span>
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

// ── Sub-components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent,
  href,
}: {
  label: string;
  value: number;
  icon: string;
  accent?: "amber" | "emerald" | "red";
  href?: string;
}) {
  const accentText =
    accent === "amber"
      ? "text-amber-600"
      : accent === "emerald"
        ? "text-emerald-600"
        : accent === "red"
          ? "text-red-600"
          : "text-gray-900";
  const accentBg =
    accent === "amber"
      ? "bg-amber-50"
      : accent === "emerald"
        ? "bg-emerald-50"
        : accent === "red"
          ? "bg-red-50"
          : "bg-indigo-50";
  const iconColor =
    accent === "amber"
      ? "text-amber-500"
      : accent === "emerald"
        ? "text-emerald-500"
        : accent === "red"
          ? "text-red-500"
          : "text-indigo-500";

  const content = (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${accentBg}`}>
        <StatIcon name={icon} className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className={`mt-3 text-3xl font-bold tabular-nums ${accentText}`}>{value}</div>
      <div className="mt-1 text-xs font-medium text-gray-500">{label}</div>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function StatIcon({ name, className }: { name: string; className: string }) {
  if (name === "docs")
    return (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    );
  if (name === "clock")
    return (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    );
  if (name === "check")
    return (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    );
  if (name === "x")
    return (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    );
  if (name === "clients")
    return (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
        />
      </svg>
    );
  return null;
}

function QuickAction({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 transition-colors group-hover:bg-indigo-100">
        <QuickIcon name={icon} className="h-5 w-5 text-indigo-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <svg
        className="ml-auto h-4 w-4 text-gray-400 transition-colors group-hover:text-indigo-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
        />
      </svg>
    </Link>
  );
}

function QuickIcon({ name, className }: { name: string; className: string }) {
  if (name === "upload")
    return (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
        />
      </svg>
    );
  if (name === "xml")
    return (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
        />
      </svg>
    );
  if (name === "export")
    return (
      <svg
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
    );
  return null;
}
