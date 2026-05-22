"use client";

import { useActionState, useRef } from "react";
import { cambiarPassword } from "./actions";

type State = { ok: boolean; error?: string; success?: boolean } | null;

export function CambiarPasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, dispatch, pending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const actual = formData.get("passwordActual") as string;
      const nueva = formData.get("passwordNuevo") as string;
      const confirmar = formData.get("passwordConfirmar") as string;
      const result = await cambiarPassword(actual, nueva, confirmar);
      if (result.ok) {
        formRef.current?.reset();
        return { ok: true, success: true };
      }
      return { ok: false, error: result.error };
    },
    null,
  );

  return (
    <form ref={formRef} action={dispatch} className="space-y-4">
      {/* Current password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="passwordActual">
          Contraseña actual
        </label>
        <input
          id="passwordActual"
          name="passwordActual"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="••••••••"
        />
      </div>

      {/* New password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="passwordNuevo">
          Nueva contraseña
        </label>
        <input
          id="passwordNuevo"
          name="passwordNuevo"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      {/* Confirm new password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="passwordConfirmar">
          Confirmar nueva contraseña
        </label>
        <input
          id="passwordConfirmar"
          name="passwordConfirmar"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Repetí la nueva contraseña"
        />
      </div>

      {/* Error message */}
      {state && !state.ok && state.error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          {state.error}
        </div>
      )}

      {/* Success message */}
      {state?.ok && state.success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Contraseña actualizada correctamente.
        </div>
      )}

      <div className="pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}
