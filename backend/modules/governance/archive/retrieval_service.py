from typing import Iterable


def search_archive(entries: Iterable[dict], **filters: str) -> list[dict]:
    results: list[dict] = []
    for entry in entries:
        if all(str(entry.get(key, "")) == str(value) for key, value in filters.items() if value):
            results.append(entry)
    return results
