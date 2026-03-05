from app.services.icd11_service import get_code_description, is_refusal_high_risk, validate_codes


def test_validate_valid_codes():
    result = validate_codes(["I10", "E11.9", "Z00.0"])
    assert result.valid is True
    assert result.invalid_codes == []


def test_validate_invalid_codes():
    result = validate_codes(["I10", "INVALID_CODE"])
    assert result.valid is False
    assert "INVALID_CODE" in result.invalid_codes


def test_validate_empty_codes():
    result = validate_codes([])
    assert result.valid is True


def test_get_code_description_valid():
    desc = get_code_description("I10")
    assert desc != "Unknown code"
    assert len(desc) > 0


def test_get_code_description_invalid():
    desc = get_code_description("XXXXX")
    assert desc == "Unknown code"


def test_is_refusal_high_risk_true():
    assert is_refusal_high_risk(["XY9Z"]) is True


def test_is_refusal_high_risk_false():
    assert is_refusal_high_risk(["I10", "Z00.0"]) is False


def test_is_refusal_high_risk_mixed():
    assert is_refusal_high_risk(["I10", "C34.9"]) is True


def test_validate_returns_descriptions():
    result = validate_codes(["I10", "E11.9"])
    assert "I10" in result.descriptions
    assert "E11.9" in result.descriptions
