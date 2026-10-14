"""Download or extract the official dataset; verify ZIP before exposing files to scans."""

import argparse, hashlib, json, shutil, urllib.request, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
URL = "https://intrusion-detection.distrinet-research.be/CNS2022/Datasets/CICIDS2017_improved.zip"
ARCHIVE_SHA256 = "97fdb91d339e2d8cf5627f981b831e5e7e400b981c58181c451a38fd03c48883"
NAMES = {"monday.csv", "tuesday.csv", "wednesday.csv", "thursday.csv", "friday.csv"}


def main():
    p = argparse.ArgumentParser()
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--zip", type=Path)
    g.add_argument("--download", action="store_true")
    a = p.parse_args()
    archive = a.zip or ROOT / "data/CICIDS2017_improved.zip"
    archive.parent.mkdir(parents=True, exist_ok=True)
    if a.download:
        if not archive.exists():
            partial = archive.with_suffix(".zip.part")
            with urllib.request.urlopen(URL, timeout=60) as r, partial.open("wb") as f:
                shutil.copyfileobj(r, f, length=1024 * 1024)
            partial.rename(archive)
        print("Archive available", archive)
    h = hashlib.sha256()
    with archive.open("rb") as f:
        while b := f.read(4 * 1024 * 1024):
            h.update(b)
    if h.hexdigest() != ARCHIVE_SHA256:
        print(
            "Warning: archive differs from the inspected official release. Verify source/version before training."
        )
    with zipfile.ZipFile(archive) as z:
        if z.testzip() is not None:
            raise SystemExit("Corrupt ZIP; extraction cancelled")
        entries = {i.filename: i for i in z.infolist()}
        if set(entries) != NAMES:
            raise SystemExit(
                "Unexpected archive layout; expected exactly five daily CSVs"
            )
        target = ROOT / "data/cicids"
        target.mkdir(parents=True, exist_ok=True)
        needed = sum(i.file_size for i in entries.values())
        if shutil.disk_usage(target).free < needed + 100 * 1024**2:
            raise SystemExit("Insufficient disk space for extraction")
        for name in sorted(NAMES):
            destination = target / name
            partial = destination.with_suffix(".csv.part")
            with z.open(name) as source, partial.open("wb") as sink:
                shutil.copyfileobj(source, sink, length=1024 * 1024)
            if partial.stat().st_size != entries[name].file_size:
                raise SystemExit("Extracted size mismatch: " + name)
            partial.replace(destination)
            print("Verified", name, destination.stat().st_size)
    print(
        "Ready. Start the application, or run prepare_cicids.py and train_cicids.py --tune to reproduce training."
    )


if __name__ == "__main__":
    main()
