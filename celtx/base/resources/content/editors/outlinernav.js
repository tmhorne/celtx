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

var gWindow = null;
var gDelegate = null;
var gChapterList = null;

function loaded () {
  gWindow = new Object();

  gWindow.tree = document.getElementById("chaptertree");
  gWindow.refreshTimer = null;
}


function setDelegate (aDelegate) {
  gDelegate = aDelegate;
}


function init (aChapterList) {
  gChapterList = aChapterList;
  gWindow.treeview = new ChapterTreeView(aChapterList);
  gWindow.tree.view = gWindow.treeview;
}


function shutdown () {
  gWindow.treeview.shutdown();
}


function getSelectedChapter () {
  var sel = gWindow.treeview.selection;
  if (sel.count != 1)
    return null;

  var start = new Object();
  var end = new Object();
  sel.getRangeAt(0, start, end);
  var index = start.value;
  return gWindow.treeview.getChapterAtIndex(index);
}


function selectItemWithID (domid) {
  var chapter = gChapterList.findByID(domid);
  if (! chapter)
    return;

  var index = gWindow.treeview.getIndexOfChapter(chapter);
  if (index >= 0)
    gWindow.treeview.selection.select(index);
}


function updateTreeCommands () {
  var upbutton = document.getElementById("nav-item-up-button");
  var downbutton = document.getElementById("nav-item-down-button");
  var deletebutton = document.getElementById("nav-item-delete-button");

  var chapters = gChapterList.chapters;
  var chapter = getSelectedChapter();
  if (! chapter || chapters.length == 0) {
    upbutton.disabled = true;
    downbutton.disabled = true;
    deletebutton.disabled = true;
  }
  else {
    upbutton.disabled = (chapter == chapters[0]);
    downbutton.disabled = (chapter == chapters[chapters.length - 1]);
    deletebutton.disabled = false;
  }
}


function toggleTitles () {
  var titlecol = document.getElementById("titlecol");
  var altcol = document.getElementById("alttitlecol");
  altcol.hidden = titlecol.hidden;
  titlecol.hidden = ! titlecol.hidden;

  var titleToggle = document.getElementById("titletogglebutton");
  titleToggle.setAttribute("tooltiptext",
    titlecol.hidden ? gApp.getText("DisplayChapterNames")
                    : gApp.getText("DisplayIndexCardTitles"));
}


function chapterSelected (aEvent) {
  updateTreeCommands();
}


function chapterDoubleClicked (aEvent) {
  var chapter = getSelectedChapter();
  if (chapter)
    gDelegate.goToChapter(chapter.element.id);
}


function moveSelectedChapterDown () {
  var chapter = getSelectedChapter();
  if (! chapter)
    throw new Error("No chapter selected");

  var index = gChapterList.indexOf(chapter);
  if (index < 0)
    throw new Error("Chapter not found in chapter list");

  var chapters = gChapterList.chapters;
  if (index + 2 < chapters.length)
    gDelegate.insertChapterBeforeChapter(chapter, chapters[index + 2]);
  else
    gDelegate.insertChapterBeforeChapter(chapter, null);

  gDelegate.forceHeadingUpdate();
  index = gChapterList.indexOf(chapter)
  if (index >= 0)
    gWindow.treeview.selection.select(index);
}


function moveSelectedChapterUp () {
  var chapter = getSelectedChapter();
  if (! chapter)
    throw new Error("No chapter selected");

  var index = gChapterList.indexOf(chapter);
  if (index < 0)
    throw new Error("Chapter not found in chapter list");

  var chapters = gChapterList.chapters;
  if (index > 0)
    gDelegate.insertChapterBeforeChapter(chapter, chapters[index - 1]);

  gDelegate.forceHeadingUpdate();
  index = gChapterList.indexOf(chapter)
  if (index >= 0)
    gWindow.treeview.selection.select(index);
}


function deleteSelectedChapter () {
  var chapter = getSelectedChapter();
  if (! chapter)
    throw new Error("No chapter selected");

  var ps = getPromptService();
  var title = gApp.getText("DeleteChapter");
  var msg = gApp.getText("DeleteChapterPrompt");
  if (! ps.confirm(window, title, msg))
    return;

  gDelegate.deleteChapter(chapter);
}


function onDragGesture (aEvent) {
  if (aEvent.originalTarget.localName == "treechildren" && gDelegate)
    nsDragAndDrop.startDrag(aEvent, gWindow.treeview);
}


