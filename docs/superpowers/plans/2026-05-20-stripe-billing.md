# Stripe Billing — Free/Pro Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Free/Pro subscription plans with Stripe Checkout so users on the Free tier (≤3 quotes/month) are prompted to upgrade, and paying users get unlimited quotes.

**Architecture:** Three new Python serverless functions handle billing (`api/billing.py`) and Stripe webhooks (`api/stripe-webhook.py`) using a shared HTTP helper in `api/_lib/stripe.py`. Plan state lives in a Supabase `subscriptions` table read at login. The frontend quota check and upgrade modal live in the existing JS modules.

**Tech Stack:** Stripe REST API (no SDK — pure `urllib.request`), Supabase REST API, Python 3, vanilla JS, pytest + unittest.mock

---

## File Structure

**New files:**
- `api/_lib/stripe.py` — `stripe_request(method, path, data)` helper with nested form encoding
- `api/billing.py` — POST handler for checkout and portal sessions; `get_user_from_jwt(token)` extracted for testability
- `api/stripe-webhook.py` — POST handler; `verify_signature()` and `handle_event()` extracted for testability
- `js/modules/billing.js` — `renderBillingCard(container)`, `_startBillingCheckout(period)`, `_openBillingPortal()`
- `tests/test_stripe_lib.py` — unit tests for stripe.py
- `tests/test_billing.py` — unit tests for get_user_from_jwt
- `tests/test_stripe_webhook.py` — unit tests for verify_signature and handle_event

**Modified files:**
- `api/_lib/supabase.py` — add `sb_upsert(table, body)`
- `tests/test_supabase.py` — add `TestSbUpsert`
- `js/app.js` — load plan at login (`window._plan`, `window._subscription`), handle `?billing=success`
- `js/modules/settings.js` — call `renderBillingCard` at end of `renderSettings`
- `js/modules/quotations.js` — quota check + upgrade modal before "nueva cotización"
- `build.py` — add `billing.js` to FILES list
- `vercel.json` — add `billing.py` and `stripe-webhook.py` to functions with `includeFiles`

---

### Task 1: Add `sb_upsert` to `api/_lib/supabase.py`

**Files:**
- Modify: `api/_lib/supabase.py`
- Test: `tests/test_supabase.py`

- [ ] **Step 1: Write the failing test**

Add this class to `tests/test_supabase.py` (after `TestSbPatch`):

```python
class TestSbUpsert(unittest.TestCase):
    @patch('_lib.supabase.urllib.request.urlopen')
    def test_sends_post_with_prefer_merge(self, mock_open):
        mock_resp = MagicMock()
        mock_resp.status = 201
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_open.return_value = mock_resp

        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_ROLE_KEY': 'testkey',
        }):
            from _lib import supabase
            result = supabase.sb_upsert('subscriptions', {'user_id': 'abc', 'plan': 'pro'})

        req = mock_open.call_args[0][0]
        self.assertEqual(req.method, 'POST')
        self.assertEqual(req.get_header('Prefer'), 'resolution=merge-duplicates')
        self.assertEqual(result, 201)
```

- [ ] **Step 2: Run test to verify it fails**

```
cd C:\Users\Miguel\Desarrollo\cotizador
pytest tests/test_supabase.py::TestSbUpsert -v
```

Expected: `FAILED — AttributeError: module '_lib.supabase' has no attribute 'sb_upsert'`

- [ ] **Step 3: Add `sb_upsert` to `api/_lib/supabase.py`**

Append to the end of `api/_lib/supabase.py`:

```python
def sb_upsert(table, body):
    url = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1/' + table
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method='POST', headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status
```

- [ ] **Step 4: Run tests to verify they pass**

```
pytest tests/test_supabase.py -v
```

Expected: All 3 tests PASS (TestSbGet, TestSbPatch, TestSbUpsert).

- [ ] **Step 5: Commit**

```
git add api/_lib/supabase.py tests/test_supabase.py
git commit -m "feat(billing): add sb_upsert to supabase lib"
```

---

### Task 2: Create `api/_lib/stripe.py`

**Files:**
- Create: `api/_lib/stripe.py`
- Create: `tests/test_stripe_lib.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_stripe_lib.py`:

