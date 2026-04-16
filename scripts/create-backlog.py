#!/usr/bin/env python3
"""
WathiqCare GitHub Backlog Generator
Uses GitHub REST API to create epics, stories, and tasks
"""

import os
import requests
import json
from typing import Optional

# Configuration
OWNER = "baseltayem1-btayem"
REPO = "wathiqcare-discharge-refusal"
TOKEN = os.environ.get("GITHUB_TOKEN", "")
BASE_URL = "https://api.github.com"

def get_headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }

def create_label(name: str, color: str, description: str) -> bool:
    """Create a GitHub label."""
    if not TOKEN:
        print(f"⚠️  Skipping label {name} (no token)")
        return False
    
    url = f"{BASE_URL}/repos/{OWNER}/{REPO}/labels"
    data = {
        "name": name,
        "color": color,
        "description": description,
    }
    
    try:
        resp = requests.post(url, json=data, headers=get_headers())
        if resp.status_code in [201, 422]:  # 422 = already exists
            print(f"✅ Label: {name}")
            return True
        else:
            print(f"❌ Label {name}: {resp.status_code} {resp.text}")
            return False
    except Exception as e:
        print(f"❌ Label {name}: {e}")
        return False

def create_milestone(title: str, description: str) -> Optional[int]:
    """Create a GitHub milestone and return ID."""
    if not TOKEN:
        print(f"⚠️  Skipping milestone {title} (no token)")
        return None
    
    url = f"{BASE_URL}/repos/{OWNER}/{REPO}/milestones"
    data = {
        "title": title,
        "description": description,
    }
    
    try:
        resp = requests.post(url, json=data, headers=get_headers())
        if resp.status_code == 201:
            milestone = resp.json()
            print(f"✅ Milestone: {title} (#{milestone['number']})")
            return milestone['number']
        elif resp.status_code == 422:
            print(f"ℹ️  Milestone {title} already exists")
            return None
        else:
            print(f"❌ Milestone {title}: {resp.status_code}")
            return None
    except Exception as e:
        print(f"❌ Milestone {title}: {e}")
        return None

def create_issue(title: str, body: str, labels: list, milestone: Optional[int] = None) -> Optional[dict]:
    """Create a GitHub issue."""
    if not TOKEN:
        print(f"⚠️  Skipping issue {title} (no token)")
        return None
    
    url = f"{BASE_URL}/repos/{OWNER}/{REPO}/issues"
    data = {
        "title": title,
        "body": body,
        "labels": labels,
    }
    
    if milestone:
        data["milestone"] = milestone
    
    try:
        resp = requests.post(url, json=data, headers=get_headers())
        if resp.status_code == 201:
            issue = resp.json()
            print(f"✅ Issue: {title} (#{issue['number']})")
            return issue
        else:
            print(f"❌ Issue {title}: {resp.status_code}")
            return None
    except Exception as e:
        print(f"❌ Issue {title}: {e}")
        return None

