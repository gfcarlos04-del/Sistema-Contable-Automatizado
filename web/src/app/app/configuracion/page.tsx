import { auth } from "@/auth";
import { existeApiKeyGemini } from "./actions";
import { GeminiKeyForm } from "./GeminiKeyForm";

export const metadata = { title: "Configuración — Marangatu" };

export default async function ConfiguracionPage() {
  const session = (await auth())!;
  const yaTieneKey = await existeApiKeyGemini(session.user.organizacionId);
  const esAdmin = session.user.rol === "ADMIN";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
      <p className="mt-1 text-sm text-gray-600">
        Ajustes específicos de esta organización. Solo el rol Admin puede modificar.
      </p>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold">API Key de Gemini</h2>
        <p className="mt-1 text-sm text-gray-600">
          La key se guarda cifrada en reposo con AES-256-GCM. Sólo se desencripta en el servidor al
          llamar a Gemini, nunca llega al frontend.
        </p>

        <div className="mt-3 text-xs">
          Estado actual:{" "}
          {yaTieneKey ? (
            <span className="font-medium text-green-700">configurada</span>
          ) : (
            <span className="font-medium text-amber-700">no configurada</span>
          )}
        </div>

        {esAdmin ? (
          <GeminiKeyForm yaTieneKey={yaTieneKey} />
        ) : (
          <p className="mt-4 text-sm text-gray-500">Sólo el Admin puede modificar la API Key.</p>
        )}
      </section>
    </div>
  );
}
