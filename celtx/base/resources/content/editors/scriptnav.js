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

var gWindow;
var gSelectedScene;


function loaded () {
  gWindow = new Object;

  gWindow.deck          = document.getElementById("scriptnavdeck");
  gWindow.sceneTree     = document.getElementById("scene-tree");
  gWindow.reportTree    = document.getElementById("report-tree");
  gWindow.titleToggle   = document.getElementById("titletogglebutton");

  // Initial state is showing scene headings, so initial tooltip is to
  // show index card titles
  gWindow.titleToggle.setAttribute("tooltiptext",
    gApp.getText("DisplayIndexCardTitles"));
}


function showSceneNav () {
  gWindow.deck.selectedIndex = 0;
}


function showReportNav () {
  gWindow.deck.selectedIndex = 1;
}


function toggleTitles () {
  var titlecol = document.getElementById("title-col");
  var altcol = document.getElementById("alttitle-col");
  altcol.hidden = titlecol.hidden;
  titlecol.hidden = ! titlecol.hidden;

  gWindow.titleToggle.setAttribute("tooltiptext",
    titlecol.hidden ? gApp.getText("DisplaySceneheadings")
                    : gApp.getText("DisplayIndexCardTitles"));
}


function selectReportIndex (index) {
  gWindow.reportTree.view.selection.select(0);
}


function getSelectedReportIndex () {
  return gWindow.reportTree.view.selection.currentIndex;
}


function getSelectedReportName () {
  var idx = getSelectedReportIndex();
  var cols = gWindow.reportTree.columns;
  return gWindow.reportTree.view.getCellText(idx, cols.getFirstColumn());
}


function open (project, docres) {
  gWindow.ds = project.ds;
  gWindow.docres = docres;

  var rdfsvc = getRDFService();
  var mode = gWindow.delegate.mode;
  var listarc = null;
  if (mode == "theatre")
    listarc = rdfsvc.GetResource(Cx.NS_CX + "acts");
  else
    listarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");

  var listroot = gWindow.ds.GetTarget(docres, listarc, true);
  if (listroot) {
    listroot = listroot.QueryInterface(Components.interfaces.nsIRDFResource);
  }
  else {
    listroot = rdfsvc.GetAnonymousResource();
    gWindow.ds.Assert(docres, listarc, listroot, true);
    getRDFContainerUtils().MakeSeq(gWindow.ds, listroot);
  }

  gWindow.sceneTree.ref = listroot.Value;
  gWindow.sceneTree.database.AddDataSource(gWindow.ds);
  gWindow.sceneTreeView = new SceneTreeView(gWindow.sceneTree);
  gWindow.sceneTree.view.addObserver(gWindow.sceneTreeView);
  gWindow.sceneTree.builder.rebuild();

  if (! gWindow.delegate.scratchpad)
    document.getElementById("tree-recycle-item").hidden = true;

  if (mode == "comic")
    document.getElementById("scenenavheader").value = gApp.getText("Pages");
}


function close () {
  gWindow.sceneTree.view.removeObserver(gWindow.sceneTreeView);
  gWindow.sceneTree.database.RemoveDataSource(gWindow.ds);
}


// The controller from the primary script window
function setDelegate (delegate) {
  gWindow.delegate = delegate;
}


function onSceneSelect (event) {
  updateTreeCommands();
  if (gWindow.delegate) {
    var idx = gWindow.sceneTree.view.selection.currentIndex;
    if (idx < 0)
      return;
    if (isSceneRow(idx))
      gWindow.delegate.onSceneSelect(event);
    else if (isActRow(idx))
      gWindow.delegate.onActSelect(event);
    else if (isShotRow(idx))
      gWindow.delegate.onShotSelect(event);
  }
}


function updateTreeCommands () {
  goUpdateCommand("cmd-treeitem-down");
  goUpdateCommand("cmd-treeitem-up");
  goUpdateCommand("cmd-treeitem-recycle");
  goUpdateCommand("cmd-treeitem-delete");
}


