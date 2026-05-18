"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ── Tipos ──────────────────────────────────────────────────────────────────

type Phase =
  | { name: "idle" }
  | { name: "uploading"; progress: number; nombre: string }
  | { name: "procesando" }
  | { name: "error"; message: string }
  | { name: "duplicado"; comprobanteId: string | null };

const MIMES_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/tiff"];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

// ── Componente ─────────────────────────────────────────────────────────────

export function DropZone({ clienteId }: { clienteId: string }) {
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const upload = useCallback(
    async (file: File) => {
      // ── Validaciones locales ───────────────────────────────────────────
      if (!MIMES_PERMITIDOS.includes(file.type)) {
        setPhase({
          name: "error",
          message: `Tipo no permitido (${file.type || "desconocido"}). Aceptamos PDF, JPG, PNG, WebP, TIFF.`,
        });
        return;
      }
      if (file.size > MAX_BYTES) {
        setPhase({ name: "error", message: "El archivo supera el límite de 20 MB." });
        return;
      }

      // ── Upload con progreso (XHR para poder rastrear) ──────────────────
      try {
        const result = await new Promise<{
          comprobanteId?: string;
          archivoId?: string;
          duplicado?: boolean;
          error?: string;
        }>((resolve, reject) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("clienteId", clienteId);

          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setPhase({
                name: "uploading",
                progress: Math.round((e.loaded / e.total) * 100),
                nombre: file.name,
              });
            }
          });

          xhr.addEventListener("load", () => {
            try {
              const data = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) resolve(data);
              else resolve({ error: data?.error ?? `Error ${xhr.status}` });
            } catch {
              reject(new Error("Respuesta inesperada del servidor"));
            }
          });

          xhr.addEventListener("error", () =>
            reject(new Error("Error de red al subir el archivo")),
          );
          xhr.addEventListener("abort", () => reject(new Error("Carga cancelada")));

          xhr.open("POST", "/api/archivos/upload");
          xhr.send(fd);

          // Estado inicial mientras se envía
          setPhase({ name: "uploading", progress: 0, nombre: file.name });
        });

        if (result.error) {
          setPhase({ name: "error", message: result.error });
          return;
        }

        if (result.duplicado) {
          setPhase({ name: "duplicado", comprobanteId: result.comprobanteId ?? null });
          return;
        }

        // Redirigir al detalle del comprobante creado
        setPhase({ name: "procesando" });
        router.push(`/app/comprobantes/${result.comprobanteId}`);
      } catch (err) {
        setPhase({
          name: "error",
          message: err instanceof Error ? err.message : "Error inesperado",
        });
      }
    },
    [clienteId, router],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      // Limpiar input para permitir volver a subir el mismo archivo
      e.target.value = "";
    },
    [upload],
  );

  const reset = () => setPhase({ name: "idle" });

  // ── Render ─────────────────────────────────────────────────────────────

  if (phase.name === "procesando") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
        <Spinner />
        <p className="text-sm text-gray-600">Procesando comprobante…</p>
      </div>
    );
  }

  if (phase.name === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm font-medium text-red-700">{phase.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-md border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  if (phase.name === "duplicado") {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-8 text-center">
        <p className="text-sm font-medium text-yellow-800">
          Este archivo ya fue cargado anteriormente.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          {phase.comprobanteId && (
            <a
              href={`/app/comprobantes/${phase.comprobanteId}`}
              className="rounded-md bg-yellow-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-yellow-800"
            >
              Ver comprobante existente
            </a>
          )}
          <button
            onClick={reset}
            className="rounded-md border border-yellow-400 px-4 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100"
          >
            Cargar otro archivo
          </button>
        </div>
      </div>
    );
  }

  if (phase.name === "uploading") {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
        <p className="text-sm text-gray-600">
          Subiendo <span className="font-medium">{phase.nombre}</span>…
        </p>
        <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-gray-900 transition-all duration-200"
            style={{ width: `${phase.progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">{phase.progress}%</p>
      </div>
    );
  }

  // idle
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona de carga: arrastrá o hacé clic para seleccionar un archivo"
        className={`flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          dragging
            ? "border-gray-500 bg-gray-100"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <UploadIcon />
        <div>
          <p className="text-sm font-medium text-gray-700">
            Arrastrá el archivo acá, o{" "}
            <span className="text-gray-900 underline underline-offset-2">seleccionalo</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">PDF · JPG · PNG · WebP · TIFF — máx. 20 MB</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={MIMES_PERMITIDOS.join(",")}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ── Iconos inline ──────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg
      className="h-10 w-10 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
