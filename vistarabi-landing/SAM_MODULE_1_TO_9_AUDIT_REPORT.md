# SAM Release Audit Report - Module 1 to Module 9

- **Run timestamp:** 2026-05-02T15:11:18.281Z
- **Strict mode:** Disabled
- **Project root:** `C:\Projects\VistaraBI\vistarabi-landing`
- **Build/deploy check:** No deploy script found in package.json (manual/CI deployment path required).

## Summary

- **Passed checks:** 11
- **Failed checks:** 4
- **Timed out checks:** 0
- **Allowed failures:** 2
- **Overall status:** FAIL

## Workflow Results

| Check | Status | Exit Code | Duration (ms) |
|---|---|---:|---:|
| Build | PASSED | 0 | 51992 |
| Module 1-2 tests | PASSED | 0 | 2561 |
| Module 3 tests | PASSED | 0 | 2343 |
| Module 4 tests | PASSED | 0 | 2672 |
| Module 5A tests | FAILED | 1 | 3094 |
| Module 5B tests | PASSED | 0 | 3226 |
| Module 5C tests | PASSED | 0 | 2464 |
| Module 5 integration | FAILED | 1 | 3702 |
| Module 6 tests | PASSED | 0 | 4684 |
| Module 7 tests | PASSED | 0 | 2481 |
| Module 8 tests | PASSED | 0 | 2950 |
| Module 9 tests | PASSED | 0 | 2664 |
| Cross-module 5→8 integration | PASSED | 0 | 3711 |
| Module 1+2 e2e smoke | FAILED | 1 | 3381 |
| All-modules e2e smoke | FAILED | 1 | 3377 |

## Remaining Gaps

1. Module 1+2 e2e smoke is unstable in this environment (failed).
1. All-modules e2e smoke is unstable in this environment (failed).
1. A formal deploy script is missing from package.json.

## Recommended Next Actions

1. Keep module scripts as mandatory quality gates in CI for releases.
1. Stabilize e2e smoke tests with deterministic mocks and separate live-AI nightly jobs.
1. Add explicit deploy script(s) and deployment runbook into package.json/CI.

## Notes

- This audit validates backend workflow reliability and does not perform UI changes.
- Full logs are saved as `.log` files in the same audit output folder.
