"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ProcesandoPoller() {
  const router = useRouter();

  useEffect(() => {
    const id = setTimeout(() => {
      router.refresh();
    }, 5000);
    return () => clearTimeout(id);
  }, [router]);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
      <span>
        <strong>Extracción en curso.</strong> Gemini está procesando el comprobante. La página se
        actualizará automáticamente en 5 segundos…
      </span>
    </div>
  );
}
