"""Refresh travel-risk data once a day.

Pipeline:
    1. scripts/fetch_sources.py --force   (re-download all five sources)
    2. scripts/build_data.py              (rebuild risk.json / risk.js / geo)
    3. scripts/sync_harmony_assets.py     (copy web/ into the Harmony rawfile)

Optional:
    --build-hap   also rebuild the signed HarmonyOS HAP

Usage:
    python scripts/daily_update.py
    python scripts/daily_update.py --skip-fetch
    python scripts/daily_update.py --build-hap

Windows 0:00 scheduling:
    powershell -ExecutionPolicy Bypass -File scripts/install_daily_task.ps1
"""
import argparse
import datetime
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOGS = ROOT / "logs"
LOCK = LOGS / "daily_update.lock"


def log(message):
    LOGS.mkdir(exist_ok=True)
    line = "[%s] %s" % (datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), message)
    print(line, flush=True)
    with (LOGS / "daily_update.log").open("a", encoding="utf-8") as fh:
        fh.write(line + "\n")


def run_step(label, script, extra=None):
    cmd = [sys.executable, str(ROOT / "scripts" / script)] + (extra or [])
    log("start %s" % label)
    started = time.time()
    proc = subprocess.run(
        cmd, cwd=str(ROOT), text=True,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    for line in (proc.stdout or "").splitlines():
        log("  " + line)
    ok = proc.returncode == 0
    log("%s %s (%.1fs, exit %d)" % (
        label, "done" if ok else "FAILED", time.time() - started, proc.returncode))
    return ok


def build_hap():
    tools = Path(r"C:\Program Files\Huawei\DevEco Studio\tools")
    node = tools / "node" / "node.exe"
    hvigor = tools / "hvigor" / "bin" / "hvigorw.js"
    sdk = tools.parent / "sdk"
    if not node.exists() or not hvigor.exists():
        log("build HAP skipped: DevEco Studio tools not found")
        return False
    env = os.environ.copy()
    env["DEVECO_SDK_HOME"] = str(sdk)
    log("start build HAP")
    started = time.time()
    proc = subprocess.run(
        [str(node), str(hvigor), "--mode", "module", "-p", "product=default",
         "assembleHap", "--no-daemon"],
        cwd=str(ROOT / "harmony"), env=env, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    for line in (proc.stdout or "").splitlines():
        log("  " + line)
    ok = proc.returncode == 0
    log("build HAP %s (%.1fs, exit %d)" % (
        "done" if ok else "FAILED", time.time() - started, proc.returncode))
    return ok


def acquire_lock():
    LOGS.mkdir(exist_ok=True)
    if LOCK.exists():
        age = time.time() - LOCK.stat().st_mtime
        if age < 3 * 3600:
            log("another daily update is still running (%.0fs old), skip" % age)
            return False
        log("removing stale lock (%.1fh old)" % (age / 3600))
        LOCK.unlink(missing_ok=True)
    try:
        fd = os.open(str(LOCK), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode("ascii"))
        os.close(fd)
    except FileExistsError:
        log("another daily update started at the same time, skip")
        return False
    return True


def main():
    parser = argparse.ArgumentParser(description="Refresh ReadyToGo risk data")
    parser.add_argument("--skip-fetch", action="store_true", help="reuse downloaded raw files")
    parser.add_argument("--skip-sync", action="store_true", help="do not copy web/ into the Harmony rawfile")
    parser.add_argument("--build-hap", action="store_true", help="also rebuild the signed HarmonyOS HAP")
    args = parser.parse_args()

    if not acquire_lock():
        return 1
    try:
        log("=== ReadyToGo daily update start ===")
        if not args.skip_fetch:
            if not run_step("fetch sources", "fetch_sources.py", ["--force"]):
                log("fetch failed; keeping the previous raw cache and trying to rebuild")
        else:
            log("fetch sources skipped")

        if not run_step("build data", "build_data.py"):
            log("build failed, abort")
            return 1

        if not args.skip_sync:
            if not run_step("sync Harmony rawfile", "sync_harmony_assets.py"):
                log("sync failed")
                return 1
        else:
            log("sync skipped")

        if args.build_hap and not build_hap():
            log("HAP build failed (data itself was refreshed)")
            return 1

        log("=== ReadyToGo daily update done ===")
        return 0
    finally:
        LOCK.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
