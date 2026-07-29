# Security Policy

## Reporting a vulnerability

Please report security issues privately to **security@72street.ai**.

Do **not** open a public GitHub issue for a suspected vulnerability, and please do
not disclose it publicly until we have had a chance to respond.

Include whatever you can:

- What the issue is and why you believe it is a security problem
- Steps to reproduce, or a proof of concept
- The affected component (`aws.72street.ai`, the API, the frontend bundle)
- Anything you know about impact — what an attacker could read, change or cost us

## What to expect

| Stage | Target |
|---|---|
| Acknowledgement of your report | 3 business days |
| Initial assessment and severity | 7 business days |
| Fix or documented mitigation for High/Critical | 30 days |

If we disagree with your severity assessment, we will explain why rather than
quietly downgrade it.

## Scope

In scope:

- `https://aws.72street.ai` and its `/api/v1/*` endpoints
- This repository and the frontend repository

Out of scope:

- Denial of service through sheer volume, and automated scanner output with no
  demonstrated impact
- Findings that require a compromised device, a rooted browser, or physical access
- Missing hardening headers with no demonstrated exploit path — we are interested,
  but please describe the actual attack rather than only citing a scanner grade
- Social engineering of 72 Street staff

## Safe harbour

We will not pursue legal action for good-faith research that respects the scope
above, avoids privacy violations and service degradation, and gives us reasonable
time to remediate before disclosure.

Please do not access, modify or retain data belonging to other users. If you
encounter personal data during testing, stop and tell us.

## Handling of financial and personal data

This product processes personal and financial information for Indian retail
investors. Reports touching data isolation between users, portfolio holdings, or
authentication are treated as our highest priority.
