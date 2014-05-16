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

function ClipboardSanitizer (controller) {
  this.controller = controller;
}


ClipboardSanitizer.prototype = {
  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIClipboardDragDropHooks))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },


  sanitizeFragment: function (fragment) {
    if (! fragment.hasChildNodes())
      return fragment;

    var IElement = Components.interfaces.nsIDOMHTMLElement;
    var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
    var IDiv = Components.interfaces.nsIDOMHTMLDivElement;
    var IBr = Components.interfaces.nsIDOMHTMLBRElement;

    var dstdoc = this.controller.editor.contentDocument;

    var allowedClasses = {
      act: 1,
      sceneheading: 1,
      caption: 1,
      title: 1,
      action: 1,
      character: 1,
      parenthetical: 1,
      dialog: 1,
      sound: 1,
      music: 1,
      voice: 1,
      shot: 1,
      transition: 1
    };

    var allowedAttributes = {};

    function cleanNode (node) {
      if (! (node instanceof IElement))
        return;

      node = node.QueryInterface(IElement);

      // If splice is true, the element's children should be inserted
      // in place of the element itself
      var splice = false;

      if (node instanceof IPara) {
        if (node.className && ! (node.className in allowedClasses))
          node.className = "";

        allowedAttributes = {
          "class": 1,
          id: 1,
          headingcontents: 1,
          scenecontents: 1
        };
      }
      else if (node.nodeName.toLowerCase() == "span") {
        allowedAttributes = {
          "class": 1,
          id: 1,
          ref: 1,
          noteid: 1,
          mediaid: 1,
          style: 1,
          text: 1,
          date: 1,
          mediares: 1,
          revision: 1
        };
      }
      else if (node instanceof IDiv) {
        allowedAttributes = {
          "class": 1
        };

        if (node.className != "softbreak" && node.className != "hardbreak")
          splice = true;
      }
      else if (node instanceof IBr) {
        // Do nothing...
      }
      else {
        splice = true;
      }

      if (splice) {
        while (node.hasChildNodes()) {
          var child = node.firstChild;
          node.parentNode.insertBefore(child, node);
          cleanNode(child);
        }
        node.parentNode.removeChild(node);
      }
      else {
        var attrs = node.attributes;
        var attrnames = {};
        for (var i = 0; i < attrs.length; ++i) {
          var attr = attrs[i].QueryInterface(Components.interfaces.nsIDOMAttr);
          attrnames[attr.name] = 1;
        }

        for (var name in attrnames) {
          if (! (name in allowedAttributes)) {
            attrs.removeNamedItem(name);
          }
          else if (name == "style") {
            // Check for forbidden CSS properties
            var attr = attrs.getNamedItem(name);
            var components = attr.nodeValue.split(';');
            var modified = false;
            for (var i = 0; i < components.length; ++i) {
              var propcomponents = components[i].split(':');
              if (propcomponents.length != 2)
                continue;
              var propname = propcomponents[0];
              var propval = propcomponents[1];
              if (propname.match(/font(?!-(weight|style))/) ||
                  (propname.match(/text-decoration/) &&
                   ! propval.match(/underline/))) {
                components.splice(i--, 1);
                modified = true;
              }
            }
            if (modified) {
              attr.nodeValue = components.join(';');
            }
          }
        }

        var curnode = node.firstChild;
        var nextnode = null;
        while (curnode) {
          nextnode = curnode.nextSibling;
          cleanNode(curnode);
          curnode = nextnode;
        }
      }
    }

    var curnode = fragment.firstChild;
    var nextnode = null;
    while (curnode) {
      nextnode = curnode.nextSibling;
      cleanNode(curnode);
      curnode = nextnode;
    }

    // Ensure there are no orphaned text nodes
    curnode = fragment.firstChild;
    nextnode = null;
    // Anonymous paragraph (and trailing BR) for enclosing any
    // orphaned text nodes or spans
    var anonpara = null;
    var anonbr = null;
    while (curnode) {
      nextnode = curnode.nextSibling;
      if ((curnode instanceof Components.interfaces.nsIDOMText &&
          curnode.nodeValue.match(/\S/)) ||
          curnode.nodeName.toLowerCase() == "span") {
        if (! anonpara) {
          anonpara = dstdoc.createElement("p");
          anonbr = dstdoc.createElement("br");
          anonpara.appendChild(anonbr);
          fragment.insertBefore(anonpara, curnode);
        }
        anonpara.insertBefore(curnode, anonbr);
      }
      else {
        anonpara = null;
        anonbr = null;
        if (curnode instanceof IBr)
          fragment.removeChild(curnode);
      }
      curnode = nextnode;
    }

    return fragment;
  },


  removeIncorrectIDs: function () {
    var xpath = new XPathEvaluator();
    var seen = {};
    var str = "//*[@id]";
    var xpr = xpath.evaluate(str, this.controller.editor.contentDocument, null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    function generateUniqueID () {
      var newid = generateID();
      while (newid in seen)
        newid = generateID();
      return newid;
    }

    var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
    for (var i = 0; i < xpr.snapshotLength; ++i) {
      var node = xpr.snapshotItem(i);
      if (node instanceof IPara) {
        switch (node.className) {
          case "act":
          case "sceneheading":
          case "shot":
            break;
          default:
            node.removeAttribute("id");
        }
      }
      while (node.id in seen)
        node.id = generateUniqueID();
      seen[node.id] = 1;
    }
  },


  convertUnsupportedClasses: function convertUnsupportedClasses () {
    var start = (new Date()).valueOf();
    var xpath = new XPathEvaluator();
    var mappings = {
      film: {
        title: "",
        act: "sceneheading",
        caption: "action",
        sound: "action",
        music: "action",
        voice: "action"
      },
      theatre: {
        title: "act",
        caption: "action",
        shot: "action",
        sound: "action",
        music: "action",
        voice: "action"
      },
      radio: {
        act: "sceneheading",
        caption: "action",
        shot: "action",
        transition: "action",
        text: "action"
      },
      av: {
        title: "sceneheading",
        act: "sceneheading",
        action: "shot",
        caption: "shot",
        sound: "dialog",
        music: "dialog",
        voice: "dialog",
        transition: "shot",
        text: "shot"
      },
      comic: {
        title: "sceneheading",
        act: "sceneheading",
        action: "shot",
        sound: "dialog",
        music: "dialog",
        voice: "dialog",
        transition: "shot",
        text: "caption"
      }
    };
    var mapping = mappings[this.controller.mode];
    var classes = [];
    var convertText = false;
    for (var class in mapping) {
      if (class == "text")
        convertText = true;
      else
        classes.push(class);
    }
    if (classes.length < 1) {
      dump("*** convertUnsupportedClasses: no classes in mapping for "
        + this.controller.mode + "\n");
      return;
    }
    var classstr = "@class='" + classes.join("' or @class='") + "'";
    if (convertText)
      classstr += " or @class=''";

    var preconvtime = (new Date()).valueOf();
    var str = "/html/body/p[" + classstr + "]";
    var xpr = xpath.evaluate(str, this.controller.editor.contentDocument, null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    var findparastime = (new Date()).valueOf();
    if (xpr.snapshotLength > 0) {
      this.controller.editor.editor.beginTransaction();
      try {
        for (var i = 0; i < xpr.snapshotLength; ++i) {
          var p = xpr.snapshotItem(i);
          var src = p.className;
          if (! src || src.length == 0)
            src = "text";
          this.controller.editor.editor.setAttribute(p, "class",
            mappings[this.controller.mode][src]);
        }
      }
      catch (ex) {
        dump("*** convertUnsupportedClasses: " + ex + "\n");
      }
      this.controller.editor.editor.endTransaction();
    }
    var postconvtime = (new Date()).valueOf();

    // Stageplay requires an act be added at the start
    if (this.controller.mode == "theatre") {
      var IElement = Components.interfaces.nsIDOMElement;
      var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
      var doc = this.controller.editor.contentDocument;
      var actnode = doc.body.firstChild;
      while (actnode && ! (actnode instanceof IPara))
        actnode = nextElement(actnode);
      if (! actnode || actnode.className != "act") {
        this.controller.editor.editor.beginTransaction();
        actnode = doc.createElement("p");
        actnode.setAttribute("class", "act");
        actnode.appendChild(doc.createTextNode(
          gApp.getText("TheatreTmplActTitle")));
        actnode.appendChild(doc.createElement("br"));
        this.controller.editor.editor.insertNode(actnode, doc.body, 0);
        this.controller.editor.editor.endTransaction();
        this.controller.editor.selection.collapse(actnode, 0);
      }
    }
  },


  // nsIClipboardDragDropHooks implementation
  allowDrop: function allowDrop (event, session) {
    return true;
  },


  allowStartDrag: function allowStartDrag (event) {
    return true;
  },


  onCopyOrDrag: function onCopyOrDrag (event, trans) {
    if (event != null) {
      // Triggered by drag
      this.dragSource = this.controller.editor;
      return true;
    }
    // The trailing <br> tag on a paragraph often causes the selection not
    // to extend to the end of the paragraph, resulting in a classless
    // paragraph fragment being copied. This kludges it to be fitter, happier,
    // and more productive.

    var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
    var IBR   = Components.interfaces.nsIDOMHTMLBRElement;
    var IText = Components.interfaces.nsIDOMText;

    var range = this.controller.editor.selection.getRangeAt(0);
    var node = range.endContainer;
    var offset = range.endOffset;
    var atEnd = true;

    if (node instanceof IText) {
      if (offset < node.nodeValue.length)
        atEnd = false;
      while (atEnd && node && ! (node instanceof IPara)) {
        // Add one to the offset, because the cursor is after the node
        offset = offsetInParent(node) + 1;
        node = node.parentNode;
      }
      if (! node)
        atEnd = false;
    }

    if (atEnd && ! (node instanceof IPara))
      atEnd = false;

    if (atEnd && offset >= node.childNodes.length)
      atEnd = true;

    node = node.childNodes[offset];
    if (atEnd && node && (node instanceof IBR))
      node = node.nextSibling;
    if (atEnd && node && (node instanceof IText) && node.nodeValue == "\n")
      node = node.nextSibling;

    // truth value
    if (node)
      atEnd = false;

    if (atEnd) {
      // Ensure paragraph closure. I wish I knew why Moz sucks so much.
      range.setEndAfter(range.endContainer);
      this.controller.editor.editor.copy();
      return false;
    }
    else {
      dump("--- atEnd was false\n");
    }

    try {
      var cxtxt = "celtx";
      var str = createSupportsString(cxtxt);
      try {
        /*
         * Sometimes onCopyOrDrag gets called twice for the same copy, and
         * then addDataFlavor throws an exception because the flavour already
         * exists. This seems to happen under certain circumstances involving
         * copying the entire script.
         */
        trans.addDataFlavor("text/x-celtx");
      }
      catch (ex) {
        dump("*** Suppressing an addDataFlavor exception\n");
      }
      trans.setTransferData("text/x-celtx", str, cxtxt.length * 2);
    }
    catch (ex) {
      dump("*** onCopyOrDrag: " + ex + "\n");
      return false;
    }
    return true;
  },


  onPasteOrDrop: function onPasteOrDrop (event, trans) {
    if (event != null) {
      // Triggered by drag
      var targetDoc = event.target.ownerDocument;
      if (this.dragSource != null &&
          this.dragSource.contentDocument != targetDoc) {
        this.dragSource.deleteSelection();
        this.dragSource = null;

        setTimeout("gScriptController.clipboardSanitizer."
          + "convertUnsupportedClasses()", 0);
      }

      if (this.dragSource != null) {
        return true;
      }
    }

    setTimeout("gScriptController.clipboardSanitizer."
      + "convertUnsupportedClasses()", 0);

    var clipboard = event ? null : getClipboard();
    var dragsession = event ? getDragService().QueryInterface(
      Components.interfaces.nsIDragSession) : null;

    var flavours = [ "text/html" ];
    
    if (clipboard && clipboard.hasDataMatchingFlavors(flavours, 1, 1) ||
        dragsession && dragsession.isDataFlavorSupported(["text/x-celtx"]))
      return true;

    try {
      var data = {};
      var dataLen = {};
      try {
        var htmlFlavour = createSupportsCString("text/html");
        flavours = createSupportsArray([ htmlFlavour ]);
        if (clipboard &&
            clipboard.hasDataMatchingFlavors(flavours, flavours.length, 0) ||
            dragsession && dragsession.isDataFlavorSupported("text/html")) {
          var converter = Components.classes[
            "@mozilla.org/widget/htmlformatconverter;1"]
            .createInstance(Components.interfaces.nsIFormatConverter);
          var htmlData = {};
          var htmlDataLen = {};
          trans.getTransferData("text/html", htmlData, htmlDataLen);
          converter.convert("text/html", htmlData.value, htmlDataLen.value,
            "text/unicode", data, dataLen);
        }
        else {
          trans.getTransferData("text/unicode", data, dataLen);
        }
      }
      catch (ex) {
        dump("*** pasting without formatting: " + ex + "\n");
        if (! event)
          this.controller.editor.editor.pasteNoFormatting(1);
        return false;
      }

      var IBody = Components.interfaces.nsIDOMHTMLBodyElement;
      var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
      var IElement = Components.interfaces.nsIDOMElement;
      var IString = Components.interfaces.nsISupportsString;
      var strdata = data.value.QueryInterface(IString).toString();
      var hasLineBreak = strdata.indexOf("\n") >= 0;
      if (! hasLineBreak) return true;
      // We can only guess if there were CRLFs in the clipboard prior
      // to it passing through XPConnect.
      if (strdata.indexOf("\n\n\n\n") > 0)
        strdata = strdata.replace(/\n\n/g, "\n");
      var importer = new ScriptImporter();
      importer.change_state(ScriptImporter.MODE_SCREENPLAY);
      var scriptDoc = importer.parse(strdata, false);
      var scenes = scriptDoc.getElementsByTagName("div");
      var ed = this.controller.editor;
      var sel = ed.selection;
      var doc = ed.contentDocument;
      ed.editor.beginTransaction();
      try {
        var offset = -1; // Paragraph offset
        var node = sel.anchorNode;

        // I don't know how to reproduce this reliably, but I've encountered
        // this before, where the anchorNode is the body.
        if (node instanceof IBody)
          node = node.childNodes[sel.anchorOFfset];

        node = ed.editor.getElementOrParentByTagName("p", node);
        if (node && stringify(node).match(/\S/)) {
          var left = ed.splitParagraph(sel.anchorNode, sel.anchorOffset);
          offset = offsetInParent(left) + 1;
          var next = left.nextSibling;
          while (next && ! (next instanceof IElement)) {
            next = next.nextSibling;
            offset++;
          }
        }
        else {
          if (node) {
            offset = offsetInParent(node);
            ed.editor.deleteNode(node);
          }
          else
            throw "No paragraph container. I have " + sel.anchorNode;
        }
        for (var i = 0; i < scenes.length; i++) {
          var scene = scenes[i];
          for (var j = 0; j < scene.childNodes.length; j++) {
            var imp = doc.importNode(scene.childNodes[j], true);
            ed.insertNode(imp, doc.body, offset++);
          }
        }
        sel.collapse(doc.body.childNodes[offset - 1],
                     doc.body.childNodes[offset - 1].childNodes.length);
      }
      catch (ex) {
        dump("*** Import error: " + ex + "\n");
      }
      this.convertUnsupportedClasses();
      ed.editor.endTransaction();
    }
    catch (ex) {
      dump("*** Conversion error: " + ex + "\n");
    }

    return false;
  }

};
