#!/usr/bin/env python3
"""Download raw travel-advisory data from official government sources.

Usage:
    python scripts/fetch_sources.py            # fetch only what is missing
    python scripts/fetch_sources.py --force    # re-download everything

Sources
-------
US  State Dept. Consular Affairs API   https://cadataapi.state.gov/api/TravelAdvisories
UK  GOV.UK Content API (FCDO advice)   https://www.gov.uk/api/content/foreign-travel-advice
CA  Travel Advice and Advisories       https://travel.gc.ca/travelling/advisories
DE  Federal Foreign Office open data   https://www.auswaertiges-amt.de/opendata/travelwarning
CN  China Consular Service (MFA)       https://cs.mfa.gov.cn/ljmdd/
EM  Emergency phone numbers dataset     https://github.com/shanezzar/JSON-of-emergency-telephone-numbers

The raw files are kept in data/raw/ so that scripts/build_data.py can rebuild the
dataset completely offline.
"""
import json
import os
import re
import ssl
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

FORCE = "--force" in sys.argv


def fetch(url, path, timeout=60, headers=None):
    if not FORCE and os.path.exists(path) and os.path.getsize(path) > 200:
        return "cached"
    req = urllib.request.Request(url, headers=headers or {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "close",
    })
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
                body = r.read()
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "wb") as f:
                f.write(body)
            return "%d bytes" % len(body)
        except Exception as e:  # noqa: BLE001 - network errors are expected
            last = e
            time.sleep(1.5 * (attempt + 1))
    return "ERROR %r" % (last,)


def fetch_us():
    return fetch("https://cadataapi.state.gov/api/TravelAdvisories",
                 "data/raw/us_cadata.json")


def fetch_ca():
    return fetch("https://travel.gc.ca/travelling/advisories", "data/raw/ca_list.html")


def fetch_de():
    return fetch("https://www.auswaertiges-amt.de/opendata/travelwarning",
                 "data/raw/de_open.json")


def fetch_uk():
    status = fetch("https://www.gov.uk/api/content/foreign-travel-advice",
                   "data/raw/uk_index.json")
    if status.startswith("ERROR"):
        return status
    index = json.load(open("data/raw/uk_index.json", encoding="utf-8"))
    children = index["links"]["children"]
    os.makedirs("data/raw/uk", exist_ok=True)

    def one(child):
        slug = child["details"]["country"]["slug"]
        path = "data/raw/uk/%s.json" % slug
        if not FORCE and os.path.exists(path) and os.path.getsize(path) > 1000:
            return slug, "cached"
        return slug, fetch(
            "https://www.gov.uk/api/content/foreign-travel-advice/" + slug, path,
            headers={"User-Agent": UA, "Accept": "application/json"},
        )

    done = err = 0
    with ThreadPoolExecutor(max_workers=6) as ex:
        for fut in as_completed([ex.submit(one, c) for c in children]):
            _, st = fut.result()
            if st.startswith("ERROR"):
                err += 1
            else:
                done += 1
    return "%d/%d ok, %d errors" % (done, len(children), err)


def fetch_cn():
    status = fetch("https://cs.mfa.gov.cn/", "data/raw/cn_index.html",
                   headers={"User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9"})
    if status.startswith("ERROR"):
        return status
    raw = open("data/raw/cn_index.html", encoding="utf-8", errors="replace").read()
    links = list(dict.fromkeys(
        re.findall(r'href="(/ljmdd/[^"]+)"[^>]*>([^<]{1,30})</a>', raw)))
    os.makedirs("data/raw/cn", exist_ok=True)

    def one(item):
        href, name = item
        path = "data/raw/cn/%s.html" % name
        if not FORCE and os.path.exists(path) and os.path.getsize(path) > 5000:
            return name, "cached"
        return name, fetch("https://cs.mfa.gov.cn" + href, path,
                           headers={"User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9"})

    done = err = 0
    with ThreadPoolExecutor(max_workers=6) as ex:
        for fut in as_completed([ex.submit(one, it) for it in links]):
            _, st = fut.result()
            if st.startswith("ERROR"):
                err += 1
            else:
                done += 1
    return "%d/%d ok, %d errors" % (done, len(links), err)


def fetch_emergency():
    return fetch(
        "https://cdn.jsdelivr.net/gh/shanezzar/JSON-of-emergency-telephone-numbers@master/data.json",
        "data/raw/emergency.json")


def fetch_assets():
    files = [
        ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
         "ne_110m_admin_0_countries.geojson", "data/raw/world.geojson"),
        ("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "web/vendor/leaflet.js"),
        ("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "web/vendor/leaflet.css"),
        ("https://unpkg.com/leaflet@1.9.4/dist/images/layers.png", "web/vendor/images/layers.png"),
        ("https://unpkg.com/leaflet@1.9.4/dist/images/layers-2x.png", "web/vendor/images/layers-2x.png"),
        ("https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png", "web/vendor/images/marker-icon.png"),
        ("https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png", "web/vendor/images/marker-shadow.png"),
    ]
    for url, path in files:
        print("  assets  %-28s %s" % (os.path.basename(path), fetch(url, path, timeout=90)))


def main():
    print("Fetching official travel advisories → data/raw/")
    for name, fn in (("US", fetch_us), ("UK", fetch_uk), ("CA", fetch_ca),
                     ("DE", fetch_de), ("CN", fetch_cn), ("EM", fetch_emergency)):
        t0 = time.time()
        st = fn()
        print("  %-6s %-40s %5.1fs" % (name, st, time.time() - t0))
    print("Fetching map geometry and Leaflet assets → web/")
    fetch_assets()
    print("Done. Next: python scripts/build_data.py")


if __name__ == "__main__":
    main()
