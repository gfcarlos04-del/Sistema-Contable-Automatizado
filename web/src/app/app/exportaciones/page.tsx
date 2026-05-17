export const metadata = { title: "Exportaciones — Marangatu" };

export default function ExportacionesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Exportaciones</h1>
      <p className="mt-1 text-sm text-gray-600">
        ZIP Marangatu (obligaciones 955/956), Planilla XLSX y Libros (IVA/IVA+IRE/IRP).
      </p>
      <div className="mt-6 rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500">
        Se habilita en <strong>Fase 4</strong> del plan.
      </div>
    </div>
  );
}
