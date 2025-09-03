# GitHub Actions & Automation

This directory contains all GitHub Actions workflows, issue templates, and automation configuration for the Kokoro TTS GUI project.

## 📁 Directory Structure

```
.github/
├── workflows/           # GitHub Actions workflows
│   ├── ci.yml          # Continuous Integration
│   ├── pr.yml          # Pull Request validation
│   ├── release.yml     # Automated releases
│   └── security.yml    # Security scanning
├── ISSUE_TEMPLATE/     # Issue templates
│   ├── bug_report.yml  # Bug report template
│   └── feature_request.yml # Feature request template
├── dependabot.yml      # Automated dependency updates
├── labeler.yml         # PR auto-labeling configuration
└── pull_request_template.md # PR template
```

## 🚀 Workflows Overview

### CI Workflow (`ci.yml`)

- **Triggers**: Push to main/develop, PRs
- **Purpose**: Core testing and quality checks
- **Jobs**: Test & Quality, Multi-platform build verification

### Pull Request Workflow (`pr.yml`)

- **Triggers**: PR events (open, sync, ready for review)
- **Purpose**: Comprehensive PR validation
- **Jobs**: Validation, testing, build checks, size analysis, auto-labeling

### Release Workflow (`release.yml`)

- **Triggers**: Git tags (v\*), manual dispatch
- **Purpose**: Automated multi-platform releases
- **Jobs**: Pre-release tests, multi-platform builds, GitHub release creation

### Security Workflow (`security.yml`)

- **Triggers**: Weekly schedule, push to main, PRs
- **Purpose**: Security scanning and vulnerability detection
- **Jobs**: Dependency review, NPM audit, CodeQL analysis, secret scanning

## 🏷️ Issue Templates

- **Bug Reports**: Structured bug reporting with platform/version info
- **Feature Requests**: Organized feature suggestions with priority classification

## 🤖 Automation Features

- **Dependabot**: Weekly dependency updates with intelligent grouping
- **PR Labeling**: Automatic labeling based on file changes and branch names
- **Coverage Reporting**: Automated test coverage comments on PRs
- **Multi-platform Builds**: Automated builds for macOS, Windows, and Linux
- **Release Management**: Automatic changelog extraction and release creation

## 📚 Documentation

See `docs/development/CI_CD_SETUP.md` for detailed workflow documentation.
