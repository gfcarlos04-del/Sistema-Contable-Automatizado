-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'OPERADOR');

-- CreateEnum
CREATE TYPE "Regimen" AS ENUM ('IVA', 'IRE', 'IRE_SIMPLE', 'IRP_RSP');

-- CreateEnum
CREATE TYPE "OrigenComprobante" AS ENUM ('MANUAL_PDF_IMG', 'E_KUATIA_XML');

-- CreateEnum
CREATE TYPE "EstadoComprobante" AS ENUM ('CARGADO', 'EXTRAYENDO', 'EXTRAIDO', 'EN_REVISION', 'REGISTRADO', 'PENDIENTE', 'RECHAZADO', 'DUPLICADO', 'REQUIERE_REVISION_MANUAL');

-- CreateEnum
CREATE TYPE "StatusCampo" AS ENUM ('CONFIABLE', 'DUDOSO', 'FALTANTE', 'REQUIERE_REVISION', 'EDITADO_MANUALMENTE');

-- CreateEnum
CREATE TYPE "TipoExportacion" AS ENUM ('MARANGATU_ZIP', 'PLANILLA_XLSX', 'LIBRO_IVA', 'LIBRO_IRP');

-- CreateTable
CREATE TABLE "organizacion" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "hash_password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'OPERADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "razon_social" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "dv" INTEGER NOT NULL,
    "regimen" "Regimen"[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivo" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "ruta" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamano_bytes" BIGINT NOT NULL,
    "paginas" INTEGER,
    "hash_sha256" CHAR(64) NOT NULL,
    "subido_por" UUID NOT NULL,
    "subido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprobante" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "origen" "OrigenComprobante" NOT NULL DEFAULT 'MANUAL_PDF_IMG',
    "tipo_registro" SMALLINT NOT NULL,
    "tipo_comprobante" SMALLINT NOT NULL,
    "fecha_emision" DATE,
    "periodo" TEXT,
    "timbrado" TEXT,
    "numero" TEXT,
    "tipo_identificacion_contraparte" SMALLINT,
    "ruc_contraparte" TEXT,
    "dv_contraparte" INTEGER,
    "nombre_contraparte" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'PYG',
    "operacion_moneda_extranjera" CHAR(1) NOT NULL DEFAULT 'N',
    "monto_gravado_10" DECIMAL(18,0) NOT NULL DEFAULT 0,
    "iva_10" DECIMAL(18,0) NOT NULL DEFAULT 0,
    "monto_gravado_5" DECIMAL(18,0) NOT NULL DEFAULT 0,
    "iva_5" DECIMAL(18,0) NOT NULL DEFAULT 0,
    "exento" DECIMAL(18,0) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,0) NOT NULL DEFAULT 0,
    "condicion_operacion" SMALLINT,
    "imputa_iva" CHAR(1) NOT NULL DEFAULT 'N',
    "imputa_ire" CHAR(1) NOT NULL DEFAULT 'N',
    "imputa_irp_rsp" CHAR(1) NOT NULL DEFAULT 'N',
    "no_imputa" CHAR(1) NOT NULL DEFAULT 'N',
    "comprobante_asociado_numero" TEXT,
    "comprobante_asociado_timbrado" TEXT,
    "especificar_tipo_documento" TEXT,
    "numero_cuenta" TEXT,
    "banco" TEXT,
    "identificador_empleador_ips" TEXT,
    "estado" "EstadoComprobante" NOT NULL DEFAULT 'CARGADO',
    "confianza_general" SMALLINT,
    "archivo_id" UUID,
    "hash_archivo" CHAR(64),
    "gemini_request_id" TEXT,
    "gemini_modelo" TEXT,
    "creado_por" UUID NOT NULL,
    "aprobado_por" UUID,
    "aprobado_en" TIMESTAMP(3),
    "registrado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comprobante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campo_extraido" (
    "id" UUID NOT NULL,
    "comprobante_id" UUID NOT NULL,
    "campo" TEXT NOT NULL,
    "valor_extraido" TEXT,
    "valor_final" TEXT,
    "confianza" SMALLINT,
    "status" "StatusCampo" NOT NULL DEFAULT 'REQUIERE_REVISION',
    "observacion" TEXT,
    "ubicacion_bbox" JSONB,

    CONSTRAINT "campo_extraido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_cambio" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "entidad" TEXT NOT NULL,
    "id_entidad" UUID NOT NULL,
    "campo" TEXT NOT NULL,
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,
    "usuario_id" UUID NOT NULL,
    "motivo" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exportacion" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "tipo" "TipoExportacion" NOT NULL,
    "periodo" TEXT NOT NULL,
    "obligacion" SMALLINT,
    "ruta_archivo" TEXT NOT NULL,
    "hash_archivo" CHAR(64) NOT NULL,
    "registros_incluidos" INTEGER NOT NULL,
    "creado_por" UUID NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exportacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_org" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT,
    "valor_cifrado" BYTEA,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "actualizado_por" UUID,

    CONSTRAINT "configuracion_org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_tipo_registro" (
    "codigo" SMALLINT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "vigente_desde" DATE NOT NULL,
    "vigente_hasta" DATE,

    CONSTRAINT "catalogo_tipo_registro_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "catalogo_condicion" (
    "codigo" SMALLINT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "vigente_desde" DATE NOT NULL,
    "vigente_hasta" DATE,

    CONSTRAINT "catalogo_condicion_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "catalogo_tipo_identificacion" (
    "codigo" SMALLINT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "vigente_desde" DATE NOT NULL,
    "vigente_hasta" DATE,

    CONSTRAINT "catalogo_tipo_identificacion_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "catalogo_tipo_comprobante" (
    "codigo" SMALLINT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipos_registro_permitidos" SMALLINT[],
    "requiere_timbrado" BOOLEAN NOT NULL DEFAULT true,
    "requiere_numero" BOOLEAN NOT NULL DEFAULT true,
    "permite_gravado" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "vigente_desde" DATE NOT NULL,
    "vigente_hasta" DATE,

    CONSTRAINT "catalogo_tipo_comprobante_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "catalogo_booleano" (
    "codigo" CHAR(1) NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "catalogo_booleano_pkey" PRIMARY KEY ("codigo")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizacion_slug_key" ON "organizacion"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_organizacion_id_idx" ON "usuario"("organizacion_id");

-- CreateIndex
CREATE INDEX "cliente_organizacion_id_idx" ON "cliente"("organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_organizacion_id_ruc_key" ON "cliente"("organizacion_id", "ruc");

-- CreateIndex
CREATE INDEX "archivo_organizacion_id_idx" ON "archivo"("organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "archivo_cliente_id_hash_sha256_key" ON "archivo"("cliente_id", "hash_sha256");

-- CreateIndex
CREATE INDEX "comprobante_organizacion_id_idx" ON "comprobante"("organizacion_id");

-- CreateIndex
CREATE INDEX "comprobante_cliente_id_fecha_emision_idx" ON "comprobante"("cliente_id", "fecha_emision");

-- CreateIndex
CREATE INDEX "comprobante_cliente_id_estado_idx" ON "comprobante"("cliente_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "comprobante_cliente_id_ruc_contraparte_timbrado_numero_fech_key" ON "comprobante"("cliente_id", "ruc_contraparte", "timbrado", "numero", "fecha_emision");

-- CreateIndex
CREATE INDEX "campo_extraido_comprobante_id_idx" ON "campo_extraido"("comprobante_id");

-- CreateIndex
CREATE INDEX "auditoria_cambio_organizacion_id_idx" ON "auditoria_cambio"("organizacion_id");

-- CreateIndex
CREATE INDEX "auditoria_cambio_entidad_id_entidad_idx" ON "auditoria_cambio"("entidad", "id_entidad");

-- CreateIndex
CREATE INDEX "exportacion_organizacion_id_idx" ON "exportacion"("organizacion_id");

-- CreateIndex
CREATE INDEX "exportacion_cliente_id_periodo_idx" ON "exportacion"("cliente_id", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_org_organizacion_id_clave_key" ON "configuracion_org"("organizacion_id", "clave");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivo" ADD CONSTRAINT "archivo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivo" ADD CONSTRAINT "archivo_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivo" ADD CONSTRAINT "archivo_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_archivo_id_fkey" FOREIGN KEY ("archivo_id") REFERENCES "archivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campo_extraido" ADD CONSTRAINT "campo_extraido_comprobante_id_fkey" FOREIGN KEY ("comprobante_id") REFERENCES "comprobante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_cambio" ADD CONSTRAINT "auditoria_cambio_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_cambio" ADD CONSTRAINT "auditoria_cambio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exportacion" ADD CONSTRAINT "exportacion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exportacion" ADD CONSTRAINT "exportacion_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exportacion" ADD CONSTRAINT "exportacion_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_org" ADD CONSTRAINT "configuracion_org_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
