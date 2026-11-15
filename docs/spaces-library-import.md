# Sage Library publication for Spaces (staged, disabled)

## Current architecture — Spaces pulls, Sage does not push

After uploading EPUB/PDF/MOBI/AZW3 source files to books/, the existing Process Books workflow writes data/index.json and numbered pages. A new workflow step executes scripts/build-spaces-manifest.mjs --write and commits data/spaces-manifest.json together with the processed pages.

The manifest contains a deterministic list of readable books with canonical IDs, title, author, description, one of the 16 predefined genres, page count, page SHA-256 and full metadata-version SHA-256. Zero-page source entries are recorded as skipped, not published. It contains NO page bodies and NO companion reading history. Genre is derived automatically from source metadata and cautious title/ID classifications; ambiguous books remain Unclassified.

Spaces later uses its own private application worker (scripts/pull-sage-library.mjs on the Spaces draft branch) to fetch GitHub's public main ref and all source JSON from the SAME immutable commit. It validates every imported page against the manifest before writing to the private Spaces DB. GitHub does NOT send book payloads to a public Spaces HTTP endpoint.

**The earlier GitHub-to-Spaces HTTP push workflow is retired in this development branch.** Do not configure SPACES_IMPORT_ENABLED, SPACES_LIBRARY_IMPORT_BASE_URL, SPACES_LIBRARY_IMPORT_TOKEN, or Cloudflare service-token secrets for this path. The legacy scripts/sync-spaces.mjs remains for regression/dry-run comparisons and is not invoked to publish by Process Books.

## Development status and testing

This is not merged or enabled. Source metadata and full-catalog verification tests run in .github/workflows/library-pipeline-checks.yml. The CI compares data/spaces-manifest.json to the existing import algorithm's output and ensures older source IDs remain stable.

The new committed manifest will not exist on main until the Sage source PR is approved, merged and the first Process Books workflow runs on main. That first run can be a controlled manual workflow_dispatch after separate owner approval, rather than requiring the owner to re-upload all 73 books.

Do not mistake source CI success for a live Spaces database import. No books were moved to Coolify by this workflow.

## What stays unchanged

Kyle and Moxie retain their own original GitHub readers, PostgreSQL reading histories, current books, autonomous routines, notes and reflections. Only a separate, future approval may migrate the chosen reader, Kyle first; Moxie waits at least 72 hours of healthy Kyle observation and a second manual approval.

The final long-running scheduled pull must be configured later in the Spaces server environment, independently of Sage, after an authorized test and backup. See the Spaces documentation: docs/library-automatic-pull.md and docs/DEPLOYMENT_STATUS.md.