```python
import unittest
from unittest.mock import patch, MagicMock
import os

ENV = {'STRIPE_SECRET_KEY': 'sk_test_abc123'}


class TestStripeRequest(unittest.TestCase):
    @patch('_lib.stripe.urllib.request.urlopen')
    def test_get_sets_auth_header(self, mock_open):
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"id": "cus_abc"}'
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_open.return_value = mock_resp

        with patch.dict(os.environ, ENV):
            from _lib import stripe as stripe_lib
            result = stripe_lib.stripe_request('GET', 'customers/cus_abc')

        req = mock_open.call_args[0][0]
        self.assertEqual(result, {'id': 'cus_abc'})
        self.assertEqual(req.get_header('Authorization'), 'Bearer sk_test_abc123')

    @patch('_lib.stripe.urllib.request.urlopen')
    def test_post_encodes_nested_list(self, mock_open):
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"id": "cs_xyz", "url": "https://checkout.stripe.com/xyz"}'
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_open.return_value = mock_resp

        with patch.dict(os.environ, ENV):
            from _lib import stripe as stripe_lib
            result = stripe_lib.stripe_request('POST', 'checkout/sessions', {
                'mode': 'subscription',
                'line_items': [{'price': 'price_abc', 'quantity': 1}],
            })

        req = mock_open.call_args[0][0]
        body = req.data.decode()
        self.assertIn('line_items%5B0%5D%5Bprice%5D=price_abc', body)
        self.assertEqual(result['id'], 'cs_xyz')


class TestEncode(unittest.TestCase):
    def test_flat_dict(self):
        with patch.dict(os.environ, ENV):
            from _lib import stripe as stripe_lib
            pairs = stripe_lib._encode({'mode': 'subscription', 'customer': 'cus_abc'})
        self.assertIn(('mode', 'subscription'), pairs)
        self.assertIn(('customer', 'cus_abc'), pairs)

    def test_nested_list_of_dicts(self):
        with patch.dict(os.environ, ENV):
            from _lib import stripe as stripe_lib
            pairs = stripe_lib._encode({'line_items': [{'price': 'price_abc', 'quantity': 1}]})
        self.assertIn(('line_items[0][price]', 'price_abc'), pairs)
        self.assertIn(('line_items[0][quantity]', '1'), pairs)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

```
pytest tests/test_stripe_lib.py -v
```

Expected: `FAILED — ModuleNotFoundError: No module named '_lib.stripe'`

- [ ] **Step 3: Create `api/_lib/stripe.py`**

```python
import json
import os
import urllib.parse
import urllib.request


def _encode(data, prefix=''):
    items = []
    for k, v in data.items():
        key = f'{prefix}[{k}]' if prefix else k
        if isinstance(v, dict):
            items.extend(_encode(v, key))
        elif isinstance(v, list):
            for i, item in enumerate(v):
                if isinstance(item, dict):
                    items.extend(_encode(item, f'{key}[{i}]'))
                else:
                    items.append((f'{key}[{i}]', str(item)))
        else:
            items.append((key, str(v)))
    return items


def stripe_request(method, path, data=None):
    url = 'https://api.stripe.com/v1/' + path.lstrip('/')
    body = urllib.parse.urlencode(_encode(data)).encode() if data else None
    req = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            'Authorization': 'Bearer ' + os.environ['STRIPE_SECRET_KEY'],
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())
```

- [ ] **Step 4: Run tests to verify they pass**

```
pytest tests/test_stripe_lib.py -v
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```
git add api/_lib/stripe.py tests/test_stripe_lib.py
git commit -m "feat(billing): add stripe_request helper with nested form encoding"
```

---

### Task 3: Create `api/billing.py`

**Files:**
- Create: `api/billing.py`
- Create: `tests/test_billing.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_billing.py`:

