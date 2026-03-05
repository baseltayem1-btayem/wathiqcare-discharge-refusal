"""
validator.py
------------
ICD-11 diagnosis code validator for the WathiqCare Discharge Refusal Module.

The validator checks whether a supplied code conforms to the ICD-11 alphanumeric
format defined by the WHO (e.g. "XY8Z.1", "BA00", "5A11.0").  In a production
deployment this module can be extended to call the official WHO ICD-11 API for
live code look-up.
"""

from __future__ import annotations

import re
from typing import Optional


# ---------------------------------------------------------------------------
# ICD-11 code format
# ---------------------------------------------------------------------------
# The minimal structural pattern accepted by the WHO linearisation:
#   - 2-4 uppercase alphanumeric characters followed by
#   - an optional dot and 1-2 digits (extension code)
# Examples: "BA00", "5A11", "XY8Z.1", "ME84.Z", "XT9T.1"
_ICD11_PATTERN = re.compile(r"^[A-Z0-9]{2,4}(\.[A-Z0-9]{1,2})?$")

# Curated sample set of valid ICD-11 codes used for offline validation and
# testing.  Extend this set or replace with a live API call as required.
_KNOWN_VALID_CODES: frozenset[str] = frozenset(
    {
        # Chapter 1 – Certain infectious or parasitic diseases
        "1A00",
        "1A01",
        "1B10",
        "1C00",
        # Chapter 5 – Endocrine, nutritional or metabolic diseases
        "5A10",
        "5A11",
        # Chapter 6 – Mental, behavioural or neurodevelopmental disorders
        "6A20",
        "6A21",
        # Chapter 8 – Diseases of the nervous system
        "8A00",
        "8A01",
        # Chapter 11 – Diseases of the circulatory system
        "BA00",
        "BA01",
        "BA80",
        # Chapter 13 – Diseases of the digestive system
        "DA90",
        "DA91",
        # Chapter 14 – Diseases of the skin
        "EA90",
        # Chapter 21 – Symptoms, signs or clinical findings
        "MA00",
        "ME84",
        "ME84.Z",
        # Chapter 22 – Injury, poisoning or certain other consequences
        "NF00",
        "NG00",
        # Extension codes (used in tests)
        "XY8Z",
        "XY8Z.1",
        "XT9T",
        "XT9T.1",
    }
)


class ICD11Validator:
    """
    Validates ICD-11 diagnosis codes.

    By default the validator uses an offline curated code set.  Set
    ``strict=False`` to rely only on format validation (useful for
    integration testing when a live code list is not available).
    """

    def __init__(self, strict: bool = True) -> None:
        self._strict = strict

    def is_valid(self, code: str) -> bool:
        """
        Return ``True`` if *code* is a valid ICD-11 code.

        Parameters
        ----------
        code:
            The ICD-11 code string to validate (case-sensitive, uppercase
            expected per WHO specification).
        """
        if not isinstance(code, str) or not code.strip():
            return False
        code = code.strip()
        if not _ICD11_PATTERN.match(code):
            return False
        if self._strict:
            return code in _KNOWN_VALID_CODES
        return True

    def validate_codes(self, codes: list[str]) -> dict[str, bool]:
        """
        Validate a list of ICD-11 codes and return a mapping of
        ``{code: is_valid}``.
        """
        return {code: self.is_valid(code) for code in codes}

    def get_invalid_codes(self, codes: list[str]) -> list[str]:
        """Return only the codes from *codes* that fail validation."""
        return [c for c in codes if not self.is_valid(c)]

    @staticmethod
    def normalize(code: str) -> Optional[str]:
        """
        Return the normalised (stripped, uppercase) form of *code*, or
        ``None`` if the code is empty.
        """
        if not isinstance(code, str):
            return None
        normalised = code.strip().upper()
        return normalised if normalised else None
