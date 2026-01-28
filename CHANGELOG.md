# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-28

### Added
- Continuous epic processing loop - automatically continues to next epic when one completes
- Improved story detection with more status types (backlog, pending, ready)
- Filter out completed epics from selection
- Auto-commit in yolo mode without prompting
- Live agent output logging in verbose mode
- Fall back to sprint-status.yaml for epic loading when epic files are missing
- Update sprint-status.yaml when stories and epics complete
- Git tagging in publish:npm script
- GitHub Pages documentation site
- Error handling with retry logic for Claude CLI failures
- Yolo mode (`--yolo`) to auto-complete stories at max iterations
- Elapsed time display on all log outputs
- Configurable max iterations (`--max-iterations`) with final dev pass option

### Fixed
- Correct verbose mode stream piping for agent output
- Add timestamp and uptime to error log
- Handle unhandled promise rejections gracefully
- Handle missing epic files by falling back to sprint-status data
- Story iteration stops after first story

## [0.1.0] - 2025-01-20

### Added
- Initial release
- CLI tool to automate BMAD implementation phase
- Scrum Master agent for epic/story selection
- Story Creator agent for generating implementation stories
- Dev agent for implementing stories
- Reviewer agent for code review
- State persistence for resume functionality
- Git commit integration
- Configurable agent models (opus for planning, sonnet for dev)
