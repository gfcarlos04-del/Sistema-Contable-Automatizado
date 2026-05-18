export const metadata = { title: "Comprobantes" };

export default function ComprobantesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Comprobantes</h1>
      <p className="mt-1 text-sm text-gray-600">Carga, extracción Gemini, revisión y aprobación.</p>
      <div className="mt-6 rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500">
        Se habilita en <strong>Fase 1 / 2</strong> del plan.
      </div>
    </div>
  );
}
