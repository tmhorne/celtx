/* ***** BEGIN LICENCE BLOCK *****
 * Version: MPL 2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Celtx Script Manager.
 * 
 * The Initial Developer of the Original Code is 4067479 Canada Inc.
 * t/a CELTX.
 * 
 * Portions created by Celtx are Copyright (C) 4067479 Canada Inc. All
 * Rights Reserved.
 * 
 * Contributor(s):
 *
 ***** END LICENCE BLOCK ***** */

var dialog = new Object();

function loaded () {
  dialog.cfg = window.arguments[0];
  dialog.self = document.documentElement;
  dialog.close = dialog.self.getButton("cancel");

  dialog.message = {
    current: document.getElementById("current-message"),
    overall: document.getElementById("overall-message")
  };

  dialog.meter = {
    current: document.getElementById("current-meter"),
    overall: document.getElementById("overall-meter")
  };

  dialog.revision = 0;

  try {
    // Step 0: Prepare the dialog and the model
    init();
    prepareModel();
    // Step 1: Send the model
    sendModel();
    // Step 2: Upload the specified local files
    // Step 3: Send a finish message
    // Step 4: Update the project with the new revision number
    // Step 5: There is no step 5
  }
  catch (ex) {
    dump("*** sync: " + ex + "\n");
    var deck = document.getElementById('deck');
    deck.selectedIndex = 1;
    dialog.close.label = gApp.getText("Close");
    dialog.close.hidden = false;

    var msg = document.getElementById('err-msg');
    msg.appendChild(document.createTextNode(ex));
  }
}


function msg (m, s) { dialog.message[m].value = s; }
function mtr (m, v) { dialog.meter[m].value   = v; }


function fileFor (leafName) {
  var file = dialog.cfg.path.clone();
  file.append(leafName);
  return file;
}


function tempFileFor (leafName) {
  var file = dialog.tmpDir.clone();
  file.append(leafName);
  return file;
}


function canceled () {
  return true;
}


function init () {
  msg('current', gApp.getText("PreparingFiles"));
  msg('overall', gApp.getText("OverallProgress"));

  var cxsvc = getCeltxService();
  dialog.cfg.syncURL = cxsvc.workspaceURI;
  if (! dialog.cfg.syncURL)
    throw "No workspace URI set";

  if (dialog.cfg.wsref)
    dialog.cfg.syncURL += "/project/" + dialog.cfg.wsref;
  else
    dialog.cfg.syncURL += "/projects";

  var tmpDir = getTempDir();
  tmpDir.append('sync');
  tmpDir.createUnique(1, 0700);

  dialog.tmpDir = tmpDir;

  mtr('overall', 5);
}


function prepareModel () {
  msg('current', gApp.getText("UpdatingMetadata"));

  var sourceFile = dialog.cfg.path.clone();
  sourceFile.append(Cx.PROJECT_FILE);
  if (! sourceFile.exists()) throw "init: not found: " + sourceFile.path;

  var targetFile = dialog.tmpDir.clone();
  targetFile.append(Cx.PROJECT_FILE);

  var sourceURL = fileToFileURL(sourceFile);
  var targetURL = fileToFileURL(targetFile);
  dialog.dsURL  = targetURL;

  var sourceDS = loadDataSource(sourceURL);
  sourceDS.FlushTo(targetURL);
  sourceDS = null;

  var targetDS = loadDataSource(targetURL);

  var model = new RDFModel(targetDS);

  var res = model.source(PROP('rdf:type'), RES(Cx.NS_CX + 'Project'));
  if (! res) throw "init: no project class";
  dialog.projRes = res;

  var oldMsgs = model.targets(res, PROP('cx:commitMessage'));
  while (oldMsgs.length > 0)
    model.remove(res, PROP('cx:commitMessage'), oldMsgs.shift());
  model.add(res, PROP('cx:commitMessage'),
    LIT(dialog.cfg.comments ? dialog.cfg.comments : ""));

  updateFileMetaData(model, PROP('cx:localFile'), PROP('cx:fileSize'));
  updateFileMetaData(model, PROP('cx:auxFile'  ), PROP('cx:auxSize' ));

  targetDS.Flush();

  mtr('overall', 10);
}


