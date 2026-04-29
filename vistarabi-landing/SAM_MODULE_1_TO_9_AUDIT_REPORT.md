# SAM Release Audit Report - Module 1 to Module 9

- **Run timestamp:** 2026-04-29T19:57:21.954Z
- **Strict mode:** Enabled
- **Project root:** `C:\Projects\VistaraBI\vistarabi-landing`
- **Build/deploy check:** No deploy script found in package.json (manual/CI deployment path required).

## Summary

- **Passed checks:** 13
- **Failed checks:** 1
- **Timed out checks:** 1
- **Allowed failures:** 2
- **Overall status:** PASS

## Workflow Results

| Check | Status | Exit Code | Duration (ms) |
|---|---|---:|---:|
| Build | PASSED | 0 | 55280 |
| Module 1-2 tests | PASSED | 0 | 2583 |
| Module 3 tests | PASSED | 0 | 2280 |
| Module 4 tests | PASSED | 0 | 2649 |
| Module 5A tests | PASSED | 0 | 2951 |
| Module 5B tests | PASSED | 0 | 3219 |
| Module 5C tests | PASSED | 0 | 2374 |
| Module 5 integration | PASSED | 0 | 3499 |
| Module 6 tests | PASSED | 0 | 4553 |
| Module 7 tests | PASSED | 0 | 2386 |
| Module 8 tests | PASSED | 0 | 2876 |
| Module 9 tests | PASSED | 0 | 2559 |
| Cross-module 5→8 integration | PASSED | 0 | 3442 |
| Module 1+2 e2e smoke | FAILED | 1 | 3102 |
| All-modules e2e smoke | TIMEOUT | N/A | 180018 |

## Remaining Gaps

1. Module 1+2 e2e smoke is unstable in this environment (failed).
1. All-modules e2e smoke is unstable in this environment (timeout).
1. A formal deploy script is missing from package.json.

## Recommended Next Actions

1. Keep module scripts as mandatory quality gates in CI for releases.
1. Stabilize e2e smoke tests with deterministic mocks and separate live-AI nightly jobs.
1. Add explicit deploy script(s) and deployment runbook into package.json/CI.

## Notes

- This audit validates backend workflow reliability and does not perform UI changes.
- Full logs are saved as `.log` files in the same audit output folder.
