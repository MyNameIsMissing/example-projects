# Security Response Generator

A local, offline CLI that drafts security control responses (e.g.
NIST 800-53 controls like "SI-5") for a compliance assessor to review, using
retrieval-augmented generation (RAG) grounded in three tiers of source
material. Output can be Markdown or plain ASCII text, depending on what the
target system of record accepts:

1. **NIST 800-53 rev5 baseline** — the most typical control catalog.  If your customer uses something different like PCI-DSS, HIPAA, or ISO/IEC 27001:2022 you'll need to refactor a number of things in this tool.
2. **Customer/state-specific standards** — e.g. a state's published
   per-control guidance with state-specific parameter values. When present
   for a control, this is treated as **authoritative** over generic NIST
   language.  Its content must match the control catalog IDs.  
3. **Private system context** — non-public specifics about the system being
   assessed, supplied via a standing document `[../private_context/yourfile.md]` plus freeform context notes per query.

Everything runs locally: embeddings and generation both go through
[Ollama](https://ollama.com), and retrieval uses an embedded
[ChromaDB](https://www.trychroma.com) instance (a folder on disk, no server
process). Nothing is sent to a third-party.

## Features

- Three-tier retrieval that respects customer/state standards as
  authoritative when they exist, and explicitly flags when they don't.
- Runs on U.S.-developed, open-weight models (Llama 3.1 8B by default; see
  [Choosing a generation model](#choosing-a-generation-model)) rather than a
  closed-source or overseas API
- Refuses to answer (rather than hallucinate) if a control ID has no match
  in the NIST baseline
    - This is a dedicated **tool**, NOT a general chatbot
- Interactive follow-up questions when a material part of the control isn't
  covered by the supplied context, up to a configurable round limit, with a
  best-effort placeholder-annotated response if the model still isn't done
- Incremental ingestion — only re-embeds files that changed
- Markdown or plain ASCII text output (`--format`), printed to stdout and
  optionally written to a file — plain text is enforced in code, not just by
  prompt instruction, for evidence/GRC systems that reject any formatting or
  non-ASCII characters

## Caveats

- The ingest processor is VERY tailored to the existing NIST SP 800-53 rev 5 PDF content included in this project.  If you replace that file with different but similar content, perhaps due to an update by NIST, or using a customer proprietery catalog, the assistant may not properly track control ID content vs ancillary content (Appendix C, etc.), resulting in significant deviation from the anticipated response output.  

## Technology Stack

- **Language**: Python
- **Generation model**: [Llama 3.1 8B](https://ollama.com/library/llama3.1)
  via [Ollama](https://ollama.com) by default — a dense, text-only model
  that reliably stays grounded on the specific control ID being asked
  about, while still fitting comfortably in 12GB of VRAM alongside the
  embedding model. Swappable via `SRG_GEN_MODEL` -- see
  [Choosing a generation model](#choosing-a-generation-model) for smaller
  and larger alternatives and the tradeoffs found in practice.
- **Embedding model**: EmbeddingGemma via Ollama
- **Vector store**: ChromaDB (embedded/local, no server)
- **CLI**: [Typer](https://typer.tiangolo.com)

## Prerequisites

- Permission from your customer to use this tool.  Different customers have very different AI permissions models.  
- Python 3.11+
- [Ollama](https://ollama.com/download) installed, with the daemon running
- A modest amount of VRAM or unified memory for `llama3.1:8b` (~4.9GB
  download, ~7GB of VRAM once loaded alongside `embeddinggemma`) -- fits
  comfortably on a 12GB card. See
  [Choosing a generation model](#choosing-a-generation-model) for smaller
  options if your hardware is more constrained, or larger ones if you have
  VRAM to spare.

## Installation

1. **Run the setup script (recommended)**:
   
   Clone the repo to your local system, then
   ```bash
   cd security-response-generator
   ./setup.sh
   ```
   This creates a `.venv`, installs the package in editable mode, checks
   that Ollama is installed and running, and pulls both models
   (`llama3.1:8b`, `embeddinggemma`).

2. **Manual installation (alternative)**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -e ".[dev]"
   ollama pull llama3.1:8b
   ollama pull embeddinggemma
   ```

## Choosing a generation model

The default, `llama3.1:8b`, was picked after directly comparing it
side-by-side against smaller and larger alternatives on this exact tool,
not just on paper. The thing that actually matters for this workload isn't
raw benchmark scores -- it's whether the model reliably stays locked onto
the *specific control ID* it was asked about, using only the material
retrieved for that control. In repeated testing, `llama3.1:8b` did; smaller
models sometimes didn't (see below). It's also a plain dense, text-only
model (no vision/audio encoders to load), so its ~7GB resident footprint
(Q4_K_M) coexists comfortably with `embeddinggemma` on a 12GB card without
the evict-and-reload cycling that tighter-fitting models can trigger on
every `srg generate` call (see the "Responses are much slower than
expected" entry in [Troubleshooting](#troubleshooting) for what that
looks like).

If your hardware is more constrained, **[Phi-4-mini](https://ollama.com/library/phi4-mini)**
(Microsoft) is smaller (~3.8B parameters, ~2.5GB download) and loads even
faster. Be aware of the tradeoff found in testing, though: it noticeably
drifted off the requested control ID more often than `llama3.1:8b` --
answering under the wrong control heading entirely, or letting unrelated
material (e.g. from `private_context`) bleed into the response -- even once
retrieval was confirmed to be feeding it clean, on-topic material for the
right control. That's a model-capability gap, not a retrieval bug. Prefer
`llama3.1:8b` if your hardware can fit it; treat `phi4-mini` as a
speed/VRAM tradeoff you're consciously accepting, not a drop-in equivalent.

If you have significantly more VRAM available (roughly 10GB+),
**[Gemma 4 E4B](https://ollama.com/library/gemma4)** (Google) is also an
option -- larger and potentially more capable, but multimodal (it bundles
vision/audio encoders this tool never uses), which adds load-time overhead
and made it prone to VRAM-eviction cycling on a 12GB card in testing, since
its footprint sits right at the edge of what's available alongside
`embeddinggemma`.

Switch models with the `SRG_GEN_MODEL` environment variable -- no code
changes needed, since `srg` talks to Ollama's generic chat API regardless
of which model is behind it:

```bash
ollama pull phi4-mini
SRG_GEN_MODEL=phi4-mini srg generate SI-5 --context "..."
```

To make a switch permanent for your own sessions, export `SRG_GEN_MODEL` in
`start.sh` (see [Usage](#usage) below) or your shell profile. The
interactive follow-up-question feature (see
[Interactive follow-up questions](#interactive-follow-up-questions)) is
enforced via Ollama's structured-output/JSON-schema support, not by asking
the model to nicely follow a formatting convention -- so it stays reliable
regardless of which generation model you pick, including smaller/leaner
ones that are otherwise less rigorous about following instructions.

The embedding model (`embeddinggemma`) is a separate, much smaller model
used only for retrieval, and typically doesn't need to change when you swap
the generation model.

### Using a customer-approved cloud gateway (e.g. AWS Bedrock)

Everything above assumes local models because most engagements haven't
pre-approved sending customer or system data to any external service (see
[Prerequisites](#prerequisites) and
[Security & Privacy](#security--privacy)). That default flips for a specific,
common situation: a customer that already provides AWS Bedrock as their own
sanctioned interface to a set of approved models. In that case, routing
generation through the customer's Bedrock endpoint isn't sending data to an
arbitrary third party -- it stays inside a boundary the customer has already
vetted, under whatever data-handling terms they negotiated with AWS. If
that's your situation, it can be a reasonable choice, and often a better
one: Bedrock exposes larger, frontier-class models than what's practical to
run locally on constrained hardware, which can mean meaningfully more
nuanced, better-grounded responses than `llama3.1:8b` or the other local
options above.

A few things worth confirming before doing this on any given engagement:

- Get it in writing the same way you would any other AI usage on the
  engagement -- Bedrock accounts and configurations vary (region, logging/
  retention via CloudTrail, cross-region inference, per-model-provider data
  terms), and "the customer approved Bedrock" doesn't automatically cover
  every model or setting available through it.
- Retrieval and embedding (`embeddinggemma`) would stay local exactly as
  today -- this only changes where the assembled prompt for the
  *generation* step gets sent, the same distinction as choosing between
  local models above.

This isn't implemented today -- `llm/ollama_client.py`'s `chat_messages()`
is currently the only function that talks to a generation model, and it
assumes Ollama's chat API. Adding Bedrock support would mean a parallel
client (e.g. via `boto3`'s `bedrock-runtime` Converse API) behind a
provider switch, plus reimplementing the JSON-schema structured-output
contract used for the
[interactive follow-up mechanism](#interactive-follow-up-questions) against
Bedrock's equivalent. It's noted here as a legitimate option worth knowing
about, not a decision this tool makes for you.

## Usage

Every `srg` command below assumes the virtual environment is active in your
current terminal (`source .venv/bin/activate`). This is easy to miss right
after running `setup.sh`: the script activates the venv in its own subshell
while it runs, but that doesn't carry over to the terminal you invoked it
from — you'll get `srg: command not found` until you activate it yourself in
that session.

After the first-time setup above, use `start.sh` at the beginning of each
session instead of activating the venv by hand: it activates the venv,
starts the Ollama daemon in the background if it isn't already running, and
confirms both models are pulled. Source it (don't execute it) so the venv
activation applies to your shell:
```bash
source start.sh
```

1. **Add source material**:
   - Drop the NIST SP 800-53 rev5 catalog (PDF, Markdown, or text) into
     `knowledge_base/`. (it's already included, but you could replace it if a newer come comes out)
   - Drop the current engagement's customer/state-specific standards into
     `customer_standards/`.
   - Drop non-public system details into `private_context/`.

2. **Ingest**:
   ```bash
   srg ingest
   ```
   **This may take some time, several minutes on the initial run.**  
   Re-run this any time files in those folders change — unchanged files are
   skipped automatically. Use `--source knowledge_base|customer_standards|private_context`
   to ingest just one tier, or `--rebuild` to wipe and re-ingest everything
   (do this when switching to a new customer engagement).  
   Large files show a progress bar on stderr as embedding batches complete, so a long ingest doesn't look stalled.

3. **Generate a response**:
   ```bash
   srg generate "SI-5" --context "our environment uses a SaaS SIEM for continuous monitoring"
   ```
   **This may take some time, ESPECIALLY on the initial request.**  
   Prints Markdown to stdout by default. Add `-o response.md` to also write
   it to a file (or to a directory, in which case a filename like
   `SI-5_20260715.md` is generated).  
   A spinner shows on stderr while waiting for the model (generation can take a couple of minutes depending on your hardware) so a long wait doesn't look hung — it doesn't pollute stdout, so piping/redirecting output still works cleanly.

   For evidence/GRC systems that only accept raw text with no formatting (maybe Archer or Xacta),
   add `--format text`:
   ```bash
   srg generate "SI-5" --format text --context "..." -o response.txt
   ```
   This produces plain ASCII output — no Markdown syntax, no smart quotes,
   em-dashes, bullets, or other non-ASCII characters.  
   A directory target with `--format text` gets a `.txt` filename instead
   of `.md`.

### Interactive follow-up questions

If the model determines that a distinct, material part of the control
isn't covered by the retrieved material, your `--context` notes, or anything
already discussed, it can ask you a clarifying question instead of guessing:

```
$ srg generate "SI-5" --context "we use Acme Sentinel for monitoring"

What is the required review/dissemination timeframe for security alerts in
your environment?

Your answer: reviewed within 24 hours, disseminated within 48 hours
```

Answer at the prompt and it continues the same conversation — no need to
re-run the command. This can happen up to `SRG_MAX_FOLLOWUP_TURNS` times
(default **2**). If it still isn't done after that, one final call produces
a best-effort response anyway: it opens with a brief note that some
information wasn't available, and inserts `[PLACEHOLDER: ...]` markers in
place of anything it couldn't address confidently, so you can fill those in
by hand before submitting to the assessor.  

The tool is biased to generate *something* rather than looping/questioning indefinitely.

## Switching customer engagements

`customer_standards/` holds one engagement's worth of documents at a time.
When you move to a different customer:

```bash
# replace the contents of customer_standards/ with the new customer's docs
srg ingest --rebuild
```

`example_files/` has starter material per jurisdiction (`Federal/`, `VA/`,
`PA/`, `CA/`, `MD/`, `HI/`) to make this faster — copy what's relevant into
`customer_standards/` before running `--rebuild`. See
`example_files/README.md` for details.

## Development

```bash
pytest              # run tests
ruff check .         # lint
ruff format .        # format
```

Most of the pipeline (chunking, manifest diffing, prompt assembly, retrieval
merge logic, CLI argument parsing) is unit-tested without needing a live
Ollama instance. Actual embedding/retrieval quality and generation output
require a live Ollama daemon with both models pulled and are verified
manually — see the "Manual verification" section below.

## How It Works

1. **Ingest**: documents are loaded (`.pdf` via `pypdf`, `.md`/`.txt`
   directly), split into ~800-token chunks with overlap (splitting on
   headers/paragraphs where possible), tagged with any control IDs found
   in the text, embedded via EmbeddingGemma, and stored in one of three
   Chroma collections (`knowledge_base`, `customer_standards`,
   `private_context`). A manifest of per-file content hashes makes
   re-ingestion incremental.
2. **Retrieve**: for a given control ID and freeform notes, each collection
   is queried twice — once filtered to chunks whose text contains the
   control ID, once by semantic similarity — and the results are merged,
   with `customer_standards` and `private_context` given protected
   top-k slots so they aren't drowned out by the much larger NIST corpus.
3. **Refuse or caveat**: if the NIST baseline has no match for the control
   ID, the tool refuses and exits non-zero rather than guessing. If the
   baseline matches but no customer/state standard does, generation
   proceeds but the model is instructed to say so explicitly.
4. **Generate**: retrieved chunks (labeled by tier), the control ID, and
   the analyst's notes are assembled into a prompt alongside
   `prompts/instructions.md` (editable — controls tone, structure, and the
   authoritative-standards rule) and a format-specific instruction (Markdown
   vs. plain ASCII text, chosen via `--format`), then sent to the generation
   model (`llama3.1:8b` by default — see
   [Choosing a generation model](#choosing-a-generation-model)) via Ollama.
   The model is asked for a JSON-schema-constrained reply (`needs_info`,
   `question`, `response`) rather than free-form text, so the follow-up
   mechanism below works reliably regardless of which model is configured.
5. **Follow up if needed**: if the reply has `needs_info: true`, its
   `question` is shown to you interactively and your typed answer is
   appended to the conversation before calling the model again — up to
   `SRG_MAX_FOLLOWUP_TURNS` times (default 2). If the budget runs out, one
   final call forces a best-effort response with `[PLACEHOLDER: ...]`
   markers for anything still unaddressed.
6. **Normalize (text format only)**: if `--format text` was requested, the
   raw model output is run through `generation/formatting.py`, which
   converts smart quotes/em-dashes/bullets to ASCII equivalents, strips any
   leftover Markdown syntax, and drops any remaining non-ASCII characters —
   a code-level guarantee independent of how well the model followed the
   prompt instruction.
7. **Output**: the response is printed to stdout and optionally written to
   a file.

## File Structure

```
security-response-generator/
├── pyproject.toml
├── setup.sh
├── prompts/instructions.md          # editable system prompt
├── knowledge_base/                  # committed: NIST 800-53 rev5, public refs
├── customer_standards/              # gitignored: current engagement's standards
├── private_context/                 # gitignored: non-public system details
├── example_files/                   # committed: per-jurisdiction starter material
│   └── Federal/ VA/ PA/ CA/ MD/ HI/ #   (copy into customer_standards/ per engagement)
├── src/security_response_generator/
│   ├── cli.py                       # `srg ingest` / `srg generate`
│   ├── config.py                    # models, paths, chunking, top-k (env-overridable)
│   ├── ingest/                      # loaders, chunking, manifest, Chroma store
│   ├── generation/                  # retrieval, prompt assembly, ASCII normalizer
│   └── llm/ollama_client.py         # Ollama embed/chat wrapper
├── chroma_db/                       # gitignored: Chroma persistence, created at runtime
└── tests/
```

## Troubleshooting

- **`ollama: command not found`**: install from https://ollama.com/download.
- **Ollama daemon not running**: run `ollama serve`, or launch the Ollama
  desktop app, then retry.
- **`srg generate` refuses every control ID**: run `srg ingest` first — the
  NIST baseline collection is empty until `knowledge_base/` is ingested.
- **Model pull is slow/fails**: `llama3.1:8b` is a ~4.9GB download (see
  [Choosing a generation model](#choosing-a-generation-model) for smaller
  or larger alternatives); check disk space and network connectivity.
- **Responses are much slower than expected**: run `ollama ps` to check
  whether the model is fully on GPU or partially spilled to system RAM/CPU
  (Ollama does this automatically and silently if VRAM is tight, and it's a
  common source of unexplained slowness). Lowering context length or closing
  other GPU-heavy applications usually resolves it.
- **`srg ingest` fails with `ResponseError: ... EOF` on a large document**
  (e.g. the full NIST 800-53 rev5 catalog, ~490 pages): this is the
  embedding model's runner subprocess getting OOM-killed — check Ollama's
  own log (`journalctl -u ollama`, or the terminal running `ollama serve`
  if you started it manually) for a `signal: killed` line to confirm.
  `srg ingest` already batches embedding requests (`SRG_EMBED_BATCH_SIZE`,
  default 32) to avoid this; if it still happens on a memory-constrained
  machine (e.g. WSL2 with a low `.wslconfig` memory cap), try lowering the
  batch size further:
  ```bash
  SRG_EMBED_BATCH_SIZE=8 srg ingest
  ```

## Security & Privacy

- `customer_standards/` and `private_context/` are gitignored — their
  contents never get committed, even though the underlying customer
  documents may themselves be public.
- All embedding and generation happens through the locally running Ollama
  daemon by default. No document or prompt content is sent outside the
  local machine, with one deliberate exception -- see
  [Using a customer-approved cloud gateway](#using-a-customer-approved-cloud-gateway-eg-aws-bedrock)
  for when a customer-approved gateway like AWS Bedrock is a reasonable fit
  and what it would take.
- `start.sh` launches Ollama with `OLLAMA_NO_CLOUD=1` to prevent Ollama's
  own default telemetry/cloud-sync calls.

## Manual verification

Since embedding/generation quality can't be captured by unit tests, verify
end-to-end behavior manually after setup:

1. `./setup.sh`
2. Drop a NIST 800-53 rev5 excerpt containing SI-5 into `knowledge_base/`
3. Drop a sample state-standard doc for SI-5 into `customer_standards/`
4. Create a short fictional system-context doc in `private_context/`
5. `srg ingest` — confirm chunk counts reported, `chroma_db/` created
6. Re-run `srg ingest` with no changes — confirm 0 re-embedded
7. `srg generate SI-5 --context "..."` — confirm valid Markdown that
   reflects the customer standard as authoritative
8. Remove the `customer_standards/` file for SI-5, re-ingest, re-run step 7
   — confirm the "no customer standard found" caveat appears instead
9. `srg generate ZZ-99` — confirm refusal with non-zero exit
10. `srg generate SI-5 --format text` — confirm the output has no Markdown
    syntax, smart quotes, em-dashes, or bullets, and that every character is
    plain ASCII
11. Ingest a control whose requirements clearly need something not in
    `knowledge_base/`, `customer_standards/`, or `private_context/`
    (omit one detail on purpose) and run `srg generate` for it — confirm
    the tool asks a clarifying question, answer it at the prompt, and
    confirm the final response reflects your answer
12. Repeat step 11 but decline to give useful answers (or set
    `SRG_MAX_FOLLOWUP_TURNS=0`) — confirm the tool still produces a response
    within the round limit, opening with a note that information was
    missing and containing `[PLACEHOLDER: ...]` markers rather than
    guessing
13. `git status` — confirm nothing under `customer_standards/` or
    `private_context/` shows except their `README.md`/`.gitkeep`

## License

MIT License — see the repository root [LICENSE](../LICENSE) file.