function getSelectedID () {
  if (gWindow.sceneTree.view.selection.count != 1)
    return null;

  var idx = gWindow.sceneTree.view.selection.currentIndex;
  if (idx < 0)
    return null;
  var rdfsvc = getRDFService();
  var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
  var actidarc = rdfsvc.GetResource(Cx.NS_CX + "actid");
  var shotidarc = rdfsvc.GetResource(Cx.NS_CX + "shotid");
  var res = gWindow.sceneTree.view.getResourceAtIndex(idx);
  var idstr = getRDFString(gWindow.ds, res, sceneidarc);
  if (idstr)
    return idstr;
  idstr = getRDFString(gWindow.ds, res, actidarc);
  if (idstr)
    return idstr;
  idstr = getRDFString(gWindow.ds, res, shotidarc);
  return idstr;
}


function getSelectedSceneID () {
  var treeview = gWindow.sceneTree.view;
  if (treeview.selection.count != 1)
    return null;
  var idx = treeview.selection.currentIndex;
  return isSceneRow(idx) ? getSelectedID() : null;
}


function getSelectedAct () {
  var treeview = gWindow.sceneTree.view;
  if (treeview.selection.count != 1)
    return null;
  var idx = treeview.selection.currentIndex;
  return isActRow(idx) ? treeview.getResourceAtIndex(idx) : null;
}


function getSelectedScene () {
  var treeview = gWindow.sceneTree.view;
  if (treeview.selection.count != 1)
    return null;
  var idx = treeview.selection.currentIndex;
  return isSceneRow(idx) ? treeview.getResourceAtIndex(idx) : null;
}


function getSelectedShot () {
  var treeview = gWindow.sceneTree.view;
  var idx = treeview.selection.currentIndex;
  return isShotRow(idx) ? treeview.getResourceAtIndex(idx) : null;
}


function selectScene (sceneres) {
  var view = gWindow.sceneTree.view;
  var rdfsvc = getRDFService();
  var index = view.getIndexOfResource(sceneres);
  if (index >= 0) {
    view.selection.select(index);
    gWindow.sceneTree.treeBoxObject.ensureRowIsVisible(index);
    return;
  }

  // Maybe we have the scene, but it's under a closed act node. Find the
  // act node if possible.
  var cu = getRDFContainerUtils();
  var ds = gWindow.sceneTree.database;
  var arcs = ds.ArcLabelsIn(sceneres);
  while (arcs.hasMoreElements()) {
    var arc = arcs.getNext().QueryInterface(
      Components.interfaces.nsIRDFResource);
    if (! cu.IsOrdinalProperty(arc))
      continue;
    var acts = ds.GetSources(arc, sceneres, true);
    while (acts.hasMoreElements()) {
      var actres = acts.getNext().QueryInterface(
        Components.interfaces.nsIRDFResource);
      var actindex = view.getIndexOfResource(actres);
      if (actindex < 0)
        continue;
      view.toggleOpenState(actindex);
      index = view.getIndexOfResource(sceneres);
      // index should never be negative at this point
      if (index >= 0) {
        view.selection.select(index);
        gWindow.sceneTree.treeBoxObject.ensureRowIsVisible(index);
      }
      return;
    }
  }
}


function selectSceneAtIndex (index) {
  var rdfsvc = getRDFService();
  var IRes = Components.interfaces.nsIRDFResource;
  var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");
  var scenes = gWindow.ds.GetTarget(gWindow.docres, scenesarc, true);
  if (scenes && scenes instanceof IRes) {
    scenes = new RDFSeq(gWindow.ds, scenes.QueryInterface(IRes));
    if (index >= 0 && index < scenes.length) {
      var scene = scenes.get(index).QueryInterface(IRes);
      selectScene(scene);
    }
  }
}


function isSceneRow (idx) {
  if (idx < 0)
    return false;
  var rdfsvc = getRDFService();
  var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
  var res = gWindow.sceneTree.view.getResourceAtIndex(idx);
  if (! res)
    return false;
  var sceneid = gWindow.ds.GetTarget(res, sceneidarc, true);
  return sceneid != null;
}


function isActRow (idx) {
  if (idx < 0)
    return false;
  var rdfsvc = getRDFService();
  var actidarc = rdfsvc.GetResource(Cx.NS_CX + "actid");
  var res = gWindow.sceneTree.view.getResourceAtIndex(idx);
  if (! res)
    return false;
  var actid = gWindow.ds.GetTarget(res, actidarc, true);
  return actid != null;
}


