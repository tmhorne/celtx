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

function getWindowTitle () {
  // return document.documentElement.getAttribute("title");
  return document.title;
}

function setWindowTitle (title) {
  // document.documentElement.setAttribute("title", title);
  document.title = title;
  return title;
}


var kPromptCancel = 0;
var kPromptSave = 1;
var kPromptDontSave = 2;


// Prevents the "natural" sort on a treecolumn from being set
function TreeHeaderCycleObserver (tree) {
  try {
    var view = tree.view.QueryInterface(
      Components.interfaces.nsIXULTreeBuilder);
    view.addObserver(this);
  }
  catch (ex) {
    dump("*** new TreeHeaderCycleObserver: " + ex + "\n");
  }
}


TreeHeaderCycleObserver.prototype = {
  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIXULTreeBuilderObserver))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
  canDrop: function (index, orientation) { return false; },
  onDrop: function (row, orientation) {},
  onCycleCell: function (row, colid) {},
  onCycleHeader: function onCycleHeader (colid, elt) {
    if (elt.getAttribute("sortDirection") == "descending")
      elt.setAttribute("sortDirection", "natural");
  },
  onPerformAction: function (action) {},
  onPerformActionOnRow : function (aAction, aItemIndex) {},
  onPerformActionOnCell: function (aAction, aItemIndex, aColumnID) {},
  onSelectionChanged: function () {},
  onToggleOpenState: function (aRow) {}
};


function promptSaveDialog (title, msg) {
  var psvc = getPromptService();
  var IPS = Components.interfaces.nsIPromptService;
  // On the Mac, the Cancel keyboard shortcut gets misinterpreted as coming
  // from button 1, regardless of the button title assignment.
  var cancelButton = isMac() ? 1 : 2;
  var cancelPos = isMac() ? IPS.BUTTON_POS_1 : IPS.BUTTON_POS_2;
  var dontsavePos = isMac() ? IPS.BUTTON_POS_2 : IPS.BUTTON_POS_1;
  var IPS = Components.interfaces.nsIPromptService;
  var flags = IPS.BUTTON_POS_0 * IPS.BUTTON_TITLE_SAVE +
    dontsavePos * IPS.BUTTON_TITLE_DONT_SAVE +
    cancelPos * IPS.BUTTON_TITLE_CANCEL;
  var check = { value: false };
  var result = psvc.confirmEx(window, title, msg, flags,
                              null, null, null, null, check);
  if (result == cancelButton) // Cancel
    return kPromptCancel;
  else if (result == 0) // Save
    return kPromptSave;
  else
    return kPromptDontSave;
}


// Make sure the row for a resource in a template tree is visible. Since it's
// difficult (if not impossible) to determine the RDF template path for a
// given resource, this function does not guarantee success.
function makeTreeResourceVisible (res, tree) {
  var rdfsvc = getRDFService();
  var IRes = Components.interfaces.nsIRDFResource;
  var IDataSource = Components.interfaces.nsIRDFDataSource;
  if (! (res instanceof IRes)) {
    try {
      res = rdfsvc.GetResource(res);
    }
    catch (ex) {
      throw "makeTreeResourceVisible: Argument must be a resource";
    }
  }
  var builder = tree.builderView;
  var idx = builder.getIndexOfResource(res);
  if (idx >= 0) {
    tree.treeBoxObject.ensureRowIsVisible(idx);
    return true;
  }
  var path = [ res ];
  var cu = getRDFContainerUtils();
  var ds = tree.database.QueryInterface(IDataSource);
  var cur = res;
  while (cur) {
    var arcs = ds.ArcLabelsIn(cur);
    var parent = null;
    while (arcs.hasMoreElements()) {
      var arc = arcs.getNext().QueryInterface(IRes);
      if (! cu.IsOrdinalProperty(arc))
        continue;
      var seqs = ds.GetSources(arc, cur, true);
      while (seqs.hasMoreElements()) {
        if (parent) {
          dump("*** makeTreeResourceVisible: Multiple containers for resource\n");
          return false;
        }
        parent = seqs.getNext().QueryInterface(IRes);
      }
    }
    if (! parent)
      throw "makeTreeResourceVisible: Resource is not rooted in tree";
    path.push(parent);
    idx = builder.getIndexOfResource(parent);
    if (idx >= 0)
      break;
    else
      cur = parent;
  }
  while (path.length > 0) {
    cur = path.pop();
    idx = builder.getIndexOfResource(cur);
    if (tree.view.isContainer(idx) && ! tree.view.isContainerOpen(idx))
      tree.view.toggleOpenState(idx);
  }
  // idx now points at the visible index of res
  tree.treeBoxObject.ensureRowIsVisible(idx);
  return true;
}


