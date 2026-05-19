# Spec: Refresh de cotizaciones + eliminación de EmailJS

**Fecha:** 2026-05-19
**Estado:** Aprobado

---

## Feature 1: Actualización de estado de cotizaciones

### Problema
Cuando un cliente acepta/rechaza una cotización vía el portal, `server.py` actualiza `user_data` en Supabase. El panel no se entera hasta que el usuario recarga la página completa.

### Solución: Botón de recarga + auto-poll cada 60s

**Botón "↻ Actualizar"** — se agrega en `page-actions` del header de la vista de cotizaciones, junto a los botones existentes (export, nuevo). Al hacer click:
1. Deshabilita el botón y muestra spinner
2. Llama `Store.syncFromSupabase(client, userId)` usando `window._supSync`
3. Re-renderiza `renderQuotations(container, params)` con los datos frescos
4. Si no hay sesión activa (`!window._supSync`), no hace nada (silencioso)

**Auto-poll cada 60 segundos** — cuando `renderQuotations` se monta, inicia un `setInterval` de 60s que ejecuta el mismo sync + re-render. El ID del intervalo se guarda en una variable de módulo (`_quotPollTimer`). Cuando el usuario navega a otra sección, la vista se desmonta y el siguiente render limpia el timer anterior con `clearInterval`.

### Archivos modificados
- `js/modules/quotations.js` — botón en HTML, lógica de sync, variable `_quotPollTimer`

---

## Feature 2: Eliminación de EmailJS

EmailJS tenía tres puntos de integración que se eliminan completamente:

### `js/modules/settings.js`
- Eliminar variables: `_ejsKey`, `_ejsSvc`, `_ejsTpl`, `_ejsConfigured`, `_ejsBadge`
- Eliminar card `#emailjs-card` del HTML (incluye badge, inputs, botón guardar, details de plantilla)
- Eliminar bloque de template preview (`#ejs-template-html`)
- Eliminar listener `#ejs-save`

### `js/modules/quotations.js`
- Eliminar botón `#btn-email` del HTML en `renderQuotationView`
- Eliminar su event listener
- Eliminar función `sendEmail` completa (~70 líneas)

### `index.html`
- Eliminar `<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/..."></script>`

---

## Qué NO cambia
- WhatsApp, impresión, envío de link — intactos
- Toda la lógica de sync existente (`scheduleSync`, `pushToSupabase`, `syncFromSupabase`)