def main():
    print("🚀 WathiqCare GitHub Backlog Generator")
    print("=" * 50)
    
    if not TOKEN:
        print("⚠️  GITHUB_TOKEN not set. Skipping API calls.")
        print("To enable: export GITHUB_TOKEN=<your_token>")
        print("\nThis script will print issue templates instead.")
        print("=" * 50)
    
    # Create labels
    print("\n📌 Creating labels...")
    labels_config = [
        ("epic", "6f42c1", "Epic issue"),
        ("story", "0969da", "User story"),
        ("task", "1f6feb", "Task item"),
        ("legal", "d1242f", "Legal/compliance scope"),
        ("security", "da3633", "Security scope"),
        ("ux", "e08e0a", "UX/design scope"),
        ("integration", "2da44e", "Integration scope"),
        ("ops", "8250df", "Operations/infra scope"),
        ("high", "ff6a00", "High priority"),
        ("medium", "ffc837", "Medium priority"),
        ("low", "90ee90", "Low priority"),
    ]
    
    for name, color, desc in labels_config:
        create_label(name, color, desc)
    
    # Create milestones
    print("\n📅 Creating milestones...")
    milestones = {
        "M1": create_milestone("M1: Legal Closure (Weeks 1–2)", "PKI, TSA, Verifier"),
        "M2": create_milestone("M2: UX Simplification (Weeks 3–4)", "3-step flow, templates, autofill"),
        "M3": create_milestone("M3: IMC Pilot (Weeks 5–6)", "ER/IPD deployment, metrics"),
        "M4": create_milestone("M4: Trust & Court Pack (Weeks 7–8)", "Cover page, timeline, export"),
        "M5": create_milestone("M5: Integrations (Weeks 9–12)", "EMR, SMS, e-Sign"),
    }
    
    # EPIC 1
    print("\n🎯 Creating EPIC 1 & Stories...")
    epic1 = create_issue(
        "EPIC: Legal Closure (PKI + TSA + Verifier)",
        """Enable medico-legal evidence integrity verification for court acceptance.

## Business Value
- Court-ready discharge bundles
- Non-repudiation compliance
- Trust & accountability

## Acceptance Criteria
- [ ] PKCS#7 manifest signatures generated and validated
- [ ] RFC3161 TSA timestamps integrated and verified
- [ ] Verifier CLI tool functional for local verification
- [ ] `/api/verify` endpoint operational
- [ ] All tests passing (unit, integration, production smoke)
- [ ] Zero breaking changes in existing discharge workflow

## Stories
- Story 1.1: Implement PKCS#7 Manifest Signature
- Story 1.2: Implement RFC3161 TSA Integration
- Story 1.3: Build Verifier CLI + API
""",
        ["epic", "legal", "security", "high"],
        milestones.get("M1")
    )
    
    # Create EPIC 1 Stories
    story_1_1 = create_issue(
        "Story: Implement PKCS#7 Manifest Signature",
        """Implement PKCS#7 signing for discharge bundle manifests.

## Acceptance Criteria
- [ ] jsrsasign/node-jose signing library integrated
- [ ] Manifest JSON serialization + canonical ordering
- [ ] Signature file (manifest.sig) generated and attached
- [ ] Signature validation in verifier returns trusted/untrusted status

## Related Tasks
- Task 1.1.1: Add signing library
- Task 1.1.2: Create SignatureManager class
- Task 1.1.3: Generate canonical JSON + PKCS#7 signature
- Task 1.1.4: Attach .sig file to bundle
- Task 1.1.5: Add unit tests
""",
        ["story", "legal", "security", "high"],
        milestones.get("M1")
    )
    
    story_1_2 = create_issue(
        "Story: Implement RFC3161 TSA Integration",
        """Integrate RFC3161 TSA (Time Stamping Authority) for non-repudiation timestamps.

## Acceptance Criteria
- [ ] TSA client configured for test/production servers
- [ ] Timestamp token (.tsr) generated and validated
- [ ] Token attached to bundle with metadata
- [ ] Verifier can parse and validate RFC3161 tokens

## Related Tasks
- Task 1.2.1: Integrate TSA library
- Task 1.2.2: Configure TSA endpoint
- Task 1.2.3: Implement timestamp request/response cycle
- Task 1.2.4: Attach .tsr token to bundle
- Task 1.2.5: Add TSA validation
""",
        ["story", "legal", "security", "high"],
        milestones.get("M1")
    )
    
    story_1_3 = create_issue(
        "Story: Build Verifier CLI + API",
        """Create CLI and HTTP API for evidence bundle verification.

## Acceptance Criteria
- [ ] CLI: `wathiq-verify bundle.zip → valid/invalid + details`
- [ ] API: `GET /api/verify?bundleId=xxx → {valid, signature, timestamp, metadata}`
- [ ] Both report signature status, TSA chain, manifest integrity
- [ ] Clear error messages (missing sig, invalid sig, trusted CA, expired, etc.)

## Related Tasks
- Task 1.3.1: Create verifier CLI entry point
- Task 1.3.2: Implement signature validation logic
- Task 1.3.3: Implement TSA token validation logic
- Task 1.3.4: Create /api/verify endpoint
- Task 1.3.5: Add comprehensive tests
- Task 1.3.6: Document usage
""",
        ["story", "legal", "security", "high"],
        milestones.get("M1")
    )
    
    print("\n📝 Summary")
    print("=" * 50)
    print(f"✅ 1 Epic + 3 Stories created for EPIC 1")
    print(f"✅ Labels created: {len(labels_config)}")
    print(f"✅ Milestones created: {len(milestones)}")
    print("\n🚀 Next steps:")
    print("1. Start Task 1.1.1: Add signing library")
    print("2. Start Task 1.2.1: Integrate TSA library")
    print("3. Start Task 1.3.1: Create verifier CLI entry point")
    print("\n📊 GitHub Issues: https://github.com/{}/{}/issues".format(OWNER, REPO))

if __name__ == "__main__":
    main()
