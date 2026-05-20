import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Ensure _lib is in the path before importing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

class TestSbGet(unittest.TestCase):
    @patch('_lib.supabase.urllib.request.urlopen')
    def test_returns_parsed_json(self, mock_open):
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'[{"id": "abc"}]'
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_open.return_value = mock_resp

        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_ROLE_KEY': 'testkey',
        }):
            from _lib import supabase
            result = supabase.sb_get('quote_tokens', {'token': 'eq.abc'})

        self.assertEqual(result, [{'id': 'abc'}])

    @patch('_lib.supabase.urllib.request.urlopen')
    def test_patch_sends_correct_method(self, mock_open):
        mock_resp = MagicMock()
        mock_resp.status = 204
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_open.return_value = mock_resp

        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_ROLE_KEY': 'testkey',
        }):
            from _lib import supabase
            result = supabase.sb_patch('user_data', {'user_id': 'eq.1'}, {'quotations': []})

        call_args = mock_open.call_args[0][0]
        self.assertEqual(call_args.method, 'PATCH')
        self.assertEqual(result, 204)

if __name__ == '__main__':
    unittest.main()
