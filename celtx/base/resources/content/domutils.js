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

function stringify (node) {
  try {
    var xpe = new XPathEvaluator();
    var rv = xpe.evaluate('normalize-space(string(.))',
                          node, null, XPathResult.STRING_TYPE, null);
    return rv.stringValue;
  }
  catch (ex) {
    dump("stringify: " + ex + "\n");
  }
  return '';
}


function stringify_ws (node) {
  try {
    var xpe = new XPathEvaluator();
    var rv = xpe.evaluate('string(.)',
                          node, null, XPathResult.STRING_TYPE, null);
    return rv.stringValue;
  }
  catch (ex) {
    dump("stringify_ws: " + ex + "\n");
  }
  return '';
}


function previousElement (node) {
  node = node.previousSibling;
  while (node && ! (node instanceof Components.interfaces.nsIDOMElement))
    node = node.previousSibling;
  return node;
}


function nextElement (node) {
  node = node.nextSibling;
  while (node && ! (node instanceof Components.interfaces.nsIDOMElement))
    node = node.nextSibling;
  return node;
}


// Given a DOM node, return an xpath expression locating it
function xpathForNode (node) {
  if (! (node && node.nodeType == document.ELEMENT_NODE)) return;

  var lcname = node.localName.toLowerCase();
  var parent = node.parentNode;
  if (parent && parent.nodeType == document.ELEMENT_NODE) {
    var pos = 0;
    for (var i = 0; i < parent.childNodes.length; i++) {
      var curr = parent.childNodes[i];
      if (curr.localName == node.localName) pos++;
      if (curr == node) {
        if (curr.getAttribute('id')) {
          return '//' + lcname + "[@id='" + curr.getAttribute('id') + "']";
        }
        else {
          return xpathForNode(parent) + '/' + lcname + '[' + pos + ']';
        }
      }
    }
  }
  else {
    return '/' + lcname;
  }
}


function offsetInParent (node, parent) {
  if (! node)
    return -1;
  if (! parent)
    parent = node.parentNode;
  try {
    var children = parent.childNodes;
    for (var i = 0; i < children.length; i++) {
      if (node == children[i])
        return i;
    }
  }
  catch (ex) {
    dump("*** offsetInParent: " + ex + "\n");
  }
  return -1;
}


function showRangeInDOM (range, dom) {
  showRangeUnderNode(range, dom.documentElement);
}


function showRangeUnderNode (range, node) {
  if (node instanceof Components.interfaces.nsIDOMText) {
    dump("#TEXT[");
    var offset = 0;
    if (node == range.startContainer) {
      dump(node.substringData(0, range.startOffset) + "^");
      offset = range.startOffset;
    }
    if (node == range.endContainer) {
      dump(node.substringData(offset, range.endOffset - offset) + "^");
      offset = range.endOffset;
    }
    if (offset < node.length)
      dump(node.substringData(offset, node.length - offset));
    dump("]");
  }
  else if (node instanceof Components.interfaces.nsIDOMElement ||
           node instanceof Components.interfaces.nsIDOMDocumentFragment) {
    if (node.hasChildNodes()) {
      dump("<" + node.nodeName + ">\n");
      var i = 0;
      if (node == range.startContainer) {
        for (; i < range.startOffset; i++)
          showRangeUnderNode(range, node.childNodes[i]);
        dump("^");
      }
      if (node == range.endContainer) {
        for (; i < range.endOffset; i++)
          showRangeUnderNode(range, node.childNodes[i]);
        dump("^");
      }
      for (; i < node.childNodes.length; i++)
        showRangeUnderNode(range, node.childNodes[i]);
      dump("</" + node.nodeName + ">\n");
    }
    else {
      dump("<" + node.nodeName + "/>\n");
    }
  }
}


function cssStyleRuleToString (rule) {
  return rule.selectorText + " {\n" + rule.style.cssText + "\n}\n\n";
}


function cssMediaRuleToString (rule) {
  var str = "@media " + rule.media.mediaText + " {\n";
  for (var i = 0; i < rule.cssRules.length; ++i)
    str += cssStyleRuleToString(rule.cssRules[i]);
  str += "}\n\n";
  return str;
}


