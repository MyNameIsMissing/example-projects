from security_response_generator.generation import retrieval
from security_response_generator.generation.retrieval import (
    RetrievalResult,
    RetrievedChunk,
    merge_results,
    to_chunks,
)


def _chunk(chunk_id: str, text: str = "text", path: str = "doc.md") -> RetrievedChunk:
    return RetrievedChunk(text=text, source_path=path, chunk_id=chunk_id)


class _FakeCollection:
    """Returns one canned result for the exact-substring pass and another for the
    unfiltered semantic pass, so tests can tell the two apart."""

    def __init__(self, metadata_result: dict, semantic_result: dict):
        self._metadata_result = metadata_result
        self._semantic_result = semantic_result

    def query(self, query_embeddings, n_results, where_document=None):
        return self._metadata_result if where_document else self._semantic_result


def _raw_result(chunk_ids: list[str]) -> dict:
    return {
        "ids": [chunk_ids],
        "documents": [[f"text {chunk_id}" for chunk_id in chunk_ids]],
        "metadatas": [[{"source_path": "doc.md"} for _ in chunk_ids]],
    }


def test_merge_results_dedups_and_prioritizes_primary():
    primary = [_chunk("a"), _chunk("b")]
    secondary = [_chunk("b"), _chunk("c"), _chunk("d")]

    merged = merge_results(primary, secondary, top_k=3)

    assert [c.chunk_id for c in merged] == ["a", "b", "c"]


def test_merge_results_respects_top_k_cap():
    primary = [_chunk(str(i)) for i in range(10)]
    merged = merge_results(primary, [], top_k=4)

    assert len(merged) == 4


def test_merge_results_handles_empty_inputs():
    assert merge_results([], [], top_k=5) == []


def test_to_chunks_converts_raw_chroma_query_shape():
    raw_result = {
        "ids": [["doc.md::0", "doc.md::1"]],
        "documents": [["first chunk", "second chunk"]],
        "metadatas": [[{"source_path": "doc.md"}, {"source_path": "doc.md"}]],
    }

    chunks = to_chunks(raw_result)

    assert len(chunks) == 2
    assert chunks[0].chunk_id == "doc.md::0"
    assert chunks[0].text == "first chunk"
    assert chunks[0].source_path == "doc.md"


def test_to_chunks_handles_empty_result():
    raw_result = {"ids": [[]], "documents": [[]], "metadatas": [[]]}
    assert to_chunks(raw_result) == []


def test_query_collection_reports_exact_match_when_metadata_pass_hits():
    collection = _FakeCollection(
        metadata_result=_raw_result(["a"]),
        semantic_result=_raw_result(["a", "b"]),
    )

    chunks, exact_match = retrieval._query_collection(collection, "AC-2", [0.0], top_k=5)

    assert exact_match is True
    assert [c.chunk_id for c in chunks] == ["a", "b"]


def test_query_collection_reports_no_exact_match_for_semantic_only_hits():
    # A fabricated control ID (e.g. "IL-27") still pulls back the semantically-nearest
    # chunks -- Chroma's vector query has no similarity threshold -- but the
    # exact-substring pass correctly finds nothing, so exact_match must be False.
    collection = _FakeCollection(
        metadata_result=_raw_result([]),
        semantic_result=_raw_result(["x", "y"]),
    )

    chunks, exact_match = retrieval._query_collection(collection, "IL-27", [0.0], top_k=5)

    assert exact_match is False
    assert [c.chunk_id for c in chunks] == ["x", "y"]


def test_retrieval_result_refusal_flag_reflects_exact_match_not_chunk_presence():
    no_baseline = RetrievalResult(
        customer_chunks=[], baseline_chunks=[], private_chunks=[], baseline_exact_match=False
    )
    assert no_baseline.has_baseline_match is False

    with_baseline = RetrievalResult(
        customer_chunks=[],
        baseline_chunks=[_chunk("a")],
        private_chunks=[],
        baseline_exact_match=True,
    )
    assert with_baseline.has_baseline_match is True


def test_retrieval_result_refusal_flag_ignores_semantic_only_baseline_chunks():
    # A fabricated control ID (e.g. "IL-27") can still pull back semantically-nearest
    # chunks with no similarity threshold -- has_baseline_match must not be fooled by
    # baseline_chunks being non-empty when no exact match was actually found.
    semantic_only = RetrievalResult(
        customer_chunks=[],
        baseline_chunks=[_chunk("a")],
        private_chunks=[],
        baseline_exact_match=False,
    )
    assert semantic_only.has_baseline_match is False


def test_retrieval_result_customer_caveat_flag():
    no_customer = RetrievalResult(
        customer_chunks=[],
        baseline_chunks=[_chunk("a")],
        private_chunks=[],
        baseline_exact_match=True,
    )
    assert no_customer.has_customer_match is False

    with_customer = RetrievalResult(
        customer_chunks=[_chunk("c")],
        baseline_chunks=[_chunk("a")],
        private_chunks=[],
        baseline_exact_match=True,
    )
    assert with_customer.has_customer_match is True
