import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CambiarPasswordForm } from "./CambiarPasswordForm";

export const metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const nombre = session.user.name ?? "Usuario";
  const email = session.user.email ?? "";
  const { rol } = session.user;
  const initials = nombre
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Mi perfil</h1>
        <p className="mt-1 text-sm text-gray-500">
          Información de tu cuenta y configuración de seguridad.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User info card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Información de cuenta</h2>
          </div>
          <div className="px-5 py-5">
            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{nombre}</p>
                <p className="text-sm text-gray-500 truncate">{email}</p>
              </div>
            </div>

            {/* Fields */}
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Nombre</dt>
                <dd className="font-medium text-gray-900 text-right">{nombre}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium text-gray-900 text-right truncate">{email}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Rol</dt>
                <dd>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      rol === "ADMIN"
                        ? "bg-indigo-50 text-indigo-700 ring-indigo-700/20"
                        : "bg-gray-50 text-gray-700 ring-gray-600/20"
                    }`}
                  >
                    {rol === "ADMIN" ? "Administrador" : "Operador"}
                  </span>
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-xs text-gray-400">
              Para cambiar nombre o email, contactá al administrador de tu organización.
            </p>
          </div>
        </div>

        {/* Change password card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Cambiar contraseña</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Usá una contraseña segura de al menos 8 caracteres.
            </p>
          </div>
          <div className="px-5 py-5 max-w-sm">
            <CambiarPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
