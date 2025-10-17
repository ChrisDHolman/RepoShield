document.getElementById('scanBtn').addEventListener('click', async () => {
  const scanBtn = document.getElementById('scanBtn');
  const resultsDiv = document.getElementById('results');
  
  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning...';
  
  resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Scanning repository...</p></div>';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('github.com')) {
      resultsDiv.innerHTML = '<div class="status info">⚠️ Please navigate to a GitHub repository page.</div>';
      scanBtn.disabled = false;
      scanBtn.textContent = 'Scan Repository';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'scanRepo' }, (response) => {
      scanBtn.disabled = false;
      scanBtn.textContent = 'Scan Repository';
      
      if (chrome.runtime.lastError) {
        resultsDiv.innerHTML = `<div class="status danger">❌ Error: ${chrome.runtime.lastError.message}</div>`;
        return;
      }

      if (response.error) {
        resultsDiv.innerHTML = `<div class="status danger">❌ ${response.error}</div>`;
        return;
      }

      displayResults(response);
    });
  } catch (error) {
    resultsDiv.innerHTML = `<div class="status danger">❌ Error: ${error.message}</div>`;
    scanBtn.disabled = false;
    scanBtn.textContent = 'Scan Repository';
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
        <strong>Repository:</strong> ${results.repo.owner}/${results.repo.repo}
      </div>
    `;
  }

  // Files scanned
  if (results.filesScanned && results.filesScanned.length > 0) {
    html += '<div class="files-scanned">';
    html += '<strong style="font-size: 13px; color: #333;">📁 Files Scanned:</strong>';
    results.filesScanned.forEach(file => {
      const vulnText = file.vulnerabilityCount > 0 
        ? `<span style="color: #dc3545;">${file.vulnerabilityCount} issue${file.vulnerabilityCount > 1 ? 's' : ''}</span>`
        : `<span style="color: #28a745;">✓ Clean</span>`;
      html += `
        <div class="file-item">
          <span class="file-name">${file.name}</span>
          <span class="file-stats">${file.dependencyCount} deps · ${vulnText}</span>
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
        <strong>No vulnerabilities found!</strong><br>
        All dependencies appear to be safe.
      </div>
    `;
  } else {
    const criticalCount = results.vulnerabilities.filter(v => 
      v.severity.toLowerCase().includes('critical')).length;
    const highCount = results.vulnerabilities.filter(v => 
      v.severity.toLowerCase().includes('high')).length;

    html += `
      <div class="status danger">
        <span class="status-icon">⚠️</span>
        <strong>${vulnCount} ${vulnCount === 1 ? 'vulnerability' : 'vulnerabilities'} found</strong>
      </div>
    `;

    // Summary
    html += `
      <div class="summary">
        <div class="summary-item">
          <div class="summary-number" style="color: #dc3545">${criticalCount}</div>
          <div class="summary-label">Critical</div>
        </div>
        <div class="summary-item">
          <div class="summary-number" style="color: #fd7e14">${highCount}</div>
          <div class="summary-label">High</div>
        </div>
        <div class="summary-item">
          <div class="summary-number">${vulnCount}</div>
          <div class="summary-label">Total</div>
        </div>
      </div>
    `;

    // Vulnerability list
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
          <div class="package-name">📦 ${vuln.package} (${vuln.version})</div>
          <div class="vuln-summary">${vuln.summary || 'No description available'}</div>
      `;
      
      // Add fix suggestion if available
      if (vuln.fixedVersions && vuln.fixedVersions.length > 0) {
        const fixVersion = vuln.fixedVersions[0];
        html += `
          <div class="vuln-fix">
            <strong>💡 Fix Available:</strong> Upgrade to version <code>${fixVersion}</code> or later
          </div>
        `;
      }
      
      html += `
          <a href="${vuln.link}" target="_blank" class="vuln-link">View details →</a>
        </div>
      `;
    });
    
    html += '</div>';
  }

  resultsDiv.innerHTML = html;
}

// Load cached results on popup open
chrome.storage.local.get(['lastScan'], (result) => {
  if (result.lastScan) {
    displayResults(result.lastScan);
  }
});
