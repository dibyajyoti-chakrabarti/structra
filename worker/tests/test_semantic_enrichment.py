"""Semantic enrichment and the other LLM call sites in evaluation_compute."""
import unittest
from unittest.mock import patch

import evaluation_compute as compute


def canvas(*nodes):
    return {'nodes': list(nodes), 'edges': []}


def node(node_id='n1', **metadata):
    return {'id': node_id, 'type': 'service', 'metadata': metadata}


@patch('evaluation_compute.call_llm')
class SemanticEnrichmentTests(unittest.TestCase):
    def tags(self, result, index=0):
        return result['nodes'][index]['metadata'].get('semanticTags')

    def test_free_tier_never_calls_the_model(self, llm):
        state = canvas(node(purpose='auth with jwt'))
        self.assertIs(compute._semantic_enrich_canvas_state(state, 'core'), state)
        llm.assert_not_called()

    def test_no_nodes_or_no_metadata_never_calls_the_model(self, llm):
        for state in (canvas(), canvas(node()), canvas(node(color='red'))):
            compute._semantic_enrich_canvas_state(state, 'individual')
        llm.assert_not_called()

    def test_clean_json_reply_adds_keywords(self, llm):
        llm.return_value = ('{"n1": ["auth-mechanism"]}', False)
        result = compute._semantic_enrich_canvas_state(canvas(node(purpose='signs requests with a token')), 'individual')
        self.assertIn('jwt', self.tags(result))
        self.assertIn('oauth2', self.tags(result))
        self.assertTrue(llm.call_args.kwargs['semantic'])

    def test_fenced_reply_with_prose_still_works(self, llm):
        llm.return_value = ('Here you go:\n```json\n{"n1": ["encryption"],}\n```', False)
        result = compute._semantic_enrich_canvas_state(canvas(node(notes='uses tls')), 'team')
        self.assertIn('tls', self.tags(result))

    def test_python_style_reply_still_works(self, llm):
        llm.return_value = ("{'n1': ['rate-limiting']}", False)
        result = compute._semantic_enrich_canvas_state(canvas(node(purpose='throttles callers')), 'enterprise')
        self.assertIn('token-bucket', self.tags(result))

    def test_existing_tags_are_kept(self, llm):
        llm.return_value = ('{"n1": ["encryption"]}', False)
        result = compute._semantic_enrich_canvas_state(canvas(node(purpose='x', semanticTags='custom-tag')), 'individual')
        self.assertTrue(self.tags(result).startswith('custom-tag '))

    def test_unknown_attributes_are_ignored(self, llm):
        llm.return_value = ('{"n1": ["made-up-attr", "encryption", 42, null]}', False)
        result = compute._semantic_enrich_canvas_state(canvas(node(purpose='x')), 'individual')
        self.assertIn('tls', self.tags(result))
        self.assertNotIn('made-up', self.tags(result))

    def test_only_unknown_attributes_leaves_the_node_untouched(self, llm):
        llm.return_value = ('{"n1": ["made-up-attr"]}', False)
        state = canvas(node(purpose='x'))
        result = compute._semantic_enrich_canvas_state(state, 'individual')
        self.assertEqual(result['nodes'], state['nodes'])

    def test_a_string_instead_of_a_list_is_accepted(self, llm):
        llm.return_value = ('{"n1": "idempotency"}', False)
        result = compute._semantic_enrich_canvas_state(canvas(node(purpose='x')), 'individual')
        self.assertIn('idempotent', self.tags(result))

    def test_wrong_value_shapes_are_ignored_not_crashed_on(self, llm):
        for bad in ('5', '{"a": 1}', 'null', 'true'):
            llm.return_value = (f'{{"n1": {bad}}}', False)
            result = compute._semantic_enrich_canvas_state(canvas(node(purpose='x')), 'individual')
            self.assertIsNone(self.tags(result), bad)

    def test_numeric_node_ids_match_string_keys(self, llm):
        llm.return_value = ('{"7": ["encryption"]}', False)
        result = compute._semantic_enrich_canvas_state(canvas(node(7, purpose='x')), 'individual')
        self.assertIn('tls', self.tags(result))

    def test_only_listed_nodes_are_enriched(self, llm):
        llm.return_value = ('{"n2": ["encryption"]}', False)
        result = compute._semantic_enrich_canvas_state(
            canvas(node('n1', purpose='a'), node('n2', purpose='b')), 'individual')
        self.assertIsNone(self.tags(result, 0))
        self.assertIn('tls', self.tags(result, 1))

    def test_unparseable_reply_returns_the_canvas_unchanged(self, llm):
        for bad in ('I cannot help with that.', '[1, 2]', '{"n1": [', ''):
            llm.return_value = (bad, False)
            state = canvas(node(purpose='x'))
            self.assertIs(compute._semantic_enrich_canvas_state(state, 'individual'), state, bad)

    def test_model_failure_returns_the_canvas_unchanged(self, llm):
        llm.return_value = (None, True)
        state = canvas(node(purpose='x'))
        self.assertIs(compute._semantic_enrich_canvas_state(state, 'individual'), state)

    def test_input_canvas_is_not_mutated(self, llm):
        llm.return_value = ('{"n1": ["encryption"]}', False)
        state = canvas(node(purpose='x'))
        compute._semantic_enrich_canvas_state(state, 'individual')
        self.assertNotIn('semanticTags', state['nodes'][0]['metadata'])


@patch('evaluation_compute.call_llm', return_value=('text', False))
class OtherCallSiteTests(unittest.TestCase):
    def test_suggestions_pass_the_prompt_through(self, llm):
        self.assertEqual(compute.call_llm_for_prompt('my prompt'), ('text', False))
        llm.assert_called_once_with('my prompt')

    def test_cloud_analysis_builds_a_prompt_from_the_failed_rules(self, llm):
        failed = [{'id': 'R-42', 'reason': 'No cache layer'}]
        state = canvas(node('n1', purpose='orders db'))
        result = compute.call_llm_cloud_analysis(failed, state, {'goal': 'sell things', 'constraints': 'low cost'})
        self.assertEqual(result, ('text', False))
        prompt = llm.call_args.args[0]
        for expected in ('R-42', 'No cache layer', 'sell things', 'low cost', 'orders db'):
            self.assertIn(expected, prompt)

    def test_cloud_analysis_copes_with_nothing_to_report(self, llm):
        compute.call_llm_cloud_analysis([], canvas(), {})
        prompt = llm.call_args.args[0]
        self.assertIn('Not stated', prompt)
        self.assertIn('No nodes provided', prompt)