function cssStyleSheetToString (stylesheet) {
  var str = "";
  var ICSSRule = Components.interfaces.nsIDOMCSSRule;
  var ICSSStyleRule = Components.interfaces.nsIDOMCSSStyleRule;
  var ICSSImportRule = Components.interfaces.nsIDOMCSSImportRule;
  var ICSSMediaRule = Components.interfaces.nsIDOMCSSMediaRule;
  for (var i = 0; i < stylesheet.cssRules.length; ++i) {
    var rule = stylesheet.cssRules[i];
    switch (rule.type) {
      case ICSSRule.STYLE_RULE:
        rule = rule.QueryInterface(ICSSStyleRule);
        str += cssStyleRuleToString(rule);
        break;
      case ICSSRule.IMPORT_RULE:
        rule = rule.QueryInterface(ICSSImportRule);
        str += cssStyleSheetToString(rule.styleSheet);
        break;
      case ICSSRule.MEDIA_RULE:
        rule = rule.QueryInterface(ICSSMediaRule);
        str += cssMediaRuleToString(rule);
        break;
    }
  }
  return str;
}


function NodeIterator (aNode) {
  // The "current" node is really what would be returned by nextNode()
  this.current = aNode;
}


NodeIterator.prototype = {
  nextNode: function () {
    if (! this.current)
      return null;

    var result = this.current;
    /*
     * In document order (i.e., preorder) traversal, you visit the node,
     * then its child nodes. That means once you've visited all of a node's
     * child nodes, the next node to visit is the node's next sibling, and
     * this is true recursively, so we just ascending until we find an
     * ancestor with a non-null nextSibling or we hit the top of the tree.
     */
    if (this.current.hasChildNodes()) {
      this.current = this.current.firstChild;
    }
    else {
      var parent = this.current.parentNode;
      while (parent && ! parent.nextSibling)
        parent = parent.parentNode;
      this.current = parent ? parent.nextSibling : null;
    }

    return result;
  },


  previousNode: function () {
    if (! this.current)
      return null;

    /*
     * In reverse document order (i.e., reverse preorder) traversal, you visit
     * the child nodes (from last to first) then the node itself. That means
     * once you've visited all of a node's child nodes, you visit the
     * right-most descendant of the node's previous sibling (or the sibling
     * itself if it has no child nodes). If there is no previous sibling, then
     * you visit the parent node.
     */
    if (! this.current.previousSibling) {
      this.current = this.current.parentNode;
    }
    else {
      var leaf = this.current.previousSibling;
      while (leaf.hasChildNodes())
        leaf = leaf.lastChild;
      this.current = leaf;
    }

    return this.current;
  }
};


function RangeLeafWalker (listener) {
  this.listener = listener;
}

RangeLeafWalker.prototype = {
  traverse: function (range) {
    // Establish the starting leaf
    var node = range.startContainer;
    if (node.hasChildNodes()) {
      node = node.childNodes[range.startOffset];
      while (node.hasChildNodes())
        node = node.firstChild;
    }
    // Establish the ending leaf
    var lastNode = range.endContainer;
    if (lastNode.hasChildNodes()) {
      lastNode = lastNode.childNodes[range.endOffset - 1];
      while (lastNode.hasChildNodes())
        lastNode = lastNode.lastChild;
    }
    // Iterate through the range
    while (true) {
      // Get the first leaf beneath the current node
      while (node.hasChildNodes())
        node = node.firstChild;
      // Tell the listener to visit it
      this.listener.visitLeaf(node);
      if (node == lastNode)
        break;
      // Locate the next node that is not an ancestor of the current one
      while (! node.nextSibling)
        node = node.parentNode;
      node = node.nextSibling;
    }
  }
};


/*
 * This is a helper class for encapsulating modifications to the DOM
 * as editor transactions. While you are manipulating the DOM, make sure
 * you don't cause any transactions to occur, or this will almost certainly
 * make the Undo/Redo stack inconsistent! Use as follows, where editor is
 * an nsIEditor:
 *
 *   var nodes = [ node1, node2, ... ];
 *   var tx = new DOMModificationTransaction(nodes);
 *   tx.beginRecording();
 *   // do various DOM operations to node1, node2, etc.
 *   tx.endRecording();
 *   editor.transactionManager.doTransaction(tx);
 *
 * Since all the DOM modifications have already been performed, the call
 * to doTransaction doesn't execute anything, it just adds the transaction
 * to the editor's Undo/Redo stack.
 *
 * All modifications to the subtrees rooted in nodes will be recorded.
 */
