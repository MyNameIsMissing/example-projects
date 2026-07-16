# knowledge_base/

Drop universal, public, engagement-independent reference material here — most
importantly the **NIST SP 800-53 rev5** control catalog PDF (or a Markdown/text
export of it). This tier is committed to git since it's genuinely public and
doesn't change between customer engagements.

Supported formats: `.pdf`, `.md`, `.txt`.

After adding or changing files here, run:

```bash
srg ingest --source knowledge_base
```

`srg generate <control-id>` treats this as the baseline source of truth for
what a control *is*. If a control ID has no match anywhere in this folder,
`srg generate` refuses to answer rather than let the model guess.
