const { exec } = require('child_process');
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);
const REPO_DIR = path.join(__dirname, '..', '..');

let syncTimeout = null;
let isSyncing = false;
let pendingSync = false;

/**
 * Executes the git add, commit, and push commands.
 */
async function performSync() {
  if (isSyncing) {
    pendingSync = true;
    return;
  }

  isSyncing = true;
  try {
    console.log('[Git Sync] Starting auto-sync to GitHub...');
    
    // Add all data changes
    await execAsync('git add data/', { cwd: REPO_DIR });
    
    // Check if there are actually changes to commit
    const { stdout: status } = await execAsync('git status --porcelain', { cwd: REPO_DIR });
    if (!status.trim()) {
      console.log('[Git Sync] No changes to commit.');
    } else {
      // Commit
      const timestamp = new Date().toISOString();
      await execAsync(`git commit -m "Auto-sync wiki data - ${timestamp} [skip ci]"`, { cwd: REPO_DIR });
      
      // Push
      await execAsync('git push origin main', { cwd: REPO_DIR });
      console.log('[Git Sync] Successfully pushed to GitHub.');
    }
  } catch (err) {
    console.error('[Git Sync] Error during sync:', err.message);
  } finally {
    isSyncing = false;
    if (pendingSync) {
      pendingSync = false;
      triggerSync(); // Run again if changes happened during the sync
    }
  }
}

const fs = require('fs');

/**
 * Triggers a debounced sync. If called multiple times quickly, it will wait
 * until 5 seconds have passed since the last call before executing.
 */
function triggerSync() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    performSync();
  }, 5000); // 5 second debounce
}

/**
 * Start watching the data directory for any changes to automatically trigger syncs.
 */
function startWatching() {
  const dataDir = path.join(REPO_DIR, 'data');
  console.log('[Git Sync] Watching data directory for auto-sync...');
  
  // Recursive watch (works on Windows/macOS, falls back gracefully on Linux)
  fs.watch(dataDir, { recursive: true }, (eventType, filename) => {
    // Ignore changes to the git directory itself just in case, though it's outside data/
    if (filename && !filename.includes('.git')) {
      triggerSync();
    }
  });
}

module.exports = {
  triggerSync,
  startWatching
};
