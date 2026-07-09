# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (main branch) | ✅ Active security patches |
| Any previous tagged release | ❌ No longer supported |

## Automated Security Controls

Every production deployment is gated by:

1. **`pnpm audit --prod`** — blocks deployment if any known production CVE is found.
2. **`pnpm test`** — blocks deployment if any of the 54 unit tests fail.
3. **Monthly automated dependency review** — an agent runs on the 1st of each month, patches any production CVEs, runs tests, and commits the result.
4. **GitHub Dependabot** — opens PRs for dependency updates within 24–48 hours of a new CVE advisory.

Current status: `pnpm audit --prod` reports **zero known vulnerabilities** (last verified July 2026).

## CVE Response SLA

| Severity | Scope | Target Patch Time |
|----------|-------|-------------------|
| Critical / High | Production dependencies | Within 48 hours of advisory |
| Moderate | Production dependencies | Within 7 days |
| Any | Dev-only tools (never shipped) | Next monthly review cycle |
| Low | Any | Next monthly review cycle |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately via email:

**security@getphame.app**

Include:
- A description of the vulnerability
- Steps to reproduce
- Your assessment of impact
- Any suggested fix (optional)

We will:
- Acknowledge your report within **24 hours**
- Provide a status update within **72 hours**
- Patch critical/high issues within **48 hours** of confirmation
- Credit you in the changelog (unless you prefer anonymity)

## Scope

**In scope:**
- getphame.app and all subdomains
- The GetPhame web application and API
- Authentication flows (Google OAuth, Apple Sign In, magic links)
- Data handling and storage

**Out of scope:**
- Denial of service attacks
- Social engineering
- Physical security
- Third-party services (Stripe, Google, Apple) — report those to the vendor directly

## Full Security Policy

See the live security policy at [getphame.app/security](https://getphame.app/security).
