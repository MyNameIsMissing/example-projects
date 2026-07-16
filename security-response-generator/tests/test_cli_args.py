from typer.testing import CliRunner

from security_response_generator import cli
from security_response_generator.generation.prompt import (
    FORCED_COMPLETION_INSTRUCTION,
    AssembledPrompt,
)
from security_response_generator.generation.retrieval import RetrievalResult, RetrievedChunk
from security_response_generator.ingest.chunking import Chunk

runner = CliRunner()


def _baseline_chunk(chunk_id: str = "doc.md::0") -> RetrievedChunk:
    return RetrievedChunk(text="baseline text", source_path="doc.md", chunk_id=chunk_id)


def _patch_common(
    monkeypatch, retrieval_result: RetrievalResult, chat_return: str = "response text"
):
    monkeypatch.setattr(cli, "get_client", lambda: object())
    monkeypatch.setattr(cli, "get_collection", lambda client, name: object())
    monkeypatch.setattr(
        cli,
        "retrieve_for_control",
        lambda control_id, context, collections: retrieval_result,
    )
    monkeypatch.setattr(cli, "chat_messages", lambda messages: chat_return)


def test_generate_refuses_when_no_baseline_match(monkeypatch):
    result_obj = RetrievalResult(customer_chunks=[], baseline_chunks=[], private_chunks=[])
    _patch_common(monkeypatch, result_obj)
    chat_called = {"value": False}
    monkeypatch.setattr(cli, "chat_messages", lambda *a: chat_called.__setitem__("value", True))

    result = runner.invoke(cli.app, ["generate", "ZZ-99"])

    assert result.exit_code == 1
    assert "No matching NIST baseline content found" in result.output
    assert chat_called["value"] is False


def test_generate_prints_response_and_writes_output_file(monkeypatch, tmp_path):
    result_obj = RetrievalResult(
        customer_chunks=[], baseline_chunks=[_baseline_chunk()], private_chunks=[]
    )
    _patch_common(monkeypatch, result_obj, chat_return="# SI-5\nGenerated response")
    output_file = tmp_path / "response.md"

    result = runner.invoke(
        cli.app, ["generate", "SI-5", "--context", "notes", "-o", str(output_file)]
    )

    assert result.exit_code == 0
    assert "Generated response" in result.stdout
    assert output_file.read_text() == "# SI-5\nGenerated response"


def test_generate_without_output_flag_does_not_require_file(monkeypatch):
    result_obj = RetrievalResult(
        customer_chunks=[], baseline_chunks=[_baseline_chunk()], private_chunks=[]
    )
    _patch_common(monkeypatch, result_obj, chat_return="response text")

    result = runner.invoke(cli.app, ["generate", "SI-5"])

    assert result.exit_code == 0
    assert "response text" in result.stdout


def test_generate_text_format_normalizes_output(monkeypatch):
    result_obj = RetrievalResult(
        customer_chunks=[], baseline_chunks=[_baseline_chunk()], private_chunks=[]
    )
    _patch_common(monkeypatch, result_obj, chat_return="## SI-5\n\n“Quoted” response — done.")

    result = runner.invoke(cli.app, ["generate", "SI-5", "--format", "text"])

    assert result.exit_code == 0
    assert "SI-5" in result.stdout
    assert '"Quoted" response - done.' in result.stdout
    assert "#" not in result.stdout
    assert all(ord(c) < 128 for c in result.stdout if c != "\n")


def test_generate_markdown_format_is_default_and_unmodified(monkeypatch):
    result_obj = RetrievalResult(
        customer_chunks=[], baseline_chunks=[_baseline_chunk()], private_chunks=[]
    )
    _patch_common(monkeypatch, result_obj, chat_return="## SI-5\n\n“Quoted” response.")

    result = runner.invoke(cli.app, ["generate", "SI-5"])

    assert result.exit_code == 0
    assert "## SI-5" in result.stdout
    assert "“Quoted”" in result.stdout


def test_generate_text_format_default_output_filename_uses_txt_extension(monkeypatch, tmp_path):
    result_obj = RetrievalResult(
        customer_chunks=[], baseline_chunks=[_baseline_chunk()], private_chunks=[]
    )
    _patch_common(monkeypatch, result_obj, chat_return="response text")

    result = runner.invoke(cli.app, ["generate", "SI-5", "--format", "text", "-o", str(tmp_path)])

    assert result.exit_code == 0
    written_files = list(tmp_path.glob("SI-5_*.txt"))
    assert len(written_files) == 1


def test_generate_markdown_format_default_output_filename_uses_md_extension(monkeypatch, tmp_path):
    result_obj = RetrievalResult(
        customer_chunks=[], baseline_chunks=[_baseline_chunk()], private_chunks=[]
    )
    _patch_common(monkeypatch, result_obj, chat_return="response text")

    result = runner.invoke(cli.app, ["generate", "SI-5", "-o", str(tmp_path)])

    assert result.exit_code == 0
    written_files = list(tmp_path.glob("SI-5_*.md"))
    assert len(written_files) == 1


def _prompt() -> AssembledPrompt:
    return AssembledPrompt(system="SYSTEM", user="USER")


def test_run_conversation_returns_immediately_when_no_followup_needed(monkeypatch):
    calls = []

    def fake_chat_messages(messages):
        calls.append(list(messages))
        return "# SI-5\n\nFinal response."

    monkeypatch.setattr(cli, "chat_messages", fake_chat_messages)

    result = cli._run_conversation(_prompt())

    assert result == "# SI-5\n\nFinal response."
    assert len(calls) == 1


