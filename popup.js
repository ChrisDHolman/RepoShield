document.getElementById('scanBtn').addEventListener('click', async () => {
  const scanBtn = document.getElementById('scanBtn');
  const resultsDiv = document.getElementById('results');
  
  scanBtn.disabled = true;
  scanBtn.textContent = '⏳ Scanning...';
  
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
          <span class="status-icon">ℹ️</span>
          <div>
            <strong>Not a GitHub page</strong><br>
            Please navigate to a GitHub repository to scan for vulnerabilities.
          </div>
        </div>
      `;
      scanBtn.disabled = false;
      scanBtn.innerHTML = '<span>🔍 Scan Repository</span>';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'scanRepo' }, (response) => {
      scanBtn.disabled = false;
      scanBtn.innerHTML = '<span>🔍 Scan Repository</span>';
      
      if (chrome.runtime.lastError) {
        resultsDiv.innerHTML = `
          <div class="status danger">
            <span class="status-icon">❌</span>
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
            <span class="status-icon">❌</span>
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
        <span class="status-icon">❌</span>
        <div>
          <strong>Unexpected Error</strong><br>
          ${error.message}
        </div>
      </div>
    `;
    scanBtn.disabled = false;
    scanBtn.innerHTML = '<span>🔍 Scan Repository</span>';
  }
});

function displayResults(results) {
  const resultsDiv = document.getElementById('results');
  const vulnCount = results.vulnerabilities.length;
  
  let html = '';

  // Repository info
  if (results.repo) {
    html += `
      <div class="repo-info">
        <div class="repo-header">
          <span style="font-size: 16px;">📦</span>
          <span class="repo-name">${results.repo.owner}/${results.repo.repo}</span>
        </div>
        <div class="repo-meta">Scanned for known vulnerabilities</div>
      </div>
    `;
  }

  // Files scanned
  if (results.filesScanned && results.filesScanned.length > 0) {
    html += '<div class="files-scanned">';
    html += '<div class="section-title">📄 Dependency Files</div>';
    results.filesScanned.forEach(file => {
      const isVulnerable = file.vulnerabilityCount > 0;
      const statusClass = isVulnerable ? 'vulnerable' : 'clean';
      const statusText = isVulnerable 
        ? `${file.vulnerabilityCount} issue${file.vulnerabilityCount > 1 ? 's' : ''}`
        : 'Clean';
      
      // Get emoji based on file type
      let fileEmoji = '📄';
      if (file.name.includes('package')) fileEmoji = '📦';
      else if (file.name.includes('requirements')) fileEmoji = '🐍';
      else if (file.name.includes('go.')) fileEmoji = '🔷';
      else if (file.name.includes('Gemfile')) fileEmoji = '💎';
      else if (file.name.includes('Cargo')) fileEmoji = '🦀';
      else if (file.name.includes('composer')) fileEmoji = '🐘';
      
      html += `
        <div class="file-item">
          <div class="file-left">
            <div class="file-icon">${fileEmoji}</div>
            <div class="file-details">
              <div class="file-name">${file.name}</div>
              <div class="file-stats">${file.dependencyCount} ${file.dependencyCount === 1 ? 'dependency' : 'dependencies'}</div>
            </div>
          </div>
          <div class="file-status ${statusClass}">${statusText}</div>
        </div>
      `;
    });
    html += '</div>';
  }

  // Status message
  if (vulnCount === 0) {
    html += `
      <div class="status safe">
        <span class="status-icon">✅</span>
        <div>
          <strong>All Clear!</strong><br>
          No known vulnerabilities detected in your dependencies.
        </div>
      </div>
    `;
  } else {
    const criticalCount = results.vulnerabilities.filter(v => 
      v.severity.toLowerCase().includes('critical')).length;
    const highCount = results.vulnerabilities.filter(v => 
      v.severity.toLowerCase().includes('high')).length;
    const mediumCount = results.vulnerabilities.filter(v => 
      v.severity.toLowerCase().includes('medium') || v.severity.toLowerCase().includes('moderate')).length;

    html += `
      <div class="status danger">
        <span class="status-icon">⚠️</span>
        <div>
          <strong>Vulnerabilities Detected</strong><br>
          Found ${vulnCount} ${vulnCount === 1 ? 'security issue' : 'security issues'} in your dependencies.
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

    // Vulnerability list
    html += '<div class="section-title" style="margin-top: 20px;">🔍 Vulnerabilities</div>';
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
            <span class="package-icon">📦</span>
            <div class="package-details">
              <div class="package-name">${vuln.package}</div>
              <div class="package-version">Current version: ${vuln.version} ${vuln.fileName ? `• from ${vuln.fileName}` : ''}</div>
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
            <span class="fix-icon">💡</span>
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
            <span class="fix-icon">⚠️</span>
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
              View Details →
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
        <div class="empty-icon">📭</div>
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
