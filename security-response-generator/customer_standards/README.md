# customer_standards/

Drop the **current engagement's** customer- or state-specific control
guidance here — e.g. a state's published parameter values and implementation
standards for each NIST control. When a control has guidance here, `srg
generate` treats it as **authoritative** and instructs the model to follow it
over generic NIST language. It's normal for some controls (or entire
engagements) to have nothing here — `srg generate` will note that explicitly
in its output rather than fail.

This folder is gitignored (except this file and `.gitkeep`), even though the
source documents themselves may be public — they're specific to a customer
relationship and shouldn't accumulate in repo history.

**One engagement at a time.** When you switch to a different customer,
replace the contents of this folder and run:

```bash
srg ingest --rebuild
```

Supported formats: `.pdf`, `.md`, `.txt`.
