# 🛡️ VulnGuard

A Chrome extension that scans GitHub repositories for vulnerable dependencies using the [OSV.dev](https://osv.dev) API.

## Features

- 🔍 **Automatic dependency detection** - Finds package.json, requirements.txt, go.mod, and more
- ⚡ **Real-time scanning** - Queries OSV.dev for known vulnerabilities
- 🎨 **Clean UI** - Color-coded results (green = safe, red = vulnerabilities)
- 📊 **Detailed reports** - View severity levels, CVE IDs, and vulnerability descriptions
- 🌍 **Multi-ecosystem support** - npm, PyPI, Go, RubyGems, Maven, Cargo, Composer

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
- Only communicates with GitHub and OSV.dev APIs
- No tracking or analytics

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

- [ ] Add caching to avoid re-scanning unchanged repos
- [ ] Support for more dependency file formats
- [ ] Auto-scan on page load (optional setting)
- [ ] Export scan results to JSON/CSV
- [ ] Integration with GitHub Security Advisories
- [ ] Support for monorepos with multiple dependency files

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
