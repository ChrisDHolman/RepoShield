// Background service worker
console.log('GitHub OSV Scanner: Background service worker loaded');

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('GitHub OSV Scanner installed');
});

// Optional: Update badge based on scan results
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateBadge') {
    const vulnCount = request.count;
    
    if (vulnCount > 0) {
      chrome.action.setBadgeText({ text: vulnCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
    } else {
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#28a745' });
    }
  }
});
