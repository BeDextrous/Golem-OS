#!/usr/bin/env python
"""Pinterest image scraper using pinscrape (https://github.com/iamatulsingh/pinscrape).

Usage:
    pinscrape "ed mell sunset" -n 20                 # -> Pinterest/ (root)
    pinscrape "brutalist concrete" --to Architecture # -> Pinterest/Architecture/
    pinscrape "ui patterns" --to Projects/golem-os   # -> Pinterest/Projects/golem-os/
    pinscrape "moodboard" -o /some/abs/path          # -> exact path (overrides --to)
    pinscrape --list                                 # show existing subfolders
"""
import argparse
import os
import sys

from pinscrape import Pinterest

# Default base: the bedextrous Google Drive synced "Pinterest" folder.
BASE = os.path.expanduser(
    "~/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive/Pinterest"
)


def list_subfolders():
    """Return existing subfolder paths (relative to BASE), recursively."""
    found = []
    for root, dirs, _ in os.walk(BASE):
        dirs.sort()
        for d in dirs:
            found.append(os.path.relpath(os.path.join(root, d), BASE))
    return sorted(found)


def resolve_to(sub):
    """Map a --to value to an absolute folder under BASE, matching existing
    folders case-insensitively so 'architecture' or 'projects/golem-os' work.
    Falls back to the literal name (creating a new folder) if no match."""
    sub = sub.strip("/")
    existing = list_subfolders()
    lower = {f.lower(): f for f in existing}
    if sub.lower() in lower:
        return os.path.join(BASE, lower[sub.lower()])
    return os.path.join(BASE, sub)  # new folder


def main():
    parser = argparse.ArgumentParser(description="Scrape images from Pinterest into your Drive.")
    parser.add_argument("keyword", nargs="?", help="Search keyword")
    parser.add_argument("-n", "--count", type=int, default=10,
                        help="Number of images to download (default: 10)")
    parser.add_argument("--urls", nargs="+", metavar="URL",
                        help="Direct image URLs to download instead of searching.")
    parser.add_argument("--from", dest="from_file", metavar="FILE",
                        help="Text file with one direct image URL per line.")
    parser.add_argument("--to", metavar="SUBFOLDER",
                        help="Subfolder under the Pinterest folder, e.g. 'Architecture' "
                             "or 'Projects/golem-os'. Case-insensitive; created if new.")
    parser.add_argument("-o", "--output",
                        help="Exact output folder (absolute path; overrides --to/default).")
    parser.add_argument("-w", "--workers", type=int, default=10,
                        help="Number of download workers (default: 10)")
    parser.add_argument("--sleep", type=float, default=2,
                        help="Seconds between requests, to avoid rate limiting (default: 2)")
    parser.add_argument("--list", action="store_true",
                        help="List existing subfolders and exit.")
    args = parser.parse_args()

    if args.list:
        print(f"Subfolders under {BASE}:")
        for f in list_subfolders():
            print(f"  {f}")
        return

    # Gather URLs from --urls and/or --from FILE.
    url_list = list(args.urls or [])
    if args.from_file:
        with open(os.path.expanduser(args.from_file)) as f:
            url_list += [line.strip() for line in f if line.strip() and not line.startswith("#")]

    if not url_list and not args.keyword:
        parser.error("give a search keyword, or --urls/--from, or --list")

    if args.output:
        output = os.path.expanduser(args.output)
    elif args.to:
        output = resolve_to(args.to)
    else:
        output = BASE

    p = Pinterest(proxies={}, sleep_time=args.sleep)

    if url_list:
        # Direct-URL mode. Warn about Pinterest *page* links, which won't work —
        # only direct image URLs (e.g. i.pinimg.com/.../x.jpg) download correctly.
        page_links = [u for u in url_list if "pinterest.com" in u]
        if page_links:
            print(f"⚠ {len(page_links)} link(s) look like Pinterest page URLs, not direct "
                  f"image URLs — those won't download. Use the actual image URL "
                  f"(right-click image → Copy Image Address).")
        print(f"Downloading {len(url_list)} URL(s)")
    else:
        url_list = p.search(args.keyword, args.count)
        print(f"Found {len(url_list)} image URLs for '{args.keyword}'")

    if not url_list:
        print("Nothing to download.")
        return
    os.makedirs(output, exist_ok=True)
    p.download(url_list=url_list, number_of_workers=args.workers, output_folder=output)
    print(f"Downloaded into {output}")


if __name__ == "__main__":
    main()
