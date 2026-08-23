var cs = new CSInterface();
var fs = require("fs");
var path = require("path");
var os = require("os");

var currentWatchedDir = "";
var activeWatcher = null;
var syncTimeout = null;

function log(msg, cls) {
  var el = document.getElementById("log");
  if (!el) return;
  var entry = document.createElement("div");
  entry.className = "log-entry " + (cls || "");
  entry.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg;
  el.appendChild(entry);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 100) el.removeChild(el.firstChild);
}

function manualSync() {
  cs.evalScript("getProjectRootFolder()", function(rootFolder) {
    if (!rootFolder || rootFolder === "undefined") {
      log("No active project found.", "err");
      return;
    }
    log("Scanning project: " + path.basename(rootFolder) + "...", "log-info");
    var escaped = rootFolder.replace(/\\/g, "\\\\");
    cs.evalScript("syncEntireProjectFolder('" + escaped + "')", function(res) {
      try {
        var parsed = JSON.parse(res);
        if (parsed.success) {
          log("Sync complete! Imported " + parsed.imported + " new files.", "log-ok");
        } else {
          log("Sync: " + (parsed.error || res), "err");
        }
      } catch (e) {
        log("Sync result: " + res, "log-ok");
      }
    });
  });
}

function watchProjectDir(dir) {
  if (currentWatchedDir === dir && activeWatcher) return;
  if (activeWatcher) {
    try { activeWatcher.close(); } catch(e) {}
    activeWatcher = null;
  }
  
  currentWatchedDir = dir;
  log("Watching folder: " + path.basename(dir), "log-ok");
  
  try {
    activeWatcher = fs.watch(dir, { recursive: true }, function(eventType, filename) {
      if (!filename) return;
      var lower = filename.toLowerCase();
      if (lower.indexOf("01_project") === 0 || lower.indexOf("auto-save") !== -1 || lower.indexOf(".prproj") !== -1 || lower.indexOf(".tmp") !== -1) {
        return;
      }
      
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(function() {
        log("Detected change: " + path.basename(filename) + " -> AutoSyncing...", "log-info");
        manualSync();
      }, 400);
    });
  } catch(e) {
    log("Watcher notice: " + e.message, "log-info");
  }
}

// Check active project every 2 seconds
setInterval(function() {
  cs.evalScript("getProjectRootFolder()", function(rootFolder) {
    if (rootFolder && rootFolder !== "undefined" && rootFolder !== currentWatchedDir) {
      watchProjectDir(rootFolder);
      manualSync();
    }
  });
}, 2000);

// Run initial sync on panel load
setTimeout(function() {
  cs.evalScript("getProjectRootFolder()", function(rootFolder) {
    if (rootFolder && rootFolder !== "undefined") {
      watchProjectDir(rootFolder);
      manualSync();
    }
  });
}, 800);