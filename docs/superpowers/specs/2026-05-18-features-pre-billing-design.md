# CotizaPro — Features Pre-Billing
**Fecha:** 2026-05-18
**Estado:** Aprobado para implementación

---

## Contexto

CotizaPro es una SPA en vanilla JavaScript + Supabase orientada a pequeñas empresas mexicanas (2–10 personas) que reemplazan Excel/Google Sheets. El mayor cuello de botella identificado es la aprobación del cliente: el ciclo se detiene porque el cliente no tiene una forma fácil y rápida de responder.

Este spec define el conjunto de features a implementar antes de activar billing, cuyo objetivo es que el producto ofrezca un diferenciador real de tiempo ahorrado desde el primer día de uso.

---

## Alcance

Cinco features interconectadas que cubren el ciclo completo de una cotización:

1. Portal de aprobación del cliente
2. Tracking de apertura
3. Pipeline Kanban
4. Recordatorios automáticos
5. Cotización rápida desde historial

---

## 1. Portal de Aprobación del Cliente

### Propósito
Eliminar la fricción de aprobación: el cliente recibe un link, abre una página profesional, y aprueba con un click. Sin email de respuesta, sin imprimir, sin WhatsApp informal.

### URL pública
- Formato: `https://{dominio}/q/{token}`
- El `token` es un string aleatorio de 32 caracteres generado al crear/enviar la cotización
- El token se almacena en el objeto cotización en Supabase (`publicToken`)
- El link es válido mientras la cotización esté en estado `sent` o `approved`; cualquier otro estado devuelve pantalla de "Esta cotización ya no está disponible"

### Layout del portal
La página es pública (sin login). Estructura de arriba a abajo:

1. **Encabezado de empresa** — logo (si configurado), nombre, RFC
2. **Metadatos de cotización** — folio, fecha, válida hasta (en rojo si vence en ≤3 días)
3. **Datos del destinatario** — nombre del cliente
4. **Tabla de partidas** — descripción, cantidad, precio unitario, subtotal por línea
5. **Totales** — subtotal, IVA (si aplica), total en la moneda de la cotización
6. **Notas de la cotización** — si las hay
7. **Sección de acción** — botones de aprobación (ver modos abajo)

### Modos de aprobación (configurables por empresa en Ajustes)

| Modo | Botones disponibles | Datos registrados |
|---|---|---|
| `click` (default) | Aprobar / Rechazar | `approvedAt`, `rejectedAt` |
| `comments` | Aprobar / Solicitar cambios / Rechazar | + `clientComment` |
| `signature` | igual a `comments` + campo nombre + fecha | + `clientName`, `signedAt` |

El modo activo de la empresa se lee en el momento en que el cliente carga la página; si la empresa cambia el modo después de enviar un link ya activo, el link sigue usando el modo con el que fue generado (guardar el modo en `publicToken` metadata o en el objeto cotización al momento de envío).

### Comportamiento al aprobar/rechazar
- Al hacer click en "Aprobar": estado de cotización cambia a `approved`, se registra `approvedAt` y el modo/datos adicionales, se dispara evento de tracking
- Al hacer click en "Rechazar": estado cambia a `rejected`, se registra `rejectedAt` + comentario opcional
- Al hacer click en "Solicitar cambios" (modo `comments`/`signature`): estado cambia a `changes_requested`, se registra el comentario
- Después de cualquier acción: la página muestra pantalla de confirmación ("Gracias, hemos recibido tu respuesta") — no se puede volver a accionar

### Diseño visual del portal
- Misma paleta de colores base que la app (dark/light respeta el `prefers-color-scheme` del navegador del cliente, independiente del tema configurado por la empresa)
- El color del encabezado (fondo del header de empresa) es configurable en Ajustes → Apariencia del portal: default `#6366f1`
- Tipografía: Inter (ya cargada en el proyecto)
- No requiere CDN adicional; el portal es una ruta servida por el mismo servidor

### Implementación técnica
- Nueva ruta: `/q/:token` manejada en `server.py`
- El servidor busca en Supabase la cotización con ese `publicToken` y renderiza la página con los datos embebidos en el HTML (no JS fetch del cliente para evitar exponer credenciales de Supabase)
- Alternativamente: endpoint API `/api/q/:token` que retorna JSON público (sin auth), y el portal es HTML estático que fetchea ese endpoint

---

## 2. Tracking de Apertura

### Propósito
El equipo sabe exactamente si el cliente vio la cotización y cuándo, sin preguntar. Elimina el "¿lo habrás recibido?" por WhatsApp.

