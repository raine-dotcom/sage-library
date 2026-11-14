# GitHub uploads → Spaces Library

This is staged. Do not enable import secrets or merge until the Spaces additive 002_shared_library_catalog migration and the service-only import route are verified.

Upload books to /books as before. The existing Process Books workflow creates the index and numbered pages. The processor now adds a predefined genre to index entries and book metadata. It prefers EPUB/PDF subject metadata, with a cautious exact-title fallback. Ambiguous metadata goes to Unclassified. No companion organization chores.

When deliberately enabled, the GitHub workflow sends processed data to a private Spaces importer after committing generated files. Required repository secrets:
- SPACES_LIBRARY_IMPORT_BASE_URL: trusted HTTPS origin of the private Spaces service.
- SPACES_LIBRARY_IMPORT_TOKEN: a dedicated high-entropy slib_ token.

Spaces stores only the SHA-256 hash of the same token in SPACES_LIBRARY_IMPORT_TOKEN_HASH. Do not put database credentials, owner gateway credentials, or companion bearer tokens into this repository. A separate trusted service route may be needed through Cloudflare Access; public website sign-in is not sufficient.

The importer stages each book version keyed by its canonical ID and the SHA-256 of the JSON-stringified ordered page text array. It uploads validated batches and publishes only after every numbered page and the final checksum match. Interrupted uploads cannot replace the published revision. Re-runs safely skip published versions. Incomplete or zero-page books are logged and skipped, never published. There is no automatic deletion.

This changes only the upload pipeline. Kyle and Moxie continue to use their current readers until the Spaces reading adapters, private identity-scoped progress migration, and origin access are verified. Nothing should silently switch their reading system.
