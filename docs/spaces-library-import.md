# GitHub uploads → Spaces Library

This is staged. Do not enable import secrets or merge until the Spaces additive 002_shared_library_catalog migration and the service-only import route are verified.

Upload books to /books as before. The existing Process Books workflow creates the index and numbered pages. The processor now adds a predefined genre to index entries and book metadata. It prefers EPUB/PDF subject metadata, with a cautious exact-title fallback. Ambiguous metadata goes to Unclassified. No companion organization chores.

When deliberately enabled, the GitHub workflow sends processed data to a private Spaces importer after committing generated files. **The repository Actions variable `SPACES_IMPORT_ENABLED` must be explicitly set to `true`; it defaults to disabled.** Required repository secrets:
- SPACES_LIBRARY_IMPORT_BASE_URL: `https://spaces.artificiallyferal.com/` (the importer rejects other hosts, non-HTTPS URLs and redirects).
- SPACES_LIBRARY_IMPORT_TOKEN: a dedicated high-entropy slib_ token.

Spaces stores only the SHA-256 hash of the same token in SPACES_LIBRARY_IMPORT_TOKEN_HASH. Do not put database credentials, owner gateway credentials, or companion bearer tokens into this repository. If Cloudflare Access protects the import route, provide both optional service-token secrets `SPACES_CF_ACCESS_CLIENT_ID` and `SPACES_CF_ACCESS_CLIENT_SECRET` from a separately approved machine identity. The importer rejects half-configured pairs. Public website sign-in is not sufficient. Do not configure these until the private route and origin protection are verified.

The importer can first be checked without any credentials using `node scripts/sync-spaces.mjs --dry-run`. The CI dry-run validates all existing catalog files/pages, skips zero-page entries, and assigns legacy catalog genres without rewriting reading pages. Actual publishing is never attempted in dry-run mode.

The importer stages each book version keyed by its canonical ID and the SHA-256 of the JSON-stringified ordered page text array. It uploads validated batches and publishes only after every numbered page and the final checksum match. Interrupted uploads cannot replace the published revision. Re-runs safely skip published versions. Incomplete or zero-page books are logged and skipped, never published. There is no automatic deletion.

This changes only the upload pipeline. Kyle and Moxie continue to use their current readers until the Spaces reading adapters, private identity-scoped progress migration, and origin access are verified. Nothing should silently switch their reading system.
