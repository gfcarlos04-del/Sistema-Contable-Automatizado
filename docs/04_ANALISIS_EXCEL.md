# Análisis de los Excel modelo y mapeo a la extracción Gemini

Fuente directa: archivos en `Guía y datos de la DNIT/`.

---

## A. Planilla oficial de Importación a Marangatu

Archivo: `Modelo de Planilla para Registro de Comprobantes en Marangatu (2).xlsx`

Cuatro hojas, todas con cabecera en fila 10, datos desde fila 11.

### A.1 Hoja VENTAS (tipo de registro = 1) — 19 columnas

| # | Columna oficial | Origen del dato | Notas |
|---|---|---|---|
| 1 | CÓDIGO TIPO DE REGISTRO | fijo `1` | constante |
| 2 | CÓDIGO TIPO DE IDENTIFICACIÓN DEL COMPRADOR | usuario / extraído | tabla 3 |
| 3 | NÚMERO DE IDENTIFICACIÓN DEL COMPRADOR | Gemini | RUC sin DV |
| 4 | NOMBRE O RAZÓN SOCIAL DEL COMPRADOR | Gemini | no requerido si tipo 11/12/15 |
| 5 | CÓDIGO TIPO DE COMPROBANTE | Gemini + usuario | tabla 4 (operativos 101–112) |
| 6 | FECHA DE EMISIÓN DEL COMPROBANTE | Gemini | dd/mm/aaaa |
| 7 | NÚMERO DE TIMBRADO | Gemini | 8 dígitos |
| 8 | NÚMERO DEL COMPROBANTE | Gemini | ###-###-####### |
| 9 | MONTO GRAVADO 10% (IVA INCLUIDO) | Gemini | entero |
| 10 | MONTO GRAVADO 5% (IVA INCLUIDO) | Gemini | entero |
| 11 | MONTO NO GRAVADO O EXENTO | Gemini | entero |
| 12 | MONTO TOTAL DEL COMPROBANTE | Gemini | = 9+10+11 |
| 13 | CÓDIGO CONDICIÓN DE VENTA | Gemini | 1=Contado, 2=Crédito, requerido si 109 |
| 14 | OPERACIÓN EN MONEDA EXTRANJERA | Gemini / inferido | S/N |
| 15 | IMPUTA AL IVA | usuario | S/N |
| 16 | IMPUTA AL IRE | usuario | S/N |
| 17 | IMPUTA AL IRP-RSP | usuario | S/N |
| 18 | NÚMERO COMPROBANTE VENTA ASOCIADO | Gemini si NC/ND | |
| 19 | TIMBRADO COMPROBANTE VENTA ASOCIADO | Gemini si NC/ND | |

### A.2 Hoja COMPRAS (tipo de registro = 2) — 20 columnas

Igual estructura que Ventas con dos diferencias clave:

- Cambia "comprador" por "proveedor/vendedor".
- Columna 13 se llama "CÓDIGO CONDICIÓN DE COMPRA".
- Aparece columna 18 "NO IMPUTA" (S/N).
- Para los tipos 101 (Autofactura), 104 (Boleta Resimple), 105 (Loterías),
  112 (Ticket máquina): solo se registra MONTO TOTAL, los tres tramos van en 0.

### A.3 Hoja INGRESOS (tipo de registro = 3) — 15 columnas

Orden distinto: Tipo Registro · Tipo Comprobante · Fecha · Número · Tipo
Identificación pagador · Número pagador · Nombre pagador · Monto Gravado ·
No Gravado/Exonerado · Total · Imputa IRE · Imputa IRP-RSP · Especificar tipo
documento · Asociado núm · Asociado timbrado.

- Para 208 (Liquidación de Salario): fecha en `mm/aaaa`, número de
  comprobante no requerido.
- Para 210 (Otros comprobantes de ingresos): campo "Especificar tipo
  documento" obligatorio (texto libre, máx 50).
- Para 203 (Comprobante ingreso por ventas a crédito): solo se registra Total;
  exige asociado.

### A.4 Hoja EGRESOS (tipo de registro = 4) — 18 columnas

Orden: Tipo Registro · Tipo Comprobante · Fecha · Número/Transacción · Tipo
Identificación · Número Identificación · Nombre / Descripción bien o servicio
· Monto Total · Imputa IVA · Imputa IRE · Imputa IRP-RSP · NO IMPUTA · Núm
Cuenta/Tarjeta · Banco/Financiera/Coop · Núm Identificación Empleador (IPS) ·
Especificar tipo documento · Asociado núm · Asociado timbrado.

