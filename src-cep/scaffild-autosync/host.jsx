function isMediaExtension(ext) {
    var exts = ["mp4", "mov", "mxf", "mkv", "avi", "braw", "r3d", "prores", "wav", "mp3", "aac", "aif", "aiff", "m4a", "flac", "png", "jpg", "jpeg", "svg", "psd", "ai", "tif", "tiff", "exr", "heic", "dng", "webp", "bmp"];
    for (var k = 0; k < exts.length; k++) {
        if (exts[k] === ext) return true;
    }
    return false;
}

function getProjectRootFolder() {
    try {
        if (!app.project || !app.project.path) return "";
        var projFile = new File(app.project.path);
        var root = projFile.parent;
        if (root.parent && root.parent.exists) {
            var pName = root.name.toLowerCase();
            if (pName.indexOf("01_") === 0 || pName.indexOf("project") !== -1 || pName.indexOf("prproj") !== -1) {
                root = root.parent;
            }
        }
        return root.fsName;
    } catch(e) {
        return "";
    }
}

function importMediaToTargetBin(filePath, binHierarchy) {
    try {
        if (!app.project) return JSON.stringify({ error: "No active Premiere Pro project" });

        function getOrCreateBin(name, parentBin) {
            var items = parentBin ? parentBin.children : app.project.rootItem.children;
            for (var i = 0; i < items.numItems; i++) {
                var item = items[i];
                if (item.type === ProjectItemType.BIN && item.name === name) {
                    return item;
                }
            }
            return parentBin ? parentBin.createBin(name) : app.project.rootItem.createBin(name);
        }

        var targetBin = null;
        if (binHierarchy && binHierarchy.length > 0) {
            for (var i = 0; i < binHierarchy.length; i++) {
                targetBin = getOrCreateBin(binHierarchy[i], targetBin);
            }
        } else {
            targetBin = app.project.rootItem;
        }

        var fileName = filePath.replace(/^.*[\\\/]/, '');
        for (var j = 0; j < targetBin.children.numItems; j++) {
            if (targetBin.children[j].name === fileName) {
                return JSON.stringify({ success: true, alreadyImported: true, file: filePath });
            }
        }

        app.project.importFiles([filePath], false, targetBin, false);
        return JSON.stringify({ success: true, imported: filePath, bin: targetBin.name });
    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

function syncEntireProjectFolder(rootFolderPath) {
    try {
        if (!app.project) return JSON.stringify({ error: "No active Premiere project" });
        var root = new Folder(rootFolderPath);
        if (!root.exists) return JSON.stringify({ error: "Folder does not exist" });

        function getOrCreateBin(name, parentBin) {
            var items = parentBin ? parentBin.children : app.project.rootItem.children;
            for (var i = 0; i < items.numItems; i++) {
                var item = items[i];
                if (item.type === ProjectItemType.BIN && item.name === name) {
                    return item;
                }
            }
            return parentBin ? parentBin.createBin(name) : app.project.rootItem.createBin(name);
        }

        var importedCount = 0;

        function traverseAndSync(dir, parentBin) {
            var files = dir.getFiles();
            if (!files) return;

            var mediaToImport = [];
            for (var i = 0; i < files.length; i++) {
                var f = files[i];
                var name = f.name;
                if (name.indexOf(".") === 0) continue;

                if (f instanceof Folder) {
                    var lower = name.toLowerCase();
                    if (lower.indexOf("01_project") === 0 || lower.indexOf("auto-save") !== -1 || lower.indexOf("preview") !== -1) {
                        continue;
                    }
                    var bin = getOrCreateBin(name, parentBin);
                    traverseAndSync(f, bin);
                } else if (f instanceof File) {
                    var ext = name.split('.').pop().toLowerCase();
                    if (isMediaExtension(ext) && ext !== "prproj") {
                        var target = parentBin || app.project.rootItem;
                        var exists = false;
                        for (var j = 0; j < target.children.numItems; j++) {
                            if (target.children[j].name === name) {
                                exists = true;
                                break;
                            }
                        }
                        if (!exists) {
                            mediaToImport.push(f.fsName);
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

        traverseAndSync(root, null);
        return JSON.stringify({ success: true, imported: importedCount });
    } catch(e) {
        return JSON.stringify({ error: e.toString() });
    }
}

function findOfflineClips() {
    try {
        if (!app.project) return JSON.stringify({ error: "No active Premiere Pro project" });

        var offlineClips = [];

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
        return JSON.stringify({ success: true, count: offlineClips.length, clips: offlineClips });
    } catch(e) {
        return JSON.stringify({ error: e.toString() });
    }
}

function isolateOfflineClips() {
    try {
        if (!app.project) return JSON.stringify({ error: "No active Premiere Pro project" });

        function getOrCreateBin(name, parentBin) {
            var items = parentBin ? parentBin.children : app.project.rootItem.children;
            for (var i = 0; i < items.numItems; i++) {
                var item = items[i];
                if (item.type === ProjectItemType.BIN && item.name === name) {
                    return item;
                }
            }
            return parentBin ? parentBin.createBin(name) : app.project.rootItem.createBin(name);
        }

        var trashBin = getOrCreateBin("_OFFLINE_TO_DELETE", null);
        var movedCount = 0;

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
        return JSON.stringify({ success: true, movedCount: movedCount, binName: "_OFFLINE_TO_DELETE" });
    } catch(e) {
        return JSON.stringify({ error: e.toString() });
    }
}
