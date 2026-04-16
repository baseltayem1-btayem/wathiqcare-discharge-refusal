import logging
import os
import shutil
import subprocess
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass


logger = logging.getLogger(__name__)


def _env_flag(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class TimestampAuthorityResult:
    status: str
    mode: str
    enabled: bool
    configured: bool
    endpoint: str | None
    payload_hash: str
    hash_algorithm: str
    token_bytes: bytes | None = None
    detail: str | None = None

    def to_manifest_metadata(self) -> dict:
        return {
            "status": self.status,
            "mode": self.mode,
            "enabled": self.enabled,
            "configured": self.configured,
            "endpoint": self.endpoint,
            "hash_algorithm": self.hash_algorithm,
            "payload_hash": self.payload_hash,
            "token_present": bool(self.token_bytes),
            "detail": self.detail,
        }


class RFC3161TimestampService:
    def __init__(self) -> None:
        self.enabled = _env_flag("WATHIQ_TSA_ENABLED")
        self.endpoint = os.getenv("WATHIQ_TSA_URL")
        self.timeout_seconds = int(os.getenv("WATHIQ_TSA_TIMEOUT_SECONDS", "10"))
        self.hash_algorithm = os.getenv("WATHIQ_TSA_HASH_ALGORITHM", "sha256")

    def issue_timestamp(self, payload_hash: str) -> TimestampAuthorityResult:
        if not self.enabled:
            return TimestampAuthorityResult(
                status="fallback_internal",
                mode="internal",
                enabled=False,
                configured=False,
                endpoint=self.endpoint,
                payload_hash=payload_hash,
                hash_algorithm=self.hash_algorithm,
                token_bytes=None,
                detail="TSA disabled; internal UTC timestamp assertions are active.",
            )

        if not self.endpoint:
            return TimestampAuthorityResult(
                status="unavailable",
                mode="external",
                enabled=True,
                configured=False,
                endpoint=None,
                payload_hash=payload_hash,
                hash_algorithm=self.hash_algorithm,
                token_bytes=None,
                detail="TSA enabled but WATHIQ_TSA_URL is not configured.",
            )

        request_body = payload_hash.encode("ascii", errors="ignore")
        headers = {
            "Content-Type": "application/timestamp-query",
            "Accept": "application/timestamp-reply",
        }

        try:
            request = urllib.request.Request(self.endpoint, data=request_body, headers=headers, method="POST")
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                token = response.read()
                if not token:
                    return TimestampAuthorityResult(
                        status="unavailable",
                        mode="external",
                        enabled=True,
                        configured=True,
                        endpoint=self.endpoint,
                        payload_hash=payload_hash,
                        hash_algorithm=self.hash_algorithm,
                        token_bytes=None,
                        detail="TSA responded with an empty token.",
                    )

                return TimestampAuthorityResult(
                    status="enabled",
                    mode="external",
                    enabled=True,
                    configured=True,
                    endpoint=self.endpoint,
                    payload_hash=payload_hash,
                    hash_algorithm=self.hash_algorithm,
                    token_bytes=token,
                    detail="External TSA token issued.",
                )
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as exc:
            logger.warning("tsa_issue_failed endpoint=%s reason=%s", self.endpoint, str(exc))
            return TimestampAuthorityResult(
                status="unavailable",
                mode="external",
                enabled=True,
                configured=True,
                endpoint=self.endpoint,
                payload_hash=payload_hash,
                hash_algorithm=self.hash_algorithm,
                token_bytes=None,
                detail=str(exc),
            )


@dataclass
class DetachedSignatureResult:
    status: str
    configured: bool
    enabled: bool
    key_path: str | None
    certificate_path: str | None
    algorithm: str
    signature_bytes: bytes | None = None
    detail: str | None = None

    def to_metadata(self, manifest_sha256: str) -> dict:
        return {
            "schema": "wathiqcare.evidence_bundle.signing.v1",
            "status": self.status,
            "enabled": self.enabled,
            "configured": self.configured,
            "algorithm": self.algorithm,
            "manifest_sha256": manifest_sha256,
            "signature_file": "manifest.sig" if self.signature_bytes else None,
            "signature_present": bool(self.signature_bytes),
            "certificate_path": self.certificate_path,
            "detail": self.detail,
        }


class DetachedManifestSignatureService:
    def __init__(self) -> None:
        self.enabled = _env_flag("WATHIQ_MANIFEST_SIGNING_ENABLED")
        self.key_path = os.getenv("WATHIQ_MANIFEST_SIGNING_KEY_PATH")
        self.certificate_path = os.getenv("WATHIQ_MANIFEST_SIGNING_CERT_PATH")
        self.algorithm = os.getenv("WATHIQ_MANIFEST_SIGNING_ALGORITHM", "sha256WithRSA")

    def sign_manifest(self, manifest_bytes: bytes) -> DetachedSignatureResult:
        if not self.enabled:
            return DetachedSignatureResult(
                status="not_configured",
                configured=False,
                enabled=False,
                key_path=self.key_path,
                certificate_path=self.certificate_path,
                algorithm=self.algorithm,
                signature_bytes=None,
                detail="Manifest signing disabled.",
            )

        if not self.key_path or not os.path.exists(self.key_path):
            return DetachedSignatureResult(
                status="not_configured",
                configured=False,
                enabled=True,
                key_path=self.key_path,
                certificate_path=self.certificate_path,
                algorithm=self.algorithm,
                signature_bytes=None,
                detail="Signing key path is missing or file does not exist.",
            )

        openssl_path = shutil.which("openssl")
        if not openssl_path:
            return DetachedSignatureResult(
                status="unavailable",
                configured=True,
                enabled=True,
                key_path=self.key_path,
                certificate_path=self.certificate_path,
                algorithm=self.algorithm,
                signature_bytes=None,
                detail="OpenSSL executable is not available on PATH.",
            )

        with tempfile.TemporaryDirectory(prefix="wathiq-sign-") as tmp_dir:
            manifest_path = os.path.join(tmp_dir, "manifest.json")
            signature_path = os.path.join(tmp_dir, "manifest.sig")
            with open(manifest_path, "wb") as handle:
                handle.write(manifest_bytes)

            command = [
                openssl_path,
                "dgst",
                "-sha256",
                "-sign",
                self.key_path,
                "-out",
                signature_path,
                manifest_path,
            ]

            process = subprocess.run(command, capture_output=True, text=True, check=False)
            if process.returncode != 0:
                detail = process.stderr.strip() or process.stdout.strip() or "OpenSSL signing failed"
                logger.warning("manifest_signing_failed reason=%s", detail)
                return DetachedSignatureResult(
                    status="unavailable",
                    configured=True,
                    enabled=True,
                    key_path=self.key_path,
                    certificate_path=self.certificate_path,
                    algorithm=self.algorithm,
                    signature_bytes=None,
                    detail=detail,
                )

            with open(signature_path, "rb") as handle:
                signature_bytes = handle.read()

        return DetachedSignatureResult(
            status="signed",
            configured=True,
            enabled=True,
            key_path=self.key_path,
            certificate_path=self.certificate_path,
            algorithm=self.algorithm,
            signature_bytes=signature_bytes,
            detail="Detached manifest signature created.",
        )