def test_run_conversation_asks_once_then_returns_final_answer(monkeypatch, tmp_path):
    replies = iter(
        [
            "NEEDS_INFO: what SIEM do you use?",
            "# SI-5\n\nFinal response using Acme Sentinel.",
        ]
    )
    calls = []

    def fake_chat_messages(messages):
        calls.append(list(messages))
        return next(replies)

    monkeypatch.setattr(cli, "chat_messages", fake_chat_messages)
    monkeypatch.setattr(cli.typer, "prompt", lambda _: "Acme Sentinel")

    result = cli._run_conversation(_prompt())

    assert result == "# SI-5\n\nFinal response using Acme Sentinel."
    assert len(calls) == 2
    # second call's message history includes the question and the analyst's answer
    assert calls[1][-2] == {
        "role": "assistant",
        "content": "NEEDS_INFO: what SIEM do you use?",
    }
    assert calls[1][-1] == {"role": "user", "content": "Acme Sentinel"}


def test_run_conversation_forces_completion_when_budget_exhausted(monkeypatch):
    monkeypatch.setattr(cli.config, "MAX_FOLLOWUP_TURNS", 2)

    replies = iter(
        [
            "NEEDS_INFO: what SIEM do you use?",
            "NEEDS_INFO: how often is it reviewed?",
            "NEEDS_INFO: even more detail please",
            "# SI-5\n\nBest-effort response. [PLACEHOLDER: need details on X]",
        ]
    )
    chat_call_count = {"value": 0}
    prompt_call_count = {"value": 0}

    def fake_chat_messages(messages):
        chat_call_count["value"] += 1
        return next(replies)

    def fake_prompt(_):
        prompt_call_count["value"] += 1
        return "an answer"

    monkeypatch.setattr(cli, "chat_messages", fake_chat_messages)
    monkeypatch.setattr(cli.typer, "prompt", fake_prompt)

    result = cli._run_conversation(_prompt())

    assert result == "# SI-5\n\nBest-effort response. [PLACEHOLDER: need details on X]"
    # 2 answered questions + 1 that trips the budget + 1 forced-completion call
    assert chat_call_count["value"] == 4
    # only the 2 budgeted questions were asked interactively
    assert prompt_call_count["value"] == 2


def test_run_conversation_forced_completion_message_included_in_final_call(monkeypatch):
    monkeypatch.setattr(cli.config, "MAX_FOLLOWUP_TURNS", 0)
    replies = iter(
        [
            "NEEDS_INFO: what SIEM do you use?",
            "# SI-5\n\nBest-effort response with placeholder.",
        ]
    )
    calls = []

    def fake_chat_messages(messages):
        calls.append(list(messages))
        return next(replies)

    monkeypatch.setattr(cli, "chat_messages", fake_chat_messages)

    result = cli._run_conversation(_prompt())

    assert result == "# SI-5\n\nBest-effort response with placeholder."
    assert len(calls) == 2
    assert calls[1][-1] == {"role": "user", "content": FORCED_COMPLETION_INSTRUCTION}


def test_ingest_rejects_unknown_source():
    result = runner.invoke(cli.app, ["ingest", "--source", "bogus"])

    assert result.exit_code == 1
    assert "Unknown source" in result.output


def test_ingest_all_calls_ingest_source_for_each_collection(monkeypatch, tmp_path):
    calls = []
    monkeypatch.setattr(cli, "get_client", lambda: object())
    monkeypatch.setattr(cli, "_ingest_source", lambda client, name, manifest: calls.append(name))
    monkeypatch.setattr(cli.config, "MANIFEST_PATH", tmp_path / "manifest.json")

    result = runner.invoke(cli.app, ["ingest"])

    assert result.exit_code == 0
    assert set(calls) == set(cli.config.SOURCE_DIRS)


def test_ingest_single_source_only_calls_that_collection(monkeypatch, tmp_path):
    calls = []
    monkeypatch.setattr(cli, "get_client", lambda: object())
    monkeypatch.setattr(cli, "_ingest_source", lambda client, name, manifest: calls.append(name))
    monkeypatch.setattr(cli.config, "MANIFEST_PATH", tmp_path / "manifest.json")

    result = runner.invoke(cli.app, ["ingest", "--source", "private_context"])

    assert result.exit_code == 0
    assert calls == ["private_context"]


def test_upsert_with_progress_calls_upsert_chunks_with_working_callback(monkeypatch):
    captured = {}

    def fake_upsert_chunks(collection, relative_path, collection_name, chunks, on_batch=None):
        captured["args"] = (collection, relative_path, collection_name, chunks)
        if on_batch is not None:
            on_batch(len(chunks))  # simulate a single batch completing

    monkeypatch.setattr(cli, "upsert_chunks", fake_upsert_chunks)

    chunks = [Chunk(text="a", chunk_index=0), Chunk(text="b", chunk_index=1)]
    cli._upsert_with_progress("fake-collection", "doc.md", "knowledge_base", chunks)

    assert captured["args"] == ("fake-collection", "doc.md", "knowledge_base", chunks)


def test_upsert_with_progress_no_op_for_empty_chunks(monkeypatch):
    def fake_upsert_chunks(*args, **kwargs):
        raise AssertionError("should not be called for empty chunks")

    monkeypatch.setattr(cli, "upsert_chunks", fake_upsert_chunks)

    cli._upsert_with_progress("fake-collection", "doc.md", "knowledge_base", [])
