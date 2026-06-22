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
