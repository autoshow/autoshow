# Quality Gates Orchestrator Prompt

## Quality Gates Execution Request

Execute all five quality gates for the specified codebase, focusing on **comprehensive validation** of code quality, security, test coverage, and AI-generated code review. The orchestrator should provide real-time tracking through markdown documentation and make objective deployment decisions based on gate results.

Abide by best practices for quality gate execution, ensuring that all gates are executed systematically with proper documentation, audit trails, and clear pass/fail criteria.

## Quality Gates Configuration

This section contains the specific settings and configurations required for executing the five quality gates. Prior to running this prompt, ensure that the settings are filled out with the necessary information for your specific codebase and quality requirements.

Any settings that are not specified will be set to default values. The default values are provided in `[square brackets]`.

### Basic Project Information
1. Codebase to analyze: 
   - `[Project Directory (./) or specify path]`

2. Programming language(s):
   - `[Python, Java, C#, TypeScript, JavaScript, Go, etc. (Default: Auto-detect)]`

3. Branch to analyze:
   - `[main, develop, feature/branch-name (Default: current branch)]`

4. Commit hash for analysis:
   - `[Specific commit hash or "HEAD" (Default: HEAD)]`

5. Project type:
   - `[web-api, microservice, library, frontend, full-stack (Default: Auto-detect)]`

### Gate 1: Code Coverage Configuration
1. Coverage threshold requirements:
   - Measure coverage with Bun `lcov` when coverage is explicitly requested
   - Minimum overall line coverage: `[44% (Default for this repo)]`
   - Minimum overall function coverage: `[55% (Default for this repo)]`
   - Branch coverage: `[Informational when Bun omits branch counters]`

2. Coverage exclusions:
   - Files/directories to exclude: `[test/, spec/, __pycache__/, or "None"]`
   - Pattern exclusions: `[*.test.*, *_test.*, or "None"]`

3. Critical path coverage requirements:
   - Review repo-defined critical paths when coverage data is available
   - Default critical paths for this repo:
     - `src/utils/logging.ts`: `70%` line coverage
     - `src/utils/logging-internals.ts`: `90%` line coverage
     - `src/utils/security-config.ts`: `85%` line coverage
     - `src/routes/api/process/form-helpers/build-options.ts`: `75%` line coverage
     - `src/routes/api/process/form-helpers/security.ts`: `80%` line coverage
     - `src/database/notes/create-show-note.ts`: `95%` line coverage
     - `src/routes/api/process/05-run-tts/tts-services/run-groq-tts.ts`: `65%` line coverage
     - `src/routes/api/process/07-run-music/run-music.ts`: `90%` line coverage

### Gate 2: Security Scanning Configuration
1. Security scanning tools to use:
   - Static analysis: `[Bandit for Python, SonarQube, CodeQL, or "Default"]`
   - Dependency scanning: `[Safety, npm audit, OWASP, or "Default"]`
   - Secret detection: `[GitLeaks, TruffleHog, or "Default"]`

2. Security severity thresholds:
   - Block on: `[CRITICAL, HIGH (Default)]`
   - Warn on: `[MEDIUM (Default)]`
   - Info only: `[LOW (Default)]`

3. Allowed vulnerabilities list:
   - Accepted risks: `[List CVE numbers or "None"]`
   - Risk acceptance expiry: `[Date or "Not applicable"]`

### Gate 3: Test Execution Configuration
1. Test suites to execute:
   - Unit tests: `[Yes (Default)]`
   - Integration tests: `[Yes (Default)]`
   - End-to-end tests: `[Optional based on project type]`

2. Test execution requirements:
   - Minimum pass rate: `[100% (Default)]`
   - Maximum test duration: `[30 minutes (Default)]`
   - Flaky test tolerance: `[0 failures (Default)]`

3. Test categories:
   - Performance tests: `[Run if available]`
   - Security tests: `[Run if available]`
   - Accessibility tests: `[Run if applicable]`

### Gate 4: Code Quality Metrics Configuration
1. Complexity thresholds:
   - Cyclomatic complexity: `[10 per function (Default)]`
   - Cognitive complexity: `[15 per function (Default)]`
   - Maintainability index: `[20 minimum (Default)]`

2. Code quality tools:
   - Linting: `[ESLint, Pylint, RuboCop, or language default]`
   - Code analysis: `[SonarQube, CodeClimate, or "Default"]`
   - Formatting: `[Prettier, Black, gofmt, or language default]`

3. Quality gate thresholds:
   - Technical debt ratio: `[<5% (Default)]`
   - Duplication percentage: `[<3% (Default)]`
   - Code smells: `[<10 per 1000 lines (Default)]`

### Gate 5: AI-Generated Code Review Configuration
1. AI review focus areas:
   - Code patterns: `[Anti-patterns, best practices, design patterns]`
   - Performance: `[Algorithm efficiency, resource usage]`
   - Maintainability: `[Readability, documentation, modularity]`
   - Security: `[Vulnerability patterns, secure coding practices]`