```python
import unittest
from unittest.mock import patch, MagicMock
import json
import os

ENV = {
    'SUPABASE_URL': 'https://test.supabase.co',
    'SUPABASE_SERVICE_ROLE_KEY': 'svc_key',
    'STRIPE_SECRET_KEY': 'sk_test_abc',
    'STRIPE_PRICE_ID_MONTHLY': 'price_monthly',
    'STRIPE_PRICE_ID_YEARLY': 'price_yearly',
    'APP_URL': 'https://app.example.com',
}


class TestGetUserFromJwt(unittest.TestCase):
    @patch('billing.urllib.request.urlopen')
    def test_returns_user_id_on_valid_token(self, mock_open):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({'id': 'user-123', 'email': 'test@example.com'}).encode()
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_open.return_value = mock_resp

        with patch.dict(os.environ, ENV):
            import billing
            user_id, email = billing.get_user_from_jwt('valid_token')

        self.assertEqual(user_id, 'user-123')
        self.assertEqual(email, 'test@example.com')

    @patch('billing.urllib.request.urlopen')
    def test_returns_none_on_error(self, mock_open):
        mock_open.side_effect = Exception('Unauthorized')

        with patch.dict(os.environ, ENV):
            import billing
            user_id, email = billing.get_user_from_jwt('bad_token')

        self.assertIsNone(user_id)
        self.assertIsNone(email)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

```
pytest tests/test_billing.py -v
```

Expected: `FAILED — ModuleNotFoundError: No module named 'billing'`

- [ ] **Step 3: Create `api/billing.py`**

```python
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _lib.base import SecureHandler
from _lib.supabase import sb_get, sb_upsert
from _lib.stripe import stripe_request


