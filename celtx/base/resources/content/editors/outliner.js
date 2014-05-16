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

var kDefaultFontName = "Times";


function ChapterList (aController) {
  this.ds = aController.document.project.ds;
  this.docres = aController.document.resource;
  this.controller = aController;
  this.editor = aController.editor;

  var doc = this.editor.contentDocument;

  var rdfsvc = getRDFService();
  var chaptersarc = rdfsvc.GetResource(Cx.NS_CX + "chapters");
  var prologuearc = rdfsvc.GetResource(Cx.NS_CX + "prologue");
  var resource = this.ds.GetTarget(this.docres, chaptersarc, true);
  if (! resource) {
    resource = rdfsvc.GetAnonymousResource();
    this.ds.Assert(this.docres, chaptersarc, resource, true);
  }
  var prologueres = this.ds.GetTarget(resource, prologuearc, true);
  if (! prologueres) {
    var prologueuri = this.docres.Value + "/prologue";
    prologueres = rdfsvc.GetResource(prologueuri);
    // Make sure this isn't already in use
    var arcs = this.ds.ArcLabelsIn(prologueres);
    while (arcs.hasMoreElements()) {
      prologueuri = this.docres.Value + "/" + generateID();
      prologueres = rdfsvc.GetResource(prologueuri);
      arcs = this.ds.ArcLabelsIn(prologueres);
    }
    this.ds.Assert(resource, prologuearc, prologueres, true);
  }
  this.prologue = new Chapter(this.ds, prologueres, doc.body, 0);

  this.chapterseq = new RDFSeq(this.ds, resource);
  this.refresh();
}


