# private_context/

Drop non-public details about the specific system being assessed here — the
kind of information that can't be published (architecture specifics,
internal tooling, configuration details) but that a response needs in order
to be accurate rather than generic. `srg generate` retrieves from this folder
alongside `--context` freeform notes passed on the command line.

This folder is gitignored (except this file and `.gitkeep`) and its contents
never leave your machine — they aren't sent anywhere except to the locally
running Ollama model.

Supported formats: `.pdf`, `.md`, `.txt`.

After adding or changing files here, run:

```bash
srg ingest --source private_context
```
