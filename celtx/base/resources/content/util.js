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

const ID_CHARS =
'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ID_CHARS_LEN   = 62;
const ID_DEFAULT_LEN = 12;


function getCeltxService () {
  return Components.classes["@celtx.com/celtx-service;1"]
    .getService(Components.interfaces.nsICeltxService);
}


function getMediaManager () {
  return Components.classes["@celtx.com/media-manager;1"]
    .getService(Components.interfaces.celtxIMediaManager);
}


// Change focus for this window to |aElement|, without focusing the
// window itself.
function focusElement(aElement) {
  // This is a redo of the fix for jag bug 91884
  var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                     .getService(Components.interfaces.nsIWindowWatcher);
  if (window == ww.activeWindow)
    aElement.focus();
  else {
    // set the element in command dispatcher so focus will restore properly
    // when the window does become active
    var cmdDispatcher = document.commandDispatcher;
    if (aElement instanceof Window) {
      cmdDispatcher.focusedWindow = aElement;
      cmdDispatcher.focusedElement = null;
    }
    else if (aElement instanceof Element) {
      cmdDispatcher.focusedWindow = aElement.ownerDocument.defaultView;
      cmdDispatcher.focusedElement = aElement;
    }
  }
}


function ucfirst (str) {
  if (! str || str == '') return '';
  return str.charAt(0).toUpperCase() + str.substr(1);
}


// Returns the first element in array whose attr matches the supplied value
function lookup (array, attr, match) {
  if (! array instanceof Array || attr == '') return null;
  
  for (var i = 0; i < array.length; i++) {
    if (attr in array[i] && array[i][attr] == match) return array[i];
  }
  
  return null;
}


// Like lookup, above, but return index of match rather than the
// object, or -1 if not found.
function ilookup (array, attr, match) {
  if (! array instanceof Array || attr == '') return -1;
  
  for (var i = 0; i < array.length; i++) {
    if (attr in array[i] && array[i][attr] == match) return i;
  }
  
  return -1;
}


function generateID (length) {
  if (! length) length = ID_DEFAULT_LEN;
  var id = '';
  for (var i = 0; i < length; i++) {
    id += ID_CHARS[Math.floor(Math.random() * ID_CHARS_LEN)];
  }
  return id;
}


function isMac () {
  return navigator.platform.indexOf('Mac') != -1;
}


function isWin () {
  return navigator.platform.indexOf('Win') != -1;
}


function isoDateStringToDate (isoDate) {
  var elems = isoDate.match(/(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)Z/);
  if (! elems) {
    elems = isoDate.match(/(\d{4})-(\d\d)-(\d\d)/);
    if (! elems) throw "Invalid date string: " + isoDate;
    return new Date(elems[1], elems[2]-1, elems[3]);
  }
  return new Date(
    Date.UTC(elems[1], elems[2]-1, elems[3], elems[4], elems[5], elems[6]));
}


/**
 * Turns a calIDateTime object into an ISO date string.
 * @param date  a calIDateTime object
 * @type string
 * @return the date formatted as an ISO date string
 */
function calDateToISODateString (date) {
  var year = date.year;
  var month = String(date.month + 1);
  if (month.length == 1) month = "0" + month;
  var day = String(date.day);
  if (day.length == 1) day = "0" + day;
  var hour = String(date.hour);
  if (hour.length == 1) hour = "0" + hour;
  var min = String(date.minute);
  if (min.length == 1) min = "0" + min;
  var sec = String(date.second);
  if (sec.length == 1) sec = "0" + sec;
  var tzid = date.isUTC ? "Z" : date.timezone.tzid;
  return year + "-" + month + "-" + day + "T" +
         hour + ":" + min + ":" + sec + tzid;
}


// There has to be an easier way...
function dateToISODateString (date) {
  var year = date.getUTCFullYear();
  var month = String(date.getUTCMonth() + 1);
  if (month.length == 1) month = "0" + month;
  var day = String(date.getUTCDate());
  if (day.length == 1) day = "0" + day;
  var hour = String(date.getUTCHours());
  if (hour.length == 1) hour = "0" + hour;
  var min = String(date.getUTCMinutes());
  if (min.length == 1) min = "0" + min;
  var sec = String(date.getUTCSeconds());
  if (sec.length == 1) sec = "0" + sec;
  return year + "-" + month + "-" + day + "T" +
         hour + ":" + min + ":" + sec + "Z";
}


// Returns an nsIFile
function currentProfileDir () {
  var ds = getDirectoryService();
  var profileDir = ds.get('ProfD', Components.interfaces.nsIFile);
  
  return profileDir;
}


function currentProcessDir () {
  var ds = getDirectoryService();
  return ds.get('CurProcD', Components.interfaces.nsIFile);
}


