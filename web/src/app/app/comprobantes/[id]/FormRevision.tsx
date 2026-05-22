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
    // Campos opcionales según tipo
    operacionMonedaExtranjera: string | null;
    periodo: string | null;
    especificarTipoDocumento: string | null;
    numeroCuenta: string | null;
    banco: string | null;
    identificadorEmpleadorIps: string | null;
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
        operacionMonedaExtranjera:
          formData.get("operacionMonedaExtranjera") === "S" ? "S" : "N",
        periodo: (formData.get("periodo") as string) || undefined,
        especificarTipoDocumento:
          (formData.get("especificarTipoDocumento") as string) || undefined,
        numeroCuenta: (formData.get("numeroCuenta") as string) || undefined,
        banco: (formData.get("banco") as string) || undefined,
        identificadorEmpleadorIps:
          (formData.get("identificadorEmpleadorIps") as string) || undefined,
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
  const [tipoActual, setTipoActual] = useState<number>(initial.tipoComprobante || 109);
  const formRef = useRef<HTMLFormElement>(null);

  // Visibilidad condicional según tipo (matchea V-007/V-020/V-021/V-022)
  const muestraPeriodo = tipoActual === 206 || tipoActual === 208;
  const muestraEspecificarTipoDoc = tipoActual === 209 || tipoActual === 210;
  const muestraCuentaBanco = tipoActual === 207 || tipoActual === 211;
  const muestraEmpleadorIps = tipoActual === 206;

  function validateForm(): string | null {
    if (!formRef.current) return null;
    const fd = new globalThis.FormData(formRef.current);
    const total = parseInt(fd.get("total") as string, 10) || 0;
    const fechaEmision = (fd.get("fechaEmision") as string) ?? "";
    const tipoComprobante = parseInt(fd.get("tipoComprobante") as string, 10);
    const rucContraparte = (fd.get("rucContraparte") as string) ?? "";

    if (total <= 0) return "El total debe ser mayor a 0.";
    if (!fechaEmision) return "La fecha de emisión es obligatoria.";
    if (tipoComprobante === 0) return "Seleccioná el tipo de comprobante.";
    if (rucContraparte && !/^\d{1,8}$/.test(rucContraparte))
      return "El RUC de la contraparte debe tener entre 1 y 8 dígitos numéricos (sin DV).";
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

  const serverErrors = approveResult?.errors ?? saveResult?.errors ?? [];
  const allErrors: ErrorValidacion[] = clientError
    ? [{ codigo: "CLIENT", mensaje: clientError, severidad: "BLOQ" as const }, ...serverErrors]
    : serverErrors;
  const bloqueantes = allErrors.filter((e) => e.severidad === "BLOQ");
  const advertencias = allErrors.filter((e) => e.severidad === "ADV");

  const inputCls = "mt-1 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500";
  const inputMonoCls = `${inputCls} font-mono`;
  const labelCls = "block text-sm font-medium text-gray-700";
  const sectionCls = "bg-white rounded-xl border border-gray-200 shadow-sm p-5";

  return (
    <div className="space-y-5">
      {/* Blocking errors */}
      {bloqueantes.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm font-medium text-red-800">Errores de validación:</p>
          <ul className="list-inside list-disc space-y-1">
            {bloqueantes.map((e) => (
              <li key={e.codigo} className="text-sm text-red-700">
                <strong>[{e.codigo}]</strong> {e.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Advisory warnings */}
      {advertencias.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-medium text-amber-800">Advertencias (no bloquean):</p>
          <ul className="list-inside list-disc space-y-1">
            {advertencias.map((e) => (
              <li key={e.codigo} className="text-sm text-amber-700">
                <strong>[{e.codigo}]</strong> {e.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}

      {saveResult?.ok && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
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
        className="space-y-5"
      >
        {/* Grupo 1: Identificación */}
        <section className={sectionCls}>
          <h3 className="mb-4 text-base font-semibold text-gray-900">Identificación</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo de registro</label>
              <select
                name="tipoRegistro"
                defaultValue={initial.tipoRegistro || 2}
                disabled={readOnly}
                className={inputCls}
              >
                {TIPO_REGISTRO_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Tipo de comprobante
                <ConfianzaBadge campo="document_type" campos={campos} />
              </label>
              <select
                name="tipoComprobante"
                defaultValue={initial.tipoComprobante || 109}
                disabled={readOnly}
                onChange={(e) => setTipoActual(parseInt(e.target.value, 10) || 0)}
                className={inputCls}
              >
                <option value={0}>— Pendiente —</option>
                {TIPO_COMPROBANTE_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Fecha de emisión
                <ConfianzaBadge campo="fecha_emision" campos={campos} />
              </label>
              <input
                type="date"
                name="fechaEmision"
                defaultValue={initial.fechaEmision ?? ""}
                disabled={readOnly}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Condición de operación</label>
              <select
                name="condicionOperacion"
                defaultValue={initial.condicionOperacion ?? 1}
                disabled={readOnly}
                className={inputCls}
              >
                <option value={1}>Contado</option>
                <option value={2}>Crédito</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Timbrado
                <ConfianzaBadge campo="timbrado" campos={campos} />
              </label>
              <input
                type="text"
                name="timbrado"
                defaultValue={initial.timbrado ?? ""}
                disabled={readOnly}
                placeholder="12345678"
                className={inputMonoCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                Número
                <ConfianzaBadge campo="numero_comprobante" campos={campos} />
              </label>
              <input
                type="text"
                name="numero"
                defaultValue={initial.numero ?? ""}
                disabled={readOnly}
                placeholder="001-001-0000001"
                className={inputMonoCls}
              />
            </div>
          </div>
        </section>

        {/* Grupo 2: Contraparte */}
        <section className={sectionCls}>
          <h3 className="mb-4 text-base font-semibold text-gray-900">Contraparte</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>
                Nombre / Razón social
                <ConfianzaBadge campo="nombre_emisor" campos={campos} />
              </label>
              <input
                type="text"
                name="nombreContraparte"
                defaultValue={initial.nombreContraparte ?? ""}
                disabled={readOnly}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                RUC
                <ConfianzaBadge campo="ruc_emisor" campos={campos} />
              </label>
              <input
                type="text"
                name="rucContraparte"
                defaultValue={initial.rucContraparte ?? ""}
                disabled={readOnly}
                placeholder="80024627"
                className={inputMonoCls}
              />
            </div>
            <div>
              <label className={labelCls}>
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
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Tipo de identificación</label>
              <select
                name="tipoIdentificacionContraparte"
                defaultValue={initial.tipoIdentificacionContraparte ?? 11}
                disabled={readOnly}
                className={inputCls}
              >
                <option value={11}>RUC</option>
                <option value={12}>Cédula</option>
                <option value={13}>Pasaporte</option>
                <option value={14}>Innominado</option>
              </select>
            </div>
          </div>
        </section>

        {/* Grupo 3: Montos */}
        <section className={sectionCls}>
          <h3 className="mb-4 text-base font-semibold text-gray-900">Montos (₲)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Gravado 10%
                <ConfianzaBadge campo="monto_gravado_10_iva_incluido" campos={campos} />
              </label>
              <input
                type="number"
                name="montoGravado10"
                defaultValue={initial.montoGravado10}
                disabled={readOnly}
                min={0}
                className={inputMonoCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                IVA 10%
                <ConfianzaBadge campo="iva_10" campos={campos} />
              </label>
              <input
                type="number"
                name="iva10"
                defaultValue={initial.iva10}
                disabled={readOnly}
                min={0}
                className={inputMonoCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                Gravado 5%
                <ConfianzaBadge campo="monto_gravado_5_iva_incluido" campos={campos} />
              </label>
              <input
                type="number"
                name="montoGravado5"
                defaultValue={initial.montoGravado5}
                disabled={readOnly}
                min={0}
                className={inputMonoCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                IVA 5%
                <ConfianzaBadge campo="iva_5" campos={campos} />
              </label>
              <input
                type="number"
                name="iva5"
                defaultValue={initial.iva5}
                disabled={readOnly}
                min={0}
                className={inputMonoCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                Exento
                <ConfianzaBadge campo="exento" campos={campos} />
              </label>
              <input
                type="number"
                name="exento"
                defaultValue={initial.exento}
                disabled={readOnly}
                min={0}
                className={inputMonoCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                <span className="font-semibold">Total</span>
                <ConfianzaBadge campo="total" campos={campos} />
              </label>
              <input
                type="number"
                name="total"
                defaultValue={initial.total}
                disabled={readOnly}
                min={0}
                className={`${inputMonoCls} font-semibold`}
              />
            </div>
          </div>
        </section>

        {/* Grupo 4: Imputación */}
        <section className={sectionCls}>
          <h3 className="mb-4 text-base font-semibold text-gray-900">Imputación</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "imputaIva", label: "Imputa IVA", initial: initial.imputaIva },
              { name: "imputaIre", label: "Imputa IRE", initial: initial.imputaIre },
              { name: "imputaIrpRsp", label: "Imputa IRP-RSP", initial: initial.imputaIrpRsp },
              { name: "noImputa", label: "No Imputa", initial: initial.noImputa },
            ].map((item) => (
              <label key={item.name} className="flex items-center gap-2.5 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  name={item.name}
                  value="S"
                  defaultChecked={item.initial === "S"}
                  disabled={readOnly}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                {item.label}
              </label>
            ))}
          </div>
        </section>

        {/* Grupo 5: Comprobante asociado */}
        <section className={sectionCls}>
          <h3 className="mb-1 text-base font-semibold text-gray-900">Comprobante asociado</h3>
          <p className="mb-4 text-xs text-gray-500">Completar solo si es Nota de Crédito o Débito.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Número asociado</label>
              <input
                type="text"
                name="comprobanteAsociadoNumero"
                defaultValue={initial.comprobanteAsociadoNumero ?? ""}
                disabled={readOnly}
                className={inputMonoCls}
              />
            </div>
            <div>
              <label className={labelCls}>Timbrado asociado</label>
              <input
                type="text"
                name="comprobanteAsociadoTimbrado"
                defaultValue={initial.comprobanteAsociadoTimbrado ?? ""}
                disabled={readOnly}
                className={inputMonoCls}
              />
            </div>
          </div>
        </section>

        {/* Grupo 6: Datos adicionales */}
        <section className={sectionCls}>
          <h3 className="mb-1 text-base font-semibold text-gray-900">Datos adicionales</h3>
          <p className="mb-4 text-xs text-gray-500">
            Algunos campos solo aparecen según el tipo de comprobante seleccionado.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {/* V-009 — moneda extranjera (siempre visible) */}
            <div className="col-span-2">
              <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="operacionMonedaExtranjera"
                  value="S"
                  defaultChecked={initial.operacionMonedaExtranjera === "S"}
                  disabled={readOnly}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Operación en moneda extranjera
              </label>
            </div>

            {/* V-007 — período MM/AAAA (tipos 206/208) */}
            {muestraPeriodo && (
              <div className="col-span-2">
                <label className={labelCls}>Período (MM/AAAA)</label>
                <input
                  type="text"
                  name="periodo"
                  defaultValue={initial.periodo ?? ""}
                  disabled={readOnly}
                  placeholder="06/2024"
                  pattern="\d{2}/\d{4}"
                  className={inputMonoCls}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Obligatorio para Liquidación de Salario (208) y Extracto IPS (206).
                </p>
              </div>
            )}

            {/* V-020 — especificar tipo documento (tipos 209/210) */}
            {muestraEspecificarTipoDoc && (
              <div className="col-span-2">
                <label className={labelCls}>Especificar tipo de documento</label>
                <input
                  type="text"
                  name="especificarTipoDocumento"
                  defaultValue={initial.especificarTipoDocumento ?? ""}
                  disabled={readOnly}
                  placeholder="Ej.: Recibo de honorarios, Alquiler…"
                  maxLength={50}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Obligatorio para Otros comprobantes de ingresos/egresos.
                </p>
              </div>
            )}

            {/* V-021 — número de cuenta y banco (tipos 207/211) */}
            {muestraCuentaBanco && (
              <>
                <div>
                  <label className={labelCls}>Número de cuenta/tarjeta</label>
                  <input
                    type="text"
                    name="numeroCuenta"
                    defaultValue={initial.numeroCuenta ?? ""}
                    disabled={readOnly}
                    className={inputMonoCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Banco / Financiera / Cooperativa</label>
                  <input
                    type="text"
                    name="banco"
                    defaultValue={initial.banco ?? ""}
                    disabled={readOnly}
                    className={inputCls}
                  />
                </div>
                <p className="col-span-2 text-xs text-gray-500">
                  Ambos obligatorios para Extracto TC/TD (207) y Transferencias (211).
                </p>
              </>
            )}

            {/* V-022 — identificador empleador IPS (tipo 206) */}
            {muestraEmpleadorIps && (
              <div className="col-span-2">
                <label className={labelCls}>Identificador del empleador (IPS)</label>
                <input
                  type="text"
                  name="identificadorEmpleadorIps"
                  defaultValue={initial.identificadorEmpleadorIps ?? ""}
                  disabled={readOnly}
                  className={inputMonoCls}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Obligatorio para Extracto de Cuenta IPS (206).
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Botón guardar */}
        {!readOnly && (
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        )}
      </form>

      {/* Approve / Reject / Re-extract — separate forms */}
      {!readOnly && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Acciones</h3>
          <div className="flex flex-wrap items-center gap-3">
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
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm disabled:opacity-50"
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
                className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <form action={rejectAction}>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {rejecting ? "Rechazando…" : "Rechazar"}
                </button>
              </form>
            </div>

            <form action={reextractAction}>
              <button
                type="submit"
                disabled={reextracting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
        </div>
      )}
    </div>
  );
}
