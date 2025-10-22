# Privacy Policy for VulnGuard

**Effective Date:** January 2025  
**Last Updated:** January 2025

## Overview
VulnGuard is a browser extension that scans GitHub repository dependency files for known security vulnerabilities. This privacy policy explains what data we access, how we use it, and your rights.

## Information We Do NOT Collect
VulnGuard does not collect, store, transmit, or process any of the following:
- Personal information (name, email, address, phone number)
- Authentication credentials (passwords, API tokens, GitHub login)
- Browsing history or web activity
- Location data
- Financial information
- User behavior analytics or tracking data
- Cookies or unique identifiers

## What the Extension Accesses

### GitHub Repository Information
When you visit a GitHub repository page, the extension:
- Reads the repository name and owner from the page URL
- Identifies dependency file names visible in the file list (e.g., package.json, requirements.txt)
- Fetches the content of publicly accessible dependency files to extract package names and versions

**Important:** The extension only accesses repositories you can already view in your browser. It does not access private information or repositories you don't have permission to see.

### Dependency Data Processing
The extension extracts:
- Package names (e.g., "express", "lodash", "django")
- Version numbers (e.g., "4.18.2")
- Ecosystem identifiers (e.g., "npm", "PyPI", "Go")

This information is extracted from dependency files that are already publicly visible on GitHub.

## How We Use Information

### Vulnerability Checking
Package names and versions are sent to:
- **OSV.dev API** (https://api.osv.dev): A free, public vulnerability database operated by Google's Open Source Security Team

This API does not require authentication and does not track users. It simply returns information about known vulnerabilities for the packages you query.

### Local Storage
The extension stores vulnerability scan results locally in your browser using Chrome's storage API. This allows you to:
- View your most recent scan without re-scanning
- Access results quickly when reopening the extension

**Data stored locally:**
- Repository name and owner
- Scanned file names
- Package names and versions
- Vulnerability information returned from OSV.dev

**Data NOT stored:**
- Your GitHub credentials
- Your browsing history
- Any personal identifiers

## Third-Party Services

### OSV.dev (Open Source Vulnerabilities Database)
- **Purpose:** Query for known security vulnerabilities
- **Operator:** Google Open Source Security Team
- **Data Sent:** Package names, versions, and ecosystems
- **Privacy Policy:** https://osv.dev/

### GitHub
- **Purpose:** Fetch dependency file content from repositories you're viewing
- **Data Accessed:** Publicly visible repository files
- **Privacy Policy:** https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement

## Data Sharing
We do not share, sell, rent, or trade any data with third parties. The only data transmission is:
1. Package information → OSV.dev API (for vulnerability lookups)
2. File requests → GitHub (for content you're already viewing)

## Data Retention
- **Local Storage:** Scan results remain in your browser until you clear Chrome's extension data or uninstall the extension
- **No Server Storage:** We do not operate any servers or databases. No data is stored outside your browser.

## Your Rights and Controls

### Access and Deletion
You can:
- View stored data in Chrome DevTools (Application → Storage → Extensions)
- Clear all extension data by uninstalling the extension
- Clear cached scans by removing and reinstalling

### Opt-Out
You can stop all data processing by:
- Disabling the extension in Chrome's extension manager
- Uninstalling the extension completely

## Security
- All communication with OSV.dev uses HTTPS encryption
- No authentication credentials are ever stored or transmitted
- The extension runs entirely client-side in your browser
- No analytics or tracking scripts are included

## Children's Privacy
VulnGuard does not knowingly collect data from anyone, including children under 13. The extension does not collect personal information from any users.

## International Users
The extension can be used globally. Data transmission is limited to:
- OSV.dev API (hosted by Google Cloud)
- GitHub (for publicly accessible content)

## Changes to This Policy
We may update this privacy policy to reflect changes in our practices or for legal compliance. Updates will be posted at this URL with a new "Last Updated" date.

Significant changes will be noted in the extension's release notes.

## Open Source
VulnGuard is open source. You can review the complete source code at:
[Your GitHub Repository URL]

## Contact Information
For questions, concerns, or requests regarding this privacy policy:
- **GitHub Issues:** [Your Repository Issues URL]
- **Email:** [Your Contact Email]

## Compliance
This extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR) principles
- California Consumer Privacy Act (CCPA) principles

## Legal Basis for Processing (GDPR)
We process data on the basis of:
- **Legitimate Interest:** Providing vulnerability scanning functionality that users explicitly request
- **User Consent:** By installing and using the extension, users consent to the data processing described in this policy

## Your GDPR Rights
If you are in the EU/EEA, you have the right to:
- Access your data (stored locally in your browser)
- Delete your data (by uninstalling the extension)
- Object to processing (by not using the extension)

Since no data is stored on our servers, these rights can be exercised directly through your browser.

---

**Summary:** VulnGuard is a privacy-focused security tool that only processes publicly available dependency information to check for vulnerabilities. No personal data is collected, stored, or shared.
