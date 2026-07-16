"""Thin wrapper around the local Ollama client for embeddings and chat."""

from collections.abc import Callable

import ollama

from security_response_generator.config import (
    EMBED_BATCH_SIZE,
    EMBEDDING_MODEL,
    GENERATION_MODEL,
    NUM_CTX,
)


def embed_texts(
    texts: list[str], on_batch: Callable[[int], None] | None = None
) -> list[list[float]]:
    """Embed texts in EMBED_BATCH_SIZE-sized batches.

    If on_batch is given, it's called with the number of texts just embedded
    after each batch completes, so callers can drive a progress indicator
    without needing to know about batching themselves.
    """
    if not texts:
        return []
    embeddings: list[list[float]] = []
    for start in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[start : start + EMBED_BATCH_SIZE]
        response = ollama.embed(model=EMBEDDING_MODEL, input=batch)
        embeddings.extend(response["embeddings"])
        if on_batch is not None:
            on_batch(len(batch))
    return embeddings


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]


def chat_messages(messages: list[dict]) -> str:
    response = ollama.chat(
        model=GENERATION_MODEL,
        messages=messages,
        options={"num_ctx": NUM_CTX},
    )
    return response["message"]["content"]
