import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Inicio" };

export default async function AppHome() {
  const session = (await auth())!;
  const [clientesCount, comprobantesCount, catalogoTipos] = await Promise.all([
    prisma.cliente.count({ where: { organizacionId: session.user.organizacionId } }),
    prisma.comprobante.count({ where: { organizacionId: session.user.organizacionId } }),
    prisma.catalogoTipoComprobante.count(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
      <p className="mt-1 text-sm text-gray-600">
        Hola {session.user.name}. Tu organización está lista y los catálogos oficiales de la SET ya
        están cargados.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card label="Clientes" value={clientesCount} />
        <Card label="Comprobantes registrados" value={comprobantesCount} />
        <Card label="Tipos de comprobante SET" value={catalogoTipos} />
      </div>

      <section className="mt-10 rounded-lg border border-gray-200 bg-gray-50 p-5">
        <h2 className="text-sm font-semibold">Estado del proyecto — Fase 1</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>Base de datos en Neon + schema multi-tenant migrado.</li>
          <li>Catálogos Tablas 1-5 SET (junio/2021) sembrados.</li>
          <li>Auth con NextAuth + roles Admin/Operador.</li>
          <li>ABM de clientes con validación RUC + DV y selector persistente.</li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Próximo: upload de comprobantes con Cloudflare R2 + visor PDF/imagen.
        </p>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-xs tracking-wide text-gray-500 uppercase">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