2. AI review tools:
   - Primary reviewer: `[GitHub Copilot, DeepCode, Amazon CodeGuru (Default: GitHub Copilot)]`
   - Secondary analysis: `[Additional AI tools or "None"]`

3. Review severity levels:
   - Block deployment: `[Critical design flaws, security anti-patterns]`
   - Warning: `[Performance issues, maintainability concerns]`
   - Info: `[Suggestions, best practice recommendations]`

### Progress Tracking Configuration
1. Progress documentation file:
   - File location: `[progress.md (Default)]`
   - Update frequency: `[Real-time (Default)]`
   - Include timestamps: `[Yes (Default)]`

2. Status indicators:
   - Use emoji: `[Yes (Default) - 🔄 ✅ ⚠️ ❌]`
   - Include metrics: `[Yes (Default)]`
   - Show execution time: `[Yes (Default)]`

### Deployment Decision Configuration
1. Blocking criteria:
   - Critical security issues: `[Block deployment (Default)]`
   - Coverage below threshold: `[Block or warn based on configuration]`
   - Test failures: `[Block deployment (Default)]`
   - High complexity violations: `[Warn (Default)]`

2. Approval requirements:
   - All gates must: `[Pass or have acceptable warnings]`
   - Override capability: `[Manual override with justification]`
   - Notification requirements: `[Stakeholder notification on block/approve]`

## Expected Gate Results (Demo Configuration)

For demonstration purposes, the gates will produce the following results:

1. **Code Coverage**: ⚠️ WARNING (87.3%, below 90% target)
   - Missing coverage in error handling methods
   - Financial transaction validation needs more tests

2. **Security**: ❌ CRITICAL (SQL injection found, hardcoded API key)
   - SQL injection vulnerability in refund query (line 78)
   - Hardcoded Stripe API key in payment_processor.py (line 45)

3. **Tests**: ✅ PASSED (all 59 tests passing)
   - Unit tests: 45/45 passing
   - Integration tests: 14/14 passing
   - No flaky tests detected

4. **Quality Metrics**: ⚠️ WARNING (3 functions above complexity threshold)
   - payment_processor.process_refund() - complexity 15 (threshold 10)
   - salary_calculator.calculate_deductions() - complexity 12 (threshold 10)
   - tax_calculator.compute_annual_tax() - complexity 13 (threshold 10)

5. **AI Review**: ℹ️ INFO (missing retry logic, insufficient validation)
   - Missing retry logic for payment API calls
   - Insufficient input validation in salary calculation
   - Recommendation: Implement circuit breaker pattern

## Scope

- ✅ Automated execution of all five quality gates
- ✅ Real-time progress tracking in markdown format
- ✅ Comprehensive metrics collection and analysis
- ✅ Security vulnerability detection and classification
- ✅ Test execution with detailed reporting
- ✅ Code quality analysis with complexity metrics
- ✅ AI-powered code review and recommendations
- ✅ Final deployment decision (APPROVED/BLOCKED) with audit trail
- ❌ No code modifications (analysis only)
- ❌ No infrastructure deployment (decision only)

## Execution Process

1. **Initialize Progress Tracking**
   - Create `progress.md` file with initial structure
   - Set up real-time update mechanism
   - Record execution metadata (timestamp, commit, branch)

2. **Gate 1: Code Coverage Analysis**
   - Execute coverage analysis for entire codebase
   - Generate detailed coverage reports
   - Identify coverage gaps in critical code paths
   - Review `lcov` output when coverage data is available
   - Update progress.md with results

3. **Gate 2: Security Scanning**
   - Run static security analysis
   - Perform dependency vulnerability scanning
   - Execute secret detection across codebase
   - Classify findings by severity
   - Update progress.md with security status

4. **Gate 3: Test Execution**
   - Execute all configured test suites
   - Collect test results and metrics
   - Identify any test failures or flaky tests
   - Measure test execution performance
   - Update progress.md with test results

5. **Gate 4: Code Quality Metrics**
   - Analyze code complexity metrics
   - Run linting and code analysis tools
   - Calculate technical debt and code smell metrics
   - Assess maintainability indicators
   - Update progress.md with quality metrics

6. **Gate 5: AI-Generated Code Review**
   - Perform AI-powered code analysis
   - Identify patterns, anti-patterns, and improvements
   - Generate security and performance recommendations
   - Assess code maintainability and best practices
   - Update progress.md with AI review results

7. **Final Deployment Decision**
   - Aggregate all gate results
   - Apply configured blocking/warning criteria
   - Generate final APPROVED or BLOCKED decision
   - Create comprehensive summary with remediation steps
   - Update progress.md with final decision

8. **Audit Trail Generation**
   - Ensure all steps are documented with timestamps
   - Create links to detailed reports and logs
   - Generate executive summary for stakeholders
   - Archive results for compliance and future reference

## Progress Tracking Structure

Maintain a `progress.md` file with the following structure:

