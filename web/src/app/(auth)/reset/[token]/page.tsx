import Link from "next/link";
import { ResetForm } from "./ResetForm";
import { validarToken } from "./actions";

export const metadata = { title: "Restablecer contraseña" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { valido, razon } = await validarToken(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">
            T
          </div>
          <span className="text-lg font-semibold text-gray-900">Tavex</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {valido ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                Elegí tu nueva contraseña
              </h1>
              <p className="mt-1.5 text-sm text-gray-500">
                Usá al menos 8 caracteres. Una vez actualizada vas a poder iniciar sesión.
              </p>
              <ResetForm tokenPlano={token} />
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                Enlace inválido
              </h1>
              <p className="mt-2 text-sm text-gray-600">{razon}</p>
              <Link
                href="/olvide"
                className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Solicitar uno nuevo
              </Link>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  );
}