### Eventos registrados
- `viewed` — cuando el cliente carga el portal (primer request del token)
- `approved` / `rejected` / `changes_requested` — cuando el cliente acciona

### Almacenamiento
En el objeto cotización se añaden los campos:
- `viewedAt: string (ISO)` — timestamp del primer view
- `viewCount: number` — número total de veces que el cliente abrió el link
- `lastViewedAt: string (ISO)` — último view (para detectar si revisan de nuevo antes de decidir)

### Experiencia en la app (equipo)
- La tarjeta Kanban muestra badge de estado del cliente:
  - Sin badge: nunca abierta
  - `👁 Vista hace X` con borde izquierdo verde: vista al menos una vez
  - `✓ Aprobada` con fondo verde tenue: aprobada
  - `✎ Cambios solicitados` con fondo amarillo: pide ajustes
  - `✕ Rechazada` con fondo rojo tenue: rechazada
- Notificación in-app (toast) al creador cuando el cliente abre por primera vez: "Gamma Ltd abrió COT-042"
- Notificación in-app (toast) al creador cuando el cliente aprueba/rechaza: "✓ Gamma Ltd aprobó COT-042"

---

## 3. Pipeline Kanban

### Propósito
Reemplazar la vista de tabla plana de cotizaciones por una vista de pipeline que permite al equipo ver de un vistazo qué está bloqueado, qué avanza y qué necesita acción inmediata.

### Columnas
En orden de izquierda a derecha:

| Columna | Estado(s) de cotización | Color de encabezado |
|---|---|---|
| Borrador | `draft` | Gris |
| Enviada | `sent` | Índigo |
| Aprobada | `approved` | Verde |
| Facturada | `invoiced` | Azul |
| Rechazada | `rejected` | Rojo |

La columna "Rechazada" se colapsa por default (solo el encabezado visible con el conteo); se expande al hacer click.

### Tarjeta de cotización
Cada tarjeta muestra:
- Nombre del cliente (bold)
- Folio (mono, pequeño)
- Monto total formateado con moneda
- Días desde el envío (solo en columna Enviada)
- Badge de estado del cliente (tracking, sección 2)
- En columna "Aprobada": botón primario "→ Convertir a factura"

### Toggle tabla / Kanban
El encabezado de la página de cotizaciones tiene un toggle (ícono lista / ícono kanban). La preferencia se guarda en `settings` local. La tabla existente no se elimina.

### Drag and drop
No incluido en v1. Los cambios de estado se hacen desde la vista de detalle de la cotización.

### Columna "Enviada" — indicadores de urgencia
- Normal: sin borde especial
- Sin abrir hace ≥ N días (N configurable, ver sección 4): borde izquierdo amarillo + texto "⏰ Sin abrir X días"
- Vista pero sin respuesta hace ≥ M días: borde izquierdo naranja

---

## 4. Recordatorios Automáticos

### Propósito
El sistema alerta al equipo proactivamente en lugar de que el equipo tenga que revisar manualmente qué cotizaciones llevan tiempo sin respuesta.

### Configuración (Ajustes → Seguimiento)
Tres toggles independientes, cada uno con un campo de días:

| Toggle | Descripción | Default |
|---|---|---|
| Sin abrir | Notificar si el cliente no abre el link en N días | Activado, 3 días |
| Vista sin respuesta | Notificar si el cliente abrió pero no respondió en M días | Activado, 2 días |
| Próxima a vencer | Alerta cuando quedan P días para que venza la cotización | Desactivado, 2 días |

### Mecanismo
- No requiere backend de cron en v1: los recordatorios se evalúan al cargar la app (en `bootWithSession`) comparando timestamps
- Si se detecta una cotización que cumple la condición, se muestra una notificación in-app no intrusiva (badge en el nav item de Cotizaciones + toast al navegar a esa sección)
- Cada recordatorio se dispara una sola vez por condición: se guarda en el objeto cotización `reminderSent: { noOpen: bool, noReply: bool, expiring: bool }` para no repetir
- En v2 (post-billing) se añade envío de email al equipo usando EmailJS (ya integrado)

### UX del recordatorio
Al llegar a la sección Cotizaciones (o al abrir el Kanban), aparece un banner colapsable en la parte superior:
> "2 cotizaciones necesitan seguimiento — Delta S.A. lleva 5 días sin abrir · Epsilon Co respondió hace 3 días sin aprobación"

Con botón "Ver" que filtra/resalta esas tarjetas en el Kanban.

---

## 5. Cotización Rápida desde Historial

