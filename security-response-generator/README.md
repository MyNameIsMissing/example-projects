# Security Response Generator

Security Response Generator (`srg`) is a local CLI that drafts NIST SP
800-53 Rev. 5 control responses from:

- The included NIST SP 800-53 Rev. 5 catalog
- Customer-specific standards
- Private system context
- Notes supplied with each request

Embeddings and response generation run locally through Ollama. Generated
responses are labeled with the active customer engagement so customer
content and output are not easily confused.

For architecture, configuration, model selection, troubleshooting, and
implementation details, see the
[technical README](docs/technical-readme.md).

## Prerequisites

- Customer approval to use local AI tooling for the engagement
- Python 3.11 or newer
- [Ollama](https://ollama.com/download)
- Approximately 7 GB of available GPU or unified memory for the default
  generation and embedding models

## Install

Clone the repository, enter its directory, and run:

```bash
./setup.sh
```

Setup creates the Python environment, installs `srg`, starts Ollama when
needed, downloads the default models, and installs the command launcher.
No virtual-environment activation or `source` command is required.

If setup reports that `~/.local/bin` is not on your `PATH`, follow the
one-time instruction it prints.

Check installation health at any time:

```bash
./setup.sh --check
```

## Try the built-in demo

The initial engagement is `DEMO`. It includes:

- The project-level NIST SP 800-53 Rev. 5 PDF
- Fictional private context for `DEMO-ECMS`
- No customer-specific standards

Ingest the source material:

```bash
srg ingest
```

Generate an SI-5 response:

```bash
srg generate SI-5 --context "Use the documented monitoring and advisory process."
```

The response begins with:

```text
Customer: DEMO
```

## Create a customer engagement

Use a name that combines the governing state and system name:

```bash
srg create-engagement virginia-SALI
```

For a more formal response label:

```bash
srg create-engagement virginia-SALI \
  --customer-name "Commonwealth of Virginia"
```

The command activates the engagement and prints its document locations:

```text
Add customer standards files in:
  .../engagements/virginia-sali/customer_standards

Add private system context details in:
  .../engagements/virginia-sali/private_context
```

Copy the appropriate documents into those folders, then run:

```bash
srg ingest
srg generate SI-5 --context "Additional notes specific to this response."
```

The shared NIST catalog is not duplicated between engagements. Customer
standards, private context, indexes, and generated response folders remain
isolated under `engagements/<engagement-name>/`.

## Switch engagements

List available engagements:

```bash
srg list-engagements
```

Show the active engagement and its document paths:

```bash
srg show-engagement
```

Activate an existing engagement:

```bash
srg use-engagement virginia-SALI
```

## Save or export a response

Markdown is the default:

```bash
srg generate SI-5 -o response.md
```

For Xacta, Archer, ServiceNow IRM/CAM, or another system requiring plain
ASCII text:

```bash
srg generate SI-5 --format text -o response.txt
```

Plain-text output retains normal capitalization while removing Markdown,
Unicode punctuation, and other non-ASCII characters.

## Common next steps

```bash
srg --help
srg ingest --help
srg generate --help
```

See [docs/technical-readme.md](docs/technical-readme.md) for:

- Model sizing and model selection
- Incremental ingestion and rebuild behavior
- Retrieval and prompt architecture
- Environment variables
- Security and privacy details
- Troubleshooting
- Development and testing