def get_user_from_jwt(token):
    """Returns (user_id, email) or (None, None) if token is invalid."""
    url = os.environ['SUPABASE_URL'].rstrip('/') + '/auth/v1/user'
    req = urllib.request.Request(url, headers={
        'apikey': os.environ['SUPABASE_SERVICE_ROLE_KEY'],
        'Authorization': f'Bearer {token}',
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            return data.get('id'), data.get('email')
    except Exception:
        return None, None


def _get_or_create_customer(user_id, email):
    rows = sb_get('subscriptions', {'user_id': f'eq.{user_id}', 'select': 'stripe_customer_id'})
    customer_id = rows[0].get('stripe_customer_id') if rows else None
    if customer_id:
        return customer_id
    customer = stripe_request('POST', 'customers', {
        'email': email,
        'metadata[user_id]': user_id,
    })
    sb_upsert('subscriptions', {
        'user_id': user_id,
        'plan': 'free',
        'stripe_customer_id': customer['id'],
        'updated_at': datetime.now(timezone.utc).isoformat(),
    })
    return customer['id']


class handler(SecureHandler):
    def do_POST(self):
        auth = self.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return self._json(401, {'error': 'Unauthorized'})
        token = auth[7:]
        user_id, email = get_user_from_jwt(token)
        if not user_id:
            return self._json(401, {'error': 'Unauthorized'})

        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        action = (query.get('action') or [None])[0]
        period = (query.get('period') or ['monthly'])[0]

        try:
            if action == 'checkout':
                price_id = (
                    os.environ['STRIPE_PRICE_ID_YEARLY']
                    if period == 'yearly'
                    else os.environ['STRIPE_PRICE_ID_MONTHLY']
                )
                customer_id = _get_or_create_customer(user_id, email)
                session = stripe_request('POST', 'checkout/sessions', {
                    'mode': 'subscription',
                    'customer': customer_id,
                    'client_reference_id': user_id,
                    'line_items': [{'price': price_id, 'quantity': 1}],
                    'success_url': os.environ['APP_URL'] + '/?billing=success',
                    'cancel_url': os.environ['APP_URL'] + '/',
                })
                return self._json(200, {'url': session['url']})

            elif action == 'portal':
                rows = sb_get('subscriptions', {'user_id': f'eq.{user_id}', 'select': 'stripe_customer_id'})
                customer_id = rows[0].get('stripe_customer_id') if rows else None
                if not customer_id:
                    return self._json(400, {'error': 'No subscription found'})
                portal = stripe_request('POST', 'billing_portal/sessions', {
                    'customer': customer_id,
                    'return_url': os.environ['APP_URL'],
                })
                return self._json(200, {'url': portal['url']})

            else:
                return self._json(400, {'error': 'Invalid action'})

        except Exception as e:
            print(f'[billing error] {e}', flush=True)
            return self._json(500, {'error': 'Internal server error'})
```

- [ ] **Step 4: Run tests to verify they pass**

```
pytest tests/test_billing.py -v
```

Expected: Both tests PASS.

- [ ] **Step 5: Run all tests to confirm no regressions**

```
pytest tests/ -v
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```
git add api/billing.py tests/test_billing.py
git commit -m "feat(billing): add billing.py — Stripe Checkout and Customer Portal"
```

---

### Task 4: Create `api/stripe-webhook.py`

**Files:**
- Create: `api/stripe-webhook.py`
- Create: `tests/test_stripe_webhook.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_stripe_webhook.py`:

```python
import unittest
from unittest.mock import patch, MagicMock
import json
import os
import time
import hmac
import hashlib

ENV = {
    'SUPABASE_URL': 'https://test.supabase.co',
    'SUPABASE_SERVICE_ROLE_KEY': 'svc_key',
    'STRIPE_SECRET_KEY': 'sk_test_abc',
    'STRIPE_WEBHOOK_SECRET': 'whsec_testsecret',
}


def _make_sig(payload: bytes, secret: str) -> str:
    ts = str(int(time.time()))
    signed = f'{ts}.'.encode() + payload
    mac = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f't={ts},v1={mac}'


class TestVerifySignature(unittest.TestCase):
    def test_valid_signature_passes(self):
        with patch.dict(os.environ, ENV):
            import stripe_webhook
            payload = b'{"type":"checkout.session.completed"}'
            secret = 'whsec_testsecret'
            sig = _make_sig(payload, secret)
            self.assertTrue(stripe_webhook.verify_signature(payload, sig, secret))

    def test_invalid_signature_fails(self):
        with patch.dict(os.environ, ENV):
            import stripe_webhook
            payload = b'{"type":"checkout.session.completed"}'
            self.assertFalse(stripe_webhook.verify_signature(payload, 't=1,v1=badhash', 'whsec_testsecret'))

    def test_malformed_header_fails(self):
        with patch.dict(os.environ, ENV):
            import stripe_webhook
            self.assertFalse(stripe_webhook.verify_signature(b'body', 'not-a-stripe-header', 'secret'))


class TestHandleEvent(unittest.TestCase):
    @patch('stripe_webhook.sb_upsert')
    @patch('stripe_webhook.stripe_request')
    def test_checkout_completed_sets_pro(self, mock_stripe, mock_upsert):
        mock_stripe.return_value = {'current_period_end': 1800000000, 'cancel_at_period_end': False}
        mock_upsert.return_value = 201

        with patch.dict(os.environ, ENV):
            import stripe_webhook
            stripe_webhook.handle_event('checkout.session.completed', {
                'object': {
                    'client_reference_id': 'user-123',
                    'customer': 'cus_abc',
                    'subscription': 'sub_xyz',
                }
            })

        mock_upsert.assert_called_once()
        call_data = mock_upsert.call_args[0][1]
        self.assertEqual(call_data['plan'], 'pro')
        self.assertEqual(call_data['user_id'], 'user-123')

    @patch('stripe_webhook.sb_upsert')
    @patch('stripe_webhook.sb_get')
    def test_subscription_deleted_sets_free(self, mock_get, mock_upsert):
        mock_get.return_value = [{'user_id': 'user-123'}]
        mock_upsert.return_value = 201

        with patch.dict(os.environ, ENV):
            import stripe_webhook
            stripe_webhook.handle_event('customer.subscription.deleted', {
                'object': {'customer': 'cus_abc', 'id': 'sub_xyz'}
            })

        call_data = mock_upsert.call_args[0][1]
        self.assertEqual(call_data['plan'], 'free')
        self.assertIsNone(call_data['stripe_subscription_id'])

    @patch('stripe_webhook.sb_upsert')
    @patch('stripe_webhook.sb_get')
    @patch('stripe_webhook.stripe_request')
    def test_invoice_paid_updates_period(self, mock_stripe, mock_get, mock_upsert):
        mock_get.return_value = [{'user_id': 'user-123'}]
        mock_stripe.return_value = {'current_period_end': 1800000000, 'cancel_at_period_end': False}
        mock_upsert.return_value = 201

        with patch.dict(os.environ, ENV):
            import stripe_webhook
            stripe_webhook.handle_event('invoice.payment_succeeded', {
                'object': {'subscription': 'sub_xyz', 'customer': 'cus_abc'}
            })

        call_data = mock_upsert.call_args[0][1]
        self.assertEqual(call_data['plan'], 'pro')

    def test_unknown_event_does_nothing(self):
        with patch.dict(os.environ, ENV):
            import stripe_webhook
            stripe_webhook.handle_event('unknown.event', {'object': {}})


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

```
pytest tests/test_stripe_webhook.py -v
```

Expected: `FAILED — ModuleNotFoundError: No module named 'stripe_webhook'`

- [ ] **Step 3: Create `api/stripe-webhook.py`**

```python
import hashlib
import hmac
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _lib.base import SecureHandler
from _lib.supabase import sb_get, sb_upsert
from _lib.stripe import stripe_request


def verify_signature(raw_body: bytes, sig_header: str, secret: str) -> bool:
    try:
        parts = dict(item.split('=', 1) for item in sig_header.split(','))
        timestamp = parts['t']
        v1 = parts['v1']
        signed = f'{timestamp}.'.encode() + raw_body
        mac = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
        return hmac.compare_digest(mac, v1)
    except Exception:
        return False


def handle_event(event_type: str, event_data: dict):
    obj = event_data.get('object', {})

    if event_type == 'checkout.session.completed':
        user_id = obj.get('client_reference_id')
        customer_id = obj.get('customer')
        subscription_id = obj.get('subscription')
        if not user_id or not subscription_id:
            return
        sub = stripe_request('GET', f'subscriptions/{subscription_id}')
        period_end = datetime.fromtimestamp(sub['current_period_end'], tz=timezone.utc).isoformat()
        sb_upsert('subscriptions', {
            'user_id': user_id,
            'plan': 'pro',
            'stripe_customer_id': customer_id,
            'stripe_subscription_id': subscription_id,
            'current_period_end': period_end,
            'cancel_at_period_end': sub.get('cancel_at_period_end', False),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        })

    elif event_type == 'invoice.payment_succeeded':
        subscription_id = obj.get('subscription')
        customer_id = obj.get('customer')
        if not subscription_id:
            return
        rows = sb_get('subscriptions', {'stripe_customer_id': f'eq.{customer_id}', 'select': 'user_id'})
        if not rows:
            return
        user_id = rows[0]['user_id']
        sub = stripe_request('GET', f'subscriptions/{subscription_id}')
        period_end = datetime.fromtimestamp(sub['current_period_end'], tz=timezone.utc).isoformat()
        sb_upsert('subscriptions', {
            'user_id': user_id,
            'plan': 'pro',
            'stripe_customer_id': customer_id,
            'stripe_subscription_id': subscription_id,
            'current_period_end': period_end,
            'cancel_at_period_end': sub.get('cancel_at_period_end', False),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        })

    elif event_type == 'customer.subscription.deleted':
        customer_id = obj.get('customer')
        rows = sb_get('subscriptions', {'stripe_customer_id': f'eq.{customer_id}', 'select': 'user_id'})
        if not rows:
            return
        user_id = rows[0]['user_id']
        sb_upsert('subscriptions', {
            'user_id': user_id,
            'plan': 'free',
            'stripe_customer_id': customer_id,
            'stripe_subscription_id': None,
            'current_period_end': None,
            'cancel_at_period_end': False,
            'updated_at': datetime.now(timezone.utc).isoformat(),
        })


class handler(SecureHandler):
    def do_POST(self):
        sig = self.headers.get('Stripe-Signature', '')
        secret = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
        length = int(self.headers.get('Content-Length', 0))
        raw_body = self.rfile.read(length)

        if not verify_signature(raw_body, sig, secret):
            return self._json(400, {'error': 'Invalid signature'})

        try:
            event = json.loads(raw_body)
            handle_event(event.get('type', ''), event.get('data', {}))
            self._json(200, {'ok': True})
        except Exception as e:
            print(f'[webhook error] {e}', flush=True)
            self._json(500, {'error': 'Internal server error'})
```

- [ ] **Step 4: Run tests to verify they pass**

```
pytest tests/test_stripe_webhook.py -v
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Run all tests**

```
pytest tests/ -v
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```
git add api/stripe-webhook.py tests/test_stripe_webhook.py
git commit -m "feat(billing): add stripe-webhook.py — handle checkout, renewal, cancellation"
```

---

### Task 5: Load plan at login in `js/app.js`

**Files:**
- Modify: `js/app.js` (lines 178–217, `bootWithSession` function)

No automated tests — verify manually after bundle rebuild.

- [ ] **Step 1: Add plan loading after `Store.syncFromSupabase` in `bootWithSession`**

In `js/app.js`, find this block (around line 199):

```javascript
  const result = await Store.syncFromSupabase(client, userId);
  if (result === 'error') {
    if (main) main.innerHTML = `<div class="sync-loading"><i data-lucide="wifi-off"></i><span>Sin conexión — usando datos locales.</span></div>`;
  }

  Store.seedDemo();
  render();
```

Replace it with:

```javascript
  const result = await Store.syncFromSupabase(client, userId);
  if (result === 'error') {
    if (main) main.innerHTML = `<div class="sync-loading"><i data-lucide="wifi-off"></i><span>Sin conexión — usando datos locales.</span></div>`;
  }

  try {
    const { data: subData } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    window._plan = subData?.plan || 'free';
    window._subscription = subData || null;
  } catch (_) {
    window._plan = 'free';
    window._subscription = null;
  }

  Store.seedDemo();

  if (new URLSearchParams(window.location.search).get('billing') === 'success') {
    history.replaceState(null, '', '/');
    setTimeout(() => showToast('¡Bienvenido a Pro! Tu suscripción está activa.', 'success'), 500);
  }

  render();
```

- [ ] **Step 2: Add `showToast` import note**

`showToast` is already available globally in the bundle (from `utils.js`). No import needed.

- [ ] **Step 3: Rebuild bundle to verify no syntax errors**

```
python build.py
```

Expected: `Bundle written to js/bundle.js (X bytes)`

- [ ] **Step 4: Commit**

```
git add js/app.js
git commit -m "feat(billing): load subscription plan at login, handle billing=success redirect"
```

---

### Task 6: Create `js/modules/billing.js` and hook into `settings.js`

**Files:**
- Create: `js/modules/billing.js`
- Modify: `js/modules/settings.js`

- [ ] **Step 1: Create `js/modules/billing.js`**

```javascript
function renderBillingCard(container) {
  const plan = window._plan || 'free';
  const sub = window._subscription;
  const isPro = plan === 'pro';
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const cancelAtEnd = sub?.cancel_at_period_end;

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="card__header">
      <span class="card__title"><i data-lucide="zap"></i> Plan y Facturación</span>
      <span class="badge ${isPro ? 'badge--success' : 'badge--default'}">${isPro ? 'Pro' : 'Gratuito'}</span>
    </div>
    <div class="card__body">
      ${isPro ? `
        <p class="text-sm text-muted">
          ${cancelAtEnd
            ? `Tu suscripción se cancelará el <strong>${periodEnd}</strong>.`
            : `Próxima renovación: <strong>${periodEnd || '—'}</strong>`}
        </p>
        <div style="margin-top:16px">
          <button class="btn btn--secondary" id="btn-manage-sub">
            <i data-lucide="settings"></i> Gestionar suscripción
          </button>
        </div>
      ` : `
        <p class="text-sm text-muted mb-4">Actualiza a <strong>Pro</strong> para cotizaciones ilimitadas.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn--primary" id="btn-upgrade-monthly">
            <i data-lucide="zap"></i> Mensual — $249 MXN/mes
          </button>
          <button class="btn btn--secondary" id="btn-upgrade-yearly">
            Anual — $2,390 MXN/año
            <span class="badge badge--success" style="margin-left:4px">Ahorras $598</span>
          </button>
        </div>
      `}
    </div>`;

  container.appendChild(card);
  if (window.lucide) lucide.createIcons({ nodes: [card] });

  card.querySelector('#btn-upgrade-monthly')?.addEventListener('click', () => _startBillingCheckout('monthly'));
  card.querySelector('#btn-upgrade-yearly')?.addEventListener('click', () => _startBillingCheckout('yearly'));
  card.querySelector('#btn-manage-sub')?.addEventListener('click', () => _openBillingPortal());
}

async function _startBillingCheckout(period) {
  const client = SupabaseClient.get();
  const { data } = await client.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) { showToast('Inicia sesión para continuar', 'error'); return; }

  const btnId = period === 'monthly' ? '#btn-upgrade-monthly' : '#btn-upgrade-yearly';
  const btn = document.querySelector(btnId);
  if (btn) btn.disabled = true;

  try {
    const resp = await fetch(`/api/billing?action=checkout&period=${period}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const result = await resp.json();
    if (result.url) {
      window.location.href = result.url;
    } else {
      showToast('Error al iniciar el pago', 'error');
      if (btn) btn.disabled = false;
    }
  } catch (_) {
    showToast('Error de conexión', 'error');
    if (btn) btn.disabled = false;
  }
}

async function _openBillingPortal() {
  const client = SupabaseClient.get();
  const { data } = await client.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) { showToast('Inicia sesión para continuar', 'error'); return; }

  const btn = document.querySelector('#btn-manage-sub');
  if (btn) btn.disabled = true;

  try {
    const resp = await fetch('/api/billing?action=portal', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const result = await resp.json();
    if (result.url) {
      window.location.href = result.url;
    } else {
      showToast('Error al abrir el portal', 'error');
      if (btn) btn.disabled = false;
    }
  } catch (_) {
    showToast('Error de conexión', 'error');
    if (btn) btn.disabled = false;
  }
}
```

- [ ] **Step 2: Hook into `js/modules/settings.js`**

In `js/modules/settings.js`, find the closing of the settings grid HTML (around line 278):

```javascript
      <div class="settings-save-bar">
        <button class="btn btn--primary btn--lg" id="save-settings"><i data-lucide="save"></i> ${t('set_save')}</button>
      </div>
    </div>`;
```

Replace with:

```javascript
      <div class="settings-save-bar">
        <button class="btn btn--primary btn--lg" id="save-settings"><i data-lucide="save"></i> ${t('set_save')}</button>
      </div>
      <div id="billing-card-slot"></div>
    </div>`;
```

Then find the line right after `if (window.lucide) lucide.createIcons({ nodes: [container] });` (line 280) and add:

```javascript
  if (typeof renderBillingCard === 'function') {
    const slot = container.querySelector('#billing-card-slot');
    if (slot) renderBillingCard(slot);
  }
```

- [ ] **Step 3: Rebuild and verify**

```
python build.py
```

Expected: Bundle writes successfully.

- [ ] **Step 4: Commit**

```
git add js/modules/billing.js js/modules/settings.js
git commit -m "feat(billing): add billing card in settings — upgrade and manage subscription"
```

---

### Task 7: Quota check + upgrade modal in `js/modules/quotations.js`

**Files:**
- Modify: `js/modules/quotations.js`

- [ ] **Step 1: Add `_hasQuota()` helper function**

In `js/modules/quotations.js`, just before `export function renderQuotations(container, params = {}) {` (line 30), add:

```javascript
function _hasQuota() {
  if ((window._plan || 'free') === 'pro') return true;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const count = Store.getQuotations()
    .filter(q => (q.createdAt || q.date || '').startsWith(thisMonth))
    .length;
  return count < 3;
}

function _showUpgradeModal() {
  document.getElementById('upgrade-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'upgrade-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal__header">
        <h3 class="modal__title"><i data-lucide="zap"></i> Límite del plan gratuito</h3>
        <button class="modal__close" id="close-upgrade-modal"><i data-lucide="x"></i></button>
      </div>
      <div class="modal__body">
        <p class="text-sm">Has creado <strong>3 cotizaciones</strong> este mes. Actualiza a <strong>Pro</strong> para cotizaciones ilimitadas.</p>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-secondary);border-radius:8px">
            <span>Mensual</span><strong>$249 MXN/mes</strong>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-secondary);border-radius:8px">
            <span>Anual <span class="badge badge--success">Ahorras $598</span></span><strong>$2,390 MXN/año</strong>
          </div>
        </div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="cancel-upgrade-modal">Ahora no</button>
        <button class="btn btn--secondary" id="upgrade-modal-yearly">Anual $2,390/año</button>
        <button class="btn btn--primary" id="upgrade-modal-monthly"><i data-lucide="zap"></i> Mensual $249/mes</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  if (window.lucide) lucide.createIcons({ nodes: [modal] });

  const close = () => modal.remove();
  modal.querySelector('#close-upgrade-modal').addEventListener('click', close);
  modal.querySelector('#cancel-upgrade-modal').addEventListener('click', close);
  modal.querySelector('#upgrade-modal-monthly').addEventListener('click', () => {
    modal.remove();
    if (typeof _startBillingCheckout === 'function') _startBillingCheckout('monthly');
  });
  modal.querySelector('#upgrade-modal-yearly').addEventListener('click', () => {
    modal.remove();
    if (typeof _startBillingCheckout === 'function') _startBillingCheckout('yearly');
  });
}
```

- [ ] **Step 2: Add quota check before rendering the form**

In `js/modules/quotations.js`, find this line inside `renderQuotations` (around line 33):

```javascript
  if (params.action === 'new' || params.action === 'edit') return renderQuotationForm(container, params.id, params);
```

Replace with:

```javascript
  if (params.action === 'new' || params.action === 'edit') {
    if (params.action === 'new' && !_hasQuota()) {
      renderQuotations(container, {});
      _showUpgradeModal();
      return;
    }
    return renderQuotationForm(container, params.id, params);
  }
```

- [ ] **Step 3: Rebuild and verify**

```
python build.py
```

Expected: Bundle writes successfully.

- [ ] **Step 4: Commit**

```
git add js/modules/quotations.js
git commit -m "feat(billing): quota check on new quotation — upgrade modal for free users"
```

---

### Task 8: Wire up `build.py` and `vercel.json`

**Files:**
- Modify: `build.py`
- Modify: `vercel.json`

- [ ] **Step 1: Add `billing.js` to `FILES` in `build.py`**

In `build.py`, find the FILES list. Locate `'js/modules/settings.js'` and add `billing.js` before it:

```python
FILES = [
    'js/supabase-client.js',
    'js/store.js',
    'js/auth.js',
    'js/i18n.js',
    'js/catalogs.js',
    'js/utils.js',
    'js/modules/dashboard.js',
    'js/modules/clients.js',
    'js/modules/products.js',
    'js/modules/quotations.js',
    'js/modules/invoices.js',
    'js/modules/payments.js',
    'js/modules/templates.js',
    'js/modules/reports.js',
    'js/modules/billing.js',      # ← new
    'js/modules/settings.js',
    'js/modules/kanban.js',
    'js/reminders.js',
    'js/app.js',
]
```

- [ ] **Step 2: Add `billing.py` and `stripe-webhook.py` to `vercel.json`**

Replace the contents of `vercel.json` with:

```json
{
  "buildCommand": "python build.py",
  "outputDirectory": ".",
  "functions": {
    "api/portal.py":         { "includeFiles": "api/_lib/**" },
    "api/viewed.py":         { "includeFiles": "api/_lib/**" },
    "api/action.py":         { "includeFiles": "api/_lib/**" },
    "api/billing.py":        { "includeFiles": "api/_lib/**" },
    "api/stripe-webhook.py": { "includeFiles": "api/_lib/**" }
  },
  "rewrites": [
    { "source": "/q/:token",            "destination": "/api/portal?token=:token" },
    { "source": "/api/q/:token/viewed", "destination": "/api/viewed?token=:token" },
    { "source": "/api/q/:token/action", "destination": "/api/action?token=:token" }
  ]
}
```

- [ ] **Step 3: Rebuild bundle**

```
python build.py
```

Expected: `Bundle written to js/bundle.js (X bytes)`

- [ ] **Step 4: Run all tests**

```
pytest tests/ -v
```

Expected: All tests PASS.

- [ ] **Step 5: Commit and push**

```
git add build.py vercel.json js/bundle.js
git commit -m "feat(billing): wire up billing.js in bundle and billing/webhook functions in vercel.json"
git push origin main
```

---

## Manual Setup (before testing in production)

These steps must be done by the user in external dashboards before the billing flow works end-to-end:

1. **Supabase** — Run in SQL Editor:
```sql
create table subscriptions (
  user_id             uuid primary key references auth.users(id),
  plan                text not null default 'free',
  stripe_customer_id  text,
  stripe_subscription_id text,
  current_period_end  timestamptz,
  cancel_at_period_end boolean default false,
  updated_at          timestamptz default now()
);
alter table subscriptions enable row level security;
create policy "users can read own subscription"
  on subscriptions for select using (auth.uid() = user_id);
```

2. **Stripe** — Create product "CotizaPro Pro" with two prices:
   - $249.00 MXN, recurring monthly → copy Price ID
   - $2,390.00 MXN, recurring yearly → copy Price ID

3. **Stripe** — Add webhook endpoint `https://<your-app>/api/stripe-webhook` with events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
   → Copy Webhook Signing Secret (`whsec_...`)

4. **Vercel** — Add 5 environment variables:
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
   - `STRIPE_PRICE_ID_MONTHLY` = `price_...`
   - `STRIPE_PRICE_ID_YEARLY` = `price_...`
   - `APP_URL` = `https://<your-vercel-app>`
