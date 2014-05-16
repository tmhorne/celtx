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

function FileCopier (project) {
  this.project = project;
  this.model = new RDFModel(project.ds);
}


FileCopier.prototype = {
  fileMap: {},


  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsIWebProgressListener) ||
        iid.equals(Components.interfaces.nsISupportsWeakReference))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },


  copyToProject: function (url) {
    var mimeType = getMIMEService().getTypeFromURI(url);
    var type = mimeType.split('/').shift();
    // Make the first letter uppercase
    type = type.charAt(0).toUpperCase() + type.substr(1);

    // TODO: handle Application types as some external file class?

    // var name = safeFileName(srcfile.leafName);

    var res = RES(this.project.mintURI());

    // var srcurl = getIOService().newFileURI(srcfile);
    var fSize = -1;
    var srcFile = null;
    if (url instanceof Components.interfaces.nsIFileURL) {
      url = url.QueryInterface(Components.interfaces.nsIFileURL);
      fSize = url.file.fileSize;
      if (url.file instanceof Components.interfaces.nsILocalFile)
        srcFile = url.file;
    }
    this.fileMap[url.spec] = {
      fileURL: url,
      filesize: fSize,
      res: res
    };

    var name = safeFileName(url.fileName);
    var file = this.project.projectFolder;
    if (srcFile) {
      file = copyToUnique(srcFile, file, name);
    }
    else {
      file.append(name);
      file.createUnique(0, 0600);

      dump("*** saveURI: " + url.spec + " to " + file.path + "\n");
      var persist = getWebBrowserPersist();
      persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;
      persist.progressListener = this;
      persist.saveURI(url, null, null, null, null, file);
    }

    this.model.add(res, PROP('rdf:type'), RES(Cx.NS_CX + type));
    this.model.add(res, PROP('cx:localFile'), LIT(file.leafName));

    return { res: res, file: file };
  },


  onStateChange: function (webProgress, request, stateFlags, status) {
    var nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;

    var entry = this.fileMap[request.name];
    if (stateFlags & nsIWebProgressListener.STATE_START) {
      this.model.add(entry.res, PROP('cx:progress'), LIT('0'));
      this.model.add(entry.res, PROP('cx:state'), LIT('downloading'));
    }
    else if (stateFlags & nsIWebProgressListener.STATE_STOP) {
      removeProp(this.model, entry.res, PROP('cx:progress'));
      removeProp(this.model, entry.res, PROP('cx:state'));
    }
  },


  onProgressChange: function (webProgress, request,
                              curSelfProgress, maxSelfProgress,
                              curTotalProgress, maxTotalProgress) {
    var entry = this.fileMap[request.name];
    var progress = entry.filesize >= 0 ? curSelfProgress / entry.filesize
                                       : curSelfProgress / maxSelfProgress;
    var pct = Math.floor(progress * 100);
    setLiteralProp(this.model, entry.res, PROP('cx:progress'), LIT(pct));
  },


  onLocationChange: function (webProgress, request, location) {},
  onStatusChange: function (webProgress, request, status, message) {},
  onSecurityChange: function (webProgress, request, state) {}
};
