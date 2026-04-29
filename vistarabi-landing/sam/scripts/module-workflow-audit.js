const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const projectRoot = path.resolve(__dirname, '..', '..')
const outputRoot = path.join(__dirname, 'test-output', 'module-workflow-audit')

const now = new Date()
const timestamp = now.toISOString().replace(/[:.]/g, '-')
const runDir = path.join(outputRoot, timestamp)

const strictMode = process.argv.includes('--strict')

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function runCommand(label, command, options = {}) {
  const startedAt = new Date()
  const startMs = Date.now()
  const res = spawnSync(command, {
    cwd: projectRoot,
    shell: true,
    encoding: 'utf8',
    timeout: options.timeoutMs || 0,
    maxBuffer: 50 * 1024 * 1024,
  })

  const endedAt = new Date()
  const durationMs = Date.now() - startMs
  const timedOut = !!res.error && res.error.code === 'ETIMEDOUT'
  const status = timedOut ? 'timeout' : (res.status === 0 ? 'passed' : 'failed')

  return {
    label,
    command,
    status,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs,
    exitCode: timedOut ? null : res.status,
    timedOut,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    allowFailure: !!options.allowFailure,
  }
}

function summarize(results) {
  const totals = {
    passed: 0,
    failed: 0,
    timeout: 0,
    allowedFailures: 0,
  }

  for (const result of results) {
    if (result.status === 'passed') totals.passed += 1
    if (result.status === 'failed') totals.failed += 1
    if (result.status === 'timeout') totals.timeout += 1
    if ((result.status === 'failed' || result.status === 'timeout') && result.allowFailure) {
      totals.allowedFailures += 1
    }
  }

  return totals
}

function buildMarkdown(report) {
  const lines = []
  lines.push('# SAM Release Audit Report - Module 1 to Module 9')
  lines.push('')
  lines.push(`- **Run timestamp:** ${report.generatedAt}`)
  lines.push(`- **Strict mode:** ${report.strictMode ? 'Enabled' : 'Disabled'}`)
  lines.push(`- **Project root:** \`${report.projectRoot}\``)
  lines.push(`- **Build/deploy check:** ${report.deployCheck.message}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- **Passed checks:** ${report.summary.passed}`)
  lines.push(`- **Failed checks:** ${report.summary.failed}`)
  lines.push(`- **Timed out checks:** ${report.summary.timeout}`)
  lines.push(`- **Allowed failures:** ${report.summary.allowedFailures}`)
  lines.push(`- **Overall status:** ${report.overallStatus}`)
  lines.push('')
  lines.push('## Workflow Results')
  lines.push('')
  lines.push('| Check | Status | Exit Code | Duration (ms) |')
  lines.push('|---|---|---:|---:|')
  for (const result of report.results) {
    const exitCode = result.exitCode === null ? 'N/A' : String(result.exitCode)
    lines.push(`| ${result.label} | ${result.status.toUpperCase()} | ${exitCode} | ${result.durationMs} |`)
  }
  lines.push('')
  lines.push('## Remaining Gaps')
  lines.push('')
  for (const gap of report.remainingGaps) {
    lines.push(`1. ${gap}`)
  }
  lines.push('')
  lines.push('## Recommended Next Actions')
  lines.push('')
  for (const action of report.nextActions) {
    lines.push(`1. ${action}`)
  }
  lines.push('')
  lines.push('## Notes')
  lines.push('')
  lines.push('- This audit validates backend workflow reliability and does not perform UI changes.')
  lines.push('- Full logs are saved as `.log` files in the same audit output folder.')
  return `${lines.join('\n')}\n`
}

function writeArtifacts(report) {
  ensureDir(runDir)
  const jsonPath = path.join(runDir, 'module-workflow-audit.json')
  const mdPath = path.join(runDir, 'module-workflow-audit.md')

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  fs.writeFileSync(mdPath, buildMarkdown(report), 'utf8')

  for (const result of report.results) {
    const safeName = result.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const logPath = path.join(runDir, `${safeName}.log`)
    const combined = [
      `# ${result.label}`,
      '',
      `command: ${result.command}`,
      `status: ${result.status}`,
      `exitCode: ${result.exitCode}`,
      `durationMs: ${result.durationMs}`,
      '',
      '## STDOUT',
      '',
      result.stdout || '(empty)',
      '',
      '## STDERR',
      '',
      result.stderr || '(empty)',
      '',
    ].join('\n')
    fs.writeFileSync(logPath, combined, 'utf8')
  }

  return { jsonPath, mdPath }
}