function DOMModificationTransaction (nodes, transient) {
  if (nodes.constructor == Array)
    this.nodes = nodes.concat();
  else
    this.nodes = new Array(nodes);
  this.changes = [];
  this.isTransient = transient ? true : false;
}


DOMModificationTransaction.prototype = {
  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsITransaction))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  beginRecording: function () {
    for (var i = 0; i < this.nodes.length; i++) {
      var node = this.nodes[i];
      node.addEventListener("DOMNodeInserted", this, false);
      node.addEventListener("DOMNodeRemoved", this, false);
      node.addEventListener("DOMAttrModified", this, false);
      node.addEventListener("DOMCharacterDataModified", this, false);
    }
  },

  endRecording: function () {
    for (var i = 0; i < this.nodes.length; i++) {
      var node = this.nodes[i];
      node.removeEventListener("DOMNodeInserted", this, false);
      node.removeEventListener("DOMNodeRemoved", this, false);
      node.removeEventListener("DOMAttrModified", this, false);
      node.removeEventListener("DOMCharacterDataModified", this, false);
    }
  },

  handleEvent: function (event) {
    const INode = Components.interfaces.nsIDOMNode;
    var tx = null;
    switch (event.type) {
      case "DOMNodeInserted":
      case "DOMNodeRemoved":
        // We don't care about all nodes
        switch (event.target.nodeType) {
          case INode.CDATA_SECTION_NODE:
          case INode.COMMENT_NODE:
          case INode.ELEMENT_NODE:
          case INode.TEXT_NODE:
            break;
          default:
            return;
        }
        tx = new DOMAddRemoveTx(event);
        break;
      case "DOMAttrModified":
        tx = new DOMAttrTx(event);
        break;
      case "DOMCharacterDataModified":
        tx = new DOMCDATATx(event);
        break;
    }
    this.changes.push(tx);
  },

  doTransaction: function () {
    // no-op
  },

  merge: function (transaction) {
    return false;
  },

  redoTransaction: function () {
    for (var i = 0; i < this.changes.length; i++)
      this.changes[i].redo();
  },

  undoTransaction: function () {
    for (var i = this.changes.length - 1; i >= 0; i--)
      this.changes[i].undo();
  }
};


// DOMNodeInserted or DOMNodeRemoved Transaction
function DOMAddRemoveTx (event) {
  this.added = (event.type == "DOMNodeInserted");
  var node = event.target;
  this.doc = node.ownerDocument;
  this.parent = xpathForNode(node.parentNode);
  var children = node.parentNode.childNodes;
  this.offset = -1;
  for (var i = 0; i < children.length; i++) {
    if (node == children[i]) {
      this.offset = i;
      break;
    }
  }
  if (this.offset < 0)
    throw "Unable to locate child offset within parent";
  this.nodeType = node.nodeType;
  this.nodeValue = node.nodeValue;
  if (node.namespaceURI) {
    this.namespaceURI = node.namespaceURI;
    this.nodeName = node.localName;
  }
  else
    this.nodeName = node.nodeName;
  this.attrs = [];
  if (node.hasAttributes()) {
    var attrs = node.attributes;
    for (var i = 0; i < attrs.length; i++)
      this.attrs.push({ name: attrs[i].nodeName, value: attrs[i].nodeValue });
  }
}

