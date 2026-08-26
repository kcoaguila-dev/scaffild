function isMediaExtension(ext) {
    var exts = ["mp4", "mov", "mxf", "mkv", "avi", "braw", "r3d", "prores", "wav", "mp3", "aac", "aif", "aiff", "m4a", "flac", "png", "jpg", "jpeg", "svg", "psd", "ai", "tif", "tiff", "exr", "heic", "dng", "webp", "bmp"];
    for (var k = 0; k < exts.length; k++) {
        if (exts[k] === ext) return true;
    }
    return false;
}

function isAfterEffects() {
    return (typeof(app.project) !== "undefined" && typeof(app.project.rootItem) === "undefined");
}

function getProjectRootFolder() {
    try {
        if (!app.project) return "";
        if (isAfterEffects()) {
            if (!app.project.file) return "";
            var projFile = app.project.file;
            var root = projFile.parent;
            if (root.parent && root.parent.exists) {
                var pName = root.name.toLowerCase();
                if (pName.indexOf("01_") === 0 || pName.indexOf("project") !== -1 || pName.indexOf("aep") !== -1) {
                    root = root.parent;
                }
            }
            return root.fsName;
        } else {
            if (!app.project.path) return "";
            var projFile = new File(app.project.path);
            var root = projFile.parent;
            if (root.parent && root.parent.exists) {
                var pName = root.name.toLowerCase();
                if (pName.indexOf("01_") === 0 || pName.indexOf("project") !== -1 || pName.indexOf("prproj") !== -1) {
                    root = root.parent;
                }
            }
            return root.fsName;
        }
    } catch(e) {
        return "";
    }
}

// Build a global set of ALL file paths already imported anywhere in the project.
// Uses getMediaPath() for path-based deduplication (not name-based).
function buildPProImportedPathsSet(parentItem, result) {
    var items = parentItem.children;
    if (!items) return;
    for (var i = 0; i < items.numItems; i++) {
        var item = items[i];
        if (item.type === ProjectItemType.BIN) {
            buildPProImportedPathsSet(item, result);
        } else {
            try {
                var p = item.getMediaPath();
                if (p) {
                    result[p.toLowerCase()] = true;
                }
            } catch(e) {}
        }
    }
}

function syncEntireProjectFolder(rootFolderPath) {
    try {
        if (!app.project) return JSON.stringify({ error: "No active project" });
        var root = new Folder(rootFolderPath);
        if (!root.exists) return JSON.stringify({ error: "Folder does not exist" });

        var isAE = isAfterEffects();
        var importedCount = 0;

        if (isAE) {
            function getOrCreateAEFolder(name, parentFolder) {
                var pFolder = parentFolder || app.project.rootFolder;
                for (var i = 1; i <= app.project.numItems; i++) {
                    var it = app.project.item(i);
                    if (it instanceof FolderItem && it.name === name && it.parentFolder === pFolder) {
                        return it;
                    }
                }
                var newFolder = app.project.items.addFolder(name);
                if (parentFolder) {
                    newFolder.parentFolder = parentFolder;
                }
                return newFolder;
            }

            function isAEAlreadyImported(fileName, parentFolder) {
                var pFolder = parentFolder || app.project.rootFolder;
                for (var i = 1; i <= app.project.numItems; i++) {
                    var it = app.project.item(i);
                    if (it.name === fileName && it.parentFolder === pFolder) {
                        return true;
                    }
                }
                return false;
            }

            function traverseAESync(dir, parentFolder) {
                var files = dir.getFiles();
                if (!files) return;
                for (var i = 0; i < files.length; i++) {
                    var f = files[i];
                    var name = f.name;
                    if (name.indexOf(".") === 0) continue;
                    if (f instanceof Folder) {
                        var lower = name.toLowerCase();
                        if (lower.indexOf("01_project") === 0 || lower.indexOf("auto-save") !== -1 || lower.indexOf("preview") !== -1) continue;
                        var folder = getOrCreateAEFolder(name, parentFolder);
                        traverseAESync(f, folder);
                    } else if (f instanceof File) {
                        var ext = name.split(".").pop().toLowerCase();
                        if (isMediaExtension(ext) && ext !== "aep" && ext !== "prproj") {
                            if (!isAEAlreadyImported(name, parentFolder)) {
                                try {
                                    var impOpt = new ImportOptions(f);
                                    var impItem = app.project.importFile(impOpt);
                                    if (parentFolder && impItem) impItem.parentFolder = parentFolder;
                                    importedCount++;
                                } catch(err) {}
                            }
                        }
                    }
                }
            }

            traverseAESync(root, null);
            return JSON.stringify({ success: true, imported: importedCount, host: "After Effects" });

        } else {
            // Premiere Pro: build a global path set ONCE before traversal
            var importedPaths = {};
            buildPProImportedPathsSet(app.project.rootItem, importedPaths);

            function getOrCreateBin(name, parentBin) {
                var items = parentBin ? parentBin.children : app.project.rootItem.children;
                for (var i = 0; i < items.numItems; i++) {
                    var item = items[i];
                    if (item.type === ProjectItemType.BIN && item.name === name) return item;
                }
                return parentBin ? parentBin.createBin(name) : app.project.rootItem.createBin(name);
            }

            function traversePProSync(dir, parentBin) {
                var files = dir.getFiles();
                if (!files) return;

                var mediaToImport = [];
                for (var i = 0; i < files.length; i++) {
                    var f = files[i];
                    var name = f.name;
                    if (name.indexOf(".") === 0) continue;
                    if (f instanceof Folder) {
                        var lower = name.toLowerCase();
                        if (lower.indexOf("01_project") === 0 || lower.indexOf("auto-save") !== -1 || lower.indexOf("preview") !== -1) continue;
                        var bin = getOrCreateBin(name, parentBin);
                        traversePProSync(f, bin);
                    } else if (f instanceof File) {
                        var ext = name.split(".").pop().toLowerCase();
                        if (isMediaExtension(ext) && ext !== "prproj") {
                            var fsPath = f.fsName.toLowerCase();
                            // Global path check - no duplicate regardless of which bin it is in
                            if (!importedPaths[fsPath]) {
                                mediaToImport.push(f.fsName);
                                importedPaths[fsPath] = true; // mark immediately to block re-queuing
                            }
                        }
                    }
                }

                if (mediaToImport.length > 0) {
                    var targetBin = parentBin || app.project.rootItem;
                    app.project.importFiles(mediaToImport, false, targetBin, false);
                    importedCount += mediaToImport.length;
                }
            }

            traversePProSync(root, null);
            return JSON.stringify({ success: true, imported: importedCount, host: "Premiere Pro" });
        }
    } catch(e) {
        return JSON.stringify({ error: e.toString() });
    }
}

