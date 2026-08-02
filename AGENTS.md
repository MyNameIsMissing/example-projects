# Repository Commands

## General Guidance

- Treat each top-level project as independent; keep its dependencies and tooling scoped to its directory.
- Keep changes focused and preserve unrelated work already present in the repository.
- Never commit secrets, local environment files, generated artifacts, dependency directories, caches, or runtime data.
- Add or update tests for behavior changes, and update documentation when setup or user-facing behavior changes.
- Run the affected project's relevant tests, lint, and formatting checks before handoff; report any checks not run.
- Do not commit or push changes unless explicitly requested, and do not commit directly to `main`.

## Build

- Go app: `cd goapp && go build ./...`

## Test

- Document Enhancer: `cd document-enhancer && npm test`
- Go app: `cd goapp && go test ./...`
- JavaScript app: `cd javascriptapp && npm test`

## Lint

- Document Enhancer: `cd document-enhancer && npm run lint`
- Go app: `cd goapp && go vet ./...`
- JavaScript app: `cd javascriptapp && npm run lint`

## Format

- Go app: `cd goapp && gofmt -w .`
- JavaScript app: `cd javascriptapp && npm run format`
