# 🛡️ VulnGuard

A Chrome extension that scans GitHub repositories for vulnerable dependencies using the [OSV.dev](https://osv.dev) API.

## Features

- 🔍 **Automatic dependency detection** - Finds package.json, requirements.txt, go.mod, and more
- ⚡ **Real-time scanning** - Queries OSV.dev for known vulnerabilities
- 🎨 **Clean UI** - Color-coded results (green = safe, red = vulnerabilities)
- 📊 **Detailed reports** - View severity levels, CVE IDs, and vulnerability descriptions
- 💡 **Fix suggestions** - Shows which version to upgrade to for resolving issues
- 🛡️ **Malware checking** - Quick links to check npm packages with Aikido Intel
- 🌍 **Multi-ecosystem support** - npm, PyPI, Go, RubyGems, Maven, Cargo, Composer
- 📁 **Auto-scan** - Automatically scans when you visit a GitHub repository

## Important: Scanning Limitations

**RepoShield scans dependency files visible on the current GitHub page only.**

Due to GitHub API rate limits for unauthenticated requests, the extension cannot recursively scan entire repositories. 

**For monorepos or projects with nested dependencies:**
1. Scan from the root to check root-level dependencies
2. Navigate into subdirectories (e.g., `packages/`, `apps/`) 
3. Scan again to check those specific files

This limitation ensures the extension works reliably without requiring GitHub authentication or hitting API rate limits.

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/vulnguard.git
   cd vulnguard
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top-right corner)

4. Click "Load unpacked" and select the `vulnguard` folder

5. The extension icon should now appear in your browser toolbar

## Usage

1. Navigate to any GitHub repository
2. Click the VulnGuard extension icon in your toolbar
3. Click "Scan Repository"
4. View the vulnerability report

### Example

Visit a repository like `https://github.com/user/repo` and scan it to see:
- Total vulnerabilities found
- Severity breakdown (Critical, High, Medium, Low)
- Affected packages and versions
- Links to detailed vulnerability information

## Supported Dependency Files

- **JavaScript/Node.js**: package.json, package-lock.json, yarn.lock
- **Python**: requirements.txt, Pipfile, Pipfile.lock
- **Go**: go.mod, go.sum
- **Ruby**: Gemfile, Gemfile.lock
- **Java**: pom.xml, build.gradle
- **Rust**: Cargo.toml, Cargo.lock
- **PHP**: composer.json, composer.lock

## How It Works

1. **Detection**: Content script identifies dependency files in the GitHub repository
2. **Parsing**: Extracts package names and versions from dependency files
3. **API Query**: Sends batch requests to OSV.dev API
4. **Display**: Shows results in a user-friendly popup interface

## Privacy

- No data is collected or stored externally
- All scanning happens client-side in your browser
- Only communicates with GitHub (for file content) and OSV.dev API (for vulnerabilities)
- No tracking or analytics
- Scans only files visible on the current GitHub page

## Limitations

### Scanning Scope
RepoShield scans **dependency files visible on the current GitHub page only**. It cannot recursively scan entire repositories due to GitHub API rate limits for unauthenticated requests.

**Workaround for monorepos:**
Navigate into subdirectories and scan each one separately.

**Why this limitation exists:**
- GitHub heavily rate-limits unauthenticated API requests
- Browser extensions cannot safely store API tokens
- This ensures reliable operation without authentication

### Future Improvements
To enable full repository scanning, a backend service with GitHub authentication would be required. This is being considered for future versions.

## Development

### Project Structure

```
vulnguard/
├── manifest.json       # Extension configuration
├── content.js          # Runs on GitHub pages, handles scanning
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic and result display
├── background.js       # Background service worker
└── icons/              # Extension icons
```

### Building from Source

No build process required! This is a pure JavaScript extension.

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] Backend service for full repository scanning
- [ ] Add caching to avoid re-scanning unchanged repos
- [ ] Support for more dependency file formats
- [ ] Export scan results to JSON/CSV
- [ ] Integration with GitHub Security Advisories
- [ ] Browser notifications for critical vulnerabilities

## FAQ

**Q: Why doesn't it scan all files in my monorepo?**  
A: GitHub API rate-limits prevent scanning entire repos without authentication. Navigate to subdirectories and scan each one.

**Q: Can I scan private repositories?**  
A: Yes, if you have access. The extension reads whatever you can see on GitHub.

**Q: How accurate are the vulnerability reports?**  
A: Very accurate. We use OSV.dev, which aggregates data from NVD, GitHub Advisory Database, and other sources.

**Q: Does it work offline?**  
A: No, it requires internet access to query OSV.dev and fetch file contents from GitHub.

**Q: Can I use this in CI/CD?**  
A: Not directly. Consider using OSV-Scanner CLI or similar tools for CI/CD pipelines.

**Q: Why does it show "Check for Malware" instead of scanning automatically?**  
A: Automated malware scanning requires API authentication. We provide quick links to Aikido Intel for manual verification.

## Credits

- Powered by [OSV.dev](https://osv.dev) - Google's Open Source Vulnerabilities database
- Icons created using [your icon source]

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/yourusername/vulnguard/issues).

## Changelog

### v1.0.0 (Initial Release)
- Initial release with basic vulnerability scanning
- Support for npm, PyPI, Go, RubyGems, Maven, Cargo, and Composer ecosystems
- Clean popup UI with severity indicators
