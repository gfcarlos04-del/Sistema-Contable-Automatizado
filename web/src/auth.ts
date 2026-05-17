import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import type { Rol } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rol: Rol;
      organizacionId: string;
    } & DefaultSession["user"];
  }

  interface User {
    rol: Rol;
    organizacionId: string;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.usuario.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || !user.activo) return null;

        const ok = await verifyPassword(parsed.data.password, user.hashPassword);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          rol: user.rol,
          organizacionId: user.organizacionId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        (token as Record<string, unknown>).rol = user.rol;
        (token as Record<string, unknown>).organizacionId = user.organizacionId;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as Record<string, unknown>;
      if (typeof t.sub === "string") session.user.id = t.sub;
      if (typeof t.rol === "string") session.user.rol = t.rol as Rol;
      if (typeof t.organizacionId === "string") session.user.organizacionId = t.organizacionId;
      return session;
    },
  },
});
