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
