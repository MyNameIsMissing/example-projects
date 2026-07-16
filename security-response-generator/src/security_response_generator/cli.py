"""Command-line interface for security-response-generator."""

from datetime import date
from pathlib import Path

import typer
from rich.console import Console
from rich.progress import BarColumn, MofNCompleteColumn, Progress, TextColumn, TimeElapsedColumn

from security_response_generator import config
from security_response_generator.generation.formatting import normalize_to_ascii
from security_response_generator.generation.prompt import (
    FORCED_COMPLETION_INSTRUCTION,
    AssembledPrompt,
    OutputFormat,
    assemble_prompt,
    extract_followup_question,
)
from security_response_generator.generation.retrieval import retrieve_for_control
from security_response_generator.ingest import loaders
from security_response_generator.ingest import manifest as manifest_module
from security_response_generator.ingest.chunking import chunk_text
from security_response_generator.ingest.store import (
    delete_source,
    get_client,
    get_collection,
    upsert_chunks,
)
from security_response_generator.llm.ollama_client import chat_messages

app = typer.Typer(help="Local RAG CLI for drafting security control responses.")
console = Console(stderr=True)


@app.command()
def ingest(
    source: str = typer.Option(
        "all",
        help=(
            "Which source tier to ingest: knowledge_base, customer_standards, "
            "private_context, or all."
        ),
    ),
    rebuild: bool = typer.Option(
        False,
        "--rebuild",
        help="Wipe all collections and the manifest, then re-ingest everything from scratch.",
    ),
) -> None:
    """Ingest documents from the source folders into the local vector store."""
    if source == "all":
        collection_names = list(config.SOURCE_DIRS)
    elif source in config.SOURCE_DIRS:
        collection_names = [source]
    else:
        typer.echo(f"Unknown source: {source}", err=True)
        raise typer.Exit(code=1)

    client = get_client()

    if rebuild:
        for name in config.SOURCE_DIRS:
            client.delete_collection(name=name)
        if config.MANIFEST_PATH.exists():
            config.MANIFEST_PATH.unlink()

    manifest = manifest_module.load_manifest(config.MANIFEST_PATH)

    for name in collection_names:
        _ingest_source(client, name, manifest)

    manifest_module.save_manifest(config.MANIFEST_PATH, manifest)


def _ingest_source(client, collection_name: str, manifest: dict) -> None:
    source_dir = config.SOURCE_DIRS[collection_name]
    collection = get_collection(client, collection_name)
    prefix = f"{collection_name}/"

    current_files = {
        str(path.relative_to(source_dir)): manifest_module.compute_hash(path)
        for path in loaders.iter_source_files(source_dir)
    }
    previous_files = {
        key[len(prefix) :]: digest for key, digest in manifest.items() if key.startswith(prefix)
    }

    changed, _unchanged, deleted = manifest_module.diff_manifest(previous_files, current_files)

    for relative_path in deleted:
        delete_source(collection, relative_path)
        manifest.pop(f"{prefix}{relative_path}", None)

    for relative_path in changed:
        full_path = source_dir / relative_path
        delete_source(collection, relative_path)
        document = loaders.load_document(full_path, source_dir)
        chunks = chunk_text(document.text)
        _upsert_with_progress(collection, relative_path, collection_name, chunks)
        manifest[f"{prefix}{relative_path}"] = current_files[relative_path]

    typer.echo(f"{collection_name}: {len(changed)} file(s) (re)embedded, {len(deleted)} removed")


def _upsert_with_progress(collection, relative_path: str, collection_name: str, chunks) -> None:
    """Embed and store chunks for one file, showing a progress bar for large files."""
    if not chunks:
        return
    with Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task(f"Processing {relative_path}...", total=len(chunks))
        upsert_chunks(
            collection,
            relative_path,
            collection_name,
            chunks,
            on_batch=lambda count: progress.advance(task, count),
        )


@app.command()
def generate(
    control_id: str = typer.Argument(..., help="Control ID, e.g. SI-5"),
    context: str = typer.Option(
        "", "--context", help="Freeform notes about this specific control/system."
    ),
    output_format: OutputFormat = typer.Option(
        OutputFormat.markdown,
        "--format",
        help=(
            "Output format: markdown (default) or text (plain ASCII, no Markdown syntax "
            "or special characters -- for evidence/GRC systems that reject formatting)."
        ),
    ),
    output: Path = typer.Option(
        None, "-o", "--output", help="Also write the response to this file or directory."
    ),
) -> None:
    """Generate a security control response grounded in the local knowledge base."""
    client = get_client()
    collections = {name: get_collection(client, name) for name in config.SOURCE_DIRS}

    result = retrieve_for_control(control_id, context, collections)

    if not result.has_baseline_match:
        typer.echo(
            f"No matching NIST baseline content found for control ID '{control_id}' — "
            "check the ID or run `srg ingest`.",
            err=True,
        )
        raise typer.Exit(code=1)

    instructions = config.INSTRUCTIONS_PATH.read_text(encoding="utf-8")
    prompt = assemble_prompt(
        instructions=instructions,
        control_id=control_id,
        context_notes=context,
        customer_chunks=result.customer_chunks,
        baseline_chunks=result.baseline_chunks,
        private_chunks=result.private_chunks,
        output_format=output_format,
    )

    response_text = _run_conversation(prompt)

    if output_format == OutputFormat.text:
        response_text = normalize_to_ascii(response_text)

    typer.echo()
    typer.echo(response_text)

    if output is not None:
        target = output
        if target.is_dir():
            extension = "txt" if output_format == OutputFormat.text else "md"
            target = target / f"{control_id}_{date.today():%Y%m%d}.{extension}"
        write_encoding = "ascii" if output_format == OutputFormat.text else "utf-8"
        target.write_text(response_text, encoding=write_encoding)
        typer.echo(f"Written to {target}", err=True)


def _wait_for_model(messages: list[dict], label: str = "Thinking...") -> str:
    """Call chat_messages with a spinner so a multi-minute wait doesn't look hung."""
    with console.status(label):
        return chat_messages(messages)


def _run_conversation(prompt: AssembledPrompt) -> str:
    """Run the generation call, handling up to config.MAX_FOLLOWUP_TURNS
    interactive clarifying questions before returning the final response.

    If the model still hasn't produced a final answer once the follow-up
    budget is exhausted, one last forced-completion call is made and its
    result is returned unconditionally (best-effort response with
    placeholders for whatever couldn't be addressed).
    """
    messages = [
        {"role": "system", "content": prompt.system},
        {"role": "user", "content": prompt.user},
    ]
    followups_remaining = config.MAX_FOLLOWUP_TURNS

    while True:
        reply = _wait_for_model(messages)
        question = extract_followup_question(reply)
        if question is None:
            return reply

        messages.append({"role": "assistant", "content": reply})

        if followups_remaining <= 0:
            messages.append({"role": "user", "content": FORCED_COMPLETION_INSTRUCTION})
            return _wait_for_model(messages, "Wrapping up...")

        typer.echo(f"\n{question}\n")
        answer = typer.prompt("Your answer")
        messages.append({"role": "user", "content": answer})
        followups_remaining -= 1


if __name__ == "__main__":
    app()
