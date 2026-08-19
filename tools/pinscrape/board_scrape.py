#!/usr/bin/env python
"""Download every image from a Pinterest board (public or secret) using your
logged-in session cookie.

Companion to scrape.py. Uses Pinterest's internal BoardResource / BoardFeedResource
endpoints (undocumented; may change). Auth is a browser session cookie stored in
tools/pinscrape/.pinterest_cookie (gitignored).

Setup (one time):
    1. Log in to pinterest.com in your browser.
    2. Open DevTools -> Network, refresh, click any request to pinterest.com,
       copy the full "Cookie:" request-header value.
    3. Paste it into tools/pinscrape/.pinterest_cookie  (or run with --cookie).

Usage:
    pinscrape-board "https://pinterest.com/yourname/sci-fi/"
    pinscrape-board "https://pinterest.com/yourname/sci-fi/" -n 50 --to "Art/Sci-fi"
"""
import argparse
import hashlib
import json
import os
import sys
import urllib.parse

import requests

HERE = os.path.dirname(os.path.abspath(__file__))
COOKIE_FILE = os.path.join(HERE, ".pinterest_cookie")

# Same Drive base as scrape.py.
BASE = os.path.expanduser(
    "~/Library/CloudStorage/GoogleDrive-max@bedextrous.com/My Drive/Pinterest"
)

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")


def load_cookie(explicit):
    cookie = explicit
    if not cookie and os.path.exists(COOKIE_FILE):
        with open(COOKIE_FILE) as f:
            cookie = f.read().strip()
    if not cookie:
        sys.exit(
            f"No Pinterest cookie found.\n"
            f"  Paste your logged-in Cookie header into {COOKIE_FILE}\n"
            f"  (DevTools -> Network -> any pinterest.com request -> copy 'Cookie' value),\n"
            f"  or pass --cookie '<value>'."
        )
    return cookie


BOARD_PWS_HANDLER = "www/[username]/[slug].js"


def session_for(cookie, pws_handler=BOARD_PWS_HANDLER):
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Accept": "application/json, text/javascript, */*, q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        # Required by Pinterest's PWS resource endpoints; without the
        # PWS-Handler header they reject every call as "Invalid Resource
        # Request" (403). The bracketed value is a literal route template,
        # not interpolated. Each resource family has its own handler route
        # (board page vs. search page), so callers pass the matching one.
        "X-Pinterest-AppState": "active",
        "X-Pinterest-PWS-Handler": pws_handler,
        "Cookie": cookie,
        "Referer": "https://www.pinterest.com/",
    })
    # CSRF token, if present in the cookie, is required by some endpoints.
    for part in cookie.split(";"):
        part = part.strip()
        if part.startswith("csrftoken="):
            s.headers["X-CSRFToken"] = part.split("=", 1)[1]
    return s


def parse_board_url(url):
    path = urllib.parse.urlparse(url).path.strip("/")
    parts = [p for p in path.split("/") if p]
    if len(parts) < 2:
        sys.exit(f"Could not parse username/board from URL: {url!r}\n"
                 f"  Expected something like https://pinterest.com/<user>/<board>/")
    return parts[0], parts[1]


def _resource_get(s, resource, options, source_url):
    """Call a Pinterest internal resource endpoint and return resource_response."""
    url = f"https://www.pinterest.com/resource/{resource}/get/"
    params = {
        "source_url": source_url,
        "data": json.dumps({"options": options, "context": {}}),
    }
    r = s.get(url, params=params, timeout=30)
    ct = r.headers.get("content-type", "")
    if r.status_code == 403 or "application/json" not in ct:
        sys.exit("Pinterest rejected the request (auth/cookie likely expired).\n"
                 f"  Re-grab your Cookie header and update {COOKIE_FILE}.\n"
                 f"  (status={r.status_code}, content-type={ct})")
    return r.json().get("resource_response", {})


def get_board_id(s, username, slug):
    source_url = f"/{username}/{slug}/"
    rr = _resource_get(s, "BoardResource",
                       {"slug": slug, "username": username, "field_set_key": "detailed"},
                       source_url)
    data = rr.get("data")
    if not isinstance(data, dict) or "id" not in data:
        sys.exit(f"Board not found or not accessible: {username}/{slug}\n"
                 f"  (Check the URL, and that your cookie's account can see it.)")
    return data["id"], data.get("name", slug)


def best_image_url(pin):
    """Highest-res image URL for a pin: 'orig' if present, else the widest
    size. Returns None for videos / non-image pins."""
    images = (pin or {}).get("images") or {}
    if not images:
        return None
    if isinstance(images.get("orig"), dict) and images["orig"].get("url"):
        return images["orig"]["url"]
    best = max(images.values(),
               key=lambda i: i.get("width", 0) if isinstance(i, dict) else 0)
    return best.get("url") if isinstance(best, dict) else None


def iter_board_pins(s, board_id, username, slug, limit=None):
    """Yield image URLs from a board, paging via the bookmark cursor."""
    source_url = f"/{username}/{slug}/"
    bookmark = None
    seen = 0
    while True:
        options = {"board_id": board_id, "page_size": 25}
        if bookmark:
            options["bookmarks"] = [bookmark]
        rr = _resource_get(s, "BoardFeedResource", options, source_url)
        pins = rr.get("data") or []
        if not pins:
            break
        for pin in pins:
            url = best_image_url(pin)
            if url:
                yield url
                seen += 1
                if limit and seen >= limit:
                    return
        bookmark = rr.get("bookmark")
        if not bookmark or bookmark == "-end-":
            break


def download(s, urls, output):
    os.makedirs(output, exist_ok=True)
    ok = fail = 0
    for url in urls:
        try:
            r = s.get(url, timeout=60)
            r.raise_for_status()
            ext = ".png" if url.lower().endswith(".png") else ".jpg"
            name = hashlib.md5(r.content).hexdigest() + ext
            with open(os.path.join(output, name), "wb") as f:
                f.write(r.content)
            ok += 1
        except Exception as e:
            fail += 1
            print(f"  ! failed {url[:70]}... ({e})")
    return ok, fail


def main():
    ap = argparse.ArgumentParser(description="Download all images from a Pinterest board.")
    ap.add_argument("board_url", help="Full board URL, e.g. https://pinterest.com/you/sci-fi/")
    ap.add_argument("-n", "--count", type=int, default=None,
                    help="Max images (default: entire board).")
    ap.add_argument("--to", metavar="SUBFOLDER",
                    help="Subfolder under the Pinterest folder. Default: Boards/<slug>.")
    ap.add_argument("-o", "--output", help="Exact output folder (overrides --to).")
    ap.add_argument("--cookie", help="Cookie header value (else read .pinterest_cookie).")
    args = ap.parse_args()

    cookie = load_cookie(args.cookie)
    s = session_for(cookie)

    username, slug = parse_board_url(args.board_url)
    board_id, board_name = get_board_id(s, username, slug)
    print(f"Board: {board_name}  ({username}/{slug}, id={board_id})")

    if args.output:
        output = os.path.expanduser(args.output)
    elif args.to:
        output = os.path.join(BASE, args.to.strip("/"))
    else:
        output = os.path.join(BASE, "Boards", slug)

    print("Collecting pins...")
    urls = list(iter_board_pins(s, board_id, username, slug, limit=args.count))
    print(f"Found {len(urls)} image(s). Downloading into {output}")
    if not urls:
        print("Nothing to download.")
        return
    ok, fail = download(s, urls, output)
    print(f"Done: {ok} downloaded, {fail} failed -> {output}")


if __name__ == "__main__":
    main()
