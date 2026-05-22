"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useTransition } from "react";
import { seleccionarClienteAction } from "./selector-cliente-action";
import { signOutAction } from "./actions";

// ── Icons ─────────────────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function IconClients() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

function IconExport() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function IconAudit() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
      />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
      />
    </svg>
  );
}

// ── Nav item ──────────────────────────────────────────────────────────────

function NavItem({
  href,
  icon,
  label,
  exact = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────

interface AppSidebarProps {
  organizacionNombre: string;
  userName: string;
  userEmail: string;
  userRol: string;
  esAdmin: boolean;
  clientes: { id: string; razonSocial: string; ruc: string; dv: number }[];
  clienteActivoId: string | null;
  clienteActivoNombre: string | null;
  clienteActivoRuc: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────

export function AppSidebar({
  organizacionNombre,
  userName,
  userEmail,
  userRol,
  esAdmin,
  clientes,
  clienteActivoId,
  clienteActivoNombre,
  clienteActivoRuc,
}: AppSidebarProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-xs font-bold text-white">
          T
        </div>
        <div>
          <p className="text-sm leading-tight font-semibold text-white">Tavex</p>
          <p className="max-w-[160px] truncate text-[10px] leading-tight text-slate-400">
            {organizacionNombre}
          </p>
        </div>
      </div>

      {/* Selector de cliente */}
      <div className="border-b border-white/10 px-4 py-3">
        <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
          Cliente activo
        </p>
        <form ref={formRef} action={seleccionarClienteAction}>
          <select
            name="clienteId"
            className="w-full rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
            defaultValue={clienteActivoId ?? ""}
            disabled={clientes.length === 0 || pending}
            onChange={() => {
              startTransition(() => formRef.current?.requestSubmit());
            }}
          >
            <option value="">{clientes.length === 0 ? "Sin clientes" : "— Seleccionar —"}</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razonSocial}
              </option>
            ))}
          </select>
        </form>
        {clienteActivoNombre && (
          <p className="mt-1.5 truncate font-mono text-[10px] text-slate-500">
            RUC {clienteActivoRuc}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <NavItem href="/app" icon={<IconHome />} label="Inicio" exact />
        <NavItem href="/app/clientes" icon={<IconClients />} label="Clientes" />
        <NavItem href="/app/comprobantes" icon={<IconDocument />} label="Comprobantes" />
        <NavItem href="/app/exportaciones" icon={<IconExport />} label="Exportaciones" />
        <NavItem href="/app/auditoria" icon={<IconAudit />} label="Auditoría" />
        {esAdmin && <NavItem href="/app/usuarios" icon={<IconUsers />} label="Usuarios" />}

        <div className="mt-4 border-t border-white/10 pt-4">
          <NavItem href="/app/configuracion" icon={<IconSettings />} label="Configuración" />
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/perfil"
            className="-m-1 flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 transition-colors hover:bg-white/5"
            title="Mi perfil"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">{userName}</p>
              <p className="truncate text-[10px] text-slate-400">
                {userRol === "ADMIN" ? "Admin" : "Operador"}
              </p>
            </div>
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <IconLogout />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
