"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { reextraerComprobante } from "./actions";

interface Props {
  comprobanteId: string;
  estado: string;
}

export function ProcesandoPoller({ comprobanteId, estado }: Props) {
  const router = useRouter();
  // Después de 12s sin cambio de estado, ofrecemos extracción manual
  const [timeoutAlcanzado, setTimeoutAlcanzado] = useState(false);
  const [extrayendo, setExtrayendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Polling: refresca la página cada 5s mientras está procesando
  useEffect(() => {
    if (extrayendo) return; // ya estamos extrayendo directamente
    const poll = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(poll);
  }, [router, extrayendo]);

  // Tras 12s sin cambio, mostramos el botón manual
  useEffect(() => {
    const t = setTimeout(() => setTimeoutAlcanzado(true), 12_000);
    return () => clearTimeout(t);
  }, []);

  async function handleExtraerManual() {
    setExtrayendo(true);
    setError(null);
    const result = await reextraerComprobante(comprobanteId);
    if (!result.ok) {
      setError(result.errors?.[0]?.mensaje ?? "Error al extraer");
      setExtrayendo(false);
    } else {
      // Extracción completada (directa o encolada) — refrescar página
      router.refresh();
    }
  }

  if (extrayendo) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span>
          <strong>Extrayendo con Gemini…</strong> Esto puede tardar hasta 30 segundos.
        </span>
      </div>
    );
  }

  if (timeoutAlcanzado && estado === "CARGADO") {
    // El worker no procesó el job (sin Redis o sin API key) — ofrecer extracción directa
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm">
        <p className="font-medium text-amber-800">
          La extracción automática tardó más de lo esperado.
        </p>
        <p className="mt-1 text-amber-700">
          Es posible que Redis no esté configurado. Podés extraer el comprobante ahora mismo.
        </p>
        {error && <p className="mt-2 text-red-700">{error}</p>}
        <button
          onClick={handleExtraerManual}
          className="mt-3 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          Extraer con Gemini ahora
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span>
        <strong>
          {estado === "EXTRAYENDO"
            ? "Gemini está procesando el comprobante…"
            : "Extracción en cola…"}
        </strong>{" "}
        La página se actualizará automáticamente.
      </span>
    </div>
  );
}
