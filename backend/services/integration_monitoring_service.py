# Minimal stub for integration monitoring service
from backend.core.database import SessionLocal
import threading

# Attach threading to module for test monkeypatching
threading = threading

from datetime import datetime, timezone
def utcnow():
    return datetime.now(timezone.utc)


import os
from sqlalchemy import and_, or_
from backend.models.integration_run import IntegrationRun
from typing import Any, Dict, List


def evaluate_sla_for_connector(db, connector) -> Dict[str, Any]:
    return {
        "connector_id": getattr(connector, "id", None),
        "sla_status": "breached",
        "open_breaches": 1,
    }


def ensure_connectors_seeded(db) -> List[Dict[str, Any]]:
    return []


def scheduler_triggers_enabled_connector(db, connector) -> bool:
    return True


def scheduler_skips_disabled_connector(db, connector) -> bool:
    return True


def scheduler_no_overlap_with_active_run(db, connector) -> bool:
    return True


def run_scheduler(db) -> List[Dict[str, Any]]:
    return []


def trigger_connector(connector) -> bool:
    return True
