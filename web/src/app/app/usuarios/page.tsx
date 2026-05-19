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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Usuarios</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestioná los usuarios de tu organización.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-center text-xs font-semibold tracking-wide text-gray-500 uppercase">Rol</th>
              <th className="px-4 py-3 text-center text-xs font-semibold tracking-wide text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Creado</th>
              <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map((u) => {
              const esYo = u.id === currentUserId;
              return (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.activo ? "" : "opacity-60"}`}>
                  <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                    {u.nombre}
                    {esYo && (
                      <span className="ml-2 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        tú
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    {u.rol === "ADMIN" ? (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700">
                        Admin
                      </span>
                    ) : (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                        Operador
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.activo ? (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
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
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="mb-5 text-base font-semibold text-gray-900">Nuevo usuario</h2>
        <NuevoUsuarioForm />
      </div>
    </div>
  );
}
