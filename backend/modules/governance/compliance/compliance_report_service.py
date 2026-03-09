from collections import Counter


def summarize_events(events: list[dict]) -> dict:
    counter = Counter(event.get("action", "unknown") for event in events)
    return {
        "total_events": len(events),
        "by_action": dict(counter),
    }
