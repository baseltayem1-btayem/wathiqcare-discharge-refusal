class NafathProvider:
    """Placeholder implementation to keep non-configured deployments stable."""

    def start(self, user_identifier: str) -> dict:
        return {
            "status": "pending",
            "provider": "nafath",
            "message": "Nafath integration placeholder (feature-gated)",
            "user_identifier": user_identifier,
        }
