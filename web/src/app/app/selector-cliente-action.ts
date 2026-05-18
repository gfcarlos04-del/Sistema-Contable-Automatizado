"use server";

import { revalidatePath } from "next/cache";
import { setClienteActivo } from "@/lib/cliente-activo";

export async function seleccionarClienteAction(formData: FormData): Promise<void> {
  const id = formData.get("clienteId");
  const valor = typeof id === "string" && id.length > 0 ? id : null;
  await setClienteActivo(valor);
  revalidatePath("/app", "layout");
}
