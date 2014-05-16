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

var gCardController = {
  __proto__: EditorController.prototype,


  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) ||
        aIID.equals(Components.interfaces.nsIController) ||
        aIID.equals(Components.interfaces.nsIDOMEventListener))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  _lastSelection: null,
  _focused: false,
  _mode: "desc",
  _paraspercard: 5,
  _modified: false,

  colours: [ "white", "grey", "blue", "green", "yellow", "orange", "pink" ],

  /*
   * In Celtx 2.7 and earlier, tagnames was a map of symbolic colour names to
   * user-defined plot names, and its values were accessed directly. Because
   * the Plot Cards add-on also accesses them directly, we still need to
   * support that access pattern, so now tagnames is a proxy object that
   * maps direct access onto the new pattern. The cached values are stored in
   * _tagnames.
   */
  _tagnames: {},


  loaded: function loaded () {
    this.wrappedJSObject = this;

    this.view = document.getElementById("cardview");
    var ps = getPrefService().getBranch("celtx.tag.");
    for (var i = 0; i < this.colours.length; ++i)
      this._tagnames[this.colours[i]] = getPrefString(ps, this.colours[i]);

    var self = this;
    this.tagnames = {
      get white ()  { return self.getTagName("white");  },
      get grey ()   { return self.getTagName("grey");   },
      get blue ()   { return self.getTagName("blue");   },
      get green ()  { return self.getTagName("green");  },
      get yellow () { return self.getTagName("yellow"); },
      get orange () { return self.getTagName("orange"); },
      get pink ()   { return self.getTagName("pink");   },

      set white (val)   { self.setTagName("white", val)   },
      set grey (val)    { self.setTagName("grey", val)    },
      set blue (val)    { self.setTagName("blue", val)    },
      set green (val)   { self.setTagName("green", val)   },
      set yellow (val)  { self.setTagName("yellow", val)  },
      set orange (val)  { self.setTagName("orange", val)  },
      set pink (val)    { self.setTagName("pink", val)    }
    };
  },


  getTagName: function (aColour) {
    return this._tagnames[aColour];
  },


  setTagName: function (aColour, aName) {
    if (this._tagnames[aColour] == aName)
      return;

    this._tagnames[aColour] = aName;
    this._modified = true;
    var obsvc = getObserverService();
    obsvc.notifyObservers(this, "celtx:scenecards:tagchanged", null);
  },


  get browser () {
    return this.view;
  },


  setZoom: function setZoom (val) {
    var viewer = this.view.docShell.contentViewer.QueryInterface(
      Components.interfaces.nsIMarkupDocumentViewer);
    viewer.textZoom = Number(val);
  },


  open: function open (project, docres) {
    this.outlineView = gController.outlineView;

    this.project = project;
    this.docres = docres;
    var rdfsvc = getRDFService();
    var ILit = Components.interfaces.nsIRDFLiteral;
    var IRes = Components.interfaces.nsIRDFResource;
    var ds = project.ds;
    var tagnamesarc = rdfsvc.GetResource(Cx.NS_CX + "tagnames");
    var tagnames = ds.GetTarget(docres, tagnamesarc, true);
    if (tagnames) {
      tagnames = new RDFSeq(ds, tagnames.QueryInterface(IRes)).toArray();
      for (var i = 0; i < tagnames.length; ++i) {
        try {
          if (tagnames[i] instanceof ILit) {
            var name = tagnames[i].QueryInterface(ILit);
            this._tagnames[this.colours[i]] = name.Value;
          }
          else
            this._tagnames[this.colours[i]] = "";
        }
        catch (ex) {
          dump("*** open: invalid tagname for " + this.colours[i] + " (" + i + ")\n");
          this._tagnames[this.colours[i]] = "";
        }
      }
    }
    this.tmpFile = tempFile('html');
  },


  close: function close () {
    if (this._timer)
      clearTimeout(this._timer);

    this.tmpFile.remove(false);
  },


  get modified () {
    return this._modified || this._timer != null;
  },


  save: function save () {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
      this.elementChanged(this._changedElement);
    }
    this._modified = false;

    var rdfsvc = getRDFService();
    var ILit = Components.interfaces.nsIRDFLiteral;
    var IRes = Components.interfaces.nsIRDFResource;
    var ds = this.project.ds;
    var tagnamesarc = rdfsvc.GetResource(Cx.NS_CX + "tagnames");
    var tagnames = ds.GetTarget(this.docres, tagnamesarc, true);
    ds.beginUpdateBatch();
    if (! tagnames) {
      tagnames = rdfsvc.GetAnonymousResource();
      ds.Assert(this.docres, tagnamesarc, tagnames, true);
    }
    tagnames = new RDFSeq(ds, tagnames.QueryInterface(IRes));
    while (! tagnames.isEmpty())
      tagnames.remove(0);
    for (var i = 0; i < this.colours.length; ++i) {
      var tagname = this.tagnames[this.colours[i]] || "";
      if (tagname.match(/\S/))
        tagnames.push(rdfsvc.GetLiteral(tagname));
      else
        tagnames.push(rdfsvc.GetResource("rdf:null"));
    }
    ds.endUpdateBatch();
  },


  commands: {
    "cmd-cardview-toggle": 1,
    "cmd-create-card": 1,
    "cmd-delete-card": 1,
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1,
    "cmd-treeitem-down": 1,
    "cmd-treeitem-up": 1,
    "cmd-treeitem-recycle": 1,
    "cmd-treeitem-delete": 1,
    "cmd-treeitem-goto": 1
  },


  supportsCommand: function supportsCommand (cmd) {
    return this.commands[cmd] == 1;
  },


  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "cmd-cardview-toggle":
      case "cmd-create-card":
        return ! this.inPrintPreview;
      case "cmd-page-setup":
      case "cmd-print":
      case "cmd-print-preview":
        return true;
      case "cmd-delete-card":
        return ! this.inPrintPreview &&
              !! gController.outlineView.getSelectedSceneID();
      case "cmd-treeitem-down":
      case "cmd-treeitem-up":
      case "cmd-treeitem-recycle":
      case "cmd-treeitem-delete":
      case "cmd-treeitem-goto":
        return ! this.inPrintPreview && gScriptController.isCommandEnabled(cmd);
      default:
        return false;
    }
  },


  doCommand: function doCommand (cmd) {
    switch (cmd) {
      case "cmd-cardview-toggle":
        this.toggleView();
        break;
      case "cmd-create-card":
        this.createScene();
        break;
      case "cmd-delete-card":
        this.deleteScene();
        break;
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        this.print();
        break;
      case "cmd-print-preview":
        if (this.getPrintOptions()) {
          this.destroy();
          this.view.contentWindow.focus();
          gApp.resetPrintingPrefs(false);
          gApp.setPrintMargins(0.25, 0.25, 0.25, 0.25);
          PrintUtils.printPreview(cards_onEnterPrintPreview,
            cards_onExitPrintPreview);
        }
        break;
      case "cmd-treeitem-down":
      case "cmd-treeitem-up":
      case "cmd-treeitem-recycle":
      case "cmd-treeitem-delete":
      case "cmd-treeitem-goto":
        gScriptController.doCommand(cmd);
        if (this._lastSelection)
          this.scrollToCard(this._lastSelection);
        break;
    }
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);
  },


  onScriptLoad: function onScriptLoad () {
    // this.generateSceneCards();
    this._dirty = true;
  },


  getPrintOptions: function getPrintOptions () {
    // Ensure style elements exist
    var head = this.view.contentDocument.documentElement.firstChild;
    var colourstyle = null;
    var borderstyle = null;
    var styles = head.getElementsByTagName("style");
    for (var i = 0; i < styles.length; ++i) {
      switch (styles[i].getAttribute("title")) {
        case "colourstyle": colourstyle = styles[i]; break;
        case "borderstyle": borderstyle = styles[i]; break;
      }
    }
    if (! colourstyle) {
      colourstyle = this.view.contentDocument.createElement("style");
      colourstyle.type = "text/css";
      colourstyle.setAttribute("title", "colourstyle");
      colourstyle.appendChild(this.view.contentDocument.createTextNode(
        "@media print { .scenecard { background-color: transparent "
        + "!important; } }\n"));
      head.appendChild(colourstyle);
      colourstyle.disabled = true;
    }
    if (! borderstyle) {
      borderstyle = this.view.contentDocument.createElement("style");
      borderstyle.type = "text/css";
      borderstyle.setAttribute("title", "borderstyle");
      borderstyle.appendChild(this.view.contentDocument.createTextNode(
        "@media print { .scenecard { border: 0.01em solid black "
        + "!important; } }\n"));
      head.appendChild(borderstyle);
      borderstyle.disabled = false;
    }

    var config = {
      accepted: false,
      colours: colourstyle.disabled,
      borders: ! borderstyle.disabled
    };

    openDialog(Cx.CONTENT_PATH + "editors/printcards.xul", "_blank",
      Cx.MODAL_DIALOG_FLAGS, config);

    if (! config.accepted) return false;

    colourstyle.disabled = config.colours;
    borderstyle.disabled = ! config.borders;

    return true;
  },


  print: function print () {
    if (! this.inPrintPreview) {
      if (! this.getPrintOptions())
        return;
    }
    gApp.resetPrintingPrefs(false);
    gApp.setPrintMargins(0.25, 0.25, 0.25, 0.25);
    PrintUtils.print();
  },


  init: function init () {
    if (this.view.docShell.busyFlags) {
      setTimeout("gCardController.init()", 100);
      return;
    }
    if (this.view.contentDocument) {
      this.setViewMode(this._mode);
      this.view.contentDocument.addEventListener("input", this, false);
      this.view.contentDocument.addEventListener("click", this, false);
      this.view.contentDocument.addEventListener("mousedown", this, false);
      // focus events don't bubble
      var inputs = this.view.contentDocument.documentElement
        .getElementsByTagName("input");
      for (var i = 0; i < inputs.length; ++i)
        inputs[i].addEventListener("focus", this, false);
      var textareas = this.view.contentDocument.documentElement
        .getElementsByTagName("textarea");
      for (var i = 0; i < textareas.length; ++i)
        textareas[i].addEventListener("focus", this, false);
    }
    gScriptController.sceneTracker.addObserver(this);
    this._active = true;
    this.onSceneSelect(gController.outlineView.getSelectedSceneID());
  },


  destroy: function destroy () {
    this._active = false;
    this._lastSelection = null;
    if (this.view.contentDocument) {
      this.view.contentDocument.removeEventListener("input", this, false);
      this.view.contentDocument.removeEventListener("click", this, false);
      this.view.contentDocument.removeEventListener("mousedown", this, false);
      var inputs = this.view.contentDocument.documentElement
        .getElementsByTagName("input");
      for (var i = 0; i < inputs.length; ++i)
        inputs[i].removeEventListener("focus", this, false);
      var textareas = this.view.contentDocument.documentElement
        .getElementsByTagName("textarea");
      for (var i = 0; i < textareas.length; ++i)
        textareas[i].removeEventListener("focus", this, false);
    }
    gScriptController.sceneTracker.removeObserver(this);
  },


  focus: function focus () {
    this._focused = true;
    if (this._dirty)
      this.generateSceneCards();
    this.view.setAttribute("type", "content-primary");
    this.outlineView.showSceneNav();
    // Allow the script controller to manage drag and drops in the nav
    gController.outlineView.setDelegate(gScriptController);
    setTimeout("gCardController.view.contentWindow.focus()", 0);
  },


  blur: function blur () {
    this._focused = false;
    if (this.inPrintPreview)
      PrintUtils.exitPrintPreview();
    this.view.setAttribute("type", "content");
    gController.outlineView.setDelegate(null);
  },


  generateSceneCards: function generateSceneCards () {
    this._dirty = false;
    this.destroy();
    try {
      var ps = getPrefService().getBranch("celtx.");
      var showtags = ps.getBoolPref("scenecards.showtags");

      var xsl = document.implementation.createDocument("", "", null);
      xsl.async = false;
      xsl.load(Cx.TRANSFORM_PATH + 'scenecards.xml');

      var proc = new XSLTProcessor();
      proc.importStylesheet(xsl);
      proc.setParameter(null, "cardmode", this._mode);
      proc.setParameter(null, "paraspercard", this._paraspercard);
      if (showtags)
        proc.setParameter(null, "showtags", 1);

      var out = proc.transformToDocument(
        gScriptController.editor.contentDocument);

      // Update the descriptions and alt titles
      var ds = this.project.ds;
      var rdfsvc = getRDFService();
      var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");
      var scenesres = ds.GetTarget(this.docres, scenesarc, true);
      if (scenesres) {
        var descarc = rdfsvc.GetResource(Cx.NS_DC + "description");
        var altarc = rdfsvc.GetResource(Cx.NS_CX + "alttitle");
        var colourarc = rdfsvc.GetResource(Cx.NS_CX + "colour");
        var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
        var scenes = (new RDFSeq(ds, scenesres)).toArray();
        for (var i = 0; i < scenes.length; ++i) {
          var sceneid = getRDFString(ds, scenes[i], sceneidarc);
          if (! sceneid)
            continue;

          var scenecard = out.getElementById(sceneid);
          if (! scenecard)
            continue;

          var alttitle = out.getElementById(sceneid + "alttitle");
          alttitle.setAttribute("value", getRDFString(ds, scenes[i], altarc));

          var scenedesc = out.getElementById(sceneid + "desc");
          var desc = getRDFString(ds, scenes[i], descarc);
          if (scenedesc.hasChildNodes())
            scenedesc.replaceChild(out.createTextNode(desc),
              scenedesc.firstChild);
          else
            scenedesc.appendChild(out.createTextNode(desc));

          var colour = getRDFString(ds, scenes[i], colourarc);
          if (! colour)
            colour = "white";
          scenecard.setAttribute("colour", colour);

          if (showtags) {
            var tag = out.getElementById(sceneid + "tag");
            var tagname = this.tagnames[colour];
            if (tag.hasChildNodes())
              tag.replaceChild(out.createTextNode(tagname),
                tag.firstChild);
            else
              tag.appendChild(out.createTextNode(tagname));
          }
        }
      }
      else {
        dump("*** no sceneres for script\n");
      }

      serializeDOMtoFile(out, this.tmpFile);
      this.view.webNavigation.loadURI(fileToFileURL(this.tmpFile),
        Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE,
        null, null, null);
      setTimeout("gCardController.init()", 0);
    }
    catch (ex) {
      dump("*** generateSceneCards: " + ex + "\n");
    }
  },


  setViewMode: function (mode) {
    if (! this.view.contentDocument)
      return;

    var button = document.getElementById("toggle-cardview-button");

    this._mode = mode;
    if (this._mode == "script") {
      button.setAttribute("label", gApp.getText("ShowNotes"));
      button.setAttribute("showing", "front");
    }
    else {
      button.setAttribute("label", gApp.getText("ShowScript"));
      button.setAttribute("showing", "back");
    }
    this.view.contentDocument.body.setAttribute("mode", this._mode);
  },


  toggleView: function toggleView () {
    /*
     * We stop receiving input events if the text area is focused when it
     * loses visibility.
     */
    var ITextArea = Components.interfaces.nsIDOMHTMLTextAreaElement;
    var IInput = Components.interfaces.nsIDOMHTMLInputElement;
    var focus = document.commandDispatcher.focusedElement;
    if (focus && (focus instanceof ITextArea || focus instanceof IInput))
      focus.blur();
    if (this._mode == "desc")
      this.setViewMode("script");
    else
      this.setViewMode("desc");
  },


  sceneListChanged: function sceneListChanged () {
    if (this.suspendUpdates || this._dirty)
      return;

    // Ensure there's at least one card/scene.
    try {
      if (gScriptController.editor.sceneCount < 1) {
        gScriptController.editor.createScene("", 1);
        gScriptController.sceneTracker.update();
        return;
      }
      this._dirty = true;
      if (this._focused)
        setTimeout("gCardController.generateSceneCards()", 0);
    }
    catch (ex) {
      dump("*** sceneListChanged: " + ex + "\n");
    }
  },


  sceneChanged: function sceneChanged (sceneres) {
    if (! sceneres || this._dirty)
      return;
    var ds = this.project.ds;
    var rdfsvc = getRDFService();
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var colourarc = rdfsvc.GetResource(Cx.NS_CX + "colour");
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
    try {
      var sceneid = getRDFString(ds, sceneres, sceneidarc);
      if (! sceneid)
        throw "no sceneid for sceneres";

      var title = getRDFString(ds, sceneres, titlearc);
      var colour = getRDFString(ds, sceneres, colourarc);
      if (! colour)
        colour = "white";

      var doc = this.view.contentDocument;
      var card = doc.getElementById(sceneid);
      if (! card)
        throw "no card for sceneid";
      if (card.getAttribute("colour") != colour)
        card.setAttribute("colour", colour);

      var titlebox = doc.getElementById(sceneid + "title");
      if (! titlebox)
        throw "no titlebox for sceneid";
      if (titlebox.value != title)
        titlebox.value = title;
    }
    catch (ex) {
      dump("*** gCardController.sceneChanged: " + ex + "\n");
    }
  },


  sceneContentChanged: function sceneContentChanged (sceneres) {
    if (! sceneres || this._dirty)
      return;
    var ds = this.project.ds;
    var rdfsvc = getRDFService();
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
    var sceneid = getRDFString(ds, sceneres, sceneidarc);
    var div = this.view.contentDocument.getElementById(sceneid + "script");
    if (! div)
      return;
    while (div.hasChildNodes())
      div.removeChild(div.lastChild);
    var para = gScriptController.editor.contentDocument.getElementById(sceneid);
    if (! para) {
      dump("*** Whoah, no scene heading for sceneContentChanged event\n");
      return;
    }
    para = nextElement(para);
    var doc = this.view.contentDocument;
    var i = this._paraspercard;
    while (para && para.className != "sceneheading" && i > 0) {
      var p = doc.createElement("p");
      p.appendChild(doc.createTextNode(stringify(para)));
      div.appendChild(p);
      --i;
      para = nextElement(para);
    }
  },


  onSceneSelect: function onSceneSelect (sceneid) {
    if (! this.view.contentDocument)
      return;
    if (this.view.docShell.busyFlags) {
      // I don't think this should happen...
      setTimeout("gCardController.onSceneSelect('" + sceneid + "')", 100);
      return;
    }
    if (this._lastSelection) {
      var lastsel = this.view.contentDocument.getElementById(
        this._lastSelection);
      if (lastsel)
        lastsel.removeAttribute("selected");
    }
    if (sceneid) {
      var sel = this.view.contentDocument.getElementById(sceneid);
      if (sel)
        sel.setAttribute("selected", "true");
    }
    this._lastSelection = sceneid;
  },


  editListener: {
    DidCreateNode: function (tag, node, parent, position, result) {
    },
    DidDeleteNode: function (child, result) {
    },
    DidDeleteSelection: function (selection) {
    },
    
  },


  handleEvent: function handleEvent (event) {
    var IInput = Components.interfaces.nsIDOMHTMLInputElement;
    var ITextArea = Components.interfaces.nsIDOMHTMLTextAreaElement;
    switch (event.type) {
      case "input":
        if (event.target instanceof ITextArea ||
            event.target instanceof IInput)
          this.onInput(event.target);
        break;
      case "focus":
        this.onFocus(event.target);
        break;
      case "click":
        this.onClick(event.target);
        break;
      case "mousedown":
        this.onMouseDown(event);
        break;
      case "mousemove":
        this.onMouseMove(event);
        break;
      case "mouseup":
        this.onMouseUp(event);
        break;
    }
  },


  onMouseDown: function onMouseDown (event) {
    // Drags can start from the scene header 
    var element = event.target;
    if (element.className != "sceneheader" &&
        element.className != "scenescript" &&
        element.className != "scenecard" &&
        element.localName != "hr" &&
        element.localName != "p" &&
        element.parentNode.className != "scenescript")
      return;

    while (element && element.className != "scenecard")
      element = element.parentNode;
    if (! element)
      return;

    this._dragX = event.clientX;
    this._dragY = event.clientY;
    var view = document.getElementById("cardview");
    this._grabX = event.clientX + view.contentWindow.scrollX
      - element.offsetLeft;
    this._grabY = event.clientY + view.contentWindow.scrollY
      - element.offsetTop;
    // this._dragElement = element;
    this._dragID = element.id;
    this._dragElement = view.contentDocument.getElementById("dragcard");
    this._dragging = false;
    this._dropIndicator = view.contentDocument.getElementById("dropindicator");
    // We add a listener to the top window so we don't stop tracking if
    // the mouse goes outside the editor region
    window.addEventListener("mousemove", this, false);
    window.addEventListener("mouseup", this, false);

    event.preventDefault();
  },


  checkScroll: function checkScroll () {
    if (! this._dragging)
      return;

    var view = document.getElementById("cardview");

    // Check if any scrolling is necessary (doesn't scroll automatically)
    var SCROLL_SENSITIVITY = 5;
    var SCROLL_INCREMENT = 4;
    var dtop = Math.abs(this._clientY);
    var dbottom = Math.abs(view.boxObject.height - this._clientY);
    if (dtop < SCROLL_SENSITIVITY) {
      if (view.contentWindow.scrollY > 0) {
        view.contentWindow.scrollBy(0, -SCROLL_INCREMENT);
        setTimeout("gCardController.checkScroll()", 100);
      }
    }
    else if (dbottom < SCROLL_SENSITIVITY) {
      if (view.contentWindow.scrollY < view.contentWindow.scrollMaxY) {
        view.contentWindow.scrollBy(0, SCROLL_INCREMENT);
        setTimeout("gCardController.checkScroll()", 100);
      }
    }
  },


  onMouseMove: function onMouseMove (event) {
    var dx = Math.abs(this._dragX - event.clientX);
    var dy = Math.abs(this._dragY - event.clientY);
    if (dx < 4 || dy < 4)
      return;

    this._clientX = event.clientX;
    this._clientY = event.clientY;
    this.checkScroll();

    var view = document.getElementById("cardview");
    var mousex = event.clientX + view.contentWindow.scrollX;
    var mousey = event.clientY + view.contentWindow.scrollY;

    var x = mousex - this._grabX;
    var y = mousey - this._grabY;
    this._dragElement.setAttribute("style", "left: " + x + "px; top: "
      + y + "px;");
    this._dragElement.setAttribute("dragging", "true");
    this._dragging = true;

    var card = this.cardForCoords(mousex, mousey);
    if (this._indicatorcard && this._indicatorcard != card)
      this._indicatorcard.removeAttribute("dragindicator");

    if (! card || card.id == this._dragID) {
      this._indicatorcard = null;
      this._dropIndicator.removeAttribute("visible");
      return;
    }

    var midpoint = card.offsetLeft + card.clientWidth / 2;
    if (mousex < midpoint) {
      card.setAttribute("dragindicator", "before");
      // This magic number comes from:
      // 3px margin on cards (6px between cards)
      // 1px width of drop indicator
      // 2px right border of drop indicator
      this._dropIndicator.setAttribute("style", "left: "
        + (card.offsetLeft - 6) + "px; top: " + card.offsetTop + "px;");
    }
    else {
      card.setAttribute("dragindicator", "after");
      // This magic number comes from:
      // 3px margin on cards (6px between cards)
      this._dropIndicator.setAttribute("style", "left: "
        + (card.offsetLeft + card.clientWidth + 3)
        + "px; top: " + card.offsetTop + "px;");
    }

    this._dropIndicator.setAttribute("visible", "true");
    this._indicatorcard = card;
  },


  onMouseUp: function onMouseUp (event) {
    window.removeEventListener("mousemove", this, false);
    window.removeEventListener("mouseup", this, false);

    var card = this._indicatorcard;

    var view = document.getElementById("cardview");
    this._dragging = false;
    this._dragElement.removeAttribute("dragging");
    this._dropIndicator.removeAttribute("visible");
    if (card) {
      var before = card;
      if (card.getAttribute("dragindicator") != "before")
        card = nextElement(card);
      this._indicatorcard.removeAttribute("dragindicator");
      var dragcard = view.contentDocument.getElementById(this._dragID);
      card.parentNode.insertBefore(dragcard, card);
      var pos = card.className == "scenecard"
        ? gScriptController.editor.scenePosition(card.id)
        : gScriptController.editor.sceneCount + 1;
      this.suspendUpdates = true;
      gScriptController.moveSceneToIndex(this._dragID, pos);
      this.suspendUpdates = false;
    }
    this._dragElement = null;
    this._dragID = null;
    this._indicatorcard = null;
  },


  cardForCoords: function cardForCoords (x, y) {
    var view = document.getElementById("cardview");
    var cards = view.contentDocument.body.childNodes;
    for (var i = 0; i < cards.length; ++i) {
      if (cards[i].className != "scenecard")
        continue;
      if (cards[i].id == this._dragID)
        continue;
      var top = cards[i].offsetTop;
      var bottom = top + cards[i].clientHeight;
      var left = cards[i].offsetLeft;
      var right = left + cards[i].clientWidth;
      if (x >= left && x <= right && y >= top && y <= bottom) {
        return cards[i];
      }
    }
    return null;
  },


  onFocus: function onFocus (element) {
    var IBody = Components.interfaces.nsIDOMHTMLBodyElement;
    var card = null;
    var tmpnode = element;
    while (tmpnode && ! (tmpnode instanceof IBody)) {
      if (tmpnode.className == "scenecard") {
        card = tmpnode;
        break;
      }
      tmpnode = tmpnode.parentNode;
    }

    if (! card)
      return;

    var sceneres = gScriptController.sceneTracker.sceneForSceneID(card.id);
    if (! sceneres) {
      dump("*** No scene resource for scene card " + card.id + "\n");
      return;
    }
    gController.outlineView.selectScene(sceneres);
  },


  onClick: function onClick (element) {
    // Select the card in the scene navigator
    var IBody = Components.interfaces.nsIDOMHTMLBodyElement;
    var IImage = Components.interfaces.nsIDOMHTMLImageElement;
    var card = null;
    var tmpnode = element;
    while (tmpnode && ! (tmpnode instanceof IBody)) {
      if (tmpnode.className == "scenecard") {
        card = tmpnode;
        break;
      }
      tmpnode = tmpnode.parentNode;
    }

    if (! card)
      return;

    // Fixes bug 285: Incorrect index card deleted.
    // What happens is, if you click inside one of a card's input elements,
    // then click in a non-input region of another card, the first card's
    // input element generates a new focus event whenever the content window
    // receives focus.
    var focus = document.commandDispatcher.focusedElement;
    if (focus && focus != element)
      focus.blur();

    var sceneres = gScriptController.sceneTracker.sceneForSceneID(card.id);
    if (! sceneres) {
      dump("*** No scene resource for scene card " + card.id + "\n");
      return;
    }
    gController.outlineView.selectScene(sceneres);

    // Check if it's a click on the colour pushpin
    if (element.className != "tagname" && element.className != "pushpin")
      return;

    var ds = this.project.ds;
    var rdfsvc = getRDFService();
    var colourarc = rdfsvc.GetResource(Cx.NS_CX + "colour");
    var colour = getRDFString(ds, sceneres, colourarc);
    if (colour == "")
      colour = "white";

    // Make a copy of our current tag names
    var tagnames = {};
    for (var key in this.tagnames)
      tagnames[key] = this.tagnames[key];
    var config = {
      accepted: false,
      colour: colour,
      tagnames: tagnames
    };

    // Keep track of the showtags pref
    var ps = getPrefService().getBranch("celtx.scenecards.");
    var showtags = ps.getBoolPref("showtags");

    openDialog(Cx.CONTENT_PATH + "editors/colourpicker.xul", "_blank",
      Cx.MODAL_DIALOG_FLAGS, config);
    if (! config.accepted)
      return;


    // We need to regenerate the cards if the tag prefs were changed, but
    // we only need to alter one card if the user just changed its colour
    // and its tag.
    var tagPrefsModified = false;

    if (showtags != ps.getBoolPref("showtags"))
      tagPrefsModified = true;

    for (var key in this.tagnames) {
      if (this.tagnames[key] != tagnames[key]) {
        this._modified = true;
        tagPrefsModified = true;
        this.tagnames[key] = tagnames[key];
      }
    }

    if (config.colour != colour) {
      ds.beginUpdateBatch();
      setRDFString(ds, sceneres, colourarc, config.colour);
      ds.endUpdateBatch();
      this.project.isModified = true;
    }

    if (tagPrefsModified) {
      this.generateSceneCards();
    }
    else {
      card.setAttribute("colour", config.colour);
      var doc = card.ownerDocument;
      var tagdiv = doc.getElementById(card.id + "tag");
      if (tagdiv) {
        if (tagdiv.hasChildNodes())
          tagdiv.firstChild.nodeValue = this.tagnames[config.colour];
        else
          tagdiv.appendChild(doc.createTextNode(this.tagnames[config.colour]));
      }
    }
  },


  // For the description textarea
  elementChanged: function elementChanged (element) {
    // Make sure the sceneid is a non-greedy match, or else it will
    // absorb the "alt" part of "alttitle"
    var matches = element.id.match(/(.+?)(desc|(alt)?title)/);
    if (! matches)
      return;

    var sceneid = matches[1];
    var sceneres = gScriptController.sceneTracker.sceneForSceneID(sceneid);
    if (! sceneres) {
      dump("*** gCardController.onInput: No scene with id " + sceneid + "\n");
      return;
    }
    var rdfsvc = getRDFService();
    var ds = this.project.ds;

    if (matches[2] == "title") {
      var editor = gScriptController.editor;
      var scene = editor.contentDocument.getElementById(sceneid);
      if (scene) {
        editor.replaceParagraphContents(scene, element.value);
      }
      else {
        dump("*** Couldn't find paragraph for scene " + sceneid + "\n");
      }
      gScriptController.sceneTracker.update();
      gController.outlineView.selectScene(sceneres);
      return;
    }

    var arc = null;
    if (matches[2] == "alttitle")
      arc = rdfsvc.GetResource(Cx.NS_CX + "alttitle");
    else
      arc = rdfsvc.GetResource(Cx.NS_DC + "description");

    var project = this.project;
    setRDFString(ds, sceneres, arc, element.value);
    project.isModified = true;
  },


  onInput: function onInput (element) {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
      if (this._changedElement != element)
        this.elementChanged(this._changedElement);
    }

    this._changedElement = element;
    var self = this;
    function callback () {
      self.elementChanged(self._changedElement);
      self._timer = null;
    };
    this._timer = setTimeout(callback, 1000);
  },


  scrollToCard: function scrollToCard (id) {
    if (this.view.docShell.busyFlags) {
      setTimeout("gCardController.scrollToCard('" + id + "')", 100);
      return;
    }
    var card = this.view.contentDocument.getElementById(id);
    if (! card) {
      dump("*** gCardController.scrollToCard: No card with id " + id + "\n");
      return;
    }
    var win = this.view.contentWindow;
    win.scrollTo(win.scrollX, card.offsetTop);
  },


  createScene: function createScene () {
    // Check if the current card has been modified first
    var card = this._lastSelection ?
      this.view.contentDocument.getElementById(this._lastSelection) : null;
    if (this._lastSelection) {
      var title = this.view.contentDocument.getElementById(
        this._lastSelection + "title");
      var desc = this.view.contentDocument.getElementById(
        this._lastSelection + "desc");
      if (title)
        this.onInput(title);
      if (desc)
        this.onInput(desc);
    }

    // Scene positions start at 1 in the script, 0 in the RDFSeq
    var pos = gScriptController.editor.sceneCount;
    var sceneres = gController.outlineView.getSelectedScene();
    if (sceneres) {
      var sceneidarc = getRDFService().GetResource(Cx.NS_CX + "sceneid");
      var sceneid = getRDFString(this.project.ds, sceneres, sceneidarc);
      if (sceneid)
        pos = gScriptController.editor.scenePosition(sceneid);
    }

    var scene = gScriptController.editor.createScene("", pos + 1);
    gScriptController.sceneTracker.update();
    setTimeout(function () {
      gController.outlineView.selectSceneAtIndex(pos);
      gCardController.scrollToCard(scene.id);
    }, 100);
  },


  deleteScene: function deleteScene () {
    if (this._lastSelection) {
      var ps = getPromptService();
      var title = gApp.getText("DeleteCard");
      var msg = gApp.getText("DeleteCardPrompt");
      if (! ps.confirm(window, title, msg))
        return;
      gScriptController.editor.deleteScene(this._lastSelection);
      gScriptController.sceneTracker.update();
    }
  }
};


function cards_onEnterPrintPreview () {
  gCardController.inPrintPreview = true;
  gController.updateCommands();
  getBrowser().contentWindow.focus();
}


function cards_onExitPrintPreview () {
  gCardController.inPrintPreview = false;
  gController.updateCommands();
  gCardController.init();
}
