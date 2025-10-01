# Release Automation System

This document describes the automated release system for the Kairos documentation repository.

## Overview

The release automation system monitors the [Kairos project releases](https://github.com/kairos-io/kairos/releases) and automatically updates the documentation repository when new versions are published. This eliminates the manual process of creating release branches and updating version information.

## Components

### 1. GitHub Actions Workflow
- **File**: `.github/workflows/release-monitor.yml`
- **Trigger**: Runs every 30 minutes via cron schedule
- **Manual Trigger**: Can be triggered manually with optional parameters
- **Features**:
  - Automatic release detection
  - Dry-run mode for testing
  - Specific version processing
  - Error handling and notifications

### 2. Main Automation Script
- **File**: `scripts/release-automation.sh`
- **Purpose**: Core automation logic
- **Features**:
  - Version detection and validation
  - Component version extraction
  - Hugo.toml updates
  - Git branch management
  - Comprehensive error handling

### 3. Utility Functions
- **File**: `scripts/utils.sh` (enhanced)
- **New Functions**:
  - `get_latest_kairos_release()`: Fetch latest release from GitHub API
  - `get_kairos_init_version()`: Extract KAIROS_INIT version from Dockerfile
  - `get_component_versions()`: Extract component versions from Makefile
  - `release_branch_exists()`: Check if release branch already exists
  - `validate_semantic_version()`: Validate version format

### 4. Test Script
- **File**: `scripts/test-release-automation.sh`
- **Purpose**: Validate automation system functionality
- **Features**:
  - API connectivity tests
  - Version extraction tests
  - Dry-run validation
  - Hugo.toml syntax validation

## How It Works

### 1. Release Detection
The system monitors the Kairos GitHub repository for new releases using the GitHub API:
```bash
https://api.github.com/repos/kairos-io/kairos/releases/latest
```

### 2. Version Information Extraction
For each new release, the system:

1. **Extracts KAIROS_INIT version** from the release's Dockerfile:
   ```
   https://raw.githubusercontent.com/kairos-io/kairos/refs/tags/{version}/images/Dockerfile
   ```

2. **Extracts component versions** from the kairos-init Makefile:
   ```
   https://raw.githubusercontent.com/kairos-io/kairos-init/refs/tags/{kairos_init_version}/Makefile
   ```

### 3. Configuration Updates
The system updates `hugo.toml` with:
- `latest_version`: The new Kairos release version
- `kairos_init_version`: Extracted from Dockerfile
- `provider_version`: From kairos-init Makefile
- `auroraboot_version`: From kairos-init Makefile
- `k3s_version`: From kairos-init Makefile

### 4. Branch Management
- Creates new branch: `release/{version}`
- Commits changes with message: `"chore: update versions for release {version}"`
- Pushes branch to origin

## Usage

### Automatic Operation
The system runs automatically every 30 minutes via GitHub Actions. No manual intervention required.

### Manual Operation

#### Check for new releases:
```bash
./scripts/release-automation.sh
```

#### Process specific version:
```bash
./scripts/release-automation.sh --version v3.5.3
```

#### Dry run (test mode):
```bash
./scripts/release-automation.sh --dry-run
./scripts/release-automation.sh --version v3.5.3 --dry-run
```

#### Verbose output:
```bash
./scripts/release-automation.sh --verbose
```

#### Get help:
```bash
./scripts/release-automation.sh --help
```

### Testing
Run the test suite to validate the automation system:
```bash
./scripts/test-release-automation.sh
```

## Configuration

### Required Environment Variables
- `GITHUB_TOKEN`: GitHub token with repository access (automatically provided in GitHub Actions)

### Dependencies
- `curl`: For HTTP requests
- `jq`: For JSON parsing
- `git`: For version control operations
- `hugo`: For configuration validation (optional)

## Error Handling

The system includes comprehensive error handling:

1. **Network Failures**: Retries with exponential backoff
2. **Missing Versions**: Logs warnings and continues with available versions
3. **Invalid Syntax**: Validates hugo.toml and reverts changes on failure
4. **Branch Conflicts**: Skips processing if release branch already exists
5. **API Failures**: Logs errors and exits gracefully

## Security

- Uses GitHub's built-in `GITHUB_TOKEN` for authentication
- Minimal required permissions
- Comprehensive audit logging
- No sensitive data exposure

## Monitoring

The system provides detailed logging:
- Timestamped log entries
- Different log levels (INFO, WARN, ERROR, DEBUG)
- Verbose mode for debugging
- GitHub Actions workflow logs

## Integration

The automation system integrates with existing infrastructure:
- **Renovate Bot**: Doesn't conflict with automated dependency updates
- **Build Scripts**: Compatible with existing build processes
- **Version Management**: Uses existing version utilities

## Troubleshooting

### Common Issues

1. **API Rate Limiting**: GitHub API has rate limits. The system includes retry logic.

2. **Missing Component Versions**: Some versions might not be available in the Makefile. The system logs warnings and continues.

3. **Hugo.toml Syntax Errors**: The system validates syntax and reverts changes on failure.

4. **Branch Already Exists**: The system skips processing if the release branch already exists.

### Debug Mode
Enable verbose logging for debugging:
```bash
./scripts/release-automation.sh --verbose --dry-run
```

### Manual Recovery
If automation fails, you can manually:
1. Check the logs in GitHub Actions
2. Run the test script to identify issues
3. Process the version manually with dry-run mode
4. Create the release branch manually if needed

## Future Enhancements

Potential improvements:
1. **Webhook Integration**: Real-time processing instead of polling
2. **Slack Notifications**: Notify team on success/failure
3. **Rollback Capability**: Automatic rollback on validation failures
4. **Multi-repository Support**: Support for other Kairos repositories
5. **Advanced Validation**: More comprehensive version validation

## Support

For issues or questions:
1. Check the GitHub Actions logs
2. Run the test script
3. Review this documentation
4. Create an issue in the repository

