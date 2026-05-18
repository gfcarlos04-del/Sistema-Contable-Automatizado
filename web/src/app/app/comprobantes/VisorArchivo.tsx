"use client";

import { useEffect, useState } from "react";

type Estado =
  | { phase: "cargando" }
  | { phase: "ok"; url: string; mime: string }
  | { phase: "error"; message: string };

export function VisorArchivo({ archivoId }: { archivoId: string }) {
  const [estado, setEstado] = useState<Estado>({ phase: "cargando" });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/archivos/${archivoId}/url`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.url) {
          setEstado({ phase: "ok", url: data.url, mime: data.mime });
        } else {
          setEstado({ phase: "error", message: data.error ?? "Error al obtener URL del archivo" });
        }
      })
      .catch(() => {
        if (!cancelled) setEstado({ phase: "error", message: "Error de red al cargar el visor" });
      });

    return () => {
      cancelled = true;
    };
  }, [archivoId]);

  if (estado.phase === "cargando") {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <svg className="h-6 w-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  if (estado.phase === "error") {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-center">
        <p className="text-sm text-red-600">{estado.message}</p>
      </div>
    );
  }

  const { url, mime } = estado;

  if (mime === "application/pdf") {
    return (
      <iframe
        src={url}
        title="Visor del comprobante"
        className="h-[640px] w-full rounded-lg border border-gray-200"
      />
    );
  }

  // Imagen
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Comprobante"
      className="max-h-[640px] w-full rounded-lg border border-gray-200 bg-gray-50 object-contain"
    />
  );
}
