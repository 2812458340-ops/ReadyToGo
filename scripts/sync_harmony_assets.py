"""Copy the built web app into the HarmonyOS rawfile directory.

Run after `python scripts/build_data.py`, before building the HAP in DevEco Studio.

    python scripts/sync_harmony_assets.py
"""
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "web")
DST = os.path.join(ROOT, "harmony", "entry", "src", "main", "resources", "rawfile", "web")


def main():
    if not os.path.isdir(SRC):
        raise SystemExit("web/ not found; run build_data.py first")
    if os.path.isdir(DST):
        shutil.rmtree(DST)
    shutil.copytree(SRC, DST)
    total = sum(
        os.path.getsize(os.path.join(dp, f))
        for dp, _, fs in os.walk(DST)
        for f in fs
    )
    print("synced %s -> %s (%.1f MB)" % (SRC, DST, total / 1024 / 1024))


if __name__ == "__main__":
    main()
