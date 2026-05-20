# Stripe Billing — Free/Pro Plans Design

**Date:** 2026-05-20
**Status:** Approved

## Objetivo

Monetizar CotizaPro con dos planes: Free (3 cotizaciones/mes) y Pro ($249 MXN/mes · $2,390 MXN/año). Stripe Checkout maneja el pago; webhooks actualizan el estado del plan en Supabase.

---

## Planes

| | Free | Pro |
|---|---|---|
| Cotizaciones activas | 3 por mes calendario | Ilimitadas |
| Portal del cliente | Sí (dentro del límite) | Sí |
| Precio | $0 | $249 MXN/mes · $2,390 MXN/año |

"3/mes" = cotizaciones creadas en el mes calendario actual (enero, febrero, etc.). Las de meses anteriores no cuentan contra el límite.

---

## Arquitectura

### Supabase — tabla `subscriptions`

Nueva tabla, una fila por usuario:

```sql
create table subscriptions (
  user_id             uuid primary key references auth.users(id),
  plan                text not null default 'free',  -- 'free' | 'pro'
  stripe_customer_id  text,
  stripe_subscription_id text,
  current_period_end  timestamptz,
  cancel_at_period_end boolean default false,
  updated_at          timestamptz default now()
);

alter table subscriptions enable row level security;
create policy "users can read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);
```

El frontend lee esta tabla al login con `supabase.from('subscriptions').select('*').eq('user_id', userId).single()`. Si no existe fila → plan `'free'`.

### Funciones serverless

```
api/
├── billing.py          ← POST ?action=checkout|portal
├── stripe-webhook.py   ← POST /api/stripe-webhook (Stripe events)
└── _lib/
    └── stripe.py       ← stripe_request() helper (HTTP puro, sin SDK)
```

`server.py` conservado para desarrollo local (no incluye billing — se prueba directo con Stripe CLI).

### Frontend

```
js/
├── modules/
│   ├── billing.js      ← página Plan y Facturación en Settings
│   └── quotations.js   ← modificado: quota check antes de crear cotización
└── app.js              ← modificado: cargar plan al login, exponerlo en window._plan
```

---

## Variables de entorno

Se agregan en Vercel Dashboard → Settings → Environment Variables.

| Variable | Disponible en | Descripción |
|---|---|---|
| `STRIPE_SECRET_KEY` | Runtime only | `sk_live_...` o `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Runtime only | `whsec_...` del endpoint en Stripe Dashboard |
| `STRIPE_PRICE_ID_MONTHLY` | Runtime only | ID del precio $249 MXN/mes |
| `STRIPE_PRICE_ID_YEARLY` | Runtime only | ID del precio $2,390 MXN/año |
| `APP_URL` | Runtime only | URL base del app, ej. `https://cotizapro.vercel.app` |

---

## Flujo detallado

### Upgrade (Free → Pro)

```
1. Usuario en app, plan Free, intenta crear cotización #4 este mes
2. quotations.js detecta quota alcanzada → muestra UpgradeModal
3. Usuario elige mensual o anual → clic "Suscribirse"
4. Frontend POST /api/billing?action=checkout&period=monthly (o yearly)
   - billing.py crea/obtiene Stripe Customer para el user_id
   - crea Checkout Session con price_id correcto, success_url, cancel_url
   - devuelve { url: "https://checkout.stripe.com/..." }
5. Frontend redirige window.location = url
6. Usuario completa pago en Stripe (tarjeta, en MXN)
7. Stripe redirige a APP_URL/?billing=success
8. Stripe envía webhook checkout.session.completed a /api/stripe-webhook
9. stripe-webhook.py verifica firma → upsert subscriptions: plan='pro', ids, period_end
10. Próximo login: app lee plan='pro', sin límite de cotizaciones
```

### Gestionar / cancelar suscripción

```
1. Usuario va a Settings → Plan y Facturación
2. Clic "Gestionar suscripción"
3. Frontend POST /api/billing?action=portal
   - billing.py crea Customer Portal Session con return_url=APP_URL
   - devuelve { url: "https://billing.stripe.com/..." }
4. Frontend redirige al portal de Stripe (Stripe maneja cancelación, cambio de plan, facturas)
5. Al cancelar: Stripe envía customer.subscription.deleted → stripe-webhook.py
   → upsert subscriptions: plan='free', subscription_id=null, period_end=null
```