- Para 206 (Extracto IPS): fecha `mm/aaaa`, número no requerido, exige
  "Identificación del empleador".
- Para 207 (Extracto cuenta TC/TD): número de cuenta/tarjeta + banco.
- Para 211 (Transferencias/Giros): número de cuenta + banco.
- Para 209 (Otros): "Especificar tipo documento" obligatorio.
- Para 201 (Egreso por compras a crédito): asociado obligatorio.

---

## B. Libro IVA o IVA+IRE

Archivo: `Modelo de Libro ventas, ingresos, compras, egresos para
contribuyentes que tengan solo IVA o IVA y Rentas..xlsx`

### B.1 Hoja VENTAS-INGRESOS (cabecera fila 11)

`Tipo Identificación · RUC/Id · Nombre/Razón Social · Organismo o Agencia
Internacional · Tipo Comprobante · Timbrado · Número · Fecha · Importe Total ·
Importe Exenta · Total gravadas 5% (IVA incl.) · IVA 5% · Total gravadas 10%
(IVA incl.) · IVA 10% · Total Importe sin IVA · Ingreso gravado por IRP`

Cálculos automáticos:

- `IVA 5% = Total gravadas 5% (IVA incl.) / 21`
- `IVA 10% = Total gravadas 10% (IVA incl.) / 11`
- `Total Importe sin IVA = (Total gravadas 5% − IVA 5%) + (Total gravadas 10% − IVA 10%) + Exenta`

### B.2 Hoja COMPRAS-EGRESOS (cabecera fila 11)

`Tipo Identificación · RUC/Id · Nombre/Razón Social · Tipo Comprobante ·
Timbrado · Número · Condición (Contado/Crédito) · Fecha · Importe Total ·
Importe Exenta · Total gravadas 5% · IVA 5% · Total gravadas 10% · IVA 10% ·
Egreso deducible IRP · Egreso deducible IRE SIMPLE`

### B.3 Cabecera del libro (filas 4 a 8)

- Título del libro (fila 4).
- `RUC DEL CONTRIBUYENTE INFORMANTE:` (fila 6).
- `NOMBRE O RAZÓN SOCIAL:` (fila 7).
- `EJERCICIO FISCAL:` (fila 8, año entero).

### B.4 Listas desplegables (hoja `Lista desplegable`)

- Tipos de identificación (VENTAS): RUC, CÉDULA DE IDENTIDAD, PASAPORTE,
  CARNÉ DE MIGRACIÓN.
- Tipos de identificación (COMPRAS): RUC, CÉDULA, PASAPORTE, CARNÉ DE
  MIGRACIÓN, NÚMERO DE EMPLEADOR, IDENTIFICACIÓN TRIBUTARIA (PROVEEDORES DEL
  EXTERIOR).
- Tipos de comprobante (VENTAS): FACTURA, BOLETA DE VENTA, TICKET MÁQ.
  REGISTRADORA, ENTRADA A ESPECTÁCULOS, BOLETO DE TRANSPORTE PÚBLICO, TICKET
  DE TRANSPORTE AÉREO, BOLETO DE LOTERÍA, NOTA DE DÉBITO EMITIDA, NOTA DE
  CRÉDITO RECIBIDA, LIQUIDACIÓN DE SALARIO, EXTRACTO DE CUENTA, OTROS DOC.
  QUE RESPALDAN INGRESOS, COMPROBANTE DE INGRESO, OTROS.
- Tipos de comprobante (COMPRAS): FACTURA, BOLETA DE VENTA, AUTOFACTURA,
  BOLETA RESIMPLE, TICKET MÁQ. REGISTRADORA, ENTRADA A ESPECTÁCULOS, BOLETO
  DE TRANSPORTE PÚBLICO, TICKET DE TRANSPORTE AÉREO, NOTA DE DÉBITO RECIBIDA,
  NOTA DE CRÉDITO EMITIDA, LIQUIDACIÓN DE SALARIO, EXTRACTO IPS, EXTRACTO
  TC/TD, TRANSFERENCIAS O GIROS, COMPROBANTE DEL EXTERIOR LEGALIZADO,
  COMPROBANTE DE INGRESO ENTIDADES PÚBLICAS, DESPACHO DE IMPORTACIÓN, OTROS.
- Condición (COMPRAS): CONTADO, CRÉDITO, NO APLICA.

---

## C. Libro IRP puro

Archivo: `Modelo de Libro ingreso y egreso para quienes sean solo
contribuyentes del IRP.xlsx`