```markdown
# Quality Gates Execution Report

## Execution Metadata
- **Timestamp**: [Start time]
- **Commit Hash**: [Git commit hash]
- **Branch**: [Git branch name]
- **Project**: [Project name/path]
- **Execution ID**: [Unique identifier]

## Gate Execution Status

### 🎯 Code Coverage Thresholds
- **Status**: 🔄 Running → ⚠️ WARNING
- **Overall Line Coverage**: 44.82% (Target: 44%) ✅
- **Overall Function Coverage**: 57.41% (Target: 55%) ✅
- **Branch Coverage**: Not reported by current Bun `lcov` output
- **Critical Findings**: Any configured critical-path file below its repo threshold
- **Execution Time**: 2.3 minutes
- **Timestamp**: [Completion time]

### 🛡️ Security Scanning
- **Status**: 🔄 Running → ❌ CRITICAL
- **Critical Issues**: 2 found
- **High Issues**: 0 found
- **Medium Issues**: 3 found
- **Critical Findings**: 
  - SQL injection in payment_processor.py:78
  - Hardcoded API key in payment_processor.py:45
- **Execution Time**: 3.1 minutes
- **Timestamp**: [Completion time]

### ⏱️ Test Execution
- **Status**: 🔄 Running → ✅ PASSED
- **Total Tests**: 59
- **Passed**: 59
- **Failed**: 0
- **Skipped**: 0
- **Test Coverage**: Unit (45/45), Integration (14/14)
- **Execution Time**: 4.7 minutes
- **Timestamp**: [Completion time]

### 📊 Code Quality Metrics
- **Status**: 🔄 Running → ⚠️ WARNING
- **Complexity Violations**: 3 functions above threshold
- **Technical Debt**: 4.2% (Target: <5%) ✅
- **Code Duplication**: 2.1% (Target: <3%) ✅
- **Critical Findings**: High complexity in payment processing functions
- **Execution Time**: 1.8 minutes
- **Timestamp**: [Completion time]

### 🔍 AI-Generated Code Review
- **Status**: 🔄 Running → ℹ️ INFO
- **Critical Issues**: 0
- **Recommendations**: 5
- **Best Practice Suggestions**: 8
- **Key Findings**: Missing retry logic, insufficient validation
- **Execution Time**: 4.2 minutes
- **Timestamp**: [Completion time]

## Final Deployment Decision

### 🛑 BLOCKED
**Reason**: Critical security vulnerabilities must be resolved before deployment.

**Critical Blockers**:
- SQL injection vulnerability (HIGH RISK for financial system)
- Hardcoded API credentials (SECURITY BREACH RISK)

**Warnings to Address**:
- Coverage drift below the repo-calibrated Bun gate
- 3 functions exceed complexity thresholds

**Remediation Required**:
1. Fix SQL injection in payment_processor.py line 78
2. Move Stripe API key to environment variables or secret manager
3. Add targeted tests for the critical-path modules that failed the Bun coverage gate
4. Refactor complex functions for maintainability

**Estimated Remediation Time**: 4-6 hours
**Re-run Required**: Yes, after critical issues are resolved

## Audit Trail
- **Total Execution Time**: 16.1 minutes
- **Gates Passed**: 1/5 (Tests only)
- **Gates Warning**: 2/5 (Coverage, Quality)
- **Gates Failed**: 1/5 (Security)
- **Gates Info**: 1/5 (AI Review)
- **Decision**: BLOCKED due to critical security issues
```

## Validation and Verification

After orchestrator execution:

1. **Verify Progress Updates**
   ```bash
   # Check that progress.md was updated in real-time
   git log --oneline -5 progress.md
   ```

2. **Validate Gate Results**
   ```bash
   # Ensure all gate outputs are captured
   ls -la reports/
   cat reports/security-scan.json
   ```

3. **Test Decision Logic**
   - Confirm BLOCKED decision for critical security issues
   - Verify WARNING status for coverage and complexity
   - Validate INFO classification for AI recommendations

## Recovery and Error Handling

If orchestrator encounters errors:

1. **Partial Execution Recovery**
   - Continue with remaining gates if one gate fails
   - Document partial results in progress.md
   - Mark failed gates clearly with error details

2. **Timeout Handling**
   - Set maximum execution time per gate (default: 10 minutes)
   - Mark long-running gates as TIMEOUT
   - Provide option to continue with remaining gates

3. **Tool Unavailability**
   - Skip gates where required tools are not available
   - Document skipped gates with reasoning
   - Adjust final decision logic for missing data

## Quality Assurance

The orchestrator ensures:

- **Consistency**: Same gates, same order, same criteria every time
- **Transparency**: All decisions documented with evidence
- **Auditability**: Complete trail of what was checked and why
- **Objectivity**: No human bias in pass/fail decisions
- **Reproducibility**: Same commit produces same results

## Security Best Practices

- Never expose sensitive data in progress.md
- Sanitize error messages to remove credentials
- Use secure temporary directories for analysis
- Clean up intermediate files after execution
- Log access to sensitive gate results

---

**YOU ARE NOT DONE UNTIL ALL GATES ARE EXECUTED AND FINAL DECISION IS DOCUMENTED!** This includes updating progress.md in real-time, capturing all metrics, and providing clear remediation guidance for any issues found.
