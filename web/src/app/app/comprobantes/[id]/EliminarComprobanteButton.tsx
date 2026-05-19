"use client";

import { useState } from "react";
import { eliminarComprobante } from "./actions";

interface Props {
  comprobanteId: string;
}

export function EliminarComprobanteButton({ comprobanteId }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEliminar() {
    setLoading(true);
    setError(null);
    const result = await eliminarComprobante(comprobanteId);
    // If result is returned (not redirected), it means there was an error
    if (!result.ok) {
      setError(result.errors?.[0]?.mensaje ?? "Error al eliminar");
      setLoading(false);
      setConfirm(false);
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-700">¿Eliminar definitivamente?</span>
        <button
          onClick={handleEliminar}
          disabled={loading}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Eliminando…" : "Sí, eliminar"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          disabled={loading}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
    >
      Eliminar
    </button>
  );
}
