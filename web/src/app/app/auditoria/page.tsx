export const metadata = { title: "Auditoría" };

export default function AuditoriaPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
      <p className="mt-1 text-sm text-gray-600">
        Historial de cambios sobre comprobantes y entidades.
      </p>
      <div className="mt-6 rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500">
        Se habilita en <strong>Fase 5</strong> del plan.
      </div>
    </div>
  );
}
