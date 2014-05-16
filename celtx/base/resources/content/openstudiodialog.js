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

var gDialog = {};


function accepted () {
  try {
    gDialog.config.serverItem = getSelectedItem();
    gDialog.config.accepted = true;
  }
  catch (ex) {
    dump("*** accepted: " + ex + "\n");
    gDialog.config.accepted = false;
  }
  return true;
}


function canceled () {
  try {
    gDialog.config.accepted = false;
  }
  catch (ex) {
    dump("*** canceled: " + ex + "\n");
  }
  return true;
}


function loaded () {
  gDialog.config = window.arguments[0];
  gDialog.loadingdeck = document.getElementById("loadingdeck");
  gDialog.loadingmsg = document.getElementById("loadingmsg");
  gDialog.tree = document.getElementById("projecttree");
  gDialog.treeitems = document.getElementById("projectitems");
  document.documentElement.getButton("accept").disabled = true;

  // Map of item IDs to objects
  gDialog.items = new Object();

  var enumerator;
  if (getCeltxService().STUDIO_SERVER.match(/studio/))
    enumerator = new StudioEnumerator();
  else
    enumerator = new CloudEnumerator();

  var result = enumerator.fetch();
  result.addCallback(projectListReceived);
  result.addErrback(projectListFailed);
}


function projectListReceived (aList) {
  function addItem (aItem, aContext) {
    var treeitem = document.createElementNS(Cx.NS_XUL, "treeitem");
    if (aItem.id) {
      treeitem.setAttribute("id", aItem.id);
      gDialog.items[aItem.id] = aItem;
    }
    else
      dump("*** WARNING: No id attribute on server item " + aItem.title + "\n");

    var treerow = document.createElementNS(Cx.NS_XUL, "treerow");
    treeitem.appendChild(treerow);

    var title = document.createElementNS(Cx.NS_XUL, "treecell");
    title.setAttribute("label", aItem.title);
    var iconprefix = "chrome://celtx/skin/";
    if (aItem.type == "project")
      title.setAttribute("src", iconprefix + "celtx-16.png");
    else if (aItem.type == "script")
      title.setAttribute("src", iconprefix + "documents/script.png");
    else if (aItem.type == "collection")
      title.setAttribute("src", iconprefix + "folder.png");
    treerow.appendChild(title);

    var modified = document.createElementNS(Cx.NS_XUL, "treecell");
    if (aItem.lastModified)
      modified.setAttribute("label", aItem.lastModified.toLocaleDateString());
    else
      modified.setAttribute("label", "");
    treerow.appendChild(modified);

    var savedBy = document.createElementNS(Cx.NS_XUL, "treecell");
    savedBy.setAttribute("label", aItem.savedBy);
    treerow.appendChild(savedBy);

    if (aItem.children != null) {
      treeitem.setAttribute("container", "true");
      var treechildren = document.createElementNS(Cx.NS_XUL, "treechildren");
      treeitem.appendChild(treechildren);
      for (var i = 0; i < aItem.children.length; ++i)
        addItem(aItem.children[i], treechildren);
    }

    aContext.appendChild(treeitem);
  }

  for (var i = 0; i < aList.length; ++i)
    addItem(aList[i], gDialog.treeitems);

  gDialog.loadingdeck.selectedIndex = 1;
}


function projectListFailed (aError) {
  dump("*** projectListFailed: " + aError + "\n");
  gDialog.loadingmsg.value = gApp.getText("StudioContactFailed");
}


function getSelectedItem () {
  var treeview = gDialog.tree.view;
  var selection = treeview.selection;
  if (selection.getRangeCount() != 1)
    return null;

  var start = new Object();
  var end = new Object();
  selection.getRangeAt(0, start, end);
  if (start.value != end.value)
    return null;

  var treeitem = treeview.getItemAtIndex(start.value);
  var id = treeitem.getAttribute("id");
  if (id && id in gDialog.items)
    return gDialog.items[id];
  else
    return null;
}


function itemSelected () {
  var item = getSelectedItem();
  var disabled = true;
  if (item.type == "project" || item.type == "script")
    disabled = false;
  document.documentElement.getButton("accept").disabled = disabled;
}
