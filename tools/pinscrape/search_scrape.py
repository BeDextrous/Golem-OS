#!/usr/bin/env python
"""Download images from a Pinterest *search* using your logged-in session cookie.

Companion to board_scrape.py — same auth (tools/pinscrape/.pinterest_cookie) and
same content-hashed, dedupe-on-rerun output. Uses Pinterest's internal
BaseSearchResource endpoint (undocumented; may change).

Usage:
    pinscrape-search "moebius"
    pinscrape-search "moebius desert" -n 100 --to "Art/Moebius"
    pinscrape-search "https://www.pinterest.com/search/pins/?q=moebius"   # full URL ok
"""
import argparse
import os
import urllib.parse

# Reuse the board tool's cookie/session/download plumbing.
from board_scrape import (
    BASE, load_cookie, session_for, _resource_get, best_image_url, download,
)

SEARCH_PWS_HANDLER = "www/search/[scope].js"


def parse_query(arg):
    """Accept either a bare query string or a full Pinterest search URL and
    return the query text."""
    if arg.startswith("http://") or arg.startswith("https://"):
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(arg).query)
        q = (qs.get("q") or [""])[0]
        if not q:
            raise SystemExit(f"Could not find a 'q=' query in URL: {arg!r}")
        return q
    return arg


def iter_search_pins(s, query, limit=None):
    """Yield image URLs from a pin search, paging via the bookmark cursor."""
    source_url = "/search/pins/?" + urllib.parse.urlencode({"q": query})
    bookmark = None
    seen = 0
    while True:
        options = {"query": query, "scope": "pins", "page_size": 25}
        if bookmark:
            options["bookmarks"] = [bookmark]
        rr = _resource_get(s, "BaseSearchResource", options, source_url)
        data = rr.get("data")
        # Search wraps pins in {"results": [...]}; be tolerant of a bare list.
        results = data.get("results") if isinstance(data, dict) else (data or [])
        if not results:
            break
        for pin in results:
            url = best_image_url(pin)
            if url:
                yield url
                seen += 1
                if limit and seen >= limit:
                    return
        bookmark = rr.get("bookmark")
        if not bookmark or bookmark == "-end-":
            break


def slugify(query):
    return "-".join(query.lower().split())


def main():
    ap = argparse.ArgumentParser(description="Download images from a Pinterest search.")
    ap.add_argument("query", help='Search text, or a full /search/pins/?q=... URL')
    ap.add_argument("-n", "--count", type=int, default=100,
                    help="Max images (default: 100; searches are effectively endless). "
                         "Pass -n 0 to page until results run out.")
    ap.add_argument("--to", metavar="SUBFOLDER",
                    help="Subfolder under the Pinterest folder. Default: Searches/<query>.")
    ap.add_argument("-o", "--output", help="Exact output folder (overrides --to).")
    ap.add_argument("--cookie", help="Cookie header value (else read .pinterest_cookie).")
    args = ap.parse_args()

    query = parse_query(args.query)
    cookie = load_cookie(args.cookie)
    s = session_for(cookie, pws_handler=SEARCH_PWS_HANDLER)
    print(f"Search: {query!r}")

    if args.output:
        output = os.path.expanduser(args.output)
    elif args.to:
        output = os.path.join(BASE, args.to.strip("/"))
    else:
        output = os.path.join(BASE, "Searches", slugify(query))

    print("Collecting pins...")
    urls = list(iter_search_pins(s, query, limit=args.count))
    print(f"Found {len(urls)} image(s). Downloading into {output}")
    if not urls:
        print("Nothing to download.")
        return
    ok, fail = download(s, urls, output)
    print(f"Done: {ok} downloaded, {fail} failed -> {output}")


if __name__ == "__main__":
    main()
