---
name: project-verification
description: Run safe, scope-appropriate project checks and report their evidence.
---

# Project Verification

1. Identify checks applicable to the changed behavior.
2. Run targeted checks during implementation.
3. After substantial application or behavior changes, run the project's full canonical verifier: `npm run verify`.
4. Run the full verifier before opening a pull request, deploying, publishing, or making a readiness claim.
5. Do not treat a dry run as evidence.
6. Confirm the run is non-destructive and does not perform unauthorized paid calls, live mutations, deployment, or publishing.
7. Record exit code `0` for passed, `1` for failed, or `2` for not assessed.
8. Fix in-scope failures and rerun verification.
9. Report missing checks as a gap; never convert not assessed into pass.
10. Confirm pre-existing dirty files remain intact and report generated changes.
11. Report checks run, checks omitted, results, and remaining risk.
