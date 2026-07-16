from security_response_generator.llm import ollama_client


def test_embed_texts_calls_ollama_with_configured_model(monkeypatch):
    captured = {}

    def fake_embed(model, input):
        captured["model"] = model
        captured["input"] = input
        return {"embeddings": [[0.1, 0.2], [0.3, 0.4]]}

    monkeypatch.setattr(ollama_client.ollama, "embed", fake_embed)

    result = ollama_client.embed_texts(["a", "b"])

    assert result == [[0.1, 0.2], [0.3, 0.4]]
    assert captured["model"] == ollama_client.EMBEDDING_MODEL
    assert captured["input"] == ["a", "b"]


def test_embed_texts_splits_large_input_into_batches(monkeypatch):
    monkeypatch.setattr(ollama_client, "EMBED_BATCH_SIZE", 2)
    calls = []

    def fake_embed(model, input):
        calls.append(list(input))
        return {"embeddings": [[float(len(text))] for text in input]}

    monkeypatch.setattr(ollama_client.ollama, "embed", fake_embed)

    result = ollama_client.embed_texts(["a", "bb", "ccc", "dddd", "e"])

    assert calls == [["a", "bb"], ["ccc", "dddd"], ["e"]]
    assert result == [[1.0], [2.0], [3.0], [4.0], [1.0]]


def test_embed_texts_single_batch_when_under_batch_size(monkeypatch):
    monkeypatch.setattr(ollama_client, "EMBED_BATCH_SIZE", 10)
    calls = []

    def fake_embed(model, input):
        calls.append(list(input))
        return {"embeddings": [[0.0] for _ in input]}

    monkeypatch.setattr(ollama_client.ollama, "embed", fake_embed)

    ollama_client.embed_texts(["a", "b", "c"])

    assert len(calls) == 1


def test_embed_texts_calls_on_batch_after_each_batch(monkeypatch):
    monkeypatch.setattr(ollama_client, "EMBED_BATCH_SIZE", 2)

    def fake_embed(model, input):
        return {"embeddings": [[0.0] for _ in input]}

    monkeypatch.setattr(ollama_client.ollama, "embed", fake_embed)

    batch_sizes = []
    ollama_client.embed_texts(["a", "bb", "ccc", "dddd", "e"], on_batch=batch_sizes.append)

    assert batch_sizes == [2, 2, 1]


def test_embed_texts_on_batch_not_required(monkeypatch):
    monkeypatch.setattr(ollama_client.ollama, "embed", lambda model, input: {"embeddings": [[0.0]]})

    # Should not raise when on_batch is omitted.
    assert ollama_client.embed_texts(["a"]) == [[0.0]]


def test_embed_texts_empty_input_short_circuits(monkeypatch):
    def fake_embed(*args, **kwargs):
        raise AssertionError("should not be called for empty input")

    monkeypatch.setattr(ollama_client.ollama, "embed", fake_embed)

    assert ollama_client.embed_texts([]) == []


def test_embed_query_returns_single_vector(monkeypatch):
    monkeypatch.setattr(
        ollama_client.ollama, "embed", lambda model, input: {"embeddings": [[1.0, 2.0]]}
    )

    assert ollama_client.embed_query("hello") == [1.0, 2.0]


def test_chat_messages_calls_ollama_with_configured_model_and_raw_messages(monkeypatch):
    captured = {}

    def fake_chat(model, messages, options):
        captured["model"] = model
        captured["messages"] = messages
        captured["options"] = options
        return {"message": {"content": "response text"}}

    monkeypatch.setattr(ollama_client.ollama, "chat", fake_chat)

    messages = [
        {"role": "system", "content": "system prompt"},
        {"role": "user", "content": "user prompt"},
        {"role": "assistant", "content": "NEEDS_INFO: what tool do you use?"},
        {"role": "user", "content": "Acme Sentinel"},
    ]
    result = ollama_client.chat_messages(messages)

    assert result == "response text"
    assert captured["model"] == ollama_client.GENERATION_MODEL
    assert captured["messages"] == messages
    assert captured["options"] == {"num_ctx": ollama_client.NUM_CTX}


def test_chat_messages_num_ctx_respects_override(monkeypatch):
    monkeypatch.setattr(ollama_client, "NUM_CTX", 32768)
    captured = {}

    def fake_chat(model, messages, options):
        captured["options"] = options
        return {"message": {"content": "response text"}}

    monkeypatch.setattr(ollama_client.ollama, "chat", fake_chat)

    ollama_client.chat_messages([{"role": "user", "content": "hi"}])

    assert captured["options"] == {"num_ctx": 32768}
