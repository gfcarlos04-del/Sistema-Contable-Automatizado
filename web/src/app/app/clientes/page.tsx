import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ToggleActivoForm } from "./ToggleActivoForm";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const session = (await auth())!;
  const esAdmin = session.user.rol === "ADMIN";

  const clientes = await prisma.cliente.findMany({
    where: { organizacionId: session.user.organizacionId },
    orderBy: [{ activo: "desc" }, { razonSocial: "asc" }],
    select: {
      id: true,
      razonSocial: true,
      ruc: true,
      dv: true,
      regimen: true,
      activo: true,
      _count: { select: { comprobantes: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Cada cliente declara con su propio RUC y régimen tributario.
          </p>
        </div>
        {esAdmin && (
          <Link
            href="/app/clientes/nuevo"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Nuevo cliente
          </Link>
        )}
      </div>

      {clientes.length === 0 ? (
        <div className="mt-8 rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No hay clientes todavía.
          {esAdmin && (
            <>
              {" "}
              <Link href="/app/clientes/nuevo" className="font-medium text-gray-900 underline">
                Creá el primero
              </Link>
              .
            </>
          )}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs tracking-wide text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Razón social</th>
                <th className="px-4 py-2 text-left">RUC</th>
                <th className="px-4 py-2 text-left">Régimen</th>
                <th className="px-4 py-2 text-right">Comprobantes</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clientes.map((c) => (
                <tr key={c.id} className={c.activo ? "" : "bg-gray-50 text-gray-400"}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/app/clientes/${c.id}`} className="hover:underline">
                      {c.razonSocial}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {c.ruc}-{c.dv}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.regimen.map((r) => (
                        <span key={r} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs">
                          {r.replace("_", "-")}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c._count.comprobantes}</td>
                  <td className="px-4 py-3 text-center">
                    {c.activo ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {esAdmin && <ToggleActivoForm clienteId={c.id} activo={c.activo} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
