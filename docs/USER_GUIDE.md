# Guía del usuario — Tavex

Esta guía te lleva paso a paso por el flujo completo de Tavex: desde crear tu
primer cliente hasta exportar el ZIP para Marangatu.

> **App**: https://tavex.fly.dev

---

## 1. Crear cuenta y entrar

1. Andá a **https://tavex.fly.dev/signup**.
2. Completá nombre, email, contraseña (mín. 8 caracteres) y el nombre de tu organización (estudio, oficina o nombre profesional).
3. Vas a entrar directamente como **Administrador** de esa organización.
4. Si ya tenés cuenta, entrá por **Iniciar sesión**.

> **¿Olvidaste la contraseña?** Click en *"¿Olvidaste tu contraseña?"* en la pantalla de login. Te llega un email con un enlace válido por 60 minutos.

---

## 2. Crear el primer cliente

Tu organización puede tener muchos **clientes** (contribuyentes). Cada cliente declara con su propio RUC y régimen tributario.

1. En la barra lateral, click en **Clientes**.
2. Click en **+ Nuevo cliente**.
3. Completá:
   - **Razón social** (ej: "Comercial Pérez S.A.")
   - **RUC** (8 dígitos sin guión, o con DV — el sistema lo separa)
   - **Régimen tributario**: marcá uno o más:
     - **IVA** — si declara IVA
     - **IRE** — si declara IRE general
     - **IRE Simple** — si declara IRE Simple
     - **IRP-RSP** — si declara IRP-RSP
4. Click en **Crear cliente**.

> ⚠️ El régimen es crítico: las imputaciones que elijas en cada comprobante se validan contra esto (regla **V-016**). Si un cliente no tiene IVA habilitado, no podés imputar al IVA un comprobante suyo.

---

## 3. Seleccionar cliente activo

Antes de cargar comprobantes, **elegí el cliente activo** desde el selector arriba a la izquierda del sidebar.

Todo lo que cargues, revises o exportes se hace en el contexto de ese cliente.

---

## 4. Cargar comprobantes (3 caminos)

### Camino A — Drag & drop de PDF/imagen (lo más común)

1. Click en **Comprobantes → + Cargar comprobante** (o en el acceso rápido del dashboard).
2. Arrastrá uno o varios archivos a la zona punteada, o hacé click en **seleccioná**.
3. Formatos: **PDF · JPG · PNG · WebP · TIFF** (máx 20 MB por archivo).
4. Cada archivo se sube en orden, con barra de progreso individual.
5. Cuando termina, Tavex llama a **Gemini AI** para extraer los datos del comprobante (~10–30 seg).

### Camino B — Importar XML e-Kuatia (SIFEN)

Para comprobantes electrónicos timbrados ya tenés el XML — no hace falta OCR.

1. Click en **Importar e-Kuatia** desde el dashboard o desde Comprobantes.
2. Subí los `.xml` (podés cargar varios a la vez).
3. Tavex los parsea directo, sin Gemini, y los marca con origen `E_KUATIA_XML`.

> 💡 Los e-Kuatia se **excluyen automáticamente del ZIP Marangatu** (la SET ya los tiene).

### Camino C — Carga manual sin archivo

Si no tenés el archivo (ej: el contador te dictó los datos):

1. Comprobantes → **+ Cargar comprobante** → poné cualquier archivo placeholder, o
2. Mejor: crealo manualmente desde Prisma Studio si tenés acceso técnico.

> *(Próxima versión: botón "Crear sin archivo".)*

---

## 5. Revisar y corregir la extracción

Cuando Gemini termina de extraer, el comprobante queda en estado **EN_REVISION**.

1. Click en el comprobante de la lista.
2. Vas a ver el formulario con **todos los campos completados** y, al lado de cada uno, un **badge de confianza** (% en verde/amarillo/rojo).
3. **Corregí lo que esté mal**. Si Gemini dudó (< 70%), aparece un alerta — esos campos son obligatorios revisar.
4. Cada cambio queda en **Auditoría** con quién y cuándo.
5. Click en **Guardar cambios** cuantas veces quieras.

### Campos del formulario

| Sección | Campos |
|---|---|
| Identificación | Tipo registro · Tipo comprobante · Fecha emisión · Timbrado · Número · Condición operación |
| Contraparte | Razón social · RUC · DV · Tipo identificación |
| Montos (₲) | Gravado 10% · IVA 10% · Gravado 5% · IVA 5% · Exento · Total |
| Imputación | IVA · IRE · IRP-RSP · No imputa (checkboxes) |
| Comprobante asociado | Número + timbrado (solo notas de crédito/débito) |
| Datos adicionales | Aparecen según el tipo: período, banco/cuenta, identificador empleador, etc. |

---

## 6. Aprobar y registrar

Cuando los datos están bien:

