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
