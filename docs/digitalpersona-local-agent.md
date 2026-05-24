# HID DigitalPersona 4500 Local Agent Notes

WathiqCare biometric verification for informed consent is implemented as a local-agent abstraction only.

Architecture:

- DigitalPersona 4500 USB reader
- HID DigitalPersona Driver/SDK
- WathiqCare Biometric Local Agent
- Browser signing panel
- WathiqCare signature evidence API

Local browser endpoint:

- `http://localhost:8787/biometric/verify`

Returned payload only:

- `verified`
- `deviceReference`
- `transactionId`
- `timestamp`
- `verificationHash`
- `method`
- `sdkProvider: HID DigitalPersona`
- `deviceModel: DigitalPersona 4500`

Never store:

- raw fingerprint image
- fingerprint template
- biometric sample
- minutiae data

Implementation notes:

- HID DigitalPersona SDK or approved HID driver is required.
- Windows Hello WBF driver alone is not sufficient for full WathiqCare evidence integration.
- Production activation requires Legal, PDPL, Cybersecurity, and vendor SDK approval.
- UAT may use mock local-agent responses until HID SDK installation is confirmed.