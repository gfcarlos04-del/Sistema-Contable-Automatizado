"use client";

import { useActionState } from "react";
import { solicitarReset } from "./actions";

type State = { ok: boolean; error?: string; sent?: boolean } | null;

export function OlvideForm() {
  const [state, dispatch, pending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const email = formData.get("email") as string;
      const result = await solicitarReset(email);
      if (result.ok) return { ok: true, sent: true };
      return { ok: false, error: result.error };
    },
    null,
  );

  if (state?.ok && state.sent) {
    return (
      <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-medium">
          Si el email existe, te enviamos un enlace para restablecer tu contraseña.
        </p>
        <p className="mt-2 text-xs text-emerald-700">
          Revisá tu bandeja de entrada (y la carpeta de spam). El enlace vence en 60 minutos.
        </p>
      </div>
    );
  }

  return (
    <form action={dispatch} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          placeholder="tu@empresa.com"
        />
      </div>

      {state && !state.ok && state.error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
          <svg
            className="h-4 w-4 shrink-0 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Enviar enlace de recuperación"}
      </button>
    </form>
  );
}
