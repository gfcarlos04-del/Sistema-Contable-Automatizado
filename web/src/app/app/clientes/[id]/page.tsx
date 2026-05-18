import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { editarClienteAction, type FormState } from "../actions";
import { ClienteForm } from "../ClienteForm";

export const metadata = { title: "Cliente — Marangatu" };

export default async function ClienteDetallePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = (await auth())!;
  const esAdmin = session.user.rol === "ADMIN";

  const cliente = await prisma.cliente.findFirst({
    where: { id, organizacionId: session.user.organizacionId },
    select: {
      id: true,
      razonSocial: true,
      ruc: true,
      dv: true,
      regimen: true,
      activo: true,
      creadoEn: true,
    },
  });
  if (!cliente) notFound();

  // Bind del id al action (server actions admiten currying).
  async function editarBound(prev: FormState, formData: FormData): Promise<FormState> {
    "use server";
    return editarClienteAction(id, prev, formData);
  }

  return (
    <div className="max-w-xl">
      <div>
        <Link href="/app/clientes" className="text-xs text-gray-500 hover:underline">
          ← Volver a clientes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{cliente.razonSocial}</h1>
        <p className="mt-1 font-mono text-sm text-gray-600">
          RUC {cliente.ruc}-{cliente.dv}
          {!cliente.activo && (
            <span className="ml-3 rounded-full bg-gray-200 px-2 py-0.5 text-xs">Inactivo</span>
          )}
        </p>
      </div>

      {esAdmin ? (
        <ClienteForm
          action={editarBound}
          submitLabel="Guardar cambios"
          defaults={{
            razonSocial: cliente.razonSocial,
            ruc: `${cliente.ruc}-${cliente.dv}`,
            regimen: cliente.regimen,
          }}
        />
      ) : (
        <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Solo el Admin puede editar clientes.
        </div>
      )}
    </div>
  );
}
