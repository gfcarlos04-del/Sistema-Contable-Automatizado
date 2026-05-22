"use client";

import { useState } from "react";

interface GenerarExportacionProps {
  clienteId: string;
  clienteNombre: string;
}

type Modo = "mensual" | "anual";

interface ResultadoExportacion {
  ok?: boolean;
  url?: string;
  filename?: string;
  registros?: number;
  error?: string;
}

export function GenerarExportacion({ clienteId, clienteNombre }: GenerarExportacionProps) {
  const hoy = new Date();
  const defaultPeriodo = `${String(hoy.getMonth() + 1).padStart(2, "0")}/${hoy.getFullYear()}`;
  const defaultAnio = hoy.getFullYear();

  const [modo, setModo] = useState<Modo>("mensual");
  const [periodo, setPeriodo] = useState(defaultPeriodo);
  const [anio, setAnio] = useState(defaultAnio);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultadoExportacion | null>(null);

  function handleModoChange(nuevoModo: Modo) {
    setModo(nuevoModo);
    setResult(null);
  }

  async function handleGenerar() {
    setLoading(true);
    setResult(null);
    try {
      const body = modo === "mensual" ? { clienteId, periodo } : { clienteId, anio };

      const res = await fetch("/api/exportaciones/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? "Error al generar la exportación" });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ error: "Error de red al generar la exportación" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Generar ZIP Marangatu</h2>

      <p className="mb-4 text-sm text-gray-600">
        Cliente: <strong>{clienteNombre}</strong>
      </p>

      {/* Toggle Mensual / Anual */}
      <div className="mb-5 inline-flex rounded-md border border-gray-300 bg-gray-100 p-0.5">
        <button
          type="button"
          onClick={() => handleModoChange("mensual")}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            modo === "mensual"
              ? "bg-gray-900 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Mensual
        </button>
        <button
          type="button"
          onClick={() => handleModoChange("anual")}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            modo === "anual"
              ? "bg-gray-900 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Anual
        </button>
      </div>

      <div className="flex items-end gap-4">
        {modo === "mensual" ? (
          <div>
            <label className="block text-xs font-medium text-gray-600">Período (MM/YYYY)</label>
            <input
              type="text"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              placeholder="01/2025"
              pattern="\d{2}/\d{4}"
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-600">Año</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              min={2020}
              max={2099}
              className="mt-1 w-28 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
            />
          </div>
        )}

        <button
          onClick={handleGenerar}
          disabled={loading}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading
            ? "Generando…"
            : modo === "mensual"
              ? "Generar ZIP mensual"
              : "Generar ZIP anual"}
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
            ZIP generado correctamente — {result.registros} comprobantes.
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
