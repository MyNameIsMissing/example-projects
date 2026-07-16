"""Retrieve relevant chunks per source tier for a given control ID + query."""

from dataclasses import dataclass

from security_response_generator import config
from security_response_generator.llm.ollama_client import embed_query


@dataclass
class RetrievedChunk:
    text: str
    source_path: str
    chunk_id: str


@dataclass
class RetrievalResult:
    customer_chunks: list[RetrievedChunk]
    baseline_chunks: list[RetrievedChunk]
    private_chunks: list[RetrievedChunk]

    @property
    def has_baseline_match(self) -> bool:
        return bool(self.baseline_chunks)

    @property
    def has_customer_match(self) -> bool:
        return bool(self.customer_chunks)


def to_chunks(query_result: dict) -> list[RetrievedChunk]:
    """Convert a raw Chroma `collection.query(...)` result (single-query shape) to chunks."""
    ids = query_result.get("ids", [[]])[0]
    documents = query_result.get("documents", [[]])[0]
    metadatas = query_result.get("metadatas", [[]])[0]
    return [
        RetrievedChunk(
            text=text,
            source_path=(metadata or {}).get("source_path", ""),
            chunk_id=chunk_id,
        )
        for chunk_id, text, metadata in zip(ids, documents, metadatas)
    ]


def merge_results(
    primary: list[RetrievedChunk], secondary: list[RetrievedChunk], top_k: int
) -> list[RetrievedChunk]:
    """Merge two ranked chunk lists, primary first, deduped by chunk_id, capped at top_k."""
    seen: set[str] = set()
    merged: list[RetrievedChunk] = []
    for chunk in (*primary, *secondary):
        if chunk.chunk_id in seen:
            continue
        seen.add(chunk.chunk_id)
        merged.append(chunk)
        if len(merged) >= top_k:
            break
    return merged


def _query_collection(
    collection, control_id: str, query_embedding, top_k: int
) -> list[RetrievedChunk]:
    metadata_pass = _safe_query(
        collection, query_embedding, top_k, where_document={"$contains": control_id}
    )
    semantic_pass = _safe_query(collection, query_embedding, top_k)
    return merge_results(metadata_pass, semantic_pass, top_k)


def _safe_query(
    collection, query_embedding, top_k: int, where_document=None
) -> list[RetrievedChunk]:
    kwargs = {"query_embeddings": [query_embedding], "n_results": top_k}
    if where_document:
        kwargs["where_document"] = where_document
    try:
        result = collection.query(**kwargs)
    except Exception:
        return []
    return to_chunks(result)


def retrieve_for_control(control_id: str, context_notes: str, collections: dict) -> RetrievalResult:
    query_text = f"{control_id} {context_notes}".strip()
    query_embedding = embed_query(query_text)

    customer_chunks = _query_collection(
        collections[config.COLLECTION_CUSTOMER_STANDARDS],
        control_id,
        query_embedding,
        config.TOP_K_CUSTOMER_STANDARDS,
    )
    baseline_chunks = _query_collection(
        collections[config.COLLECTION_KNOWLEDGE_BASE],
        control_id,
        query_embedding,
        config.TOP_K_KNOWLEDGE_BASE,
    )
    private_chunks = _query_collection(
        collections[config.COLLECTION_PRIVATE_CONTEXT],
        control_id,
        query_embedding,
        config.TOP_K_PRIVATE_CONTEXT,
    )

    return RetrievalResult(
        customer_chunks=customer_chunks,
        baseline_chunks=baseline_chunks,
        private_chunks=private_chunks,
    )