// Returns the user's documents directory
function userDocsDir () {
  var dirsvc = Components.classes["@mozilla.org/file/directory_service;1"]
  .getService(Components.interfaces.nsIDirectoryServiceProvider);
  var dir = null;
  if (isMac())
    dir = dirsvc.getFile("UsrDocs", {value:0});
  else if (isWin())
    dir = dirsvc.getFile("Pers", {value:0});
  else
    dir = dirsvc.getFile("Home", {value:0});
  return dir;
}


// Returns the directory where the user saves their projects,
// or the user's documents directory by default.
function getCeltxProjectsDir () {
  var ps = getPrefService().getBranch("celtx.");
  // "projectsdirectory" is the old name, "directory.projects" is the new one
  try {
    var dir = ps.getCharPref("directory.projects");
    return pathToFile(dir);
  }
  catch (ex) {}
  try {
    var dir = ps.getCharPref("projectsdirectory");
    return pathToFile(dir);
  }
  catch (ex) {
    return userDocsDir();
  }
}


function setCeltxProjectsDir (dir) {
  var ps = getPrefService().getBranch("celtx.directory.");
  ps.setCharPref("projects", dir.path);
}


function getMediaDir () {
  try {
    var ps = getPrefService().getBranch("celtx.directory.");
    var dir = ps.getCharPref("media");
    return pathToFile(dir);
  }
  catch (ex) {
    return userDocsDir();
  }
}


function setMediaDir (dir) {
  var ps = getPrefService().getBranch("celtx.directory.");
  ps.setCharPref("media", dir.path);
}


function getMiscFileDir () {
  var ps = getPrefService().getBranch("celtx.directory.");
  try {
    var dir = ps.getCharPref("misc");
    return pathToFile(dir);
  }
  catch (ex) {
    return userDocsDir();
  }
}


function setMiscFileDir (dir) {
  var ps = getPrefService().getBranch("celtx.directory.");
  ps.setCharPref("misc", dir.path);
}


// Returns the Celtx temporary directory as an nsIFile
function getTempDir () {
  var cxsvc = Components.classes["@celtx.com/celtx-service;1"]
    .getService(Components.interfaces.nsICeltxService);
  return fileURLToFile(cxsvc.tempDirSpec);
}


// Creates a temporary file with the specified extension
function tempFile (ext) {
  if (! ext) ext = 'tmp';
  var file = getTempDir();
  file.append(generateID() + '.' + ext);
  file.createUnique(0, 0600);
  return file;
}


// Provides a moz-icon url for a given file
function iconURLForFile (file) {
  if (! file)
    return "";
  var ios = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
  var fph = ios.getProtocolHandler("file")
    .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
  var urlspec = fph.getURLSpecFromFile(file);
  return "moz-icon://" + urlspec + "?size=16"; 
}


// Make sure a file's name ends with the given extension
function ensureExtension (file, ext) {
  var re = new RegExp('\.' + ext + '$');

  if (! file.leafName.match(re)) {
    file.leafName += '.' + ext;
  }
}


function overwriteFileWithFile (dstfile, srcfile) {
  var bfis = getBufferedFileInputStream(srcfile);
  var bfos = getBufferedFileOutputStream(dstfile);
  var available = bfis.available();
  while (available > 0) {
    bfos.writeFrom(bfis, available);
    available = bfis.available();
  }
  bfos.close();
  bfis.close();
}


// The equivalent of nsIFile.createUnique, but for copyTo. It uses the same
// method used by createUnique, but stops at 999 instead of 9999.
// If nosanitize is false or undefined, the file name is sanitized first.
function copyToUnique (file, dir, name, nosanitize) {
  const kAlreadyExists = Components.results.NS_ERROR_FILE_ALREADY_EXISTS;
  if (! file || ! file.exists())
    throw "copyToUnique: Source file does not exist";
  if (! name)
    name = file.leafName;
  if (! dir)
    dir = file.parent;
  if (! dir.isDirectory())
    throw Components.results.NS_ERROR_FILE_DESTINATION_NOT_DIR;

  if (! nosanitize)
    name = safeFileName(name);

  var dstfile = dir.clone();
  dstfile.append(name);
  if (! dstfile.exists()) {
    try {
      file.copyTo(dir, name);
      var resultfile = dir.clone();
      resultfile.append(name);
      return resultfile;
    }
    catch (ex) {
      if (! ("result" in ex && ex.result == kAlreadyExists))
        throw ex;
    }
  }

  var parts = name.match(/(.*)(\.[^\.]*)$/);
  var suffix = "";
  if (parts) {
    name    = parts[1];
    suffix  = parts[2];
  }

  for (var i = 1; i < 1000; i++) {
    var leafname = name + "-" + i + suffix;
    try {
      dstfile = dir.clone();
      dstfile.append(leafname);
      if (dstfile.exists())
        continue;
      file.copyTo(dir, leafname);
      var resultfile = dir.clone();
      resultfile.append(leafname);
      return resultfile;
    }
    catch (ex) {
      if (! ("result" in ex && ex.result == kAlreadyExists))
        throw ex;
    }
  }

  // nsIFile.createUnique throws NS_ERROR_FILE_TOO_BIG
  throw kAlreadyExists;
}


