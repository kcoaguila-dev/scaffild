// SyncBins.jsx
// Premiere Pro ExtendScript Companion for Scaffild
// Dynamically mirrors ANY disk folder hierarchy into Premiere project bins,
// organizes timelines into 00_SEQUENCES, and auto-imports all media into matching bins.

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

    var projFile = new File(proj.path);
    var rootFolder = projFile.parent;

    // If the project file is nested inside a subfolder, climb up to find the root project folder
    if (rootFolder.parent && rootFolder.parent.exists) {
        var pName = rootFolder.name.toLowerCase();
        if (pName.indexOf("01_") === 0 || pName.indexOf("project") !== -1 || pName.indexOf("prproj") !== -1 || pName.indexOf("premiere") !== -1) {
            rootFolder = rootFolder.parent;
        }
    }

    log("Scaffild Root Folder: " + rootFolder.fsName);

    var mediaExts = ["mp4", "mov", "mxf", "avi", "wav", "mp3", "aif", "aac", "jpg", "jpeg", "png", "tif", "tiff", "psd", "ai", "r3d", "braw", "arri"];

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

    function syncDirectoryAndMedia(dir, parentBin) {
        var files = dir.getFiles();
        if (!files) return;

        var mediaToImport = [];

        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            if (f instanceof Folder && f.name.indexOf(".") !== 0) {
                var bin = getOrCreateBin(f.name, parentBin);
                syncDirectoryAndMedia(f, bin);
            } else if (f instanceof File && f.name.indexOf(".") !== 0) {
                var ext = f.name.split('.').pop().toLowerCase();
                if (mediaExts.indexOf(ext) !== -1) {
                    if (ext !== "prproj" && f.name.indexOf("SyncBins") === -1) {
                        mediaToImport.push(f.fsName);
                    }
                }
            }
        }

        if (mediaToImport.length > 0) {
            var target = parentBin || app.project.rootItem;
            app.project.importFiles(mediaToImport, false, target, false);
            log("Imported " + mediaToImport.length + " files into bin: " + (parentBin ? parentBin.name : "Root"));
        }
    }

    function organizeSequences() {
        var seqBin = getOrCreateBin("00_SEQUENCES", null);
        var rootChildren = app.project.rootItem.children;
        for (var i = rootChildren.numItems - 1; i >= 0; i--) {
            var item = rootChildren[i];
            if (item.type === ProjectItemType.CLIP && item.isSequence && item.isSequence()) {
                item.moveBin(seqBin);
            }
        }
    }

    app.enableQE();
    syncDirectoryAndMedia(rootFolder, null);
    organizeSequences();

    alert("Scaffild Sync Complete!\n\n" + logMsg);
})();
