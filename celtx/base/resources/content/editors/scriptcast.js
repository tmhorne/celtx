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

var gCastController = {
  __proto__: EditorController.prototype,


  _modified: false,

  theatreMetas: {
    castItems: [],
    castTitle: null,
    sceneTitle: null,
    timeTitle: null
  },


  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIObserver) ||
        iid.equals(Components.interfaces.nsIDOMEventListener))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  loaded: function loaded () {
    this.frame = document.getElementById("castframe");
  },


  onScriptLoad: function onScriptLoad () {
    this.frame.setAttribute("src", Cx.CONTENT_PATH
      + "editors/theatretitle.xhtml");
    setTimeout("gCastController.populateTitlePage()", 100);
  },


  populateTitlePage: function populateTitlePage () {
    if (this.frame.docShell.busyFlags) {
      setTimeout("gCastController.populateTitlePage()", 100);
      return;
    }

    var doc = this.frame.contentDocument;
    var script = gScriptController.editor.contentDocument;
    var head = script.documentElement.firstChild;
    var metas = head.getElementsByTagName("meta");
    doc.body.addEventListener("input", this, false);

    var rowlessCast = [];
    for (var i = 0; i < metas.length; ++i) {
      switch (metas[i].name) {
        case "CX.castTitle":
          this.theatreMetas.castTitle = metas[i];
          break;
        case "CX.sceneTitle":
          this.theatreMetas.sceneTitle = metas[i];
          doc.getElementById("scene").value =
            metas[i].getAttribute("description");
          break;
        case "CX.timeTitle":
          this.theatreMetas.timeTitle = metas[i];
          doc.getElementById("time").value = 
            metas[i].getAttribute("description");
          break;
        case "CX.castItem":
          var row = metas[i].getAttribute("row");
          if (row) {
            this.theatreMetas.castItems[Number(row) - 1] = metas[i];
            var namefield = doc.getElementById("castname" + row);
            var descfield = doc.getElementById("castdesc" + row);
            if (namefield && descfield) {
              namefield.value = metas[i].content;
              descfield.value = metas[i].getAttribute("description");
            }
          }
          else {
            // Schedule for removal after iteration
            rowlessCast.push(metas[i]);
          }
          break;
      }
    }
    while (rowlessCast.length > 0) {
      var meta = rowlessCast.shift();
      meta.parentNode.removeChild(meta);
    }
  },


  handleEvent: function handleEvent (event) {
    dump("--- handleEvent: " + event.type + "\n");
    this._modified = true;
  },


  get modified () {
    return this._modified;
  },


  open: function open (project, docres) {
  },


  close: function close () {
  },


  save: function save () {
    this._modified = false;

    if (gScriptController.mode != "theatre" &&
        gScriptController.mode != "radio")
      return;

    var doc = this.frame.contentDocument;
    var script = gScriptController.editor.contentDocument;
    var head = script.documentElement.firstChild;

    if (! this.theatreMetas.castTitle) {
      var meta = script.createElement("meta");
      meta.name = "CX.castTitle";
      head.appendChild(meta);
      this.theatreMetas.castTitle = meta;
    }
    this.theatreMetas.castTitle.content = gApp.getText("CastOfCharacters");

    var scene = doc.getElementById("scene");
    if (! this.theatreMetas.sceneTitle) {
      var meta = script.createElement("meta");
      meta.name = "CX.sceneTitle";
      head.appendChild(meta);
      this.theatreMetas.sceneTitle = meta;
    }
    this.theatreMetas.sceneTitle.content = gApp.getText("Scene");
    this.theatreMetas.sceneTitle.setAttribute("description", scene.value);

    var time = doc.getElementById("time");
    if (! this.theatreMetas.timeTitle) {
      var meta = script.createElement("meta");
      meta.name = "CX.timeTitle";
      head.appendChild(meta);
      this.theatreMetas.timeTitle = meta;
    }
    this.theatreMetas.timeTitle.content = gApp.getText("Time");
    this.theatreMetas.timeTitle.setAttribute("description", time.value);

    var row = 1;
    while (true) {
      var namefield = doc.getElementById("castname" + row);
      var descfield = doc.getElementById("castdesc" + row);
      if (! (namefield && descfield))
        break;

      // If they're both empty, remove the meta
      if (! (namefield.value || descfield.value)) {
        if (this.theatreMetas.castItems.length >= row) {
          var meta = this.theatreMetas.castItems[row - 1];
          if (meta) {
            meta.parentNode.removeChild(meta);
            this.theatreMetas.castItems[row - 1] = null;
          }
        }
        ++row;
        continue;
      }

      if (this.theatreMetas.castItems.length < row)
        this.theatreMetas.castItems.push(null);

      var meta = this.theatreMetas.castItems[row - 1];
      if (! meta) {
        meta = script.createElement("meta");
        meta.name = "CX.castItem";
        meta.setAttribute("row", row);
        head.appendChild(meta);
        this.theatreMetas.castItems[row - 1] = meta;
      }
      meta.content = namefield.value;
      meta.setAttribute("description", descfield.value);
      ++row;
    }
  },


  focus: function focus () {
    this.frame.setAttribute("type", "content-primary");
    this.frame.contentWindow.focus();
  },


  blur: function blur () {
    if (this.inPrintPreview)
      PrintUtils.exitPrintPreview();
    this.frame.setAttribute("type", "content");
    this.save();
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
        PrintUtils.printPreview(cast_onEnterPrintPreview,
          cast_onExitPrintPreview);
        break;
    }
  },


  updateCommands: function updateCommands () {
  },


  // For PrintUtils support
  get browser () {
    return this.frame;
  }
};


function cast_onEnterPrintPreview () {
  gCastController.inPrintPreview = true;
  /*
  try {
    var printPreviewTB = document.createElementNS(XUL_NS, "toolbar");
    printPreviewTB.setAttribute("printpreview", true);
    printPreviewTB.setAttribute("id", "print-preview-toolbar");
    getBrowser().parentNode.insertBefore(printPreviewTB, getBrowser());
  }
  catch (ex) {
    dump("*** title_onEnterPrintPreview: " + ex + "\n");
  }
  */
  gController.updateCommands();
  getBrowser().contentWindow.focus();
}


function cast_onExitPrintPreview () {
  /*
  try {
    var printPreviewTB = document.getElementById("print-preview-toolbar");
    if (printPreviewTB)
      printPreviewTB.parentNode.removeChild(printPreviewTB);
  }
  catch (ex) {
    dump("*** title_onExitPrintPreview: " + ex  + "\n");
  }
  */
  gCastController.inPrintPreview = false;
  gController.updateCommands();
}