function canonizeWebURL (url) {
  var IFixup = Components.interfaces.nsIURIFixup;
  var CFixup = "@mozilla.org/docshell/urifixup;1";
  var fixer = Components.classes[CFixup].createInstance(IFixup);
  var uri = fixer.createFixupURI(url, IFixup.FIXUP_FLAGS_MAKE_ALTERNATE_URI);
  if (uri)
    return uri.spec;
  return null;
}


// Removes offending characters from a file name
function sanitizeFilename (fname) {
  fname = fname.replace(/^\./, "");
  fname = fname.replace(/\.$/, "");
  fname = fname.replace(/[\/\\:]/g, "-");
  fname = fname.replace(/[*?""<>|%$]/g, "");
  return fname;
}


function safeFileName (fileName) {
  var str = fileName.replace(/[* \'()]/g, '_');
  var enc = encodeURIComponent(str);
  if (enc == str) {
    return enc;
  }
  
  enc = enc.replace(/\%\w\w/g, '_');

  var a = enc.split(/_/);
  if (a.length <= enc.length / 4) {
    // Tolerable
    return enc;
  }
    
  // More than 25% underscores by volume ... give up and generate a name
  var m = fileName.match(/\.[^\.]*$/);
  var ext = m == undefined ? '.bin' : m;
  var name = 'obj-' + generateID(8) + ext;
  return name;
}


/**
 * Replaces all byte sequences in a file that are not valid UTF-8
 * with U+FFFD, the generic Unicode "invalid character" character.
 * The file is sanitized in place.
 * @param file{nsIFile} a file to sanitize
 */
function sanitizeUTF8File (file) {
  var IConverterIS = Components.interfaces.nsIConverterInputStream;
  var IConverterOS = Components.interfaces.nsIConverterOutputStream;
  var tempfile = copyToUnique(file, getTempDir(), file.leafName);
  var bfis = getBufferedFileInputStream(tempfile);
  var bfos = getBufferedFileOutputStream(file);
  var convi = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
    .createInstance(IConverterIS);
  convi.init(bfis, "UTF-8", 4096, IConverterIS.DEFAULT_REPLACEMENT_CHARACTER);
  var convo = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
    .createInstance(IConverterOS);
  convo.init(bfos, "UTF-8", 4096, IConverterIS.DEFAULT_REPLACEMENT_CHARACTER);

  var stripper = Components.classes["@celtx.com/control-char-stripper;1"]
    .createInstance(Components.interfaces.nsIControlCharStripper);
  stripper.init(convi, convo);
  var count;
  while ((count = stripper.pump()) > 0) {}
  stripper.close();
  convo.close();
  bfos.close();
  convi.close();
  bfis.close();
  try {
    tempfile.remove(false);
  }
  catch (ex) {
    dump("*** sanitizeUTF8File: (ignored) " + ex + "\n");
  }
}


function isReadableFile (file) {
  return file && file.exists() && file.isFile() && file.isReadable();
}


// Writes a string to a file
function writeFile (str, path) {
  var file = null;
  if (path instanceof Components.interfaces.nsIFile)
    file = path;
  else
    file = pathToFile(path);
  if (! file) return false;

  try {
    if (file.exists()) {
      if (! file.isWritable()) throw new Error("File not writable");
    }
    else {
      file.create(0x0, 0644 & file.parent.permissions);
    }
  }
  catch (ex) {
    dump("writeFile: error initializing " + file.path + "\n");
    return false;
  }

  try {
    var os = getBufferedFileOutputStream(file);
    var us = getUnicharOutputStream(os);
    us.writeString(str);
    us.close();
  }
  catch (ex) {
    dump("writeFile: error writing " + file.path + ": " + ex + "\n");
    return false;
  }

  return true;
}


// Slurps a file into a string
function readFile (path, encoding) {
  var file = pathToFile(path);
  if (! file) return false;

  try {
    if (file.exists()) {
      if (! file.isReadable()) throw new Error("File not readable");
    }
    else {
      throw new Error("File not found");
    }
  }
  catch (ex) {
    dump("readFile: error reading " + file.path + ": " + ex + "\n");
    return '';
  }

  var str = '';

  try {
    var is = getFileInputStream();
    is.init(file, 0x01, 0444, null);

    var Cc = Components.classes;
    var Ci = Components.interfaces;
    var cis = Cc["@mozilla.org/intl/converter-input-stream;1"]
      .createInstance(Ci.nsIConverterInputStream);
    cis.init(is, encoding, 0,
      Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
    var size = file.fileSize;
    var read = 0;
    do {
      var outstr = {};
      read = cis.readString(size, outstr);
      str += outstr.value;
    }
    while (read > 0);
  }
  catch (ex) {
    dump("readFile: error reading " + file.path + ": " + ex + "\n");
    return '';
  }

  return str;
}


// Convert a file URL to a file
function fileURLToFile (fileurl) {
  try {
  var ios = getIOService();
  var url = ios.newURI(fileurl, null, null);
  return url.QueryInterface(Components.interfaces.nsIFileURL).file;
  }
  catch (ex) {
    dump("*** fileURLToFile(" + fileurl + "): " + ex + "\n");
    printStackTrace();
    throw ex;
  }
}


// Convert a file to a file URL
function fileToFileURL (file) {
  return getIOService().newFileURI(file).spec;
}


// Convert a path to a file URL
function pathToFileURL (path) {
  return fileToFileURL(pathToFile(path));
}


// Convert a path to a file
function pathToFile (path) {
  var file = Components.classes["@mozilla.org/file/local;1"]
    .createInstance(Components.interfaces.nsILocalFile);
  file.initWithPath(path);
  return file;
}


function getBufferedFileInputStream (file) {
  var fs = getFileInputStream();
  // PR_RDONLY
  fs.init(file, 0x01, 0, 0);
  return getBufferedInputStream(fs);
}


function getBufferedFileOutputStream (file) {
  var fs = getFileOutputStream();
  // PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE
  fs.init(file, 0x04 | 0x08 | 0x20, 0600, 0);
  return getBufferedOutputStream(fs);
}


function getZipReader () {
  return Components.classes["@mozilla.org/libjar/zip-reader;1"]
    .createInstance(Components.interfaces.nsIZipReader);
}


function getZipWriter () {
  return Components.classes["@mozilla.org/zipwriter;1"]
    .createInstance(Components.interfaces.nsIZipWriter);
}


function getSafeZipWriter () {
  return Components.classes["@mozilla.org/safezipwriter;1"]
    .createInstance(Components.interfaces.nsISafeZipWriter);
}


// A variety of getters for XPCOM components


function getAuthManager () {
  return Components.classes["@mozilla.org/network/http-auth-manager;1"]
    .getService(Components.interfaces.nsIHttpAuthManager);
}


function getWindowMediator () {
  return Components.classes["@mozilla.org/appshell/window-mediator;1"]
    .getService(Components.interfaces.nsIWindowMediator);
}


function getPromptService () {
  return Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Components.interfaces.nsIPromptService);
}


function getFilePicker () {
  return Components.classes["@mozilla.org/filepicker;1"]
    .createInstance(Components.interfaces.nsIFilePicker);
}


function getFileInputStream () {
  return Components.classes["@mozilla.org/network/file-input-stream;1"]
    .createInstance(Components.interfaces.nsIFileInputStream);
}


function getFileOutputStream () {
  return Components.classes["@mozilla.org/network/file-output-stream;1"]
    .createInstance(Components.interfaces.nsIFileOutputStream);
}


function getBufferedInputStream (is, size) {
  var bs = Components.classes["@mozilla.org/network/buffered-input-stream;1"]
    .createInstance(Components.interfaces.nsIBufferedInputStream);
  if (size)
    bs.init(is, size);
  else
    bs.init(is, 4096);
  return bs;
}


function getBufferedOutputStream (os) {
  var bs = Components.classes["@mozilla.org/network/buffered-output-stream;1"]
    .createInstance(Components.interfaces.nsIBufferedOutputStream);
  bs.init(os, 4096);
  return bs;
}


function getScriptableInputStream (is) {
  var ss = Components.classes["@mozilla.org/scriptableinputstream;1"]
    .createInstance(Components.interfaces.nsIScriptableInputStream);
  ss.init(is);
  return ss;
}


function getUnicharOutputStream (os) {
  var us = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
    .createInstance(Components.interfaces.nsIConverterOutputStream);
  us.init(os, null, 0, '?');
  return us.QueryInterface(Components.interfaces.nsIUnicharOutputStream);
}


function getDownloader () {
  return Components.classes["@mozilla.org/network/downloader;1"]
    .createInstance(Components.interfaces.nsIDownloader);
}


function getRDFService () {
  return Components.classes["@mozilla.org/rdf/rdf-service;1"]
    .getService(Components.interfaces.nsIRDFService);
}

function getInMemoryDataSource () {
  var dsprefix = "@mozilla.org/rdf/datasource;1";
  return Components.classes[dsprefix + "?name=in-memory-datasource"]
    .createInstance(Components.interfaces.nsIRDFDataSource);
}


function getRemoteDataSource (url) {
  var rdf = Components.classes['@mozilla.org/rdf/rdf-service;1']
                      .getService(Components.interfaces.nsIRDFService);
  var ds  = rdf.GetDataSource(url);
  ds = ds.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
  return ds;
}


function getCompositeDataSource () {
  var dsprefix = "@mozilla.org/rdf/datasource;1";
  return Components.classes[dsprefix + "?name=composite-datasource"]
    .createInstance(Components.interfaces.nsIRDFCompositeDataSource);
}


function getRDFContainer () {
  return Components.classes["@mozilla.org/rdf/container;1"]
    .createInstance(Components.interfaces.nsIRDFContainer);
}


function getRDFContainerUtils () {
  return Components.classes["@mozilla.org/rdf/container-utils;1"]
  .getService(Components.interfaces.nsIRDFContainerUtils);
}


function getRDFXMLParser () {
  return Components.classes["@mozilla.org/rdf/xml-parser;1"]
    .createInstance(Components.interfaces.nsIRDFXMLParser);
}


function getRDFXMLSerializer () {
  return Components.classes["@mozilla.org/rdf/xml-serializer;1"]
    .createInstance(Components.interfaces.nsIRDFXMLSerializer);
}


function getRDFXMLDataSource () {
  return Components.classes["@mozilla.org/rdf/datasource;1?name=xml-datasource"]
    .createInstance(Components.interfaces.nsIRDFDataSource);
}


function getDirectoryService () {
  return Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties);
}


function getTransferable () {
  return Components.classes["@mozilla.org/widget/transferable;1"]
    .createInstance(Components.interfaces.nsITransferable);
}


function getClipboard () {
  return Components.classes["@mozilla.org/widget/clipboard;1"]
    .getService(Components.interfaces.nsIClipboard);
}


function getIOService () {
  return Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
}


function getExternalProtocolService () {
  return Components.classes[
    "@mozilla.org/uriloader/external-protocol-service;1"]
    .getService(Components.interfaces.nsIExternalProtocolService);
};


function getStringBundleService () {
  return Components.classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService);
}


