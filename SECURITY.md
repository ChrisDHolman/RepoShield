Security Policy
Supported Versions
Version	Supported
1.0.x	:white_check_mark:
Reporting a Vulnerability
We take security seriously. If you discover a security vulnerability in VulnGuard/RepoShield, please report it responsibly.

How to Report
DO NOT open a public GitHub issue for security vulnerabilities
Email security concerns to: [your-email@example.com]
Include:
Description of the vulnerability
Steps to reproduce
Potential impact
Suggested fix (if any)
What to Expect
Initial Response: Within 48 hours
Status Update: Within 7 days
Fix Timeline: Critical issues within 30 days
Security Best Practices for Users
Download from Official Sources: Only install from the official Chrome Web Store or GitHub releases
Verify Permissions: Review requested permissions before installation
Keep Updated: Enable automatic updates for security patches
Review Scans: Don't blindly trust vulnerability reports - verify findings
Security Features
Data Privacy
No Data Collection: Extension doesn't collect or transmit personal data
Local Processing: All scanning happens client-side
API Calls: Only communicates with:
GitHub (for file content)
OSV.dev (for vulnerability data)
Permissions
activeTab: Required to read GitHub page content
storage: Stores scan results locally
github.com: Access GitHub repositories
api.osv.dev: Query vulnerability database
Content Security
No eval() or dynamic code execution
No inline scripts in HTML
Strict Content Security Policy
No third-party analytics or tracking
Known Limitations
Scanning Scope: Only scans visible files (GitHub API rate limits)
Authentication: No GitHub API token storage (by design)
Malware Detection: Links to external services, doesn't scan directly
Security Audits
Last Audit: [Date]
Tools Used:
GitLeaks (secret scanning)
Trivy (dependency vulnerabilities)
CodeQL (static analysis)
ESLint (code quality)
Disclosure Policy
When a vulnerability is confirmed:

Fix is developed and tested
Security advisory is prepared
Update is released
Advisory is published 7 days after release
Credit given to reporter (if desired)
Security Updates
Subscribe to releases on GitHub to receive notifications about security updates.

Contact
For security concerns: [your-email@example.com]

For general issues: GitHub Issues

