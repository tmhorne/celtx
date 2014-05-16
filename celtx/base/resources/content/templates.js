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

function getTemplateList () {
  var IFile = Components.interfaces.nsIFile;
  var list = [];
  var tmpldir = currentProfileDir();
  tmpldir.append(Cx.TEMPLATES_DIR);
  if (tmpldir.exists() && tmpldir.isDirectory()) {
    var files = tmpldir.directoryEntries;
    while (files.hasMoreElements()) {
      var file = files.getNext().QueryInterface(IFile);
      if (! file.isDirectory() && file.leafName.match(/\.t?celtx$/))
        list.push(file);
    }
  }
  return list.sort(function (a, b) {
    return a.leafName.localeCompare(b.leafName);
  });
}


function getSampleList () {
  var IFile = Components.interfaces.nsIFile;
  var list = [];
  var sampledir = currentProfileDir();
  sampledir.append(Cx.SAMPLES_DIR);
  if (sampledir.exists() && sampledir.isDirectory()) {
    var files = sampledir.directoryEntries;
    while (files.hasMoreElements()) {
      var file = files.getNext().QueryInterface(IFile);
      if (! file.isDirectory() && file.leafName.match(/\.t?celtx$/))
        list.push(file);
    }
  }
  return list.sort(function (a, b) {
    return a.leafName.localeCompare(b.leafName);
  });
}


function getTemplateInfo (file) {
  var reader = getZipReader();
  reader.open(file);
  var entry = reader.getEntry(Cx.PROJECT_FILE);
  if (! entry)
    throw "No " + Cx.PROJECT_FILE + " in template";
  var tmprdf = tempFile("rdf");
  reader.extract(Cx.PROJECT_FILE, tmprdf);
  var rdfsvc = getRDFService();
  var ds = rdfsvc.GetDataSourceBlocking(fileToFileURL(tmprdf));
  var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var descarc = rdfsvc.GetResource(Cx.NS_DC + "description");
  var iconarc = rdfsvc.GetResource(Cx.NS_CX + "icon");
  var projecttype = rdfsvc.GetResource(Cx.NS_CX + "Project");
  var projres = ds.GetSource(typearc, projecttype, true);
  if (! projres) {
    dump("*** getTemplateInfo: No cx:Project in " + file.leafName + "\n");
    return null;
  }
  var iconname = getRDFString(ds, projres, iconarc);
  var iconfile = null;
  if (iconname) {
    iconfile = currentProfileDir();
    iconfile.append(Cx.TEMPLATES_DIR);
    iconfile.append(iconname);
  }
  var info = {
    title: getRDFString(ds, projres, titlearc),
    description: getRDFString(ds, projres, descarc),
    fileuri: fileToFileURL(file),
    iconuri: iconfile ? fileToFileURL(iconfile) : null
  };
  tmprdf.remove(true);
  return info;
}