function updateFileMetaData (model, fileProp, sizeProp) {
  var i, res, leaf, file;
  var stmts = model.find(null, fileProp, null);

  for (i = 0; i < stmts.length; i++) {
    res  = stmts[i][0];
    leaf = stmts[i][2];
    dump(res + " -> " + leaf + "\n");
    file = fileFor(leaf.value);
    if (! file.exists()) {
      dump("not found: " + leaf + "\n");
      continue;
    }
    setLiteralProp(model, res, sizeProp, LIT(file.fileSize));
  }
}


function sendModel () {
  // We can't use nsIDOMDocument.load here because it throws a security
  // exception trying to parse a file:// URL as of Firefox 3.
  var dsFile = fileURLToFile(dialog.dsURL);
  var parser = new DOMParser();
  var bis = getBufferedFileInputStream(dsFile);
  var dom = parser.parseFromStream(bis, "UTF-8", dsFile.fileSize,
    "application/xml");
  bis.close();

  // Deadman timer
  if (dialog.deadman)
    clearTimeout(dialog.deadman);
  dialog.gotResponse = false;
  dialog.deadman = setTimeout(checkStatus, 300*1000);

  var req = new XMLHttpRequest();
  req.onload  = handleResponse;
  req.onerror = function (evt) { handleRequestError(req) };
  req.onreadystatechange = function (evt) {
    // Silly progress indicator
    mtr('current', req.readyState * 10);
  };

  if (dialog.cfg.wsref) {
    dump("--- PUTting to " + dialog.cfg.syncURL + "\n");
    req.open("PUT", dialog.cfg.syncURL, true);
  }
  else {
    dump("--- POSTing to " + dialog.cfg.syncURL + "\n");
    req.open("POST", dialog.cfg.syncURL, true);
  }
  req.setRequestHeader("Content-Type", "application/rdf+xml");
  req.setRequestHeader("Accept", "application/rdf+xml");
  req.send(dom);

  dialog.publishRequest = req;

  msg('current', gApp.getText("WaitingForResponse"));
}


function checkStatus () {
  dialog.deadman = null;
  if (! dialog.gotResponse) {
    handleRequestError();
  }
}


function handleRequestError (req) {
  var deck = document.getElementById('deck');
  deck.selectedIndex = 1;
  dialog.close.label = gApp.getText("Close");
  dialog.close.hidden = false;

  var errDoc, err;

  if (! req) {
    // Generic message
    err = gApp.getText("UnknownErrorMsg");
  }
  else if (req.status == 400 || req.status == 403 ||
           req.status == 404 || req.status == 409) {
    // 400 Bad Request, 403 Forbidden, 404 Not Found, 409 Conflict
    errDoc = req.responseXML;
    if (errDoc) {
      err = errDoc.documentElement.firstChild.nodeValue;
    }
  }
  else if (req.status == 500) {
    // 500 Server Error
    err = gApp.getText("UnknownServerErrorMsg");
  }

  var msg = document.getElementById('err-msg');
  if (req)
    msg.appendChild(document.createTextNode(err + "(" + req.status + ")"));
  else
    msg.appendChild(document.createTextNode(err));
}


