# Minimal stub for dashboard_channel to allow test import

from backend.models.dashboard_alert import DashboardAlert
from sqlalchemy.orm import Session

def send_dashboard_alert(db, **kwargs):
    if isinstance(db, Session):
        existing = db.query(DashboardAlert).filter_by(
            tenant_id=kwargs["tenant_id"],
            case_id=kwargs.get("case_id"),
            alert_key=kwargs["alert_key"],
            alert_type=kwargs["alert_type"]
        ).first()
        if existing:
            return existing
        alert = DashboardAlert(
            tenant_id=kwargs["tenant_id"],
            case_id=kwargs.get("case_id"),
            alert_key=kwargs["alert_key"],
            alert_type=kwargs["alert_type"],
            severity=kwargs["severity"],
            title=kwargs["title"],
            message=kwargs["message"],
            case_deep_link=kwargs.get("case_deep_link"),
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert
    else:
        # fallback for non-Session db (should not be used in real tests)
        return DashboardAlert(
            tenant_id=kwargs["tenant_id"],
            case_id=kwargs.get("case_id"),
            alert_key=kwargs["alert_key"],
            alert_type=kwargs["alert_type"],
            severity=kwargs["severity"],
            title=kwargs["title"],
            message=kwargs["message"],
            case_deep_link=kwargs.get("case_deep_link"),
        )