function isShotRow (idx) {
  if (idx < 0)
    return false;
  var rdfsvc = getRDFService();
  var shotidarc = rdfsvc.GetResource(Cx.NS_CX + "shotid");
  var res = gWindow.sceneTree.view.getResourceAtIndex(idx);
  if (! res)
    return false;
  var shotid = gWindow.ds.GetTarget(res, shotidarc, true);
  return shotid != null;
}


function SceneTreeView (tree) {
  this.tree = tree;
  this.dragsvc = Components.classes["@mozilla.org/widget/dragservice;1"]
    .getService(Components.interfaces.nsIDragService);
}


SceneTreeView.prototype = {
  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIXULTreeBuilderObserver))
      return true;
    throw Components.results.NS_NOINTERFACE;
  },


  DROP_BEFORE: Components.interfaces.nsIXULTreeBuilderObserver.DROP_BEFORE,
  DROP_ON: Components.interfaces.nsIXULTreeBuilderObserver.DROP_ON,
  DROP_AFTER: Components.interfaces.nsIXULTreeBuilderObserver.DROP_AFTER,


  sceneFlavour: "x-celtx/x-sceneid",
  shotFlavour: "x-celtx/x-shotid",
  actFlavour: "x-celtx/x-actid",


  canDrop: function (index, orientation) {
    if (! gWindow.delegate)
      return false;

    var dragSession = this.dragsvc.getCurrentSession();
    if (! dragSession)
      return false;

    if (dragSession.numDropItems != 1)
      return false;

    if (dragSession.isDataFlavorSupported(this.actFlavour)) {
      if (orientation == this.DROP_ON)
        return false;
      else
        return isActRow(index);
    }
    else if (dragSession.isDataFlavorSupported(this.sceneFlavour)) {
      if (orientation == this.DROP_ON)
        return isActRow(index);
      else
        return isSceneRow(index);
    }
    else if (dragSession.isDataFlavorSupported(this.shotFlavour)) {
      if (orientation == this.DROP_ON)
        return isSceneRow(index);
      else
        return isShotRow(index);
    }

    return false;
  },


  onCycleCell: function (row, colid) {},
  onCycleHeader: function (colid, elt) {},


  onDrop: function (row, orientation) {
    if (! gWindow.delegate) {
      dump("*** onDrop: no delegate\n");
      return;
    }

    var dragSession = this.dragsvc.getCurrentSession();
    if (! dragSession) {
      dump("*** onDrop: no dragSession\n");
      return;
    }

    if (dragSession.numDropItems != 1) {
      dump("*** onDrop: bad numDropItems or flavour not supported\n");
      return;
    }

    try {
      var trans = Components.classes["@mozilla.org/widget/transferable;1"]
        .createInstance(Components.interfaces.nsITransferable);
      var flavour = null;

      if (dragSession.isDataFlavorSupported(this.sceneFlavour))
        flavour = this.sceneFlavour;
      else if (dragSession.isDataFlavorSupported(this.actFlavour))
        flavour = this.actFlavour;
      else if (dragSession.isDataFlavorSupported(this.shotFlavour))
        flavour = this.shotFlavour;
      else {
        dump("*** onDrop: no data for supported flavours\n");
        return;
      }

      trans.addDataFlavor(flavour);
      dragSession.getData(trans, 0);
      var data = {};
      var len = {};
      trans.getTransferData(flavour, data, len);
      data = data.value.QueryInterface(Components.interfaces.nsISupportsString);
      if (! data) {
        dump("*** onDrop: no data\n");
        return;
      }
      data = data.data.substring(0, len.value);

      var treeview = gWindow.sceneTree.view;
      var rdfsvc = getRDFService();
      var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
      var actidarc = rdfsvc.GetResource(Cx.NS_CX + "actid");
      var shotidarc = rdfsvc.GetResource(Cx.NS_CX + "shotid");
      var res = rdfsvc.GetResource(data);
      var srcrow = treeview.getIndexOfResource(res);
      if (row == srcrow)
        return;

      if (flavour == this.actFlavour) {
        var id = getRDFString(gWindow.ds, res, actidarc);
        var acts = rdfsvc.GetResource(gWindow.sceneTree.getAttribute("ref"));
        acts = new RDFSeq(gWindow.ds, acts);
        var dstpos = acts.indexOf(treeview.getResourceAtIndex(row));
        if (dstpos < 0)
          return;
        if (orientation == this.DROP_AFTER)
          ++dstpos;
        // Act positions are 1-based
        gWindow.delegate.moveActToIndex(id, dstpos + 1);
      }
      else if (flavour == this.sceneFlavour) {
        var id = getRDFString(gWindow.ds, res, sceneidarc);
        // Check if this is a scene within an act or at the top level
        if (treeview.getLevel(srcrow) == 0) {
          var scenesuri = gWindow.sceneTree.getAttribute("ref");
          var scenes = rdfsvc.GetResource(scenesuri);
          scenes = new RDFSeq(gWindow.ds, scenes);
          var dstpos = scenes.indexOf(treeview.getResourceAtIndex(row));
          if (dstpos < 0)
            return;
          if (orientation == this.DROP_AFTER)
            ++dstpos;
          // Scene positions are 1-based
          gWindow.delegate.moveSceneToIndex(id, dstpos + 1);
        }
        else {
          var dstseq = null;
          var dstpos = null;
          if (isSceneRow(row)) {
            var seqidx = treeview.getParentIndex(row);
            dstseq = gWindow.sceneTree.view.getResourceAtIndex(seqidx);
            dstseq = new RDFSeq(gWindow.ds, dstseq);
            // If the drop is on a shot, we know the scene row is open
            dstpos = row - seqidx - 1;
            if (orientation == this.DROP_AFTER)
              ++dstpos;
          }
          else {
            dstseq = gWindow.sceneTree.view.getResourceAtIndex(row);
            dstseq = new RDFSeq(gWindow.ds, dstseq);
            dstpos = dstseq.length;
          }
          var seqid = getRDFString(gWindow.ds, dstseq.res, actidarc);
          // Scene positions are 1-based
          gWindow.delegate.moveSceneToAct(id, seqid, dstpos + 1);
        }
      }
      else {
        var id = getRDFString(gWindow.ds, res, shotidarc);
        var dstseq = null;
        var dstpos = null;
        if (isShotRow(row)) {
          var seqidx = treeview.getParentIndex(row);
          dstseq = gWindow.sceneTree.view.getResourceAtIndex(seqidx);
          dstseq = new RDFSeq(gWindow.ds, dstseq);
          // If the drop is on a shot, we know the scene row is open
          dstpos = row - seqidx - 1;
          if (orientation == this.DROP_AFTER)
            ++dstpos;
        }
        else {
          dstseq = gWindow.sceneTree.view.getResourceAtIndex(row);
          dstseq = new RDFSeq(gWindow.ds, dstseq);
          dstpos = dstseq.length;
        }
        var seqid = getRDFString(gWindow.ds, dstseq.res, sceneidarc);
        // Shot positions are 1-based
        gWindow.delegate.moveShotTo(id, seqid, dstpos + 1);
      }
    }
    catch (ex) {
      dump("*** onDrop: " + ex + "\n");
    }
  },


  onPerformAction: function (action)                {},
  onPerformActionOnCell: function (action, row, colid) {},
  onPerformActionOnRow: function (action, row)      {},
  onSelectionChanged: function ()                   {},
  onToggleOpenState: function (index) {},


  dragGesture: function dragGesture (event) {
    if (event.originalTarget.localName == "treechildren" && gWindow.delegate)
      nsDragAndDrop.startDrag(event, this);
  },


  onDragStart: function onDragStart (aEvent, aXferData, aDragAction) {
    try {
      var selection = this.tree.view.selection;
      if (selection.count != 1) {
        dump("*** onDragStart: multi-select, aborting\n");
        return;
      }
      var index = selection.currentIndex;
      var res = this.tree.view.getResourceAtIndex(index);
      if (! res)
        return;

      var ds = this.tree.database;
      var flavour = null;

      if (isSceneRow(index))
        flavour = this.sceneFlavour;
      else if (isActRow(index))
        flavour = this.actFlavour;
      else if (isShotRow(index))
        flavour = this.shotFlavour;
      else {
        dump("*** row dragged that isn't a scene or a shot\n");
        return;
      }

      var data = new TransferData();
      data.addDataForFlavour(flavour, res.Value);
      aXferData.data = data;
    }
    catch (ex) {
      dump("*** onDragStart: " + ex + "\n");
    }
  }
};
