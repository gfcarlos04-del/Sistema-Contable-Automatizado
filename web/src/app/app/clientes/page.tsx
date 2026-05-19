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
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
          >
            + Nuevo cliente
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
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Razón social</th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">RUC</th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Régimen</th>
                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">Comprobantes</th>
                <th className="px-4 py-3 text-center text-xs font-semibold tracking-wide text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientes.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${c.activo ? "" : "opacity-60"}`}>
                  <td className="px-4 py-3">
                    <Link href={`/app/clientes/${c.id}`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                      {c.razonSocial}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-700">
                    {c.ruc}-{c.dv}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.regimen.map((r) => (
                        <span key={r} className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                          {r.replace("_", "-")}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700 tabular-nums">{c._count.comprobantes}</td>
                  <td className="px-4 py-3 text-center">
                    {c.activo ? (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">Inactivo</span>
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
