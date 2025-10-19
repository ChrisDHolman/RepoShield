// Content script that runs on GitHub pages
console.log('GitHub OSV Scanner: Content script loaded');

// Listen for scan requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scanRepo') {
    scanRepository().then(sendResponse);
    return true; // Will respond asynchronously
  }
});

async function scanRepository() {
  const repoInfo = extractRepoInfo();
  
  if (!repoInfo) {
    return { error: 'Not a valid GitHub repository page' };
  }

  console.log('Scanning repository:', repoInfo);

  // Find dependency files
  const dependencyFiles = await findDependencyFiles();
  
  if (dependencyFiles.length === 0) {
    return {
      status: 'success',
      repo: repoInfo,
      vulnerabilities: [],
      filesScanned: []
    };
  }

  // Parse dependencies and check OSV
  const allVulnerabilities = [];
  const scannedFiles = [];
  
  for (const file of dependencyFiles) {
    const dependencies = await parseDependencyFile(file);
    
    // Check OSV for vulnerabilities
    const vulns = await checkOSV(dependencies, file.ecosystem, file.name);
    allVulnerabilities.push(...vulns);
    
    scannedFiles.push({
      name: file.name,
      fullPath: file.fullPath,
      url: file.url,
      ecosystem: file.ecosystem,
      dependencyCount: dependencies.length,
      vulnerabilityCount: vulns.length
    });
  }

  return {
    status: 'success',
    repo: repoInfo,
    vulnerabilities: allVulnerabilities,
    filesScanned: scannedFiles
  };
}

function extractRepoInfo() {
  const pathParts = window.location.pathname.split('/').filter(p => p);
  
  if (pathParts.length >= 2) {
    return {
      owner: pathParts[0],
      repo: pathParts[1],
      url: window.location.href
    };
  }
  
  return null;
}

async function findDependencyFiles() {
  const files = [];
  const seenUrls = new Set(); // Track URLs we've already added
  
  // Check for common dependency files in the file tree
  const fileLinks = document.querySelectorAll('a[title], div[role="rowheader"] a, a.Link--primary');
  
  const dependencyFileMap = {
    'package.json': 'npm',
    'package-lock.json': 'npm',
    'yarn.lock': 'npm',
    'requirements.txt': 'PyPI',
    'Pipfile': 'PyPI',
    'Pipfile.lock': 'PyPI',
    'go.mod': 'Go',
    'go.sum': 'Go',
    'Gemfile': 'RubyGems',
    'Gemfile.lock': 'RubyGems',
    'pom.xml': 'Maven',
    'build.gradle': 'Maven',
    'Cargo.toml': 'crates.io',
    'Cargo.lock': 'crates.io',
    'composer.json': 'Packagist',
    'composer.lock': 'Packagist'
  };

  fileLinks.forEach(link => {
    const fileName = link.textContent.trim();
    if (dependencyFileMap[fileName]) {
      // Extract the full path from the URL
      const url = link.href;
      
      // Make sure we have a valid absolute URL and haven't seen it before
      if (!url || url === '#' || url.startsWith('chrome-extension://') || seenUrls.has(url)) {
        if (seenUrls.has(url)) {
          console.log('Skipping duplicate file:', fileName, url);
        } else {
          console.warn('Invalid URL for file:', fileName, url);
        }
        return;
      }
      
      seenUrls.add(url); // Mark this URL as seen
      
      console.log('Found dependency file:', fileName, 'Full URL:', url);
      
      // Extract the full GitHub-style path including owner/repo/blob/branch/path
      let fullPath = fileName;
      
      // Try to extract the full path from URL: owner/repo/blob/branch/path/to/file
      const githubPathMatch = url.match(/github\.com\/(.+)/);
      if (githubPathMatch) {
        fullPath = githubPathMatch[1];
      } else {
        // Fallback: just extract after /blob/ or /tree/
        let pathMatch = url.match(/\/blob\/[^\/]+\/(.+)/);
        if (pathMatch) {
          fullPath = pathMatch[1];
        } else {
          pathMatch = url.match(/\/tree\/[^\/]+\/(.+)/);
          if (pathMatch) {
            fullPath = pathMatch[1] + '/' + fileName;
          }
        }
      }
      
      console.log('Extracted path:', fullPath, 'Using URL:', url);
      
      files.push({
        name: fileName,
        fullPath: fullPath,
        ecosystem: dependencyFileMap[fileName],
        url: url
      });
    }
  });

  console.log('Total unique dependency files found:', files.length, files);
  return files;
}

