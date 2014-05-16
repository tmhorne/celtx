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

var gShotController = {
  loaded: function loaded () {
    this.view = document.getElementById("shotprintview");
    this.tree = document.getElementById("shottree");
  },


  open: function open (project, docres) {
    this.outlineView = gController.outlineView;
    this.project = project;
    this.docres = docres;

    this.tree.database.AddDataSource(project.ds);
    var rdfsvc = getRDFService();
    var sequencesarc = rdfsvc.GetResource(Cx.NS_CX + "shots");
    var sequences = project.ds.GetTarget(docres, sequencesarc, true);
    if (! sequences) {
      sequences = rdfsvc.GetAnonymousResource();
      project.ds.Assert(docres, sequencesarc, sequences, true);
      getRDFContainerUtils().MakeSeq(project.ds, sequences);
    }
    sequences = sequences.QueryInterface(
      Components.interfaces.nsIRDFResource);
    this.tree.ref = sequences.Value;
  },


  save: function save () {
  },


  commands: {
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1
  },


  supportsCommand: function supportsCommand (cmd) {
    return this.commands[cmd] == 1;
  },


  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
      case "cmd-print":
      case "cmd-print-preview":
        return true;
      default:
        return false;
    }
  },


  doCommand: function doCommand (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        PrintUtils.print();
        break;
      case "cmd-print-preview":
        dump("*** TODO: Implement cmd-print-preview in shot list\n");
        break;
    }
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);
  },


  onScriptLoad: function onScriptLoad () {
  },


  focus: function focus () {
    this.view.setAttribute("type", "content-primary");
    this.outlineView.showSceneNav();
  },


  blur: function blur () {
    this.view.setAttribute("type", "content");
  },


  onPopupKeyPress: function onPopupKeyPress (event) {
    var popup = document.getElementById("treeeditpopup");
    var editbox = document.getElementById("treeeditbox");
    switch (event.keyCode) {
      case KeyEvent.DOM_VK_RETURN:
      case KeyEvent.DOM_VK_ENTER:
        this.savePopupText();
        popup.hidePopup();
        break;
      case KeyEvent.DOM_VK_ESCAPE:
        popup.hidePopup();
        break;
    }
  },


  savePopupText: function savePopupText () {
    var editbox = document.getElementById("treeeditbox");
    var rdfsvc = getRDFService();
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var locationarc = rdfsvc.GetResource(Cx.NS_CX + "location");
    var shottypearc = rdfsvc.GetResource(Cx.NS_CX + "shottype");
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sequenceid");
    var shotidarc = rdfsvc.GetResource(Cx.NS_CX + "shotid");
    var res = this.tree.view.getResourceAtIndex(this._selectedRow);
    if (! res)
      return;
    switch (this._selectedCol.id) {
      case "shottitlecolumn":
        // setRDFString(this.project.ds, res, titlearc, editbox.value);
        var paraid = getRDFString(this.project.ds, res, sceneidarc);
        if (! paraid)
          paraid = getRDFString(this.project.ds, res, shotidarc);
        if (! paraid)
          return;
        var editor = gScriptController.editor;
        var para = editor.contentDocument.getElementById(paraid);
        if (para) {
          editor.replaceParagraphContents(para, editbox.value);
        }
        else {
          dump("*** Couldn't find paragraph " + paraid + "\n");
        }
        gScriptController.sceneTracker.update();
        break;
      case "shotlocationcolumn":
        setRDFString(this.project.ds, res, locationarc, editbox.value);
        break;
      case "shottypecolumn":
        setRDFString(this.project.ds, res, shottypearc, editbox.value);
        break;
      default:
        dump("*** savePopupText: " + this._selectedCol.id + "\n");
    }
  },


  onShotTreeDblClick: function onShotTreeDblClick (event) {
    dump("--- onShotTreeDblClick\n");
    try {
    var x = event.clientX;
    var y = event.clientY;
    var row = {};
    var col = {};
    var elt = {};
    this.tree.treeBoxObject.getCellAt(x, y, row, col, elt);
    if (elt.value != "text") {
      dump("*** elt.value == " + elt.value + "\n");
      return;
    }
    event.preventDefault();
    var coords = { x: {}, y: {}, w: {}, h: {} };
    this.tree.treeBoxObject.getCoordsForCellItem(row.value, col.value, "cell",
      coords.x, coords.y, coords.w, coords.h);
    this._selectedRow = row.value;
    this._selectedCol = col.value;
    var text = this.tree.view.getCellText(row.value, col.value);
    var popup = document.getElementById("treeeditpopup");
    var offsetx = this.tree.treeBoxObject.screenX + coords.x.value;
    var offsety = this.tree.treeBoxObject.screenY
      + coords.y.value + coords.h.value;
    var editbox = document.getElementById("treeeditbox");
    editbox.setAttribute("width", coords.w.value);
    editbox.setAttribute("height", coords.h.value);
    popup.showPopup(this.tree, offsetx, offsety, "popup", null, null, null);
    editbox.focus();
    editbox.value = text;
    }
    catch (ex) {
      dump("*** onShotTreeDblClick: " + ex + "\n");
    }
  }
};
