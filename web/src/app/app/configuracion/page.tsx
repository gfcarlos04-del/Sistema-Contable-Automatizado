import { auth } from "@/auth";
import { existeApiKeyGemini } from "./actions";
import { GeminiKeyForm } from "./GeminiKeyForm";

export const metadata = { title: "Configuración" };

function estadoBadge(ok: boolean, okLabel: string, noLabel: string) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      {okLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      {noLabel}
    </span>
  );
}

export default async function ConfiguracionPage() {
  const session = (await auth())!;
  const yaTieneKey = await existeApiKeyGemini(session.user.organizacionId);
  const esAdmin = session.user.rol === "ADMIN";
  const tieneRedis = !!process.env.REDIS_URL;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-gray-600">
          Ajustes específicos de esta organización. Solo el rol Admin puede modificar.
        </p>
      </div>

      {/* Estado del sistema */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900">Estado del sistema</h2>
        <div className="mt-4 divide-y divide-gray-100">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">API Key de Gemini</p>
              <p className="text-xs text-gray-500">Necesaria para la extracción automática de datos</p>
            </div>
            {estadoBadge(yaTieneKey, "Configurada", "No configurada")}
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Redis (cola de extracción)</p>
              <p className="text-xs text-gray-500">
                {tieneRedis
                  ? "El worker procesará comprobantes automáticamente al cargarlos."
                  : "Sin Redis, la extracción se dispara manualmente desde cada comprobante."}
              </p>
            </div>
            {estadoBadge(tieneRedis, "Configurado", "No configurado")}
          </div>
        </div>
        {!tieneRedis && (
          <div className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-xs text-amber-700">
            <strong>Sin Redis:</strong> podés usar Tavex igual — la extracción con Gemini se
            disparará manualmente desde la pantalla de cada comprobante. Para habilitar extracción
            automática, creá una base en{" "}
            <a href="https://upstash.com" target="_blank" rel="noopener noreferrer" className="underline">
              Upstash
            </a>{" "}
            y cargá el secret en Fly.io:
            <pre className="mt-2 rounded bg-amber-100 px-3 py-2 font-mono">
              fly secrets set REDIS_URL=&quot;rediss://...&quot; --app tavex
            </pre>
          </div>
        )}
      </section>

      {/* API Key Gemini */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900">API Key de Gemini</h2>
        <p className="mt-1 text-sm text-gray-600">
          Se guarda cifrada en reposo con AES-256-GCM. Nunca llega al frontend.
        </p>
        {esAdmin ? (
          <GeminiKeyForm yaTieneKey={yaTieneKey} />
        ) : (
          <p className="mt-4 text-sm text-gray-500">Sólo el Admin puede modificar la API Key.</p>
        )}
      </section>
    </div>
  );
}
