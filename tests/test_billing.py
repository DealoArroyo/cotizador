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
