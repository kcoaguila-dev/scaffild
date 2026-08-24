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

function closeModal() {
  document.getElementById("modalOverlay").style.display = "none";
}

function promptCleanOffline() {
  cs.evalScript("findOfflineClips()", function(res) {
    try {
      var parsed = JSON.parse(res);
      if (!parsed.success) {
        log("Scan error: " + (parsed.error || res), "log-err");
        return;
      }
      if (parsed.count === 0) {
        log("No offline clips found. Project is 100% connected!", "log-ok");
        return;
      }
      document.getElementById("modalMsg").textContent = "Found " + parsed.count + " missing clip" + (parsed.count > 1 ? "s" : "") + " deleted from disk. Move them to _OFFLINE_TO_DELETE bin?";
      var listHtml = "";
      for (var i = 0; i < parsed.clips.length; i++) {
        listHtml += "<div>� " + parsed.clips[i] + "</div>";
      }
      document.getElementById("modalList").innerHTML = listHtml;
      document.getElementById("modalOverlay").style.display = "flex";
    } catch(e) {
      log("Scan error: " + res, "log-err");
    }
  });
}

function confirmCleanOffline() {
  closeModal();
  log("Isolating offline clips...", "log-warn");
  cs.evalScript("isolateOfflineClips()", function(res) {
    try {
      var parsed = JSON.parse(res);
      if (parsed.success) {
        log("Clean complete! Moved " + parsed.movedCount + " offline clips to _OFFLINE_TO_DELETE bin.", "log-ok");
      } else {
        log("Clean error: " + (parsed.error || res), "log-err");
      }
    } catch(e) {
      log("Clean result: " + res, "log-ok");
    }
  });
}

function manualSync() {
  cs.evalScript("getProjectRootFolder()", function(rootFolder) {
    if (!rootFolder || rootFolder === "undefined") {
      log("No active project found.", "log-err");
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
          log("Sync error: " + (parsed.error || res), "log-err");
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

// Check active project periodically
setInterval(function() {
  cs.evalScript("getProjectRootFolder()", function(rootFolder) {
    if (rootFolder && rootFolder !== "undefined" && rootFolder !== currentWatchedDir) {
      watchProjectDir(rootFolder);
      manualSync();
    }
  });
}, 2000);

setTimeout(function() {
  cs.evalScript("getProjectRootFolder()", function(rootFolder) {
    if (rootFolder && rootFolder !== "undefined") {
      watchProjectDir(rootFolder);
      manualSync();
    }
  });
}, 800);
