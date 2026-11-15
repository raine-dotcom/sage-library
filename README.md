# sage-library

A self-hosted epub library for AI companions. Drop epubs in, push, done.

## Setup (your own library)

1. Fork or use this as a template
2. Enable GitHub Pages: Settings → Pages → Source: Deploy from branch → `main` / `(root)`
3. Drop `.epub` files into the `books/` folder, commit and push
4. The GitHub Action will process them automatically into browsable JSON
5. Point your bot at it: set `LIBRARY_URL=https://yourusername.github.io/your-repo` in `.env`

If `LIBRARY_URL` is not set, the bot uses the default community library.

## Adding books

Just drop `.epub` files into `books/` and push. The Action handles the rest.

## How it works

- `scripts/process-books.mjs` reads all epubs and generates:
  - `data/index.json` — full book list
  - `data/{book-id}/info.json` — metadata + chapter list
  - `data/{book-id}/chapters/{n}.json` — chapter text
  - `data/{book-id}/pages/{n}.json` — pages of ~1000 words each
- GitHub Pages serves everything statically
- The AI fetches JSON directly — no server needed

## Spaces sync (draft, not activated)

For Raine's Spaces project, GitHub remains the upload/processing source. After processing, the draft workflow also generates data/spaces-manifest.json containing stable book IDs, automatic genre shelves and verifiable content hashes. A separately approved Spaces server task will pull that manifest and numbered pages from a pinned GitHub commit directly into the private Spaces database.

This does not affect current GitHub readers or reading histories. The old GitHub-to-Spaces HTTP push job has been removed from the draft. The source workflow is now on main. On November 14, 2026, GitHub Actions published the first verified 72-book Spaces manifest (from 73 source entries; one zero-page entry was excluded) without changing the processed book pages. No scheduled Spaces pull or companion reader switch is running. See docs/spaces-library-import.md for staging/approval details.
