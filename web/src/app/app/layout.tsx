import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClienteActivo } from "@/lib/cliente-activo";
import { signOutAction } from "./actions";
import { SelectorCliente } from "./SelectorCliente";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [organizacion, clientes, clienteActivo] = await Promise.all([
    prisma.organizacion.findUnique({
      where: { id: session.user.organizacionId },
      select: { nombre: true, slug: true },
    }),
    prisma.cliente.findMany({
      where: { organizacionId: session.user.organizacionId, activo: true },
      select: { id: true, razonSocial: true, ruc: true, dv: true },
      orderBy: { razonSocial: "asc" },
    }),
    getClienteActivo(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/app" className="text-sm font-semibold tracking-tight">
              Tavex
            </Link>
            <span className="text-xs text-gray-500">{organizacion?.nombre}</span>
          </div>

          <div className="flex items-center gap-4">
            <SelectorCliente clientes={clientes} clienteActivoId={clienteActivo?.id ?? null} />

            <span className="text-xs text-gray-500">
              {session.user.name} · {session.user.rol === "ADMIN" ? "Admin" : "Operador"}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-6 py-6">
        <aside className="w-56 shrink-0">
          <nav className="flex flex-col gap-1 text-sm">
            <NavLink href="/app">Inicio</NavLink>
            <NavLink href="/app/clientes">Clientes</NavLink>
            <NavLink href="/app/comprobantes">Comprobantes</NavLink>
            <NavLink href="/app/exportaciones">Exportaciones</NavLink>
            <NavLink href="/app/auditoria">Auditoría</NavLink>
            {session.user.rol === "ADMIN" && (
              <NavLink href="/app/usuarios">Usuarios</NavLink>
            )}
            <NavLink href="/app/configuracion">Configuración</NavLink>
          </nav>
          {clienteActivo && (
            <p className="mt-6 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Trabajando con:
              <br />
              <strong>{clienteActivo.razonSocial}</strong>
              <br />
              <span className="font-mono">
                {clienteActivo.ruc}-{clienteActivo.dv}
              </span>
            </p>
          )}
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md px-3 py-2 hover:bg-gray-100">
      {children}
    </Link>
  );
}