### C.1 Hoja INGRESOS

`Tipo Identificación · RUC/Id · Nombre/Razón Social · Tipo Comprobante ·
Número · Fecha o mes · Importe Total · Ingreso gravado IRP · Ingreso no
gravado/exonerado IRP`

### C.2 Hoja EGRESOS

`Tipo Identificación · RUC/Id · Nombre/Razón Social · Tipo Comprobante ·
Timbrado · Número · Condición · Fecha · Importe Total · Egreso deducible IRP`

---

## D. Tablas de códigos (referencia consolidada)

### Tabla 1 — Tipos de registro
- 1 VENTAS
- 2 COMPRAS
- 3 INGRESOS
- 4 EGRESOS

### Tabla 2 — Condición
- 1 CONTADO
- 2 CRÉDITO

### Tabla 3 — Tipo de identificación
- 11 RUC
- 12 CÉDULA DE IDENTIDAD
- 13 PASAPORTE
- 14 CÉDULA EXTRANJERO
- 15 SIN NOMBRE
- 16 DIPLOMÁTICO
- 17 IDENTIFICACIÓN TRIBUTARIA

### Tabla 4 — Tipos de comprobante (con tipo de registro permitido)

| Código | Comprobante | Permitido en |
|---|---|---|
| 101 | AUTOFACTURA | COMPRAS |
| 102 | BOLETA DE TRANSPORTE PÚBLICO DE PASAJEROS | VENTAS, COMPRAS |
| 103 | BOLETA DE VENTA | VENTAS, COMPRAS |
| 104 | BOLETA RESIMPLE | COMPRAS |
| 105 | BOLETOS DE LOTERÍAS, JUEGOS DE AZAR | VENTAS, COMPRAS |
| 106 | BOLETO O TICKET DE TRANSPORTE AÉREO | VENTAS, COMPRAS |
| 107 | DESPACHO DE IMPORTACIÓN | COMPRAS |
| 108 | ENTRADA A ESPECTÁCULOS PÚBLICOS | VENTAS, COMPRAS |
| 109 | FACTURA | VENTAS, COMPRAS |
| 110 | NOTA DE CRÉDITO | VENTAS, COMPRAS |
| 111 | NOTA DE DÉBITO | VENTAS, COMPRAS |
| 112 | TICKET MÁQUINA REGISTRADORA | VENTAS, COMPRAS |
| 201 | COMPROBANTE DE EGRESOS POR COMPRAS A CRÉDITO | EGRESOS |
| 202 | COMPROBANTE DEL EXTERIOR LEGALIZADO | EGRESOS |
| 203 | COMPROBANTE DE INGRESO POR VENTAS A CRÉDITO | INGRESOS |
| 204 | COMPROBANTE DE INGRESOS ENTIDADES PÚBLICAS, RELIGIOSAS O DE BENEFICIO PÚBLICO | EGRESOS |
| 205 | EXTRACTO DE CUENTA – BILLETAJE ELECTRÓNICO | EGRESOS |
| 206 | EXTRACTO DE CUENTA DE IPS | EGRESOS |
| 207 | EXTRACTO DE CUENTA TC/TD | EGRESOS |
| 208 | LIQUIDACIÓN DE SALARIO | INGRESOS, EGRESOS |
| 209 | OTROS COMPROBANTES DE EGRESOS | EGRESOS |
| 210 | OTROS COMPROBANTES DE INGRESOS | INGRESOS |
| 211 | TRANSFERENCIAS O GIROS BANCARIOS / BOLETA DE DEPÓSITO | EGRESOS |

### Tabla 5 — Booleano
- S SI
- N NO

---

## E. Mapeo "Campo extraído por Gemini → columna oficial"

Ver `08_PROMPT_GEMINI.md`. El JSON que devuelve Gemini usa nombres en
snake_case; cada campo se traduce 1:1 a la columna oficial al momento de
exportar.

---

## F. Campos que NUNCA debe inferir Gemini

Para minimizar errores contables, los siguientes campos deben ser definidos
por el usuario (o derivados de la configuración del cliente), NO por la IA:

- IMPUTA AL IVA
- IMPUTA AL IRE
- IMPUTA AL IRP-RSP
- NO IMPUTA
- Régimen tributario del cliente

Gemini puede *sugerir* condición de venta (Contado/Crédito) si aparece
explícitamente en el documento, pero por defecto el sistema asume `1`
(Contado) si está vacío, conforme a la Especificación Técnica.
