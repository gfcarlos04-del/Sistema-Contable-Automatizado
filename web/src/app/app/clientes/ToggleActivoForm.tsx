"use client";

import { useTransition } from "react";
import { toggleActivoClienteAction } from "./actions";

export function ToggleActivoForm({ clienteId, activo }: { clienteId: string; activo: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(activo ? "¿Dar de baja este cliente?" : "¿Reactivar este cliente?")) return;
        startTransition(async () => {
          await toggleActivoClienteAction(clienteId);
        });
      }}
      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
    >
      {activo ? "Dar de baja" : "Reactivar"}
    </button>
  );
}
