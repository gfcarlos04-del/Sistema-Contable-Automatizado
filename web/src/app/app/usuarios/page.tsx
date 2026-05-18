import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toggleActivoUsuario, cambiarRolUsuario } from "./actions";
import { NuevoUsuarioForm } from "./NuevoUsuarioForm";

export const metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.rol !== "ADMIN") redirect("/app");

  const usuarios = await prisma.usuario.findMany({
    where: { organizacionId: session.user.organizacionId },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      creadoEn: true,
    },
  });

  const currentUserId = session.user.id;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gestioná los usuarios de tu organización.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-center">Rol</th>
              <th className="px-4 py-2 text-center">Estado</th>
              <th className="px-4 py-2 text-left">Creado</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuarios.map((u) => {
              const esYo = u.id === currentUserId;
              return (
                <tr key={u.id} className={u.activo ? "" : "bg-gray-50 text-gray-400"}>
                  <td className="px-4 py-3 font-medium">
                    {u.nombre}
                    {esYo && (
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        tú
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    {u.rol === "ADMIN" ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        Admin
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                        Operador
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.activo ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">
                    {new Date(u.creadoEn).toLocaleDateString("es-PY", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Toggle activo */}
                      <form
                        action={async () => {
                          "use server";
                          await toggleActivoUsuario(u.id);
                        }}
                      >
                        <button
                          type="submit"
                          disabled={esYo}
                          title={esYo ? "No podés desactivarte a vos mismo" : u.activo ? "Desactivar" : "Activar"}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {u.activo ? "Desactivar" : "Activar"}
                        </button>
                      </form>

                      {/* Toggle rol */}
                      <form
                        action={async () => {
                          "use server";
                          await cambiarRolUsuario(u.id, u.rol === "ADMIN" ? "OPERADOR" : "ADMIN");
                        }}
                      >
                        <button
                          type="submit"
                          disabled={esYo}
                          title={esYo ? "No podés cambiar tu propio rol" : u.rol === "ADMIN" ? "Pasar a Operador" : "Pasar a Admin"}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {u.rol === "ADMIN" ? "→ Operador" : "→ Admin"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <NuevoUsuarioForm />
    </div>
  );
}
