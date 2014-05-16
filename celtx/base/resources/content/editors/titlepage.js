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

// This was hastily updated to work for the text editor, so there's some
// conditional code that only executes if it detects it's in a script editor.

var gTitleController = {
  __proto__: EditorController.prototype,


  metamap: {
    "Author": "author",
    "DC.source": "source",
    "DC.rights": "rights",
    "CX.contact": "contact",
    "CX.byline": "byline"
  },


  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIObserver))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  loaded: function loaded () {
    this.frame = document.getElementById("titleframe");
  },


  _titlePageLoaded: false,


  onScriptLoad: function onScriptLoad () {
    this.frame.setAttribute("src", Cx.CONTENT_PATH + "editors/titlepage.xhtml");
    setTimeout("gTitleController.populateTitlePage()", 100);
  },


  init: function init (aEditorController) {
    this.editorController = aEditorController;
    this.editor = aEditorController.editor;
    this.frame.setAttribute("src", Cx.CONTENT_PATH + "editors/titlepage.xhtml");
    setTimeout("gTitleController.populateTitlePage()", 100);
  },


  shutdown: function shutdown () {
    this.editorController = null;
    this.editor = null;
  },


  populateTitlePage: function populateTitlePage () {
    if (this.frame.docShell.busyFlags) {
      setTimeout("gTitleController.populateTitlePage()", 100);
      return;
    }

    this._titlePageLoaded = true;

    var titledoc = this.frame.contentDocument;
    var doc = this.editor.contentDocument;
    var head = doc.documentElement.firstChild;
    var metas = head.getElementsByTagName("meta");

    for (var metaname in this.metamap) {
      var meta = null;
      for (var i = 0; i < metas.length; ++i) {
        if (metas[i].name == metaname) {
          meta = metas[i];
          break;
        }
      }
      if (! meta) {
        meta = doc.createElement("meta");
        meta.name = metaname;
        head.appendChild(meta);
        if (metaname == "CX.byline")
          meta.content = gApp.getText("TitlePageBy");
      }
      try {
        titledoc.getElementById(this.metamap[metaname]).value = meta.content;
      }
      catch (ex) {
        dump("*** populateTitlePage [" + this.metamap[metaname] + "]: " + ex + "\n");
      }
    }
    titledoc.getElementById("title").value = doc.title;

    this.updateRevisionLabel();
  },


  get modified () {
    var titledoc = this.frame.contentDocument;
    var doc = this.editor.contentDocument;
    var head = doc.documentElement.firstChild;
    var metas = head.getElementsByTagName("meta");
    for (var metaname in this.metamap) {
      for (var i = 0; i < metas.length; i++) {
        if (metas[i].name == metaname) {
          if (titledoc.getElementById(this.metamap[metaname]).value
              != metas[i].content)
            return true;
          break;
        }
      }
    }
    return titledoc.getElementById("title").value != doc.title;
  },


  open: function open (project, docres) {
  },


  close: function close () {
  },


  save: function save () {
    var titledoc = this.frame.contentDocument;
    var doc = this.editor.contentDocument;
    var head = doc.documentElement.firstChild;
    var metas = head.getElementsByTagName("meta");
    for (var metaname in this.metamap) {
      for (var i = 0; i < metas.length; i++) {
        if (metas[i].name == metaname) {
          metas[i].content = titledoc.getElementById(
            this.metamap[metaname]).value;
          break;
        }
      }
    }
    var titlestr = titledoc.getElementById("title").value;
    var title = head.getElementsByTagName("title")[0];
    if (title.firstChild)
      title.firstChild.nodeValue = titlestr;
    else
      title.appendChild(titledoc.createTextNode(titlestr));
    this.editor.title = titlestr;
  },


  updateRevisionLabel: function () {
    if ("getRevisionLabel" in this.editorController) {
      var revlabel = this.editorController.getRevisionLabel();
      var revdate = this.editorController.getRevisionDate();

      var doc = this.frame.contentDocument;
      var revdiv = doc.getElementById("revisiondiv");
      while (revdiv.hasChildNodes())
        revdiv.removeChild(revdiv.lastChild);

      if (revlabel || revdate) {
        var revnode;
        if (revlabel && revdate)
          revnode = doc.createTextNode(revlabel + " - " + revdate);
        else
          revnode = doc.createTextNode(revlabel || revdate);
  
        revdiv.appendChild(revnode);
      }
    }
  },


  focus: function focus () {
    this.frame.setAttribute("type", "content-primary");
    if ("showSceneNav" in gController)
      gController.outlineView.showSceneNav();
    if (this._titlePageLoaded)
      this.updateRevisionLabel();
  },


  blur: function blur () {
    if (this.inPrintPreview)
      PrintUtils.exitPrintPreview();
    if (this.modified) {
      this.save();
      if (this.editor.isLocked)
        this.editorController.isModified = true;
      else
        this.editor.editor.incrementModificationCount(1);
    }
    this.frame.setAttribute("type", "content");
  },


  commands: {
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1,
    "cmd-treeitem-delete": 1,
    "cmd-treeitem-down": 1,
    "cmd-treeitem-goto": 1,
    "cmd-treeitem-recycle": 1,
    "cmd-treeitem-up": 1
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
        PrintUtils.printPreview(title_onEnterPrintPreview,
          title_onExitPrintPreview);
        break;
    }
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);
  },


  // For PrintUtils support
  get browser () {
    return this.frame;
  }
};


function title_onEnterPrintPreview () {
  gTitleController.inPrintPreview = true;
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


function title_onExitPrintPreview () {
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
  gTitleController.inPrintPreview = false;
  gController.updateCommands();
}
