import json
import os
from PIL import Image, ImageChops

BASE = "qa-screenshots/physician-workspace-ve3"
BEFORE_DIR = os.path.join(BASE, "before")
AFTER_DIR = os.path.join(BASE, "after")
DIFF_DIR = os.path.join(BASE, "diff")

THRESHOLD = 0.1  # percent


def ensure_dir(d):
    os.makedirs(d, exist_ok=True)


def compare_images(before_path, after_path, diff_path):
    before = Image.open(before_path).convert("RGB")
    after = Image.open(after_path).convert("RGB")

    if before.size != after.size:
        after = after.resize(before.size, Image.Resampling.LANCZOS)

    diff = ImageChops.difference(before, after)
    bbox = diff.getbbox()

    if bbox is None:
        diff.save(diff_path)
        return {"identical": True, "diff_pixels": 0, "diff_percent": 0.0}

    diff_highlight = diff.point(lambda p: 255 if p > 0 else 0)
    diff_highlight.save(diff_path)

    total = before.width * before.height
    diff_pixels = sum(1 for p in diff_highlight.getdata() if p[0] > 0 or p[1] > 0 or p[2] > 0)
    percent = (diff_pixels / total) * 100

    return {"identical": False, "diff_pixels": diff_pixels, "diff_percent": round(percent, 2)}


def main():
    ensure_dir(DIFF_DIR)
    files = sorted(f for f in os.listdir(BEFORE_DIR) if f.endswith(".png"))
    results = []

    for name in files:
        before_path = os.path.join(BEFORE_DIR, name)
        after_path = os.path.join(AFTER_DIR, name)
        diff_path = os.path.join(DIFF_DIR, name)

        if not os.path.exists(after_path):
            results.append({"name": name, "status": "missing_after"})
            continue

        result = compare_images(before_path, after_path, diff_path)
        result["name"] = name
        result["status"] = "identical" if result["identical"] else ("acceptable" if result["diff_percent"] <= THRESHOLD else "review")
        results.append(result)

    summary = {
        "total": len(results),
        "identical": sum(1 for r in results if r.get("status") == "identical"),
        "acceptable": sum(1 for r in results if r.get("status") == "acceptable"),
        "review": sum(1 for r in results if r.get("status") == "review"),
        "missing": sum(1 for r in results if r.get("status") == "missing_after"),
        "screenshots": results,
    }

    summary_path = os.path.join(BASE, "comparison-summary.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