// Find an item by value for various list types.

function getItemByValue (elem, value) {
  if (!elem)  throw "getItemByValue: element is undefined";
  if (value === undefined || value === null)
    throw "getItemByValue: value is undefined";
  
  switch (elem.localName) {
    case "toolbarbutton":
    case "menulist":
    case "menu":
      return getItemByValue_menulist(elem,  value);
    case "listbox":
      return getItemByValue_listbox(elem, value);
    case "tabbox":
    case "tabs":
      return getItemByValue_tabbox(elem, value);
    case "tree":
      return getItemByValue_tree(elem, value);
    case "radiogroup":
      return getItemByValue_radiogroup(elem, value);
    default:
      throw "getItemByValue: no implementation for " + elem.nodeName;
  }
}

// Determine if a tree row is seleced.

function isTreeRowSelected (tree, index) {
  return tree.view.selection.isSelected(index);
}

// Iterate through the selected rows of a tree.

function TreeSelectionIterator (tree) {
  this.tree = tree;
  this.currentRangeIndex = 0;
  this.currentRangeMin = { value: -1 };
  this.currentRangeMax = { value: -1 };
  this.lastValue = -1;
  this.rangeCount = tree.view.selection.getRangeCount();
}

TreeSelectionIterator.prototype = {
hasMore: function () {
  return (this.lastValue < this.currentRangeMax.value
          || this.currentRangeIndex < this.rangeCount);
},

getNext: function () {
  if (this.lastValue < this.currentRangeMax.value)
    return ++this.lastValue;
  else if (this.currentRangeIndex < this.rangeCount) {
    this.tree.view.selection.getRangeAt(this.currentRangeIndex++,
                                        this.currentRangeMin, this.currentRangeMax);
    this.lastValue = this.currentRangeMin.value;
    return this.lastValue;
  }
  else
    return -1;
}
};

// Private implementations

function getItemByValue_menulist (elem, value) {
  var popups = elem.getElementsByTagName("menupopup");
  if (popups.length != 1)
    throw "getItemByValue: menulists should have a single menupopup child";
  var items = popups[0].childNodes;
  for (var i = 0; i < items.length; i++) {
    if (items[i].value == value)
      return items[i];
  }
  return null;
}

function getItemByValue_listbox (elem, value) {
  var count = elem.getRowCount();
  for (var i = 0; i < count; i++) {
    var item = elem.getItemAtIndex(i);
    if (item.value == value)
      return item;
  }
  return null;
}

function getItemByValue_tabbox (elem, value) {
  var tabs = elem.getElementsByTagName("tab");
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].getAttribute("value") == value)
      return tabs[i];
  }
  return null;
}

function getItemByValue_tree (elem, value) {
  var view = elem.view;
  try {
    view = view.QueryInterface(Components.interfaces.nsITreeContentView);
  }
  catch (ex) {
    dump("*** getItemByValue called on a dont-build-content tree\n");
    return null;
  }
  var rows = view.rowCount;
  for (var i = 0; i < rows; i++) {
    var item = view.getItemAtIndex(i);
    if (item.getAttribute("value") == value)
      return item;
  }
  return null;
}

function getItemByValue_radiogroup (elem, value) {
  var radios = elem.getElementsByTagName("radio");
  for (var i = 0; i < radios.length; ++i) {
    if (radios[i].getAttribute("value") == value)
      return radios[i];
  }
  return null;
}
