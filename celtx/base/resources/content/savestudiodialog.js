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

function loaded () {
  gDialog.config = window.arguments[0];
  gDialog.loadingdeck = document.getElementById("loadingdeck");
  gDialog.loadingmsg = document.getElementById("loadingmsg");
  gDialog.tree = document.getElementById("projecttree");
  gDialog.treeitems = document.getElementById("projectitems");
  gDialog.title = document.getElementById("titlebox");

  // Map of item IDs to objects
  gDialog.items = new Object();

  // Saves are always done using the legacy Studio API
  var enumerator = new StudioEnumerator();

  var result = enumerator.fetch();
  result.addCallback(projectListReceived);
  result.addErrback(projectListFailed);

  gDialog.title.value = gDialog.config.title;

  validate();
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
    else
      treeitem.setAttribute("disabled", "true");
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
      if (aItem.children.length == 0)
        treeitem.setAttribute("empty", "true");
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

  // Match the project wsref against the list if it has one, otherwise
  // check for matching titles
  if (! gDialog.config.wsref) {
    titleChanged();
    return;
  }

  var treeitem = document.getElementById(gDialog.config.wsref);
  if (! treeitem)
    return;

  try {
    gDialog.suppressEvents = true;
    var index = gDialog.tree.view.getIndexOfItem(treeitem);
    gDialog.tree.view.selection.select(index);
  }
  catch (ex) {
    dump("*** projectListReceived: " + ex + "\n");
  }
  finally {
    gDialog.suppressEvents = false;
  }
}


function projectListFailed () {
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
  if (gDialog.suppressEvents)
    return;

  gDialog.suppressEvents = true;

  var item = getSelectedItem();
  if (item)
    gDialog.title.value = item.title;

  gDialog.suppressEvents = false;

  validate();
}


function titleChanged () {
  if (gDialog.suppressEvents)
    return;

  var title = gDialog.title.value.toLocaleLowerCase();
  var selectedItem = null;
  for (var id in gDialog.items) {
    var item = gDialog.items[id];
    // These should always be equal using a StudioEnumerator
    if (item.type != "project")
      continue;

    var itemTitle = item.title.toLocaleLowerCase();
    if (itemTitle == title) {
      selectedItem = item;
      break;
    }
  }

  var index = -1;
  try {
    if (selectedItem) {
      var treeitem = document.getElementById(selectedItem.id);
      if (treeitem)
        index = gDialog.tree.view.getIndexOfItem(treeitem);
    }
  }
  catch (ex) {
    dump("*** titleChanged: " + ex + "\n");
  }

  gDialog.suppressEvents = true;
  try {
    if (index < 0)
      gDialog.tree.view.selection.clearSelection();
    else
      gDialog.tree.view.selection.select(index);
  }
  catch (ex) {
    dump("*** titleChanged: " + ex + "\n");
  }
  finally {
    gDialog.suppressEvents = false;
  }

  validate();
}


function accepted () {
  gDialog.config.accepted = true;
  gDialog.config.title = gDialog.title.value;
  var item = getSelectedItem();
  gDialog.config.wsref = item ? item.id : null;
  return true;
}


function canceled () {
  gDialog.config.accepted = false;
  return true;
}


function validate () {
  var disabled = false;

  var item = getSelectedItem();
  if (item && item.type != "project")
    disabled = true;

  var title = gDialog.title.value.replace(/^\s+/, "").replace(/\s+$/, "");
  if (! title)
    disabled = true;

  document.documentElement.getButton("accept").disabled = disabled;
}
