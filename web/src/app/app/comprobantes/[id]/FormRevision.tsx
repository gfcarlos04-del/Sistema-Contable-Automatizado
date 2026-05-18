"use client";

import { useActionState, useRef, useState } from "react";
import {
  guardarCampos,
  aprobarComprobante,
  rechazarComprobante,
  reextraerComprobante,
  type FormData,
} from "./actions";
import type { ErrorValidacion } from "@/lib/validar";

// ── Constants ─────────────────────────────────────────────────────────────

const TIPO_REGISTRO_OPTS = [
  { value: 1, label: "1 — Ventas" },
  { value: 2, label: "2 — Compras" },
  { value: 3, label: "3 — Ingresos" },
  { value: 4, label: "4 — Egresos" },
];

const TIPO_COMPROBANTE_OPTS = [
  { value: 101, label: "101 — Autofactura" },
  { value: 102, label: "102 — Boleta de transporte" },
  { value: 103, label: "103 — Boleta de venta" },
  { value: 104, label: "104 — Comprobante de retención de IVA" },
  { value: 105, label: "105 — Comprobante de retención de ISC" },
  { value: 106, label: "106 — Liquidación de compra" },
  { value: 107, label: "107 — Despacho de importación" },
  { value: 108, label: "108 — Entrada a espectáculos" },
  { value: 109, label: "109 — Factura" },
  { value: 110, label: "110 — Nota de crédito" },
  { value: 111, label: "111 — Nota de débito" },
  { value: 112, label: "112 — Ticket" },
  { value: 201, label: "201 — Comprobante de retención" },
  { value: 205, label: "205 — Nota de remisión" },
  { value: 206, label: "206 — Extracto IPS" },
  { value: 207, label: "207 — Comprobante de transacción electrónica" },
  { value: 208, label: "208 — Liquidación de salario" },
  { value: 209, label: "209 — Declaración de importación" },
  { value: 210, label: "210 — Otro comprobante" },
  { value: 211, label: "211 — Comprobante de exportación" },
];

// ── Confidence badge ──────────────────────────────────────────────────────

function ConfianzaBadge({ campo, campos }: { campo: string; campos: CampoData[] }) {
  const found = campos.find((c) => c.campo === campo);
  if (!found || found.confianza == null) return null;
  const c = found.confianza;
  const cls =
    c >= 90
      ? "bg-green-100 text-green-700"
      : c >= 70
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-700";
  return <span className={`ml-1 rounded px-1 py-0.5 text-xs font-medium ${cls}`}>{c}%</span>;
}

// ── Types ─────────────────────────────────────────────────────────────────

interface CampoData {
  campo: string;
  valorExtraido: string | null;
  valorFinal: string | null;
  confianza: number | null;
  status: string;
}

interface FormRevisionProps {
  comprobanteId: string;
  initial: {
    tipoRegistro: number;
    tipoComprobante: number;
    fechaEmision: string | null;
    timbrado: string | null;
    numero: string | null;
    rucContraparte: string | null;
    dvContraparte: number | null;
    nombreContraparte: string | null;
    tipoIdentificacionContraparte: number | null;
    montoGravado10: number;
    iva10: number;
    montoGravado5: number;
    iva5: number;
    exento: number;
    total: number;
    condicionOperacion: number | null;
    imputaIva: string;
    imputaIre: string;
    imputaIrpRsp: string;
    noImputa: string;
    comprobanteAsociadoNumero: string | null;
    comprobanteAsociadoTimbrado: string | null;
  };
  campos: CampoData[];
  readOnly?: boolean;
}

// ── Main component ────────────────────────────────────────────────────────