### Webhook — eventos manejados

| Evento | Acción |
|---|---|
| `checkout.session.completed` | upsert plan='pro', guardar customer_id, subscription_id, period_end |
| `invoice.payment_succeeded` | actualizar current_period_end (renovación mensual/anual) |
| `customer.subscription.deleted` | upsert plan='free', limpiar subscription_id |

Firma inválida → 400. Evento desconocido → 200 (ignorar silenciosamente).

---

## Implementación — `api/billing.py`

```python
# POST /api/billing?action=checkout&period=monthly|yearly
# POST /api/billing?action=portal
# Requiere header Authorization: Bearer <supabase_jwt>
```

Autenticación: el frontend envía el JWT de Supabase en el header. `billing.py` lo verifica con Supabase Auth (`/auth/v1/user`) para obtener el `user_id`. No se aceptan peticiones sin JWT válido.

Respuestas:
- `200 { "url": "https://..." }` → frontend redirige
- `400 { "error": "..." }` → parámetros inválidos
- `401 { "error": "Unauthorized" }` → JWT inválido o ausente
- `500 { "error": "Internal server error" }` → error de Stripe o Supabase

## Implementación — `api/stripe-webhook.py`

```python
# POST /api/stripe-webhook
# Header: Stripe-Signature
# Body: raw JSON de Stripe
```

Verificación de firma con HMAC-SHA256 manual (sin SDK). Si la firma no coincide → 400.

## Implementación — `api/_lib/stripe.py`

Helper `stripe_request(method, path, data=None)` que hace HTTP requests a `https://api.stripe.com/v1/` con `Authorization: Bearer STRIPE_SECRET_KEY` y `Content-Type: application/x-www-form-urlencoded`. Sin SDK, solo `urllib.request`.

---

## Frontend — quota check en `quotations.js`

Antes de abrir el formulario de nueva cotización:

```javascript
function _checkQuota() {
  if (window._plan === 'pro') return true;
  const thisMonth = new Date().toISOString().slice(0, 7); // "2026-05"
  const count = Store.getQuotations()
    .filter(q => (q.createdAt || q.date || '').startsWith(thisMonth))
    .length;
  return count < 3;
}
```

Si retorna `false` → mostrar `UpgradeModal` en lugar del formulario.

## Frontend — `js/modules/billing.js`

Página dentro de Settings con:
- Badge del plan actual (Free / Pro)
- Si Pro: fecha de próxima renovación, si cancela al final del período
- Botón "Suscribirse al Plan Pro" (Free) o "Gestionar suscripción" (Pro)
- Precios visibles: $249 MXN/mes · $2,390 MXN/año (ahorras $598)

## Frontend — `js/app.js`

Al login exitoso, después del `syncFromSupabase`:

```javascript
const { data } = await supabase.from('subscriptions').select('plan').eq('user_id', userId).single();
window._plan = data?.plan || 'free';
```

---

## Qué NO incluye este diseño

- Emails de bienvenida o recordatorio de pago (Stripe los envía automáticamente)
- Página de precios pública
- Descuentos o cupones
- Multi-seat (múltiples usuarios por cuenta)
- CFDI / factura SAT por la suscripción

---

## Setup manual (una sola vez, antes del deploy)

1. Crear cuenta en stripe.com → activar MXN como moneda
2. Crear producto "CotizaPro Pro" con dos precios: $249 MXN recurrente mensual y $2,390 MXN recurrente anual
3. Copiar los dos Price IDs (`price_...`)
4. En Stripe Dashboard → Webhooks → agregar endpoint `https://<app>/api/stripe-webhook` con eventos: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`
5. Copiar el Webhook Secret (`whsec_...`)
6. En Supabase → SQL Editor → ejecutar el `CREATE TABLE subscriptions` de arriba
7. Agregar las 5 variables de entorno en Vercel
