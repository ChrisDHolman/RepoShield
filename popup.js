document.getElementById('scanBtn').addEventListener('click', async () => {
  const scanBtn = document.getElementById('scanBtn');
  const resultsDiv = document.getElementById('results');
  
  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning...';
  
  resultsDiv.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div class="loading-text">Analyzing dependencies...</div>
    </div>
  `;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('github.com')) {
      resultsDiv.innerHTML = `
        <div class="status info">
          <span class="status-icon">&#x2139;&#xFE0F;</span>
          <div>
            <strong>Not a GitHub page</strong><br>
            Please navigate to a GitHub repository to scan for vulnerabilities.
          </div>
        </div>
      `;
      scanBtn.disabled = false;
      scanBtn.textContent = 'Scan Repository';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'scanRepo' }, (response) => {
      scanBtn.disabled = false;
      scanBtn.textContent = 'Scan Repository';
      
      if (chrome.runtime.lastError) {
        resultsDiv.innerHTML = `
          <div class="status danger">
            <span class="status-icon">&#x274C;</span>
            <div>
              <strong>Connection Error</strong><br>
              ${chrome.runtime.lastError.message}<br>
              <span style="font-size: 12px; opacity: 0.8;">Try refreshing the page.</span>
            </div>
          </div>
        `;
        return;
      }

      if (response.error) {
        resultsDiv.innerHTML = `
          <div class="status danger">
            <span class="status-icon">&#x274C;</span>
            <div>
              <strong>Scan Error</strong><br>
              ${response.error}
            </div>
          </div>
        `;
        return;
      }

      displayResults(response);
    });
  } catch (error) {
    resultsDiv.innerHTML = `
      <div class="status danger">
        <span class="status-icon">&#x274C;</span>
        <div>
          <strong>Unexpected Error</strong><br>
          ${error.message}
        </div>
      </div>
    `;
    scanBtn.disabled = false;
    scanBtn.textContent = 'Scan Repository';
  }
});

function displayResults(results) {
  const resultsDiv = document.getElementById('results');
  const emptyScanState = document.getElementById('emptyScanState');
  const vulnCount = results.vulnerabilities.length;
  
  // Hide empty state when results appear
  if (emptyScanState) {
    emptyScanState.style.display = 'none';
  }
  
  let html = '';

  // Repository info
  if (results.repo) {
    html += `
      <div class="repo-info">
        <div class="repo-header">
          <span style="font-size: 16px;">&#x1F4E6;</span>
          <span class="repo-name">${results.repo.owner}/${results.repo.repo}</span>
        </div>
        <div class="repo-meta">Scanned for known vulnerabilities</div>
      </div>
    `;
    
    // Add monorepo notice if applicable
    html += `
      <div class="monorepo-notice">
        <span style="font-size: 14px;">&#x1F4C1;</span>
        <div class="monorepo-notice-text">
          <strong>Scanning visible files only</strong>
          <div style="font-size: 11px; margin-top: 2px;">For monorepos: Navigate into subdirectories (e.g., packages/) and scan again</div>
        </div>
      </div>
    `;
  }

  // Files scanned
  if (results.filesScanned && results.filesScanned.length > 0) {
    html += '<div class="files-scanned">';
    html += '<div class="section-title">&#x1F4C4; Dependency Files</div>';
    
    console.log('Files to display:', results.filesScanned);
    
    // Check if any npm files exist
    const hasNpmFiles = results.filesScanned.some(file => file.ecosystem === 'npm');
    
    if (hasNpmFiles) {
      html += `
        <div class="malware-notice">
          <span style="font-size: 16px;">&#x1F6E1;&#xFE0F;</span>
          <div class="malware-notice-text">
            <strong>Malware Scanning Available</strong>
            <div style="font-size: 11px; margin-top: 2px;">Click "Check Malware" on npm packages to scan with Aikido Intel</div>
          </div>
        </div>
      `;
    }
    
    results.filesScanned.forEach(file => {
      const isVulnerable = file.vulnerabilityCount > 0;
      const statusClass = isVulnerable ? 'vulnerable' : 'clean';
      const statusText = isVulnerable 
        ? `${file.vulnerabilityCount} issue${file.vulnerabilityCount > 1 ? 's' : ''}`
        : 'Clean';
      
      // Get emoji based on file type
      let fileEmoji = '&#x1F4C4;';
      if (file.name.includes('package')) fileEmoji = '&#x1F4E6;';
      else if (file.name.includes('requirements')) fileEmoji = '&#x1F40D;';
      else if (file.name.includes('go.')) fileEmoji = '&#x1F537;';
      else if (file.name.includes('Gemfile')) fileEmoji = '&#x1F48E;';
      else if (file.name.includes('Cargo')) fileEmoji = '&#x1F980;';
      else if (file.name.includes('composer')) fileEmoji = '&#x1F418;';
      
      const fileUrl = file.url;
      
      console.log('Displaying file:', file.name, 'Full Path:', file.fullPath, 'URL:', fileUrl);
      
      // Only make clickable if we have a valid URL
      if (fileUrl && fileUrl.startsWith('http')) {
        html += `
          <a href="${fileUrl}" target="_blank" class="file-item-link">
            <div class="file-item">
              <div class="file-left">
                <div class="file-icon">${fileEmoji}</div>
                <div class="file-details">
                  <div class="file-path">${file.fullPath || file.name}</div>
                  <div class="file-name">${file.name}</div>
                  <div class="file-stats">${file.dependencyCount} ${file.dependencyCount === 1 ? 'dependency' : 'dependencies'} &bull; ${file.ecosystem}</div>
                </div>
              </div>
              <div class="file-status ${statusClass}">${statusText}</div>
            </div>
          </a>
        `;
      } else {
        html += `
          <div class="file-item">
            <div class="file-left">
              <div class="file-icon">${fileEmoji}</div>
              <div class="file-details">
                <div class="file-path">${file.fullPath || file.name}</div>
                <div class="file-name">${file.name}</div>
                <div class="file-stats">${file.dependencyCount} ${file.dependencyCount === 1 ? 'dependency' : 'dependencies'} &bull; ${file.ecosystem}</div>
              </div>
            </div>
            <div class="file-status ${statusClass}">${statusText}</div>
          </div>
        `;
      }
    });
    html += '</div>';
  }

  // Status message
  if (vulnCount === 0) {
    html += `
      <div class="status safe">
        <span class="status-icon">&#x2705;</span>
        <div>
          <strong>All Clear!</strong><br>
          No known vulnerabilities detected in your dependencies.
        </div>
      </div>
    `;
  } else {
    const criticalCount = results.vulnerabilities.filter(v => {
      const sev = v.severity.toUpperCase();
      return sev === 'CRITICAL';
    }).length;
    
    const highCount = results.vulnerabilities.filter(v => {
      const sev = v.severity.toUpperCase();
      return sev === 'HIGH';
    }).length;
    
    const mediumCount = results.vulnerabilities.filter(v => {
      const sev = v.severity.toUpperCase();
      return sev === 'MEDIUM' || sev === 'MODERATE';
    }).length;
    
    const fixableCount = results.vulnerabilities.filter(v => 
      v.fixedVersions && v.fixedVersions.length > 0
    ).length;

    console.log('Severity breakdown:', { criticalCount, highCount, mediumCount, total: vulnCount });
    console.log('Fixable vulnerabilities:', fixableCount, 'out of', vulnCount);

    html += `
      <div class="status danger">
        <span class="status-icon">&#x26A0;&#xFE0F;</span>
        <div>
          <strong>Vulnerabilities Detected</strong><br>
          Found ${vulnCount} ${vulnCount === 1 ? 'security issue' : 'security issues'} in your dependencies.
          ${fixableCount > 0 ? `<br><span style="color: #059669; font-weight: 600;">${fixableCount} ${fixableCount === 1 ? 'has' : 'have'} fixes available</span>` : ''}
        </div>
      </div>
    `;

    // Summary cards
    html += `
      <div class="summary">
        <div class="summary-item">
          <div class="summary-number" style="color: #dc2626">${criticalCount}</div>
          <div class="summary-label">Critical</div>
        </div>
        <div class="summary-item">
          <div class="summary-number" style="color: #ea580c">${highCount}</div>
          <div class="summary-label">High</div>
        </div>
        <div class="summary-item">
          <div class="summary-number" style="color: #f59e0b">${mediumCount}</div>
          <div class="summary-label">Medium</div>
        </div>
      </div>
    `;
    
    // Add fixable summary card
    html += `
      <div class="fix-summary">
        <div class="fix-summary-content">
          <div class="fix-summary-icon">&#x1F6E0;&#xFE0F;</div>
          <div class="fix-summary-text">
            <div class="fix-summary-title">${fixableCount} of ${vulnCount} fixable</div>
            <div class="fix-summary-subtitle">${vulnCount - fixableCount} require manual review</div>
          </div>
        </div>
      </div>
    `;

    // Vulnerability list
    html += '<div class="section-title" style="margin-top: 20px;">&#x1F50D; Vulnerabilities</div>';
    html += '<div class="vulnerabilities">';
    
    // Sort by severity
    const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'MODERATE': 2, 'LOW': 3, 'UNKNOWN': 4 };
    results.vulnerabilities.sort((a, b) => {
      const aOrder = severityOrder[a.severity.toUpperCase()] ?? 4;
      const bOrder = severityOrder[b.severity.toUpperCase()] ?? 4;
      return aOrder - bOrder;
    });

    results.vulnerabilities.forEach(vuln => {
      const severityClass = vuln.severity.toLowerCase().replace('moderate', 'medium');
      
      html += `
        <div class="vuln-item ${severityClass}">
          <div class="vuln-header">
            <span class="vuln-id">${vuln.id}</span>
            <span class="severity-badge ${severityClass}">${vuln.severity}</span>
          </div>
          
          <div class="package-info">
            <span class="package-icon">&#x1F4E6;</span>
            <div class="package-details">
              <div class="package-name">${vuln.package}</div>
              <div class="package-version">Current version: ${vuln.version} ${vuln.fileName ? `&bull; from ${vuln.fileName}` : ''}</div>
            </div>
          </div>
          
          <div class="vuln-summary">${vuln.summary || 'No description available for this vulnerability.'}</div>
      `;
      
      // Enhanced fix suggestion
      if (vuln.fixedVersions && vuln.fixedVersions.length > 0) {
        const fixVersions = vuln.fixedVersions.slice(0, 3); // Show up to 3 versions
        const versionsHtml = fixVersions.map(v => `<span class="fix-version">${v}</span>`).join(' or ');
        
        html += `
          <div class="vuln-fix">
            <span class="fix-icon">&#x1F4A1;</span>
            <div class="fix-content">
              <div class="fix-title">Fix Available</div>
              <div class="fix-text">Upgrade to version ${versionsHtml} or later to resolve this vulnerability.</div>
            </div>
          </div>
        `;
      } else {
        // Show message when no fix version is explicitly available
        html += `
          <div class="vuln-fix" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left-color: #f59e0b;">
            <span class="fix-icon">&#x26A0;&#xFE0F;</span>
            <div class="fix-content">
              <div class="fix-title" style="color: #92400e;">Check for Updates</div>
              <div class="fix-text" style="color: #78350f;">No specific fix version found. Check the vulnerability details for mitigation guidance.</div>
            </div>
          </div>
        `;
      }
      
      html += `
          <div class="vuln-meta">
            <a href="${vuln.link}" target="_blank" class="vuln-link">
              View Details &rarr;
            </a>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
  }

  // Empty state for no dependency files
  if (!results.filesScanned || results.filesScanned.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-icon">&#x1F4ED;</div>
        <div class="empty-title">No Dependency Files Found</div>
        <div class="empty-text">
          This repository doesn't contain any supported dependency files.<br>
          We look for package.json, requirements.txt, go.mod, and more.
        </div>
      </div>
    `;
  }

  resultsDiv.innerHTML = html;
}

// Load cached results on popup open
chrome.storage.local.get(['lastScan'], (result) => {
  if (result.lastScan && result.lastScan.status === 'success') {
    displayResults(result.lastScan);
  }
});
