from security_response_generator.generation.prompt import (
    BASELINE_LABEL,
    CUSTOMER_LABEL,
    FOLLOWUP_INSTRUCTION,
    MARKDOWN_FORMAT_INSTRUCTION,
    PRIVATE_LABEL,
    TEXT_FORMAT_INSTRUCTION,
    OutputFormat,
    assemble_prompt,
    extract_followup_question,
)
from security_response_generator.generation.retrieval import RetrievedChunk


def _chunk(text: str, path: str = "doc.md", chunk_id: str = "doc.md::0") -> RetrievedChunk:
    return RetrievedChunk(text=text, source_path=path, chunk_id=chunk_id)


def test_prompt_includes_all_sections_in_order_when_all_tiers_present():
    prompt = assemble_prompt(
        instructions="SYSTEM INSTRUCTIONS",
        control_id="SI-5",
        context_notes="uses a SaaS SIEM",
        customer_chunks=[_chunk("state standard text")],
        baseline_chunks=[_chunk("nist baseline text")],
        private_chunks=[_chunk("private system text")],
    )

    assert prompt.system == "SYSTEM INSTRUCTIONS"
    assert prompt.user.index(CUSTOMER_LABEL) < prompt.user.index(BASELINE_LABEL)
    assert prompt.user.index(BASELINE_LABEL) < prompt.user.index(PRIVATE_LABEL)
    assert "state standard text" in prompt.user
    assert "nist baseline text" in prompt.user
    assert "private system text" in prompt.user
    assert "Control ID: SI-5" in prompt.user
    assert "uses a SaaS SIEM" in prompt.user


def test_prompt_omits_customer_and_private_sections_when_absent():
    prompt = assemble_prompt(
        instructions="SYSTEM INSTRUCTIONS",
        control_id="SI-5",
        context_notes="",
        customer_chunks=[],
        baseline_chunks=[_chunk("nist baseline text")],
        private_chunks=[],
    )

    assert CUSTOMER_LABEL not in prompt.user
    assert PRIVATE_LABEL not in prompt.user
    assert BASELINE_LABEL in prompt.user
    assert "Analyst notes:" not in prompt.user


def test_prompt_always_includes_baseline_label_even_if_empty():
    prompt = assemble_prompt(
        instructions="SYSTEM INSTRUCTIONS",
        control_id="AC-2",
        context_notes="",
        customer_chunks=[],
        baseline_chunks=[],
        private_chunks=[],
    )

    assert BASELINE_LABEL in prompt.user


def test_default_format_is_markdown_instruction():
    prompt = assemble_prompt(
        instructions="SYSTEM INSTRUCTIONS",
        control_id="AC-2",
        context_notes="",
        customer_chunks=[],
        baseline_chunks=[_chunk("nist baseline text")],
        private_chunks=[],
    )

    assert MARKDOWN_FORMAT_INSTRUCTION in prompt.user
    assert TEXT_FORMAT_INSTRUCTION not in prompt.user


def test_text_format_uses_plain_ascii_instruction():
    prompt = assemble_prompt(
        instructions="SYSTEM INSTRUCTIONS",
        control_id="AC-2",
        context_notes="",
        customer_chunks=[],
        baseline_chunks=[_chunk("nist baseline text")],
        private_chunks=[],
        output_format=OutputFormat.text,
    )

    assert TEXT_FORMAT_INSTRUCTION in prompt.user
    assert MARKDOWN_FORMAT_INSTRUCTION not in prompt.user


def test_followup_instruction_present_regardless_of_format():
    markdown_prompt = assemble_prompt(
        instructions="SYSTEM INSTRUCTIONS",
        control_id="AC-2",
        context_notes="",
        customer_chunks=[],
        baseline_chunks=[_chunk("nist baseline text")],
        private_chunks=[],
    )
    text_prompt = assemble_prompt(
        instructions="SYSTEM INSTRUCTIONS",
        control_id="AC-2",
        context_notes="",
        customer_chunks=[],
        baseline_chunks=[_chunk("nist baseline text")],
        private_chunks=[],
        output_format=OutputFormat.text,
    )

    assert FOLLOWUP_INSTRUCTION in markdown_prompt.user
    assert FOLLOWUP_INSTRUCTION in text_prompt.user


def test_extract_followup_question_parses_marker():
    assert extract_followup_question("NEEDS_INFO: what SIEM do you use?") == (
        "what SIEM do you use?"
    )


def test_extract_followup_question_strips_surrounding_whitespace():
    assert extract_followup_question("  \nNEEDS_INFO:   what SIEM do you use?  \n") == (
        "what SIEM do you use?"
    )


def test_extract_followup_question_returns_none_for_final_answer():
    assert extract_followup_question("# SI-5\n\nThis control is met by...") is None


def test_extract_followup_question_requires_marker_at_start():
    assert extract_followup_question("The response mentions NEEDS_INFO: elsewhere") is None
