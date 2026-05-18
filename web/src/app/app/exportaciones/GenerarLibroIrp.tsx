"use client";

import { useState } from "react";

interface GenerarLibroIrpProps {
  clienteId: string;
  clienteNombre: string;
}

export function GenerarLibroIrp({ clienteId, clienteNombre }: GenerarLibroIrpProps) {
  const currentYear = new Date().getFullYear();
  const [anio, setAnio] = useState(String(currentYear));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok?: boolean;
    url?: string;
    filename?: string;
    registros?: number;
    error?: string;
  } | null>(null);

  async function handleGenerar() {
    const anioNum = parseInt(anio, 10);
    if (!anioNum || anioNum < 2021) {
      setResult({ error: "Ingresá un año válido (>= 2021)" });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/exportaciones/libro-irp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId, anio: anioNum }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? "Error al generar el Libro IRP" });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ error: "Error de red al generar el Libro IRP" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <h2 className="mb-1 text-sm font-semibold text-gray-700">Generar Libro IRP Excel</h2>
      <p className="mb-4 text-xs text-gray-500">
        Incluye comprobantes con imputación IRP-RSP (manuales y e-Kuatia). No se exporta a
        Marangatu; es un libro interno para el contador.
      </p>

      <p className="mb-4 text-sm text-gray-600">
        Cliente: <strong>{clienteNombre}</strong>
      </p>

      <div className="flex items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600">Ejercicio fiscal (año)</label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            min={2021}
            max={2100}
            className="mt-1 w-28 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
          />
        </div>
        <button
          onClick={handleGenerar}
          disabled={loading}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Generando…" : "Generar Libro IRP (.xlsx)"}
        </button>
      </div>

      {result?.error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      )}

      {result?.ok && result.url && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <p className="font-medium">
            Libro IRP generado — {result.registros} comprobante
            {result.registros !== 1 ? "s" : ""} con IRP-RSP.
          </p>
          <a
            href={result.url}
            download={result.filename}
            className="mt-2 inline-block rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Descargar {result.filename}
          </a>
        </div>
      )}
    </div>
  );
}