function getStringBundle (spec) {
  var bs = getStringBundleService();
  return bs.createBundle(spec);
}


function getObserverService () {
  return Components.classes["@mozilla.org/observer-service;1"]
    .getService(Components.interfaces.nsIObserverService);
}


function getPrefService () {
  return Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService);
}


function getPrintSettingsService () {
  return Components.classes["@mozilla.org/gfx/printsettings-service;1"]
    .getService(Components.interfaces.nsIPrintSettingsService);
}


function getAtomService () {
  return Components.classes["@mozilla.org/atom-service;1"]
    .getService(Components.interfaces.nsIAtomService);
}


function getAtom (str) {
  return getAtomService().getAtom(str);
}


function getMIMEService () {
  return Components.classes["@mozilla.org/mime;1"].getService()
    .QueryInterface(Components.interfaces.nsIMIMEService);
}


function getWebBrowserPersist () {
  return Components.classes[
    "@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
    .createInstance(Components.interfaces.nsIWebBrowserPersist);
}


function getFindService () {
  return Components.classes["@mozilla.org/find/find_service;1"]
    .getService(Components.interfaces.nsIFindService);
}


function getRangeFind () {
  return Components.classes["@mozilla.org/embedcomp/rangefind;1"]
    .createInstance(Components.interfaces.nsIFind);
}


function getEditorSpellCheck () {
  return Components.classes["@mozilla.org/editor/editorspellchecker;1"]
    .createInstance(Components.interfaces.nsIEditorSpellCheck);
}


function getTextServicesFilter () {
  return Components.classes["@mozilla.org/editor/txtsrvfilter;1"]
    .createInstance(Components.interfaces.nsITextServicesFilter);
}


function getDragService () {
  return Components.classes["@mozilla.org/widget/dragservice;1"]
    .getService(Components.interfaces.nsIDragService);
}


function serializeDataSourceToFile (ds, file) {
  var serializer = getRDFXMLSerializer();
  serializer.init(ds);
  var atomsvc = getAtomService();
  serializer.addNameSpace(atomsvc.getAtom("rdf"), Cx.NS_RDF);
  serializer.addNameSpace(atomsvc.getAtom("rdfs"), Cx.NS_RDFS);
  serializer.addNameSpace(atomsvc.getAtom("cx"), Cx.NS_CX);
  serializer.addNameSpace(atomsvc.getAtom("dc"), Cx.NS_DC);
  serializer = serializer.QueryInterface(Components.interfaces.nsIRDFXMLSource);
  var bfos = getBufferedFileOutputStream(file);
  serializer.Serialize(bfos);
  bfos.close();
}

// Workaround for the lack of UTF-8 support in nsIPrefBranch.getCharPref()
function getPrefString (branch, prefname) {
  return branch.getComplexValue(prefname,
    Components.interfaces.nsISupportsString).toString();
}


function createSupportsString (str) {
  var s = Components.classes['@mozilla.org/supports-string;1']
    .createInstance(Components.interfaces.nsISupportsString);
  if (str) s.data = str;
  return s;
}


function createSupportsCString (str) {
  var s = Components.classes['@mozilla.org/supports-cstring;1']
    .createInstance(Components.interfaces.nsISupportsCString);
  if (str) s.data = str;
  return s;
}


function createSupportsArray (anArray) {
  var a = Components.classes['@mozilla.org/supports-array;1']
    .createInstance(Components.interfaces.nsISupportsArray);
  if (anArray && anArray instanceof Array) {
    for (var i = 0; i < anArray.length; i++)
      a.AppendElement(anArray[i]);
  }
  return a;
}


function serializeDOMtoFile (dom, file) {
  try {
    var serializer = new XMLSerializer();
    var os = getBufferedFileOutputStream(file);
    serializer.serializeToStream(dom, os, "UTF-8");
    os.close();
    return true;
  }
  catch (ex) {
    dump("*** serializeDOMtoFile: " + ex + "\n");
    return false;
  }
}


function openExternalFile (file) {
  var kBundleProps = "chrome://mozapps/locale/downloads/downloads.properties";
  var kExeWarning = "fileExecutableSecurityWarning";
  var kExeWarningTitle = "fileExecutableSecurityWarningTitle";
  var kExeWarningDontAsk = "fileExecutableSecurityWarningDontAsk";

  var pref = getPrefService().getBranch("browser.download.manager.");
  var alertOnEXEOpen = true;
  try {
    alertOnEXEOpen = pref.getBoolPref("alertOnEXEOpen");
  }
  catch (ex) {}
  if (file.isExecutable() && alertOnEXEOpen) {
    var strings = getStringBundle(kBundleProps);
    var name = file.leafName;
    var message = strings.formatStringFromName(kExeWarning, [name, name], 2);
    var title = strings.GetStringFromName(kExeWarningTitle);
    var dontAsk = strings.GetStringFromName(kExeWarningDontAsk);
    var promptSvc = getPromptService();
    var checkbox = { value: false };
    var open = promptSvc.confirmCheck(window, title, message,
                                      dontAsk, checkbox);
    if (! open)
      return;
    else
      pref.setBoolPref("alertOnEXEOpen", ! checkbox.value);
  }
  try {
    file.QueryInterface(Components.interfaces.nsILocalFile).launch();
  }
  catch (ex) {
    var ios = getIOService();
    var eps = getExternalProtocolService();
    var uri = ios.newURI(fileToFileURL(file), null, null);
    eps.loadURI(uri, null);
  }
}


function loadDataSource (fileURL) {
  var ds = getRDFService().GetDataSourceBlocking(fileURL);
  if (! ds) throw "failed to load datasource";
  ds.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
  return ds;
}


function celtxBugAlert (msg, stack, ex, header) {
  if (! stack)
    stack = Components.stack.caller;
  window.openDialog(Cx.CONTENT_PATH + "celtxerror.xul", "_blank",
                    Cx.MODAL_DIALOG_FLAGS, msg, stack, ex, header);
}


function printStackTrace () {
  var kJavascript = Components.interfaces.nsIProgrammingLanguage.JAVASCRIPT;
  var frame = Components.stack.caller;
  while (frame) {
    if (frame.language == kJavascript) {
      var filename = frame.filename.replace(/.*\//, "");
      var lineno = frame.lineNumber;
      var funcname = frame.name;
      dump("    " + filename + ":" + lineno + " (" + funcname + ")\n");
    }
    else {
      dump("    <non-javascript frame>\n");
    }
    frame = frame.caller;
  }
}


function Version (str) {
  this.major = 0;
  this.minor = 0;
  this.patch = 0;
  this.build = 0;

  if (! str || str == "")
    return;

  var match = str.match(/^(\d+)(.*)/);
  if (! match)
    throw "Invalid version string";
  this.major = Number(match[1]);
  if (match[2] == "")
    return;

  match = match[2].match(/^\.(\d+)(.*)/);
  if (! match)
    return;
  this.minor = Number(match[1]);
  if (match[2] == "")
    return;

  match = match[2].match(/^\.(\d+)(.*)/);
  if (! match)
    return;
  this.patch = Number(match[1]);
  if (match[2] == "")
    return;

  match = match[2].match(/^\.(\d+)/);
  if (match)
    this.build = Number(match[1]);
}


// Same return convention as strcmp, etc.
Version.prototype.compare = function (vers) {
  if (this.major < vers.major)
    return -1;
  if (this.major > vers.major)
    return 1;
  if (this.minor < vers.minor)
    return -1;
  if (this.minor > vers.minor)
    return 1;
  if (this.patch < vers.patch)
    return -1;
  if (this.patch > vers.patch)
    return 1;
  return this.build - vers.build;
};


function strToICalStr (str) {
  if (! str || str == "")
    return str;
  str = str.replace("\\", "\\\\");
  str = str.replace("\n", "\\n");
  str = str.replace(";", "\\;");
  str = str.replace(",", "\\,");
  return str;
}


function iCalStrToStr(str) {
  if (! str || str == "")
    return str;
  str = str.replace("\\,", ",");
  str = str.replace("\\;", ";");
  str = str.replace("\\f", ",");
  str = str.replace("\\n", "\n");
  str = str.replace("\\\\", "\\");
  return str;
}


// Encode a UCS-2 string
function base64_encodew (str) {
  if (! str || str == "")
    return str;
  var table =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var result = "";
  var i = 0;
  while (i < str.length) {
    var src = [
      0, str.charCodeAt(i++), 0, str.charCodeAt(i++), 0, str.charCodeAt(i++)
    ];
    for (var j = 0; j < 3; ++j) {
      if (isNaN(src[2*j + 1])) {
        src[2*j] = NaN;
      }
      else {
        src[2*j] = src[2*j+1] >>> 8;
        src[2*j+1] &= 0x00FF;
      }
    }
    var dst = [ 0, 0, 0, 0, 0, 0, 64, 64 ];
    dst[0] = src[0] >>> 2;
    dst[1] = ((src[0] & 0x03) << 4) | (src[1] >>> 4);
    if (isNaN(src[2])) {
      dst[2] = (src[1] & 0x0F) << 2;
      dst[3] = 64;
    }
    else {
      dst[2] = ((src[1] & 0x0F) << 2) | (src[2] >>> 6);
      dst[3] = src[2] & 0x3F;
      dst[4] = src[3] >>> 2;
      if (isNaN(src[4])) {
        dst[5] = (src[3] & 0x03) << 4;
      }
      else {
        dst[5] = ((src[3] & 0x03) << 4) | (src[4] >>> 4);
        dst[6] = ((src[4] & 0x0F) << 2) | (src[5] >>> 6);
        dst[7] = src[5] & 0x3F;
      }
    }
    result += table.charAt(dst[0]) + table.charAt(dst[1]) + table.charAt(dst[2])
      + table.charAt(dst[3]);
    // Don't add too much padding
    if (dst[3] != 64) {
      result += table.charAt(dst[4]) + table.charAt(dst[5])
        + table.charAt(dst[6]) + table.charAt(dst[7]);
    }
  }
  return result;
}


function base64_decodew (str) {
  if (! str || str == "")
    return str;
  var table =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var result = "";
  var i = 0;
  var accum = -1;
  while (i < str.length) {
    var src = [
      table.indexOf(str.charAt(i++)), table.indexOf(str.charAt(i++)),
      table.indexOf(str.charAt(i++)), table.indexOf(str.charAt(i++))
    ];
    if (isNaN(src[0]) || isNaN(src[1]) || isNaN(src[2]) || isNaN(src[3]) ||
        src[0] < 0 || src[1] < 0 || src[2] < 0 || src[3] < 0)
      throw "String does not appear to be base64";
    // Masking guarantees any '=' will be trimmed from 0x40 to 0x00
    var dst = [
      (src[0] << 2) | ((src[1] & 0x3F) >> 4),
      ((src[1] & 0x0F) << 4) | ((src[2] & 0x3F) >> 2),
      ((src[2] & 0x03) << 6) | (src[3] & 0x3F)
    ];
    if (i % 8 == 4) {
      // First char and a half
      result += String.fromCharCode((dst[0] << 8) | dst[1]);
      if (src[3] == 64) {
        break;
      }
      accum = dst[2] << 8;
    }
    else {
      result += String.fromCharCode(accum | dst[0]);
      accum = -1;
      if (dst[1] == 0 && dst[2] == 0) {
        break;
      }
      result += String.fromCharCode((dst[1] << 8) | dst[2]);
    }
  }
  return result;
}


function base64_encode (str) {
  if (! str || str == "")
    return str;
  var table =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var result = "";
  var i = 0;
  while (i < str.length) {
    var src = [ str.charCodeAt(i++), str.charCodeAt(i++), str.charCodeAt(i++) ];
    var dst = [ 0, 0, 64, 64 ];
    dst[0] = src[0] >>> 2;
    if (isNaN(src[1])) {
      dst[1] = (src[0] & 0x03) << 4;
    }
    else {
      dst[1] = ((src[0] & 0x03) << 4) | (src[1] >> 4);
      if (isNaN(src[2])) {
        dst[2] = (src[1] & 0x0F) << 2;
      }
      else {
        dst[2] = ((src[1] & 0x0F) << 2) | (src[2] >> 6);
        dst[3] = src[2] & 0x3F;
      }
    }
    result += str.charAt(dst[0]) + str.charAt(dst[1]) + str.charAt(dst[2])
      + str.charAt(dst[3]);
  }
  return result;
}


function base64_decode (str) {
  if (! str || str == "")
    return str;
  var table =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var result = "";
  var i = 0;
  while (i < str.length) {
    var src = [
      table.indexOf(str.charAt(i++)), table.indexOf(str.charAt(i++)),
      table.indexOf(str.charAt(i++)), table.indexOf(str.charAt(i++))
    ];
    if (isNaN(src[0]) || isNaN(src[1]) || isNaN(src[2]) || isNaN(src[3]) ||
        src[0] < 0 || src[1] < 0 || src[2] < 0 || src[3] < 0)
      throw "String does not appear to be base64";
    // Masking guarantees any '=' will be trimmed from 0x40 to 0x00
    var dst = [
      (src[0] << 2) | ((src[1] & 0x3F) >> 4),
      ((src[1] & 0x0F) << 4) | ((src[2] & 0x3F) >> 2),
      ((src[2] & 0x03) << 6) | (src[3] & 0x3F)
    ];
    if (dst[1] == 0) {
      result += String.fromCharCode(dst[0]);
      break;
    }
    else if (dst[2] == 0) {
      result += String.fromCharCode(dst[0], dst[1]);
      break;
    }
    result += String.fromCharCode(dst[0], dst[1], dst[2]);
  }
  return result;
}


// Global constants and configuration object
var Cx = {
  get VERSION ()       { return '2.9.7' },
  get FILE_VERSION ()  { return '1.4' },

  get PREFS_FILE    () { return 'celtx_prefs.rdf' },
  get PROJECTS_FILE () { return 'celtx.rdf' },
  get PROJECTS_DIR  () { return 'celtx.d' },
  get TEMPLATES_DIR () { return 'CeltxTemplates' },
  get SAMPLES_DIR   () { return 'CeltxSamples' },
  get PROJECT_FILE  () { return 'project.rdf' },
  get LOCAL_DS_FILE () { return 'local.rdf' },
  get CONTENT_PATH  () { return 'chrome://celtx/content/' },
  get LOCALE_PATH   () { return 'chrome://celtx/locale/' },
  get TRANSFORM_PATH() { return 'chrome://celtx/content/xsl/' },
  get SCHEMA_URL    () { return 'chrome://celtx/content/schema.rdf' },
  get DOCTYPES_URL  () { return 'chrome://celtx/content/doctypes.rdf' },
  get DIR_PERMS     () { return 0755 },
  get PROJECTS_URL  () { return 'http://celtx.com/project' },
  get LOCAL_PROJECTS() { return 'http://celtx.com/local-projects' },
  get DOCUMENTS_URL () { return "http://celtx.com/res/" },
  get SCENE_PREFIX  () { return "http://celtx.com/scene/" },

  get MODAL_DIALOG_FLAGS     () { return 'chrome,modal,centerscreen,titlebar' },
  get RESIZABLE_DIALOG_FLAGS () { return 'chrome,modal,centerscreen,' +
                                         'resizable,titlebar' },
  get RESIZABLE_WINDOW_FLAGS () { return 'chrome,resizable,titlebar' },
  get NEW_WINDOW_FLAGS       () { return 'chrome,all,dialog=no' },
  get DEPENDENT_WINDOW_FLAGS () { return 'chrome,centerscreen,titlebar,' +
                                         'dialog=no,dependent' },

  get BUG_REPORT_URL   () { return 'http://www.celtx.com/bugreport' },
  get SUPPORT_URL      () { return 'http://www.celtx.com/splash/support' },
  get WALKTHRU_URL     () { return 'http://www.celtx.com/walkthru' },
  get USER_GUIDE_URL   () { return 'http://wiki.celtx.com/' },
  get FORUMS_URL       () { return 'http://forums.celtx.com/' },
  get PROJ_CENTRAL_URL () { return 'http://pc.celtx.com/' },

  get PREF_BRANCH    () { return 'celtx' },
  get PREF_USER_ID   () { return this.PREF_BRANCH + '.user.id' },
  get PREF_PROJ_PATH () { return this.PREF_BRANCH + '.projects.home' },
  get PREF_MIGRATED  () { return this.PREF_BRANCH + '.migrated' },
  get PREF_SIDEBAR   () { return this.PREF_BRANCH + '.sidebar.visible' },

  // Namespaces
  get NS_RDF        () { return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' },
  get NS_RDFS       () { return 'http://www.w3.org/2000/01/rdf-schema#' },
  get NS_CX         () { return 'http://celtx.com/NS/v1/' },
  get NS_DC         () { return 'http://purl.org/dc/elements/1.1/' },
  get NS_NOTE       () { return 'http://www.w3.org/2000/10/annotation-ns#' },
  get NS_NC         () { return 'http://home.netscape.com/NC-rdf#' },
  get NS_XUL        () {
    return 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul' },
  get NS_XHTML      () { return 'http://www.w3.org/1999/xhtml' },
  get NS_XLINK      () { return 'http://www.w3.org/1999/xlink' },
  get NS_SVG        () { return 'http://www.w3.org/2000/svg' }
};