export function FormRevision({
  comprobanteId,
  initial,
  campos,
  readOnly = false,
}: FormRevisionProps) {
  const [saveResult, saveAction, saving] = useActionState(
    async (
      _prev: { ok: boolean; errors?: ErrorValidacion[] } | null,
      formData: globalThis.FormData,
    ) => {
      const data: FormData = {
        tipoRegistro: parseInt(formData.get("tipoRegistro") as string, 10),
        tipoComprobante: parseInt(formData.get("tipoComprobante") as string, 10),
        fechaEmision: (formData.get("fechaEmision") as string) ?? "",
        timbrado: (formData.get("timbrado") as string) ?? "",
        numero: (formData.get("numero") as string) ?? "",
        rucContraparte: (formData.get("rucContraparte") as string) ?? "",
        dvContraparte: parseInt(formData.get("dvContraparte") as string, 10),
        nombreContraparte: (formData.get("nombreContraparte") as string) ?? "",
        tipoIdentificacionContraparte: parseInt(
          formData.get("tipoIdentificacionContraparte") as string,
          10,
        ),
        montoGravado10: parseInt(formData.get("montoGravado10") as string, 10) || 0,
        iva10: parseInt(formData.get("iva10") as string, 10) || 0,
        montoGravado5: parseInt(formData.get("montoGravado5") as string, 10) || 0,
        iva5: parseInt(formData.get("iva5") as string, 10) || 0,
        exento: parseInt(formData.get("exento") as string, 10) || 0,
        total: parseInt(formData.get("total") as string, 10) || 0,
        condicionOperacion: parseInt(formData.get("condicionOperacion") as string, 10) || 1,
        imputaIva: formData.get("imputaIva") === "S" ? "S" : "N",
        imputaIre: formData.get("imputaIre") === "S" ? "S" : "N",
        imputaIrpRsp: formData.get("imputaIrpRsp") === "S" ? "S" : "N",
        noImputa: formData.get("noImputa") === "S" ? "S" : "N",
        comprobanteAsociadoNumero:
          (formData.get("comprobanteAsociadoNumero") as string) || undefined,
        comprobanteAsociadoTimbrado:
          (formData.get("comprobanteAsociadoTimbrado") as string) || undefined,
      };
      return guardarCampos(comprobanteId, data);
    },
    null,
  );

  const [approveResult, approveAction, approving] = useActionState(
    async (_prev: { ok: boolean; errors?: ErrorValidacion[] } | null) => {
      return aprobarComprobante(comprobanteId);
    },
    null,
  );

  const [clientError, setClientError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function validateForm(): string | null {
    if (!formRef.current) return null;
    const fd = new globalThis.FormData(formRef.current);
    const total = parseInt(fd.get("total") as string, 10) || 0;
    const fechaEmision = (fd.get("fechaEmision") as string) ?? "";
    const tipoComprobante = parseInt(fd.get("tipoComprobante") as string, 10);

    if (total <= 0) return "El total debe ser mayor a 0.";
    if (!fechaEmision) return "La fecha de emisión es obligatoria.";
    if (tipoComprobante === 0) return "Seleccioná el tipo de comprobante.";
    const imputaIva = fd.get("imputaIva") === "S";
    const imputaIre = fd.get("imputaIre") === "S";
    const imputaIrpRsp = fd.get("imputaIrpRsp") === "S";
    const noImputa = fd.get("noImputa") === "S";
    if (!imputaIva && !imputaIre && !imputaIrpRsp && !noImputa)
      return "Marcá al menos una imputación (IVA, IRE, IRP-RSP o No Imputa).";
    return null;
  }

  const [rejectMotivo, setRejectMotivo] = useState("");
  const [rejectResult, rejectAction, rejecting] = useActionState(
    async (_prev: { ok: boolean; errors?: ErrorValidacion[] } | null) => {
      return rechazarComprobante(comprobanteId, rejectMotivo);
    },
    null,
  );

  const [reextractResult, reextractAction, reextracting] = useActionState(
    async (_prev: { ok: boolean; errors?: ErrorValidacion[] } | null) => {
      return reextraerComprobante(comprobanteId);
    },
    null,
  );

  const errors = approveResult?.errors ?? saveResult?.errors ?? [];
  const allErrors = clientError
    ? [{ codigo: "CLIENT", mensaje: clientError, nivel: "BLOQ" as const }, ...errors]
    : errors;

  return (
    <div className="space-y-6">
      {/* Error list */}
      {allErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm font-medium text-red-800">Errores de validación:</p>
          <ul className="list-inside list-disc space-y-1">
            {allErrors.map((e) => (
              <li key={e.codigo} className="text-sm text-red-700">
                <strong>[{e.codigo}]</strong> {e.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}

      {saveResult?.ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          Cambios guardados correctamente.
        </div>
      )}

      <form
        ref={formRef}
        action={saveAction}
        onSubmit={(e) => {
          const err = validateForm();
          if (err) {
            e.preventDefault();
            setClientError(err);
          } else {
            setClientError(null);
          }
        }}
        className="space-y-6"
      >
        {/* Tipo de registro y comprobante */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Clasificación</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">Tipo de registro</label>
              <select
                name="tipoRegistro"
                defaultValue={initial.tipoRegistro || 2}
                disabled={readOnly}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              >
                {TIPO_REGISTRO_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Tipo de comprobante
                <ConfianzaBadge campo="document_type" campos={campos} />
              </label>
              <select
                name="tipoComprobante"
                defaultValue={initial.tipoComprobante || 109}
                disabled={readOnly}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              >
                <option value={0}>— Pendiente —</option>
                {TIPO_COMPROBANTE_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Identificación */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Identificación</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Timbrado
                <ConfianzaBadge campo="timbrado" campos={campos} />
              </label>
              <input
                type="text"
                name="timbrado"
                defaultValue={initial.timbrado ?? ""}
                disabled={readOnly}
                placeholder="12345678"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Número
                <ConfianzaBadge campo="numero_comprobante" campos={campos} />
              </label>
              <input
                type="text"
                name="numero"
                defaultValue={initial.numero ?? ""}
                disabled={readOnly}
                placeholder="001-001-0000001"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Fecha de emisión
                <ConfianzaBadge campo="fecha_emision" campos={campos} />
              </label>
              <input
                type="date"
                name="fechaEmision"
                defaultValue={initial.fechaEmision ?? ""}
                disabled={readOnly}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Condición de operación
              </label>
              <select
                name="condicionOperacion"
                defaultValue={initial.condicionOperacion ?? 1}
                disabled={readOnly}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              >
                <option value={1}>Contado</option>
                <option value={2}>Crédito</option>
              </select>
            </div>
          </div>
        </section>

        {/* Contraparte */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Contraparte</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600">
                Nombre / Razón social
                <ConfianzaBadge campo="nombre_emisor" campos={campos} />
              </label>
              <input
                type="text"
                name="nombreContraparte"
                defaultValue={initial.nombreContraparte ?? ""}
                disabled={readOnly}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                RUC
                <ConfianzaBadge campo="ruc_emisor" campos={campos} />
              </label>
              <input
                type="text"
                name="rucContraparte"
                defaultValue={initial.rucContraparte ?? ""}
                disabled={readOnly}
                placeholder="80024627"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                DV
                <ConfianzaBadge campo="dv_emisor" campos={campos} />
              </label>
              <input
                type="number"
                name="dvContraparte"
                defaultValue={initial.dvContraparte ?? ""}
                disabled={readOnly}
                min={0}
                max={9}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Tipo de identificación
              </label>
              <select
                name="tipoIdentificacionContraparte"
                defaultValue={initial.tipoIdentificacionContraparte ?? 11}
                disabled={readOnly}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              >
                <option value={11}>RUC</option>
                <option value={12}>Cédula</option>
                <option value={13}>Pasaporte</option>
                <option value={14}>Innominado</option>
              </select>
            </div>
          </div>
        </section>

        {/* Montos */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Montos (₲)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Gravado 10%
                <ConfianzaBadge campo="monto_gravado_10_iva_incluido" campos={campos} />
              </label>
              <input
                type="number"
                name="montoGravado10"
                defaultValue={initial.montoGravado10}
                disabled={readOnly}
                min={0}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                IVA 10%
                <ConfianzaBadge campo="iva_10" campos={campos} />
              </label>
              <input
                type="number"
                name="iva10"
                defaultValue={initial.iva10}
                disabled={readOnly}
                min={0}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Gravado 5%
                <ConfianzaBadge campo="monto_gravado_5_iva_incluido" campos={campos} />
              </label>
              <input
                type="number"
                name="montoGravado5"
                defaultValue={initial.montoGravado5}
                disabled={readOnly}
                min={0}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                IVA 5%
                <ConfianzaBadge campo="iva_5" campos={campos} />
              </label>
              <input
                type="number"
                name="iva5"
                defaultValue={initial.iva5}
                disabled={readOnly}
                min={0}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Exento
                <ConfianzaBadge campo="exento" campos={campos} />
              </label>
              <input
                type="number"
                name="exento"
                defaultValue={initial.exento}
                disabled={readOnly}
                min={0}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Total
                <ConfianzaBadge campo="total" campos={campos} />
              </label>
              <input
                type="number"
                name="total"
                defaultValue={initial.total}
                disabled={readOnly}
                min={0}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm font-semibold disabled:bg-gray-50"
              />
            </div>
          </div>
        </section>

        {/* Imputaciones */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Imputaciones</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "imputaIva", label: "Imputa IVA", initial: initial.imputaIva },
              { name: "imputaIre", label: "Imputa IRE", initial: initial.imputaIre },
              { name: "imputaIrpRsp", label: "Imputa IRP-RSP", initial: initial.imputaIrpRsp },
              { name: "noImputa", label: "No Imputa", initial: initial.noImputa },
            ].map((item) => (
              <label key={item.name} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={item.name}
                  value="S"
                  defaultChecked={item.initial === "S"}
                  disabled={readOnly}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {item.label}
              </label>
            ))}
          </div>
        </section>

        {/* Comprobante asociado */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Comprobante asociado (opcional)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">Número asociado</label>
              <input
                type="text"
                name="comprobanteAsociadoNumero"
                defaultValue={initial.comprobanteAsociadoNumero ?? ""}
                disabled={readOnly}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Timbrado asociado</label>
              <input
                type="text"
                name="comprobanteAsociadoTimbrado"
                defaultValue={initial.comprobanteAsociadoTimbrado ?? ""}
                disabled={readOnly}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm disabled:bg-gray-50"
              />
            </div>
          </div>
        </section>

        {/* Action buttons */}
        {!readOnly && (
          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        )}
      </form>

      {/* Approve / Reject / Re-extract — separate forms */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
          <form
            action={approveAction}
            onSubmit={(e) => {
              const err = validateForm();
              if (err) {
                e.preventDefault();
                setClientError(err);
              } else {
                setClientError(null);
              }
            }}
          >
            <button
              type="submit"
              disabled={approving}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {approving ? "Aprobando…" : "Aprobar y registrar"}
            </button>
          </form>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Motivo del rechazo…"
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <form action={rejectAction}>
              <button
                type="submit"
                disabled={rejecting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejecting ? "Rechazando…" : "Rechazar"}
              </button>
            </form>
          </div>

          <form action={reextractAction}>
            <button
              type="submit"
              disabled={reextracting}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {reextracting ? "Re-enviando…" : "Re-extraer con Gemini"}
            </button>
          </form>

          {reextractResult?.ok && (
            <span className="text-sm text-blue-600">
              Re-extracción encolada. Refrescá en unos segundos.
            </span>
          )}
          {rejectResult?.ok && <span className="text-sm text-red-600">Comprobante rechazado.</span>}
        </div>
      )}
    </div>
  );
}
