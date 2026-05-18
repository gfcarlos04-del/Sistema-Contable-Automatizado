"use client";

import { useActionState } from "react";
import type { Regimen } from "@/generated/prisma/enums";
import type { FormState } from "./actions";

const REGIMEN_LABELS: Record<Regimen, string> = {
  IVA: "IVA",
  IRE: "IRE (general)",
  IRE_SIMPLE: "IRE SIMPLE",
  IRP_RSP: "IRP-RSP",
};

interface Defaults {
  razonSocial?: string;
  ruc?: string;
  regimen?: Regimen[];
}

export function ClienteForm({
  action,
  submitLabel,
  defaults,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  defaults?: Defaults;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label htmlFor="razonSocial" className="block text-sm font-medium">
          Razón social
        </label>
        <input
          id="razonSocial"
          name="razonSocial"
          type="text"
          required
          minLength={2}
          maxLength={200}
          defaultValue={defaults?.razonSocial ?? ""}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="ruc" className="block text-sm font-medium">
          RUC
        </label>
        <input
          id="ruc"
          name="ruc"
          type="text"
          required
          defaultValue={defaults?.ruc ?? ""}
          placeholder="80012345-7 o sólo 80012345"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-gray-900 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          Podés ingresar con DV (`80012345-7`) o sin DV (`80012345`); el sistema calcula y valida.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Régimen tributario</legend>
        <p className="mt-1 text-xs text-gray-500">
          Marcá uno o más. Determina qué libros se generan para este cliente.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          {(Object.keys(REGIMEN_LABELS) as Regimen[]).map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="regimen"
                value={r}
                defaultChecked={defaults?.regimen?.includes(r) ?? false}
                className="h-4 w-4 rounded border-gray-300"
              />
              {REGIMEN_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>

      {state && !state.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state && state.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Cambios guardados.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
