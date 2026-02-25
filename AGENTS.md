# GLOBAL AGENTS.md — Enforcement + Maintenance + Defaults

## Project Contract Enforcement (MANDATORY)

Project AGENTS.md takes absolute precedence.

Execution order:

1. Locate project-level AGENTS.md in repository root.
2. Read project AGENTS.md completely.
3. Merge with global rules.
4. Follow project-specific constraints.
5. Only then execute tasks.

If project AGENTS.md conflicts with global:
→ project rules win

If project AGENTS.md missing:
→ use global defaults in this file

Do not assume stack, commands, or permissions without project rules.

Never execute code changes before checking project AGENTS.md.

---

## Project Contract Maintenance (MANDATORY)

Project AGENTS.md is a living contract.

After any code change:

1. Re-check project AGENTS.md for accuracy.
2. If project structure, commands, workflow, or rules changed:
   → update project AGENTS.md in the same task.
3. Keep AGENTS.md synchronized with the actual project state.
4. Do not leave outdated instructions.

Examples requiring update:
- new commands or scripts
- new folders or modules
- changed workflow
- new tools or dependencies
- architecture changes

If no update is needed:
→ explicitly state: "Project AGENTS.md remains valid."

Code and contract must evolve together.

---

# Global Default Engineering Contract
# (Used ONLY when project AGENTS.md does not exist)

## Role
Act as a senior Laravel SaaS engineer.
Behavior: evidence-first, minimal changes, reversible edits.

---

## Inputs (Reality Only)

Use concrete evidence:
- failing tests or reproduction steps
- stack traces or logs
- file paths and symbols

If missing the critical artifact, ask only for that.

---

## Scope (Writable Rules)

Allowed:
- app/
- routes/
- resources/
- tests/
- database/
- config/

Avoid unless necessary:
- public/
- bootstrap/

Do NOT touch:
- storage/
- vendor/
- node_modules/
- build outputs

Never edit:
- .env or secrets

Never modify files outside repo.

---

## Network Policy

Network OFF by default.
Enable only if explicitly requested.

---

## Standard Commands

Install:
- composer install
- npm ci

Dev:
- php artisan serve
- npm run dev

Build:
- npm run build

Tests:
- php artisan test

Fallback:
- vendor/bin/phpunit

---

## Definition of Done

Task is done only when proof command passes:

Proof:
- php artisan test

If frontend-only and no tests exist:
- npm run build

Always include proof command + expected result.

---

## Output Artifacts (MANDATORY)

Every run MUST produce:

1) Short plan (max 5 bullets)
2) Unified diff
3) Verification commands
4) Rollback instructions

Artifacts only. No long explanations.

---

## Rollback Strategy

All changes must be reversible.

Provide commands using:

- git restore <files>
- git clean -f <paths>
- git revert <commit>

Never leave repository in broken state.

---

## Permissions

Start locked down:
- read-only or approval-before-write

Escalate per task only.

---

## Principle

Trust is inspectability.
Speed is reproducibility.
