# Security Policy

## Reporting a vulnerability

Email **careervedatools@gmail.com** with the subject line `SECURITY`.

Please include:

- what the issue is and which component it affects (public site, admin panel, or API)
- the steps to reproduce it, or a proof of concept
- what an attacker gets out of it

Please do **not** open a public GitHub issue for a security problem, and please
do not test against the live site — `npm run dev` brings up the whole stack
locally against an in-memory database, which is a safer place to demonstrate a
finding.

### What to expect

- an acknowledgement within **3 working days**
- an assessment, and a fix or an explanation of why it is not one, within **14 days**
- credit in the release notes if you would like it

We do not operate a paid bug bounty.

## Supported versions

This repository deploys a single production site. Only the current `main` branch
is supported; there are no maintained release branches or backports.

## Scope

In scope:

- the Express API under `backend/`
- the admin panel under `admin/`
- the public site at the repository root
- the deployment configuration (`Dockerfile`, `cloudbuild.yaml`, `Jenkinsfile`)

Out of scope:

- findings that only affect a fork or a local development configuration
- missing hardening headers with no demonstrated impact
- vulnerabilities in third-party services (ImageKit, MongoDB Atlas, Google Cloud
  Run) — report those to the vendor
- automated scanner output submitted without a working reproduction

## Automated scanning

There is currently **no automated scanning**. CodeQL, Semgrep, Trivy, OSV,
Scorecard and Dependabot all ran from GitHub Actions, which was removed; the
Jenkins pipeline (`Jenkinsfile`) is a test-and-build gate on what reaches `main`
and runs none of them.

What remains is manual and only as current as the last time someone ran it:
gitleaks on commit (`.pre-commit-config.yaml`), and `npm audit` / `osv-scanner`
(`osv-scanner.toml`) by hand. Base image digests in the Dockerfiles are likewise
pinned and no longer bumped by anything automatic.

Treat a dependency or container finding as un-triaged until proven otherwise
rather than assuming a scanner already caught it.