### Propósito
Reducir a segundos crear una nueva cotización para un cliente recurrente. No buscar en el historial global, no copiar y pegar desde Excel: ir al cliente, ver sus trabajos anteriores, partir de uno.

### Historial en el perfil del cliente
La vista de detalle de un cliente (ya existente en `clients.js`) añade una sección "Cotizaciones anteriores" con tabla compacta:
- Folio, fecha, monto, estado, acción

Acción disponible: **"Basar nueva cotización en esta"** → abre el formulario de nueva cotización con todos los campos prellenados (mismas partidas, precios, moneda, notas). El folio se regenera automáticamente. El usuario solo ajusta lo que cambió.

### Sugerencia de productos al crear cotización
Al seleccionar un cliente en el formulario de nueva cotización y el cliente tiene historial, aparece una sección colapsable "Usados con este cliente" con los productos/servicios que se le han cotizado antes. Click en cualquiera lo añade como partida con el último precio usado.

### Relación entre cotizaciones
El campo `basedOnId: string | null` en el objeto cotización apunta al ID de la cotización original. No se muestra en la UI en v1, pero queda en el dato para trazabilidad futura.

---

## Flujo completo integrado

```
1. Equipo crea cotización → Borrador (Kanban col. 1)
2. Equipo hace click "Enviar link" → se genera publicToken, estado → Enviada (Kanban col. 2)
3. Equipo copia/comparte el link (WhatsApp, email manual, etc.)
4. Cliente abre link → evento "viewed" registrado → badge "👁 Vista" en tarjeta → toast al equipo
5. Si cliente no abre en N días → banner de recordatorio al equipo
6. Cliente hace click "Aprobar" → estado → Aprobada (Kanban col. 3) → toast "¡Aprobada!"
7. Equipo hace click "→ Convertir a factura" en tarjeta → factura borrador creada con datos prellenados → estado → Facturada (Kanban col. 4)
```

---

## Datos nuevos en el objeto Cotización

```js
{
  // Existentes (sin cambio)
  id, folio, clientId, date, validUntil, items, subtotal, tax, total, currency, status, notes,

  // Nuevos
  publicToken: string,          // token público para el portal
  approvalMode: string,         // 'click' | 'comments' | 'signature' — snapshot al momento de envío
  viewedAt: string | null,      // ISO timestamp primer view
  viewCount: number,            // total de vistas
  lastViewedAt: string | null,  // ISO timestamp último view
  approvedAt: string | null,
  rejectedAt: string | null,
  changesRequestedAt: string | null,
  clientComment: string | null, // comentario del cliente (modos comments/signature)
  clientName: string | null,    // nombre firmante (modo signature)
  signedAt: string | null,      // fecha firma (modo signature)
  reminderSent: {
    noOpen: boolean,
    noReply: boolean,
    expiring: boolean,
  },
  basedOnId: string | null,     // ID de cotización original si fue duplicada desde historial
}
```

---

## Datos nuevos en Settings de empresa

```js
{
  // Existentes (sin cambio)
  theme, lang, currency, taxRate, ...

  // Nuevos
  approvalMode: 'click' | 'comments' | 'signature',  // default 'click'
  portalHeaderColor: string,                           // default '#6366f1'
  reminders: {
    noOpen: { enabled: boolean, days: number },        // default { enabled: true, days: 3 }
    noReply: { enabled: boolean, days: number },       // default { enabled: true, days: 2 }
    expiring: { enabled: boolean, days: number },      // default { enabled: false, days: 2 }
  },
  quotationsView: 'table' | 'kanban',                  // default 'kanban'
}
```

---

## Lo que NO está en este release

- Envío de email al cliente desde la app (requiere configuración de EmailJS por empresa o dominio propio)
- Drag and drop en el Kanban
- Firma electrónica con validez legal (e.firma SAT)
- Recordatorios por email al equipo
- Portal con login del cliente para ver múltiples cotizaciones
- Billing / planes de suscripción

---

## Orden de implementación sugerido

1. **Datos** — añadir campos nuevos al schema de cotización y settings; migración de datos existentes (campos en null por default)
2. **Portal del cliente** — ruta `/q/:token` + renderizado del portal + registro de eventos viewed/approved/rejected
3. **Tracking en el Kanban** — badges de estado del cliente en tarjetas; reemplazar vista tabla por toggle tabla/kanban
4. **Pipeline Kanban** — layout completo con columnas
5. **Recordatorios** — lógica de evaluación en boot + UI del banner + configuración en Ajustes
6. **Historial en perfil de cliente** — sección de cotizaciones anteriores + "Basar nueva en esta" + sugerencia de productos
