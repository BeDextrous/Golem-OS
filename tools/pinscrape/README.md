# pinscrape

Pinterest image scraper ([pinscrape](https://github.com/iamatulsingh/pinscrape)), installed in an isolated venv at `tools/pinscrape/.venv` so it stays out of system Python.

## Run

There's a global `pinscrape` alias (in `~/.zshrc`) pointing at the wrapper, so from any directory:

```bash
pinscrape "ed mell sunset" -n 20                 # -> Pinterest/ (root, default)
pinscrape "brutalist architecture" --to Architecture   # -> Pinterest/Architecture/
pinscrape "ui patterns" --to Projects/golem-os   # -> Pinterest/Projects/golem-os/
pinscrape --list                                 # list existing subfolders

# Download from direct image URLs instead of searching:
pinscrape --urls "https://i.pinimg.com/originals/.../x.jpg" "https://..." --to Art/Moebius
pinscrape --from urls.txt --to Art               # one direct image URL per line
```

> Only **direct image URLs** (e.g. `i.pinimg.com/.../x.jpg`) work with `--urls`/`--from`.
> Pinterest *page* links (`pinterest.com/pin/...` or board pages) do NOT — copy the
> actual image address (right-click image → Copy Image Address).

Images save to the bedextrous Google Drive folder
`~/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive/Pinterest` by default.

Options:
- `-n/--count` number of images
- `--to SUBFOLDER` subfolder under Pinterest/ (case-insensitive, e.g. `architecture`; created if new)
- `-o/--output` exact absolute path (overrides `--to`)
- `-w/--workers`, `--sleep` (delay between requests)
- `--list` show subfolders

> A harmless pydantic warning may print when some pins lack expected fields — downloads still succeed.

## Download a whole board (`pinscrape-board`)

Downloads every image from a Pinterest board — public **or secret** — using your
logged-in session cookie. Companion script `board_scrape.py`.

**One-time cookie setup:**
1. Log in to pinterest.com in your browser.
2. DevTools → Network → refresh → click any `pinterest.com` request → copy the full
   `Cookie:` request-header value.
3. Paste it into `tools/pinscrape/.pinterest_cookie` (gitignored, never committed).

**Run:**
```bash
pinscrape-board "https://pinterest.com/yourname/sci-fi/"            # whole board -> Boards/sci-fi/
pinscrape-board "https://pinterest.com/yourname/sci-fi/" -n 50 --to "Art/Sci-fi"
```

Output defaults to `Pinterest/Boards/<board-slug>/`; override with `--to`/`-o`.
When the cookie expires, the tool says so — re-grab and re-paste it.

> Uses Pinterest's internal (undocumented) endpoints; may break if Pinterest changes them.

## Download search results (`pinscrape-search`)

Downloads full-res images from a Pinterest **search**, using the same cookie as
`pinscrape-board`. Companion script `search_scrape.py`. Higher quality and
authenticated (personalized) results vs. the library-based `pinscrape` search.

**Run** (accepts a bare query or a full `/search/pins/?q=...` URL):
```bash
pinscrape-search "moebius"                              # -> Searches/moebius/ (first 100)
pinscrape-search "moebius desert" -n 200 --to "Art/Moebius"
pinscrape-search "https://www.pinterest.com/search/pins/?q=moebius"   # URL form
```

Defaults to `Pinterest/Searches/<query>/` and the first **100** results (searches
are effectively endless). `-n 0` pages until results run out. Same content-hash
naming as the other tools, so re-runs dedupe.

> Shares the `.pinterest_cookie` and the same internal-endpoint caveat as `pinscrape-board`.

## Use the library directly

```python
from pinscrape import Pinterest

p = Pinterest(proxies={}, sleep_time=2)
urls = p.search("messi", 5)
p.download(url_list=urls, number_of_workers=10, output_folder="output")

# board details for a user
details = p.get_pin_details(username="canva", board="design-trends")
```

> Note: the older search-engine method (`from pinscrape import scraper; scraper.scrape(...)`) is deprecated upstream — use the `Pinterest` API.

## Reinstall / update

```bash
tools/pinscrape/.venv/bin/pip install --upgrade pinscrape
```
