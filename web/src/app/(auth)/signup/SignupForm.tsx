"use client";

import { useActionState } from "react";
import { signupAction, type SignupResult } from "../actions";

const initial: SignupResult | null = null;

export function SignupForm() {
  const [state, formAction, pending] = useActionState<SignupResult | null, FormData>(
    async (_prev, formData) => signupAction(formData),
    initial,
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <Field
        id="organizacion"
        label="Nombre del estudio / organización"
        required
        minLength={2}
        maxLength={120}
      />
      <Field id="nombre" label="Tu nombre" required minLength={2} maxLength={120} />
      <Field id="email" label="Email" type="email" required autoComplete="email" />
      <Field
        id="password"
        label="Contraseña"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        hint="Mínimo 8 caracteres."
      />

      {state && !state.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Creando…" : "Crear cuenta"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  ...rest
}: {
  id: string;
  label: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        {...rest}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
