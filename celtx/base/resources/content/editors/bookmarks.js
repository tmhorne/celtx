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

var bookmarks_controller = {
  open: function (project, docres) {
    var rdfsvc = getRDFService();
    var sourcearc = rdfsvc.GetResource(Cx.NS_DC + "source");
    var source = project.ds.GetTarget(docres, sourcearc, true);
    if (! source) {
      dump("*** No " + sourcearc.Value + " attribute on " + docres.Value + "\n");
      return;
    }
    source = source.QueryInterface(Components.interfaces.nsIRDFLiteral);
    var ios = getIOService();
    var eps = getExternalProtocolService();
    var uri = ios.newURI(source.Value, null, null);
    if (uri.scheme != "http" && uri.scheme != "https") {
      dump("*** Bookmarks are only supposed to be http[s] uris!\n");
      return;
    }
    if (! eps.externalProtocolHandlerExists(uri.scheme)) {
      dump("*** No external handler for " + uri.scheme + "\n");
      return;
    }
    eps.loadURI(uri, null);
  }
};
