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

var gDialog;
var kFolderImage = "chrome://celtx/skin/folder.png";

function loaded () {
  gDialog = new Object;
  gDialog.config        = window.arguments[0];
  gDialog.acceptButton  = document.documentElement.getButton("accept");
  gDialog.locationList  = document.getElementById("location-list");
  gDialog.titleBox      = document.getElementById("title-box");

  populateLocations(gDialog.config.project.rootFolder);

  gDialog.titleBox.focus();

  validate();
}

function populateLocations(parent, depth) {
  if (! depth)
    depth = 0;
  
  var rdfsvc = getRDFService();
  var cu = getRDFContainerUtils();
  var ds = parent.ds;
  var titleArc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var title = ds.GetTarget(parent.res, titleArc, true);
  if (title && parent.res.Value != gDialog.config.project.rootFolder.res.Value)
    title = title.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
  else
    title = gDialog.config.project.title;
  
  var item = gDialog.locationList.appendItem(title, parent.res.Value);
  item.class = "menuitem-iconic";
  item.setAttribute("style", "margin-left: " + depth + "em;");
  item.setAttribute("image", kFolderImage);
  
  if (parent.res.Value == gDialog.config.location.Value)
    gDialog.locationList.selectedItem = item;
  
  var elems = parent.toArray();
  for (var i = 0; i < elems.length; i++) {
    if (cu.IsSeq(ds, elems[i]))
      populateLocations(new RDFSeq(ds, elems[i]), depth + 1);
  }
}

function accepted () {
  var rdfsvc = getRDFService();
  var location = gDialog.locationList.selectedItem.value;
  
  gDialog.config.accepted   = true;
  gDialog.config.title      = gDialog.titleBox.value;
  gDialog.config.location   = rdfsvc.GetResource(location);
  
  return true;
}

function canceled () {
  return true;
}

function validate () {
  if (gDialog.titleBox.value != "")
    gDialog.acceptButton.disabled = false;
  else
    gDialog.acceptButton.disabled = true;
}
