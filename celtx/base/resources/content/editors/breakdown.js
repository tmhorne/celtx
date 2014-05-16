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

function BreakdownSidebarController () {}


BreakdownSidebarController.prototype = {
  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) ||
        aIID.equals(Components.interfaces.nsIDOMEventListener) ||
        aIID.equals(Components.interfaces.nsIObserver) ||
        aIID.equals(Components.interfaces.nsISelectionListener) ||
        aIID.equals(Components.interfaces.celtxISidebar))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  commands: {},
  editor: null,
  context: null,
  _suppressMutationEvents: false,


  supportsCommand: function (aCommand) {
    return (aCommand in this.commands);
  },


  isCommandEnabled: function (aCommand) {
    switch (aCommand) {
      default:
        return true;
    }
  },


  doCommand: function (aCommand) {
    switch (aCommand) {
    }
  },


  onEvent: function (aEventName) {
    switch (aEventName) {
    }
  },


  init: function (aEditor) {
    this.editor = aEditor;

    this.registerEventListeners();

    var itemPopup = document.getElementById("breakdownItemPopup");
    itemPopup.database.AddDataSource(this.editor.document.project.ds);

    var preffile = currentProfileDir();
    preffile.append(Cx.PREFS_FILE);
    var rdfsvc = getRDFService();
    var prefds = rdfsvc.GetDataSourceBlocking(fileToFileURL(preffile));
    this.deptList.database.AddDataSource(prefds);
    this.deptList.ref = Cx.NS_CX + "Prefs/Categories";
    var deptList = this.deptList;
    setTimeout(function () {
      var sortService = Components.classes[
        "@mozilla.org/xul/xul-sort-service;1"]
        .getService(Components.interfaces.nsIXULSortService);
      sortService.sort(deptList, Cx.NS_RDFS + "label", "ascending");
      deptList.selectedIndex = 0;
    }, 0);

    var tree = document.getElementById("breakdownItemTree");
    tree.database.AddDataSource(this.editor.document.project.ds);

    this.updateCommands();
    this.validateAddItem();

    this.refreshAllBreakdown();

    this.contextChanged(this.editor.selectedBreakdownUnit);
  },


  registerEventListeners: function () {
    var privsel = this.editor.editor.selection.QueryInterface(
      Components.interfaces.nsISelectionPrivate);
    privsel.addSelectionListener(this);

    var body = this.editor.editor.contentDocument.body;
    body.addEventListener("dblclick", this, false);
    body.addEventListener("DOMNodeInserted", this, false);
    body.addEventListener("DOMNodeRemoved", this, false);

    this.toggleButton = document.getElementById("breakdownToggleAddButton");
    this.toggleButton.addEventListener("command", this, false);

    this.deptList = document.getElementById("breakdownDeptList");
    this.deptList.addEventListener("select", this, false);

    this.nameBox = document.getElementById("breakdownNameBox");
    this.nameBox.addEventListener("input", this, false);
    this.nameBox.addEventListener("keyup", this, false);
    this.nameBox.addEventListener("command", this, false);

    this.addButton = document.getElementById("breakdownAddItemButton");
    this.addButton.addEventListener("command", this, false);

    this.unmarkButton = document.getElementById("breakdownRemoveMarkupButton");
    this.unmarkButton.addEventListener("command", this, false);

    this.itemTree = document.getElementById("breakdownItemTree");
    this.itemTree.addEventListener("select", this, false);
    this.itemTree.addEventListener("dblclick", this, false);
    this.itemTree.addEventListener("DOMAttrModified", this, false);

    this.openItem = document.getElementById("breakdownOpenItem");
    this.openItem.addEventListener("command", this, false);

    this.renameItem = document.getElementById("breakdownRenameItem");
    this.renameItem.addEventListener("command", this, false);

    this.removeItem = document.getElementById("breakdownRemoveItem");
    this.removeItem.addEventListener("command", this, false);
  },


  shutdown: function () {
    try {
      var privsel = this.editor.editor.selection.QueryInterface(
        Components.interfaces.nsISelectionPrivate);
      privsel.removeSelectionListener(this);
    }
    catch (ex) {
      dump("*** breakdown.privsel.removeSelectionListener: " + ex + "\n");
    }

    try {
      var body = this.editor.editor.contentDocument.body;
      body.removeEventListener("click", this, false);
      body.removeEventListener("DOMNodeInserted", this, false);
      body.removeEventListener("DOMNodeRemoved", this, false);
    }
    catch (ex) {
      dump("*** breakdown.body.removeEventListener: " + ex + "\n");
    }

    try {
      this.toggleButton.removeEventListener("command", this, false);
    }
    catch (ex) {
      dump("*** breakdown.toggleButton.removeEventListener: " + ex + "\n");
    }
    this.toggleButton = null;

    try {
      this.deptList.removeEventListener("select", this, false);
    }
    catch (ex) {
      dump("*** breakdown.deptList.removeEventListener: " + ex + "\n");
    }
    this.deptList = null;

    try {
      this.nameBox.removeEventListener("input", this, false);
      this.nameBox.removeEventListener("keyup", this, false);
      this.nameBox.removeEventListener("command", this, false);
    }
    catch (ex) {
      dump("*** breakdown.nameBox.removeEventListener: " + ex + "\n");
    }
    this.nameBox = null;

    try {
      this.addButton.removeEventListener("command", this, false);
    }
    catch (ex) {
      dump("*** breakdown.addButton.removeEventListener: " + ex + "\n");
    }
    this.addButton = null;

    try {
      this.unmarkButton.removeEventListener("command", this, false);
    }
    catch (ex) {
      dump("*** breakdown.unmarkButton.removeEventListener: " + ex + "\n");
    }
    this.unmarkButton = null;

    try {
      this.itemTree.removeEventListener("select", this, false);
      this.itemTree.removeEventListener("dblclick", this, false);
      this.itemTree.removeEventListener("DOMAttrModified", this, false);
    }
    catch (ex) {
      dump("*** breakdown.itemTree.removeEventListener: " + ex + "\n");
    }
    this.itemTree = null;

    try {
      this.openItem.removeEventListener("command", this, false);
    }
    catch (ex) {
      dump("*** breakdown.openItem.removeEventListener: " + ex + "\n");
    }
    this.openItem = null;

    try {
      this.renameItem.removeEventListener("command", this, false);
    }
    catch (ex) {
      dump("*** breakdown.renameItem.removeEventListener: " + ex + "\n");
    }
    this.renameItem = null;

    try {
      this.removeItem.removeEventListener("command", this, false);
    }
    catch (ex) {
      dump("*** breakdown.removeItem.removeEventListener: " + ex + "\n");
    }
    this.removeItem = null;

    this.context = null;
    this.editor = null;
  },


  willDeleteContext: function (aContext) {
    this._suppressMutationEvents = true;
  },


  didDeleteContext: function (aContext) {
    this._suppressMutationEvents = false;
  },


  willMoveContext: function (aContext) {
    this._suppressMutationEvents = true;
  },


  didMoveContext: function (aContext) {
    this._suppressMutationEvents = false;
  },


  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      case "dblclick":
        if (aEvent.currentTarget == this.editor.editor.contentDocument.body)
          this.editorDoubleClicked(aEvent);
        else if (aEvent.currentTarget == this.itemTree)
          this.openSelectedItem();
        break;
      case "DOMNodeInserted":
        this.nodeInserted(aEvent);
        break;
      case "DOMNodeRemoved":
        this.nodeRemoved(aEvent);
        break;
      case "DOMAttrModified":
        if (aEvent.currentTarget == this.itemTree)
          this.treeAttrModified(aEvent);
        break;
      case "command":
        if (aEvent.target == this.toggleButton)
          this.toggleAddItemBox();
        else if (aEvent.target == this.nameBox)
          this.validateAddItem();
        else if (aEvent.target == this.addButton)
          this.addItem();
        else if (aEvent.target == this.unmarkButton)
          this.unmarkSelection();
        else if (aEvent.target == this.openItem)
          this.openSelectedItem();
        else if (aEvent.target == this.renameItem)
          this.renameSelectedItem();
        else if (aEvent.target == this.removeItem)
          this.removeSelectedItem();
        break;
      case "select":
        if (aEvent.currentTarget == this.deptList)
          this.deptSelected();
        else if (aEvent.currentTarget == this.itemTree)
          this.treeItemSelected();
        break;
      case "input":
        if (aEvent.target == this.nameBox)
          this.validateItem();
        break;
      case "keyup":
        if (aEvent.target == this.nameBox)
          this.addItemKeyup(aEvent);
        break;
    }
  },


  lock: function () {
  },


  unlock: function () {
  },


  updateCommands: function () {
    var addButton = document.getElementById("breakdownAddItemButton");
    var removeItem = document.getElementById("breakdownRemoveItem");
    var treeView = document.getElementById("breakdownItemTree").view;
    // treeView is null if there are no items in the tree
    var addDisabled = ! this.context;
    var removeDisabled = addDisabled || ! treeView;
    if (! removeDisabled) {
      var index = treeView.selection.currentIndex;
      if (index < 0 || treeView.getLevel(index) == 0)
        removeDisabled = true;
    }

    addButton.disabled = addDisabled;
    removeItem.disabled = removeDisabled;
  },


  toggleAddItemBox: function () {
    var toggleAddButton = document.getElementById("breakdownToggleAddButton");
    var addItemBox = document.getElementById("breakdownAddItemBox");
    var nameBox = document.getElementById("breakdownNameBox");

    if (addItemBox.collapsed) {
      toggleAddButton.image = "chrome://celtx/skin/arrow_down.gif";
      addItemBox.collapsed = false;
      nameBox.focus();
    }
    else {
      toggleAddButton.image = "chrome://celtx/skin/arrow_right.gif";
      addItemBox.collapsed = true;
    }
  },


  validateAddItem: function () {
    var nameBox = document.getElementById("breakdownNameBox");
    var addButton = document.getElementById("breakdownAddItemButton");

    addButton.disabled = this._locked || ! nameBox.label;
  },


  addItemKeyup: function (event) {
    if (event.keyCode == event.DOM_VK_ENTER ||
        event.keyCode == event.DOM_VK_RETURN) {
      var nameBox = document.getElementById("breakdownNameBox");
      this.addItem();
      nameBox.inputField.select();
    }
  },


  treeItemSelected: function () {
    this.updateCommands();
  },


  treeAttrModified: function (aEvent) {
    if (aEvent.attrName != "open")
      return;

    var treeitem = aEvent.target;
    if (! treeitem.id)
      return;

    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var ds = this.editor.document.project.ds;
    var itemres = rdfsvc.GetResource(treeitem.id);
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var deptres = ds.GetTarget(itemres, deptarc, true);
    if (! (deptres && deptres instanceof IRes))
      return;
    deptres = deptres.QueryInterface(IRes);

    var localds = rdfsvc.GetDataSourceBlocking("rdf:local-store");
    var openarc = rdfsvc.GetResource(Cx.NS_CX + "open");
    if (aEvent.newValue == "true")
      setRDFString(localds, deptres, openarc, "true");
    else
      setRDFString(localds, deptres, openarc, "false");
  },


  openSelectedItem: function () {
    var treeView = document.getElementById("breakdownItemTree").view;
    var index = treeView.selection.currentIndex;
    if (index < 0)
      return;
    // Don't attempt to open the departments
    if (treeView.getLevel(index) == 0)
      return;
    var treeitem = treeView.getItemAtIndex(index);
    var itemres = getRDFService().GetResource(treeitem.id);
    top.openInMasterCatalog(itemres);
  },


  contextChanged: function (aContext) {
    if (! aContext)
      return;

    if (this.context && this.context.equals(aContext))
      return;

    /*
     * This is to handle splitting of scenes, pending a better tracking
     * system for scene insertion and removal. See the novel editor (outliner)
     * for a better example of chapter tracking based on DOM mutation
     * events.
     *
     * The idea here is that, if a scene is split by adding a scene heading,
     * then the context becomes the new scene, and the last context was the
     * scene that was split, so we do a last check to extract its breakdown.
     */
    if (this.context) {
      var ds = this.editor.document.project.ds;
      ds.beginUpdateBatch();
      try {
        this.extractBreakdown(this.context);
      }
      catch (ex) {
        dump("*** extractBreakdown: " + ex + "\n");
      }
      ds.endUpdateBatch();
    }

    this.context = aContext;

    var ds = this.editor.document.project.ds;
    ds.beginUpdateBatch();
    try {
      this.extractBreakdown(aContext);
    }
    catch (ex) {
      dump("*** extractBreakdown: " + ex + "\n");
    }
    ds.endUpdateBatch();

    var itemTree = document.getElementById("breakdownItemTree");
    itemTree.setAttribute("ref", aContext.members.res.Value);

    if (this._selectedMarkup) {
      var self = this;
      setTimeout(function () {
        self.markupSelected(self._selectedMarkup);
      }, 0);
    }

    this.updateCommands();
  },


  refreshAllBreakdown: function () {
    var contexts = this.editor.getBreakdownContexts();
    for (var i = 0; i < contexts.length; ++i) {
      var context = contexts.queryElementAt(i,
        Components.interfaces.nsISupports).wrappedJSObject;
      this.extractBreakdown(context);
    }
  },


  extractBreakdown: function (aContext) {
    var range = aContext.domRange;
    if (! range || range.collapsed)
      return;

    var validator = {
      getCanonicalCharacterName: function (aNode) {
        var charname = stringify(aNode).toUpperCase();
        // Strip parenthetical qualifiers, e.g., (O.S.)
        charname = charname.replace(/\(.*\)\s*$/, "");
        // Strip leading whitespace
        charname = charname.replace(/^\s+/, "");
        // Strip trailing whitespace
        charname = charname.replace(/\s+$/, "");
        return charname;
      },
      getCanonicalNameFromLit: function (aNode) {
        aNode = aNode.QueryInterface(Components.interfaces.nsIRDFLiteral);
        var charname = aNode.Value.toUpperCase();
        return charname;
      },
      isWhitespaceOnly: function (aNode) {
        return ! stringify(aNode).match(/\S/);
      }
    };

    // An unfortunate choice of name, this just implements some convenience
    // methods in C++ to speed up breakdown extraction for large documents
    var scriptscene = Components.classes["@celtx.com/scriptscene;1"]
      .createInstance(Components.interfaces.nsIScriptScene);
    scriptscene.init(aContext.ds, aContext.resource);
    scriptscene.extractBreakdownInRange(range, validator);
  },


  notifySelectionChanged: function (aDoc, aSelection, aReason) {
    var IListener = Components.interfaces.nsISelectionListener;
    var mask = IListener.MOUSEUP_REASON | IListener.KEYPRESS_REASON
    if ((aReason & mask) == 0)
      return;

    var nameBox = document.getElementById("breakdownNameBox");

    try {
      if (aSelection.isCollapsed)
        nameBox.inputField.value = "";
      else
        nameBox.inputField.value = aSelection.toString();
      this.validateAddItem();
    }
    catch (ex) {
      celtxBugAlert(ex, Components.stack, ex);
    }

    var unmarkButton = document.getElementById("breakdownRemoveMarkupButton");
    try {
      unmarkButton.disabled = this.editor.editor.selection.isCollapsed;
    }
    catch (ex) {
      dump("*** notifySelectionChanged: " + ex + "\n");
      unmarkButton.disabled = true;
    }
    goUpdateCommand("cmd-unmarkup");
  },


  editorDoubleClicked: function (aEvent) {
    var span = aEvent.target;
    if (span.nodeName.toLowerCase() != "span")
      return;

    var itemuri = aEvent.target.getAttribute("ref");
    if (itemuri)
      this.markupSelected(itemuri);
  },


  markupSelected: function (itemuri) {
    if (! this.context) {
      this._selectedMarkup = itemuri;
      return;
    }

    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var itemres = rdfsvc.GetResource(itemuri);
    var ds = this.editor.document.project.ds;
    var rdftypearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = ds.GetTarget(itemres, rdftypearc, true);
    if (! (type && type instanceof IRes)) {
      dump("*** markupSelected: no type associated with " + itemuri + "\n");
      return;
    }
    type = type.QueryInterface(IRes);

    var deptseq = this.context._getDeptSequence(type);
    if (! deptseq) {
      dump("*** item is mysteriously not in this scene\n");
      // Cache the selected markup, since it might be a selection in
      // a different scene, and we haven't loaded the data for that
      // scene yet.
      this._selectedMarkup = itemuri;
      return;
    }

    var treeView = document.getElementById("breakdownItemTree").view;
    // treeView is null if there are no items in the tree, which shouldn't
    // happen in this case, but let's not barf over it
    if (! treeView)
      return;
    var index = -1;
    var deptindex = -1;
    var count = treeView.rowCount;
    for (var i = 0; i < count; ++i) {
      var item = treeView.getItemAtIndex(i);
      if (item.id == deptseq.res.Value)
        deptindex = i;
      else if (item.id == itemuri)
        index = i;
      if (deptindex >= 0 && index >= 0)
        break;
    }

    if (deptindex < 0) {
      dump("*** markupSelected: Couldn't find department\n");
      return;
    }

    if (! treeView.isContainerOpen(deptindex)) {
      treeView.toggleOpenState(deptindex);
      count = treeView.rowCount;
      for (var i = deptindex + 1; i < count; ++i) {
        var item = treeView.getItemAtIndex(i);
        if (item.id == itemuri) {
          index = i;
          break;
        }
      }
    }

    if (index >= 0) {
      dump("--- Selecting row " + index + "\n");
      treeView.selection.select(index);
    }
    else
      dump("*** markupSelected: Couldn't find item\n");
  },


  deptSelected: function () {
    var deptList = document.getElementById("breakdownDeptList");
    var itemPopup = document.getElementById("breakdownItemPopup");
    itemPopup.setAttribute("ref", deptList.value);
    itemPopup.builder.rebuild();
  },


  restoreSelection: function () {
    if (this._cachedDept) {
      this.selectDept(this._cachedDept);
      if (this._cachedItem)
        this.selectItem(this._cachedItem);
    }
    this._cachedDept = null;
    this._cachedItem = null;
    if (this.editor.isActive())
      this.editor.editor.contentWindow.focus();
  },


  addItem: function () {
    if (! this.context)
      return;

    var deptList = document.getElementById("breakdownDeptList");
    var nameBox = document.getElementById("breakdownNameBox");
    if (! nameBox.label)
      return;

    var ds = this.editor.document.project.ds;
    var rdfsvc = getRDFService();

    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = rdfsvc.GetResource(deptList.value);

    ds.beginUpdateBatch();

    try {
      var item = null;
      if (nameBox.selectedItem) {
        item = rdfsvc.GetResource(nameBox.selectedItem.value);
      }
      else {
        item = rdfsvc.GetResource(this.editor.document.project.mintURI());
        ds.Assert(item, typearc, type, true);
        var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
        setRDFString(ds, item, titlearc, nameBox.label);
      }

      this.context.addItem(item);

      var editor = this.editor.editor;
      if (! editor.selection.isCollapsed) {
        var schemads = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
        var elemarc = rdfsvc.GetResource(Cx.NS_CX + "element");
        var elem = getRDFString(schemads, type, elemarc);
        editor.markup(elem, item.Value);
        this.context.addToMarkup(item);
      }
    }
    catch (ex) {
      dump("*** addItem: " + ex + "\n");
      throw ex;
    }
    finally {
      ds.endUpdateBatch();
    }
  },


  unmarkSelection: function () {
    this.editor.editor.unmarkup();
  },


  removeSelectedItem: function () {
    if (! this.context)
      return;

    var range = this.context.domRange;
    if (! range || range.collapsed)
      return;

    var treeView = document.getElementById("breakdownItemTree").view;
    if (treeView.selection.count != 1)
      return;

    var index = treeView.selection.currentIndex;
    if (index < 0)
      return;

    // Don't try to delete departments
    if (treeView.getLevel(index) == 0)
      return;

    var treeitem = treeView.getItemAtIndex(index);
    var itemres = getRDFService().GetResource(treeitem.id);
    if (! itemres)
      return;

    if (this.context.containsInMarkup(itemres)) {
      if (! this.editor.editor.isLocked)
        this.editor.editor.editor.beginTransaction();
      try {
        var iter = Components.classes["@celtx.com/dom/iterator;1"]
          .createInstance(Components.interfaces.celtxINodeIterator);
        iter.init(this.context.element, range);
        var node;
        var spans = new Array();
        while ((node = iter.nextNode()) != null) {
          if (node.nodeName.toLowerCase() == "span" &&
              node.getAttribute("ref") == itemres.Value)
            spans.push(node);
        }
        for (var i = 0; i < spans.length; ++i)
          this.editor.editor.unmarkupSpan(spans[i]);
      }
      catch (ex) {
        dump("*** removeItem: " + ex + "\n");
      }
      if (! this.editor.editor.isLocked)
        this.editor.editor.editor.endTransaction();
      this.context.removeFromMarkup(itemres);
    }
    var ds = this.editor.document.project.ds;
    ds.beginUpdateBatch();
    try {
      this.context.removeItem(itemres);
    }
    catch (ex) {
      dump("*** removeItem: " + ex + "\n");
    }
    ds.endUpdateBatch();
  },


  renameSelectedItem: function () {
    var treeView = document.getElementById("breakdownItemTree").view;
    var index = treeView.selection.currentIndex;
    if (index < 0)
      return;

    var treeitem = treeView.getItemAtIndex(index);
    var itemres = getRDFService().GetResource(treeitem.id);

    var ds = this.editor.document.project.ds;
    var rdfsvc = getRDFService();
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var oldtitle = getRDFString(ds, itemres, titlearc);

    var dlgtitle = gApp.getText("RenameItem");
    var msg = gApp.getText("RenameItemPrompt");
    var title = { value: oldtitle };
    var checkstate = { value: false };
    var psvc = getPromptService();
    if (! psvc.prompt(window, dlgtitle, msg, title, null, checkstate))
      return;

    if (! title.value)
      return;

    ds.beginUpdateBatch();
    setRDFString(ds, itemres, titlearc, title.value);
    ds.endUpdateBatch();
  },


  isMarkupSpan: function (aNode) {
    if (! aNode)
      return false;
    if (aNode.nodeName.toLowerCase() != "span")
      return false;
    return aNode.hasAttribute("ref");
  },


  nodeInserted: function (aEvent) {
    if (this._suppressMutationEvents)
      return;

    this._foundMarkupNode = false;
    this.nodeInsertedImpl(aEvent.target);
    if (this._foundMarkupNode) {
      var self = this;
      setTimeout(function () {
        self.extractBreakdown(self.context);
      }, 0);
    }
  },


  nodeInsertedImpl: function (aNode) {
    // Shortcut
    if (this._foundMarkupNode)
      return;

    if (aNode.hasChildNodes()) {
      var children = aNode.childNodes;
      for (var i = 0; i < children.length; ++i)
        this.nodeInsertedImpl(children[i]);
    }

    if (this.isMarkupSpan(aNode)) {
      this._foundMarkupNode = true;
    }
    else if (this.isMarkupSpan(aNode.parentNode) &&
             aNode.parentNode.childNodes.length == 1) {
      // This is the reverse of deleting the last child of a markup span
      // (see nodeRemovedImpl)
      this._foundMarkupNode = true;
    }
  },


  nodeRemoved: function (aEvent) {
    if (this._suppressMutationEvents)
      return;

    this._foundMarkupNode = false;
    this.nodeRemovedImpl(aEvent.target);
    if (this._foundMarkupNode) {
      var self = this;
      setTimeout(function () {
        self.extractBreakdown(self.context);
      }, 0);
    }
  },


  nodeRemovedImpl: function (aNode) {
    // Shortcut
    if (this._foundMarkupNode)
      return;

    if (aNode.hasChildNodes()) {
      var children = aNode.childNodes;
      for (var i = 0; i < children.length; ++i)
        this.nodeRemovedImpl(children[i]);
    }

    if (this.isMarkupSpan(aNode)) {
      this._foundMarkupNode = true;
    }
    else if (this.isMarkupSpan(aNode.parentNode) &&
             aNode.parentNode.childNodes.length == 1) {
      // If we're deleting the only child of a markup span, we're
      // effectively deleting the span too
      this._foundMarkupNode = true;
    }
  },


  findChars: function findChars () {
    var xpe = new XPathEvaluator();
    // By finding sceneheadings as well as characters, we don't need to
    // churn all the time doing a scene heading look-back.
    var str = "//p[@class='sceneheading' or @class='character']";
    var result = xpe.evaluate(str, this.editor.editor.contentDocument,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    if (result.snapshotLength == 0)
      return;

    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var chartype = rdfsvc.GetResource(Cx.NS_CX + "Cast");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
    var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");

    var project = this.editor.document.project;
    var ds = project.ds;
    var docres = this.editor.document.resource;
    var namecache = new CharacterNameCache(ds);
    var scenelist = ds.GetTarget(docres, scenesarc, true);
    if (! scenelist) {
      dump("*** current script has no scene list\n");
      return;
    }
    scenelist = scenelist.QueryInterface(Components.interfaces.nsIRDFResource);
    scenelist = new RDFSeq(ds, scenelist);

    var scene = null;

    ds.beginUpdateBatch();
    for (var i = 0; i < result.snapshotLength; ++i) {
      var node = result.snapshotItem(i);
      if (node.className == "sceneheading") {
        if (! node.id) {
          dump("*** found a scene without an id\n");
          continue;
        }
        var sceneidlit = rdfsvc.GetLiteral(node.id);
        var scenersrcs = ds.GetSources(sceneidarc, sceneidlit, true);
        var sceneres = null;
        while (scenersrcs.hasMoreElements()) {
          var tmpscene = scenersrcs.getNext().QueryInterface(
            Components.interfaces.nsIRDFResource);
          if (scenelist.indexOf(tmpscene) >= 0) {
            sceneres = tmpscene;
            break;
          }
        }
        if (sceneres)
          scene = new Scene(ds, sceneres);
        else
          dump("*** no scene in this script with ID " + node.id + "\n");
        continue;
      }

      if (! scene) {
        dump("*** can't add character without a scene\n");
        continue;
      }

      var charname = stringify(node).toUpperCase();
      charname = charname.replace(/\s*\(.*\)\s*$/, "");
      if (! charname)
        continue;

      var charres = namecache.charWithName(charname);
      if (! charres) {
        var charres = rdfsvc.GetResource(project.mintURI());
        ds.Assert(charres, typearc, chartype, true);
        setRDFString(ds, charres, titlearc, charname);
        namecache.map[charname] = charres.Value;
      }
      scene.addItem(charres);
    }
    ds.endUpdateBatch();
  }
};


function CharacterNameCache (ds) {
  this.ds = ds;
  this.map = {};
  var rdfsvc = getRDFService();
  var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
  var chartype = rdfsvc.GetResource(Cx.NS_CX + "Cast");
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var chars = ds.GetSources(typearc, chartype, true);
  while (chars.hasMoreElements()) {
    var charres = chars.getNext().QueryInterface(
      Components.interfaces.nsIRDFResource);
    var name = getRDFString(ds, charres, titlearc).toUpperCase();
    this.map[name] = charres.Value;
  }
}

CharacterNameCache.prototype = {
  charWithName: function charWithName (name) {
    name = name.toUpperCase().replace(/\s*\(.*\)\s*$/, "");
    if (name in this.map)
      return getRDFService().GetResource(this.map[name]);
    return null;
  }
};

