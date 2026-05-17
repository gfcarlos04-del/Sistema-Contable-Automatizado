import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { signOutAction } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const organizacion = await prisma.organizacion.findUnique({
    where: { id: session.user.organizacionId },
    select: { nombre: true, slug: true },
  });

  const clientes = await prisma.cliente.findMany({
    where: { organizacionId: session.user.organizacionId, activo: true },
    select: { id: true, razonSocial: true, ruc: true, dv: true },
    orderBy: { razonSocial: "asc" },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/app" className="text-sm font-semibold tracking-tight">
              Marangatu
            </Link>
            <span className="text-xs text-gray-500">{organizacion?.nombre}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Selector de cliente (placeholder funcional; en F1 será controlado y persistente). */}
            <label className="flex items-center gap-2 text-xs text-gray-600">
              Cliente activo:
              <select
                className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                defaultValue=""
                disabled={clientes.length === 0}
              >
                <option value="" disabled>
                  {clientes.length === 0 ? "Sin clientes — creá uno en F1" : "Seleccionar…"}
                </option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razonSocial} ({c.ruc}-{c.dv})
                  </option>
                ))}
              </select>
            </label>

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
            <NavLink href="/app/configuracion">Configuración</NavLink>
          </nav>
          <p className="mt-6 text-xs text-gray-500">
            Las secciones se irán habilitando en cada fase del plan.
          </p>
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
