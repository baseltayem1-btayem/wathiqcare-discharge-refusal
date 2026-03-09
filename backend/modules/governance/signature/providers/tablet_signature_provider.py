class TabletSignatureProvider:
    def capture(self, signature_data_url: str) -> dict:
        return {
            "status": "signed",
            "provider": "tablet",
            "length": len(signature_data_url),
        }
