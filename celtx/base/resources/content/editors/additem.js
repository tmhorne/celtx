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

var gWindow = new Object();

function loaded () {
  gWindow.config    = window.arguments[0];
  gWindow.itemlist  = document.getElementById("itemlist");

  var rdfsvc = Components.classes["@mozilla.org/rdf/rdf-service;1"]
    .getService(Components.interfaces.nsIRDFService);
  var typearc = rdfsvc.GetResource(
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
  var titlearc = rdfsvc.GetResource("http://purl.org/dc/elements/1.1/title");
  var catres = rdfsvc.GetResource(gWindow.config.category);
  var items = gWindow.config.project.ds.GetSources(typearc, catres, true);
  while (items.hasMoreElements()) {
    var item = items.getNext().QueryInterface(
      Components.interfaces.nsIRDFResource);
    var title = gWindow.config.project.ds.GetTarget(item, titlearc, true);
    if (! title)
      continue;
    title = title.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
    gWindow.itemlist.appendItem(title, item.Value);
  }
}

function accepted () {
  var item = gWindow.itemlist.selectedItem;
  if (item) {
    gWindow.config.resource = item.value;
  }
  else {
    gWindow.config.title = gWindow.itemlist.label;
  }
  gWindow.config.accepted = true;
  return true;
}

function canceled () {
  return true;
}

function selected () {
}
