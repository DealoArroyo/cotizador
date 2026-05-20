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