// Called from request onload
function handleResponse (evt) {
  dialog.gotResponse = true;
  dialog.uploads = [];

  msg('current', gApp.getText("ResponseReceived"));
  mtr('current', 100);

  var req = dialog.publishRequest;

  if (req.status != 200) {
    handleRequestError(req);
    return;
  }

  var m = stringToModel(req.responseText);

  var transRes = m.source(PROP('cx:project'), dialog.projRes);
  if (! transRes) throw "missing transaction uri";
  dialog.transRes = transRes;
  dump("trans res: " + transRes + "\n");

  var finishRes = m.target(transRes, PROP('cx:finish'));
  if (! finishRes) throw "missing transaction finish uri";
  dialog.finishURL = finishRes.value;
  
  // Find all our uploads
  var uploads = m.targets(transRes, PROP('cx:action'));
  
  var leaf, dest, rec;
  for (var i = 0; i < uploads.length; i++) {
    leaf = m.target(uploads[i], PROP('cx:localFile'));
    dest = m.target(uploads[i], PROP('cx:destination'));
    rec = { leaf: leaf.value, dest: dest.value };
    dialog.uploads.push(rec);
  }

  dialog.uploadCount = 0;
  dialog.uploadMax = dialog.uploads.length;

  maybeDoUpload();
}


function maybeDoUpload () {
  var rec = dialog.uploads.pop();
  if (rec) {
    var progress = 10 + dialog.uploadCount / dialog.uploadMax * 40;
    mtr('overall', progress);
    doUpload(rec);
  }
  else {
    mtr('current', 100);
    finishUploads();
  }
}


function finishUploads () {
  // TODO: ping the completion URL (via xmlhttprequest POST)
  mtr('overall', 50);

  // Deadman timer
  if (dialog.deadman)
    clearTimeout(dialog.deadman);
  dialog.gotResponse = false;
  dialog.deadman = setTimeout(checkStatus, 300*1000);

  var req = new XMLHttpRequest();
  req.onload  = handleFinishResponse;
  req.onerror = function (evt) { dump("req error\n"); };
  req.onreadystatechange = function (evt) {
    // Silly progress indicator
    mtr('current', req.readyState * 10);
  };

  dialog.finishRequest = req;

  var xmlok = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\n<ok/>\n";

  req.open('POST', dialog.finishURL);
  req.send(xmlok);

  msg('current', gApp.getText("WaitingForResponse"));
}


function handleFinishResponse (evt) {
  dialog.gotResponse = true;
  dialog.downloads = [];
  
  msg('current', gApp.getText("ResponseReceived"));
  mtr('current', 100);

  var req = dialog.finishRequest;

  if (req.status != 200) {
    handleRequestError(req);
    return;
  }

  var m = stringToModel(req.responseText);
  
  // XXX hack for download mode
  if (! dialog.transRes) {
    dialog.transRes = m.source(PROP('cx:project'), dialog.projRes);
  }

  if (dialog.mode == 'sync') {
    var rev = m.target(dialog.transRes, PROP('cx:revision'));
    dialog.revision = rev.value;
  }

  var downloads = m.targets(dialog.transRes, PROP('cx:action'));
  
  var leaf, src, rec;
  for (var i = 0; i < downloads.length; i++) {
    leaf = m.target(downloads[i], PROP('cx:localFile'));
    src  = m.target(downloads[i], PROP('cx:source'));
    rec = { leaf: leaf.value, src: src.value };
    dialog.downloads.push(rec);
  }

  dialog.downloadCount = 0;
  dialog.downloadMax = dialog.downloads.length;

  maybeDoDownload();
}


function showServerPanelCallback () {
  if (dialog.frame.docShell.busyFlags) {
    setTimeout(showServerPanelCallback, 100);
    return;
  }
  dialog.gotResponse = true;
  if (dialog.deadman) {
    clearTimeout(dialog.deadman);
    dialog.deadman = false;
  }
  dialog.deck.selectedIndex = 0;
  dialog.close.hidden = true;
}


function maybeDoDownload () {
  var rec = dialog.downloads.pop();
  if (rec) {
    var progress = 50 + dialog.downloadCount / dialog.downloadMax * 40;
    mtr('overall', progress);
    doDownload(rec);
  }
  else {
    mtr('current', 100);
    finishDownloads();
  }
}