function findOfflineClips() {
    try {
        if (!app.project) return JSON.stringify({ error: "No active project" });
        var offlineClips = [];
        if (isAfterEffects()) {
            for (var i = 1; i <= app.project.numItems; i++) {
                var it = app.project.item(i);
                if (it instanceof FootageItem && it.footageMissing) {
                    if (!it.parentFolder || it.parentFolder.name !== "_OFFLINE_TO_DELETE") {
                        offlineClips.push(it.name);
                    }
                }
            }
        } else {
            function scanItems(parentItem) {
                var items = parentItem.children;
                if (!items) return;
                if (parentItem.name === "_OFFLINE_TO_DELETE") return;
                for (var i = 0; i < items.numItems; i++) {
                    var item = items[i];
                    if (item.type === ProjectItemType.BIN) {
                        scanItems(item);
                    } else if (item.type === ProjectItemType.CLIP || item.type === ProjectItemType.FILE) {
                        if (item.isOffline && item.isOffline()) {
                            offlineClips.push(item.name);
                        }
                    }
                }
            }
            scanItems(app.project.rootItem);
        }
        return JSON.stringify({ success: true, count: offlineClips.length, clips: offlineClips });
    } catch(e) {
        return JSON.stringify({ error: e.toString() });
    }
}

function isolateOfflineClips() {
    try {
        if (!app.project) return JSON.stringify({ error: "No active project" });
        var movedCount = 0;
        if (isAfterEffects()) {
            function getOrCreateAEFolder(name) {
                for (var i = 1; i <= app.project.numItems; i++) {
                    var it = app.project.item(i);
                    if (it instanceof FolderItem && it.name === name && it.parentFolder === app.project.rootFolder) return it;
                }
                return app.project.items.addFolder(name);
            }
            var trashFolder = getOrCreateAEFolder("_OFFLINE_TO_DELETE");
            for (var i = 1; i <= app.project.numItems; i++) {
                var it = app.project.item(i);
                if (it instanceof FootageItem && it.footageMissing && it.parentFolder !== trashFolder) {
                    it.parentFolder = trashFolder;
                    movedCount++;
                }
            }
        } else {
            function getOrCreateBin(name, parentBin) {
                var items = parentBin ? parentBin.children : app.project.rootItem.children;
                for (var i = 0; i < items.numItems; i++) {
                    var item = items[i];
                    if (item.type === ProjectItemType.BIN && item.name === name) return item;
                }
                return parentBin ? parentBin.createBin(name) : app.project.rootItem.createBin(name);
            }
            var trashBin = getOrCreateBin("_OFFLINE_TO_DELETE", null);
            function scanAndMove(parentItem) {
                var items = parentItem.children;
                if (!items) return;
                if (parentItem === trashBin || parentItem.name === "_OFFLINE_TO_DELETE") return;
                for (var i = items.numItems - 1; i >= 0; i--) {
                    var item = items[i];
                    if (item.type === ProjectItemType.BIN) {
                        scanAndMove(item);
                    } else if (item.type === ProjectItemType.CLIP || item.type === ProjectItemType.FILE) {
                        if (item.isOffline && item.isOffline()) {
                            item.moveBin(trashBin);
                            movedCount++;
                        }
                    }
                }
            }
            scanAndMove(app.project.rootItem);
        }
        return JSON.stringify({ success: true, movedCount: movedCount, binName: "_OFFLINE_TO_DELETE" });
    } catch(e) {
        return JSON.stringify({ error: e.toString() });
    }
}