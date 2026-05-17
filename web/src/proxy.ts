// Next.js 16: `middleware.ts` se renombró a `proxy.ts`. La función exportada
// se llama `proxy` (la convención `middleware` también funciona pero está
// deprecada). Runtime es nodejs (no edge).

import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAppRoute = pathname.startsWith("/app");

  if (!req.auth && isAppRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return Response.redirect(url);
  }

  if (req.auth && (pathname === "/login" || pathname === "/signup")) {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    return Response.redirect(url);
  }

  // Sin retorno explícito → continúa a la ruta.
  return undefined;
});

export const config = {
  // Matcher Next.js: aplica a todas las rutas excepto assets estáticos.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
