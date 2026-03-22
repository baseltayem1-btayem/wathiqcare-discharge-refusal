import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMagicLinkRequestDecision } from "./magic-link-auth";

test("request decision rejects invalid email", () => {
    const decision = evaluateMagicLinkRequestDecision({
        validEmail: false,
        domainAllowed: false,
        userExists: false,
        userDomainEligible: false,
    });

    assert.equal(decision, "INVALID_EMAIL");
});

test("request decision rejects non-allowlisted domains", () => {
    const decision = evaluateMagicLinkRequestDecision({
        validEmail: true,
        domainAllowed: false,
        userExists: false,
        userDomainEligible: false,
    });

    assert.equal(decision, "DOMAIN_NOT_ALLOWED");
});

test("request decision keeps unknown users generic internally", () => {
    const decision = evaluateMagicLinkRequestDecision({
        validEmail: true,
        domainAllowed: true,
        userExists: false,
        userDomainEligible: false,
    });

    assert.equal(decision, "USER_NOT_FOUND");
});

test("request decision rejects mismatched tenant domain for known user", () => {
    const decision = evaluateMagicLinkRequestDecision({
        validEmail: true,
        domainAllowed: true,
        userExists: true,
        userDomainEligible: false,
    });

    assert.equal(decision, "USER_DOMAIN_MISMATCH");
});

test("request decision allows eligible requests", () => {
    const decision = evaluateMagicLinkRequestDecision({
        validEmail: true,
        domainAllowed: true,
        userExists: true,
        userDomainEligible: true,
    });

    assert.equal(decision, null);
});
