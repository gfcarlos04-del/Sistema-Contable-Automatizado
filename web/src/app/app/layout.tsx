import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClienteActivo } from "@/lib/cliente-activo";
import { AppSidebar } from "./AppSidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [organizacion, clientes, clienteActivo] = await Promise.all([
    prisma.organizacion.findUnique({
      where: { id: session.user.organizacionId },
      select: { nombre: true },
    }),
    prisma.cliente.findMany({
      where: { organizacionId: session.user.organizacionId, activo: true },
      select: { id: true, razonSocial: true, ruc: true, dv: true },
      orderBy: { razonSocial: "asc" },
    }),
    getClienteActivo(),
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AppSidebar
        organizacionNombre={organizacion?.nombre ?? ""}
        userName={session.user.name ?? session.user.email ?? ""}
        userEmail={session.user.email ?? ""}
        userRol={session.user.rol}
        esAdmin={session.user.rol === "ADMIN"}
        clientes={clientes}
        clienteActivoId={clienteActivo?.id ?? null}
        clienteActivoNombre={clienteActivo?.razonSocial ?? null}
        clienteActivoRuc={clienteActivo ? `${clienteActivo.ruc}-${clienteActivo.dv}` : null}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
