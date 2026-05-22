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
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="razonSocial" className="block text-sm font-medium text-gray-700">
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
          className="mt-1 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="ruc" className="block text-sm font-medium text-gray-700">
          RUC
        </label>
        <input
          id="ruc"
          name="ruc"
          type="text"
          required
          defaultValue={defaults?.ruc ?? ""}
          placeholder="80012345-7 o sólo 80012345"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-mono text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          Podés ingresar con DV (`80012345-7`) o sin DV (`80012345`); el sistema calcula y valida.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-gray-700">Régimen tributario</legend>
        <p className="mt-1 text-xs text-gray-500">
          Marcá uno o más. Determina qué libros se generan para este cliente.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          {(Object.keys(REGIMEN_LABELS) as Regimen[]).map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700"
            >
              <input
                type="checkbox"
                name="regimen"
                value={r}
                defaultChecked={defaults?.regimen?.includes(r) ?? false}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              {REGIMEN_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>

      {state && !state.ok && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state && state.ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cambios guardados.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
