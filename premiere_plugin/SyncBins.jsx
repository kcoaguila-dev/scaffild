// SyncBins.jsx
// Premiere Pro ExtendScript Companion for Scaffild
// Scans the active project's parent root folder on disk, constructs missing bins,
// and recursively imports raw media files into 02_FOOTAGE/A_ROLL.

(function () {
    var logMsg = "";
    function log(msg) {
        logMsg += msg + "\n";
        $.writeln(msg);
    }

    if (!app.project) {
        alert("No active Premiere Pro project.");
        return;
    }

    var proj = app.project;
    if (!proj.path) {
        alert("Project is not saved on disk. Please save the project first.");
        return;
    }

    // Get the parent folder of the project file
    var projFile = new File(proj.path);
    var rootFolder = projFile.parent;
    log("Root folder: " + rootFolder.fsName);

    // Recursively create bins for folders on disk
    function syncDirectoryToBin(dir, parentBin) {
        var files = dir.getFiles();
        if (!files) return;

        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            // If it's a directory (and not hidden/system), create a bin for it
            if (f instanceof Folder && f.name.indexOf(".") !== 0) {
                var bin = getOrCreateBin(f.name, parentBin);
                syncDirectoryToBin(f, bin);
            }
        }
    }

    // Helper to find or create a bin inside a parent bin or at root
    function getOrCreateBin(name, parentBin) {
        var items = parentBin ? parentBin.children : app.project.rootItem.children;
        for (var i = 0; i < items.numItems; i++) {
            var item = items[i];
            if (item.type === ProjectItemType.BIN && item.name === name) {
                return item;
            }
        }
        var newBin = parentBin ? parentBin.createBin(name) : app.project.rootItem.createBin(name);
        return newBin;
    }

    // Recursively scan 02_FOOTAGE/A_ROLL and import media
    function importMedia(folder, targetBin) {
        if (!folder.exists) return;
        var files = folder.getFiles();
        if (!files) return;

        var filesToImport = [];
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            if (f instanceof Folder) {
                var subBin = getOrCreateBin(f.name, targetBin);
                importMedia(f, subBin);
            } else if (f instanceof File) {
                var ext = f.name.split('.').pop().toLowerCase();
                // Simple filter for common media extensions
                var mediaExts = ["mp4", "mov", "mxf", "avi", "wav", "mp3", "jpg", "png", "r3d", "braw"];
                if (mediaExts.indexOf(ext) !== -1) {
                    filesToImport.push(f.fsName);
                }
            }
        }

        if (filesToImport.length > 0) {
            app.project.importFiles(filesToImport, false, targetBin, false);
            log("Imported " + filesToImport.length + " files into " + targetBin.name);
        }
    }

    // 1. Sync entire directory structure to bins
    app.enableQE();
    syncDirectoryToBin(rootFolder, null);

    // 2. Import footage into 02_FOOTAGE/A_ROLL
    var aRollFolder = new Folder(rootFolder.fsName + "/02_FOOTAGE/A_ROLL");
    if (aRollFolder.exists) {
        // Find or create 02_FOOTAGE bin
        var footageBin = getOrCreateBin("02_FOOTAGE", null);
        var aRollBin = getOrCreateBin("A_ROLL", footageBin);
        importMedia(aRollFolder, aRollBin);
    } else {
        log("No 02_FOOTAGE/A_ROLL folder found.");
    }

    alert("Sync complete.\n\n" + logMsg);
})();
