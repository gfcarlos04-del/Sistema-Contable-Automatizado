// Cliente activo: persistencia en cookie HTTP-only del id seleccionado por el
// usuario. Se valida en cada lectura que el cliente exista y pertenezca a la
// organización del usuario actual (defensa en profundidad).

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "tavex_cliente_activo";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export interface ClienteActivo {
  id: string;
  razonSocial: string;
  ruc: string;
  dv: number;
}

/**
 * Devuelve el cliente activo si existe y pertenece a la organización del
 * usuario actual. Si la cookie apunta a un id inválido (cliente borrado, o
 * de otra organización), devuelve null.
 */
export async function getClienteActivo(): Promise<ClienteActivo | null> {
  const session = await auth();
  if (!session?.user) return null;

  const jar = await cookies();
  const id = jar.get(COOKIE_NAME)?.value;
  if (!id) return null;

  const cliente = await prisma.cliente.findFirst({
    where: {
      id,
      organizacionId: session.user.organizacionId,
      activo: true,
    },
    select: { id: true, razonSocial: true, ruc: true, dv: true },
  });
  return cliente;
}

/**
 * Setea o limpia el cliente activo. Devuelve `true` si el cambio se aplicó
 * (o sea, si el cliente existe y pertenece a la org).
 */
export async function setClienteActivo(clienteId: string | null): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;

  const jar = await cookies();

  if (clienteId === null) {
    jar.delete(COOKIE_NAME);
    return true;
  }

  const existe = await prisma.cliente.findFirst({
    where: {
      id: clienteId,
      organizacionId: session.user.organizacionId,
      activo: true,
    },
    select: { id: true },
  });
  if (!existe) return false;

  jar.set(COOKIE_NAME, clienteId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return true;
}
