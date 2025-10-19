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
  const seenUrls = new Set();
  
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

  // Scan visible files first
  fileLinks.forEach(link => {
    const fileName = link.textContent.trim();
    if (dependencyFileMap[fileName]) {
      const url = link.href;
      
      if (!url || url === '#' || url.startsWith('chrome-extension://') || seenUrls.has(url)) {
        return;
      }
      
      seenUrls.add(url);
      
      let fullPath = fileName;
      const githubPathMatch = url.match(/github\.com\/(.+)/);
      if (githubPathMatch) {
        fullPath = githubPathMatch[1];
      }
      
      files.push({
        name: fileName,
        fullPath: fullPath,
        ecosystem: dependencyFileMap[fileName],
        url: url
      });
    }
  });

  // Now recursively search for dependency files in the entire repo
  const repoInfo = extractRepoInfo();
  if (repoInfo) {
    console.log('Recursively searching repository for all dependency files...');
    
    // Get the default branch
    const branch = await getDefaultBranch(repoInfo);
    
    // Recursively fetch all dependency files
    const nestedFiles = await findDependencyFilesRecursive(
      repoInfo.owner, 
      repoInfo.repo, 
      branch, 
      '', 
      dependencyFileMap,
      seenUrls
    );
    
    files.push(...nestedFiles);
  }

  console.log('Total unique dependency files found:', files.length);
  return files;
}

async function getDefaultBranch(repoInfo) {
  // Try to extract from current URL
  const branchMatch = window.location.pathname.match(/\/(tree|blob)\/([^\/]+)/);
  if (branchMatch) {
    return branchMatch[2];
  }
  
  // Default to 'main', fallback to 'master'
  return 'main';
}

async function findDependencyFilesRecursive(owner, repo, branch, path, dependencyFileMap, seenUrls, depth = 0) {
  const files = [];
  const maxDepth = 5; // Prevent infinite recursion
  
  if (depth > maxDepth) {
    console.log('Max depth reached, stopping recursion');
    return files;
  }
  
  try {
    // Use GitHub's tree API (works without auth for public repos)
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.log(`Could not fetch directory ${path}: ${response.status}`);
      return files;
    }
    
    const items = await response.json();
    
    for (const item of items) {
      if (item.type === 'file' && dependencyFileMap[item.name]) {
        const fileUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${item.path}`;
        
        if (!seenUrls.has(fileUrl)) {
          seenUrls.add(fileUrl);
          
          files.push({
            name: item.name,
            fullPath: `${owner}/${repo}/blob/${branch}/${item.path}`,
            ecosystem: dependencyFileMap[item.name],
            url: fileUrl
          });
          
          console.log(`Found nested file: ${item.path}`);
        }
      } else if (item.type === 'dir') {
        // Skip common directories that won't have dependencies
        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'out', 'target', 'vendor'];
        if (!skipDirs.includes(item.name)) {
          // Recursively search subdirectories
          const nestedFiles = await findDependencyFilesRecursive(
            owner, 
            repo, 
            branch, 
            item.path, 
            dependencyFileMap,
            seenUrls,
            depth + 1
          );
          files.push(...nestedFiles);
        }
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {
    console.error(`Error scanning directory ${path}:`, error);
  }
  
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

function getFixedVersions(vuln) {
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
