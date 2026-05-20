import hashlib
import hmac
import json
import os
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _lib.base import SecureHandler
from _lib.supabase import sb_get, sb_upsert
from _lib.stripe import stripe_request


_TOLERANCE = 300  # seconds

def verify_signature(raw_body: bytes, sig_header: str, secret: str) -> bool:
    try:
        parts = dict(item.split('=', 1) for item in sig_header.split(','))
        timestamp = parts['t']
        v1 = parts['v1']
        if abs(time.time() - int(timestamp)) > _TOLERANCE:
            return False
        signed = f'{timestamp}.'.encode() + raw_body
        mac = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
        return hmac.compare_digest(mac, v1)
    except (KeyError, ValueError, TypeError):
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
            print(f'[webhook] no subscription found for customer {customer_id}', flush=True)
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
            print(f'[webhook] no subscription found for customer {customer_id}', flush=True)
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
