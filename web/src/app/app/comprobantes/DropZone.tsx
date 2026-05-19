"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────

type FileStatus =
  | { name: "pending" }
  | { name: "uploading"; progress: number }
  | { name: "done"; comprobanteId: string }
  | { name: "duplicado"; comprobanteId: string | null }
  | { name: "error"; message: string };

interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
}

const MIMES_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/tiff"];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

// ── Componente ─────────────────────────────────────────────────────────────

export function DropZone({ clienteId }: { clienteId: string }) {
  const [queue, setQueue] = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Update status of a single file in the queue
  const updateStatus = useCallback((id: string, status: FileStatus) => {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
  }, []);

  // Upload a single file and return result
  const uploadFile = useCallback(
    async (item: FileItem): Promise<void> => {
      const { id, file } = item;

      if (!MIMES_PERMITIDOS.includes(file.type)) {
        updateStatus(id, { name: "error", message: `Tipo no permitido: ${file.type || "desconocido"}` });
        return;
      }
      if (file.size > MAX_BYTES) {
        updateStatus(id, { name: "error", message: "Supera el límite de 20 MB" });
        return;
      }

      try {
        const result = await new Promise<{
          comprobanteId?: string;
          duplicado?: boolean;
          error?: string;
        }>((resolve, reject) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("clienteId", clienteId);

          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              updateStatus(id, { name: "uploading", progress: Math.round((e.loaded / e.total) * 100) });
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
          xhr.addEventListener("error", () => reject(new Error("Error de red")));
          xhr.open("POST", "/api/archivos/upload");
          xhr.send(fd);
          updateStatus(id, { name: "uploading", progress: 0 });
        });

        if (result.error) {
          updateStatus(id, { name: "error", message: result.error });
        } else if (result.duplicado) {
          updateStatus(id, { name: "duplicado", comprobanteId: result.comprobanteId ?? null });
        } else {
          updateStatus(id, { name: "done", comprobanteId: result.comprobanteId! });
        }
      } catch (err) {
        updateStatus(id, {
          name: "error",
          message: err instanceof Error ? err.message : "Error inesperado",
        });
      }
    },
    [clienteId, updateStatus],
  );

  // Process the entire queue sequentially
  const processQueue = useCallback(
    async (items: FileItem[]) => {
      setProcessing(true);
      for (const item of items) {
        if (item.status.name === "pending") {
          await uploadFile(item);
        }
      }
      setProcessing(false);
      router.refresh();
    },
    [uploadFile, router],
  );

  // Add files to queue and start processing
  const addFiles = useCallback(
    (files: File[]) => {
      const newItems: FileItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: { name: "pending" },
      }));
      setQueue((prev) => {
        const updated = [...prev, ...newItems];
        // Start processing after state update
        setTimeout(() => processQueue(newItems), 0);
        return updated;
      });
    },
    [processQueue],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) addFiles(files);
    },
    [addFiles],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) addFiles(files);
      e.target.value = "";
    },
    [addFiles],
  );

  const clearDone = () =>
    setQueue((prev) => prev.filter((f) => f.status.name === "pending" || f.status.name === "uploading"));

  const allDone = queue.length > 0 && queue.every((f) => f.status.name !== "pending" && f.status.name !== "uploading");
  const successCount = queue.filter((f) => f.status.name === "done").length;
  const firstDoneId = queue.find((f) => f.status.name === "done")?.status.name === "done"
    ? (queue.find((f) => f.status.name === "done")!.status as { name: "done"; comprobanteId: string }).comprobanteId
    : null;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona de carga: arrastrá o hacé clic para seleccionar archivos"
        className={`flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      >
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${dragging ? "bg-indigo-100" : "bg-gray-100"}`}>
          <svg className={`h-6 w-6 transition-colors ${dragging ? "text-indigo-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">
            Arrastrá archivos acá, o{" "}
            <span className="text-indigo-600 underline underline-offset-2">seleccioná</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">PDF · JPG · PNG · WebP · TIFF — máx. 20 MB por archivo</p>
          <p className="mt-0.5 text-xs font-medium text-indigo-500">Podés seleccionar varios archivos a la vez</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={MIMES_PERMITIDOS.join(",")}
        multiple
        className="hidden"
        onChange={handleChange}
      />

      {/* Queue */}
      {queue.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Summary bar when all done */}
          {allDone && (
            <div className="flex items-center justify-between border-b border-gray-100 bg-emerald-50 px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {successCount} {successCount === 1 ? "comprobante cargado" : "comprobantes cargados"}
              </div>
              <div className="flex gap-2">
                {successCount === 1 && firstDoneId && (
                  <a
                    href={`/app/comprobantes/${firstDoneId}`}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                  >
                    Ver comprobante
                  </a>
                )}
                {successCount > 1 && (
                  <a
                    href="/app/comprobantes"
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                  >
                    Ver listado
                  </a>
                )}
                <button
                  onClick={clearDone}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cargar más
                </button>
              </div>
            </div>
          )}

          {/* File rows */}
          <ul className="divide-y divide-gray-100">
            {queue.map((item) => (
              <FileRow key={item.id} item={item} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── FileRow ────────────────────────────────────────────────────────────────

function FileRow({ item }: { item: FileItem }) {
  const { file, status } = item;
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {/* File icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>

      {/* Name + size */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
        <p className="text-xs text-gray-500">{sizeMB} MB</p>
        {/* Progress bar */}
        {status.name === "uploading" && (
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-indigo-500 transition-all duration-200"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="shrink-0">
        {status.name === "pending" && (
          <span className="text-xs text-gray-400">En cola</span>
        )}
        {status.name === "uploading" && (
          <span className="text-xs font-medium text-indigo-600">{status.progress}%</span>
        )}
        {status.name === "done" && (
          <a
            href={`/app/comprobantes/${status.comprobanteId}`}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Cargado
          </a>
        )}
        {status.name === "duplicado" && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
            Duplicado
          </span>
        )}
        {status.name === "error" && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-600" title={status.message}>
            Error
          </span>
        )}
      </div>
    </li>
  );
}