DOMAddRemoveTx.prototype = {
  undo: function () {
    var xpath = new XPathEvaluator();
    var rv = xpath.evaluate(this.parent, this.doc, null,
      XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    var parent = rv.singleNodeValue;
    if (! parent)
      throw "Could not locate parent for DOMAddRemoveTx";
    // Undoing an add is easy!
    if (this.added) {
      parent.removeChild(parent.childNodes[this.offset]);
      return;
    }
    else {
      const INode = Components.interfaces.nsIDOMNode;
      var node = null;
      switch (this.nodeType) {
        case INode.CDATA_SECTION_NODE:
          node = this.doc.createCDATASection(this.nodeValue);
          break;
        case INode.COMMENT_NODE:
          node = this.doc.createComment(this.nodeValue);
          break;
        case INode.ELEMENT_NODE:
          if (this.namespaceURI)
            node = this.doc.createElementNS(this.namespaceURI, this.nodeName);
          else
            node = this.doc.createElement(this.nodeName);
          for (var i = 0; i < this.attrs.length; i++)
            node.setAttribute(this.attrs[i].name, this.attrs[i].value);
          break;
        case INode.TEXT_NODE:
          node = this.doc.createTextNode(this.nodeValue);
          break;
        default:
          dump("*** Unhandled node type: " + this.nodeType + "\n");
      }
      if (! parent.hasChildNodes() || this.offset >= parent.childNodes.length)
        parent.appendChild(node);
      else {
        var follower = parent.childNodes[this.offset];
        if (! follower)
          throw "Parent has a null child";
        if (! node)
          throw "Node to reinsert is null";
        parent.insertBefore(node, parent.childNodes[this.offset]);
      }
    }
  },
  redo: function () {
    this.added = ! this.added;
    this.undo();
    this.added = ! this.added;
  }
};


// DOMAttrModified Transaction
function DOMAttrTx (event) {
  this.doc = event.target.ownerDocument;
  this.parent = xpathForNode(event.target);
  this.name = event.attrName;
  this.change = event.attrChange;
  this.oldValue = event.prevValue;
  this.newValue = event.newValue;
}

DOMAttrTx.prototype = {
  undo: function () {
    var xpath = new XPathEvaluator();
    var rv = xpath.evaluate(this.parent, this.doc, null,
      XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    var parent = rv.singleNodeValue;
    if (! parent)
      throw "Could not locate parent for DOMAttrTx";
    const MODIFICATION = 1;
    const ADDITION = 2;
    const REMOVAL = 3;
    switch (this.change) {
      case MODIFICATION:
        parent.attributes.getNamedItem(this.name).nodeValue = this.oldValue;
        break;
      case ADDITION:
        parent.attributes.removeNamedItem(this.name);
        break;
      case REMOVAL:
        var attr = this.doc.createAttribute(this.name);
        attr.nodeValue = this.oldValue;
        parent.attributes.setNamedItem(attr);
        break;
    }
  },
  redo: function () {
    var xpath = new XPathEvaluator();
    var rv = xpath.evaluate(this.parent, this.doc, null,
      XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    var parent = rv.singleNodeValue;
    if (! parent)
      throw "Could not locate parent for DOMAttrTx";
    const MODIFICATION = 1;
    const ADDITION = 2;
    const REMOVAL = 3;
    switch (this.change) {
      case MODIFICATION:
        parent.attributes.getNamedItem(this.name).nodeValue = this.newValue;
        break;
      case ADDITION:
        var attr = this.doc.createAttribute(this.name);
        attr.nodeValue = this.oldValue;
        parent.attributes.setNamedItem(attr);
        break;
      case REMOVAL:
        parent.attributes.removeNamedItem(this.name);
        break;
    }
  }
};


// DOMCharacterDataModified Transaction
function DOMCDATATx (event) {
  var node = event.target;
  this.doc = node.ownerDocument;
  // xpathForNode only handles elements, so we'll just take the extra
  // step of locating the CDATA/Text node by child number
  this.parent = xpathForNode(node.parentNode);
  var children = node.parentNode.childNodes;
  for (var i = 0; i < children.length; i++) {
    if (node == children[i]) {
      this.offset = i;
      break;
    }
  }
  this.oldValue = event.prevValue;
  this.newValue = event.newValue;
}

DOMCDATATx.prototype = {
  undo: function () {
    var xpath = new XPathEvaluator();
    var rv = xpath.evaluate(this.parent, this.doc, null,
      XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    var parent = rv.singleNodeValue;
    if (! parent)
      throw "Could not locate parent for DOMCDATATx";
    var node = parent.childNodes[this.offset];
    node.nodeValue = this.oldValue;
  },
  redo: function () {
    var xpath = new XPathEvaluator();
    var rv = xpath.evaluate(this.parent, this.doc, null,
      XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    var parent = rv.singleNodeValue;
    if (! parent)
      throw "Could not locate parent for DOMCDATATx";
    var node = parent.childNodes[this.offset];
    node.nodeValue = this.newValue;
  }
};
