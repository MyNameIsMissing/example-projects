"""Assemble the final prompt sent to the generation model."""

import enum
from dataclasses import dataclass

from security_response_generator.generation.retrieval import RetrievedChunk

CUSTOMER_LABEL = "--- Customer/State Standard (Authoritative) ---"
BASELINE_LABEL = "--- NIST 800-53 Baseline ---"
PRIVATE_LABEL = "--- System-Specific Context ---"


class OutputFormat(enum.StrEnum):
    markdown = "markdown"
    text = "text"


MARKDOWN_FORMAT_INSTRUCTION = (
    "Respond only in valid Markdown, but keep it minimal: a single '# <Control ID>' "
    "heading followed by plain narrative paragraphs, and nothing else. Do not use "
    "tables, bullet or numbered lists, multiple subheadings, bold status labels, or a "
    "separate summary/conclusion section -- this text goes directly into a GRC tool's "
    "response field as the control implementation narrative, not a formatted audit "
    "report. Do not include commentary outside the response itself."
)

TEXT_FORMAT_INSTRUCTION = (
    "Respond only in plain ASCII text. Do not use any Markdown syntax (no #, *, _, "
    "backticks, tables, or bullet symbols), smart quotes, em-dashes, or any non-ASCII "
    "characters. Use a plain capitalized line with the control ID as a heading, followed "
    "by plain narrative paragraphs, and nothing else -- no tables (including ASCII-art "
    "tables built from dashes/pipes), no bullet or numbered lists, no separate "
    "summary/conclusion section. Do not include commentary outside the response itself."
)

_FORMAT_INSTRUCTIONS = {
    OutputFormat.markdown: MARKDOWN_FORMAT_INSTRUCTION,
    OutputFormat.text: TEXT_FORMAT_INSTRUCTION,
}

FOLLOWUP_MARKER = "NEEDS_INFO:"

FOLLOWUP_INSTRUCTION = (
    "If completing this response requires information not covered by the material "
    "above or the analyst's notes -- and the gap concerns a distinct, material part "
    "of the control rather than a minor stylistic detail -- you may ask for it "
    "instead of writing the response. To do so, reply with exactly one line: "
    '"NEEDS_INFO: <your specific question>" and nothing else. Ask only one focused '
    "question at a time. If you have enough information, skip this and write the "
    "full response following the rules above."
)

FORCED_COMPLETION_INSTRUCTION = (
    "You have reached the limit of follow-up questions for this session. Do not ask "
    "any further questions -- write your final response now using only the "
    "information gathered so far. For any distinct part of the control you still "
    "cannot address with confidence, insert a clearly marked placeholder in the text "
    '(for example: "[PLACEHOLDER: need details on ...]") instead of guessing or '
    "inventing details. Open the response with a brief, polite note that some "
    "information was not available and that placeholder(s) were left for the analyst "
    "to fill in before this response is submitted to the assessor."
)


def extract_followup_question(reply: str) -> str | None:
    """Return the question text if `reply` is a NEEDS_INFO request, else None."""
    stripped = reply.strip()
    if stripped.startswith(FOLLOWUP_MARKER):
        return stripped[len(FOLLOWUP_MARKER) :].strip()
    return None


@dataclass
class AssembledPrompt:
    system: str
    user: str


def assemble_prompt(
    instructions: str,
    control_id: str,
    context_notes: str,
    customer_chunks: list[RetrievedChunk],
    baseline_chunks: list[RetrievedChunk],
    private_chunks: list[RetrievedChunk],
    output_format: OutputFormat = OutputFormat.markdown,
) -> AssembledPrompt:
    sections: list[str] = []

    if customer_chunks:
        sections.append(CUSTOMER_LABEL)
        sections.extend(chunk.text for chunk in customer_chunks)

    sections.append(BASELINE_LABEL)
    sections.extend(chunk.text for chunk in baseline_chunks)

    if private_chunks:
        sections.append(PRIVATE_LABEL)
        sections.extend(chunk.text for chunk in private_chunks)

    sections.append(f"Control ID: {control_id}")
    if context_notes:
        sections.append(f"Analyst notes: {context_notes}")
    sections.append(FOLLOWUP_INSTRUCTION)
    sections.append(_FORMAT_INSTRUCTIONS[output_format])

    return AssembledPrompt(system=instructions, user="\n\n".join(sections))
