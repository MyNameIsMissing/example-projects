from security_response_generator.generation.retrieval import (
    RetrievalResult,
    RetrievedChunk,
    merge_results,
    to_chunks,
)


def _chunk(chunk_id: str, text: str = "text", path: str = "doc.md") -> RetrievedChunk:
    return RetrievedChunk(text=text, source_path=path, chunk_id=chunk_id)


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


def test_retrieval_result_refusal_flag_reflects_baseline_matches():
    no_baseline = RetrievalResult(customer_chunks=[], baseline_chunks=[], private_chunks=[])
    assert no_baseline.has_baseline_match is False

    with_baseline = RetrievalResult(
        customer_chunks=[], baseline_chunks=[_chunk("a")], private_chunks=[]
    )
    assert with_baseline.has_baseline_match is True


def test_retrieval_result_customer_caveat_flag():
    no_customer = RetrievalResult(
        customer_chunks=[], baseline_chunks=[_chunk("a")], private_chunks=[]
    )
    assert no_customer.has_customer_match is False

    with_customer = RetrievalResult(
        customer_chunks=[_chunk("c")], baseline_chunks=[_chunk("a")], private_chunks=[]
    )
    assert with_customer.has_customer_match is True
