"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reactivarComprobante } from "./actions";

interface Props {
  comprobanteId: string;
}

export function ReactivarComprobanteButton({ comprobanteId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReactivar() {
    setLoading(true);
    setError(null);
    const result = await reactivarComprobante(comprobanteId);
    if (!result.ok) {
      setError(result.errors?.[0]?.mensaje ?? "Error al reactivar");
      setLoading(false);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleReactivar}
        disabled={loading}
        className="rounded-md border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
      >
        {loading ? "Reactivando…" : "Reactivar para corrección"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
