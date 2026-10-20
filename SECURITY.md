# Security Policy

## Supported Versions

Security fixes are generally provided for the latest published extension version.

| Version | Supported   |
| ------- | ----------- |
| Latest  | Yes         |
| Older   | Best effort |

## Reporting a Vulnerability

Please do not open public issues for suspected security vulnerabilities.

Use one of the following channels:

1. Preferred: GitHub Security Advisories (private vulnerability report)
2. Alternative: Contact the repository owner directly through their GitHub profile contact channel

Include the following details where possible:

1. Affected version and environment (VS Code version, OS)
2. Reproduction steps or proof of concept
3. Impact assessment (what can be exploited and by whom)
4. Suggested mitigation (if known)

## Response Process

1. Acknowledgment target: within 5 business days
2. Initial triage: severity and reproducibility assessment
3. Remediation: fix, validation, and release planning
4. Disclosure: coordinated public disclosure after a fix is available when practical

## Scope Notes

This project includes webview code and command execution integration with external tooling (`3dm`). Reports involving command injection, unsafe URI/resource loading, or privilege escalation are high priority.
