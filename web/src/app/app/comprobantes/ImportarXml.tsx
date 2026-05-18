"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Phase =
  | { name: "idle" }
  | { name: "uploading" }
  | { name: "error"; message: string }
  | { name: "ok"; comprobanteId: string };

export function ImportarXml({ clienteId }: { clienteId: string }) {
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const upload = useCallback(
    async (file: File) => {
      if (
        !file.name.toLowerCase().endsWith(".xml") &&
        file.type !== "text/xml" &&
        file.type !== "application/xml"
      ) {
        setPhase({ name: "error", message: "Solo se aceptan archivos XML de e-Kuatia." });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setPhase({ name: "error", message: "El archivo XML supera el límite de 5 MB." });
        return;
      }

      setPhase({ name: "uploading" });

      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("clienteId", clienteId);

        const res = await fetch("/api/archivos/upload-xml", { method: "POST", body: fd });
        const data = await res.json();

        if (!res.ok) {
          setPhase({ name: "error", message: data?.error ?? `Error ${res.status}` });
          return;
        }

        setPhase({ name: "ok", comprobanteId: data.comprobanteId });
        router.push(`/app/comprobantes/${data.comprobanteId}`);
      } catch {
        setPhase({ name: "error", message: "Error de red al procesar el XML." });
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
      e.target.value = "";
    },
    [upload],
  );

  const reset = () => setPhase({ name: "idle" });

  if (phase.name === "uploading") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
        <Spinner />
        <p className="text-sm text-gray-600">Procesando XML e-Kuatia…</p>
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

  if (phase.name === "ok") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <p className="text-sm font-medium text-green-700">
          Comprobante importado correctamente. Redirigiendo…
        </p>
      </div>
    );
  }

  // idle
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona de carga XML: arrastrá o hacé clic para seleccionar"
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
        <XmlIcon />
        <div>
          <p className="text-sm font-medium text-gray-700">
            Arrastrá el XML acá, o{" "}
            <span className="text-gray-900 underline underline-offset-2">seleccionalo</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">Formato e-Kuatia SIFEN — máx. 5 MB</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

function XmlIcon() {
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
        d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
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