async function parseDependencyFile(file) {
  // Fetch the raw file content
  const rawUrl = file.url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  
  try {
    const response = await fetch(rawUrl);
    const content = await response.text();
    
    return extractDependencies(content, file.name, file.ecosystem);
  } catch (error) {
    console.error('Error fetching file:', error);
    return [];
  }
}

function extractDependencies(content, fileName, ecosystem) {
  const dependencies = [];

  try {
    if (fileName === 'package.json') {
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      for (const [name, version] of Object.entries(deps || {})) {
        dependencies.push({
          name,
          version: version.replace(/^[\^~]/, ''), // Remove ^ or ~
          ecosystem: 'npm'
        });
      }
    } else if (fileName === 'requirements.txt') {
      const lines = content.split('\n');
      lines.forEach(line => {
        const match = line.match(/^([a-zA-Z0-9\-_]+)==([0-9.]+)/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[2],
            ecosystem: 'PyPI'
          });
        }
      });
    } else if (fileName === 'go.mod') {
      const lines = content.split('\n');
      lines.forEach(line => {
        const match = line.match(/^\s+([^\s]+)\s+v([0-9.]+)/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[2],
            ecosystem: 'Go'
          });
        }
      });
    } else if (fileName === 'Gemfile.lock') {
      const lines = content.split('\n');
      let inSpecs = false;
      lines.forEach(line => {
        if (line.trim() === 'specs:') {
          inSpecs = true;
          return;
        }
        if (inSpecs) {
          const match = line.match(/^\s+([a-z0-9\-_]+)\s+\(([0-9.]+)\)/i);
          if (match) {
            dependencies.push({
              name: match[1],
              version: match[2],
              ecosystem: 'RubyGems'
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('Error parsing dependencies:', error);
  }

  return dependencies;
}

async function checkOSV(dependencies, ecosystem, fileName) {
  const vulnerabilities = [];
  
  // Batch requests to OSV (max 1000 queries per request)
  const batchSize = 100;
  
  for (let i = 0; i < dependencies.length; i += batchSize) {
    const batch = dependencies.slice(i, i + batchSize);
    const queries = batch.map(dep => ({
      package: {
        name: dep.name,
        ecosystem: dep.ecosystem
      },
      version: dep.version
    }));

    try {
      const response = await fetch('https://api.osv.dev/v1/querybatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries })
      });

      const results = await response.json();
      
      // Process each result
      for (let index = 0; index < results.results.length; index++) {
        const result = results.results[index];
        if (result.vulns && result.vulns.length > 0) {
          const dep = batch[index];
          
          // For each vulnerability ID, fetch the full details
          for (const vulnSummary of result.vulns) {
            try {
              // Fetch full vulnerability details
              const detailResponse = await fetch(`https://api.osv.dev/v1/vulns/${vulnSummary.id}`);
              const vuln = await detailResponse.json();
              
              const severity = getSeverity(vuln);
              console.log(`Vulnerability ${vuln.id}: severity = ${severity}`);
              
              const fixedVersions = getFixedVersions(vuln);
              
              vulnerabilities.push({
                package: dep.name,
                version: dep.version,
                ecosystem: dep.ecosystem,
                id: vuln.id,
                summary: vuln.summary,
                severity: severity,
                link: `https://osv.dev/vulnerability/${vuln.id}`,
                fileName: fileName,
                fixedVersions: fixedVersions
              });
            } catch (error) {
              console.error(`Error fetching details for ${vulnSummary.id}:`, error);
              // Add with minimal info if detail fetch fails
              vulnerabilities.push({
                package: dep.name,
                version: dep.version,
                ecosystem: dep.ecosystem,
                id: vulnSummary.id,
                summary: 'Unable to fetch vulnerability details',
                severity: 'MEDIUM',
                link: `https://osv.dev/vulnerability/${vulnSummary.id}`,
                fileName: fileName,
                fixedVersions: []
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error querying OSV:', error);
    }
  }

  return vulnerabilities;
}

async function checkAikidoIntel(dependencies, ecosystem) {
  const aikidoFindings = [];
  
  // Aikido Intel covers multiple ecosystems but primarily npm for malware
  const ecosystemMap = {
    'npm': 'js',
    'PyPI': 'python',
    'Maven': 'java',
    'Go': 'go',
    'RubyGems': 'ruby',
    'crates.io': 'rust',
    'Packagist': 'php'
  };
  
  const aikidoLang = ecosystemMap[ecosystem];
  if (!aikidoLang) {
    return aikidoFindings;
  }
  
  console.log(`Checking ${dependencies.length} packages against Aikido Intel for malware...`);
  
  // Check each package
  for (const dep of dependencies) {
    try {
      // Query Aikido Intel GitHub API to search for vulnerabilities
      // We'll search their vulnerability database
      const searchQuery = `${dep.name} repo:AikidoSec/intel language:${aikidoLang}`;
      const githubSearchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await fetch(githubSearchUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.total_count > 0) {
          // Found potential Aikido Intel entry
          console.log(`Found Aikido Intel entry for ${dep.name}`);
          
          // Fetch the actual vulnerability file
          for (const item of data.items.slice(0, 3)) { // Check first 3 results
            try {
              const fileResponse = await fetch(item.url);
              if (fileResponse.ok) {
                const fileData = await fileResponse.json();
                const contentResponse = await fetch(fileData.download_url);
                const vulnData = await contentResponse.json();
                
                // Check if this package/version is affected
                if (vulnData.package_name === dep.name && isVersionAffected(dep.version, vulnData)) {
                  aikidoFindings.push({
                    package: dep.name,
                    version: dep.version,
                    id: vulnData.aikido_id || 'AIKIDO-' + vulnData.package_name,
                    type: vulnData.vulnerable_to || 'Malware/Supply Chain Risk',
                    severity: vulnData.severity_class || 'HIGH',
                    score: vulnData.aikido_score || 80,
                    description: vulnData.tldr || 'Potential security issue detected by Aikido Intel',
                    link: `https://intel.aikido.dev/` // They don't have direct links per vuln
                  });
                }
              }
            } catch (err) {
              console.error(`Error fetching Aikido Intel file:`, err);
            }
          }
        }
      }
      
      // Rate limiting: wait a bit between requests to GitHub API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error checking ${dep.name} against Aikido Intel:`, error);
    }
  }
  
  console.log(`Aikido Intel check complete. Found ${aikidoFindings.length} additional issues.`);
  return aikidoFindings;
}

function isVersionAffected(version, vulnData) {
  // Check if the version falls within vulnerable ranges
  if (!vulnData.vulnerable_ranges || vulnData.vulnerable_ranges.length === 0) {
    return false;
  }
  
  // Simple version check - in production you'd use semver library
  for (const range of vulnData.vulnerable_ranges) {
    if (range === '*') {
      // Check if version is in patch_versions (fixed versions)
      if (vulnData.patch_versions && vulnData.patch_versions.includes(version)) {
        return false;
      }
      return true; // All versions vulnerable except patches
    }
    // Additional range checking logic would go here
  }
  
  return false;
}

async function checkAikidoMalware(dependencies, ecosystem) {
  const malwareFindings = [];
  
  // Aikido Intel primarily focuses on npm/JavaScript packages for malware
  if (ecosystem !== 'npm') {
    return malwareFindings;
  }
  
  // Check each package against Aikido Intel
  // Note: Aikido's database is in GitHub, we'll check via their search
  // Since we can't easily query their entire database, we'll use a heuristic approach
  // by checking intel.aikido.dev directly
  
  for (const dep of dependencies) {
    try {
      // Query intel.aikido.dev for the package
      const searchUrl = `https://intel.aikido.dev/?search=${encodeURIComponent(dep.name)}`;
      
      // Note: Since we can't directly query their API without auth,
      // we'll mark packages as "check recommended" for manual review
      // In a production environment, you'd want to:
      // 1. Clone their GitHub repo periodically
      // 2. Build a local index
      // 3. Query against that index
      
      console.log(`Checking ${dep.name} against Aikido Intel...`);
      
      // For now, we'll add a flag to check suspicious patterns
      const suspiciousPatterns = [
        /preinstall/i,
        /postinstall/i,
        /install.*script/i
      ];
      
      // This is a placeholder - in production you'd query actual Aikido data
      // malwareFindings would be populated from actual Aikido Intel data
      
    } catch (error) {
      console.error(`Error checking ${dep.name} for malware:`, error);
    }
  }
  
  return malwareFindings;
}
  const fixed = [];
  
  if (vuln.affected) {
    vuln.affected.forEach((affected) => {
      if (affected.ranges) {
        affected.ranges.forEach((range) => {
          if (range.events) {
            range.events.forEach((event) => {
              if (event.fixed) {
                fixed.push(event.fixed);
              }
            });
          }
        });
      }
      
      if (affected.database_specific) {
        if (affected.database_specific.fixed_versions) {
          fixed.push(...affected.database_specific.fixed_versions);
        }
        if (affected.database_specific.patched_versions) {
          fixed.push(...affected.database_specific.patched_versions);
        }
      }
    });
  }
  
  // Also check top-level database_specific
  if (vuln.database_specific) {
    if (vuln.database_specific.fixed_versions) {
      fixed.push(...vuln.database_specific.fixed_versions);
    }
    if (vuln.database_specific.patched_versions) {
      fixed.push(...vuln.database_specific.patched_versions);
    }
  }
  
  // Remove duplicates and clean up versions
  const uniqueFixed = [...new Set(fixed)].map(v => v.replace(/^v/, ''));
  
  if (uniqueFixed.length > 0) {
    console.log(`✅ Found ${uniqueFixed.length} fix version(s) for ${vuln.id}:`, uniqueFixed);
  }
  
  return uniqueFixed;
}

function getSeverity(vuln) {
  // Try to extract severity from various fields
  
  // Check severity array first (most common in OSV)
  if (vuln.severity && Array.isArray(vuln.severity)) {
    for (const sev of vuln.severity) {
      if (sev.type === 'CVSS_V3' && sev.score) {
        // Convert CVSS score to severity level
        const score = parseFloat(sev.score);
        if (score >= 9.0) return 'CRITICAL';
        if (score >= 7.0) return 'HIGH';
        if (score >= 4.0) return 'MEDIUM';
        return 'LOW';
      }
    }
  }
  
  // Check database_specific severity
  if (vuln.database_specific) {
    if (vuln.database_specific.severity) {
      return vuln.database_specific.severity.toUpperCase();
    }
    if (vuln.database_specific.cvss_score) {
      const score = parseFloat(vuln.database_specific.cvss_score);
      if (score >= 9.0) return 'CRITICAL';
      if (score >= 7.0) return 'HIGH';
      if (score >= 4.0) return 'MEDIUM';
      return 'LOW';
    }
  }
  
  // Check ecosystem_specific
  if (vuln.ecosystem_specific && vuln.ecosystem_specific.severity) {
    return vuln.ecosystem_specific.severity.toUpperCase();
  }
  
  // Check top-level severity field
  if (vuln.severity && typeof vuln.severity === 'string') {
    return vuln.severity.toUpperCase();
  }
  
  // Default to MEDIUM if we can't determine
  console.log('Could not determine severity for', vuln.id, '- defaulting to MEDIUM');
  return 'MEDIUM';
}

// Auto-scan when the page loads
window.addEventListener('load', () => {
  setTimeout(async () => {
    console.log('Auto-scanning repository...');
    const results = await scanRepository();
    
    // Store results
    chrome.storage.local.set({ lastScan: results });
    
    // Send message to background to open popup if vulnerabilities found
    if (results.vulnerabilities && results.vulnerabilities.length > 0) {
      chrome.runtime.sendMessage({ 
        action: 'scanComplete', 
        vulnCount: results.vulnerabilities.length 
      });
    }
  }, 2000); // Wait 2 seconds for page to fully load
});
