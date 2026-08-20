# Project Documents

This directory stores dated audits, implementation decisions, and release-readiness reports for the public site.

## Naming

- Use `audit-YYYY-MM.md` for site-wide audits.
- Use `adsense-readiness-YYYY-MM-DD.md` for approval-readiness decisions.
- Keep the reusable component contract in `ui-system.md`; new page UI must extend it instead of creating a parallel style vocabulary.
- Keep generated raw data out of this directory; audit scripts should print deterministic output that can be regenerated.

## Scope

- Git remains the source of truth for code and deployment history.
- Obsidian remains the source of truth for external research and evidence.
- Documents here explain repository-level findings and implementation decisions only.

## Validation

Run `node scripts/check-all.cjs` before a release or push. It verifies generated files, content semantics, navigation, search, maps, index policy, and internal links.
