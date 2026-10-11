"""OpenAI compatible client: request shape, ordered fallbacks, deadline, reply handling."""
import unittest
from unittest.mock import patch

import requests

import llm_client
import llm_config


class FakeResponse:
    def __init__(self, body=None, status_code=200):
        self._body = body
        self.status_code = status_code

    def json(self):
        if isinstance(self._body, Exception):
            raise self._body
        return self._body


def reply(text):
    return FakeResponse({'choices': [{'message': {'content': text}}]})


class ClientTestBase(unittest.TestCase):
    def setUp(self):
        self.calls = []
        self.queue = []
        overrides = dict(
            LLM_BASE_URL='https://primary.test/v1',
            LLM_API_KEY='primary-key',
            LLM_MODEL='model-a,model-b',
            LLM_SEMANTIC_MODEL='sem-a',
            LLM_FALLBACK_BASE_URL='',
            LLM_FALLBACK_API_KEY='',
            LLM_FALLBACK_MODEL='',
            LLM_TIMEOUT_SECONDS=60.0,
            LLM_TOTAL_TIMEOUT_SECONDS=90.0,
            LLM_MAX_TOKENS=4096,
        )
        for name, value in overrides.items():
            patcher = patch.object(llm_config, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        post = patch('llm_client.requests.post', side_effect=self.fake_post)
        post.start()
        self.addCleanup(post.stop)

    def fake_post(self, url, **kwargs):
        self.calls.append((url, kwargs))
        outcome = self.queue.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    def models_called(self):
        return [kwargs['json']['model'] for _, kwargs in self.calls]


class RequestShapeTests(ClientTestBase):
    def test_posts_an_openai_chat_completion(self):
        self.queue = [reply('  hello  ')]
        text, error = llm_client.call_llm('the prompt')
        self.assertEqual((text, error), ('hello', False))
        url, kwargs = self.calls[0]
        self.assertEqual(url, 'https://primary.test/v1/chat/completions')
        self.assertEqual(kwargs['headers']['Authorization'], 'Bearer primary-key')
        self.assertEqual(kwargs['json']['model'], 'model-a')
        self.assertEqual(kwargs['json']['messages'], [{'role': 'user', 'content': 'the prompt'}])
        self.assertEqual(kwargs['json']['max_tokens'], 4096)
        self.assertEqual(kwargs['timeout'], 60.0)

    def test_trailing_slash_in_base_url_is_fine(self):
        with patch.object(llm_config, 'LLM_BASE_URL', 'https://primary.test/v1/'):
            self.queue = [reply('ok')]
            llm_client.call_llm('p')
        self.assertEqual(self.calls[0][0], 'https://primary.test/v1/chat/completions')

    def test_no_authorization_header_without_a_key(self):
        with patch.object(llm_config, 'LLM_API_KEY', ''):
            self.queue = [reply('ok')]
            llm_client.call_llm('p')
        self.assertNotIn('Authorization', self.calls[0][1]['headers'])

    def test_semantic_calls_use_the_semantic_model_and_custom_timeout(self):
        self.queue = [reply('{}')]
        llm_client.call_llm('p', semantic=True, timeout_seconds=20)
        self.assertEqual(self.models_called(), ['sem-a'])
        self.assertEqual(self.calls[0][1]['timeout'], 20)

    def test_model_list_tolerates_spaces_and_blanks(self):
        with patch.object(llm_config, 'LLM_MODEL', ' model-a , ,model-b,'):
            self.queue = [FakeResponse({}, 500), reply('ok')]
            llm_client.call_llm('p')
        self.assertEqual(self.models_called(), ['model-a', 'model-b'])


class NotConfiguredTests(ClientTestBase):
    def test_missing_base_url_skips_the_call(self):
        with patch.object(llm_config, 'LLM_BASE_URL', ''):
            self.assertEqual(llm_client.call_llm('p'), (None, True))
        self.assertEqual(self.calls, [])

    def test_missing_model_skips_the_call(self):
        with patch.object(llm_config, 'LLM_MODEL', ''):
            self.assertEqual(llm_client.call_llm('p'), (None, True))
        self.assertEqual(self.calls, [])


class FallbackTests(ClientTestBase):
    def test_next_model_is_tried_after_a_rate_limit(self):
        self.queue = [FakeResponse({}, 429), reply('from b')]
        self.assertEqual(llm_client.call_llm('p'), ('from b', False))
        self.assertEqual(self.models_called(), ['model-a', 'model-b'])

    def test_models_are_tried_strictly_in_order_and_stop_at_first_success(self):
        self.queue = [reply('first')]
        llm_client.call_llm('p')
        self.assertEqual(self.models_called(), ['model-a'])

    def test_fallback_provider_is_used_after_all_primary_models_fail(self):
        with patch.object(llm_config, 'LLM_FALLBACK_BASE_URL', 'https://second.test/ai/v1'), \
                patch.object(llm_config, 'LLM_FALLBACK_API_KEY', 'second-key'), \
                patch.object(llm_config, 'LLM_FALLBACK_MODEL', 'cf-model'):
            self.queue = [FakeResponse({}, 503), FakeResponse({}, 503), reply('from cloudflare')]
            self.assertEqual(llm_client.call_llm('p'), ('from cloudflare', False))
        self.assertEqual(self.models_called(), ['model-a', 'model-b', 'cf-model'])
        url, kwargs = self.calls[2]
        self.assertEqual(url, 'https://second.test/ai/v1/chat/completions')
        self.assertEqual(kwargs['headers']['Authorization'], 'Bearer second-key')

    def test_primary_key_is_never_sent_to_the_fallback_provider(self):
        with patch.object(llm_config, 'LLM_FALLBACK_BASE_URL', 'https://second.test/v1'), \
                patch.object(llm_config, 'LLM_FALLBACK_API_KEY', ''), \
                patch.object(llm_config, 'LLM_FALLBACK_MODEL', 'cf'):
            self.queue = [FakeResponse({}, 500), FakeResponse({}, 500), reply('ok')]
            llm_client.call_llm('p')
        self.assertNotIn('Authorization', self.calls[2][1]['headers'])

    def test_fallback_provider_alone_works_when_primary_has_no_models(self):
        with patch.object(llm_config, 'LLM_MODEL', ''), \
                patch.object(llm_config, 'LLM_FALLBACK_BASE_URL', 'https://second.test/v1'), \
                patch.object(llm_config, 'LLM_FALLBACK_MODEL', 'cf'):
            self.queue = [reply('ok')]
            self.assertEqual(llm_client.call_llm('p'), ('ok', False))

    def test_every_candidate_failing_reports_an_error(self):
        self.queue = [FakeResponse({}, 500), FakeResponse({}, 500)]
        self.assertEqual(llm_client.call_llm('p'), (None, True))
        self.assertEqual(len(self.calls), 2)

    def test_network_errors_and_timeouts_fall_through(self):
        self.queue = [requests.Timeout('slow'), requests.ConnectionError('down')]
        self.assertEqual(llm_client.call_llm('p'), (None, True))
        self.queue = [requests.Timeout('slow'), reply('ok')]
        self.assertEqual(llm_client.call_llm('p'), ('ok', False))

    def test_non_json_reply_falls_through(self):
        self.queue = [FakeResponse(ValueError('not json')), reply('ok')]
        self.assertEqual(llm_client.call_llm('p'), ('ok', False))

    def test_auth_failures_fall_through_too(self):
        self.queue = [FakeResponse({}, 401), reply('ok')]
        self.assertEqual(llm_client.call_llm('p'), ('ok', False))


class UnusableReplyTests(ClientTestBase):
    def assert_falls_through(self, bad):
        self.queue = [bad, reply('good')]
        self.assertEqual(llm_client.call_llm('p'), ('good', False))

    def test_error_body_with_http_200(self):
        # OpenRouter reports upstream failures as 200 with an "error" object.
        self.assert_falls_through(FakeResponse({'error': {'message': 'provider returned error', 'code': 502}}))

    def test_empty_choices(self):
        self.assert_falls_through(FakeResponse({'choices': []}))

    def test_null_content_from_a_reasoning_only_reply(self):
        self.assert_falls_through(FakeResponse({'choices': [{'message': {'content': None, 'reasoning': 'thinking...'}}]}))

    def test_blank_content(self):
        self.assert_falls_through(reply('   \n '))

    def test_reply_that_is_only_a_think_block(self):
        self.assert_falls_through(reply('<think>no answer yet</think>'))

    def test_reply_cut_off_inside_a_think_block(self):
        self.assert_falls_through(reply('<think>still going and then the token limit hit'))

    def test_unexpected_body_types(self):
        for body in (None, [], 'text', {'choices': 'x'}, {'choices': [None]}, {'choices': [{'message': 5}]}):
            self.queue = [FakeResponse(body), reply('good')]
            self.assertEqual(llm_client.call_llm('p'), ('good', False), body)


class ReplyParsingTests(ClientTestBase):
    def test_think_block_is_stripped_from_a_real_answer(self):
        self.queue = [reply('<think>let me consider</think>\nThe answer.')]
        self.assertEqual(llm_client.call_llm('p'), ('The answer.', False))

    def test_content_given_as_a_list_of_parts(self):
        self.queue = [FakeResponse({'choices': [{'message': {'content': [
            {'type': 'text', 'text': 'part one '}, {'type': 'image', 'url': 'x'}, {'type': 'text', 'text': 'part two'},
        ]}}]})]
        self.assertEqual(llm_client.call_llm('p'), ('part one part two', False))


class DeadlineTests(ClientTestBase):
    def test_no_calls_are_made_once_the_budget_is_spent(self):
        with patch.object(llm_config, 'LLM_TOTAL_TIMEOUT_SECONDS', 0.5):
            self.assertEqual(llm_client.call_llm('p'), (None, True))
        self.assertEqual(self.calls, [])

    def test_a_call_never_waits_longer_than_the_remaining_budget(self):
        with patch.object(llm_config, 'LLM_TOTAL_TIMEOUT_SECONDS', 5.0):
            self.queue = [reply('ok')]
            llm_client.call_llm('p')
        self.assertLessEqual(self.calls[0][1]['timeout'], 5.0)

    def test_candidates_are_skipped_once_time_runs_out(self):
        clock = iter([0.0, 0.0, 10.0, 10.0, 10.0])
        with patch('llm_client.time.monotonic', side_effect=lambda: next(clock)), \
                patch.object(llm_config, 'LLM_TOTAL_TIMEOUT_SECONDS', 5.0):
            self.queue = [FakeResponse({}, 500)]
            self.assertEqual(llm_client.call_llm('p'), (None, True))
        self.assertEqual(self.models_called(), ['model-a'])


class ParseJsonObjectTests(unittest.TestCase):
    def test_plain_object(self):
        self.assertEqual(llm_client.parse_json_object('{"a": ["x"]}'), {'a': ['x']})

    def test_empty_object_is_a_valid_answer(self):
        self.assertEqual(llm_client.parse_json_object('{}'), {})

    def test_fenced_with_and_without_language(self):
        self.assertEqual(llm_client.parse_json_object('```json\n{"a": 1}\n```'), {'a': 1})
        self.assertEqual(llm_client.parse_json_object('```\n{"a": 1}\n```'), {'a': 1})

    def test_prose_before_and_after(self):
        text = 'Sure! Here is the mapping:\n{"n1": ["jwt"]}\nLet me know if you need more.'
        self.assertEqual(llm_client.parse_json_object(text), {'n1': ['jwt']})

    def test_fenced_block_inside_prose(self):
        text = 'Result:\n```json\n{"n1": []}\n```\nDone.'
        self.assertEqual(llm_client.parse_json_object(text), {'n1': []})

    def test_think_block_before_the_object(self):
        self.assertEqual(llm_client.parse_json_object('<think>{"decoy": 1}</think>{"real": 2}'), {'real': 2})

    def test_trailing_commas(self):
        self.assertEqual(llm_client.parse_json_object('{"a": ["x", "y",], "b": [],}'), {'a': ['x', 'y'], 'b': []})

    def test_python_style_literals(self):
        self.assertEqual(llm_client.parse_json_object("{'n1': ['jwt', 'tls'], 'n2': []}"), {'n1': ['jwt', 'tls'], 'n2': []})

    def test_braces_inside_strings_do_not_confuse_extraction(self):
        text = 'note {not json} then {"a": "has } brace"}'
        self.assertEqual(llm_client.parse_json_object(text), {'a': 'has } brace'})

    def test_nested_objects(self):
        self.assertEqual(llm_client.parse_json_object('x {"a": {"b": [1]}} y'), {'a': {'b': [1]}})

    def test_first_object_wins(self):
        self.assertEqual(llm_client.parse_json_object('{"a": 1} {"b": 2}'), {'a': 1})

    def test_unusable_input_returns_none(self):
        for bad in ('', '   ', 'no json here', '[1, 2]', '{"a": ', '{"a": [1, 2', None, 5, ['x'], '<think>{"a": 1}'):
            self.assertIsNone(llm_client.parse_json_object(bad), bad)

    def test_many_stray_braces_do_not_hang(self):
        self.assertIsNone(llm_client.parse_json_object('{' * 5000))
