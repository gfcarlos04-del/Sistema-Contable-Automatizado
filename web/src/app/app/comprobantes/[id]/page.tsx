import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VisorArchivo } from "../VisorArchivo";
import { FormRevision } from "./FormRevision";
import { ProcesandoPoller } from "./ProcesandoPoller";
import { EliminarComprobanteButton } from "./EliminarComprobanteButton";

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

  const estado = comprobante.estado;
  const isProcesando = estado === "CARGADO" || estado === "EXTRAYENDO";
  const isReadOnly = estado === "REGISTRADO" || estado === "RECHAZADO";
  const showForm = !isProcesando;

  // Build initial form values
  const initial = {
    tipoRegistro: comprobante.tipoRegistro,
    tipoComprobante: comprobante.tipoComprobante,
    fechaEmision: comprobante.fechaEmision
      ? comprobante.fechaEmision.toISOString().slice(0, 10)
      : null,
    timbrado: comprobante.timbrado,
    numero: comprobante.numero,
    rucContraparte: comprobante.rucContraparte,
    dvContraparte: comprobante.dvContraparte,
    nombreContraparte: comprobante.nombreContraparte,
    tipoIdentificacionContraparte: comprobante.tipoIdentificacionContraparte,
    montoGravado10: Number(comprobante.montoGravado10),
    iva10: Number(comprobante.iva10),
    montoGravado5: Number(comprobante.montoGravado5),
    iva5: Number(comprobante.iva5),
    exento: Number(comprobante.exento),
    total: Number(comprobante.total),
    condicionOperacion: comprobante.condicionOperacion,
    imputaIva: comprobante.imputaIva,
    imputaIre: comprobante.imputaIre,
    imputaIrpRsp: comprobante.imputaIrpRsp,
    noImputa: comprobante.noImputa,
    comprobanteAsociadoNumero: comprobante.comprobanteAsociadoNumero,
    comprobanteAsociadoTimbrado: comprobante.comprobanteAsociadoTimbrado,
  };

  return (
    <div className="max-w-6xl space-y-6">
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
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[estado] ?? "bg-gray-100 text-gray-700"}`}
            >
              {ESTADO_LABEL[estado] ?? estado}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            Cliente:{" "}
            <strong>
              {comprobante.cliente.razonSocial} — {comprobante.cliente.ruc}-{comprobante.cliente.dv}
            </strong>
          </p>
        </div>

        {/* Info metadata + Delete */}
        <div className="flex flex-col items-end gap-2">
          <div className="hidden text-right text-xs text-gray-400 lg:block">
            {comprobante.geminiModelo && <p>Modelo: {comprobante.geminiModelo}</p>}
            {comprobante.confianzaGeneral != null && (
              <p>Confianza: {comprobante.confianzaGeneral}%</p>
            )}
          </div>
          {estado !== "REGISTRADO" && (
            <EliminarComprobanteButton comprobanteId={comprobante.id} />
          )}
        </div>
      </div>

      {/* Processing banner */}
      {isProcesando && <ProcesandoPoller comprobanteId={comprobante.id} estado={estado} />}

      {/* REGISTRADO read-only banner */}
      {estado === "REGISTRADO" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <strong>Registrado</strong>
          {comprobante.aprobadoEn && (
            <span className="ml-2">
              el {new Date(comprobante.aprobadoEn).toLocaleDateString("es-PY")}
            </span>
          )}
          . Este comprobante ya fue aprobado y no puede modificarse.
        </div>
      )}

      {/* RECHAZADO banner */}
      {estado === "RECHAZADO" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Rechazado.</strong> Este comprobante fue descartado.
        </div>
      )}

      {/* Layout: visor + form */}
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

        {/* Formulario de revisión */}
        <div className="lg:col-span-1">
          {showForm ? (
            <FormRevision
              comprobanteId={comprobante.id}
              initial={initial}
              campos={comprobante.campos}
              readOnly={isReadOnly}
            />
          ) : (
            <div className="rounded-lg border border-gray-200 p-6 text-sm text-gray-500">
              Los datos de extracción aparecerán aquí una vez que Gemini termine de procesar el
              comprobante.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
