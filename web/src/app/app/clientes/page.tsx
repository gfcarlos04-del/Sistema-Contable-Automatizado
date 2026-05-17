export const metadata = { title: "Clientes — Marangatu" };

export default function ClientesPage() {
  return (
    <PlaceholderSeccion
      titulo="Clientes"
      descripcion="ABM de clientes con validación de RUC + dígito verificador."
      fase="Fase 1"
    />
  );
}

function PlaceholderSeccion({
  titulo,
  descripcion,
  fase,
}: {
  titulo: string;
  descripcion: string;
  fase: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-1 text-sm text-gray-600">{descripcion}</p>
      <div className="mt-6 rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500">
        Esta sección se habilita en <strong>{fase}</strong> del plan.
      </div>
    </div>
  );
}
