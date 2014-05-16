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

var gPaginator = null;

var gScriptController = {
  __proto__: EditorController.prototype,


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


  loaded: function loaded () {
    this.toolbar      = document.getElementById("script-toolbar");
    this.zoomMenu     = document.getElementById("zoom-menulist");
    this.formatPopup  = document.getElementById("format-menu-popup");
    this.formatMenu   = document.getElementById("format-menulist");
    this.editor       = document.getElementById("editor");
    this.scratchpad   = document.getElementById("scratchpad");
    this.sidebar      = document.getElementById("sidebar");

    this.activeEditor = this.editor;
  },


  commands: {
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1,
    "cmd-bold": 1,
    "cmd-italic": 1,
    "cmd-underline": 1,
    "cmd-lowercase": 1,
    "cmd-uppercase": 1,
    "cmd-find": 1,
    "cmd-replace": 1,
    "cmd-find-again": 1,
    "cmd-find-previous": 1,
    "cmd-editor-context-menu": 1,
    "cmd-check-spelling": 1,
    "cmd-insert-note": 1,
    "cmd-set-format": 1,
    "cmd-set-zoom": 1,
    "cmd-unmarkup": 1,
    "cmd-treeitem-down": 1,
    "cmd-treeitem-up": 1,
    "cmd-treeitem-recycle": 1,
    "cmd-treeitem-delete": 1,
    "cmd-treeitem-goto": 1,
    "cmd-toggle-breakdown": 1,
    "cmd-toggle-sidebar": 1,
    "cmd-toggle-scratchpad": 1,
    "cmd-recycle-selection": 1,
    "cmd-export-script": 1,
    "cmd-import-script": 1,
    "cmd-schedule-script": 1,
    "cmd-edit-title-page": 1,
    "cmd-toggle-pagination": 1,
    "cmd-toggle-dual-dialog": 1,
    "cmd-script-format": 1,
    "cmd-find-characters": 1,
    "cmd-lock-script": 1,
    "cmd-create-revision": 1,
    "cmd-manage-revisions": 1,
    "cmd-toggle-revision-marks": 1,
    "cmd-clear-revision-marks": 1,
    "cmd-apply-revision-marks": 1,
    "cmd-show-scene-numbers": 1,
    "cmd-edit-scene-numbers": 1,
    "cmd-set-revision-colour": 1,
    "cmd-omit-scene": 1,
    "cmd-reset-locking": 1
  },


  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "cmd-print-preview":
        return ! this.inPrintPreview;
      case "cmd-treeitem-down":
      case "cmd-treeitem-up":
      case "cmd-treeitem-delete":
        if (! gController.outlineView)
          return false;
        return gController.outlineView.getSelectedID() != null &&
               ! this.editor.isLocked;
      case "cmd-treeitem-recycle":
        if (! gController.outlineView)
          return false;
        return gController.outlineView.getSelectedSceneID() != null &&
               ! this.editor.isLocked;
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
      case "cmd-schedule-script":
        return this.mode == "film";
      case "cmd-toggle-dual-dialog":
        return this.editorLoaded && this.mode != "av" && this.mode != "comic";
      case "cmd-create-revision":
        // Only enabled for scripts that have been saved at least once
        return this.editorLoaded &&
               isReadableFile(this.getScriptFile("primary"));
      case "cmd-manage-revisions":
      case "cmd-edit-scene-numbers":
        return this.editorLoaded && ! this.editor.isLocked;
      case "cmd-toggle-revision-marks":
      case "cmd-reset-locking":
        return this.editorLoaded;
      case "cmd-unmarkup":
        return this.editorLoaded && ! this.editor.selection.isCollapsed &&
               ! this.editor.isLocked;
      case "cmd-omit-scene":
        return this.editorLoaded && ! this.editor.isLocked;
      case "cmd-clear-revision-marks":
      case "cmd-apply-revision-marks":
        return this.editorLoaded &&
               ! this.editor.isLocked &&
               ! this.editor.selection.isCollapsed &&
               this.editor.revisionNumber > 0;
      default:
        return this.supportsCommand(cmd);
    }
  },


  doCommand: function doCommand (cmd) {
    switch (cmd) {
      case "cmd-find-characters":
        this.sidebarController.breakdownController.findChars();
        break;
      case "cmd-script-format":
        this.cmdPageSetup();
        break;
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        this.cmdPrint();
        break;
      case "cmd-print-preview":
        if (this.scriptConfig.showPageNumbers)
          gPaginator.adjustSynchronously();
        this.editor.contentWindow.focus();
        this.establishPrintSettings();
        PrintUtils.printPreview(editor_onEnterPrintPreview,
          editor_onExitPrintPreview);
        break;
      case "cmd-find":
      case "cmd-replace":
        this.cmdFindReplace(cmd == "cmd-replace");
        break;
      case "cmd-find-again":
      case "cmd-find-previous":
        this.cmdFindAgain(cmd);
        break;
      case "cmd-check-spelling":
        this.cmdCheckSpelling();
        break;
      case "cmd-bold":
      case "cmd-italic":
      case "cmd-underline":
        this.activeEditor.toggleStyle(cmd.substring(4));
        break;
      case "cmd-uppercase":
        this.activeEditor.setSelectionToUpperCase();
        break;
      case "cmd-lowercase":
        this.activeEditor.setSelectionToLowerCase();
        break;
      case "cmd-editor-context-menu":
        if (this.activeEditor == this.editor)
          this.cmdEditorContextMenu();
        break;
      case "cmd-set-format":
        this.cmdSetFormat();
        break;
      case "cmd-set-zoom":
        this.cmdSetZoom();
        break;
      case "cmd-insert-note":
        this.cmdInsertNote();
        break;
      case "cmd-unmarkup":
        this.cmdUnmarkup();
        break;
      case "cmd-treeitem-down":
        this.cmdTreeitemDown();
        break;
      case "cmd-treeitem-up":
        this.cmdTreeitemUp();
        break;
      case "cmd-treeitem-recycle":
        this.cmdTreeitemRecycle();
        break;
      case "cmd-treeitem-delete":
        this.cmdTreeitemDelete();
        break;
      case "cmd-treeitem-goto":
        this.cmdTreeitemGoto();
        break;
      case "cmd-toggle-breakdown":
        this.cmdToggleBreakdown();
        break;
      case "cmd-toggle-sidebar":
        this.sidebarController.sidebar.collapsed ^= true;
        this.updateSidebarStatus();
        break;
      case "cmd-toggle-scratchpad":
        this.cmdToggleScratchpad();
        break;
      case "cmd-recycle-selection":
        this.cmdRecycleSelection();
        break;
      case "cmd-import-script":
        this.cmdImportScript();
        break;
      case "cmd-export-script":
        this.cmdExportScript();
        break;
      case "cmd-edit-title-page":
        this.cmdEditTitlePage();
        break;
      case "cmd-toggle-pagination":
        this.cmdTogglePagination();
        break;
      case "cmd-toggle-dual-dialog":
        this.cmdToggleDualDialog();
        break;
      case "cmd-lock-script":
        if (this.editor.isLocked)
          this.cmdUnlockScript();
        else
          this.cmdLockScript();
        break;
      case "cmd-create-revision":
        this.cmdCreateRevision();
        break;
      case "cmd-manage-revisions":
        this.cmdManageRevisions();
        break;
      case "cmd-toggle-revision-marks":
        this.cmdToggleRevisionMarks();
        break;
      case "cmd-clear-revision-marks":
        this.cmdClearRevisionMarks();
        break;
      case "cmd-apply-revision-marks":
        this.cmdApplyRevisionMarks();
        break;
      case "cmd-show-scene-numbers":
        this.cmdShowSceneNumbers();
        break;
      case "cmd-edit-scene-numbers":
        this.cmdEditSceneNumbers();
        break;
      case "cmd-set-revision-colour":
        this.cmdSetRevisionColour();
        break;
      case "cmd-omit-scene":
        this.cmdOmitScene();
        break;
      case "cmd-reset-locking":
        this.cmdResetLocking();
        break;
    }
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);

    if (gController.outlineView)
      gController.outlineView.updateTreeCommands();
  },


  // For PrintUtils support
  get browser () {
    return this.editor;
  },


  get modified () {
    // TODO: Make all modification transactions increment and decrement the
    // modification counts on the editors when done/undone.
    if (this._modified)
      return true;

    var modcount = this.editor.modificationCount;
    if (this.scratchpad)
      modcount += this.scratchpad.modificationCount;
    return modcount > 0;
  },


  lock: function () {
    this._locked = true;

    var IPlaintextEditor = Components.interfaces.nsIPlaintextEditor;
    var readOnlyMask = IPlaintextEditor.eEditorReadonlyMask;
    this.editor.editor.flags |= readOnlyMask;

    this.sidebarController.lock();
  },


  unlock: function () {
    var IPlaintextEditor = Components.interfaces.nsIPlaintextEditor;
    var readOnlyMask = IPlaintextEditor.eEditorReadonlyMask;
    if (this.editor.editor.flags & readOnlyMask)
      this.editor.editor.flags ^= readOnlyMask;

    this.sidebarController.unlock();

    this._locked = false;
  },


  suspendTimers: function suspendTimers () {
    try {
      if (gWindow && gWindow.pageTimer) {
        window.clearInterval(gWindow.pageTimer);
        gWindow.pageTimer = null;
      }
    }
    catch (ex) {
      dump("*** suspendTimers: " + ex + "\n");
    }
  },


  resumeTimers: function resumeTimers () {
    try {
      if (gWindow && ! gWindow.pageTimer &&
          this.editorLoaded && this.scriptConfig.showPageNumbers) {
        gWindow.pageTimer = window.setInterval("gPaginator.adjustPageBreaks()",
                                               3000);
      }
    }
    catch (ex) {
      dump("*** resumeTimers: " + ex + "\n");
    }
  },


  cmdSetZoom: function cmdSetZoom () {
    this.suspendTimers();

    var scriptY = this.editor.scrollY;
    var scratchY = this.scratchPad ? this.scratchpad.scrollY : 0;

    var zoomLevel = Number(this.zoomMenu.selectedItem.value);
    var oldLevel = this.scriptConfig.zoomLevel;

    if (zoomLevel != oldLevel) {
      this.scriptConfig.zoomLevel = zoomLevel;
      this.scriptConfig.update();
      if (this.scratchpad) {
        this.scratchConfig.zoomLevel = zoomLevel;
        this.scratchConfig.update();
      }
      this.editor.scrollY = Math.ceil(scriptY * zoomLevel / oldLevel);
      if (this.scratchpad)
        this.scratchpad.scrollY = Math.ceil(scratchY * zoomLevel / oldLevel);
      gPaginator.fontSize = zoomLevel;
      if (this.scriptConfig.showPageNumbers)
        gPaginator.cacheExistingPageBreaks();
    }

    this._modified = true;

    this.activeEditor.contentWindow.focus();

    this.resumeTimers();
  },


  cmdSetFormat: function cmdSetFormat () {
    var format = this.formatMenu.selectedItem.value;
    var para = this.activeEditor.currentParagraph;
    if (! para)
      return;
    var charname = stringify(para);
    this.activeEditor.setParagraphFormat(para, format);
    this.activeEditor.contentWindow.focus();
  },


  updateFormatMenu: function updateFormatMenu () {
    var para = this.activeEditor.currentParagraph;
    if (! para)
      return;
    var format = para.className;
    var formatItems = this.formatPopup.childNodes;
    for (var i = 0; i < formatItems.length; i++) {
      if (! formatItems[i].hidden && format == formatItems[i].value) {
        this.formatMenu.selectedItem = formatItems[i];
        break;
      }
    }
  },


  cmdEditorContextMenu: function cmdEditorContextMenu () {
    // Hide the recycle menu item if we're not using a scratchpad
    if (! this.scratchpad) {
      document.getElementById("editor-popup-recycle-sep").hidden = true;
      document.getElementById("editor-popup-recycle").hidden = true;
    }

    // if we have a mispelled word, show spellchecker context
    // menuitems as well as the usual context menu
    try {
      var misspelledWordStatus = kSpellNoMispelling;
      var spellCheckNoSuggestionsItem = document.getElementById(
        "spellCheckNoSuggestions");
      if (! this.editor.isLocked) {
        var word;
        misspelledWordStatus = InlineSpellChecker.updateSuggestionsMenu(
          document.getElementById("editor-context"),
          spellCheckNoSuggestionsItem, word);
      }

      var hideSpellingItems = (misspelledWordStatus == kSpellNoMispelling);
      spellCheckNoSuggestionsItem.hidden = hideSpellingItems ||
        misspelledWordStatus != kSpellNoSuggestionsFound;
      document.getElementById('spellCheckAddToDictionary').hidden =
        hideSpellingItems;
      document.getElementById('spellCheckIgnoreWord').hidden = hideSpellingItems;
      document.getElementById('spellCheckAddSep').hidden = hideSpellingItems;
      document.getElementById('spellCheckSuggestionsSeparator').hidden =
        hideSpellingItems;
    }
    catch (ex) {
      dump("*** cmdEditorContextMenu: " + ex + "\n");
    }

    goUpdateSelectEditMenuItems();
    goUpdateCommand("cmd-unmarkup");

    var countsep = document.getElementById("wordCountSep");
    var countitem = document.getElementById("wordCountItem");
    if (this.editor.selection.isCollapsed ||
        this.editor.isLocked) {
      countsep.hidden = true;
      countitem.hidden = true;
    }
    else {
      countsep.hidden = false;
      countitem.label = gApp.getText("WordsSelectedCount",
        [ this.editor.selectionWordCount ]);
      countitem.hidden = false;
    }
  },


  handleEvent: function handleEvent (event) {
    switch (event.type) {
      case "scriptload":
        if (event.target == this.editor) {
          this.editor.removeEventListener("scriptload", this, false);
          this.editor.contentDocument.body.addEventListener(
            "DOMNodeInserted", this, false);
          this.editorLoaded = true;
        }
        else if (this.scratchpad && event.target == this.scratchpad) {
          this.scratchpad.removeEventListener("scriptload", this, false);
          this.scratchpadLoaded = true;
        }
        if (this.editorLoaded && (! this.scratchpad || this.scratchpadLoaded)) {
          this.scriptLoaded();
        }
        break;
      case "scriptwillload":
        if (event.target == this.editor)
          this.scriptWillLoad();
        else if (event.target == this.scratchpad)
          this.scratchWillLoad();
        break;
      case "formatchanged":
        var curpar = this.activeEditor.currentParagraph;
        var focusNode = this.activeEditor.selection.focusNode;
        // Generic "outside the paragraph" fixup.
        if (! this.activeEditor.currentParagraph &&
            this.activeEditor.selection.isCollapsed &&
            ! ( (focusNode instanceof Components.interfaces.nsIDOMText) &&
            focusNode.nodeValue.match(/[^\r\n]/, "m"))) {
          var sel = this.activeEditor.selection;
          var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
          var IElement = Components.interfaces.nsIDOMElement;
          var IText = Components.interfaces.nsIDOMText;
          var node = sel.focusNode;
          var offset = sel.focusOffset;
          if (node instanceof IText) {
            offset = offsetInParent(node);
            node = node.parentNode;
          }
          // Try to go forward until a valid node is reached
          var next = null;
          if (offset >= node.childNodes.length)
            next = node.childNodes[offset - 1];
          else
            next = node.childNodes[offset];
          while (next && ! (next instanceof IPara)) {
            if (! (next instanceof IElement))
              next = nextElement(next);
            else if (next.hasChildNodes())
              next = next.firstChild;
            else
              next = nextElement(next);
          }
          if (next) {
            next = next.firstChild;
            while (next && ! (next instanceof IText))
              next = next.nextSibling;
            if (next)
              sel.collapse(next, 0);
          }
          // If going forward didn't work, go backward
          if (! next) {
            var prev = offset > 0 ? node.childNodes[offset - 1] : null;
            while (prev && ! (prev instanceof IPara)) {
              if (! (prev instanceof IElement))
                prev = previousElement(prev);
              else if (prev.hasChildNodes())
                prev = prev.lastChild;
              else
                prev = previousElement(prev);
            }
            if (prev) {
              prev = prev.lastChild;
              while (prev && ! ((prev instanceof IText) &&
                prev.nodeValue.match(/\S/)))
                prev = prev.previousSibling;
              if (prev)
                sel.collapse(prev, prev.nodeValue.length);
            }
            else
              dump("*** no paragraph position found!\n");
          }
        }

        if (! this.activeEditor.currentParagraph &&
            ! this.activeEditor.isLocked) {
          var txMgr = this.activeEditor.editor.transactionManager;
          // Don't fix up the paragraph if it looks like it was the result
          // of an Undo, otherwise the user can't Undo past the fixup.
          if (txMgr.numberOfRedoItems == 0) {
            var sel = this.activeEditor.selection;
            if (sel.isCollapsed) {
              this.activeEditor.editor.beginTransaction();
              this.activeEditor.setDefaultParagraphFormat();
              this.activeEditor.editor.endTransaction();
            }
          }
          else {
            // Clear the Redo stack, otherwise things can get quirky. To do
            // this without munging the Undo stack, we have to create a
            // bogus transaction so the transaction manager will reset Redo.
            var tx = {
              QueryInterface: function (iid) {
                if (iid.equals(Components.interfaces.nsISupports) ||
                    iid.equals(Components.interfaces.nsITransaction))
                  return this;
                throw Components.results.NS_NOINTERFACE;
              },
              isTransient: false,
              doTransaction: function () {},
              merge: function (aTx) { return false; },
              redoTransaction: function () {},
              undoTransaction: function () {}
            };
            txMgr.undoTransaction();
            txMgr.doTransaction(tx);
            goUpdateUndoEditMenuItems();
          }
        }

        this.updateFormatMenu();
        this.updateRevisionMenu();
        gController.updateCommands();

        if (this.lastBlock &&
            this.lastBlock != this.editor.currentParagraph &&
            (this.lastBlock.className == "act" ||
             this.lastBlock.className == "sceneheading" ||
             this.lastBlock.className == "shot")) {
          this.sceneTracker.update();
        }
        // Check if it was changed from sceneheading or shot to
        // non-sceneheading and non-shot
        else if (this.editor.currentParagraph.id &&
          this.editor.currentParagraph.className != "act" &&
          this.editor.currentParagraph.className != "sceneheading" &&
          this.editor.currentParagraph.className != "shot") {
          this.sceneTracker.update();
        }
        if (this.activeEditor == this.editor)
          this.updateAutoText();
        // if (this._focused)
          this.updateStyleHint();
        goUpdateUndoEditMenuItems();
        goUpdateCommand("cmd-toggle-dual-dialog");

        curpar = this.editor.currentParagraph;
        if (curpar) {
          var curscene = this.editor.sceneContaining(curpar);
          if (curscene && curscene.id) {
            this.updateSceneMenus();
            var sceneres = this.sceneTracker.sceneForSceneID(curscene.id);
            if (sceneres) {
              var scriptscene = new ScriptScene(this.project.ds, sceneres,
                curscene);
              this.sidebarController.contextChanged(scriptscene);
            }
          }
        }

        this.checkRevisionCursorStyle();

        break;
      case "focus":
        if (event.target == this.editor.contentDocument)
          this.editorFocused(this.editor);
        else if (this.scratchpad &&
                 event.target == this.scratchpad.contentDocument)
          this.editorFocused(this.scratchpad);
        break;
      case "click":
        this.editorClick(event);
        break;
      case "dblclick":
        this.editorDoubleClick(event);
        break;
      case "mouseover":
        this.editorMouseOver(event);
        break;
      case "mouseout":
        this.editorMouseOut(event);
        break;
      case "DOMNodeInserted":
        if (event.target.nodeName.toLowerCase() == "span") {
          this._spansToRemove.push(event.target);
          if (! this._spansToRemoveCallback) {
            var self = this;
            this._spansToRemoveCallback = setTimeout(function () {
              self.removeCachedSpans();
            }, 0);
          }
        }
        break;
    }
  },


  _spansToRemove: [],
  _spansToRemoveCallback: null,


  removeCachedSpans: function () {
    if (this.editor.isLocked) {
      dump("*** removeCachedSpans: Editor is locked\n");
      return;
    }

    this._spansToRemoveCallback = null;
    var body = this.editor.contentDocument.body;

    while (this._spansToRemove.length > 0) {
      var span = this._spansToRemove.shift();
      if (span.parentNode != body)
        continue;

      if (span.hasAttribute("revision")) {
        // Preserve the selection first, because the inline property
        // functions all operate exclusively on the selection.
        var sel = this.editor.selection;
        var range = sel.getRangeAt(0);
        this.editor.editor.selectElement(span);
        this.editor.editor.removeInlineProperty(getAtom("span"), "revision");
        sel = this.editor.selection;
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
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


  editorFocused: function (editor) {
    if (editor == this.activeEditor)
      return;

    this.activeEditor.removeEventListener("formatchanged", this, false);
    editor.addEventListener("formatchanged", this, false);

    if (gAutoComplete.popup.isOpen)
      gAutoComplete.popup.close();

    this.activeEditor.setAttribute("type", "content");
    this.activeEditor = editor;
    this.activeEditor.setAttribute("type", "content-primary");
  },


  scriptWillLoad: function () {
    gPaginator = Components.classes["@celtx.com/scriptpaginator;1"]
      .createInstance(Components.interfaces.nsIScriptPaginator);
    this.editor.addEventListener("scriptload", this, false);
    this.scriptConfig = null;

    if (! this.editorLoaded)
      return;

    try {
      var body = this.editor.contentDocument.body;
      body.removeEventListener("DOMNodeInserted", this, false);
      body.removeEventListener("click", this, false);
      body.removeEventListener("dblclick", this, false);
      body.removeEventListener("mouseover", this, false);
      body.removeEventListener("mouseout", this, false);
    }
    catch (ex) {
      dump("*** body.removeEventListener: " + ex + "\n");
    }

    try {
      if (! this.editor.isLocked)
        this.editor.editor.transactionManager.RemoveListener(this);
    }
    catch (ex) {
      dump("*** editor.transactionManager.RemoveListener: " + ex + "\n");
    }
    try {
      this.sceneTracker.shutdown();
    }
    catch (ex) {
      dump("*** sceneTracker.shutdown: " + ex + "\n");
    }
    this.sceneTracker = null;
    try {
      this.sidebarController.shutdown();
    }
    catch (ex) {
      dump("*** sidebarController.shutdown: " + ex + "\n");
    }
    this.sidebarController = null;

    try {
      if (InlineSpellChecker.inlineSpellChecker &&
          InlineSpellChecker.inlineSpellChecker.enableRealTimeSpell)
        InlineSpellChecker.shutdown();
    }
    catch (ex) {
      dump("*** InlineSpellChecker.shutdown: " + ex + "\n");
    }


    try {
      if (! this.editor.isLocked)
        this.editor.editor.removeInsertionListener(this);
    }
    catch (ex) {
      dump("*** editor.removeInsertionListener: " + ex + "\n");
    }

    try {
      var mgr = this.editor.editorElement.commandManager;
      var params = Components.classes["@mozilla.org/embedcomp/command-params;1"]
        .createInstance(Components.interfaces.nsICommandParams);
      params.setISupportsValue("removehook", this.clipboardSanitizer);
      mgr.doCommand("cmd_clipboardDragDropHook", params,
                    this.editor.contentWindow);
    }
    catch (ex) {
      dump("*** removehook: " + ex + "\n");
    }
  },


  scratchWillLoad: function () {
    this.scratchConfig = null;

    if (! this.scratchLoaded)
      return;

    try {
      var mgr = this.scratchpad.editorElement.commandManager;
      var params = Components.classes["@mozilla.org/embedcomp/command-params;1"]
        .createInstance(Components.interfaces.nsICommandParams);
      params.setISupportsValue("removehook", this.clipboardSanitizer);
      mgr.doCommand("cmd_clipboardDragDropHook", params,
                    this.scratchpad.contentWindow);
    }
    catch (ex) {
      dump("*** removehook: " + ex + "\n");
    }
  },


  scriptLoaded: function scriptLoaded () {
    this.scriptConfig = new PageConfig(this.editor.contentDocument);
    if (this.scratchpad) {
      this.scratchConfig = new PageConfig(this.scratchpad.contentDocument,
        "scratch");
    }

    switch (this.scriptConfig.zoomLevel) {
      case 12:
        this.zoomMenu.selectedIndex = 1;
        break;
      case 16:
        this.zoomMenu.selectedIndex = 2;
        break;
      case 10:
      default:
        this.zoomMenu.selectedIndex = 0;
    }

    gPaginator.init(this.editor);
    gPaginator.fontSize = this.scriptConfig.zoomLevel;

    this.editor.contentDocument.addEventListener("focus", this, false);
    if (this.scratchpad)
      this.scratchpad.contentDocument.addEventListener("focus", this, false);
    var body = this.editor.contentDocument.body;
    body.addEventListener("click", this, false);
    body.addEventListener("dblclick", this, false);
    body.addEventListener("mouseover", this, false);
    body.addEventListener("mouseout", this, false);
    if (! this.editor.isLocked)
      this.editor.editor.transactionManager.AddListener(this);
    if (this.scratchpad)
      this.scratchpad.editor.transactionManager.AddListener(this);
    if (this._focused)
      this.editor.contentWindow.focus();
    this.restoreCursorLocation();

    if (this.mode == "theatre") {
      this.sceneTracker = Components.classes["@celtx.com/acttracker;1"]
        .createInstance(Components.interfaces.nsISceneTracker);
    }
    else if (this.mode == "av" || this.mode == "comic") {
      this.sceneTracker = Components.classes["@celtx.com/shottracker;1"]
        .createInstance(Components.interfaces.nsISceneTracker);
    }
    else {
      this.sceneTracker = Components.classes["@celtx.com/scenetracker;1"]
        .createInstance(Components.interfaces.nsILockingSceneTracker);
    }
    this.sceneTracker.init(this.project.ds, this.docres, this.editor);

    var sidebar = document.getElementById("sidebar");
    this.sidebarController = new SidebarController(sidebar, this);
    this.restoreSidebarState();

    this.conformToLockState();

    this.updateRevisionMenu();
    this.updateFormatMenu();

    // TODO: This should be turned into an initializer call
    gAutoComplete.findCharacters();
    gAutoComplete.findSceneHeadings();
    gAutoComplete.findSounds();
    gAutoComplete._lastCheck = (new Date()).valueOf();

    if (! this.editor.isLocked)
      InlineSpellChecker.Init(this.editor.editor);

    if (! this.editor.title || this.editor.title == "") {
      try {
        this.setTitleFromRDF();
      }
      catch (ex) {
        dump("*** setTitleFromRDF: " + ex + "\n");
      }
    }

    try {
      this.clipboardSanitizer = new ClipboardSanitizer(this);

      // Check if we were created by a Duplicate As command
      var rdfsvc = getRDFService();
      var convertArc = rdfsvc.GetResource(Cx.NS_CX + "needsConversion");
      if (getRDFString(this.project.ds, this.docres, convertArc) == "true") {
        this.clipboardSanitizer.convertUnsupportedClasses();
        clearRDFObject(this.project.ds, this.docres, convertArc);
        this.sceneTracker.update();
        this.save();
      }

      // Check for duplicate IDs
      try {
        var result = this.clipboardSanitizer.removeIncorrectIDs();
      }
      catch (ex) {
        dump("*** failed to remove incorrect IDs: " + ex + "\n");
      }
        

      var mgr = this.editor.editorElement.commandManager;
      var params = Components.classes["@mozilla.org/embedcomp/command-params;1"]
        .createInstance(Components.interfaces.nsICommandParams);
      params.setISupportsValue("addhook", this.clipboardSanitizer);
      mgr.doCommand("cmd_clipboardDragDropHook", params,
                    this.editor.contentWindow);
      if (this.mgr) {
        mgr = this.scratchpad.editorElement.commandManager;
        mgr.doCommand("cmd_clipboardDragDropHook", params,
                      this.scratchpad.contentWindow);
      }

      if (! this.editor.isLocked)
        this.editor.editor.addInsertionListener(this);
    }
    catch (ex) {
      dump("*** scriptLoaded: " + ex + "\n");
    }

    this.editor.resetModificationCount();
    if (this.scratchpad)
      this.scratchpad.resetModificationCount();

    if (this._focused) {
      this.resumeTimers();

      if (this.mode != "film")
        this.hideRevisionOptions();
      else if (this.editor.revisionNumber > 0)
        this.showRevisionToolbar();
    }

    // Set the default revision mark
    this.setRevisionStyle();
    this.updateRevisionLabel();

    gController.onScriptLoad();
    gTitleController.init(this);
  },


  setStatusMessage: function setStatusMessage (msg) {
    document.getElementById("statusmsg").value = msg;
  },


  setStatusMessageToDefault: function () {
    if (this.scriptConfig && this.scriptConfig.showPageNumbers) {
      var count = gPaginator.pageCount;
      var prefix = gApp.getText("PageCountPrefix");
      this.setStatusMessage(prefix + " " + count);
    }
    else
      this.setStatusMessage("");
  },


  // Notify the scene tree to update itself when drops/pastes happen
  notifyOfInsertion: function (mimeType, contentSourceURL, sourceDocument,
                               willDeleteSelection, ioDocFragment,
                               ioContentStartNode, ioContentStartOffset,
                               ioContentEndNode, ioContentEndOffset,
                               ioInsertionPointNode, ioInsertionPointOffset,
                               oContinueWithInsertion) {
    oContinueWithInsertion.value = true;

    ioDocFragment.value = this.clipboardSanitizer.sanitizeFragment(
      ioDocFragment.value);

    // Reset the start/end positions if necessary
    var startFound = false;
    var endFound = false;

    var testnode = ioContentStartNode.value;
    while (testnode) {
      if (testnode == ioDocFragment.value) {
        startFound = true;
        break;
      }
      testnode = testnode.parentNode;
    }
    testnode = ioContentEndNode.value;
    while (testnode) {
      if (testnode == ioDocFragment.value) {
        endFound = true;
        break;
      }
      testnode = testnode.parentNode;
    }

    var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;

    if (! startFound) {
      ioContentStartNode.value = ioDocFragment.value.firstChild;
      ioContentStartOffset.value = 0;
    }

    if (! endFound) {
      ioContentEndNode.value = ioDocFragment.value.lastChild;
      ioContentEndOffset.value = ioContentEndNode.value.childNodes.length;
    }
    else {
      // Don't paste the final paragraph's contents as plain text if we're
      // pasting multiple paragraphs. This is kind of a convoluted test,
      // but it solves the problem of partially selected paragraphs pasting
      // as text at the body level, then being turned into scene headings
      // or whatever the default paragraph style is.
      var end = ioContentEndNode.value;
      if (end instanceof IPara &&
          end != ioContentStartNode.value) {
        ioContentEndNode.value = end.parentNode;
        ioContentEndOffset.value = offsetInParent(end) + 1;
      }
      else {
        if (ioContentEndOffset.value > ioContentEndNode.value.childNodes.length)
          ioContentEndOffset.value = ioContentEndNode.value.childNodes.length;
      }
    }

    // Detect when a note or media is being pasted, and collapse the selection
    // if that's the case
    var pastingNoteOrMedia = false;
    var start = ioContentStartNode.value;
    if (start instanceof Components.interfaces.nsIDOMElement)
      start = start.childNodes[ioContentStartOffset.value];
    var end = ioContentEndNode.value;
    if (end instanceof Components.interfaces.nsIDOMElement &&
        ioContentEndOffset.value > 0)
      end = end.childNodes[ioContentEndOffset.value - 1];

    if (start == end && ! start.hasChildNodes() &&
        start.nodeName.toLowerCase() == "span")
      pastingNoteOrMedia = true;

    if (pastingNoteOrMedia) {
      var editor = this.activeEditor;
      setTimeout(function () {
        var sel = editor.selection;
        if (sel.anchorNode.nodeName.toLowerCase() == "span")
          sel.collapse(sel.anchorNode.parentNode,
            offsetInParent(sel.anchorNode));
      }, 0);
    }

    var classes = "@class='sceneheading' or @class='act' or @class='shot'";
    var str = "//p[(" + classes + ") and @id != '']";
    var xpe = new XPathEvaluator();
    var xset = xpe.evaluate(str, this.editor.contentDocument, null,
                            XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
    if (xset.iterateNext()) {
      setTimeout("gScriptController.sceneTracker.update()", 0);
    }
  },


  breakdownUnitContainingNode: function (aNode) {
    if (! aNode)
      return null;

    var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
    var iter = Components.classes["@celtx.com/dom/iterator;1"]
      .createInstance(Components.interfaces.celtxINodeIterator);
    iter.init(aNode, null);
    var node;
    while ((node = iter.previousNode()) != null) {
      if (node instanceof IPara && node.className == "sceneheading") {
        if (! node.id)
          return null;
        var sceneres = this.sceneTracker.sceneForSceneID(node.id);
        if (! sceneres)
          return null;
        return new ScriptScene(this.project.ds, sceneres, node);
      }
    }
    return null;
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
    var body = this.editor.contentDocument.body;
    var tracker = this.sceneTracker;
    var ds = this.project.ds;
    var xpath = new XPathEvaluator();
    var xset = xpath.evaluate("/html/body/p[@class='sceneheading']", body,
      null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    var sceneheading;
    while ((sceneheading = xset.iterateNext()) != null) {
      if (! sceneheading.id)
        continue;
      var sceneres = tracker.sceneForSceneID(sceneheading.id);
      var scene = new ScriptScene(ds, sceneres, sceneheading);
      contexts.appendElement(scene, false);
    }
    return contexts;
  },


  editorClick: function (event) {
    if (! event) return;

    try {
      if (this.editor.isLocked) {
        curpar = this.editor.currentParagraph;
        if (curpar) {
          var curscene = this.editor.sceneContaining(curpar);
          if (curscene && curscene.id) {
            var sceneres = this.sceneTracker.sceneForSceneID(curscene.id);
            if (sceneres) {
              var scriptscene = new ScriptScene(this.project.ds, sceneres,
                curscene);
              this.sidebarController.contextChanged(scriptscene);
            }
          }
        }
        this.editor.selectionController.setCaretEnabled(true);
      }
    }
    catch (ex) {
      dump("*** editorClick: " + ex + "\n");
    }
  },


  editorMouseOver: function (event) {
    if (! event.target.localName == "SPAN") return;
    var ref = event.target.getAttribute("ref");
    if (! ref) return;
    this.showItemInStatusBar(ref);
  },


  editorMouseOut: function (event) {
    if (! event.target.localName == "SPAN") return;
    this.setStatusMessageToDefault();
  },


  editorDoubleClick: function (aEvent) {
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


  showItemInStatusBar: function (ref) {
    if (! ref) {
      this.setStatusMessageToDefault();
      return;
    }
    try {
      var rdfsvc = getRDFService();
      var ds = this.project.ds;
      var schemads = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
      var elemRes = rdfsvc.GetResource(ref);
      var typeArc = rdfsvc.GetResource(Cx.NS_RDF + "type");
      var labelArc = rdfsvc.GetResource(Cx.NS_RDFS + "label");
      var titleArc = rdfsvc.GetResource(Cx.NS_DC + "title");
      var typeRes = ds.GetTarget(elemRes, typeArc, true);
      if (typeRes) {
        typeRes = typeRes.QueryInterface(Components.interfaces.nsIRDFResource);
        var typeName = schemads.GetTarget(typeRes, labelArc, true);
        typeName = typeName.QueryInterface(Components.interfaces.nsIRDFLiteral);
        var itemName = ds.GetTarget(elemRes, titleArc, true);
        itemName = itemName.QueryInterface(Components.interfaces.nsIRDFLiteral);
        var txt = typeName.Value + ": " + itemName.Value;
        this.setStatusMessage(txt);
      }
      else {
        dump("*** Dangling reference in script: " + ref + "\n");
        this.setStatusMessageToDefault();
      }
    }
    catch (ex) {
      dump("*** showItemInStatusBar: " + ex + "\n");
    }
  },


  setTitleFromRDF: function setTitleFromRDF () {
    var rdfsvc = getRDFService();
    var ILit = Components.interfaces.nsIRDFLiteral;
    var ds = this.project.ds;
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var title = ds.GetTarget(this.docres, titlearc, true);
    if (! title)
      return;
    title = title.QueryInterface(ILit);
    this.editor.title = title.Value;
  },


  cmdCheckSpelling: function cmdCheckSpelling () {
    if (this.editor.isLocked) {
      dump("*** cmdCheckSpelling: Editor is locked\n");
      return;
    }

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

    this.editor.editorElement.contentWindow.focus();

    try {
      var findInst = this.editor.editorElement.webBrowserFind;
      if (! findInst.searchString || findInst.searchString == "")
        return;
      var findSvc  = getFindService();

      findInst.findBackwards = findSvc.findBackwards ^ backwards;
      findInst.findNext();
      findInst.findBackwards = findSvc.findBackwards;
    }
    catch (ex) {
      dump("*** cmdFindAgain: " + ex + "\n");
    }
  },


  cmdUnmarkup: function cmdUnmarkup () {
    this.activeEditor.unmarkup();
    if (this.activeEditor.isLocked)
      this.sidebarController.breakdownController.refreshAllBreakdown();
  },


  // Notes


  cmdInsertNote: function cmdInsertNote () {
    this.sidebarController.showSidebarItemByName("notes");
    var noteController = this.sidebarController.noteController;
    noteController.insertNote();
  },


  getScriptFile: function getScriptFile (type) {
    return this.project.fileForResource(this.docres, type);
  },


  contextualFormat: function contextualFormat (format) {
    var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
    var sel = this.editor.selection;
    if (sel.isCollapsed) {
      this.editor.setParagraphFormat(this.editor.currentParagraph, format);
    }
    else {
      var range = sel.getRangeAt(0);
      var start = range.startContainer;
      var end = range.endContainer;
      while (start && ! (start instanceof IPara))
        start = start.parentNode;
      while (end && ! (end instanceof IPara))
        end = end.parentNode;
      if (! (start && end))
        return;
      var node = start;
      while (node != end) {
        if (node instanceof IPara)
          this.editor.setParagraphFormat(node, format);
        node = nextElement(node);
      }
      this.editor.setParagraphFormat(end, format);
    }
  },


  // This is a misnomer now, since it actually populates the format menus
  // instead of post-processing them.
  hideUnusedFormats: function hideUnusedFormats () {
    try {
      var contextPopup = document.getElementById("context-format-popup");
      var rdfsvc = getRDFService();
      var schemads = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
      var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
      var elemarc = rdfsvc.GetResource(Cx.NS_CX + "element");
      var ps = getPrefService().getBranch("celtx.scripteditor."
        + this.mode + ".");
      var formats = ps.getCharPref("formats").split(/\s*,\s*/);
      for (var i = 0; i < formats.length; ++i) {
        var itemres = rdfsvc.GetResource(Cx.NS_CX + "Formats/" + formats[i]);
        var title = getRDFString(schemads, itemres, titlearc);
        var format = getRDFString(schemads, itemres, elemarc);
        var menuitem = document.createElementNS(Cx.NS_XUL, "menuitem");
        menuitem.setAttribute("label", title);
        menuitem.setAttribute("value", format);
        this.formatPopup.appendChild(menuitem);
        var contextItem = menuitem.cloneNode(true);
        contextItem.setAttribute("oncommand",
          "gScriptController.contextualFormat('" + format + "')");
        contextPopup.appendChild(contextItem);
      }
    }
    catch (ex) {
      dump("*** hideUnusedFormats: " + ex + "\n");
    }
  },


  open: function open (project, docres) {
    this.project = project;
    this.docres = docres;
    this.document = new CeltxDocument();
    this.document.init(project, docres);

    var obs = getObserverService();
    obs.addObserver(this, "celtx:script:will-change-lock", false);
    obs.addObserver(this, "celtx:script:did-change-lock", false);

    var ps = getPrefService().QueryInterface(
      Components.interfaces.nsIPrefBranch2);
    ps.addObserver("celtx.script.breakdown.", this, false);
    // It will get updated at the focus event, because the tool-specific
    // menu isn't in the menu bar until the tab gets focused

    var doctype = project.model.target(RES(docres.Value), PROP('cx:doctype'));
    if (doctype.value == Cx.NS_CX + "ScriptDocument") {
      this.mode = "film";
    }
    else if (doctype.value == Cx.NS_CX + "TheatreDocument") {
      this.mode = "theatre";
      document.getElementById("casttab").collapsed = false;
    }
    else if (doctype.value == Cx.NS_CX + "RadioDocument") {
      this.mode = "radio";
      document.getElementById("casttab").collapsed = false;
      document.getElementById("dual-dialog-button").hidden = true;
    }
    else if (doctype.value == Cx.NS_CX + "AVDocument") {
      this.mode = "av";
      document.getElementById("dual-dialog-button").hidden = true;
      this.scratchpad = null;
      document.getElementById("scratchtab").hidden = true;
    }
    else if (doctype.value == Cx.NS_CX + "ComicDocument") {
      this.mode = "comic";
      document.getElementById("dual-dialog-button").hidden = true;
      this.scratchpad = null;
      document.getElementById("scratchtab").hidden = true;
    }

    this.editor.scriptMode = this.mode;
    if (this.scratchpad)
      this.scratchpad.scriptMode = this.mode;

    this.hideUnusedFormats();
    gController.outlineView.setDelegate(this);
    gController.outlineView.open(project, docres);
    window.setTimeout("gScriptController.openDelayed()", 0);
  },


  reload: function () {
    this.editor.addEventListener("scriptload", this, false);
    this.editorLoaded = false;
    if (this.scratchpad) {
      this.scratchpad.addEventListener("scriptload", this, false);
      this.scratchpadLoaded = false;
    }
    this.editor.reload();
    if (this.scratchpad)
      this.scratchpad.reload();
  },


  openDelayed: function openDelayed () {
    var scriptfile = this.getScriptFile("primary");
    var scratchfile = this.scratchpad ? this.getScriptFile("secondary") : null;

    // The script editor
    this.editor.addEventListener("scriptload", this, false);

    // For out of band reloads, like those generated by the iPhone import
    // add-on, we need to shut down all the listeners prior to reloading
    this.editor.addEventListener("scriptwillload", this, false);
    if (this.scratchpad)
      this.scratchpad.addEventListener("scriptwillload", this, false);

    if (isReadableFile(scriptfile)) {
      // Keep ASCII control characters out, so they don't pollute the
      // RDF database. And because they shouldn't be there anyway.
      sanitizeUTF8File(scriptfile);
      this.editor.load(fileToFileURL(scriptfile));
    }
    else {
      if (this.mode == "film" || this.mode == "av" || this.mode == "comic")
        this.editor.load(Cx.CONTENT_PATH + "editors/script_tmpl.html");
      else if (this.mode == "theatre")
        this.editor.load(Cx.LOCALE_PATH + "theatre_tmpl.html");
      else if (this.mode == "radio")
        this.editor.load(Cx.LOCALE_PATH + "audio_tmpl.html");
    }

    // The scratchpad editor
    if (this.scratchpad) {
      this.scratchpad.addEventListener("scriptload", this, false);
      this.scratchpad.addEventListener("scriptwillload", this, false);
      if (isReadableFile(scratchfile)) {
        sanitizeUTF8File(scratchfile);
        this.scratchpad.load(fileToFileURL(scratchfile));
      }
      else {
        if (this.mode == "film" || this.mode == "radio")
          this.scratchpad.load(Cx.CONTENT_PATH + "editors/scratch_tmpl.html");
        else if (this.mode == "theatre")
          this.scratchpad.load(Cx.CONTENT_PATH +
            "editors/theatrescratch_tmpl.html");
      }
    }

    this.editor.addEventListener("formatchanged", this, false);
  },


  close: function close () {
    var obs = getObserverService();
    obs.addObserver(this, "celtx:script:will-change-lock", false);
    obs.addObserver(this, "celtx:script:did-change-lock", false);

    this.activeEditor.removeEventListener("formatchanged", this, false);
    var editordoc = this.editor.contentDocument;
    editordoc.removeEventListener("focus", this, false);
    if (this.scratchpad) {
      var scratchdoc = this.scratchpad.contentDocument;
      scratchdoc.removeEventListener("focus", this, false);
    }
    editordoc.body.removeEventListener("click", this, false);
    editordoc.body.removeEventListener("dblclick", this, false);
    editordoc.body.removeEventListener("mouseover", this, false);
    editordoc.body.removeEventListener("mouseout", this, false);
    editordoc.body.removeEventListener("DOMNodeInserted", this, false);

    var ps = getPrefService().QueryInterface(
      Components.interfaces.nsIPrefBranch2);
    ps.removeObserver("celtx.script.breakdown.", this);

    this.sidebarController.shutdown();

    if (! this.editor.isLocked)
      this.editor.editor.transactionManager.RemoveListener(this);

    if (this.scratchpad)
      this.scratchpad.editor.transactionManager.RemoveListener(this);

    if (InlineSpellChecker.inlineSpellChecker &&
        InlineSpellChecker.inlineSpellChecker.enableRealTimeSpell)
      InlineSpellChecker.shutdown();
    this.sceneTracker.shutdown();
    gController.outlineView.close();

    try {
      if (! this.editor.isLocked)
        this.editor.editor.removeInsertionListener(this);

      var mgr = this.editor.editorElement.commandManager;
      var params = Components.classes["@mozilla.org/embedcomp/command-params;1"]
        .createInstance(Components.interfaces.nsICommandParams);
      params.setISupportsValue("removehook", this.clipboardSanitizer);
      mgr.doCommand("cmd_clipboardDragDropHook", params,
                    this.editor.contentWindow);
      if (this.scratchpad) {
        mgr = this.scratchpad.editorElement.commandManager;
        mgr.doCommand("cmd_clipboardDragDropHook", params,
                      this.scratchpad.contentWindow);
      }
    }
    catch (ex) {
      dump("*** close: " + ex + "\n");
    }
  },


  observe: function (aSubject, aTopic, aData) {
    if (aTopic == "nsPref:changed") {
      if (aData == "celtx.script.breakdown.visible")
        this.showBreakdownChanged();
      return;
    }

    if (aSubject != this.editor)
      return;

    if (aTopic == "celtx:script:will-change-lock") {
      if (aData == "locked") {
        this.editor.editor.removeInsertionListener(this);
        this.editor.editor.transactionManager.RemoveListener(this);
        InlineSpellChecker.shutdown();
      }
    }
    else if (aTopic == "celtx:script:did-change-lock") {
      if (aData == "unlocked") {
        this.editor.editor.addInsertionListener(this);
        this.editor.editor.transactionManager.AddListener(this);
        InlineSpellChecker.Init(this.editor.editor);
      }
    }
  },


  focus: function focus () {
    this._focused = true;

    document.getElementById("statusmsg").collapsed = false;
    if (this.activeEditor)
      this.activeEditor.setAttribute("type", "content-primary");

    this.showBreakdownChanged();

    this.resumeTimers();
    this.setStatusMessageToDefault();

    if (this.mode != "film")
      this.hideRevisionOptions();
    else if (this.editor.revisionNumber > 0)
      this.showRevisionToolbar();

    if (gController.outlineView) {
      gController.outlineView.showSceneNav();
      gController.outlineView.setDelegate(this);
    }
    // What's stealing the focus after focus() is called?
    if (this.activeEditor)
      setTimeout("gScriptController.activeEditor.contentWindow.focus()", 0);
    else if (this.editor)
      setTimeout("gScriptController.editor.contentWindow.focus()", 0);
  },


  blur: function blur () {
    document.getElementById("statusmsg").collapsed = true;
    if (this.inPrintPreview)
      PrintUtils.exitPrintPreview();
    this.suspendTimers();
    if (this.activeEditor)
      this.activeEditor.setAttribute("type", "content");
    var openwin = this.openwindows.spellcheck;
    if (openwin && ! openwin.closed)
      openwin.close();
    openwin = this.openwindows.findreplace;
    if (openwin && ! openwin.closed)
      openwin.close();
    gController.outlineView.setDelegate(null);

    this._focused = false;
  },


  save: function save () {
    try {
      this.saveCursorLocation();
    }
    catch (ex) {
      dump("*** saveCursorLocation: " + ex + "\n");
    }
    try {
      this.saveSidebarState();
    }
    catch (ex) {
      dump("*** saveSidebarState: " + ex + "\n");
    }

    var docs = [ { editor: this.editor, prefix: "script-", type: "primary" } ];
    if (this.scratchpad) {
      docs.push(
        { editor: this.scratchpad, prefix: "scratch-", type: "secondary" }
      );
    }
    var rand = generateID(3);

    for (var i = 0; i < docs.length; i++) {
      var scriptfile = this.getScriptFile(docs[i].type);
      if (! scriptfile) {
        scriptfile = this.project.projectFolder;
        scriptfile.append(docs[i].prefix + rand + '.html');
        scriptfile.createUnique(0, 0600);
        this.project.addFileToDocument(scriptfile, this.docres, docs[i].type);
      }

      try {
        this.saveToFile(docs[i].editor, scriptfile);
        docs[i].editor.resetModificationCount();
        this._modified = false;
      }
      catch (ex) {
        throw ex;
      }
      finally {
        gController.updateCommands();
      }
    }
  },


  saveToFile: function saveToFile (editor, scriptfile) {
    if (! editor.isLocked) {
      if (editor.editor.documentCharacterSet != "UTF-8")
        editor.editor.documentCharacterSet = "UTF-8";
    }

    var persist = getWebBrowserPersist();
    var doc = editor.contentDocument;
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

    var IPersist = Components.interfaces.nsIWebBrowserPersist;

    // TODO: more output flags? see ComposerCommands.js
    var flags = IPersist.ENCODE_FLAGS_WRAP
      | IPersist.ENCODE_FLAGS_ENCODE_LATIN1_ENTITIES
      | IPersist.ENCODE_FLAGS_FORMATTED;
    // See bug 299: Unintended space inserted on save. CJK languages are
    // written with infrequent spaces (if any at all), so each paragraph
    // can potentially be one unbroken line. 5,000 characters ought
    // to be more than enough.
    var wrap = 5000;

    // TODO: other flags?
    persist.persistFlags  = persist.persistFlags
      | IPersist.PERSIST_FLAGS_NO_BASE_TAG_MODIFICATIONS
      | IPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES
      | IPersist.PERSIST_FLAGS_DONT_FIXUP_LINKS
      | IPersist.PERSIST_FLAGS_DONT_CHANGE_FILENAMES
      | IPersist.PERSIST_FLAGS_FIXUP_ORIGINAL_DOM;

    // Only "text/html" will use the nsHTMLContentSerializer, which strips
    // out _moz_dirty attributes and pretty prints the output.
    var outputType = "text/html";
    persist.saveDocument(doc, scriptfile, null, outputType, flags, wrap);
  },


  saveCursorLocation: function saveCursorLocation () {
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


  restoreCursorLocation: function restoreCursorLocation () {
    // If it's newly created, stick the cursor at the end
    // and be done with it.

    // Don't restore the cursor on a locked script
    if (this.editor.isLocked)
      return;

    if (! isReadableFile(this.getScriptFile("primary"))) {
      var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
      var para = this.editor.contentDocument.body.lastChild;
      while (para && ! (para instanceof IPara))
        para = para.previousSibling;
      if (para) {
        // Audio play special-case
        if (this.mode == "radio")
          this.editor.selection.collapse(para.firstChild, 1);
        else
          this.editor.selection.collapse(para, 0);
      }
      return;
    }

    var pref = getPrefService().getBranch("celtx.project.");
    try {
      var docid = this.docres.Value.replace(/^.*\//, "");
      var pos = pref.getCharPref(this.project.id + "." + docid + ".cursor");
      if (! pos)
        throw "No saved position";
      var posbits = pos.split(",");
      if (posbits.length == 3) {
        pos = posbits[0];
        var xpe = new XPathEvaluator();
        var block = xpe.evaluate(pos, this.editor.contentDocument, null,
                                 XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (! block.singleNodeValue)
          throw "Unable to locate last cursor position";
        var focusNode = block.singleNodeValue.childNodes[Number(posbits[1])];
        var focusOffset = Number(posbits[2]);
        var sel = this.editor.selection;
        sel.removeAllRanges();
        var range = this.editor.contentDocument.createRange();
        range.setStart(focusNode, focusOffset);
        range.setEnd(focusNode, focusOffset);
        sel.addRange(range);
        if (! this.editor.currentParagraph)
          throw "Didn't collapse on an actual paragraph";
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
        if (! this.editor.currentParagraph)
          throw "Didn't collapse on an actual paragraph";
      }
    }
    catch (ex) {
      var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
      var para = this.editor.contentDocument.body.firstChild;
      while (para && ! (para instanceof IPara))
        para = para.nextSibling;
      if (para)
        this.editor.selection.collapse(para, 0);
    }
    try {
      if (! this.editor.currentParagraph)
        throw "Cursor still isn't in a paragraph element";
      var selCtrl = this.editor.selectionController;
      selCtrl.scrollSelectionIntoView(1, 1, true);
    }
    catch (ex) {
      // I've had this throw before
      dump("*** scrollSelectionIntoView: " + ex + "\n");
    }
  },


  updateSidebarStatus: function () {
    var sidebar = document.getElementById("sidebar");
    var menuitem = top.document.getElementById("menu-toggle-sidebar");
    var toolbaritem = document.getElementById("celtx-sidebar-button");
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
    if (state == "close") {
      sidebar.collapsed = true;
    }
    else {
      sidebar.collapsed = false;
      if (state)
        this.sidebarController.showSidebarItemById(state);
    }
    this.updateSidebarStatus();
  },


  updateAutoText: function updateAutoText () {
    var block = this.editor.currentParagraph;
    // Wrap it? Probably not, this isn't really a mutation event.
    if (! block)
      return;
    var btype = block.className;
    var count = this.editor.modificationCount;

    var completeScenes = false;
    var completeChars = false;
    var completeShots = false;
    var completeSounds = false;
    var ps = getPrefService().getBranch("celtx.scripteditor.autocomplete.");
    try {
      completeScenes = ps.getBoolPref(this.mode + ".sceneheading");
    }
    catch (ex) {}
    try {
      completeChars = ps.getBoolPref(this.mode + ".character");
    }
    catch (ex) {}
    try {
      completeShots = ps.getBoolPref(this.mode + ".shot");
    }
    catch (ex) {}
    try {
      completeSounds = ps.getBoolPref(this.mode + ".sound");
    }
    catch (ex) {}

    var popup = gAutoComplete.popup;
    if (popup && popup.isOpen) {
      if (! ((btype == "character" && completeChars) ||
          (btype == "sceneheading" && completeScenes) ||
          (btype == "shot" && completeShots) ||
          ((btype == "sound" || btype == "music" || btype == "voice")
          && completeSounds )) || this.editor.isTextSelected)
        popup.close();
    }

    var changedBlock = null;
    if (! this.lastBlock) {
      this.lastBlock = block;
      this.lastBlockClass = block.className;
    }
    else if (this.lastBlock == block) {
      if (this.lastModCount != count) {
        changedBlock = block;
      }
      if (this.lastBlockClass != "character" && block.className == "character") {
        gCharacterTracker.autoAddCharacter(stringify(block));
      }
    }
    else {
      // Different block
      var modified = false;
      if (this.lastModCount != count) {
        changedBlock = this.lastBlock;
        modified = true;
      }

      switch (this.lastBlock.className) {
        case "character":
          {
            var txt = stringify(this.lastBlock);
            if (completeChars)
              gAutoComplete.addCharacter(txt);
            // Only add characters to breakdown if the character paragraph
            // was edited by the user.
            if (txt != this.lastText) {
              gCharacterTracker.autoAddCharacter(txt);
            }
          }
          break;
        case "sceneheading":
          if (completeScenes)
            gAutoComplete.addHeading(stringify(this.lastBlock));
          break;
        case "sound":
        case "music":
        case "voice":
          if (completeSounds)
            gAutoComplete.addSound(stringify(this.lastBlock),
              this.lastBlock.className);
          break;
        case "shot":
          // We're not storing shots
          break;
      }

      this.lastBlock = block;
      this.lastText = stringify(block);
    }

    this.lastModCount = count;
    this.lastBlockClass = block.className;

    if (this != gController._activeController)
      return;

    if (changedBlock == block) {
      switch (changedBlock.className) {
        case "character":
          if (completeChars)
            gAutoComplete.showPopup(changedBlock);
          break;
        case "sceneheading":
          if (completeScenes)
            gAutoComplete.showPopup(changedBlock);
          break;
        case "sound":
        case "music":
        case "voice":
          if (completeSounds)
            gAutoComplete.showPopup(changedBlock);
          break;
        case "shot":
          if (completeShots)
            gAutoComplete.showPopup(changedBlock);
          break;
      }
    }
  },


  lookupStyleName: function (id) {
    // KLUDGE: style names aren't in a properties file, only a DTD
    var formats = document.getElementById("format-menu-popup");
    for (var i = 0; i < formats.childNodes.length; i++) {
      var item = formats.childNodes[i];
      if (item.value == id) return item.label;
    }
    return "";
  },


  updateStyleHint: function updateStyleHint () {
    var ps = getPrefService().getBranch("celtx.scripteditor."
      + this.mode + ".");
    var para = this.editor.currentParagraph;
    if (! para)
      return;
    var style = para.className ? para.className : "text";
    var tabstyle = "";
    var enterstyle = "";
    var atEnd = this.editor.atEndOfParagraph(this.editor.selection);
    var isBlank = stringify(para) == "";

    try {
      tabstyle = ps.getCharPref("tab." + style);
    }
    catch (ex) {
      tabstyle = ps.getCharPref("tab.default");
    }
    tabstyle = this.lookupStyleName(tabstyle);
    var hint = gApp.getText("TabHint") + " " + tabstyle;

    if (atEnd) {
      try {
        if (isBlank)
          enterstyle = ps.getCharPref("blankenter." + style);
        else
          enterstyle = ps.getCharPref("enter." + style);
      }
      catch (ex) {
        if (isBlank)
          enterstyle = ps.getCharPref("blankenter.default");
        else
          enterstyle = ps.getCharPref("enter.default");
      }
      enterstyle = this.lookupStyleName(enterstyle);
      hint += ", " + gApp.getText("EnterHint") + " " + enterstyle;
    }
    else {
      // The  enter hint just clarifies node splitting behaviour
      enterstyle = this.lookupStyleName(style);
      hint += ", " + gApp.getText("EnterHint") + " " + enterstyle;
    }

    this.setStatusMessage(hint);
  },


  // Outline tree functions

  onSceneSelect: function onSceneSelect (event) {
    gController.updateCommands();
    var sceneid = gController.outlineView.getSelectedSceneID();
    gCardController.onSceneSelect(sceneid);
  },


  onActSelect: function onActSelect (event) {
    gController.updateCommands();
  },


  onShotSelect: function onShotSelect (event) {
    // gController.updateCommands();
    // var sceneid = gController.outlineView.getSelectedShotID();
    // gCardController.onSceneSelect(sceneid);
  },


  // Called by scene tree in script outline panel
  moveSceneToIndex: function moveSceneToIndex (sceneid, index) {
    if (this.editor.isLocked) {
      dump("*** moveSceneToIndex: Editor is locked\n");
      return;
    }

    var oldindex = this.editor.scenePosition(sceneid);
    if (oldindex < 1)
      return;
    // Compensate for truncation of the segment after the current index
    // is removed.
    if (oldindex < index)
      --index;
    if (oldindex == index)
      return;
    this.sceneTracker.suppressEvents = true;
    try {
      this.editor.moveScene(oldindex, index);
    }
    catch (ex) {
      dump("*** moveSceneToIndex: " + ex + "\n");
    }
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();
  },


  // Called by scene tree in script outline panel
  moveActToIndex: function moveActToIndex (actid, index) {
    if (this.editor.isLocked) {
      dump("*** moveActToIndex: Editor is locked\n");
      return;
    }

    var oldindex = this.editor.actPosition(actid);
    if (oldindex < 1)
      return;
    // Compensate for truncation of the segment after the current index
    // is removed.
    if (oldindex < index)
      --index;
    if (oldindex == index)
      return;
    this.sceneTracker.suppressEvents = true;
    try {
      this.editor.moveAct(oldindex, index);
    }
    catch (ex) {
      dump("*** moveActToIndex: " + ex + "\n");
    }
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();
  },
  
  
  // Called by scene tree in script outline panel
  moveSceneToAct: function moveSceneToAct (sceneid, actid, index) {
    if (this.editor.isLocked) {
      dump("*** moveSceneToAct: Editor is locked\n");
      return;
    }

    var doc = this.editor.contentDocument;
    var act = doc.getElementById(actid);
    if (! act) return;
    var scene = doc.getElementById(sceneid);
    if (! scene) return;
    var dstscene = nextElement(act);
    var count = index;
    // Find the shot it goes before
    while (dstscene) {
      if ((dstscene.className == "sceneheading" && --count <= 0) ||
          dstscene.className == "act")
        break;
      dstscene = nextElement(dstscene);
    }

    // Create the scene range
    var rng = doc.createRange();
    rng.setStartBefore(scene);
    var node = nextElement(scene);
    while (node) {
      if (node.className == 'sceneheading' || node.className == 'act')
        break;
      node = nextElement(node);
    }
    if (node) {
      rng.setEndBefore(node);
    }
    else {
      // Hit end of document
      rng.setEndAfter(doc.body.lastChild);
    }
    var frag = rng.cloneContents();

    this.project.ds.beginUpdateBatch();
    this.editor.editor.beginTransaction();
    this.sceneTracker.suppressEvents = true;
    try {
      rng.deleteContents();
      // Determine the correct new place to insert
      // Offset of node within body
      var bodypos = dstscene ? offsetInParent(dstscene)
                             : doc.body.childNodes.length;
      this.editor.editor.insertNode(frag, doc.body, bodypos);
    }
    catch (ex) {
      dump("*** moveSceneToAct: " + ex + "\n");
    }
    this.editor.editor.endTransaction();
    this.project.ds.endUpdateBatch();
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();
  },


  moveShotTo: function moveShotTo (shotid, sceneid, index) {
    if (this.editor.isLocked) {
      dump("*** moveShotTo: Editor is locked\n");
      return;
    }

    var doc = this.editor.contentDocument;
    var shot = doc.getElementById(shotid);
    if (! shot) return;
    var scene = doc.getElementById(sceneid);
    if (! scene) return;
    var dstshot = nextElement(scene);
    var count = index;
    // Find the shot it goes before
    while (dstshot) {
      if ((dstshot.className == "shot" && --count <= 0) ||
          dstshot.className == "sceneheading")
        break;
      dstshot = nextElement(dstshot);
    }

    // Create the shot range
    var rng = doc.createRange();
    rng.setStartBefore(shot);
    var node = nextElement(shot);
    while (node) {
      if (node.className == 'sceneheading' || node.className == 'shot')
        break;
      node = nextElement(node);
    }
    if (node) {
      rng.setEndBefore(node);
    }
    else {
      // Hit end of document
      rng.setEndAfter(doc.body.lastChild);
    }
    var frag = rng.cloneContents();

    this.project.ds.beginUpdateBatch();
    this.editor.editor.beginTransaction();
    this.sceneTracker.suppressEvents = true;
    try {
      rng.deleteContents();
      // Determine the correct new place to insert
      // Offset of node within body
      var bodypos = dstshot ? offsetInParent(dstshot)
                            : doc.body.childNodes.length;
      this.editor.editor.insertNode(frag, doc.body, bodypos);
    }
    catch (ex) {
      dump("*** moveShotTo: " + ex + "\n");
    }
    this.editor.editor.endTransaction();
    this.project.ds.endUpdateBatch();
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();
  },


  cmdTreeitemDown: function cmdTreeitemDown () {
    if (this.editor.isLocked) {
      dump("*** cmdTreeitemDown: Editor is locked\n");
      return;
    }

    if (this.mode == "theatre") {
      this.cmdTreeitemDown_theatre();
      return;
    }
    else if (this.mode == "av" || this.mode == "comic") {
      this.cmdTreeitemDown_av();
      return;
    }
    var res = gController.outlineView.getSelectedScene();
    var id = gController.outlineView.getSelectedSceneID();
    var pos = this.editor.scenePosition(id);
    this.sceneTracker.suppressEvents = true;
    try {
      this.editor.moveScene(pos, pos + 1);
    }
    catch (ex) {
      dump("*** cmdTreeItemDown: " + ex + "\n");
    }
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();
    gController.outlineView.selectScene(res);
  },


  cmdTreeitemDown_theatre: function cmdTreeitemDown_theatre () {
    try {
    var rdfsvc = getRDFService();
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
    var actidarc = rdfsvc.GetResource(Cx.NS_CX + "actid");
    var res = gController.outlineView.getSelectedScene();
    var isscene = true;
    if (! res) {
      isscene = false;
      res = gController.outlineView.getSelectedAct();
    }
    if (! res)
      return;

    this.sceneTracker.suppressEvents = true;
    try {
      var id = gController.outlineView.getSelectedID();
      if (! isscene) {
        var pos = this.editor.actPosition(id);
        this.editor.moveAct(pos, pos + 1);
      }
      else {
        var scenetree = gController.outlineView.gWindow.sceneTree;
        var idx = scenetree.view.getIndexOfResource(res);
        var parentidx = scenetree.view.getParentIndex(idx);
        var actres = scenetree.view.getResourceAtIndex(parentidx);
        if (! actres)
          throw "No sceneres at index " + idx;
        var actseq = new RDFSeq(this.project.ds, actres);
        var actid = getRDFString(this.project.ds, actres, actidarc);
        var pos = actseq.indexOf(res) + 1;
        if (pos == actseq.length) {
          pos = 1;
          actid = this.editor.actAt(
            this.editor.actPosition(actid) + 1).id;
          if (! actid)
            return;
        }
        else {
          pos += 2; // Account for itself as well
        }
        this.moveSceneToAct(id, actid, pos);
      }
    }
    catch (ex) {
      dump("*** cmdTreeitemDown_theatre: " + ex + "\n");
    }
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();
    gController.outlineView.selectScene(res);
    }
    catch (ex) {
      dump("*** cmdTreeitemDown_theatre: " + ex + "\n");
    }
  },


  cmdTreeitemDown_av: function cmdTreeitemDown_av () {
    try {
    var rdfsvc = getRDFService();
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
    var res = gController.outlineView.getSelectedScene();
    var isscene = true;
    if (! res) {
      isscene = false;
      res = gController.outlineView.getSelectedShot();
    }
    if (! res)
      return;

    this.sceneTracker.suppressEvents = true;
    try {
      var id = gController.outlineView.getSelectedID();
      if (isscene) {
        var pos = this.editor.scenePosition(id);
        this.editor.moveScene(pos, pos + 1);
      }
      else {
        var scenetree = gController.outlineView.gWindow.sceneTree;
        var idx = scenetree.view.getIndexOfResource(res);
        var parentidx = scenetree.view.getParentIndex(idx);
        var sceneres = scenetree.view.getResourceAtIndex(parentidx);
        if (! sceneres)
          throw "No sceneres at index " + idx;
        var sceneseq = new RDFSeq(this.project.ds, sceneres);
        var sceneid = getRDFString(this.project.ds, sceneres, sceneidarc);
        var pos = sceneseq.indexOf(res) + 1;
        if (pos == sceneseq.length) {
          pos = 1;
          sceneid = this.editor.sceneAt(
            this.editor.scenePosition(sceneid) + 1).id;
          if (! sceneid)
            return;
        }
        else {
          pos += 2; // Account for itself as well
        }
        this.moveShotTo(id, sceneid, pos);
      }
    }
    catch (ex) {
      dump("*** cmdTreeitemDown_av: " + ex + "\n");
    }
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();
    gController.outlineView.selectScene(res);
    }
    catch (ex) {
      dump("*** cmdTreeitemDown: " + ex + "\n");
    }
  },


  cmdTreeitemUp: function cmdTreeitemUp () {
    if (this.editor.isLocked) {
      dump("*** cmdTreeitemUp: Editor is locked\n");
      return;
    }

    if (this.mode == "theatre") {
      this.cmdTreeitemUp_theatre();
      return;
    }
    else if (this.mode == "av" || this.mode == "comic") {
      this.cmdTreeitemUp_av();
      return;
    }
    var res = gController.outlineView.getSelectedScene();
    var id = gController.outlineView.getSelectedSceneID();
    var pos = this.editor.scenePosition(id);
    this.sceneTracker.suppressEvents = true;
    try {
      this.editor.moveScene(pos, pos - 1);
    }
    catch (ex) {
      dump("*** cmdTreeitemUp: " + ex + "\n");
    }
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();
    gController.outlineView.selectScene(res);
  },


  cmdTreeitemUp_theatre: function cmdTreeitemUp_theatre () {
    try {
    var rdfsvc = getRDFService();
    var actidarc = rdfsvc.GetResource(Cx.NS_CX + "actid");
    var res = gController.outlineView.getSelectedScene();
    var isscene = true;
    if (! res) {
      isscene = false;
      res = gController.outlineView.getSelectedAct();
    }
    if (! res)
      return;

    this.sceneTracker.suppressEvents = true;
    try {
      var id = gController.outlineView.getSelectedID();
      if (! isscene) {
        var pos = this.editor.actPosition(id);
        this.editor.moveAct(pos, pos - 1);
      }
      else {
        var scenetree = gController.outlineView.gWindow.sceneTree;
        var idx = scenetree.view.getIndexOfResource(res);
        var parentidx = scenetree.view.getParentIndex(idx);
        var actres = scenetree.view.getResourceAtIndex(parentidx);
        if (! actres)
          throw "No actres at index " + idx;
        var actseq = new RDFSeq(this.project.ds, actres);
        var actid = getRDFString(this.project.ds, actres, actidarc);
        var pos = actseq.indexOf(res) + 1;
        if (pos == 1) {
          actid = this.editor.actAt(this.editor.actPosition(actid) - 1).id;
          if (! actid)
            return;
          actres = this.sceneTracker.actForActID(actid);
          actseq = new RDFSeq(this.project.ds, actres);
          pos = actseq.length + 1;
        }
        else {
          --pos;
        }
        this.moveSceneToAct(id, actid, pos);
      }
    }
    catch (ex) {
      dump("*** cmdTreeitemUp_theatre: " + ex + "\n");
    }
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();
    gController.outlineView.selectScene(res);
    }
    catch (ex) {
      dump("*** cmdTreeitemUp_theatre: " + ex + "\n");
    }
  },


  cmdTreeitemUp_av: function cmdTreeitemUp_av () {
    try {
    var rdfsvc = getRDFService();
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
    var res = gController.outlineView.getSelectedScene();
    var isscene = true;
    if (! res) {
      isscene = false;
      res = gController.outlineView.getSelectedShot();
    }
    if (! res)
      return;

    this.sceneTracker.suppressEvents = true;
    try {
      var id = gController.outlineView.getSelectedID();
      if (isscene) {
        var pos = this.editor.scenePosition(id);
        this.editor.moveScene(pos, pos - 1);
      }
      else {
        var scenetree = gController.outlineView.gWindow.sceneTree;
        var idx = scenetree.view.getIndexOfResource(res);
        var parentidx = scenetree.view.getParentIndex(idx);
        var sceneres = scenetree.view.getResourceAtIndex(parentidx);
        if (! sceneres)
          throw "No sceneres at index " + idx;
        var sceneseq = new RDFSeq(this.project.ds, sceneres);
        var sceneid = getRDFString(this.project.ds, sceneres, sceneidarc);
        var pos = sceneseq.indexOf(res) + 1;
        if (pos == 1) {
          sceneid = this.editor.sceneAt(
            this.editor.scenePosition(sceneid) - 1).id;
          if (! sceneid)
            return;
          sceneres = this.sceneTracker.sceneForSceneID(sceneid);
          sceneseq = new RDFSeq(this.project.ds, sceneres);
          pos = sceneseq.length + 1;
        }
        else {
          --pos;
        }
        this.moveShotTo(id, sceneid, pos);
      }
    }
    catch (ex) {
      dump("*** cmdTreeitemUp_av: " + ex + "\n");
    }
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();
    gController.outlineView.selectScene(res);
    }
    catch (ex) {
      dump("*** cmdTreeitemUp: " + ex + "\n");
    }
  },


  cmdTreeitemRecycle: function cmdTreeitemRecycle () {
    if (this.editor.isLocked) {
      dump("*** cmdTreeitemRecycle: Editor is locked\n");
      return;
    }

    var ps = getPromptService();
    var title = gApp.getText("RecycleScene");
    var msg = gApp.getText("RecycleScenePrompt");
    if (! ps.confirm(window, title, msg))
      return;
    var id = gController.outlineView.getSelectedSceneID();
    var fragment = this.editor.rangeOfScene(id).cloneContents();
    this.scratchpad.importScene(fragment);
    this.scratchpad.scrollY =
      this.scratchpad.editorElement.contentWindow.scrollMaxY;
    this.sceneTracker.suppressEvents = true;
    try {
      this.editor.deleteScene(id);
    }
    catch (ex) {
      dump("*** cmdTreeitemRecycle: " + ex + "\n");
    }
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();
  },


  cmdTreeitemDelete: function cmdTreeitemDelete () {
    if (this.editor.isLocked) {
      dump("*** cmdTreeitemDelete: Editor is locked\n");
      return;
    }

    var isscene = true;
    var isshot = false;
    var id = gController.outlineView.getSelectedSceneID();
    if (! id) {
      isscene = false;
      id = gController.outlineView.getSelectedShotID();
      if (id)
        isshot = true;
      else
        id = gController.outlineView.getSelectedID();
    }
    if (! id)
      return;

    var ps = getPromptService();
    var title = null;
    var msg = null;
    if (isscene) {
      title = gApp.getText("DeleteScene");
      msg = gApp.getText("DeleteScenePrompt");
    }
    else if (isshot) {
      title = gApp.getText("DeleteShot");
      msg = gApp.getText("DeleteShotPrompt");
    }
    else {
      title = gApp.getText("DeleteAct");
      msg = gApp.getText("DeleteActPrompt");
    }
    if (! ps.confirm(window, title, msg))
      return;

    this.sceneTracker.suppressEvents = true;
    try {
      if (isscene)
        this.editor.deleteScene(id);
      else if (! isshot)
        this.editor.deleteAct(id);
      else {
        // Create the shot range since we don't have an editor.deleteShot
        var shot = this.editor.contentDocument.getElementById(id);
        var rng = doc.createRange();
        rng.setStartBefore(shot);
        var node = nextElement(shot);
        while (node) {
          if (node.className == 'sceneheading' || node.className == 'shot')
            break;
          node = nextElement(node);
        }
        if (node) {
          rng.setEndBefore(node);
        }
        else {
          // Hit end of document
          rng.setEndAfter(doc.body.lastChild);
        }
        this.editor.beginTransaction();
        try {
          rng.deleteContents();
        }
        catch (ex) {
          dump("*** cmdTreeitemDelete: " + ex + "\n");
        }
        this.editor.endTransaction();
      }
    }
    catch (ex) {
      dump("*** cmdTreeitemDelete: " + ex + "\n");
    }
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();
  },


  cmdTreeitemGoto: function cmdTreeitemGoto () {
    if (this.activeEditor != this.editor)
      this.editor.contentWindow.focus();
    var id = gController.outlineView.getSelectedID()
    if (! id)
      return;
    this.editor.cursorToScene(id);
    this.editor.contentWindow.focus();
    // Is a SceneTracker update needed?
  },


  cmdRecycleSelection: function cmdRecycleSelection () {
    if (this.editor.isLocked) {
      dump("*** cmdRecycleSelection: Editor is locked\n");
      return;
    }

    var ps = getPromptService();
    var title = gApp.getText("RecycleSelection");
    var msg = gApp.getText("RecycleSelectionPrompt");
    if (! ps.confirm(window, title, msg))
      return;

    const nsIDOMNode = Components.interfaces.nsIDOMNode;
    try {
      var sel = this.editor.selection;
      if (sel.rangeCount == 0)
        throw "Selection does not include any ranges";
      if (sel.rangeCount > 1)
        throw "Selection includes multiple ranges";
      var range = sel.getRangeAt(0);
      var fragment = range.cloneContents();
      if (range.startContainer == range.endContainer &&
          range.startContainer.nodeType == nsIDOMNode.TEXT_NODE) {
        var para = this.editor.contentDocument.createElement("p");
        var parent = range.startContainer.parentNode;
        para.setAttribute("class", parent.getAttribute("class"));
        para.appendChild(fragment.childNodes[0]);
        fragment.appendChild(para);
      }

      this.scratchpad.importScene(fragment);
      this.scratchpad.scrollY =
        this.scratchpad.editorElement.contentWindow.scrollMaxY;
      this.editor.deleteSelection();
    }
    catch (ex) {
      dump("*** cmdRecycleSelection: " + ex + "\n");
    }
  },


  cmdToggleDualDialog: function cmdToggleDualDialog () {
    if (this.editor.isLocked) {
      dump("*** cmdToggleDualDialog: Editor is locked\n");
      return;
    }

    var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
    var sel = this.editor.selection;
    var paras = [];
    if (sel.isCollapsed) {
      if (this.editor.currentParagraph.className == "character")
        paras.push(this.editor.currentParagraph);
    }
    else {
      var range = sel.getRangeAt(0);
      var start = range.startContainer;
      var end = range.endContainer;
      while (start && ! (start instanceof IPara))
        start = start.parentNode;
      while (end && ! (end instanceof IPara))
        end = end.parentNode;
      if (! (start && end))
        return;
      var node = start;
      while (node != end) {
        if ((node instanceof IPara) && node.className == "character")
          paras.push(node)
        node = nextElement(node);
      }
      if (end.className == "character")
        paras.push(end);
    }
    if (paras.length == 0)
      return;
    this.editor.editor.beginTransaction();
    if (paras[0].hasAttribute("dual")) {
      for (var i = 0; i < paras.length; ++i)
        this.editor.editor.removeAttribute(paras[i], "dual");
    }
    else {
      for (var i = 0; i < paras.length; ++i)
        this.editor.editor.setAttribute(paras[i], "dual", "true");
    }
    this.editor.editor.endTransaction();
  },


  cmdToggleScratchpad: function cmdToggleScratchpad () {
    dump("*** cmdToggleScratchpad: No longer functional.\n");
    printStackTrace();
    return;

    var collapsed = this.scratchpad.collapsed;
    document.getElementById("scriptsplitter").hidden = ! collapsed;
    this.scratchpad.collapsed = ! collapsed;
  },


  showScratchpad: function () {
    if (! this.scratchpad)
      return;
    document.getElementById("scriptsplitter").hidden = false;
    this.editor.setAttribute("type", "content");
    this.scratchpad.collapsed = false;
    this.scratchpad.setAttribute("type", "content-primary");
    this.scratchpad.contentWindow.focus();
  },


  hideScratchpad: function () {
    if (! this.scratchpad)
      return;
    document.getElementById("scriptsplitter").hidden = true;
    this.editor.setAttribute("type", "content-primary");
    this.scratchpad.collapsed = true;
    this.scratchpad.setAttribute("type", "content");
    this.editor.contentWindow.focus();
  },


  cmdTogglePagination: function cmdTogglePagination () {
    this.suspendTimers();
    try {
      var enabled = ! this.scriptConfig.showPageNumbers;
      this.scriptConfig.showPageNumbers = enabled;
      this.setStatusMessageToDefault();
      this.scriptConfig.update();
    }
    catch (ex) {
      dump("*** cmdTogglePagination: " + ex + "\n");
    }
    this.resumeTimers();
  },


  cmdPageSetup: function cmdPageSetup () {
    var pagesettings = {
      accepted:         false,
      mode:             this.mode,
      paperSize:        this.scriptConfig.size,
      pageNumbers:      this.scriptConfig.showPageNumbers,
      firstPageNumber:  this.scriptConfig.showFirstPageNumber,
      sceneNumbers:     this.scriptConfig.sceneNumbering,
      charNumbers:      this.scriptConfig.showCharNumbers,
      dialogNumbers:    this.scriptConfig.showDialogNumbers
    };

    pagesettings.disableSceneNumbers = (this.mode != "film");
    pagesettings.showCharCheckbox = this.mode == "radio";
    if (this.mode == "av" || this.mode == "comic") {
      pagesettings.hideSceneNumbers = true;
      pagesettings.hidePageNumbers = true;
    }

    if (! gWindow.inCardView)
      this.suspendTimers();
    
    window.openDialog(Cx.CONTENT_PATH + "editors/scriptpagesetup.xul",
                      "_blank", Cx.MODAL_DIALOG_FLAGS, pagesettings);

    if (pagesettings.accepted) {
      this._modified = true;

      var ps = getPrefService().getBranch("celtx.scripteditor.");
      ps.setCharPref("papersize", pagesettings.paperSize);

      this.scriptConfig.size                = pagesettings.paperSize;
      if (this.scratchpad)
        this.scratchConfig.size             = pagesettings.paperSize;
      this.scriptConfig.sceneNumbering      = pagesettings.sceneNumbers;
      this.scriptConfig.showPageNumbers     = pagesettings.pageNumbers;
      this.scriptConfig.showFirstPageNumber = pagesettings.firstPageNumber;
      this.scriptConfig.showCharNumbers     = pagesettings.charNumbers;
      this.scriptConfig.showDialogNumbers   = pagesettings.dialogNumbers;
      this.scriptConfig.update();

      this.setStatusMessageToDefault();
    }

    if (! gWindow.inCardView)
      this.resumeTimers();
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


  establishPrintSettings: function () {
    gApp.resetPrintingPrefs(! this.scriptConfig.showPageNumbers);
    if (this.scriptConfig.showPageNumbers)
      gApp.setPrintMargins(0.25, isWin() ? 0.1875 : 0, 0.5, 0);
    else
      gApp.setPrintMargins(0.6, isWin() ? 0.1875 : 0, 0.5, 0);

    var label = this.getRevisionLabel();
    var date = this.getRevisionDate();

    if (! (label || date))
      return;

    var printSettings = PrintUtils.getPrintSettings();
    if (label && date)
      printSettings.headerStrCenter = label + " - " + date;
    else if (label)
      printSettings.headerStrCenter = label;
    else
      printSettings.headerStrCenter = date;

    var PSSVC = Components.classes["@mozilla.org/gfx/printsettings-service;1"]
      .getService(Components.interfaces.nsIPrintSettingsService);
    var flags = printSettings.kInitSaveHeaderCenter;
    PSSVC.savePrintSettingsToPrefs(printSettings, true, flags);
  },


  cmdPrint: function cmdPrint () {
    if (! this.inPrintPreview) {
      this.suspendTimers();

      if (this.scriptConfig.showPageNumbers)
        gPaginator.adjustSynchronously();

      this.editor.contentWindow.focus();
      this.establishPrintSettings();
    }

    PrintUtils.print();

    if (! this.inPrintPreview)
      this.resumeTimers();
  },


  editTitlePageCallback: function editTitlePageCallback (config) {
    try {
      var tagmap = {
        "author": "Author",
        "source": "DC.source",
        "rights": "DC.rights",
        "contact": "CX.contact",
        "byline": "CX.byline"
      };
      var tags = {};
      var doc = this.editor.contentDocument;
      var head = doc.documentElement.firstChild;
      var metas = head.getElementsByTagName("meta");
      for (var i = 0; i < metas.length; i++) {
        var meta = metas[i];
        for (var tagname in tagmap) {
          if (meta.name == tagmap[tagname]) {
            tags[tagname] = meta;
            break;
          }
        }
      }

      this.editor.title = config.title;

      for (var tagname in tagmap) {
        if (! tags[tagname]) {
          tags[tagname] = doc.createElement("meta");
          tags[tagname].setAttribute("name", tagmap[tagname]);
          head.appendChild(tags[tagname]);
        }
        tags[tagname].setAttribute("content", config[tagname]);
      }
    }
    catch (ex) {
      dump("*** editTitlePageCallback: " + ex + "\n");
    }
  },


  cmdEditTitlePage: function cmdEditTitlePage () {
    var config = {
      accepted: false,
      title: this.editor.title,
      byline: gApp.getText("TitlePageBy"),
      author: "",
      rights: gApp.getText("Copyright"),
      source: "",
      contact: ""
    };
    var tagmap = {
      "author": "Author",
      "source": "DC.source",
      "rights": "DC.rights",
      "contact": "CX.contact",
      "byline": "CX.byline"
    };
    var tags = {};
    var doc = this.editor.contentDocument;
    var head = doc.documentElement.firstChild;
    var metas = head.getElementsByTagName("meta");
    for (var i = 0; i < metas.length; i++) {
      var meta = metas[i];
      for (var tagname in tagmap) {
        if (meta.name == tagmap[tagname]) {
          config[tagname] = meta.content;
          tags[tagname] = meta;
          break;
        }
      }
    }

    window.openDialog(Cx.CONTENT_PATH + "editors/titlepage.xul", "_blank",
                      "centerscreen,chrome", config);
  },

  
  cmdImportScript: function cmdImportScript () {
    try {
      var fp = getFilePicker();
      fp.init(window, gApp.getText("ImportTextScript"), fp.modeOpen);
      fp.appendFilters(fp.filterText);
      if (fp.show() != fp.returnOK) return;

      var mimeType = getMIMEService().getTypeFromFile(fp.file);
      if (mimeType != "text/plain") {
        window.alert(app.text("unsupportedMediaMsg") + " (" + mimeType + ")");
        return;
      }

      var callbacks = {
        target:      this,
        beginImport: "beginSceneImport",
        importScene: "importScene",
        endImport:   "endSceneImport"
      };

      window.openDialog(Cx.CONTENT_PATH + "editors/importdialog.xul",
                        "_blank",
                        Cx.MODAL_DIALOG_FLAGS,
                        fp.fileURL.spec,
                        fp.file.leafName,
                        callbacks);
    }
    catch (ex) {
      dump("*** cmdImportScript: " + ex + "\n");
    }
  },


  beginSceneImport: function beginSceneImport () {
    this.sceneTracker.suppressEvents = true;
    this.editor.beginSceneImport();
  },


  endSceneImport: function endSceneImport () {
    var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
    this.editor.endSceneImport();
    this.clipboardSanitizer.convertUnsupportedClasses();
    gAutoComplete.findCharacters();
    var firstPara = this.editor.contentDocument.body.firstChild;
    while (firstPara && ! firstPara instanceof IPara)
      firstPara = firstPara.nextSibling;
    if (firstPara)
      this.editor.selection.collapse(firstPara, 0);
    this.sceneTracker.suppressEvents = false;
    this.sceneTracker.update();

    var breakdownController = this.sidebarController.breakdownController;
    setTimeout(function () {
      breakdownController.findChars();
    }, 100);
  },


  importScene: function importScene (sceneNode) {
    if (! sceneNode) return;

    try {
      this.editor.importScene(sceneNode);  
    }
    catch (ex) {
      dump("*** importScene: " + ex + "\n");
    }
  },


  cmdExportScript: function cmdExportScript () {
    // TODO: Warn if no title page information
    var supportsTextExport;
    switch (this.mode) {
      case "radio":
      case "av":
        supportsTextExport = false;
        break;
      default:
        supportsTextExport = true;
    }
    try {
      var defaultExt = supportsTextExport ? "txt" : "html";
      var fp = getFilePicker();
      fp.init(window, gApp.getText("ExportScript"), fp.modeSave);
      if (supportsTextExport)
        fp.appendFilters(fp.filterText);
      fp.appendFilters(fp.filterHTML);
      fp.defaultExtension = defaultExt;
      if (isMac())
        fp.defaultString = this.project.title + "." + defaultExt;
      else
        fp.defaultString = this.project.title;
      if (fp.show() == fp.returnCancel) return;

      if (fp.filterIndex == 0 && supportsTextExport)
        this.exportScriptAsText(fp.file);
      else
        this.exportScriptAsHTML(fp.file);
    }
    catch (ex) {
      dump("*** cmdExportScript: " + ex + "\n");
    }
  },


  exportScriptAsText: function exportScriptAsText (file) {
    ensureExtension(file, "txt");
    var xslFile = Cx.TRANSFORM_PATH;
    if (this.mode == "comic")
      xslFile += "export-text-comic.xml";
    else if (this.mode == "theatre")
      xslFile += "export-text-theatre.xml";
    else
      xslFile += "export-text.xml";

    try {
      var xsl = document.implementation.createDocument("", "", null);
      xsl.async = false;
      xsl.load(xslFile);

      var proc = new XSLTProcessor();
      proc.importStylesheet(xsl);

      var doc = proc.transformToDocument(this.editor.contentDocument);
      var str = stringify_ws(doc.documentElement);

      writeFile(str, file.path);
    }
    catch (ex) {
      dump("*** exportScriptAsText: " + ex + "\n");
    }
  },


  exportScriptAsHTML: function exportScriptAsHTML (file) {
    ensureExtension(file, "html");

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

    var xslFile = Cx.TRANSFORM_PATH + "export-html.xml";

    try {
      var xsl = document.implementation.createDocument("", "", null);
      xsl.async = false;
      xsl.load(xslFile);

      var proc = new XSLTProcessor();
      proc.importStylesheet(xsl);
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
                           file,
                           null,  // related files parent dir
                           "text/html",
                           flags,
                           wrap);
    }
    catch (ex) {
      dump("*** exportScriptAsHTML: " + ex + "\n");
    }
  },


  // Returns true if a node violates our imposed structure
  isInvalidNode: function isInvalidNode (node) {
    var IBody = Components.interfaces.nsIDOMHTMLBodyElement;
    var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
    var IDiv = Components.interfaces.nsIDOMHTMLDivElement;
    var IBR = Components.interfaces.nsIDOMHTMLBRElement;
    var IText = Components.interfaces.nsIDOMText;

    // We're only concerned about bad nodes at the body level right now
    if (! (node.parentNode instanceof IBody))
      return false;

    // Paragraphs, divs, and non-empty text nodes are okay
    if (node instanceof IPara || node instanceof IDiv)
      return false;

    // Don't count the bogus BR node, that's super-bad
    if (node instanceof IBR && node.hasAttribute("_moz_editor_bogus_node"))
      return false;

    // Non-empty text nodes are okay
    if (node instanceof IText && node.nodeValue != "")
      return false;

    // Any non-text node at the body level is bad
    if (! (node instanceof IText))
      return true;

    // Otherwise, it has to be an empty text node followed by
    // another empty text node (this can result from a Cut operation)
    // if (node.nextSibling instanceof IText && node.nextSibling.nodeValue == "")
    //   return true;

    return false;
  },


  getRevisionSeq: function () {
    var rdfsvc = getRDFService();
    var arc = rdfsvc.GetResource(Cx.NS_CX + "revisions");
    var seqres = this.project.ds.GetTarget(this.docres, arc, true);
    if (! seqres) {
      seqres = rdfsvc.GetAnonymousResource();
      this.project.ds.Assert(this.docres, arc, seqres, true);
    }
    else {
      seqres = seqres.QueryInterface(Components.interfaces.nsIRDFResource);
    }
    return new RDFSeq(this.project.ds, seqres);
  },


  createRevision: function () {
    var rdfsvc = getRDFService();

    // Save the script snapshot to a file
    var scriptfile = this.project.projectFolder;
    scriptfile.append("revision.html");
    scriptfile.createUnique(0, 0600);
    this.saveToFile(this.editor, scriptfile);

    // Create an RDF resource describing the revision
    var revres = rdfsvc.GetAnonymousResource();
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var oldtitle = this.getRevisionLabel() ||
                   getRDFString(this.project.ds, this.docres, titlearc);
    setRDFString(this.project.ds, revres, titlearc, oldtitle);
    this.project.addFileToDocument(scriptfile, revres);

    // Append it to our revision sequence.
    this.getRevisionSeq().push(revres);

    return revres;
  },


  lockSceneNumbers: function () {
    var xpath = new XPathEvaluator();
    var xset  = xpath.evaluate('//p[@class="sceneheading"]',
                               this.editor.contentDocument,
                               null,
                               XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                               null);
    for (var i = 0; i < xset.snapshotLength; ++i) {
      var scenepara = xset.snapshotItem(i);
      scenepara.setAttribute("locked", "true");
    }

    this.editor.scenesLocked = true;
  },


  cmdCreateRevision: function () {
    var revname = "Revision " + (this.editor.revisionNumber + 1);
    var args = {
      name: revname,
      revision: this.editor.revisionNumber,
      lockscenes: this.editor.scenesLocked,
      colour: this.getRevisionColour() + 1,
      forceCreate: true,
      accepted: false
    };

    window.openDialog(Cx.CONTENT_PATH + "editors/scriptrev.xul", "",
      Cx.MODAL_DIALOG_FLAGS, args);
    if (! args.accepted)
      return false;

    var succeeded = false;
    // Turn on scene numbers if this is the first revision being created
    var turnOnSceneNumbers = this.editor.revisionNumber == 0;

    this.project.ds.beginUpdateBatch();
    try {
      if (args.lockscenes)
        this.lockSceneNumbers();

      this.createRevision();

      // Unlock the script (it may have been locked)
      this.cmdUnlockScript();

      // Set the new revision attributes
      this.editor.incrementRevisionNumber();
      this.setRevisionLabel(args.name);
      this.setRevisionColour(args.colour);
      this.setRevisionStyle();
      this.updateRevisionMarkVisibilty();
      this.updateRevisionMenu();
      this.showRevisionToolbar();

      // Force an update to the cursor style
      this.handleEvent({ type: "formatchanged" });

      if (turnOnSceneNumbers) {
        var numbermenu = document.getElementById("sceneNumbersMenu");
        var selitem = getItemByValue(numbermenu, "right");
        if (selitem) {
          numbermenu.selectedItem = selitem;
          this.scriptConfig.sceneNumbering = "right";
          this.scriptConfig.update();
        }
      }

      this._modified = true;

      succeeded = true;
    }
    catch (ex) {
      celtxBugAlert(ex, Components.stack, ex);
    }
    this.project.ds.endUpdateBatch();

    gController.updateCommands();
    this.updateRevisionLabel();

    return succeeded;
  },


  cmdManageRevisions: function () {
    // Before revisions exist, this is equivalent to creating a new
    // revision, since the revision options don't really make sense
    // for the initial script.
    if (this.editor.revisionNumber == 0)
      return this.cmdCreateRevision();

    var rdfsvc = getRDFService();
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var title = this.getRevisionLabel() ||
                getRDFString(this.project.ds, this.docres, titlearc);

    var args = {
      name: title,
      revision: this.editor.revisionNumber,
      colour: this.getRevisionColour(),
      lockscenes: this.editor.scenesLocked,
      create: false,
      accepted: false
    };

    window.openDialog(Cx.CONTENT_PATH + "editors/scriptrev.xul", "",
      Cx.MODAL_DIALOG_FLAGS, args);
    if (! args.accepted)
      return;

    if (args.lockscenes)
        this.lockSceneNumbers();

    if (args.create) {
      this.createRevision();
      this.editor.incrementRevisionNumber();

      // Unlock the script (it may have been locked)
      this.cmdUnlockScript();

      // Force an update to the cursor style
      this.handleEvent({ type: "formatchanged" });
    }

    this.setRevisionLabel(args.name);
    this.setRevisionColour(args.colour);
    this.setRevisionStyle();
    this.updateRevisionLabel();

    this._modified = true;

    gController.updateCommands();
  },


  updateRevisionMenu: function () {
    try {
      var numbermenu = document.getElementById("sceneNumbersMenu");
      var selitem = getItemByValue(numbermenu,
        this.scriptConfig.sceneNumbering);
      if (selitem)
        numbermenu.selectedItem = selitem;

      var colourmenu = document.getElementById("revisionColourMenu");
      selitem = getItemByValue(colourmenu, this.getRevisionColour());
      if (selitem)
        colourmenu.selectedItem = selitem;

      var body = this.editor.contentDocument.body;
      var showmarks = null;
      if (body.hasAttribute("showrevisionmarks")) {
        showmarks = body.getAttribute("showrevisionmarks");
      }

      var markvalue;
      if (showmarks == "false") {
        markvalue = "hide";
      }
      else if (showmarks && showmarks != "true") {
        markvalue = "current";
      }
      else {
        markvalue = "all";
      }
      var marksmenu = document.getElementById("revisionMarkMenu");
      selitem = getItemByValue(marksmenu, markvalue);
      if (selitem)
        marksmenu.selectedItem = selitem;
    }
    catch (ex) {
      dump("*** updateRevisionMenu: " + ex + "\n");
    }
  },


  updateRevisionMarkVisibilty: function () {
    var body = this.editor.contentDocument.body;
    var oldvalue = body.getAttribute("showrevisionmarks");
    var newvalue;
    if (oldvalue == "false") {
      newvalue = "false";
    }
    else if (oldvalue && oldvalue != "true") {
      newvalue = this.editor.revisionNumber;
    }
    else {
      newvalue = "true";
    }

    if (oldvalue != newvalue) {
      body.setAttribute("showrevisionmarks", newvalue);
    }
  },


  cmdToggleRevisionMarks: function () {
    var marksmenu = document.getElementById("revisionMarkMenu");
    var marksvalue = marksmenu.selectedItem.value;

    var body = this.editor.contentDocument.body;
    switch (marksvalue) {
      case "all":
        body.setAttribute("showrevisionmarks", "true");
        break;
      case "current":
        body.setAttribute("showrevisionmarks", this.editor.revisionNumber);
        break;
      case "hide":
        body.setAttribute("showrevisionmarks", "false");
        break;
    }
    this.editor.contentWindow.focus();
  },


  cmdClearRevisionMarks: function () {
    if (this.editor.isLocked) {
      dump("*** cmdClearRevisionMarks: Editor is locked\n");
      return;
    }

    var spanatom = getAtom("span");
    this.editor.editor.removeInlineProperty(spanatom, "revision");
    this.editor.contentWindow.focus();
  },


  cmdApplyRevisionMarks: function () {
    if (this.editor.isLocked) {
      dump("*** cmdApplyRevisionMarks: Editor is locked\n");
      return;
    }

    var colour = this.getRevisionColour();
    var revnum = this.editor.revisionNumber;
    var spanatom = getAtom("span");
    this.editor.editor.setCSSInlineProperty(spanatom, "revision",
      revnum + " colour" + colour);
    this.editor.contentWindow.focus();
  },


  checkRevisionCursorStyle: function () {
    if (this.editor.isLocked) {
      dump("*** checkRevisionCursorStyle: Editor is locked\n");
      return;
    }

    if (! this.editor.selection.isCollapsed)
      return;

    // If there's already a revision style applied to the text the cursor
    // is in, the default style won't be applied, so we need to force it.
    var colour = this.getRevisionColour();
    var revnum = this.editor.revisionNumber;
    var defaultvalue = revnum + " colour" + colour;
    var spanatom = getAtom("span");
    var first = { value: false };
    var any = { value: false };
    var all = { value: false };
    var value = this.editor.editor.getInlinePropertyWithAttrValue(getAtom("span"),
      "revision", null, first, any, all);
    if (value && value != defaultvalue)
      this.editor.editor.setCSSInlineProperty(spanatom, "revision",
        defaultvalue);
  },


  cmdShowSceneNumbers: function () {
    var numbermenu = document.getElementById("sceneNumbersMenu");
    var numbers = numbermenu.selectedItem.value;

    this.scriptConfig.sceneNumbering = numbers;
    this.scriptConfig.update();

    this.editor.contentWindow.focus();
  },


  cmdEditSceneNumbers: function () {
    /*
     * In an earlier prototype (fadf6b...), it was possible to create and
     * merge revisions using this dialog. Now, it's just for setting the
     * revision options for a single revision. It makes it a lot simpler,
     * and it lets us show this both during the creation of a new revision
     * as well as configurable options for an existing one.
     */
    var rdfsvc = getRDFService();

    var args = {
      scheme: this.getSceneNumberingScheme(),
      schemeuri: null,    // Used for built-in presets
      schemeMembers: [],  // Used for custom settings
      scenes: [],
      accepted: false
    };

    // Extract all the scene numbers
    var xpath = new XPathEvaluator();
    var xset  = xpath.evaluate('//p[@class="sceneheading"]',
                               this.editor.contentDocument,
                               null,
                               XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                               null);

    for (var i = 0; i < xset.snapshotLength; ++i) {
      var scenepara = xset.snapshotItem(i);
      args.scenes.push({
        node: scenepara,
        label: stringify(scenepara).toUpperCase(),
        number: scenepara.getAttribute("scenenumber"),
        modified: false
      });
    }

    window.openDialog(Cx.CONTENT_PATH + "editors/scriptnumbers.xul", "",
      Cx.MODAL_DIALOG_FLAGS, args);
    if (! args.accepted)
      return;

    var numberSchemeChanged = false;
    var sceneNumbersChanged = false;

    for (var i = 0; i < args.scenes.length; ++i) {
      var scene = args.scenes[i];
      if (scene.modified) {
        scene.node.setAttribute("scenenumber", scene.number);
        sceneNumbersChanged = true;
      }
    }

    // Update the numbering scheme
    var arc = rdfsvc.GetResource(Cx.NS_CX + "sceneNumberScheme");

    if (args.schemeuri) {
      if (args.schemeuri != this.getSceneNumberingScheme().scheme.Value) {
        numberSchemeChanged = true;
        setRDFObject(this.project.ds, this.docres, arc,
          rdfsvc.GetResource(args.schemeuri));
      }
    }
    else {
      var res = rdfsvc.GetAnonymousResource();
      // If the scheme didn't change, this will get purged when the
      // project is saved.
      var newscheme = new NumberingScheme(this.project.ds, res);
      for (var i = 0; i < args.schemeMembers.length; ++i)
        newscheme.setSchemeAt(i, args.schemeMembers[i]);
      if (! this.getSceneNumberingScheme().equals(newscheme)) {
        numberSchemeChanged = true;
        setRDFObject(this.project.ds, this.docres, arc, res);
      }
    }

    if (numberSchemeChanged || sceneNumbersChanged)
      this.sceneTracker.update();
  },


  updateRevisionLabel: function () {
    var element = document.getElementById("revlabel");
    element.value = this.getRevisionLabel();

    var button = document.getElementById("createRevisionButton");
    button.label = gApp.getText("RevisionNumberAbbreviation",
      [ this.editor.revisionNumber ]);
  },


  getRevisionLabel: function () {
    return this.editor.getMetaValue("CX.revisionLabel");
  },


  setRevisionLabel: function (val) {
    this.editor.setMetaValue("CX.revisionLabel", val);
  },


  getRevisionDate: function () {
    this.editor.getMetaValue("CX.revisionDate");
  },


  setRevisionDate: function (val) {
    this.editor.setMetaValue("CX.revisionDate", val);
  },


  cmdSetRevisionColour: function () {
    var colourmenu = document.getElementById("revisionColourMenu");
    var colour = colourmenu.selectedItem.value;
    this.setRevisionColour(colour);
    this.setRevisionStyle();
    this.editor.contentWindow.focus();
  },


  setRevisionColour: function (colour) {
    this.editor.setMetaValue("CX.revisionColour", colour);
  },


  getRevisionColour: function () {
    var colour = this.editor.getMetaValue("CX.revisionColour");
    return colour ? Number(colour) : 0;
  },


  setRevisionStyle: function () {
    if (this.editor.isLocked) {
      dump("*** setRevisionStyle: Editor is locked\n");
      return;
    }

    var spanatom = getAtom("span");
    var colour = this.getRevisionColour();
    var revnum = this.editor.revisionNumber;
    if (revnum || colour)
      this.editor.editor.addDefaultProperty(spanatom, "revision",
        revnum + " colour" + colour);
    else
      this.editor.editor.removeDefaultProperty(spanatom, "revision", null);
  },


  suppressRevisionStyle: function () {
    if (this.editor.isLocked) {
      dump("*** suppressRevisionStyle: Editor is locked\n");
      return;
    }

    var spanatom = getAtom("span");
    this.editor.editor.removeDefaultProperty(spanatom, "revision", null);
  },


  showRevisionToolbar: function () {
    var revisionModeItem = top.document.getElementById("revisionModeItem");
    var resetItem = top.document.getElementById("resetRevisionModeItem");
    revisionModeItem.hidden = true;
    resetItem.hidden = false;
    var toolbar = document.getElementById("revision-toolbar");
    toolbar.collapsed = false;
  },


  hideRevisionToolbar: function () {
    var revisionModeItem = top.document.getElementById("revisionModeItem");
    var resetItem = top.document.getElementById("resetRevisionModeItem");
    revisionModeItem.hidden = false;
    resetItem.hidden = true;
    var toolbar = document.getElementById("revision-toolbar");
    toolbar.collapsed = true;
  },


  hideRevisionOptions: function () {
    var revisionSeparator = top.document.getElementById("revisionSeparator");
    var revisionModeItem = top.document.getElementById("revisionModeItem");
    var resetItem = top.document.getElementById("resetRevisionModeItem");

    revisionSeparator.hidden = true;
    revisionModeItem.hidden = true;
    resetItem.hidden = true;
  },


  cmdOmitScene: function () {
    try {
      var para = this.editor.currentParagraph;
      if (! para) return;
      var scene = this.editor.sceneContaining(para);
      if (! scene) return;
      if (scene.hasAttribute("omit"))
        this.editor.unomitScene(scene.id);
      else
        this.editor.omitScene(scene.id);
      this.sceneTracker.sceneOmitted(scene.id);
    }
    catch (ex) {
      celtxBugAlert(ex, Components.stack, ex);
    }
  },


  updateSceneMenus: function () {
    var omitbutton = document.getElementById("omitSceneButton");

    var para = this.editor.currentParagraph;
    var scene = this.editor.sceneContaining(para);
    if (scene && scene.hasAttribute("omit")) {
      omitbutton.setAttribute("restore", "true");
      omitbutton.setAttribute("tooltiptext", gApp.getText("RestoreScene"));
    }
    else {
      omitbutton.removeAttribute("restore");
      omitbutton.setAttribute("tooltiptext", gApp.getText("OmitScene"));
    }
  },


  getSceneNumberingScheme: function () {
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;

    var arc = rdfsvc.GetResource(Cx.NS_CX + "sceneNumberScheme");
    var scheme = this.project.ds.GetTarget(this.docres, arc, true);
    if (! scheme) {
      // Set a default one (TODO: Use Celtx style when non-English?)
      scheme = rdfsvc.GetResource(Cx.NS_CX + "HollywoodNumberScheme");
      this.project.ds.Assert(this.docres, arc, scheme, true);
    }
    else if (scheme instanceof IRes) {
      scheme = scheme.QueryInterface(IRes);
    }
    else {
      this.project.ds.Unassert(this.docres, arc, scheme);
      return this.getSceneNumberingScheme();
    }

    // Only provide a mutable datasource if we're using a custom scheme!
    if (rdfsvc.IsAnonymousResource(scheme))
      return new NumberingScheme(this.project.ds, scheme);
    else
      return new NumberingScheme(null, scheme);
  },


  conformToLockState: function () {
    var locked = getRDFString(this.project.ds, this.docres,
      getRDFService().GetResource(Cx.NS_CX + "locked")) == "true";
    if (locked)
      this.cmdLockScript();
    else
      this.cmdUnlockScript();
  },


  cmdLockScript: function () {
    if (! this.editor.isLocked) {
      this.editor.lockScript();
      this._modified = true;
      this.editor.selectionController.setCaretEnabled(true);
    }
    document.getElementById("script-toolbar").setAttribute("mode", "locked");
    setRDFString(this.project.ds, this.docres,
      getRDFService().GetResource(Cx.NS_CX + "locked"), "true");
    document.getElementById("preventEditingButton")
      .setAttribute("tooltiptext", gApp.getText("AllowEditing"));
    gController.updateCommands();
  },


  cmdUnlockScript: function () {
    if (this.editor.isLocked) {
      this.editor.unlockScript();
      this._modified = true;
    }
    document.getElementById("script-toolbar").setAttribute("mode", "editing");
    clearRDFObject(this.project.ds, this.docres,
      getRDFService().GetResource(Cx.NS_CX + "locked"));
    document.getElementById("preventEditingButton")
      .setAttribute("tooltiptext", gApp.getText("PreventEditing"));

    this.handleEvent({ type: "formatchanged" });

    gController.updateCommands();

    this.setRevisionStyle();
    this.checkRevisionCursorStyle();
  },


  cmdResetLocking: function () {
    var dlgtitle = gApp.getText("ResetLockingTitle");
    var dlgmsg = gApp.getText("ResetLockingMsg");
    var cancellabel = gApp.getText("DontReset");
    var acceptlabel = gApp.getText("Reset");

    var dummy = { value: false };

    var ps = getPromptService();
    var flags = (ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING)
              + (ps.BUTTON_POS_1 * ps.BUTTON_TITLE_IS_STRING)
              + ps.BUTTON_POS_1_DEFAULT;
    if (ps.confirmEx(window, dlgtitle, dlgmsg, flags, acceptlabel,
      cancellabel, "", "", dummy) != 0)
      return;

    var wasLocked = this.editor.isLocked;
    if (wasLocked)
      this.editor.unlockScript();

    try {
      this.editor.setRevisionNumber(0);
      this.editor.scenesLocked = false;
      this.sceneTracker.resetSceneNumbers();
    }
    catch (ex) {
      celtxBugAlert(ex, Components.stack, "Reseting scene numbers failed");
    }

    try {
      var spanatom = getAtom("span");
      var selrange = this.editor.selection.getRangeAt(0);
      var htmleditor = this.editor.editor;
      htmleditor.beginTransaction();
      try {
        htmleditor.removeDefaultProperty(spanatom, "revision", null);
        htmleditor.selectAll();
        htmleditor.removeInlineProperty(spanatom, "revision", null);
      }
      catch (ex) {
        throw ex;
      }
      finally {
        this.editor.selection.removeAllRanges();
        this.editor.selection.addRange(selrange);
        htmleditor.endTransaction();
      }
    }
    catch (ex) {
      celtxBugAlert(ex, Components.stack, "Removing revision marks failed");
    }

    try {
      var xpath = new XPathEvaluator();
      var pathstr = '//p[@class="sceneheading"][@omit="true"]';
      var scenes = xpath.evaluate(pathstr, this.editor.contentDocument,
        null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (var i = 0; i < scenes.snapshotLength; ++i)
        this.editor.unomitScene(scenes.snapshotItem(i).id);
    }
    catch (ex) {
      celtxBugAlert(ex, Components.stack, "Restoring omitted scenes failed");
    }

    this.getRevisionSeq().clear();
    this.setRevisionLabel("");
    this.setRevisionDate("");
    this.setRevisionColour(0);
    this.updateRevisionLabel();

    this.hideRevisionToolbar();

    if (wasLocked)
      this.editor.lockScript();
  }
};


// TODO: Switch to using toolkit/content/inlineSpellCheckUI.js. See textbox.xml
// for an example on how to use it.

const kSpellMaxNumSuggestions = 3;
const kSpellNoMispelling = -1;
const kSpellNoSuggestionsFound = 0;

var InlineSpellChecker = {
  editor: null,
  inlineSpellChecker: null,

  Init: function (editor) {
    // gScriptController.editor = editor;
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

    var selection = gScriptController.editor.selection;
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
      var selection = gScriptController.editor.selection;
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
      var selection = gScriptController.editor.selection;
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
      var selection = gScriptController.editor.selection;
      node = selection.anchorNode;
      offset = selection.anchorOffset;
    }

    var word = this.inlineSpellChecker.getMispelledWord(node, offset);
    if (word)
      this.inlineSpellChecker.ignoreWord(word);
  }
};


function PageConfig (doc, editortype) {
  this.doc = doc;
  var head = doc.documentElement.firstChild;
  var ILink = Components.interfaces.nsIDOMHTMLLinkElement;
  var IStyle = Components.interfaces.nsIDOMHTMLStyleElement;
  var IMeta = Components.interfaces.nsIDOMHTMLMetaElement;
  var stylePrefix = "chrome://celtx/content/style/";
  var children = head.childNodes;
  var editorLink = null;
  this.mode = gScriptController.mode;
  for (var i = 0; i < children.length; ++i) {
    var child = children[i];
    if (child instanceof ILink) {
      if (child.href == "chrome://celtx/content/editor.css") {
        editorLink = child;
        continue;
      }
      if (child.href.indexOf(stylePrefix) != 0)
        continue;
      var tail = child.href.substring(stylePrefix.length);
      var tails = tail.replace(/\.css$/, "").split('/');
      if (! tails || tails.length < 3) {
        dump("*** Invalid PageConfig style href: " + child.href + "\n");
        continue;
      }
      this.styleNode = child;
      // this.mode   = tails[0];
      this.paper  = tails[1];
      this.zoom   = tails[2];
    }
    else if (child instanceof IStyle) {
      // It turns out, if you have STYLE elements with titles, the first one
      // with a title causes the rest with titles to be ignored. I should not
      // have been using the title attribute in the first place.
      if (child.getAttribute("title")) {
        child.setAttribute("id", child.getAttribute("title"));
        child.removeAttribute("title");
      }
      switch (child.getAttribute("id")) {
        case "leftheading":   this.leftHeadingNode  = child;  break;
        case "rightheading":  this.rightHeadingNode = child;  break;
        case "pagenumbers":   this.pageNumberSheet  = child;  break;
        case "firstnumber":   this.firstNumberSheet = child;  break;
        case "charnumbers":   this.charNumberSheet  = child;  break;
        case "scratch":       this.scratchSheet     = child;  break;
      }
    }
    else if (child instanceof IMeta) {
      switch (child.name) {
        case "CX.sceneNumbering":       this.numberingNode    = child;  break;
        case "CX.showPageNumbers":      this.pageNumbersNode  = child;  break;
        case "CX.showFirstPageNumber":  this.firstNumberNode  = child;  break;
        case "CX.showCharNumbers":      this.charNumbersNode  = child;  break;
        case "CX.dialogNumbering":      this.dialogNumbersNode = child; break;
      }
    }
  }

  if (editortype == "scratch" && ! this.scratchSheet) {
    var str =
      "@media screen {\n  body { background-color: #FFFFCC !important; }\n} ";
    this.scratchSheet = doc.createElement("style").QueryInterface(IStyle);
    this.scratchSheet.type = "text/css";
    this.scratchSheet.setAttribute("id", "scratch");
    this.scratchSheet.appendChild(doc.createTextNode(str));
    head.insertBefore(this.scratchSheet, editorLink);
  }

  if (! this.leftHeadingNode) {
    var str = "p.sceneheading:before { display: none !important; } ";
    this.leftHeadingNode = doc.createElement("style").QueryInterface(IStyle);
    this.leftHeadingNode.type = "text/css";
    this.leftHeadingNode.setAttribute("id", "leftheading");
    this.leftHeadingNode.appendChild(doc.createTextNode(str));
    head.appendChild(this.leftHeadingNode);
  }

  if (! this.rightHeadingNode) {
    var str = "p.sceneheading:after { display: none !important; } ";
    this.rightHeadingNode = doc.createElement("style").QueryInterface(IStyle);
    this.rightHeadingNode.type = "text/css";
    this.rightHeadingNode.setAttribute("id", "rightheading");
    this.rightHeadingNode.appendChild(doc.createTextNode(str));
    head.appendChild(this.rightHeadingNode);
  }
  if (! this.numberingNode) {
    this.numberingNode = doc.createElement("meta").QueryInterface(IMeta);
    this.numberingNode.name = "CX.sceneNumbering";
    this.numberingNode.content = "none";
    head.appendChild(this.numberingNode);
  }
  if (! this.pageNumbersNode) {
    this.pageNumbersNode = doc.createElement("meta").QueryInterface(IMeta);
    this.pageNumbersNode.name = "CX.showPageNumbers";
    this.pageNumbersNode.content = "false";
    head.appendChild(this.pageNumbersNode);
  }
  if (! this.firstNumberNode) {
    this.firstNumberNode = doc.createElement("meta").QueryInterface(IMeta);
    this.firstNumberNode.name = "CX.showFirstPageNumber";
    this.firstNumberNode.content = "false";
    head.appendChild(this.firstNumberNode);
  }
  if (! this.charNumbersNode) {
    this.charNumbersNode = doc.createElement("meta").QueryInterface(IMeta);
    this.charNumbersNode.name = "CX.showCharNumbers";
    this.charNumbersNode.content = "false";
    head.appendChild(this.charNumbersNode);
  }
  if (! this.dialogNumbersNode) {
    this.dialogNumbersNode = doc.createElement("meta").QueryInterface(IMeta);
    this.dialogNumbersNode.name = "CX.dialogNumbering";
    this.dialogNumbersNode.content = "false";
    head.appendChild(this.dialogNumbersNode);
  }
  if (! this.pageNumberSheet) {
    var str = ".softbreak { display: none !important; } ";
    this.pageNumberSheet = doc.createElement("style").QueryInterface(IStyle);
    this.pageNumberSheet.type = "text/css";
    this.pageNumberSheet.setAttribute("id", "pagenumbers");
    this.pageNumberSheet.appendChild(doc.createTextNode(str));
    head.appendChild(this.pageNumberSheet);
  }
  if (! this.charNumberSheet) {
    var str = "\n.character:before, .sound:before, .music:before, "
      + ".voice:before { display: none !important; }\n\n";
    this.charNumberSheet = doc.createElement("style").QueryInterface(IStyle);
    this.charNumberSheet.type = "text/css";
    this.charNumberSheet.setAttribute("id", "charnumbers");
    this.charNumberSheet.appendChild(doc.createTextNode(str));
    head.appendChild(this.charNumberSheet);
  }
  else {
    // Fix a little problem with the first draft radio stuff
    var str = "\n.character:before, .sound:before, .music:before, "
      + ".voice:before { display: none !important; }\n\n";
    if (this.charNumberSheet.firstChild.nodeValue != str)
      this.charNumberSheet.replaceChild(doc.createTextNode(str),
        this.charNumberSheet.firstChild);
  }
  // The firstpage DIV itself is added/removed as needed, so we no longer need
  // the stylesheet that's used to disable its appearance in print.
  if (this.firstNumberSheet)
    head.removeChild(this.firstNumberSheet);
  if (! this.styleNode) {
    this.mode = gScriptController.mode;
    try {
      var ps = getPrefService().getBranch("celtx.script.");
      this.paper = ps.getCharPref("papersize");
    }
    catch (ex) {
      this.paper = "USLetter";
    }
    this.zoom   = "Normal";
    this.styleNode = doc.createElement("link").QueryInterface(ILink);
    this.styleNode.rel = "stylesheet";
    this.styleNode.type = "text/css";
    this.styleNode.href = stylePrefix + this.mode + "/" + this.paper + "/"
      + this.zoom + ".css";
    head.appendChild(this.styleNode);
  }

  // Always show "scene" numbers for comic
  if (this.mode == "comic")
    this.sceneNumbering = "both";

  this.update();
}

PageConfig.prototype = {
  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIObserver))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  get zoomLevel () {
    switch (this.zoom) {
      case "Large":
        return 12;
      case "ExtraLarge":
        return 16;
      case "Normal":
      default:
        return 10;
    }
  },
  set zoomLevel (val) {
    switch (val) {
      case 12:
        this.zoom = "Large";
        break;
      case 16:
        this.zoom = "ExtraLarge";
        break;
      case 10:
      default:
        val = 10;
        this.zoom = "Normal";
    }
    return val;
  },


  get sceneNumbering () {
    return this.numberingNode.content;
  },
  set sceneNumbering (val) {
    this.numberingNode.content = val;
  },


  get showPageNumbers () {
    return this.pageNumbersNode.content == "true";
  },
  set showPageNumbers (val) {
    this.pageNumbersNode.content = val ? "true" : "false";
  },


  get showFirstPageNumber () {
    return this.firstNumberNode.content == "true";
  },
  set showFirstPageNumber (val) {
    this.firstNumberNode.content = val ? "true" : "false";
  },


  get showCharNumbers () {
    return this.charNumbersNode.content == "true";
  },
  set showCharNumbers (val) {
    this.charNumbersNode.content = val ? "true" : "false";
  },


  get showDialogNumbers () {
    return this.dialogNumbersNode.content == "true";
  },
  set showDialogNumbers (val) {
    this.dialogNumbersNode.content = val ? "true" : "false";
  },


  get size () {
    return this.paper;
  },
  set size (val) {
    this.paper = val;
  },


  get linesPerPage () {
    var ps = getPrefService().getBranch("celtx.script.");
    try {
      return ps.getIntPref(this.size + ".lines");
    }
    catch (ex) {
      dump("*** no linesPerPage for " + this.size + "\n");
      return 52;
    }
  },


  update: function () {
    var xpath = new XPathEvaluator();
    var str = "/html/body/div[@class='firstpage' or @class='firstpagespacer']";
    var xresult = xpath.evaluate(str, this.doc, null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0; i < xresult.snapshotLength; ++i) {
      var div = xresult.snapshotItem(i);
      div.parentNode.removeChild(div);
    }
    if (this.showPageNumbers) {
      var firstpage = this.doc.createElement("div");
      if (this.showFirstPageNumber)
        firstpage.setAttribute("class", "firstpage");
      else
        firstpage.setAttribute("class", "firstpagespacer");
      firstpage.appendChild(this.doc.createTextNode(" "));
      this.doc.body.insertBefore(firstpage, this.doc.body.firstChild);
    }
    else {
      var str = "/html/body/div[@class='softbreak']";
      var xresult = xpath.evaluate(str, this.doc, null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (var i = 0; i < xresult.snapshotLength; ++i) {
        var div = xresult.snapshotItem(i);
        div.parentNode.removeChild(div);
      }
    }

    var numbers = this.sceneNumbering;
    var showLeft = (numbers == "both" || numbers == "left");
    var showRight = (numbers == "both" || numbers == "right");

    this.leftHeadingNode.disabled = showLeft;
    this.rightHeadingNode.disabled = showRight;
    this.pageNumberSheet.disabled = this.showPageNumbers;
    if (gScriptController.mode == "film")
      this.charNumberSheet.disabled = this.showDialogNumbers;
    else if (gScriptController.mode == "radio")
      this.charNumberSheet.disabled = this.showCharNumbers;

    var stylePrefix = "chrome://celtx/content/style/";
    var href = stylePrefix + this.mode + "/" + this.paper + "/"
      + this.zoom + ".css";

    gPaginator.resetCache();

    if (this.styleNode.href == href)
      return;

    var ILink = Components.interfaces.nsIDOMHTMLLinkElement;
    var head = this.styleNode.parentNode;
    head.removeChild(this.styleNode);
    this.styleNode = this.doc.createElement("link").QueryInterface(ILink);
    this.styleNode.rel = "stylesheet";
    this.styleNode.type = "text/css";
    this.styleNode.href = href;
    head.appendChild(this.styleNode);
  }
};


var gAutoComplete = {
  lastCheck: -1,
  headings: {},
  chars: {},
  sounds: {},
  musics: {},
  voices: {},


  get popup () {
    return document.getElementById("autotext-popup");
  },


  findCharacters: function () {
    // Reset the cached list
    this.chars = {};

    // Find all the character breakdown items first
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var chartype = rdfsvc.GetResource(Cx.NS_CX + "Cast");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var ds = gScriptController.project.ds;
    var charlist = ds.GetSources(typearc, chartype, true);
    while (charlist.hasMoreElements()) {
      var charres = charlist.getNext().QueryInterface(
        Components.interfaces.nsIRDFResource);
      this.addCharacter(getRDFString(ds, charres, titlearc));
    }

    // Scrape the script
    var doc = gScriptController.editor.contentDocument;
    var str = "/html/body/p[@class='character']";
    var xpath = new XPathEvaluator();
    try {
      var xset = xpath.evaluate(str, doc, null,
                                XPathResult.ANY_TYPE, null);
      var e = null;
      while (e = xset.iterateNext()) {
        var charname = stringify(e);
        // Don't add single-letter entries
        if (charname.length > 1)
          this.addCharacter(charname);
      }
    }
    catch (ex) {
      dump("*** gAutoComplete.findCharacters: " + ex + "\n");
    }
  },


  findSceneHeadings: function () {
    // Initialize from preferences
    try {
      var ps = getPrefService().getBranch("celtx.scripteditor.");
      var intexts = getPrefString(ps, "intexts").split(",");
      for (var i = 0; i < intexts.length; ++i)
        this.headings[intexts[i] + "."] = 1;
    }
    catch (ex) {
      dump("*** gAutoComplete.findSceneHeadings: " + ex + "\n");
    }

    var doc = gScriptController.editor.contentDocument;
    var str = "/html/body/p[@class='sceneheading']";
    var xpath = new XPathEvaluator();
    try {
      var xset = xpath.evaluate(str, doc, null,
                                XPathResult.ANY_TYPE, null);
      var e = null;
      while (e = xset.iterateNext()) {
        var heading = stringify(e);
        // Don't add single-letter entries
        if (heading.length > 1)
          this.addHeading(heading);
      }
    }
    catch (ex) {
      dump("*** gAutoComplete.findSceneHeadings: " + ex + "\n");
    }
  },


  // Finds sound, music, and voice
  findSounds: function () {
    this.sounds = {};
    this.musics = {};
    this.voices = {};
    var doc = gScriptController.editor.contentDocument;
    var str = "/html/body/p[@class='sound' or @class='music' "
      + "or @class='voice']";
    var xpath = new XPathEvaluator();
    try {
      var xset = xpath.evaluate(str, doc, null,
                                XPathResult.ANY_TYPE, null);
      var e = null;
      while (e = xset.iterateNext()) {
        var sound = stringify(e);
        // Don't add single-letter entries
        if (sound.length > 1) {
          this.addSound(sound, e.className);
        }
      }
    }
    catch (ex) {
      dump("*** gAutoComplete.findSceneHeadings: " + ex + "\n");
    }
  },


  addHeading: function (str) {
    str = str.toUpperCase();
    str = str.replace(/^\s*/, "");
    str = str.replace(/\s*$/, "");
    if (str != "")
      this.headings[str] = 1;
  },


  addCharacter: function (str) {
    str = str.toUpperCase();
    str = str.replace(/^\s*/, "");
    str = str.replace(/\s*$/, "");
    if (str != "")
      this.chars[str] = 1;
  },


  addSound: function (str, class) {
    str = str.toUpperCase();
    str = str.replace(/^\s*/, "");
    str = str.replace(/\s*$/, "");
    if (str != "") {
      switch (class) {
        case "sound": this.sounds[str] = 1; break;
        case "music": this.musics[str] = 1; break;
        case "voice": this.voices[str] = 1; break;
      }
    }
  },


  popupView: {
    QueryInterface: function (iid) {
      if (iid.equals(Components.interfaces.nsITreeView) ||
          iid.equals(nsISupportsWeakReference))
        return this;
      throw Components.results.NS_NOINTERFACE;
    },

    _list: [],

    get rowCount () { return this._list.length; },

    valueOf: function (row) { return this._list[row]; },

    setList: function (list) {
      var prev = this._list;
      this._list = list;
      if (this.treebox != null) {
        try {
          this.treebox.rowCountChanged(prev.length - 1,
                                       list.length - prev.length);
        } catch (ex) { dump("*** rowCountChanged: " + ex + "\n"); }
      }
    },

    getCellText: function (row, col) {
      return this._list[row];
    },

    setTree: function (treebox) {
      this.treebox = treebox;
    },

    defaultTreeRowHeight: function () {
      // Kludge
      const DEFAULT = 18;
      if (false) {
        var h = this.tree.elem.treeBoxObject.rowHeight;
        return (h > 0 ? h : DEFAULT);
      }
      else {
        return DEFAULT;
      }
    },

    get rowHeight () {
      if (this.treebox) return this.treebox.rowHeight;
      return this.defaultTreeRowHeight();
    },

    isContainer: function (row) { return false; },
    isSeparator: function (row) { return false; },
    isSorted: function (row) { return false; },
    getLevel: function (row) { return 0; },
    getImageSrc: function (row, col) { return null; },
    getRowProperties: function (row, props) { },
    getCellProperties: function (row, col, props) { },
    getColumnProperties: function (id, col, props) { }
  },


  showPopup: function (para) {
    var RESET_DELAY_MS = 60000;
    if (this._lastCheck < (new Date()).valueOf() - RESET_DELAY_MS) {
      this.findCharacters();
      this.findSceneHeadings();
      this.findSounds();
      this._lastCheck = (new Date()).valueOf();
    }
    var source = null;
    if (para.className == "sceneheading") {
      source = this.headings;
    }
    else if (para.className == "character") {
      source = this.chars;
    }
    else if (para.className == "shot") {
      try {
        var ps = getPrefService().getBranch("celtx.scripteditor.");
        var shots = getPrefString(ps, "shots").split(",");
        source = {};
        for (var i = 0; i < shots.length; ++i)
          source[shots[i]] = 1;
      }
      catch (ex) {
        dump("*** gAutoComplete.showPopup: " + ex + "\n");
      }
    }
    else if (para.className == "sound") {
      source = this.sounds;
    }
    else if (para.className == "music") {
      source = this.musics;
    }
    else if (para.className == "voice") {
      source = this.voices;
    }
    else {
      if (this.popup.isOpen)
        this.popup.close();
      return;
    }
    var str = stringify(para).toUpperCase();
    if (str == "") {
      if (this.popup.isOpen)
        this.popup.close();
      return;
    }
    var sel = gScriptController.editor.selection;
    if (! (sel.isCollapsed && gScriptController.editor.atEndOfParagraph(sel))) {
      if (this.popup.isOpen)
        this.popup.close()
      return;
    }
    var list = [];
    for (var e in source) {
      if (e.indexOf(str) == 0)
        list.push(e);
    }
    list.sort();

    // Don't show a pop-up with only what's currently typed
    if (list.length == 1 && list[0].length == str.length)
      list = [];

    try {
      if (this.popup.isOpen) {
        if (list.length == 0) {
          this.popup.close();
          return;
        }
        this.popupView.setList(list);
        this.popup.invalidate();
        this.popup.selectedIndex = 0;
      }
      else {
        if (list.length == 0 ||
            this.popup.lastBlock == para &&
            this.popup.lastCompletion == str)
          return;
        this.popupView.setList(list);
        this.popup.open(gScriptController.editor, para, this.popupView);
        var self = this;
        setTimeout(function () { self.popup.selectedIndex = 0; }, 0);
      }
    }
    catch (ex) {
      dump("*** gAutoComplete.showPopup: " + ex + "\n");
    }
  }
};


var gCharacterTracker = {
  autoAddCharacter: function (charname) {
    var scene = gScriptController.selectedBreakdownUnit;
    if (! scene) {
      dump("*** autoAddCharacter: No current scene\n");
      return;
    }

    charname = charname.toUpperCase().replace(/\s*\(.*\)\s*$/, "");
    if (! charname)
      return;

    var project = gScriptController.document.project;
    var ds = project.ds;
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var chartype = rdfsvc.GetResource(Cx.NS_CX + "Cast");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");

    ds.beginUpdateBatch();
    try {
      var namecache = new CharacterNameCache(ds);
      var charres = namecache.charWithName(charname);
      if (! charres) {
        charres = rdfsvc.GetResource(project.mintURI());
        ds.Assert(charres, typearc, chartype, true);
        setRDFString(ds, charres, titlearc, charname);
      }
      scene.addItem(charres);
    }
    catch (ex) {
      celtxBugAlert(ex, Components.stack, ex);
    }
    ds.endUpdateBatch();
  },


  findChars: function findChars () {
    var xpe = new XPathEvaluator();
    // By finding sceneheadings as well as characters, we don't need to
    // churn all the time doing a scene heading look-back.
    var str = "//p[@class='sceneheading' or @class='character']";
    var result = xpe.evaluate(str, gScriptController.editor.contentDocument,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    if (result.snapshotLength == 0)
      return;

    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var chartype = rdfsvc.GetResource(Cx.NS_CX + "Cast");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
    var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");

    var project = gScriptController.document.project;
    var ds = project.ds;
    var docres = gScriptController.document.resource;

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


function editor_onEnterPrintPreview () {
  /*
  var printPreviewTB = document.createElementNS(Cx.NS_XUL, "toolbar");
  printPreviewTB.setAttribute("printpreview", true);
  printPreviewTB.setAttribute("id", "print-preview-toolbar");
  getBrowser().parentNode.insertBefore(printPreviewTB, getBrowser());
  */
  gScriptController.saveCursorLocation();
  gScriptController.sidebarCollapsed = gScriptController.sidebar.collapsed;
  gScriptController.sidebar.collapsed = true;
  if (gScriptController.scratchpad) {
    gScriptController.scratchpadCollapsed =
      gScriptController.scratchpad.collapsed;
    gScriptController.scratchpad.collapsed = true;
  }
  gScriptController.toolbar.hidden = true;
  document.getElementById("revision-toolbar").collapsed = true;
  gScriptController.inPrintPreview = true;
  gScriptController.suspendTimers();
  gController.updateCommands();
  getBrowser().contentWindow.focus();
}


function editor_onExitPrintPreview () {
  /*
  var printPreviewTB = document.getElementById("print-preview-toolbar");
  if (printPreviewTB)
    printPreviewTB.parentNode.removeChild(printPreviewTB);
  */
  gScriptController.sidebar.collapsed = gScriptController.sidebarCollapsed;
  if (gScriptController.scratchpad) {
    gScriptController.scratchpad.collapsed =
      gScriptController.scratchpadCollapsed;
  }
  gScriptController.toolbar.hidden = false;
  document.getElementById("revision-toolbar").collapsed
    = ! gScriptController.editor.revisionNumber;
  if (! gScriptController.editor.isLocked)
    gScriptController.editor.editorElement.makeEditable("html", false);
  gScriptController.inPrintPreview = false;
  gScriptController.restoreCursorLocation();
  getBrowser().contentWindow.focus();
  gScriptController.resumeTimers();
  gController.updateCommands();
  gScriptController.setRevisionStyle();
  gScriptController.checkRevisionCursorStyle();
}


/*
 * This is here to patch the fullscreen toggle code in the first version of
 * the fullscreen add-on, since it included a compiled component for the Mac
 * that depended on the memory layout of nsCocoaWindow. In Celtx 2.9, the
 * layout changed because nsBaseWidget (an ancestor class of nsCocoaWindow)
 * added an extra member variable.
 *
 * Celtx 2.9 ships with a built-in replacement for the compiled component so
 * that the memory layout is correct, and the component can be completely
 * reimplemented in a later release.
 */


function fullscreen_toggleFullScreen2 () {
  var obsvc = getObserverService();
  obsvc.notifyObservers(window, "celtx:will-change-fullscreen", ! gFullScreen);
  fullscreen_willChangeFullScreen();

  gFullScreen = ! gFullScreen;

  var fullscreenComponent = null;
  if (isMac()) {
    try {
      if ("@celtx.com/fullscreen;2" in Components.classes)
        fullscreenComponent = Components.classes["@celtx.com/fullscreen;2"]
          .createInstance(Components.interfaces.nsICocoaFullScreen);
    }
    catch (ex) {
      dump("*** Expected fullscreen;2 to be available: " + ex + "\n");
      fullscreenComponent = null;
    }
    try {
      if (! fullscreenComponent &&
          "@celtx.com/fullscreen;1" in Components.classes)
        fullscreenComponent = Components.classes["@celtx.com/fullscreen;1"]
          .createInstance(Components.interfaces.nsICocoaFullScreen);
    }
    catch (ex) {
      dump("*** Expected fullscreen;1 to be available: " + ex + "\n");
      fullscreenComponent = null;
    }
  }

  if (fullscreenComponent) {
    if (gFullScreen)
      fullscreenComponent.makeFullScreen(top);
    else
      fullscreenComponent.exitFullScreen(top);
  }
  else {
    top.fullScreen = gFullScreen;
  }
  obsvc.notifyObservers(window, "celtx:did-change-fullscreen", ! gFullScreen);

  fullscreen_didChangeFullScreen();
}

window.addEventListener("load", function () {
  var extmgr = Components.classes["@mozilla.org/extensions/manager;1"]
    .getService(Components.interfaces.nsIExtensionManager);
  var item = extmgr.getItemForID("fullscreen@celtx.com");
  if (! item || item.version != "1.0")
    return;

  if (gScriptController.editorLoaded) {
    fullscreen_toggleFullScreen = fullscreen_toggleFullScreen2;
  }
  else {
    gScriptController.editor.addEventListener("scriptload", function () {
      fullscreen_toggleFullScreen = fullscreen_toggleFullScreen2;
    }, false);
  }
}, false);
