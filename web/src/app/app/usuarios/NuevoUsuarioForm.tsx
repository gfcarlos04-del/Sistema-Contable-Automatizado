"use client";

import { useActionState } from "react";
import { crearUsuario } from "./actions";
import type { ActionResult } from "./actions";

type FormState = ActionResult | null;

async function crearUsuarioAction(prev: FormState, formData: FormData): Promise<FormState> {
  return crearUsuario({
    nombre: String(formData.get("nombre") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    rol: String(formData.get("rol") ?? "OPERADOR") as "ADMIN" | "OPERADOR",
  });
}

export function NuevoUsuarioForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    crearUsuarioAction,
    null,
  );

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">Nuevo usuario</h2>
      <form
        action={formAction}
        className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="nombre">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            minLength={2}
            placeholder="Juan Pérez"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="usuario@empresa.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="rol">
            Rol
          </label>
          <select
            id="rol"
            name="rol"
            defaultValue="OPERADOR"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none"
          >
            <option value="OPERADOR">Operador</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? "Creando…" : "Crear"}
          </button>
        </div>
      </form>

      {state && !state.ok && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state && state.ok && (
        <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Usuario creado correctamente.
        </p>
      )}
    </div>
  );
}