function finishDownloads () {
  mtr('overall', 90);
  importFiles();
  mtr('overall', 95);
  cleanUp();
  mtr('overall', 100);
  done();
}


function importFiles () {
  dump("importFiles\n");

  // XXX download mode
  if (dialog.mode == 'sync') return;

  msg('current', gApp.getText("CopyingFiles"));

  var file, dest;
  var dir = dialog.cfg.path.clone();
  for (var i = 0; i < downloaded.length; i++) {
    file = downloaded[i];
    dump("  file: " + file.path + " to dir: " + dir.path + "\n");
    try {
      dest = dir.clone();
      dest.append(file.leafName);
      if (dest.exists()) {
        dump("    removing: " + dest.path + "\n");
        dest.remove(true);
      }
      file.copyTo(dir, null);
    }
    catch (ex) {
      dump("importFiles: " + ex + "\n");
    }
  }
}


function cleanUp () {
  // TODO: clean tmp dir?
  msg('current', gApp.getText("CleaningUp"));
  dump("cleanUp\n");
}


function done () {
  msg('current', gApp.getText("Finished"));
  msg('overall', gApp.getText("SyncSuccessful"));
  dialog.close.label = gApp.getText("Close");
  dialog.cfg.revision = dialog.revision;
  dialog.cfg.succeeded = true;
  // TODO: maybe set timeout to close dialog automatically
}


function stringToModel (str) {
  var ios = getIOService();
  var uri = ios.newURI(Cx.PROJECTS_URL, null, null);

  var ds = getRDFXMLDataSource();
  var p  = getRDFXMLParser();
  p.parseString(ds, uri, str);

  var m = new RDFModel(ds);

  return m;
}




var size = {};
var seen = {};
var total = 0;



function doUpload (rec) {
  try {
    var file = fileFor(rec.leaf);
    if (! isReadableFile(file)) throw "bad file: " + rec.leaf;
    
    var ios  = getIOService();
    var uri  = ios.newURI(rec.dest, null, null);

    // dump("uploading: " + file.path + " to " + uri.spec + "\n");

    size[rec.dest] = file.fileSize;

    uri = uri.QueryInterface(Components.interfaces.nsIURL);  // XXX really necessary?

    var src  = ios.newFileURI(file);
    src = src.QueryInterface(Components.interfaces.nsIURL);    

    persist = getWebBrowserPersist();

    persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;

    persist.progressListener = uploadListener;

    persist.saveURI(src, null, null, null, null, uri);
  }
  catch (ex) {
    dump("doUpload: " + ex + "\n");
    maybeDoUpload();
  }

}


function startProgress (request) {
  try {
    var channel = request.QueryInterface(Components.interfaces.nsIChannel);
    var url = channel.URI.QueryInterface(Components.interfaces.nsIURL);
    var fileExt = url.fileName.match(/[^.]+$/)[0];
    msg('current', gApp.getText("UploadingFile", [ url.fileName ]));
  }
  catch (ex) {
    dump("startProgress: " + ex + "\n");
  }
  mtr('current', 0);
}


function stopProgress (request) {
  mtr('current', 100);
  try {
    var channel = request.QueryInterface(Components.interfaces.nsIChannel);
    var uri = channel.URI.spec;
    if (seen[uri]) {
      total += seen[uri];
    }
    else {
      // Fallback to local size + approx HTTP header overhead
      total += size[uri] + 524;
    }
    // dump("stop: " + uri + ", total: " + total + "\n");
  }
  catch (ex) {
    dump("stopProgress: " + ex + "\n");
  }
}


function updateProgress (request, current, maximum) {
  // Test for magic 10000?
  if (current == maximum) return;

  try {
    var channel = request.QueryInterface(Components.interfaces.nsIChannel);
    var uri = channel.URI.spec;
    // dump("progress: " + uri + "\n");
    // dump("  cur: " + current + ", max: " + maximum + ", total: " + total + "\n");

    if (! seen[uri]) {
      // dump("seen: " + uri + ": " + maximum + "\n");
      seen[uri] = maximum;
    }

    var actual = current - total;
    mtr('current', actual / maximum * 100);
  }
  catch (ex) {
    dump("updateProgress: " + ex + "\n");
  }
}


