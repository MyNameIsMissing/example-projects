from security_response_generator.ingest.chunking import chunk_text


def test_short_text_fits_in_single_chunk():
    text = "This is a short paragraph about SI-5."
    chunks = chunk_text(text, chunk_size=1000, overlap=100)

    assert len(chunks) == 1
    assert chunks[0].text == text
    assert chunks[0].chunk_index == 0


def test_long_text_splits_into_multiple_chunks_with_overlap():
    paragraphs = [f"Paragraph {i} " + ("word " * 50) for i in range(10)]
    text = "\n\n".join(paragraphs)

    chunks = chunk_text(text, chunk_size=300, overlap=50)

    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk.text) <= 300 + 50  # allow overlap slack from paragraph joins


def test_oversized_single_paragraph_uses_sliding_window():
    text = "x" * 1000
    chunks = chunk_text(text, chunk_size=300, overlap=50)

    assert len(chunks) > 1
    # Sliding window chunks should all respect the requested size.
    for chunk in chunks:
        assert len(chunk.text) <= 300


def test_control_ids_are_tagged():
    text = "This section discusses SI-5 and AC-2(1) in detail."
    chunks = chunk_text(text, chunk_size=1000, overlap=100)

    assert chunks[0].control_ids == ["AC-2(1)", "SI-5"]


def test_empty_text_produces_no_chunks():
    assert chunk_text("", chunk_size=1000, overlap=100) == []
    assert chunk_text("   \n\n  ", chunk_size=1000, overlap=100) == []