function ChapterTreeView (aChapterList) {
  this.chapterList = aChapterList;

  this.dragsvc = Components.classes["@mozilla.org/widget/dragservice;1"]
    .getService(Components.interfaces.nsIDragService);

  var obsvc = getObserverService();
  obsvc.addObserver(this, "chapter:didAdd", false);
  obsvc.addObserver(this, "chapter:willRemove", false);
  obsvc.addObserver(this, "chapter:didRemove", false);
  obsvc.addObserver(this, "breakdownUnit:didChangeTitle", false);
  obsvc.addObserver(this, "breakdownUnit:didChangeAltTitle", false);
  obsvc.addObserver(this, "breakdownUnit:didChangeColour", false);
}


ChapterTreeView.prototype = {
  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) ||
        aIID.equals(Components.interfaces.nsIObserver) ||
        aIID.equals(Components.interfaces.nsITreeView))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  shutdown: function () {
    var obsvc = getObserverService();
    obsvc.removeObserver(this, "chapter:didAdd");
    obsvc.removeObserver(this, "chapter:willRemove");
    obsvc.removeObserver(this, "chapter:didRemove");
    obsvc.removeObserver(this, "breakdownUnit:didChangeTitle");
    obsvc.removeObserver(this, "breakdownUnit:didChangeAltTitle");
    obsvc.removeObserver(this, "breakdownUnit:didChangeColour");
  },


  _removeIndex: -1,
  observe: function (aSubject, aTopic, aData) {
    if (! this.tree)
      return;

    try {
      aSubject = aSubject.wrappedJSObject;
    }
    catch (ex) {
      dump("*** ChapterTreeView.observe: " + ex + "\n");
      return;
    }
    var index = this.getIndexOfChapter(aSubject);

    // There's no String.startsWith(x), but String.lastIndexOf(x, 0) == 0
    // means the same thing and is (hopefully) as efficient

    // Chapter list topics (add and remove)
    if (aTopic.lastIndexOf("chapter:", 0) == 0) {
      if (aTopic == "chapter:willRemove")
        this._removeIndex = index;
      else if (aTopic == "chapter:didAdd" && index >= 0)
        this.didAddChapter(aSubject, index);
      else if (aTopic == "chapter:didRemove" && this._removeIndex >= 0) {
        this.didRemoveChapter(aSubject, this._removeIndex);
        this._removeIndex = -1;
      }
    }
    // Chapter topics (modifications)
    else if (aTopic.lastIndexOf("breakdownUnit:", 0) == 0) {
      if (index >= 0) {
        if (aTopic == "breakdownUnit:didChangeTitle")
          this.didChangeChapterTitle(aSubject, index);
        else if (aTopic == "breakdownUnit:didChangeAltTitle")
          this.didChangeChapterAltTitle(aSubject, index);
        else if (aTopic == "breakdownUnit:didChangeColour")
          this.didChangeChapterColour(aSubject, index);
      }
    }
  },


  didAddChapter: function (aChapter, aIndex) {
    if (! this.tree)
      return;
    this.tree.rowCountChanged(aIndex, 1);
  },


  didRemoveChapter: function (aChapter, aIndex) {
    if (! this.tree)
      return;
    this.tree.rowCountChanged(aIndex, -1);
  },


  didChangeChapterTitle: function (aChapter, aIndex) {
    if (! this.tree)
      return;
    this.tree.invalidateRow(aIndex);
  },


  didChangeChapterAltTitle: function (aChapter, aIndex) {
    if (! this.tree)
      return;
    this.tree.invalidateRow(aIndex);
  },


  didChangeChapterColour: function (aChapter, aIndex) {
    if (! this.tree)
      return;
    this.tree.invalidateRow(aIndex);
  },


  get rowCount () {
    return this.chapterList.chapters.length;
  },


  getChapterAtIndex: function (aIndex) {
    var chapters = this.chapterList.chapters;
    if (aIndex < 0 || aIndex >= chapters.length)
      return null;
    return chapters[aIndex];
  },


  getIndexOfChapter: function (aChapter) {
    var chapters = this.chapterList.chapters;
    for (var i = 0; i < chapters.length; ++i) {
      if (aChapter.equals(chapters[i]))
        return i;
    }
    return -1;
  },


  getRowProperties: function (aIndex, aProperties) {
    var chapter = this.chapterList.chapters[aIndex];
    var colour = chapter.colour || "white";
    aProperties.AppendElement(getAtom(colour));
  },
  getCellProperties: function (aIndex, aCol, aProperties) {},
  getColumnProperties: function (aCol, aProperties) {},


  isContainer: function (aIndex) { return false; },
  isContainerOpen: function (aIndex) { return false; },
  isContainerEmpty: function (aIndex) { return true; },
  isSeparator: function (aIndex) { return false; },
  isSorted: function () { return false; },


  chapterFlavour: "x-celtx/x-chapter-uri",


  onDragStart: function onDragStart (aEvent, aXferData, aDragAction) {
    try {
      if (this.selection.count != 1) {
        dump("*** onDragStart: multi-select, aborting\n");
        return;
      }
      var index = this.selection.currentIndex;
      var chapter = this.getChapterAtIndex(index);
      if (! chapter)
        return;

      var data = new TransferData();
      data.addDataForFlavour(this.chapterFlavour, chapter.resource.Value);
      aXferData.data = data;
    }
    catch (ex) {
      dump("*** onDragStart: " + ex + "\n");
    }
  },


  canDrop: function (aIndex, aOrientation, aDataTransfer) {
    if (! gDelegate)
      return false;

    var dragSession = this.dragsvc.getCurrentSession();
    if (! dragSession)
      return false;

    if (dragSession.numDropItems != 1)
      return false;

    if (! dragSession.isDataFlavorSupported(this.chapterFlavour))
      return false;

    return aOrientation != Components.interfaces.nsITreeView.DROP_ON;
  },


  drop: function (aIndex, aOrientation, aDataTransfer) {
    if (aOrientation == Components.interfaces.nsITreeView.DROP_ON)
      return;
    else if (aOrientation == Components.interfaces.nsITreeView.DROP_AFTER)
      ++aIndex;

    try {

      if (! gDelegate)
        throw new Error("No delegate");

      var dragSession = this.dragsvc.getCurrentSession();
      if (! dragSession)
        throw new Error("No dragSession");

      if (dragSession.numDropItems != 1)
        throw new Error("Multiple drop items not supported");

      var trans = Components.classes["@mozilla.org/widget/transferable;1"]
        .createInstance(Components.interfaces.nsITransferable);

      if (! dragSession.isDataFlavorSupported(this.chapterFlavour))
        throw new Error("Supported flavour(s) not supported");

      var flavour = this.chapterFlavour;
      trans.addDataFlavor(flavour);
      dragSession.getData(trans, 0);
      var data = {};
      var len = {};
      trans.getTransferData(flavour, data, len);
      data = data.value.QueryInterface(Components.interfaces.nsISupportsString);
      if (! data)
        throw new Error("No valid transfer data");
      data = data.data.substring(0, len.value);

      var prevIndex = new Object();
      var chapter = this.chapterList.findByResource(data, prevIndex);
      if (! chapter)
        throw new Error("Chapter no longer exists");

      // A chapter is "before" itself *and* before the next chapter
      if (prevIndex.value == aIndex || prevIndex.value == aIndex - 1)
        return;

      var chapters = this.chapterList.chapters;
      var nextChapter = aIndex < chapters.length ? chapters[aIndex] : null;

      setTimeout(function () {
        gDelegate.insertChapterBeforeChapter(chapter, nextChapter);
      }, 0);
    }
    catch (ex) {
      dump("*** outlinernav.drop: " + ex + "\n");
    }
  },


  getParentIndex: function (aIndex) { return -1; },
  hasNextSibling: function (aIndex, aAfterIndex) {
    return aAfterIndex + 1 < this.rowCount;
  },
  getLevel: function (aIndex) { return 0; },


  getImageSrc: function (aIndex, aCol) { return ""; },
  getProgressMode: function (aIndex, aCol) {
    return Components.interfaces.nsITreeView.PROGRESS_NONE;
  },
  getCellValue: function (aIndex, aCol) { return ""; },
  getCellText: function (aIndex, aCol) {
    var chapters = this.chapterList.chapters;
    if (aIndex < 0 || aIndex >= chapters.length)
      return "";
    var chapter = chapters[aIndex];
    if (aCol.id == "ordinalcol")
      return chapter.ordinal;
    else if (aCol.id == "titlecol")
      return chapter.title;
    else if (aCol.id == "alttitlecol")
      return chapter.alttitle;
    else
      return "";
  },


  setTree: function (aTree) {
    this.tree = aTree;
  },


  toggleOpenState: function (aIndex) {},
  cycleHeader: function (aCol) {},
  selectionChanged: function () {},
  cycleCell: function (aIndex, aCol) {},
  isEditable: function (aIndex, aCol) { return false; },
  isSelectable: function (aIndex, aCol) { return true; },
  setCellValue: function (aIndex, aCol, aValue) {},
  setCellText: function (aIndex, aCol, aValue) {},
  performAction: function (aAction) {},
  performActionOnRow: function (aAction, aIndex) {},
  performActionOnCell: function (aAction, aIndex, aCol) {}
};