1. Click en **Aprobar y registrar** (botón violeta).
2. Tavex corre **todas las validaciones** (V-001 a V-022, C-001 a C-004, D-001, D-002, K-001).
3. Si hay errores **bloqueantes** (rojo): no se puede registrar — corrige y reintenta.
4. Si hay solo **advertencias** (ámbar): podés registrar igual.
5. El comprobante queda en estado **REGISTRADO** ✅. Ya cuenta para el ZIP Marangatu.

### Errores comunes y qué significan

| Código | Significado | Cómo arreglarlo |
|---|---|---|
| **V-001** | Total ≠ gravado10 + gravado5 + exento (±2 ₲) | Revisá los montos |
| **V-002** | RUC contraparte mal formado | 1–8 dígitos sin DV |
| **V-004** | Timbrado no tiene 8 dígitos | Verificá el timbrado |
| **V-005** | Número formato inválido | Debe ser `001-001-0000001` |
| **V-014** | No marcaste ninguna imputación | Marcá al menos una (IVA/IRE/IRP-RSP/No imputa) |
| **V-016** | Imputación no permitida para el régimen del cliente | Cambiá la imputación o agregá el régimen al cliente |
| **D-002** | Ya existe un comprobante registrado con mismo timbrado+número+RUC | Comprobante duplicado |
| **K-001** | Campo crítico con baja confianza | Confirmá manualmente el campo |

---

## 7. Rechazar o re-extraer

- **Rechazar**: marcá el comprobante como `RECHAZADO` con un motivo (no se borra, queda en auditoría).
- **Re-extraer con Gemini**: si la extracción fue muy mala, volvés a llamar a Gemini para reintentarla.
- **Reactivar** (estados rechazados): los podés volver a **EN_REVISION** y trabajarlos de nuevo.

---

## 8. Exportar a Marangatu

Una vez que tenés comprobantes registrados:

1. **Exportaciones** → seleccioná el cliente activo.
2. Elegí:
   - **ZIP mensual**: para una obligación específica del mes (formato MM/YYYY).
   - **ZIP anual**: todos los comprobantes del año.
   - **Libro IVA Excel**: planilla `.xlsx` con todo el ejercicio fiscal.
3. Click en **Generar ZIP** o **Generar Libro IVA**.
4. Se descarga el archivo, listo para importar en el Sistema Marangatu de la SET.

> El ZIP contiene los archivos `.txt` con el formato exacto que pide Marangatu, separados por tipo de registro (VENTAS / COMPRAS / INGRESOS / EGRESOS).

---

## 9. Multiusuario en la organización

Si trabajás en equipo (ej: un contador + asistentes):

1. **Usuarios** → **Nuevo usuario** → completá nombre, email, contraseña inicial, rol.
2. Roles:
   - **Admin**: puede todo (incluyendo crear/desactivar otros usuarios).
   - **Operador**: puede cargar/revisar/aprobar comprobantes y generar exportaciones. **No** puede gestionar usuarios.
3. Compartile las credenciales por canal seguro (el usuario nuevo debería **cambiar su contraseña** al primer ingreso desde `Mi perfil`).

---

## 10. Auditoría

Cada cambio queda registrado en **Auditoría** con:

- Entidad afectada (comprobante, cliente)
- Campo modificado
- Valor anterior → valor nuevo
- Usuario que lo hizo
- Fecha/hora

Útil para resolver discusiones internas o cumplir requerimientos del cliente final.

---

## 11. Cambiar tu propia contraseña

1. Click en tu avatar abajo a la izquierda del sidebar → **Mi perfil**.
2. Ingresá la contraseña actual + la nueva (× 2) → **Cambiar contraseña**.

---

## 12. Atajos y buenas prácticas

- 📌 **Cargá por cliente, no mezclado**: seleccioná el cliente activo antes de subir.
- 🔍 **Revisá los campos en amarillo/rojo**: son los que Gemini no estaba seguro.
- 🧾 **No registres comprobantes con fecha incorrecta**: la SET rechaza el lote completo.
- 💾 **Generá el ZIP cerca del cierre mensual**: si después agregás más comprobantes, vas a tener que regenerarlo.
- 🔒 **Cambiá tu contraseña al menos cada 6 meses**, y nunca compartas tu sesión.

---

## 13. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| "Demasiadas subidas, intentá en N segundos" | Subiste muchos archivos muy rápido (>30/min) | Esperá el tiempo indicado |
| Gemini tarda más de 1 minuto | Cuota o latencia transitoria | Esperá; si persiste, **Re-extraer** |
| "El enlace expiró" en reset de contraseña | El enlace tiene 60 min de vida | Pedí uno nuevo en `/olvide` |
| Botón **Generar ZIP** deshabilitado | No hay comprobantes registrados en el período | Registrá al menos uno |
| El comprobante no aparece en el ZIP | Está en estado distinto a `REGISTRADO` | Aprobalo |

---

## 14. Soporte

Si encontrás un bug o algo no se entiende:
- Email: tu canal habitual con el equipo Tavex
- Issues: https://github.com/gfcarlos04-del/Sistema-Contable-Automatizado/issues

---

*Última actualización: 2026-05-26*
