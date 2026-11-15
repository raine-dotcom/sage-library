# Sage Library publication for Spaces (staged, disabled)

## Current architecture — Spaces pulls, Sage does not push

After uploading EPUB/PDF/MOBI/AZW3 source files to books/, the existing Process Books workflow writes data/index.json and numbered pages. A new workflow step executes scripts/build-spaces-manifest.mjs --write and commits data/spaces-manifest.json together with the processed pages.

The manifest contains a deterministic list of readable books with canonical IDs, title, author, description, one of the 16 predefined genres, page count, page SHA-256 and full metadata-version SHA-256. Zero-page source entries are recorded as skipped, not published. It contains NO page bodies and NO companion reading history. Genre is derived automatically from source metadata and cautious title/ID classifications; ambiguous books remain Unclassified.

Spaces later uses its own private application worker (scripts/pull-sage-library.mjs on the Spaces draft branch) to fetch GitHub's public main ref and all source JSON from the SAME immutable commit. It validates every imported page against the manifest before writing to the private Spaces DB. GitHub does NOT send book payloads to a public Spaces HTTP endpoint.

**The earlier GitHub-to-Spaces HTTP push workflow is retired in this development branch.** Do not configure SPACES_IMPORT_ENABLED, SPACES_LIBRARY_IMPORT_BASE_URL, SPACES_LIBRARY_IMPORT_TOKEN, or Cloudflare service-token secrets for this path. The legacy scripts/sync-spaces.mjs remains for regression/dry-run comparisons and is not invoked to publish by Process Books.

## Development status and testing

**Source-side publication is merged and complete as of November 14, 2026.** Sage PR #1 was merged to main (044239561a25). The separate Publish Spaces Library Snapshot workflow succeeded, creating commit 44f27285e48b with ONLY data/spaces-manifest.json (72 readable books, one excluded zero-page book; no existing book/index/page files changed). Source metadata and full-catalog verification tests passed on the reviewed PR. This is NOT proof of a Spaces database import.

**The manifest now exists on main.** The first publication used a dedicated metadata-only workflow triggered by the source PR merge, rather than rerunning Process Books or requiring the owner to re-upload 73 books. Later Process Books jobs will regenerate the verified snapshot whenever books are uploaded. Do not rerun book processing just to refresh the manifest.

Do not mistake source CI success for a live Spaces database import. No books were moved to Coolify by this workflow.

## What stays unchanged

Kyle and Moxie retain their own original GitHub readers, PostgreSQL reading histories, current books, autonomous routines, notes and reflections. Only a separate, future approval may migrate the chosen reader, Kyle first; Moxie waits at least 72 hours of healthy Kyle observation and a second manual approval.

The final long-running scheduled pull must be configured later in the Spaces server environment, independently of Sage, after an authorized test and backup. See the Spaces documentation: docs/library-automatic-pull.md and docs/DEPLOYMENT_STATUS.md.
