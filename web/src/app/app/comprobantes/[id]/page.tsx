import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VisorArchivo } from "../VisorArchivo";

export const metadata = { title: "Comprobante" };

// ── Helpers ───────────────────────────────────────────────────────────────

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

function formatBytes(n: bigint | number): string {
  const bytes = typeof n === "bigint" ? Number(n) : n;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Campo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">
        {value ?? <span className="text-gray-400 italic">—</span>}
      </dd>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────

export default async function ComprobanteDetallePage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;

  const comprobante = await prisma.comprobante.findFirst({
    where: { id, organizacionId: session.user.organizacionId },
    include: {
      archivo: {
        select: {
          id: true,
          ruta: true,
          mime: true,
          tamanoBytes: true,
          hashSha256: true,
          subidoEn: true,
        },
      },
      cliente: {
        select: { razonSocial: true, ruc: true, dv: true },
      },
      campos: {
        select: {
          campo: true,
          valorExtraido: true,
          valorFinal: true,
          confianza: true,
          status: true,
        },
        orderBy: { campo: "asc" },
      },
    },
  });

  if (!comprobante) notFound();

  const esPendiente = comprobante.tipoComprobante === 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/comprobantes"
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Volver al listado"
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
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {comprobante.timbrado && comprobante.numero
                ? `${comprobante.timbrado} / ${comprobante.numero}`
                : "Comprobante"}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[comprobante.estado] ?? "bg-gray-100 text-gray-700"}`}
            >
              {ESTADO_LABEL[comprobante.estado] ?? comprobante.estado}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            Cliente:{" "}
            <strong>
              {comprobante.cliente.razonSocial} — {comprobante.cliente.ruc}-{comprobante.cliente.dv}
            </strong>
          </p>
        </div>
      </div>

      {/* Layout: visor + datos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Visor del archivo */}
        <div className="lg:col-span-1">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Archivo original</h2>
          {comprobante.archivo ? (
            <>
              <VisorArchivo archivoId={comprobante.archivo.id} />
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>
                  <strong>Tipo:</strong> {comprobante.archivo.mime.split("/")[1]?.toUpperCase()}
                </span>
                <span>
                  <strong>Tamaño:</strong> {formatBytes(comprobante.archivo.tamanoBytes)}
                </span>
                <span className="col-span-2 font-mono">
                  SHA-256: {comprobante.archivo.hashSha256.slice(0, 16)}…
                </span>
              </div>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
              Sin archivo adjunto
            </div>
          )}
        </div>

        {/* Datos del comprobante */}
        <div className="space-y-6">
          {/* Aviso si pendiente extracción */}
          {esPendiente ? (
            <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <strong>Extracción pendiente.</strong> Gemini procesará este comprobante cuando esté
              configurado (Fase 2). Los datos aparecerán aquí una vez extraídos.
            </div>
          ) : (
            <>
              {/* Identificación */}
              <section>
                <h2 className="mb-3 text-sm font-semibold text-gray-700">Identificación</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Campo label="Timbrado" value={comprobante.timbrado} />
                  <Campo label="Número" value={comprobante.numero} />
                  <Campo
                    label="Fecha de emisión"
                    value={
                      comprobante.fechaEmision
                        ? new Date(comprobante.fechaEmision).toLocaleDateString("es-PY")
                        : null
                    }
                  />
                  <Campo label="Período" value={comprobante.periodo} />
                </dl>
              </section>

              {/* Contraparte */}
              <section>
                <h2 className="mb-3 text-sm font-semibold text-gray-700">Contraparte</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Campo label="Nombre / Razón social" value={comprobante.nombreContraparte} />
                  <Campo
                    label="RUC"
                    value={
                      comprobante.rucContraparte
                        ? `${comprobante.rucContraparte}-${comprobante.dvContraparte ?? "?"}`
                        : null
                    }
                  />
                </dl>
              </section>

              {/* Montos */}
              <section>
                <h2 className="mb-3 text-sm font-semibold text-gray-700">Montos (₲)</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Campo
                    label="Gravado 10%"
                    value={Number(comprobante.montoGravado10).toLocaleString("es-PY")}
                  />
                  <Campo
                    label="IVA 10%"
                    value={Number(comprobante.iva10).toLocaleString("es-PY")}
                  />
                  <Campo
                    label="Gravado 5%"
                    value={Number(comprobante.montoGravado5).toLocaleString("es-PY")}
                  />
                  <Campo label="IVA 5%" value={Number(comprobante.iva5).toLocaleString("es-PY")} />
                  <Campo
                    label="Exento"
                    value={Number(comprobante.exento).toLocaleString("es-PY")}
                  />
                  <Campo
                    label="Total"
                    value={
                      <span className="text-base font-semibold">
                        {Number(comprobante.total).toLocaleString("es-PY")}
                      </span>
                    }
                  />
                </dl>
              </section>
            </>
          )}

          {/* Campos extraídos por Gemini (solo si existen) */}
          {comprobante.campos.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Detalle de extracción Gemini
              </h2>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-100 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Campo</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Extraído</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Confianza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {comprobante.campos.map((c) => (
                      <tr key={c.campo}>
                        <td className="px-3 py-2 font-mono text-gray-700">{c.campo}</td>
                        <td className="px-3 py-2 text-gray-900">
                          {c.valorFinal ?? c.valorExtraido ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {c.confianza != null ? `${c.confianza}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Metadatos internos */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Información interna</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Campo
                label="Cargado"
                value={new Date(comprobante.creadoEn).toLocaleString("es-PY")}
              />
              <Campo
                label="Origen"
                value={comprobante.origen === "MANUAL_PDF_IMG" ? "PDF / Imagen" : "e-Kuatia XML"}
              />
              {comprobante.geminiModelo && (
                <Campo label="Modelo Gemini" value={comprobante.geminiModelo} />
              )}
              {comprobante.confianzaGeneral != null && (
                <Campo label="Confianza general" value={`${comprobante.confianzaGeneral}%`} />
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
