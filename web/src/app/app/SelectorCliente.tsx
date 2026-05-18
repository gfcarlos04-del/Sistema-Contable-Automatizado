"use client";

import { useRef, useTransition } from "react";
import { seleccionarClienteAction } from "./selector-cliente-action";

interface ClienteOption {
  id: string;
  razonSocial: string;
  ruc: string;
  dv: number;
}

export function SelectorCliente({
  clientes,
  clienteActivoId,
}: {
  clientes: ClienteOption[];
  clienteActivoId: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={seleccionarClienteAction}>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        Cliente activo:
        <select
          name="clienteId"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs disabled:opacity-60"
          defaultValue={clienteActivoId ?? ""}
          disabled={clientes.length === 0 || pending}
          onChange={() => {
            startTransition(() => formRef.current?.requestSubmit());
          }}
        >
          <option value="">
            {clientes.length === 0 ? "Sin clientes — creá uno" : "— Sin seleccionar —"}
          </option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.razonSocial} ({c.ruc}-{c.dv})
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