ChapterList.prototype = {
  notify: function (aMessage, aSubject) {
    getObserverService().notifyObservers(aSubject ? aSubject : this,
      aMessage, null);
  },


  // This rebuilds the chapter list based on the DOM. Existing Chapter objects
  // are not preserved by a refresh, they are recreated.
  refresh: function (aDoc) {
    var doc = this.editor.contentDocument;
    var xpath = new XPathEvaluator();
    var xset = xpath.evaluate("/html/body//h1", doc, null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    var seen = {};

    var chapters = new Array();
    var rdfsvc = getRDFService();
    var docres = this.docres;
    var index = 0;
    var invalidHeadings = new Array();

    // The underlying HTML editor
    var editor = this.editor.editor;

    for (var i = 0; i < xset.snapshotLength; ++i) {
      var heading = xset.snapshotItem(i);

      // Check for invisible headings that should be cleaned up
      if (heading.clientHeight == 0) {
        invalidHeadings.push(heading);
        continue;
      }

      var startid = heading.getAttribute("id");
      var id = startid;
      while (! id || id in seen)
        id = generateID();
      seen[id] = 1;
      if (id != startid)
        heading.setAttribute("id", id);

      var title = stringify(heading);

      var resuri = heading.getAttribute("res");
      // Make sure the resource belongs to this novel
      if (resuri && resuri.lastIndexOf(docres.Value, 0) != 0)
        resuri = null;
      var chapter = this.create(resuri, heading);
      chapter.title = title;
      chapter.ordinal = index + 1;
      chapters.push(chapter);

      var res = chapter.resource;
      if (resuri != res.Value)
        editor.setAttribute(heading, "res", res.Value);

      var oldIndex = this.chapterseq.indexOf(res);
      /*
       * Either oldIndex < 0 because it was not found, or oldIndex >= index
       * because all indices less than index already correspond to their
       * correct elements. Therefore, if 0 <= oldIndex <= index, then
       * oldIndex == index.
       */
      if (oldIndex > index) {
        this.chapterseq.remove(oldIndex);
        this.chapterseq.insert(res, index);
      }
      else if (oldIndex < 0) {
        this.chapterseq.insert(res, index);
      }

      ++index;
    }

    for (var i = 0; i < invalidHeadings.length; ++i) {
      var heading = invalidHeadings[i];
      heading.parentNode.removeChild(heading);
    }

    var count = chapters.length;
    var seqlen = this.chapterseq.length;
    while (seqlen > count)
      this.chapterseq.remove(--seqlen);

    this.chapters = chapters;
  },


  findByElement: function (aElement, outIndex) {
    if (! aElement)
      return null;

    if (aElement instanceof Components.interfaces.nsIDOMHTMLBodyElement)
      return this.prologue;

    for (var i = 0; i < this.chapters.length; ++i) {
      var chapter = this.chapters[i];
      if (chapter.element == aElement) {
        if (outIndex)
          outIndex.value = i;
        return chapter;
      }
    }
    return null;
  },


  findByResource: function (aResURI, outIndex) {
    if (! aResURI)
      return null;

    if (this.prologue.resource.Value == aResURI)
      return this.prologue;

    for (var i = 0; i < this.chapters.length; ++i) {
      var chapter = this.chapters[i];
      if (chapter.resource.Value == aResURI) {
        if (outIndex)
          outIndex.value = i;
        return chapter;
      }
    }
    return null;
  },


  findByID: function (aID, outIndex) {
    if (! aID)
      return null;

    for (var i = 0; i < this.chapters.length; ++i) {
      var chapter = this.chapters[i];
      if (chapter.element.id == aID) {
        if (outIndex)
          outIndex.value = i;
        return chapter;
      }
    }
    return null;
  },


  insert: function (aChapter, aIndex) {
    if (aIndex > this.chapters.length)
      aIndex = this.chapters.length;

    this.notify("chapter:willAdd", aChapter);

    this.chapters.splice(aIndex, 0, aChapter);
    this.chapterseq.insert(aChapter.resource, aIndex);
    for (var i = aIndex; i < this.chapters.length; ++i)
      this.chapters[i].ordinal = i + 1;

    this.notify("chapter:didAdd", aChapter);
  },


  append: function (aChapter) {
    this.insert(aChapter, this.chapters.length);
  },


  remove: function (aChapter) {
    for (var i = 0; i < this.chapters.length; ++i) {
      var chapter = this.chapters[i];
      if (chapter == aChapter) {
        this.removeAtIndex(i);
        break;
      }
    }
  },


  removeAtIndex: function (aIndex) {
    if (aIndex < this.chapters.length) {
      var chapter = this.chapters[aIndex];

      this.notify("chapter:willRemove", chapter);

      this.chapters.splice(aIndex, 1);
      this.chapterseq.remove(aIndex);
      for (var i = aIndex; i < this.chapters.length; ++i)
        this.chapters[i].ordinal = i + 1;

      this.notify("chapter:didRemove", chapter);
    }
  },


  indexOf: function (aChapter) {
    for (var i = 0; i < this.chapters.length; ++i) {
      if (aChapter.equals(this.chapters[i]))
        return i;
    }
    return -1;
  },


  chapterAtIndex: function (aIndex) {
    if (aIndex < 0 || aIndex >= this.chapters.length)
      return null;

    return this.chapters[aIndex];
  },


  // aRes is optional; it lets you resurrect a chapter by specifying
  // its resources, otherwise a new one will be created
  create: function (aRes, aElement) {
    if (! aElement)
      throw new Error("Can't create chapter without corresponding element");
    if (! aElement.id)
      throw new Error("Can't create chapter for element lacking an id");
    var rdfsvc = getRDFService();
    if (! aRes) {
      var resuri = this.docres.Value + "/" + aElement.id;
      aRes = rdfsvc.GetResource(resuri);
      // Make sure this isn't already in use
      var arcs = this.ds.ArcLabelsIn(aRes);
      while (arcs.hasMoreElements()) {
        resuri = this.docres.Value + "/" + generateID();
        aRes = rdfsvc.GetResource(resuri);
        arcs = this.ds.ArcLabelsIn(aRes);
      }
    }
    else if (typeof(aRes) == "string")
      aRes = rdfsvc.GetResource(aRes);

    return new Chapter(this.ds, aRes, aElement);
  }
};


/*
 * Creates a new chapter for a given element. If |aElementOffset| is given,
 * then |aElement| is the container element, and Chapter.element will return
 * the node at the given offset. This lets us have pseudo-headings like the
 * prologue, which always starts at the body's first child.
 */
function Chapter (aDS, aRes, aElement, aElementOffset) {
  if (! aElement)
    throw new Error("Can't create chapter without corresponding element");

  BreakdownUnit.call(this, aDS, aRes);

  this.setElement(aElement, aElementOffset);
}


Chapter.prototype = {
  __proto__: BreakdownUnit.prototype,


  equals: function (aChapter) {
    try {
      return this.resource.EqualsNode(aChapter.resource);
    }
    catch (ex) {
      return false;
    }
  },


  get element () {
    if (this._elementOffset !== undefined)
      return this._element.childNodes[this._elementOffset];
    else
      return this._element;
  },


  setElement: function (aElement, aElementOffset) {
    this._element = aElement;
    if (aElementOffset !== undefined && aElementOffset !== null)
      this._elementOffset = aElementOffset;
  },


  get domRange () {
    // Don't attempt to return a range for a deleted element (this can happen
    // during large updates to the content)
    if (! this.element.parentNode)
      return null;

    // We search from _element because the prologue is a special case, where
    // the element returned as the start of the prologue will actually be the
    // first chapter if there's no prologue content
    var xpath = new XPathEvaluator();
    var xset = xpath.evaluate("descendant::h1 | following::h1",
      this._element, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    var nextHeading = xset.singleNodeValue;

    var doc = this.element.ownerDocument;
    var range = doc.createRange();
    range.setStartBefore(this.element);

    if (nextHeading)
      range.setEndBefore(nextHeading);
    else
      range.setEndAfter(doc.body.lastChild);

    return range;
  }
};


var gController = {
  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsISupportsWeakReference) ||
        iid.equals(Components.interfaces.nsIController) ||
        iid.equals(Components.interfaces.nsIObserver) ||
        iid.equals(Components.interfaces.nsIDOMEventListener) ||
        iid.equals(Components.interfaces.nsIClipboardDragDropHooks))
      return this;
    else
      throw Components.results.NS_NOINTERFACE;
  },


  openwindows: { findreplace: null, spellcheck: null },


  paperSize: "USLetter",

  commands: {
    "cmd-align-center": 1,
    "cmd-align-justify": 1,
    "cmd-align-left": 1,
    "cmd-align-right": 1,
    "cmd-check-spelling": 1,
    "cmd-decrease-indent": 1,
    "cmd-export": 1,
    "cmd-find": 1,
    "cmd-find-again": 1,
    "cmd-find-previous": 1,
    "cmd-font-decrease": 1,
    "cmd-font-face": 1,
    "cmd-font-increase": 1,
    "cmd-font-size": 1,
    "cmd-heading-1": 1,
    "cmd-import": 1,
    "cmd-increase-indent": 1,
    "cmd-lowercase": 1,
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1,
    "cmd-replace": 1,
    "cmd-toggle-ol": 1,
    "cmd-toggle-breakdown": 1,
    "cmd-toggle-sidebar": 1,
    "cmd-toggle-ul": 1,
    "cmd-treeitem-delete": 1,
    "cmd-treeitem-goto": 1,
    "cmd-uppercase": 1,
    "cmd-get-modcount": 1
  },

  _suppressMutationEvents: false,


  get activeController () {
    var selectedCard = document.getElementById("editordeck").selectedPanel;
    switch (selectedCard.id) {
      case "indexcard":
        return gCardController;
      case "titlecard":
        return gTitleController;
      default:
        return this;
    }
  },


  supportsCommand: function (cmd) {
    return this.commands[cmd] == 1 ||
           gCardController.supportsCommand(cmd) ||
           gTitleController.supportsCommand(cmd);
  },


  isCommandEnabled: function (cmd) {
    var ctrl = this.activeController;
    if (ctrl != this)
      return ctrl.isCommandEnabled(cmd);

    switch (cmd) {
      case "cmd-print-preview":
        return ! gWindow.inPrintPreview;
      case "cmd-lowercase":
      case "cmd-uppercase":
        return this.editor.editor.canCopy();
      case "cmd-find-again":
      case "cmd-find-previous":
        /*
         * We don't update the command anywhere, and we're not monitoring
         * the operating system's global find clipboard, so might as well
         * leave this always enabled.
        var find = this.editor.editorElement.webBrowserFind;
        return find.searchString && find.searchString != "";
         */
         return true;
      default:
        return this.commands[cmd] == 1;
    }
  },


  doCommand: function (cmd) {
    var ctrl = this.activeController;
    if (ctrl != this)
      return ctrl.doCommand(cmd);

    switch (cmd) {
      case "cmd-toggle-breakdown":
        this.cmdToggleBreakdown();
        break;
      case "cmd-toggle-sidebar":
        this.sidebarController.sidebar.collapsed ^= true;
        this.updateSidebarStatus();
        break;
      case "cmd_bold":
      case "cmd_italic":
      case "cmd_underline":
      case "cmd_strikethrough":
        goDoCommand(cmd);
        this.updateStyleStates();
        break;
      case "cmd-heading-1":
        this.editor.toggleHeading1();
        break;
      case "cmd-uppercase":
        this.editor.setSelectionToUpperCase();
        break;
      case "cmd-lowercase":
        this.editor.setSelectionToLowerCase();
        break;
      case "cmd-toggle-ol":
        this.editor.toggleOrderedList();
        break;
      case "cmd-toggle-ul":
        this.editor.toggleUnorderedList();
        break;
      case "cmd-decrease-indent":
        this.editor.decreaseIndentLevel();
        break;
      case "cmd-increase-indent":
        this.editor.increaseIndentLevel();
        break;
      case "cmd-align-center":
      case "cmd-align-justify":
      case "cmd-align-left":
      case "cmd-align-right":
        var alignment = cmd.substring(10);
        this.editor.setAlignment(alignment);
        break;
      case "cmd-check-spelling":
        this.checkSpelling();
        break;
      case "cmd-find":
      case "cmd-replace":
        this.cmdFindReplace(cmd == "cmd-replace");
        break;
      case "cmd-find-again":
      case "cmd-find-previous":
        this.cmdFindAgain(cmd);
        break;
      case "cmd-font-face":
        this.cmdFontFace();
        break;
      case "cmd-font-size":
        this.cmdFontSize();
        break;
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        this.setPaperSizeFromPrefs();
        break;
      case "cmd-print":
        gApp.resetPrintingPrefs(true); // Show page numbers
        gApp.setPrintMargins(0.75, 0.75, 0.75, 0.75);
        PrintUtils.print();
        break;
      case "cmd-print-preview":
        gApp.resetPrintingPrefs(true);
        gApp.setPrintMargins(0.75, 0.75, 0.75, 0.75);
        PrintUtils.printPreview(onEnterPrintPreview, onExitPrintPreview);
        break;
      case "cmd-export":
        this.cmdExport();
        break;
      case "cmd-import":
        this.cmdImport();
        break;
      case "cmd-treeitem-delete":
        this.cmdTreeitemDelete();
        break;
      case "cmd-treeitem-goto":
        this.cmdTreeitemGoto();
        break;
      default:
        dump("*** Failed to perform command: " + cmd + "\n");
    }

    // Restore focus, except for these:
    switch (cmd) {
      case "cmd-check-spelling":
      case "cmd-find":
      case "cmd-replace":
        ;
      default:
        this.editor.contentWindow.focus();
    }
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);
    top.goUpdateCommand("cmd-print");
    top.goUpdateCommand("cmd-print-preview");
    top.goUpdateCommand("cmd-page-setup");
  },


  observe: function (aSubject, aTopic, aData) {
    if (aTopic == "nsPref:changed") {
      if (aData == "celtx.script.breakdown.visible")
        this.showBreakdownChanged();
    }
    else if (topic == "celtx:project-saved" && ! this.project.standalone) {
      hideScriptOnlyMessage();
      getObserverService().removeObserver(this, "celtx:project-saved");
      this.observingSaves = false;
    }
  },


  _modified: false,


  get modified () {
    return this._modified || this.editor.editor.getModificationCount() > 0 ||
           gTitleController.modified || gCardController.modified;
  },


  // nsITransactionListener implementation
  didBeginBatch: function (mgr, result) {},

  didDo: function (mgr, tx, result) {
    top.goUpdateUndoEditMenuItems();
  },

  didEndBatch: function (mgr, result) {
    top.goUpdateUndoEditMenuItems();
  },

  didMerge: function (mgr, toptx, mergetx, didMerge, result) {
    top.goUpdateUndoEditMenuItems();
  },

  didRedo: function (mgr, tx, result) {
    top.goUpdateUndoEditMenuItems();
  },

  didUndo: function (mgr, tx, result) {
    top.goUpdateUndoEditMenuItems();
  },

  willBeginBatch: function (mgr) {},
  willDo: function (mgr, tx) {},
  willEndBatch: function (mgr) {},
  willMerge: function (mgr, toptx, mergetx) {},
  willRedo: function (mgr, tx) {},
  willUndo: function (mgr, tx) {},


  handleEvent: function handleEvent (aEvent) {
    switch (aEvent.type) {
      case "scriptload":
        this.scriptLoaded(aEvent);
        break;
      case "scriptwillload":
        this.scriptWillLoad(aEvent);
        break;
      case "formatchanged":
        this.updateStyleStates();
        this.updateSidebar();
        break;
      case "click":
        this.editorClicked(aEvent);
        break;
      case "dblclick":
        this.editorDoubleClicked(aEvent);
        break;
      case "DOMNodeInserted":
        this.onDOMNodeInserted(aEvent);
        break;
      case "DOMNodeRemoved":
        this.onDOMNodeRemoved(aEvent);
        break;
      case "DOMCharacterDataModified":
        this.onDOMCharacterDataModified(aEvent);
        break;
    }
  },


  scriptLoaded: function (aEvent) {
    this.editor.removeEventListener("scriptload", this, false);
    this._loaded = true;
    this.setPaperSizeFromPrefs();
    this.restoreZoomLevel();
    var ps = getPrefService().getBranch("celtx.spelling.");
    InlineSpellChecker.Init(this.editor.editor,
      ps.getBoolPref("inline"));
    // this.updatePageConfig();
    var doc = this.editor.contentDocument;
    this.chapterList = new ChapterList(this);
    this.editor.editor.transactionManager.AddListener(this);
    this.editor.addEventListener("formatchanged", this, false);
    var body = doc.body;
    body.addEventListener("click", this, false);
    body.addEventListener("dblclick", this, false);
    body.addEventListener("DOMNodeInserted", this, false);
    body.addEventListener("DOMNodeRemoved", this, false);
    body.addEventListener("DOMCharacterDataModified", this, false);

    this.outlineView.init(this.chapterList);

    gCardController.init(this);
    gTitleController.init(this);

    var sidebar = document.getElementById("sidebar");
    this.sidebarController = new SidebarController(sidebar, this);
    this.updateSidebar();
    this.restoreSidebarState();

    try {
      this.restoreCursorLocation();
      this.editor.focus();
      this.editor.contentWindow.focus();
    }
    catch (ex) {
      dump("*** outliner.restoreCursorLocation: " + ex + "\n");
    }

    if (this.project.standalone && this.project.scriptURI == this.docres.Value) {
      document.getElementById("scriptOnlyMessage").collapsed = false;
      getObserverService().addObserver(this, "celtx:project-saved", false);
      this.observingSaves = true;
    }
  },


  scriptWillLoad: function (aEvent) {
    this.editor.addEventListener("scriptload", this, false);

    if (! this._loaded)
      return;

    try {
      InlineSpellChecker.shutdown();
    }
    catch (ex) {
      dump("*** InlineSpellChecker.shutdown: " + ex + "\n");
    }

    try {
      this.editor.editor.transactionManager.RemoveListener(this);
    }
    catch (ex) {
      dump("*** transactionManager.RemoveListener: " + ex + "\n");
    }

    try {
      this.editor.removeEventListener("formatchanged", this, false);
    }
    catch (ex) {
      dump("*** editor.removeEventListener: " + ex + "\n");
    }

    try {
      var body = this.editor.contentDocument.body;
      body.removeEventListener("click", this, false);
      body.removeEventListener("dblclick", this, false);
      body.removeEventListener("DOMNodeInserted", this, false);
      body.removeEventListener("DOMNodeRemoved", this, false);
      body.removeEventListener("DOMCharacterDataModified", this, false);
    }
    catch (ex) {
      dump("*** body.removeEventListener: " + ex + "\n");
    }

    try {
      this.outlineView.shutdown();
    }
    catch (ex) {
      dump("*** outlineView.shutdown: " + ex + "\n");
    }

    try {
      gCardController.shutdown();
    }
    catch (ex) {
      dump("*** gCardController.shutdown: " + ex + "\n");
    }

    try {
      gTitleController.shutdown();
    }
    catch (ex) {
      dump("*** gTitleController.shutdown: " + ex + "\n");
    }

    try {
      this.saveSidebarState();
    }
    catch (ex) {
      dump("*** saveSidebarState: " + ex + "\n");
    }

    try {
      // We don't want to restore a cursor location that no longer exists
      // after a new document is loaded
      this.forgetCursorLocation();
    }
    catch (ex) {
      dump("*** forgetCursorLocation: " + ex + "\n");
    }
  },


  updateSidebarStatus: function () {
    var sidebar = document.getElementById("sidebar");
    var menuitem = top.document.getElementById("menu-toggle-sidebar");
    var toolbaritem = document.getElementById("outline-sidebar-button");
    if (menuitem)
      menuitem.setAttribute("checked", ! sidebar.collapsed)
    if (toolbaritem)
      toolbaritem.setAttribute("checked", ! sidebar.collapsed);
  },


  saveSidebarState: function () {
    var sidebar = document.getElementById("sidebar");
    var rdfsvc = getRDFService();
    var sidebararc = rdfsvc.GetResource(Cx.NS_CX + "sidebarvisible");
    var ds = this.document.project.ds;
    var item = this.sidebarController.selectedTab.value;
    var state = sidebar.collapsed ? "close" : item;
    setRDFString(ds, this.document.resource, sidebararc, state);
  },


  restoreSidebarState: function () {
    var sidebar = document.getElementById("sidebar");
    var rdfsvc = getRDFService();
    var sidebararc = rdfsvc.GetResource(Cx.NS_CX + "sidebarvisible");
    var ds = this.document.project.ds;
    var state = getRDFString(ds, this.document.resource, sidebararc);
    // Closed by default
    if (! state || state == "close") {
      sidebar.collapsed = true;
    }
    else {
      sidebar.collapsed = false;
      this.sidebarController.showSidebarItemById(state);
    }
    this.updateSidebarStatus();
  },


  saveCursorLocation: function () {
    // Save the cursor position, preferably right down to its #TEXT offset
    var focusNode = this.editor.selection.focusNode;
    var focusOffset = this.editor.selection.focusOffset;
    var pos = null;
    if (focusNode instanceof Components.interfaces.nsIDOMText) {
      var parent = focusNode.parentNode;
      var siblings = parent.childNodes;
      for (var i = 0; i < siblings.length; i++) {
        if (focusNode == siblings[i]) {
          pos = xpathForNode(parent) + "," + i + "," + focusOffset;
          break;
        }
      }
    }
    else {
      var pos = xpathForNode(focusNode);
    }
    var pref = getPrefService().getBranch("celtx.project.");
    var docid = this.docres.Value.replace(/^.*\//, "");
    pref.setCharPref(this.project.id + "." + docid + ".cursor", pos);
  },


  forgetCursorLocation: function () {
    var pref = getPrefService().getBranch("celtx.project.");
    var docid = this.docres.Value.replace(/^.*\//, "");
    var prefname = this.project.id + "." + docid + ".cursor";
    if (pref.prefHasUserValue(prefname))
      pref.clearUserPref(prefname);
  },


  restoreCursorLocation: function restoreCursorLocation () {
    var pref = getPrefService().getBranch("celtx.project.");
    try {
      var docid = this.docres.Value.replace(/^.*\//, "");
      var prefname = this.document.project.id + "." + docid + ".cursor";
      if (! pref.prefHasUserValue(prefname))
        return;
      var pos = pref.getCharPref(prefname);
      if (! pos)
        throw "No saved position";
      var posbits = pos.split(",");
      if (posbits.length == 3) {
        pos = posbits[0];
        var xpe = new XPathEvaluator();
        var block = xpe.evaluate(pos, this.editor.contentDocument, null,
                                 XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (! block.singleNodeValue)
          throw new Error("Unable to locate last cursor position: " + pos);
        var focusNode = block.singleNodeValue.childNodes[Number(posbits[1])];
        var focusOffset = Number(posbits[2]);
        while (focusNode.nodeType != Node.TEXT_NODE)
          focusNode = focusNode.nextSibling;
        if (! focusNode)
          throw new Error("Couldn't find the right text node");
        if (focusOffset > focusNode.nodeValue.length)
          focusOffset = focusNode.nodeValue.length;
        var sel = this.editor.selection;
        sel.removeAllRanges();
        var range = this.editor.contentDocument.createRange();
        range.setStart(focusNode, focusOffset);
        range.setEnd(focusNode, focusOffset);
        sel.addRange(range);
      }
      else {
        var xpe = new XPathEvaluator();
        var block = xpe.evaluate(pos, this.editor.contentDocument, null,
                                 XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (! block.singleNodeValue)
          throw "Unable to locate last cursor position";
        var sel = this.editor.selection;
        sel.removeAllRanges();
        sel.selectAllChildren(block.singleNodeValue);
        sel.collapseToEnd();
      }
    }
    catch (ex) {
      dump("*** " + ex + "\n");
    }
    try {
      var selCtrl = this.editor.editor.selectionController;
      selCtrl.scrollSelectionIntoView(1, 1, true);
    }
    catch (ex) {
      // I've had this throw before
      dump("*** scrollSelectionIntoView: " + ex + "\n");
    }
  },


  showBreakdownChanged: function () {
    var prefs = getPrefService().getBranch("celtx.script.breakdown.");
    var visible = prefs.getBoolPref("visible");
    var menuitem = top.document.getElementById("menu-toggle-breakdown");
    if (menuitem)
      menuitem.setAttribute("checked", visible);
  },


  setShowBreakdown: function (aVisible) {
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
      .getService(Components.interfaces.nsIStyleSheetService);
    var ios = getIOService();
    var uri = ios.newURI(Cx.CONTENT_PATH + "editors/breakdownhide.css",
      null, null);

    // Changing state if visible XNOR registered
    if (aVisible == sss.sheetRegistered(uri, sss.USER_SHEET)) {
      if (aVisible)
        sss.unregisterSheet(uri, sss.USER_SHEET);
      else
        sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
    }
  },


  cmdToggleBreakdown: function () {
    var prefs = getPrefService().getBranch("celtx.script.breakdown.");
    var visible = prefs.getBoolPref("visible");
    this.setShowBreakdown(! visible);
    prefs.setBoolPref("visible", ! visible);
  },


  breakdownUnitContainingNode: function (aNode) {
    if (! aNode)
      return null;

    var IHeading = Components.interfaces.nsIDOMHTMLHeadingElement;
    var IBody = Components.interfaces.nsIDOMHTMLBodyElement;

    // We use the body as a start point for the prologue, but it's never
    // a content node
    if (aNode instanceof IBody)
      return null;

    var iter = Components.classes["@celtx.com/dom/iterator;1"]
      .createInstance(Components.interfaces.celtxINodeIterator);
    iter.init(aNode, null);
    var node = aNode;
    while (node && ! (node instanceof IHeading || node instanceof IBody))
      node = iter.previousNode();

    return node ? this.chapterList.findByElement(node) : null;
  },


  breakdownUnitContainingSelection: function (aSelection) {
    // Start at the node prior to the current node, if possible
    var node = aSelection.anchorNode;
    if (node.hasChildNodes()) {
      var offset = aSelection.anchorOffset;
      if (offset >= node.childNodes.length)
        --offset;
      if (offset >= 0)
        node = node.childNodes[offset];
    }
    return this.breakdownUnitContainingNode(node);
  },


  get selectedBreakdownUnit () {
    return this.breakdownUnitContainingSelection(this.editor.selection);
  },


  getBreakdownContexts: function () {
    var contexts = Components.classes["@mozilla.org/array;1"]
      .createInstance(Components.interfaces.nsIMutableArray);
    var chapters = this.chapterList.chapters;
    for (var i = 0; i < chapters.length; ++i)
      contexts.appendElement(chapters[i], false);
    return contexts;
  },


  willDeleteContext: function (aContext) {
    this._suppressMutationEvents = true;
    this.sidebarController.willDeleteContext(aContext);
  },


  didDeleteContext: function (aContext) {
    this.sidebarController.didDeleteContext(aContext);
    this._suppressMutationEvents = false;
    this.scheduleHeadingForUpdate(aContext.element, "removed");
  },


  willMoveContext: function (aContext) {
    this._suppressMutationEvents = true;
    InlineSpellChecker.shutdown();
    this.sidebarController.willMoveContext(aContext);
  },


  didMoveContext: function (aContext) {
    this.sidebarController.didMoveContext(aContext);
    this._suppressMutationEvents = false;
    var ps = getPrefService().getBranch("celtx.spelling.");
    InlineSpellChecker.Init(this.editor.editor,
      ps.getBoolPref("inline"));
    this.scheduleHeadingForUpdate(aContext.element, "moved");
  },


  onDOMNodeInserted: function (aEvent) {
    if (this._suppressMutationEvents)
      return;

    var node = aEvent.target;
    var IHeading = Components.interfaces.nsIDOMHTMLHeadingElement;
    if (node instanceof IHeading) {
      this.didAddHeading(aEvent.target);
    }
    else {
      var parent = node.parentNode;
      while (parent) {
        if (parent instanceof IHeading) {
          this.headingTitleChanged(parent);
          break;
        }
        parent = parent.parentNode;
      }
    }
  },


  onDOMNodeRemoved: function (aEvent) {
    if (this._suppressMutationEvents)
      return;

    var node = aEvent.target;
    var IHeading = Components.interfaces.nsIDOMHTMLHeadingElement;
    if (node instanceof IHeading) {
      this.willRemoveHeading(aEvent.target);
    }
    else {
      var parent = node.parentNode;
      while (parent) {
        if (parent instanceof IHeading) {
          this.headingTitleChanged(parent);
          break;
        }
        parent = parent.parentNode;
      }
    }
  },


  onDOMCharacterDataModified: function (aEvent) {
    if (this._suppressMutationEvents)
      return;

    var textnode = aEvent.target;
    var xpath = new XPathEvaluator();
    var xset = xpath.evaluate("ancestor-or-self::h1", textnode.parentNode,
      null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    if (xset.singleNodeValue)
      this.headingTitleChanged(xset.singleNodeValue);
    else
      this.textContentChanged(textnode);
  },


  updateTimer: null,


  /*
   * Fill with objects of the form:
   * {
   *   heading: <element>,
   *   modified: <boolean>,
   *   disposition: null | "added" | "removed" | "moved"
   * }
   */
  alteredHeadings: new Array(),


  // aReason: "added" | "removed" | "updated"
  scheduleHeadingForUpdate: function (aHeading, aReason) {
    if (this.updateTimer)
      clearTimeout(this.updateTimer);

    var self = this;
    this.updateTimer = setTimeout(function () {
      self.performHeadingUpdate();
    }, 500);

    // Changes to heading text are treated separately from addition/removal
    if (aReason == "updated") {
      var item = null;
      for (var i = 0; i < this.alteredHeadings.length; ++i) {
        if (this.alteredHeadings[i].heading == aHeading) {
          item = this.alteredHeadings[i];
          break;
        }
      }

      if (item) {
        item.modified = true;
      }
      else {
        this.alteredHeadings.push({
          heading: aHeading,
          modified: true,
          disposition: null
        });
      }

      return;
    }

    /*
     * Here are the symbols representing the possible states:
     *   O - No change (i.e., not being tracked)
     *   A - Added
     *   R - Removed
     *   M - Moved
     *   ? - Invalid (i.e., should never happen)
     *
     * Given A and R as possible inputs, here is the transition chart:
     *    | A | R |
     * ---+---+---+
     *  O | A | R |
     *  A | ? | O |
     *  R | M | ? |
     *  M | ? | R |
     * ---'---'---'
     *
     * Invalid states result from non-sensical inputs, like removing a
     * heading that has already been removed.
     */
    var item = null;
    var index = -1;
    for (var i = 0; i < this.alteredHeadings.length; ++i) {
      if (this.alteredHeadings[i].heading == aHeading) {
        item = this.alteredHeadings[i];
        index = i;
        break;
      }
    }

    // The first line of the transition chart
    if (! item) {
      this.alteredHeadings.push({
        heading: aHeading,
        modified: false,
        disposition: aReason
      });
      return;
    }

    if (aReason == "added") {
      if (! item.disposition)
        item.disposition = "added";
      else if (item.disposition == "removed")
        item.disposition = "moved";
    }
    else if (aReason == "removed") {
      if (item.disposition == "added")
        this.alteredHeadings.splice(index, 1);
      else if (! item.disposition || item.disposition == "moved")
        item.disposition = "removed";
    }
  },


  forceHeadingUpdate: function () {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    this.performHeadingUpdate();
  },


  /*
   * When a heading is added, we need to iterate through large portions of
   * the document to determine its position, so it's possible that when a
   * heading is added, it's no less efficient to just rebuild the whole thing,
   * preserving existing chapter objects when possible.
   */
  performHeadingUpdate: function () {
    this.updateTimer = null;

    /*
     * Two passes:
     *
     * 1. Remove any headings that have been marked "moved" or "removed",
     *    and updating any modified headings not marked "removed" or "added"
     * 2. Sort any headings that have been marked "moved" or "added" and
     *    insert them in ascending order
     */

    // During the passes, we also collect any headings that are invisible,
    // so they can be cleaned up. These can happen as a result of copying
    // and pasting.
    this.invalidHeadings = new Array();

    try {
      for (var i = 0; i < this.alteredHeadings.length; ++i) {
        var item = this.alteredHeadings[i];
        if (item.modified) {
          if (item.disposition != "added" && item.disposition != "removed")
            this.processUpdatedHeading(item.heading);
        }

        if (item.disposition == "removed" || item.disposition == "moved")
          this.processRemovedHeading(item.heading);
      }
    }
    catch (ex) {
      dump("*** performHeadingUpdate: " + ex + "\n");
    }

    try {
      var added = new Array();
      var xpath = new XPathEvaluator();
      var body = this.editor.contentDocument.body;
      var xset = xpath.evaluate("//h1", body, null,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
      var heading;
      var index = -1;
      while ((heading = xset.iterateNext()) != null) {
        ++index;
        for (var i = 0; i < this.alteredHeadings.length; ++i) {
          var item = this.alteredHeadings[i];
          if (item.heading == heading) {
            if (item.disposition == "added" || item.disposition == "moved") {
              item.index = index;
              added.push(item);
            }
            break;
          }
        }
      }

      for (var i = 0; i < added.length; ++i)
        this.processAddedHeading(added[i].heading, added[i].index);
    }
    catch (ex) {
      dump("*** performHeadingUpdate: " + ex + "\n");
    }

    this.alteredHeadings = new Array();

    // Make sure this happens after resetting the alteredHeadings array,
    // or these won't get flagged for removal from the chapter list
    var foundInvalid = this.invalidHeadings.length > 0;
    for (var i = 0; i < this.invalidHeadings.length; ++i) {
      var heading = this.invalidHeadings[i];
      heading.parentNode.removeChild(heading);
    }
    this.invalidHeadings = null;
    // Don't wait to update the chapter list
    if (foundInvalid)
      this.forceHeadingUpdate();
  },


  didAddHeading: function (aHeading) {
    /*
     * When you type Enter at the end of a heading, it triggers an element
     * split, the same as if you had typed Enter somewhere in the middle.
     * A split preserves identity for the right part and creates a new
     * element for the left part. Really, we want the left part to preserve
     * the identity and the right part to become a new element.
     */
    var next = aHeading.nextSibling;
    if (next instanceof Components.interfaces.nsIDOMHTMLHeadingElement) {
      if (next.getAttribute("id") == aHeading.getAttribute("id") &&
          next.getAttribute("res") == aHeading.getAttribute("res")) {
        var chapter = this.chapterList.findByElement(next);
        if (chapter) {
          chapter.setElement(aHeading);
          next.removeAttribute("id");
          next.removeAttribute("res");
          this.didAddHeading(next);
          return;
        }
      }
    }

    this.scheduleHeadingForUpdate(aHeading, "added");
  },


  processAddedHeading: function (aHeading, aIndex) {
    // Check for invalid headings
    if (aHeading.clientHeight == 0) {
      this.invalidHeadings.push(aHeading);
      return;
    }
    /*
     * If a heading has an associated resource, it might be because the
     * heading was copied and pasted, or moved, within the document. We
     * want to reuse the resource (and retain its associated information)
     * only if both these circumstances hold:
     *
     *   1. The resource is not already in use by another chapter
     *   2. The resource is identifiable as belonging to this novel
     *
     * The first is easy, we just search the chapter list by resource. The
     * second involves making sure the RDF URI includes the novel's RDF URI
     * as a prefix.
     */
    var id = aHeading.getAttribute("id");
    while (! id || this.chapterList.findByID(id))
      id = generateID();
    aHeading.setAttribute("id", id);

    var res = aHeading.getAttribute("res");
    if (res) {
      // Make sure the resource belongs to this novel
      if (res.lastIndexOf(this.document.resource.Value, 0) != 0)
        res = null;
      // Make sure it's not already in use
      else if (this.chapterList.findByResource(res))
        res = null;
    }

    var chapter = this.chapterList.create(res, aHeading);
    chapter.suspendNotifications();
    try {
      chapter.title = stringify(aHeading);
      aHeading.setAttribute("res", chapter.resource.Value);

      var index = aIndex;
      if (! index) {
        var xpath = new XPathEvaluator();
        var xresult = xpath.evaluate("count(preceding-sibling::h1)", aHeading,
          null, XPathResult.NUMBER_TYPE, null);
        index = xresult.numberValue;
      }
      this.chapterList.insert(chapter, index);
    }
    catch (ex) {
      throw ex;
    }
    finally {
      chapter.resumeNotifications();
    }
  },


  willRemoveHeading: function (aHeading) {
    this.scheduleHeadingForUpdate(aHeading, "removed");
  },


  processRemovedHeading: function (aHeading) {
    var chapter = this.chapterList.findByElement(aHeading);
    if (chapter)
      this.chapterList.remove(chapter);
  },


  headingTitleChanged: function (aHeading) {
    this.scheduleHeadingForUpdate(aHeading, "updated");
  },


  processUpdatedHeading: function (aHeading) {
    // Check for invalid headings
    if (aHeading.clientHeight == 0) {
      this.invalidHeadings.push(aHeading);
      return;
    }
    var chapter = this.chapterList.findByElement(aHeading);
    if (chapter)
      chapter.title = stringify(aHeading);
    else
      dump("*** Unable to find chapter for heading " + aHeading
        + " (" + stringify(aHeading) + ")\n");
  },


  textContentChanged: function (aNode) {
    // Find the heading that precedes (i.e., "contains") aNode

    /*
     * We could use an XPathEvaluator, except the editor likes to make empty
     * text nodes and an empty text node isn't permitted as the context node.
     */
    var IHeading = Components.interfaces.nsIDOMHTMLHeadingElement;
    var iter = new NodeIterator(aNode);
    var heading = iter.previousNode();
    while (heading && ! (heading instanceof IHeading))
      heading = iter.previousNode();

    var chapter = this.chapterList.findByElement(heading);
    if (chapter)
      getObserverService().notifyObservers(chapter,
        "didChangeChapterContent", null);
  },


  updatePageConfig: function updatePageConfig () {
    var head = this.editor.contentDocument.documentElement.firstChild;

    var styles = head.getElementsByTagName("style");
    var pagestyle = null;
    for (var i = 0; i < styles.length; ++i) {
      if (styles[i].getAttribute("title") == "pagestyle") {
        pagestyle = styles[i];
        break;
      }
    }
    if (! pagestyle) {
      pagestyle = this.editor.contentDocument.createElement("style");
      pagestyle.type = "text/css";
      pagestyle.setAttribute("title", "pagestyle");
      this.editor.contentDocument.documentElement.firstChild
        .appendChild(pagestyle);
    }
    // Set the contents
    var viewer = this.editor.editorElement.docShell.contentViewer
      .QueryInterface(Components.interfaces.nsIMarkupDocumentViewer);
    var width = this.paperSize == "USLetter" ? 500 : 483;
    var pwidth = this.paperSize == "USLetter" ? 7.5 : 7.26;
    width = Math.ceil(width * viewer.textZoom);
    var str = "\n@media screen { body {\n  width: " + width + "pt;\n} }\n\n";;
    var textnode = this.editor.contentDocument.createTextNode(str);
    if (pagestyle.hasChildNodes())
      pagestyle.replaceChild(textnode, pagestyle.firstChild);
    else
      pagestyle.appendChild(textnode);

    // Add editor.css if it's not already there
    var links = head.getElementsByTagName("link");
    var editorlink = null;
    for (var i = 0; i < links.length; ++i) {
      if (links[i].id == "editorstylesheet") {
        editorlink = links[i];
        break;
      }
    }
    if (! editorlink) {
      editorlink = this.editor.contentDocument.createElement("link");
      editorlink.setAttribute("id", "editorstylesheet");
      editorlink.setAttribute("rel", "stylesheet");
      editorlink.setAttribute("type", "text/css");
      editorlink.setAttribute("href", Cx.CONTENT_PATH + "editor.css");
      head.appendChild(editorlink);
    }
  },


  updateStyleStates: function updateStyleStates () {
    var mixed = { value: false };
    var first = { value: false };
    var any = { value: false };
    var all = { value: false };
    var fontAtom = getAtom("font");
    // Font face
    var face = this.editor.editor.getFontFaceState(mixed);
    if (! mixed.value) {
      if (! face) {
        /*
         * getFontFaceState is unreliable for empty lines, and
         * getInlinePropertyWithAttrValue isn't any better, so fall back
         * on extracting the computed CSS style
         */
        var anchor = this.editor.selection.anchorNode;
        while (anchor && anchor.nodeType != Node.ELEMENT_NODE)
          anchor = anchor.parentNode;
        // Shouldn't ever happen, but what the heck
        if (! anchor)
          anchor = this.editor.contentDocument.body;
        var fontface = anchor.style.getPropertyValue("font-family");
        face = fontface || kDefaultFontName;
      }
      var facemenu = document.getElementById("fontFaceMenu");
      var menuitem = getItemByValue(facemenu, face);
      if (menuitem)
        facemenu.selectedItem = menuitem;
      else
        dump("*** couldn't find menu item for " + face + "\n");
    }
    // Font size
    /*
    var size = this.editor.editor.getInlinePropertyWithAttrValue(fontAtom,
      "size", null, first, any, all);
    if (size && all.value) {
      var sizemenu = document.getElementById("fontSizeMenu");
      var menuitem = getItemByValue(sizemenu, size);
      if (menuitem)
        sizemenu.selectedItem = menuitem;
    }
    */
    // Font colour
    var colour = this.editor.editor.getFontColorState(mixed);
    if (! mixed.value) {
      if (! colour)
        colour = "rgb(0, 0, 0)";
      document.getElementById("fontColourPicker").color = colour;
    }

    var format = this.editor.editor.getParagraphState(mixed);
    var autobold = (format == "h1");

    // Bold
    // Italic
    // Underline
    var styles = [ "bold", "italic", "underline", "strikethrough" ];
    try {
      for (var i = 0; i < styles.length; ++i) {
        var style = styles[i];
        var cmdParams = Components.classes[
          "@mozilla.org/embedcomp/command-params;1"]
          .createInstance(Components.interfaces.nsICommandParams);
        var dispatcher = document.commandDispatcher;
        var cmd = 'cmd_' + style;
        var ctl = dispatcher.getControllerForCommand(cmd);
        if (ctl && ctl.isCommandEnabled(cmd) &&
          (ctl instanceof Components.interfaces.nsICommandController)) {
          ctl.getCommandStateWithParams(cmd, cmdParams);
          if (cmdParams.getBooleanValue("state_all") &&
              (style != "bold" || ! autobold))
            document.getElementById(cmd).setAttribute("state", "true");
          else
            document.getElementById(cmd).setAttribute("state", "false");
        }
      }
    }
    catch (ex) {
      dump("*** updateStyleStates: " + ex + "\n");
    }
  },


  updateSidebar: function () {
    var chapter = this.selectedBreakdownUnit;
    if (chapter)
      this.sidebarController.contextChanged(chapter);
  },


  editorClicked: function (aEvent) {
    try {
      /*
       * Don't use the target of the click event! If a text node is clicked,
       * the target of the click is the text node's parent, so text nodes at
       * the body level will report the body as the click target.
       */
      var chapter = this.selectedBreakdownUnit;
      if (chapter)
        this.sidebarController.contextChanged(chapter);

      this.editor.contentWindow.focus();
    }
    catch (ex) {
      dump("*** editorClicked: " + ex + "\n");
    }
  },


  editorDoubleClicked: function (aEvent) {
    var target = aEvent.target;
    if (target.localName.toLowerCase() != "span")
      return;

    if (target.className == "note")
      this.sidebarController.showSidebarItemByName("notes");
    else if (target.className == "media")
      this.sidebarController.showSidebarItemByName("media");
    else if (target.hasAttribute("ref"))
      this.sidebarController.showSidebarItemByName("breakdown");
    else
      return;

    this.sidebarController.sidebar.collapsed = false;
    this.updateSidebarStatus();
  },


  onContextShowing: function onContextShowing (popup) {
    // if we have a mispelled word, show spellchecker context
    // menuitems as well as the usual context menu
    var spellCheckNoSuggestionsItem = document.getElementById(
      "spellCheckNoSuggestions");
    var word;
    var misspelledWordStatus = InlineSpellChecker.updateSuggestionsMenu(
      document.getElementById("outliner-context"),
      spellCheckNoSuggestionsItem, word);

    var hideSpellingItems = (misspelledWordStatus == kSpellNoMispelling);
    spellCheckNoSuggestionsItem.hidden = hideSpellingItems ||
      misspelledWordStatus != kSpellNoSuggestionsFound;
    document.getElementById('spellCheckAddToDictionary').hidden =
      hideSpellingItems;
    document.getElementById('spellCheckIgnoreWord').hidden = hideSpellingItems;
    document.getElementById('spellCheckAddSep').hidden = hideSpellingItems;
    document.getElementById('spellCheckSuggestionsSeparator').hidden =
      hideSpellingItems;

    goUpdateGlobalEditMenuItems();

    var countsep = document.getElementById("wordCountSep");
    var countitem = document.getElementById("wordCountItem");
    if (this.editor.selection.isCollapsed) {
      countsep.hidden = true;
      countitem.hidden = true;
    }
    else {
      countsep.hidden = false;
      var pted = this.editor.editor.QueryInterface(
        Components.interfaces.nsIPlaintextEditor);
      countitem.label = gApp.getText("WordsSelectedCount",
        [ pted.getSelectionWordCount(this.editor.selection) ]);
      countitem.hidden = false;
    }
  },


  open: function open (project, docres) {
    this.project = project;
    this.docres = docres;
    this.document = new CeltxDocument();
    this.document.init(project, docres);

    var ps = getPrefService().QueryInterface(
      Components.interfaces.nsIPrefBranch2);
    ps.addObserver("celtx.script.breakdown.", this, false);
    // It will get updated at the focus event, because the tool-specific
    // menu isn't in the menu bar until the tab gets focused

    var file = this.project.fileForResource(docres);
    
    this.editor.addEventListener("scriptwillload", this, false);
    if (isReadableFile(file)) {
      this.editor.load(fileToFileURL(file));
    }
    else {
      var rdfsvc = getRDFService();
      var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
      var doctype = this.project.ds.GetTarget(this.docres, doctypearc, true);
      doctype = doctype.QueryInterface(Components.interfaces.nsIRDFResource);
      if (doctype.Value == Cx.NS_CX + "OutlineDocument")
        this.editor.load(Cx.CONTENT_PATH + "editors/outline_tmpl.html");
      else
        this.editor.load(Cx.CONTENT_PATH + "editors/text_tmpl.html");
    }

    gCardController.open(project, docres);
    gTitleController.open(project, docres);
  },


  save: function save () {
    try {
      gCardController.save();
      gTitleController.save();
    }
    catch (ex) {
      dump("*** " + ex + "\n");
    }

    try {
      this.saveCursorLocation();
    }
    catch (ex) {
      dump("*** outliner.saveCursorLocation: " + ex + "\n");
    }
    try {
      this.saveSidebarState();
    }
    catch (ex) {
      dump("*** outliner.saveSidebarState: " + ex + "\n");
    }

    var file = this.project.fileForResource(this.docres);

    if (! file) {
      file = this.project.projectFolder;
      file.append("outline-" + generateID(3) + ".html");
      file.createUnique(0, 0600);
      this.project.addFileToDocument(file, this.docres);
    }

    if (this.editor.editor.documentCharacterSet != "UTF-8")
      this.editor.editor.documentCharacterSet = "UTF-8";

    var persist = getWebBrowserPersist();
    var IPersist = Components.interfaces.nsIWebBrowserPersist;
    var doc = this.editor.contentDocument;
    var IMeta = Components.interfaces.nsIDOMHTMLMetaElement;
    var metas = doc.documentElement.firstChild.getElementsByTagName("meta");
    var foundCTMeta = false;
    for (var i = 0; i < metas.length; ++i) {
      if (metas[i].httpEquiv == "Content-Type") {
        if (metas[i].content != "text/html; charset=UTF-8")
          metas[i].content = "text/html; charset=UTF-8";
        foundCTMeta = true;
        break;
      }
    }
    if (! foundCTMeta) {
      var meta = doc.createElement("meta");
      meta.setAttribute("http-equiv", "Content-Type");
      meta.setAttribute("content", "text/html; charset=UTF-8");
      doc.documentElement.firstChild.appendChild(meta);
    }

    // TODO: more output flags? see ComposerCommands.js
    var flags = IPersist.ENCODE_FLAGS_WRAP
              | IPersist.ENCODE_FLAGS_ENCODE_LATIN1_ENTITIES
              | IPersist.ENCODE_FLAGS_FORMATTED;
    var wrap = 80;

    // TODO: other flags?
    persist.persistFlags  = persist.persistFlags
                          | IPersist.PERSIST_FLAGS_NO_BASE_TAG_MODIFICATIONS
                          | IPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES
                          | IPersist.PERSIST_FLAGS_DONT_FIXUP_LINKS
                          | IPersist.PERSIST_FLAGS_DONT_CHANGE_FILENAMES
                          | IPersist.PERSIST_FLAGS_FIXUP_ORIGINAL_DOM;

    try {
      // Only "text/html" will use the nsHTMLContentSerializer, which strips
      // out _moz_dirty attributes and pretty prints the output.
      var outputType = "text/html";
      persist.saveDocument(doc, file, null, outputType, flags, wrap);
      this.editor.editor.resetModificationCount();
      this._modified = false;
    }
    catch (ex) {
      dump("*** outliner.save: " + ex + "\n");
    }
  },


  close: function () {
    try {
      if (this.observingSaves) {
        getObserverService().removeObserver(this, "celtx:project-saved");
        this.observingSaves = false;
      }
    }
    catch (ex) {
      dump("*** gController.close: " + ex + "\n");
    }

    // It's possible for the tab to load in the background, and never
    // actually load the script before it's closed.
    window.controllers.removeController(this);

    if (this._loaded) {
      this.editor.editor.transactionManager.RemoveListener(this);
      this.editor.removeEventListener("formatchanged", this, false);
      if (InlineSpellChecker.inlineSpellChecker &&
          InlineSpellChecker.inlineSpellChecker.enableRealTimeSpell)
        InlineSpellChecker.shutdown();
    }

    this.outlineView.shutdown();

    gCardController.close();
    gTitleController.close();
  },


  focus: function () {
    if (this.editor) {
      this.editor.setAttribute("type", "content-primary");
      setTimeout("gController.editor.editorElement.contentWindow.focus()", 0);
    }

    this.showBreakdownChanged();
  },


  blur: function () {
    if (gWindow.inPrintPreview)
      PrintUtils.exitPrintPreview();
    if (this.editor)
      this.editor.setAttribute("type", "content");
    var openwin = this.openwindows.spellcheck;
    if (openwin && ! openwin.closed)
      openwin.close();
    openwin = this.openwindows.findreplace;
    if (openwin && ! openwin.closed)
      openwin.close();
  },


  checkSpelling: function () {
    this.editor.editorElement.contentWindow.focus();

    var openwin = this.openwindows.spellcheck;
    if (openwin && ! openwin.closed) {
      openwin.focus();
      return;
    }

    this.openwindows.spellcheck =
      window.openDialog(Cx.CONTENT_PATH + "editors/spellcheck.xul",
                        "_blank",
                        "chrome,titlebar,dependent,centerscreen,dialog=no",
                        this.editor.editor);
  },


  cmdFindReplace: function cmdFindReplace (showReplace) {
    this.editor.editorElement.contentWindow.focus();

    var openwin = this.openwindows.findreplace;
    if (openwin && ! openwin.closed) {
      openwin.focus();
      return;
    }

    this.openwindows.findreplace =
      window.openDialog(Cx.CONTENT_PATH + "editors/findreplace.xul",
                        "_blank",
                        "chrome,titlebar,dependent,centerscreen,dialog=no",
                        this.editor.editorElement.webBrowserFind,
                        this.editor.editor, showReplace);
  },


  cmdFindAgain: function cmdFindAgain (cmd) {
    var backwards = cmd == "cmd-find-previous";

    try {
      var findInst = this.editor.editorElement.webBrowserFind;
      var findSvc  = getFindService();
  
      findInst.findBackwards = findSvc.findBackwards ^ backwards;
      findInst.findNext();
      findInst.findBackwards = findSvc.findBackwards;
    }
    catch (ex) {
      dump("findAgain: " + ex + "\n");
    }
  },


  cmdTextColour: function cmdTextColour (colour) {
    this.editor.setColour(colour);
  },


  cmdFontFace: function cmdFontFace () {
    var face = document.getElementById("fontFaceMenu").value;
    var fontAtom = getAtom("font");
    this.editor.editor.setInlineProperty(fontAtom, "face", face);
  },


  cmdFontSize: function cmdFontSize () {
    var size = document.getElementById("fontSizeMenu").value;
    var fontAtom = getAtom("font");
    this.editor.editor.setInlineProperty(fontAtom, "size", size);
  },


  decreaseFontSize: function decreaseFontSize () {
    this.editor.editor.decreaseFontSize();
  },


  increaseFontSize: function increaseFontSize () {
    this.editor.editor.increaseFontSize();
  },


  saveZoomLevel: function () {
    var zoomMenu = document.getElementById("zoomMenu");
    var zoomLevel = Number(zoomMenu.selectedItem.value);
    var prefs = getPrefService().getBranch("celtx.texteditor.");
    prefs.setIntPref("zoomLevel", zoomLevel);
  },


  restoreZoomLevel: function () {
    var prefs = getPrefService().getBranch("celtx.texteditor.");
    try {
      var zoomLevel = prefs.getIntPref("zoomLevel");
      if (! zoomLevel)
        return;
      var zoomMenu = document.getElementById("zoomMenu");
      var items = zoomMenu.getElementsByTagName("menuitem");
      for (var i = 0; i < items.length; ++i) {
        if (items[i].value == zoomLevel) {
          zoomMenu.selectedItem = items[i];
          this.setZoom(zoomLevel);
          break;
        }
      }
    }
    catch (ex) {
      dump("*** restoreZoomLevel: " + ex + "\n");
    }
  },


  cmdSetZoom: function () {
    var zoomMenu = document.getElementById("zoomMenu");
    this.setZoom(Number(zoomMenu.selectedItem.value));
  },


  setZoom: function setZoom (zoom) {
    var viewer = this.editor.editorElement.docShell.contentViewer
      .QueryInterface(Components.interfaces.nsIMarkupDocumentViewer);
    viewer.textZoom = zoom / 100.0;
    this.updatePageConfig();
    this.saveZoomLevel();
  },


  setPaperSize: function setPaperSize (size) {
    this.paperSize = size;
    this.updatePageConfig();
  },


  setPaperSizeFromPrefs: function setPaperSizeFromPrefs () {
    var settings = PrintUtils.getPrintSettings();
    var width = settings.paperWidth;
    var height = settings.paperHeight;
    if (settings.paperSizeUnit == settings.kPaperSizeMillimeters) {
      width = width / 2.54;
      height = height / 2.54;
    }
    if (width > 8.4 && width < 8.6 && height > 10.9 && height < 11.1)
      this.setPaperSize("USLetter");
    else
      this.setPaperSize("A4");
  },


  goToChapter: function (aID) {
    this.editor.cursorToElement(aID);
    this.editor.contentWindow.focus();
  },


  createChapter: function (aPos) {
    if (aPos < 0)
      throw new Error("createChapter: Negative position");

    var chapters = this.chapterList.chapters;
    var parent = this.editor.contentDocument.body;
    var index = parent.childNodes.length;
    if (aPos < chapters.length) {
      parent = chapters[aPos].element.parentNode;
      index = offsetInParent(chapters[aPos].element, parent);
    }

    var heading = null;
    this.editor.editor.beginTransaction();
    try {
      var doc = this.editor.contentDocument;
      heading = doc.createElement("h1");
      heading.appendChild(doc.createTextNode(""));
      heading.appendChild(doc.createElement("br"));
      this.editor.editor.insertNode(heading, parent, index);
    }
    catch (ex) {
      dump("*** createScene: " + ex + "\n");
      heading = null;
    }
    finally {
      this.editor.editor.endTransaction();
    }

    return heading;
  },


  deleteChapter: function (aChapter) {
    this.willDeleteContext(aChapter);

    this.editor.editor.beginTransaction();
    try {
      var range = aChapter.domRange;
      this.editor.selection.removeAllRanges();
      this.editor.selection.addRange(range);
      this.editor.editor.deleteSelection(
        Components.interfaces.nsIEditor.ePrevious);
    }
    catch (ex) {
      dump("*** deleteChapter: " + ex + "\n");
    }
    finally {
      this.editor.editor.endTransaction();
    }

    this.didDeleteContext(aChapter);
  },


  insertChapterBeforeChapter: function (aChapter, aNextChapter) {
    if (aChapter == aNextChapter)
      return;

    var range = aChapter.domRange;

    // Build up the list of top-level nodes to delete
    var nodes = new Array();
    var iter = Components.classes["@celtx.com/dom/iterator;1"]
      .createInstance(Components.interfaces.celtxINodeIterator);
    iter.init(aChapter.element, range);
    var parent = aChapter.element.parentNode;
    var node;
    while ((node = iter.nextNode()) != null) {
      if (node.parentNode == parent)
        nodes.push(node);
    }

    range.detach();

    this.willMoveContext(aChapter);

    var editor = this.editor.editor;
    editor.beginTransaction();
    try {
      var parent;
      var offset;
      if (aNextChapter) {
        parent = aNextChapter.element.parentNode;
        offset = offsetInParent(aNextChapter.element, parent);
      }
      else {
        parent = this.editor.contentDocument.body;
        offset = parent.childNodes.length;
      }

      /*
       * If we're moving it down the list, the offset remains constant,
       * otherwise it goes up every time we move a node. There's a reason
       * DOM uses insertBefore instead of relying on numeric positions...
       */
      if (! aNextChapter || this.chapterList.indexOf(aChapter) <
          this.chapterList.indexOf(aNextChapter)) {
        for (var i = 0; i < nodes.length; ++i) {
          editor.insertNode(nodes[i], parent, offset);
        }
      }
      else {
        for (var i = 0; i < nodes.length; ++i) {
          editor.insertNode(nodes[i], parent, offset);
          ++offset;
        }
      }
    }
    catch (ex) {
      dump("*** insertChapterBeforeChapter: " + ex + "\n");
    }
    editor.endTransaction();

    this.didMoveContext(aChapter);
  },


  cmdExport: function () {
    try {
      var fp = getFilePicker();
      fp.init(window, gApp.getText("Export"), fp.modeSave);
      fp.appendFilters(fp.filterHTML);
      fp.appendFilters(fp.filterText);
      fp.defaultExtension = "html";
      fp.defaultString = this.document.title;
      if (fp.show() == fp.returnCancel) return;

      if (fp.filterIndex == 0)
        this.exportAsHTML(fp.file);
      else
        this.exportAsText(fp.file);
    }
    catch (ex) {
      dump("*** cmdExport: " + ex + "\n");
      celtxBugAlert(ex, Components.stack, ex);
    }
  },


  cmdImport: function () {
    try {
      var fp = getFilePicker();
      fp.init(window, gApp.getText("Import"), fp.modeOpen);
      fp.appendFilters(fp.filterHTML);
      fp.appendFilters(fp.filterText);
      if (fp.show() == fp.returnCancel) return;

      if (fp.file.leafName.match(/\.te?xt$/i))
        this.importAsText(fp.file);
      else
        this.importAsHTML(fp.file);

      this._modified = true;
    }
    catch (ex) {
      dump("*** cmdImport: " + ex + "\n");
      celtxBugAlert(ex, Components.stack, ex);
    }
  },


  exportAsHTML: function (aFile) {
    // Adapted from scripteditor.js
    var stylestr = "";
    var docStyle = this.editor.contentDocument.QueryInterface(
      Components.interfaces.nsIDOMDocumentStyle);
    for (var i = 0; i < docStyle.styleSheets.length; ++i) {
      try {
        var sheet = docStyle.styleSheets[i].QueryInterface(
          Components.interfaces.nsIDOMCSSStyleSheet);
        if (! sheet.disabled)
          stylestr += cssStyleSheetToString(sheet);
      }
      catch (ex) {
        dump("*** exportScriptAsHTML: " + ex + "\n");
      }
    }

    var xslFile = Cx.TRANSFORM_PATH + "export-novel-html.xml";

    var xsl = document.implementation.createDocument("", "", null);
    xsl.async = false;
    xsl.load(xslFile);

    var proc = new XSLTProcessor();
    proc.importStylesheet(xsl);
    proc.setParameter(null, "title", this.document.title);
    proc.setParameter(null, "cssstyle", stylestr);

    var doc = proc.transformToDocument(this.editor.contentDocument);

    var persist = getWebBrowserPersist();

    var flags = persist.ENCODE_FLAGS_WRAP
              | persist.ENCODE_FLAGS_ENCODE_LATIN1_ENTITIES
              | persist.ENCODE_FLAGS_FORMATTED;
    var wrap = 80;

    // TODO: other flags?
    persist.persistFlags = persist.persistFlags
                         | persist.PERSIST_FLAGS_NO_BASE_TAG_MODIFICATIONS
                         | persist.PERSIST_FLAGS_REPLACE_EXISTING_FILES
                         | persist.PERSIST_FLAGS_DONT_FIXUP_LINKS
                         | persist.PERSIST_FLAGS_DONT_CHANGE_FILENAMES
                         | persist.PERSIST_FLAGS_FIXUP_ORIGINAL_DOM;

    persist.saveDocument(doc,
                         aFile,
                         null,  // related files parent dir
                         "text/html",
                         flags,
                         wrap);
  },


  exportAsText: function (aFile) {
    var xslFile = Cx.TRANSFORM_PATH + "export-novel-text.xml";

    var xsl = document.implementation.createDocument("", "", null);
    xsl.async = false;
    xsl.load(xslFile);

    var proc = new XSLTProcessor();
    proc.importStylesheet(xsl);

    var doc = proc.transformToDocument(this.editor.contentDocument);
    var str = stringify_ws(doc.documentElement);

    writeFile(str, aFile.path);
  },


  importAsHTML: function (aFile) {
    this.editor.load(fileToFileURL(aFile));
  },


  importAsText: function (aFile) {
    var editor = this.editor.editor;
    var lines = readFile(aFile.path).split(/\r\n?|\n/m);
    var result = "";
    var listmode = null;
    var listdepth = 0; // For numbered lists only
    // Convert XML entities
    function escapeText (aText) {
      return aText.replace(/&<>/g, function (aSubStr) {
        if (aSubStr == "&")
          return "&amp;";
        else if (aSubStr == "<")
          return "&lt;";
        else
          return "&gt;";
      });
    }
    for (var i = 0; i < lines.length; ++i) {
      var line = lines[i];

      var bullet = line.match(/^\s*\*/);
      var numbered = line.match(/^\s*((?:[0-9]+\.)+)/);
      if (listmode == "ul" && ! bullet) {
        listmode = null;
        result += "</ul>\n";
      }
      else if (listmode == "ol" && ! numbered) {
        listmode = null;
        while (listdepth > 0) {
          result += "</ol>\n";
          --listdepth;
        }
      }

      if (bullet) {
        if (listmode != "ul") {
          result += "<ul>\n";
          listmode = "ul";
        }
        line = escapeText(line.substring(bullet[0].length));
        result += "<li>" + line + "</li>\n";
      }
      else if (numbered) {
        // This conveniently eliminates a check again listmode, because
        // listdepth is always 0 outside of a numbered list
        // Note: Don't count the trailing period
        var depth = numbered[1].split(".").length - 1;
        while (listdepth < depth) {
          result += "<ol>\n";
          ++listdepth;
        }
        while (listdepth > depth) {
          result += "</ol>\n";
          --listdepth;
        }
        listmode = "ol";
        line = escapeText(line.substring(numbered[0].length));
        result += "<li>" + line + "</li>\n";
      }
      else {
        result += escapeText(line) + "<br />\n";
      }
    }

    editor.beginTransaction();
    try {
      var body = this.editor.contentDocument.body;
      while (body.hasChildNodes())
        editor.deleteNode(body.lastChild);
      editor.insertHTML(result);
    }
    catch (ex) {
      throw ex;
    }
    finally {
      editor.endTransaction();
    }
  },


  cmdTreeitemDelete: function () {
    var chapter = gController.outlineView.getSelectedChapter();
    if (! chapter)
      return;

    var ps = getPromptService();
    var title = gApp.getText("DeleteChapter");
    var msg = gApp.getText("DeleteChapterPrompt");
    if (! ps.confirm(window, title, msg))
      return;

    this.deleteChapter(chapter);
  },


  cmdTreeitemGoto: function cmdTreeitemGoto () {
    var chapter = gController.outlineView.getSelectedChapter()
    if (! chapter)
      return;

    this.goToChapter(chapter.element.id);
    this.editor.contentWindow.focus();
  },
};


function loaded () {
  gWindow = new Object;

  gController.editor = document.getElementById("editor");
  gWindow.toolbox = document.getElementById("outliner-toolbox");

  gWindow.fontmenu = document.getElementById("fontFaceMenu");

  // From mozilla/editor/ui/composer/content/editor.js
  var popup = gWindow.fontmenu.firstChild;
  try {
    var enumerator = Components.classes["@mozilla.org/gfx/fontenumerator;1"]
      .getService(Components.interfaces.nsIFontEnumerator);
    var localFontCount = { value: 0 };
    gWindow.localFonts = enumerator.EnumerateAllFonts(localFontCount);
  }
  catch (ex) {}
  for (var i = 0; i < gWindow.localFonts.length; ++i) {
    if (gWindow.localFonts[i] != "") {
      var item = document.createElementNS(Cx.NS_XUL, "menuitem");
      item.setAttribute("label", gWindow.localFonts[i]);
      item.setAttribute("value", gWindow.localFonts[i]);
      popup.appendChild(item);
      // The default
      if (gWindow.localFonts[i] == kDefaultFontName)
        gWindow.fontmenu.selectedItem = item;
    }
  }

  window.controllers.appendController(gController);

  gCardController.loaded();
  gTitleController.loaded();
}


var gActiveControllerId = "editorcard";
function viewTabSelected (aEvent) {
  var cardid = aEvent.target.value;
  if (! cardid || cardid == gActiveControllerId)
    return;
  var card = document.getElementById(cardid);
  if (! card)
    return;

  switch (gActiveControllerId) {
    case "editorcard":
      gController.blur();
      break;
    case "indexcard":
      gCardController.blur();
      break;
    case "titlecard":
      gTitleController.blur();
      break;
  }

  document.getElementById("editordeck").selectedPanel = card;
  gActiveControllerId = cardid;

  switch (gActiveControllerId) {
    case "editorcard":
      gController.focus();
      break;
    case "indexcard":
      gCardController.focus();
      break;
    case "titlecard":
      gTitleController.focus();
      break;
  }

  gController.updateCommands();
}


function onEnterPrintPreview () {
  gWindow.toolbox.hidden = true;
  gWindow.inPrintPreview = true;
  /*
  var printPreviewTB = document.createElementNS(XUL_NS, "toolbar");
  printPreviewTB.setAttribute("printpreview", true);
  printPreviewTB.setAttribute("id", "print-preview-toolbar");
  getBrowser().parentNode.insertBefore(printPreviewTB, getBrowser());
  */
  getBrowser().contentWindow.focus();
  gController.updateCommands();
}


function onExitPrintPreview () {
  /*
  var printPreviewTB = document.getElementById("print-preview-toolbar");
  if (printPreviewTB)
    printPreviewTB.parentNode.removeChild(printPreviewTB);
  */
  gWindow.toolbox.hidden = false;
  gController.editor.editorElement.makeEditable("html", false);
  gWindow.inPrintPreview = false;
  gController.updateCommands();
}


function getController () {
  return gController;
}


function getMenuPopup () {
  return document.getElementById("novelPopup");
}


function getBrowser () {
  return gController.editor;
}


function getPPBrowser () {
  return getBrowser();
}


function getNavToolbox () {
  return document.getElementById("outliner-toolbox");
}


function getWebNavigation () {
  var browser = getBrowser();
  return browser ? browser.webNavigation : null;
}


function setOutlineView (view) {
  gController.outlineView = view;
  gController.outlineView.setDelegate(gController);
}


const kSpellMaxNumSuggestions = 3;
const kSpellNoMispelling = -1;
const kSpellNoSuggestionsFound = 0;

var InlineSpellChecker = {
  editor: null,
  inlineSpellChecker: null,

  Init: function (editor, enable) {
    this.editor = editor;
    this.inlineSpellChecker = editor.getInlineSpellChecker(true);

    var ps = getPrefService();
    var branch = ps.getBranch("celtx.spelling.");
    ps = ps.QueryInterface(Components.interfaces.nsIPrefBranch2);
    ps.addObserver("celtx.spelling.", this, false);

    if (branch.getBoolPref("inline"))
      this.editor.setSpellcheckUserOverride(true);
  },

  shutdown: function () {
    try {
      if (this.inlineSpellChecker &&
          this.inlineSpellChecker.enableRealTimeSpell)
        this.inlineSpellChecker.enableRealTimeSpell = false;
      this.inlineSpellChecker = null;
    }
    catch (ex) {
      dump("*** InlineSpellChecker.shutdown: " + ex + "\n");
    }
    var ps = getPrefService();
    ps = ps.QueryInterface(Components.interfaces.nsIPrefBranch2);
    ps.removeObserver("celtx.spelling.", this, false);
  },

  observe: function (subject, topic, data) {
    if (topic != "nsPref:changed" || data != "celtx.spelling.inline")
      return;

    var ps = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService)
      .getBranch("celtx.spelling.");
    this.editor.setSpellcheckUserOverride(ps.getBoolPref("inline"));
  },

  checkDocument: function (doc) {
    if (! (this.inlineSpellChecker &&
           this.inlineSpellChecker.enableRealTimeSpell))
      return;

    var range = doc.createRange();
    range.selectNodeContents(doc.body);
    this.inlineSpellChecker.spellCheckRange(range);
  },

  getMispelledWord: function () {
    if (! (this.inlineSpellChecker &&
           this.inlineSpellChecker.enableRealTimeSpell))
      return null;

    var selection = this.editor.selection;
    return this.inlineSpellChecker.getMispelledWord(
      selection.anchorNode, selection.anchorOffset);
  },

  // returns kSpellNoMispelling if the word is spelled correctly
  // For mispelled words, returns kSpellNoSuggestionsFound when there are no
  // suggestions otherwise the number of suggestions is returned.
  // firstNonWordMenuItem is the first element in the menu popup that isn't
  // a dynamically added word added by updateSuggestionsMenu.
  updateSuggestionsMenu: function (menupopup, firstNonWordMenuItem, word) {
    if (! (this.inlineSpellChecker &&
           this.inlineSpellChecker.enableRealTimeSpell))
      return kSpellNoMispelling;

    var child = menupopup.firstChild;
    while (child != firstNonWordMenuItem) {
      var next = child.nextSibling;
      menupopup.removeChild(child);
      child = next;
    }

    if (! word) {
      word = this.getMispelledWord();
      if (! word)
        return kSpellNoMispelling;
    }

    var spellChecker = this.inlineSpellChecker.spellChecker;
    if (! spellChecker)
      return kSpellNoMispelling;

    var numSuggestedWords = 0;

    var isIncorrect = spellChecker.CheckCurrentWord(word.toString());
    if (isIncorrect) {
      do {
        var suggestion = spellChecker.GetSuggestedWord();
        if (! suggestion)
          break;

        var item = document.createElement("menuitem");
        item.setAttribute("label", suggestion);
        item.setAttribute("value", suggestion);

        item.setAttribute("oncommand", "InlineSpellChecker.selectSuggestion"
                          + "(event.target.value, null, null);");
        menupopup.insertBefore(item, firstNonWordMenuItem);
        numSuggestedWords++;
      } while (numSuggestedWords < kSpellMaxNumSuggestions);
    }
    else
      numSuggestedWords = kSpellNoMispelling;

    return numSuggestedWords;
  },

  selectSuggestion: function (newword, node, offset) {
    if (! (this.inlineSpellChecker &&
           this.inlineSpellChecker.enableRealTimeSpell))
      return;

    if (! node) {
      var selection = this.editor.selection;
      node = selection.anchorNode;
      offset = selection.anchorOffset;
    }

    this.inlineSpellChecker.replaceWord(node, offset, newword);
  },

  addToDictionary: function (node, offset) {
    if (! (this.inlineSpellChecker &&
           this.inlineSpellChecker.enableRealTimeSpell))
      return;

    if (! node) {
      var selection = this.editor.selection;
      node = selection.anchorNode;
      offset = selection.anchorOffset;
    }

    var word = this.inlineSpellChecker.getMispelledWord(node,offset);
    if (word) {
      this.inlineSpellChecker.addWordToDictionary(word);
      try {
        var persdict = Components.classes[
          "@mozilla.org/spellchecker/personaldictionary;1"]
          .getService(Components.interfaces.mozIPersonalDictionary);
        persdict.save();
      }
      catch (ex) {
        dump("*** Unable to save personal dictionary: " + ex + "\n");
      }
    }
  },

  ignoreWord: function (node, offset) {
    if (! (this.inlineSpellChecker &&
           this.inlineSpellChecker.enableRealTimeSpell))
      return;

    if (! node) {
      var selection = this.editor.selection;
      node = selection.anchorNode;
      offset = selection.anchorOffset;
    }

    var word = this.inlineSpellChecker.getMispelledWord(node, offset);
    if (word)
      this.inlineSpellChecker.ignoreWord(word);
  }
};


function hideScriptOnlyMessage () {
  document.getElementById("scriptOnlyMessage").collapsed = true;
}


function showScriptOnlyFAQ () {
  top.gApp.openBrowser("https://www.celtx.com/faq.html#scriptOnly");
}
