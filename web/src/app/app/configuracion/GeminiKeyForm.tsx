"use client";

import { useActionState } from "react";
import { guardarApiKeyGeminiAction, type GuardarResult } from "./actions";

export function GeminiKeyForm({ yaTieneKey }: { yaTieneKey: boolean }) {
  const [state, formAction, pending] = useActionState<GuardarResult | null, FormData>(
    async (_prev, formData) => guardarApiKeyGeminiAction(formData),
    null,
  );

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input
        name="apiKey"
        type="password"
        required
        minLength={10}
        autoComplete="off"
        placeholder="AIza…"
        className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-gray-900 focus:outline-none"
      />

      {state && !state.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state && state.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          API Key guardada (cifrada).
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Guardando…" : yaTieneKey ? "Reemplazar" : "Guardar"}
      </button>
    </form>
  );
}