const nsIWebProgressListener   = Components.interfaces.nsIWebProgressListener;
const nsISupportsWeakReference = Components.interfaces.nsISupportsWeakReference;


var uploadListener = {

  QueryInterface: function (id) {
    if (id.equals(nsIWebProgressListener) ||
        id.equals(nsISupportsWeakReference))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  onStateChange: function (webProgress, request, stateFlags, status) {
    if (stateFlags & nsIWebProgressListener.STATE_START &&
        stateFlags & nsIWebProgressListener.STATE_IS_NETWORK) {
      startProgress(request);
    }
    else if (stateFlags & nsIWebProgressListener.STATE_STOP &&
             stateFlags & nsIWebProgressListener.STATE_IS_NETWORK) {
      dialog.uploadCount++;
      stopProgress(request);
      maybeDoUpload();
    }
  },

  onProgressChange: function (webProgress, request,
                              curSelfProgress, maxSelfProgress,
                              curTotalProgress, maxTotalProgress) {
    updateProgress(request, curTotalProgress, maxTotalProgress);
  },

  onLocationChange: function (webProgress, request, location) { },

  onStatusChange: function (webProgress, request, status, message) { },

  onSecurityChange: function (webProgress, request, state) { }
};



// --- From sync-download --------------------------------------------------

var downloaded = [];
var downloadMap = {};


function doDownload (rec) {
  try {
    var file = tempFileFor(rec.leaf);
    
    var ios  = getIOService();
    var uri  = ios.newURI(rec.src, null, null);
    uri = uri.QueryInterface(Components.interfaces.nsIURL);

    dump("downloading: " + uri.spec + " to " + file.path + "\n");

    downloadMap[uri.spec] = file;

    persist = getWebBrowserPersist();

    persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;

    persist.progressListener = downloadListener;

    persist.saveURI(uri, null, null, null, null, file);
  }
  catch (ex) {
    dump("doDownload: " + ex + "\n");
    maybeDoDownload();
  }

}


function dl_startProgress (request) {
  var fileName = request.name.match(/([^\/]+)$/)[1];
  var fileExt = fileName.match(/[^.]+$/)[0];
  msg('current', gApp.getText("DownloadingFile", [ fileName ]));
  mtr('current', 0);
}


function dl_stopProgress (request) {
  mtr('current', 100);
  try {
    var channel = request.QueryInterface(Components.interfaces.nsIChannel);
    var uri = channel.URI.spec;
    if (downloadMap[uri]) {
      downloaded.push(downloadMap[uri]);
    }
  }
  catch (ex) {
    dump("stopProgress: " + ex + "\n");
  }
}

function dl_updateProgress (request, current, maximum) {
  mtr('current', current / maximum * 100);
}


var downloadListener = {

  QueryInterface: function (id) {
    if (id.equals(nsIWebProgressListener) ||
        id.equals(nsISupportsWeakReference))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  onStateChange: function (webProgress, request, stateFlags, status) {
    if (stateFlags & nsIWebProgressListener.STATE_START) {
      dl_startProgress(request);
    }
    else if (stateFlags & nsIWebProgressListener.STATE_STOP) {
      dialog.downloadCount++;
      dl_stopProgress(request);
      maybeDoDownload();
    }
  },

  onProgressChange: function (webProgress, request,
                              curSelfProgress, maxSelfProgress,
                              curTotalProgress, maxTotalProgress) {
    dl_updateProgress(request, curSelfProgress, maxSelfProgress);
  },

  onLocationChange: function (webProgress, request, location) { },

  onStatusChange: function (webProgress, request, status, message) { },

  onSecurityChange: function (webProgress, request, state) { }
};
