"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { resetearPassword } from "./actions";

type State = { ok: boolean; error?: string; success?: boolean } | null;

export function ResetForm({ tokenPlano }: { tokenPlano: string }) {
  const router = useRouter();

  const [state, dispatch, pending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const nueva = formData.get("passwordNuevo") as string;
      const confirmar = formData.get("passwordConfirmar") as string;
      const result = await resetearPassword(tokenPlano, nueva, confirmar);
      if (result.ok) {
        setTimeout(() => router.push("/login"), 2000);
        return { ok: true, success: true };
      }
      return { ok: false, error: result.error };
    },
    null,
  );

  if (state?.ok && state.success) {
    return (
      <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-medium">¡Contraseña actualizada!</p>
        <p className="mt-2 text-xs">Te redirigimos al login…</p>
        <Link href="/login" className="mt-3 inline-block font-medium text-emerald-700 underline">
          Ir al login ahora
        </Link>
      </div>
    );
  }

  return (
    <form action={dispatch} className="mt-8 space-y-5">
      <div>
        <label htmlFor="passwordNuevo" className="block text-sm font-medium text-gray-700">
          Nueva contraseña
        </label>
        <input
          id="passwordNuevo"
          name="passwordNuevo"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <div>
        <label htmlFor="passwordConfirmar" className="block text-sm font-medium text-gray-700">
          Confirmar contraseña
        </label>
        <input
          id="passwordConfirmar"
          name="passwordConfirmar"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          placeholder="Repetí la contraseña"
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
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
