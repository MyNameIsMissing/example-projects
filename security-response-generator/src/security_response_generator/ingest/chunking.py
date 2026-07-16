"""Split loaded document text into overlapping, structure-aware chunks."""

import re
from dataclasses import dataclass, field

from security_response_generator.config import (
    CHUNK_OVERLAP_CHARS,
    CHUNK_SIZE_CHARS,
    CONTROL_ID_PATTERN,
)

_CONTROL_ID_RE = re.compile(CONTROL_ID_PATTERN)
_PARAGRAPH_SPLIT_RE = re.compile(r"\n\s*\n")


@dataclass
class Chunk:
    text: str
    chunk_index: int
    control_ids: list[str] = field(default_factory=list)


def chunk_text(
    text: str, chunk_size: int = CHUNK_SIZE_CHARS, overlap: int = CHUNK_OVERLAP_CHARS
) -> list[Chunk]:
    """Chunk text on paragraph boundaries where possible, falling back to a
    sliding window only for paragraphs that individually exceed chunk_size.
    """
    paragraphs = [p.strip() for p in _PARAGRAPH_SPLIT_RE.split(text) if p.strip()]
    if not paragraphs:
        return []

    raw_chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        candidate = f"{current}\n\n{paragraph}" if current else paragraph

        if len(candidate) <= chunk_size:
            current = candidate
            continue

        if current:
            raw_chunks.append(current)
            current = _tail(current, overlap)

        if len(paragraph) <= chunk_size:
            current = f"{current}\n\n{paragraph}" if current else paragraph
        else:
            for window in _sliding_window(paragraph, chunk_size, overlap):
                raw_chunks.append(window)
            current = ""

    if current:
        raw_chunks.append(current)

    return [
        Chunk(
            text=chunk_value,
            chunk_index=index,
            control_ids=sorted(set(_CONTROL_ID_RE.findall(chunk_value))),
        )
        for index, chunk_value in enumerate(raw_chunks)
    ]


def _tail(text: str, overlap: int) -> str:
    if overlap <= 0 or len(text) <= overlap:
        return text
    return text[-overlap:]


def _sliding_window(text: str, size: int, overlap: int):
    step = max(size - overlap, 1)
    for start in range(0, len(text), step):
        window = text[start : start + size]
        if window:
            yield window
        if start + size >= len(text):
            break
