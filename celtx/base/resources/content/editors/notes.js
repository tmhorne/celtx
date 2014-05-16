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

function NoteSidebarController () {}


NoteSidebarController.prototype = {
  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) ||
        aIID.equals(Components.interfaces.nsIDOMEventListener) ||
        aIID.equals(Components.interfaces.celtxISidebar))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  commands: {},
  noteIDs: {},
  editor: null,
  context: null,
  _suppressMutationEvents: false,

  // Coloured notes support
  defaultColour: "#FDF7A1", // rgb(253,247,161), the original note colour
  replacedColour: "#FFFF99", // the nearest picker colour to our original
  lastColour: "#FDF7A1", // set to null to use defaultColour


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

    var body = this.editor.editor.contentDocument.body;
    body.addEventListener("click", this, false);
    body.addEventListener("DOMNodeInserted", this, false);
    body.addEventListener("DOMNodeRemoved", this, false);

    this.addbutton = document.getElementById("notesAddButton");
    this.addbutton.addEventListener("command", this, false);

    this.colourpicker = document.getElementById("notesColourPicker");
    this.colourpicker.addEventListener("select", this, false);

    this.noteslist = document.getElementById("noteslist");
    this.noteslist.addEventListener("change", this, false);
    this.noteslist.addEventListener("select", this, false);
    this.noteslist.addEventListener("remove", this, false);

    this.cacheNoteIDs();

    this.contextChanged(this.editor.selectedBreakdownUnit);
  },


  shutdown: function () {
    try {
      var body = this.editor.editor.contentDocument.body;
      body.removeEventListener("click", this, false);
      body.removeEventListener("DOMNodeInserted", this, false);
      body.removeEventListener("DOMNodeRemoved", this, false);
    }
    catch (ex) {
      dump("*** notes.body.removeEventListener: " + ex + "\n");
    }

    try {
      this.addbutton.removeEventListener("command", this, false);
    }
    catch (ex) {
      dump("*** notes.addbutton.removeEventListener: " + ex + "\n");
    }
    this.addbutton = null;

    try {
      this.colourpicker.removeEventListener("select", this, false);
    }
    catch (ex) {
      dump("*** notes.colourpicker.removeEventListener: " + ex + "\n");
    }
    this.colourpicker = null;

    try {
      this.noteslist.addEventListener("change", this, false);
      this.noteslist.addEventListener("select", this, false);
      this.noteslist.addEventListener("remove", this, false);
    }
    catch (ex) {
      dump("*** notes.noteslist.removeEventListener: " + ex + "\n");
    }
    this.noteslist = null;

    this.lastColour = this.defaultColour;

    this.noteIDs = new Object();

    this.context = null;
    this.editor = null;
  },


  cacheNoteIDs: function () {
    var xpath = new XPathEvaluator();
    var body = this.editor.editor.contentDocument.body;
    var xset = xpath.evaluate("//span[@class='note']", body, null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    var node;
    while ((node = xset.iterateNext()) != null) {
      var noteid = node.id;
      while (! noteid || (noteid in this.noteIDs))
        noteid = generateID();
      if (noteid != node.id)
        node.id = noteid;
      this.noteIDs[noteid] = 1;
    }
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
      case "click":
        this.editorClicked(aEvent);
        break;
      case "DOMNodeInserted":
        this.nodeInserted(aEvent);
        break;
      case "DOMNodeRemoved":
        this.nodeRemoved(aEvent);
        break;
      case "command":
        if (aEvent.target == this.addbutton)
          this.insertNote();
        break;
      case "select":
        if (aEvent.target == this.colourpicker)
          this.colourSelected(aEvent);
        else if (aEvent.target == this.noteslist) {
          var note = this.noteslist.selectedItem;
          aEvent.stopPropagation();
          if (note)
            this.noteSelected(note);
        }
      case "change":
        if (aEvent.target.parentNode == this.noteslist) {
          var note = aEvent.target;
          aEvent.stopPropagation();
          this.noteChanged(note);
        }
        break;
      case "remove":
        if (aEvent.target.parentNode == this.noteslist) {
          var note = aEvent.target;
          aEvent.stopPropagation();
          this.removeNote(note);
        }
        break;
    }
  },


  lock: function () {
  },


  unlock: function () {
  },


  contextChanged: function (aContext) {
    if (! aContext)
      return;

    if (this.context && this.context.equals(aContext))
      return;

    this.context = aContext;

    this.refreshNotes();
  },


  editorClicked: function (aEvent) {
    this.contextChanged(this.editor.selectedBreakdownUnit);

    var elem = aEvent.target;
    var tag = elem.localName.toLowerCase();
    if (tag == "span" && elem.className == "note")
      this.selectNoteWithID(elem.id);
    else
      this.noteslist.clearSelection();
  },


  nodeInserted: function (aEvent) {
    if (this._suppressMutationEvents)
      return;

    this._foundNote = false;
    try {
      this.nodeInsertedImpl(aEvent.target);
    }
    catch (ex) {
      dump("*** nodeInsertedImpl: " + ex + "\n");
    }
    if (this._foundNote) {
      this.refreshNotes();
      if ("gReportController" in window && this.context)
        gReportController.sceneContentChanged(this.context.resource);
    }
  },


  nodeInsertedImpl: function (aNode) {
    // Shortcut
    if (this._foundNote)
      return;

    if (aNode.hasChildNodes()) {
      var children = aNode.childNodes;
      for (var i = 0; i < children.length; ++i) {
        try {
          this.nodeInsertedImpl(children[i]);
        }
        catch (ex) {
          dump("*** nodeInsertedImpl: " + ex + "\n");
        }
      }
    }

    if (aNode.nodeName.toLowerCase() != "span" || aNode.className != "note")
      return;

    // Ensure unique IDs
    var noteid = aNode.id;
    while (! noteid || (noteid in this.noteIDs))
      noteid = generateID();
    if (noteid != aNode.id)
      aNode.id = noteid;
    this.noteIDs[noteid] = 1;

    var bgstr = this.getBackgroundColourStr(aNode);
    if (! bgstr || bgstr == "transparent")
      return;

    this.setNoteColour(aNode, bgstr);

    this._foundNote = true;
  },


  nodeRemoved: function (aEvent) {
    if (this._suppressMutationEvents)
      return;

    try {
      this.nodeRemovedImpl(aEvent.target);
    }
    catch (ex) {
      dump("*** nodeRemovedImpl: " + ex + "\n");
    }
  },


  nodeRemovedImpl: function (aNode) {
    if (aNode.hasChildNodes()) {
      var children = aNode.childNodes;
      for (var i = 0; i < children.length; ++i) {
        try {
          this.nodeRemovedImpl(children[i]);
        }
        catch (ex) {
          dump("*** nodeRemovedImpl: " + ex + "\n");
        }
      }
    }

    if (aNode.nodeName.toLowerCase() != "span" || aNode.className != "note")
      return;

    var noteid = aNode.id;
    if (! noteid) {
      dump("*** Note is missing an id\n");
      return;
    }

    delete this.noteIDs[noteid];

    var notes = this.noteslist.childNodes;
    var found = false;
    for (var i = 0; i < notes.length; ++i) {
      if (notes[i].getAttribute("noteid") == noteid) {
        found = true;
        this.noteslist.removeChild(notes[i]);
        break;
      }
    }
    // If a selection encompasses more than one context, the note might
    // not be in the current context
    if (found) {
      if ("gReportController" in window && this.context)
        gReportController.sceneContentChanged(this.context.resource);
    }
  },


  refreshNotes: function () {
    var noteslist = this.noteslist;
    while (noteslist.hasChildNodes())
      noteslist.removeChild(noteslist.lastChild);

    var seenIDs = {};
    var iter = Components.classes["@celtx.com/dom/iterator;1"]
      .createInstance(Components.interfaces.celtxINodeIterator);
    iter.init(this.context.element, this.context.domRange);

    var node;
    while ((node = iter.nextNode()) != null) {
      if (node.nodeName.toLowerCase() != "span" || node.className != "note")
        continue;

      var noteid = node.id;
      while (! noteid || seenIDs[noteid]) {
        noteid = generateID();
        node.id = noteid;
      }
      seenIDs[noteid] = 1;
      var notetext = node.getAttribute("text");
      var notedate = node.getAttribute("date");
      var scriptnote = document.createElementNS(Cx.NS_XUL, "scriptnote");
      scriptnote.setAttribute("noteid", noteid);
      scriptnote.setAttribute("value", notetext);
      if (notedate)
        scriptnote.setAttribute("date", notedate.toString());

      var colour = this.getBackgroundColourStr(node);
      if (colour && colour != "transparent") {
        var style = "background-color: " + colour + ";";
        // Use white text colour for dark backgrounds
        if (this.rgbToLuminosity(colour) < 0.5)
          style += " color: white;";
        scriptnote.setAttribute("style", style);
      }
      noteslist.appendChild(scriptnote);
    }
  },


  selectNoteWithID: function (noteid) {
    for (var i = 0; i < this.noteslist.childNodes.length; ++i) {
      var note = this.noteslist.childNodes[i];
      if (note.getAttribute("noteid") == noteid) {
      try {
        this.noteslist.selectedItem = note;
      }
      catch (ex) { dump("*** selectNoteWithID: " + ex + "\n"); }
        return note;
      }
    }
    dump("*** selectNoteWithID: No note has id " + noteid + "\n");
    return null;
  },


  insertNote: function () {
    var note = { text: "", id: generateID(), date: new Date() };
    this.editor.editor.insertNote(note);
    // TODO: Make this a notification
    if ("gReportController" in window && this.context)
      gReportController.sceneContentChanged(this.context.resource);
    var noteitem = this.selectNoteWithID(note.id);
    this.setNoteColour(noteitem, this.lastColour);
    noteitem.editbox.focus();
  },


  removeSelectedNote: function () {
    var noteslist = document.getElementById("noteslist");
    var item = noteslist.selectedItem;
    if (item)
      this.removeNote(item);
  },


  removeNote: function (aItem) {
    var noteid = aItem.getAttribute("noteid");
    if (! noteid) {
      dump("*** " + aItem.nodeName + " does not have a noteid\n");
      return;
    }
    var note = this.editor.editor.contentDocument
      .getElementById(noteid);
    this.editor.editor.removeNote(note);
  },


  noteSelected: function (aNote) {
    if (! aNote)
      printStackTrace();
    var scriptnote = this.editor.editor.contentDocument
      .getElementById(aNote.getAttribute("noteid"));
    if (scriptnote && ! this.editor.editor.isLocked)
      // Aah, the absurdity of nomenclature becomes apparent
      this.editor.editor.editor.selectElement(scriptnote);

    aNote.editbox.focus();
  },


  noteChanged: function noteChanged (aNote) {
    var scriptnote = this.editor.editor.contentDocument
      .getElementById(aNote.getAttribute("noteid"));
    if (! scriptnote || scriptnote.getAttribute("text") == aNote.value)
      return;

    scriptnote.setAttribute("text", aNote.value);
    scriptnote.setAttribute("date", aNote.date);
    this.editor.editor.incrementModificationCount(1);

    // TODO: Make this a notification
    if ("gReportController" in window && this.context)
      gReportController.sceneContentChanged(this.context.resource);
  },


  colourSelected: function (aEvent) {
    var picker = aEvent.target;
    var colour = picker.color;
    if (colour == this.replacedColour)
      colour = this.defaultColour;
    this.lastColour = colour;
    this.setSelectedNoteColour(colour);
    document.getElementById("notesColourPopup").hidePopup();
  },


  getBackgroundColourStr: function (el) {
    var doc = this.editor.editor.contentDocument;
    var style = doc.defaultView.getComputedStyle(el, "");
    var bgcolour = style.getPropertyCSSValue("background-color");
    if (! bgcolour)
      return null;

    var IPrim = Components.interfaces.nsIDOMCSSPrimitiveValue;
    bgcolour = bgcolour.QueryInterface(IPrim);

    // Transparent (default value)
    if (bgcolour.primitiveType == IPrim.CSS_IDENT)
      return "transparent";

    bgcolour = bgcolour.getRGBColorValue();
    var CSS_NUMBER = Components.interfaces
      .nsIDOMCSSPrimitiveValue.CSS_NUMBER;
    bgcolour = [
      bgcolour.red.getFloatValue(CSS_NUMBER),
      bgcolour.green.getFloatValue(CSS_NUMBER),
      bgcolour.blue.getFloatValue(CSS_NUMBER)
    ];

    function byteToHexStr (num) {
      var str = (new Number(num)).toString(16);
      while (str.length < 2)
        str = "0" + str;
      return str;
    }

    var bgstr = "#" +
      byteToHexStr(bgcolour[0]) +
      byteToHexStr(bgcolour[1]) +
      byteToHexStr(bgcolour[2]) ;

    return bgstr.toUpperCase();
  },


  setSelectedNoteColour: function (colour) {
    var noteslist = document.getElementById("noteslist");
    var note = noteslist.selectedItem;
    if (! note) return;
    this.setNoteColour(note, colour);
  },


  setNoteColour: function (note, colour) {
    if (colour == this.defaultColour) {
      note.removeAttribute("style");
    }
    else {
      var textcolour = "black";
      // Use white text colour for dark backgrounds
      if (this.rgbToLuminosity(colour) < 0.5)
        textcolour = "white";
      note.setAttribute("style", "background-color: " + colour + "; color: "
        + textcolour + ";");
    }
    var noteid = note.getAttribute("noteid");
    var scriptnote = this.editor.editor.contentDocument
      .getElementById(noteid);
    if (scriptnote) {
      // Don't modify notes that already have a colour set
      var bgstr = this.getBackgroundColourStr(scriptnote);
      if (bgstr == colour)
        return;
      else if ((! bgstr || bgstr == "transparent") &&
                colour == this.defaultColour)
        return;

      if (colour == this.defaultColour)
        scriptnote.removeAttribute("style");
      else
        scriptnote.setAttribute("style", "background-color: " + colour + ";");
      this.editor.editor.incrementModificationCount(1);
    }
    // Make sure this triggers a script report update
    // TODO: Make this a notification
    if ("gReportController" in window && this.context)
      gReportController.sceneContentChanged(this.context.resource);
  },


  rgbToLuminosity: function (colour) {
    var components = colour.toLowerCase().match(
      /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
    if (! components)
      throw new Error("Invalid RGB string: " + colour);

    function hexStrToNumber (str) {
      if (! str)
        throw new Error("hexStrToNumber: str is empty or null");

      var ord_0 = "0".charCodeAt(0);
      var ord_9 = "9".charCodeAt(0);
      var ord_a = "a".charCodeAt(0);
      var ord_f = "f".charCodeAt(0);

      var val = 0;
      for (var i = 0; i < str.length; ++i) {
        val *= 16;
        var c = str.charCodeAt(i);
        if (c >= ord_0 && c <= ord_9)
          val += c - ord_0;
        else if (c >= ord_a && c <= ord_f)
          val += 10 + c - ord_a;
        else
          throw new Error("hexStrToNumber: Invalid hex string '" + str + "'");
      }
      return val;
    }

    var rgb = [
      hexStrToNumber(components[1]),
      hexStrToNumber(components[2]),
      hexStrToNumber(components[3])
    ];

    // Luminosity weights of (0.30, 0.59, 0.11) from:
    // http://www.marginalsoftware.com/HowtoScan/color_channels.htm
    return (rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11) / 255.0;
  }
};