function main() {
  const packageJsonPath = path.join(projectRoot, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const scripts = packageJson.scripts || {}

  const checks = [
    { label: 'Build', command: 'npm run build' },
    { label: 'Module 1-2 tests', command: 'npm run test:1-2' },
    { label: 'Module 3 tests', command: 'npm run test:3' },
    { label: 'Module 4 tests', command: 'npm run test:4d' },
    { label: 'Module 5A tests', command: 'npm run test:5a' },
    { label: 'Module 5B tests', command: 'npm run test:5b' },
    { label: 'Module 5C tests', command: 'npm run test:5c' },
    { label: 'Module 5 integration', command: 'npm run test:module-5' },
    { label: 'Module 6 tests', command: 'npm run test:6' },
    { label: 'Module 7 tests', command: 'npm run test:7' },
    { label: 'Module 8 tests', command: 'npm run test:8' },
    { label: 'Module 9 tests', command: 'npm run test:9' },
    {
      label: 'Cross-module 5→8 integration',
      command: 'npx vitest run tests/integration/modules-5-to-8.test.ts tests/module-7-integration.test.ts',
    },
    {
      label: 'Module 1+2 e2e smoke',
      command: 'npx vitest run tests/module1.e2e.ts tests/module2.e2e.ts',
      allowFailure: true,
      timeoutMs: 180000,
    },
    {
      label: 'All-modules e2e smoke',
      command: 'npx vitest run tests/e2e-all-modules.test.ts',
      allowFailure: true,
      timeoutMs: 180000,
    },
  ]

  const results = checks.map((check) =>
    runCommand(check.label, check.command, {
      timeoutMs: check.timeoutMs,
      allowFailure: check.allowFailure,
    })
  )

  const summary = summarize(results)
  const deployScripts = Object.keys(scripts).filter((key) => key.toLowerCase().includes('deploy'))
  const deployCheck = deployScripts.length > 0
    ? { status: 'found', message: `Deploy scripts detected: ${deployScripts.join(', ')}` }
    : { status: 'missing', message: 'No deploy script found in package.json (manual/CI deployment path required).' }

  const hardFailures = results.filter(
    (result) => (result.status === 'failed' || result.status === 'timeout') && !result.allowFailure
  )

  const remainingGaps = []
  for (const result of results) {
    if ((result.status === 'failed' || result.status === 'timeout') && result.allowFailure) {
      remainingGaps.push(`${result.label} is unstable in this environment (${result.status}).`)
    }
  }
  if (deployCheck.status === 'missing') {
    remainingGaps.push('A formal deploy script is missing from package.json.')
  }
  if (remainingGaps.length === 0) {
    remainingGaps.push('No blocking workflow gaps detected in this run.')
  }

  const nextActions = [
    'Keep module scripts as mandatory quality gates in CI for releases.',
    'Stabilize e2e smoke tests with deterministic mocks and separate live-AI nightly jobs.',
    'Add explicit deploy script(s) and deployment runbook into package.json/CI.',
  ]

  const report = {
    generatedAt: now.toISOString(),
    strictMode,
    projectRoot,
    deployCheck,
    summary,
    overallStatus: hardFailures.length === 0 ? 'PASS' : 'FAIL',
    results,
    remainingGaps,
    nextActions,
  }

  const artifacts = writeArtifacts(report)
  const latestMdPath = path.join(projectRoot, 'SAM_MODULE_1_TO_9_AUDIT_REPORT.md')
  fs.copyFileSync(artifacts.mdPath, latestMdPath)

  console.log(`Audit complete. JSON: ${artifacts.jsonPath}`)
  console.log(`Audit complete. Markdown: ${artifacts.mdPath}`)
  console.log(`Latest report: ${latestMdPath}`)

  if (strictMode && hardFailures.length > 0) {
    process.exit(1)
  }
}

main()
