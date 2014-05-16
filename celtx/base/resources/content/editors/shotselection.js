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

/*
 * SVGSelection: A prototype for objects that control selection
 * of an SVG object.
 *
 * SVGSelectionFactory: Creates instances of Selection based on
 * supplied SVG objects.
 */

var SVGSelectionFactory = {
  selectableObjectForNode: function (aNode, aRoot) {
    var IGroup = Components.interfaces.nsIDOMSVGGElement;
    var ISVG = Components.interfaces.nsIDOMSVGSVGElement;

    var object = aNode;
    var parent = aNode;
    while (parent && parent != aRoot) {
      // Only svg:g and svg:svg elements constitute larger selectable objects
      if (parent instanceof IGroup || parent instanceof ISVG)
        object = parent;

      parent = parent.parentNode;
    }

    return object;
  },


  selectionForObject: function (aObject) {
    var ILine = Components.interfaces.nsIDOMSVGLineElement;
    var IRect = Components.interfaces.nsIDOMSVGRectElement;
    var IEllipse = Components.interfaces.nsIDOMSVGEllipseElement;
    var IText = Components.interfaces.nsIDOMSVGTextElement;
    var IGroup = Components.interfaces.nsIDOMSVGGElement;

    if (aObject instanceof IGroup)
      return new GroupSelection();
    else if (aObject instanceof ILine)
      return new LineSelection();
    else if (aObject instanceof IRect)
      return new RectangleSelection();
    else if (aObject instanceof IEllipse)
      return new EllipseSelection();
    else if (aObject instanceof IText)
      return new TextSelection();
    else
      return null;
  }
};


var kSelectionPadding = 4;



function SVGSelection () {}


SVGSelection.prototype.initialized = false;
// Set to false after creation if this is part of a multiple-item selection
SVGSelection.prototype.allowInteraction = true;


SVGSelection.prototype.init = function (aEditor, aObject, aTxMgr) {
  if (this.initialized)
    throw Components.results.NS_ERROR_ALREADY_INITIALIZED;

  this.initialized = true;

  this.editor = aEditor;
  this.object = aObject;
  this.txmgr = aTxMgr;

  this.rect = this.editor.document.createElementNS(Cx.NS_SVG, "rect");
  this.rect.setAttribute("stroke", "blue");
  this.rect.setAttribute("stroke-dasharray", "4,4");
  this.rect.setAttribute("fill", "none");
  this.rect.setAttribute("pointer-events", "fill");

  var bbox = this.getBBox();
  this.rect.setAttribute("x", bbox.x - kSelectionPadding / 2);
  this.rect.setAttribute("y", bbox.y - kSelectionPadding / 2);
  this.rect.setAttribute("width", bbox.width + kSelectionPadding);
  this.rect.setAttribute("height", bbox.height + kSelectionPadding);

  this.editor.document.documentElement.appendChild(this.rect);
  if (this.allowInteraction) {
    this.rect.addEventListener("mousedown", this, false);
    this.rect.addEventListener("dblclick", this, false);
  }
};


SVGSelection.prototype.getBBox = function () {
  if (! this.initialized) {
    dump("*** SVGSelection.getBBox: Not initialized\n");
    printStackTrace();
    throw Components.results.NS_ERROR_NOT_INITIALIZED;
  }

  return this.object.getBBox();
};


SVGSelection.prototype.containsObject = function (aObject) {
  return this.object == aObject;
};


SVGSelection.prototype.hasValidSelection = function () {
  return !! this.object.parentNode;
};


SVGSelection.prototype.isMultipleSelection = function () {
  return false;
};


SVGSelection.prototype.canLower = function () {
  return !! this.object.previousSibling;
};


SVGSelection.prototype.canRaise = function () {
  return !! this.object.nextSibling;
};


SVGSelection.prototype.canGroup = function () {
  return false;
};


SVGSelection.prototype.canUngroup = function () {
  return false;
};


SVGSelection.prototype.copySelection = function () {
  var doc = this.editor.document.implementation.createDocument(Cx.NS_SVG,
    "svg", null);
  doc.documentElement.appendChild(doc.importNode(this.object, true));
  var serializer = new XMLSerializer();
  var domstr = serializer.serializeToString(doc);
  var helper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
    .createInstance(Components.interfaces.nsIClipboardHelper);
  helper.copyString(domstr);
};


SVGSelection.prototype.lowerSelection = function () {
  var tx = new LowerObjectTx(this.object);
  this.txmgr.doTransaction(tx);
};


SVGSelection.prototype.lowerSelectionToBottom = function () {
  var tx = new LowerObjectToBottomTx(this.object);
  this.txmgr.doTransaction(tx);
};


SVGSelection.prototype.raiseSelection = function () {
  var tx = new RaiseObjectTx(this.object);
  this.txmgr.doTransaction(tx);
};


SVGSelection.prototype.raiseSelectionToTop = function () {
  var tx = new RaiseObjectToTopTx(this.object);
  this.txmgr.doTransaction(tx);
};


SVGSelection.prototype.groupSelection = function () {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


SVGSelection.prototype.ungroupSelection = function () {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


SVGSelection.prototype.canSetStrokeColour = function () {
  var IStylable = Components.interfaces.nsIDOMSVGStylable;
  return this.object instanceof IStylable;
};


SVGSelection.prototype.canSetFillColour = function () {
  var IStylable = Components.interfaces.nsIDOMSVGStylable;
  return this.object instanceof IStylable;
};


SVGSelection.prototype.setStrokeColour = function (aColour) {
  var tx = new SetAttrTx(this.object, "stroke",
    this.object.getAttribute("stroke"), aColour);
  this.txmgr.doTransaction(tx);
};


SVGSelection.prototype.setFillColour = function (aColour) {
  var tx = new SetAttrTx(this.object, "fill",
    this.object.getAttribute("fill"), aColour);
  this.txmgr.doTransaction(tx);
};


// This is really more of a static function
SVGSelection.prototype.createMoveByTx = function (object, dx, dy) {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


SVGSelection.prototype.updatePosition = function () {
  var bbox = this.getBBox();
  this.rect.setAttribute("x", bbox.x - kSelectionPadding / 2);
  this.rect.setAttribute("y", bbox.y - kSelectionPadding / 2);
  this.rect.setAttribute("width", bbox.width + kSelectionPadding);
  this.rect.setAttribute("height", bbox.height + kSelectionPadding);
};


SVGSelection.prototype.handleEvent = function (aEvent) {
  switch (aEvent.type) {
    case "mousedown":
      if (aEvent.ctrlKey || aEvent.shiftKey || aEvent.metaKey)
        this.editor.unselectRequested(this, aEvent);
      else
        this._onMouseDown(aEvent);
      break;
    case "mousemove":
      this._onMouseMove(aEvent);
      break;
    case "mouseup":
      this._onMouseUp(aEvent);
      break;
    // Optional event
    case "dblclick":
      this.onDblClick(aEvent);
      break;
  }
};


SVGSelection.prototype._onMouseDown = function (aEvent) {
  this._mouseStart = { x: aEvent.clientX, y: aEvent.clientY };

  this._rectStart = {
    x: Number(this.rect.getAttribute("x")),
    y: Number(this.rect.getAttribute("y"))
  };

  if (this.allowInteraction) {
    this.editor.startSelectionDrag();

    var root = this.editor.document.documentElement;
    root.addEventListener("mousemove", this, false);
    root.addEventListener("mouseup", this, false);
  }

  this.onMouseDown(aEvent);
};


SVGSelection.prototype._onMouseMove = function (aEvent) {
  // Override me (optional)
  var dx = aEvent.clientX - this._mouseStart.x;
  var dy = aEvent.clientY - this._mouseStart.y;

  this.rect.setAttribute("x", this._rectStart.x + dx);
  this.rect.setAttribute("y", this._rectStart.y + dy);

  this.onMouseMove(aEvent);
};


SVGSelection.prototype._onMouseUp = function (aEvent) {
  this.editor.endSelectionDrag();

  if (this.allowInteraction) {
    var root = this.editor.document.documentElement;
    root.removeEventListener("mousemove", this, false);
    root.removeEventListener("mouseup", this, false);
  }

  this.onMouseUp(aEvent);
};


SVGSelection.prototype.shutdown = function (aEvent) {
  if (! this.initialized) {
    dump("*** SVGSelection.shutdown: Not initialized\n");
    printStackTrace();
    throw Components.results.NS_ERROR_NOT_INITIALIZED;
  }

  this.initialized = false;

  if (this.allowInteraction) {
    this.rect.removeEventListener("mousedown", this, false);
    this.rect.removeEventListener("dblclick", this, false);
  }
  this.rect.parentNode.removeChild(this.rect);
  this.rect = null;
};


SVGSelection.prototype.deleteSelection = function () {
  var tx = new DeleteTx(this.object);
  this.txmgr.doTransaction(tx);
};


SVGSelection.prototype.onMouseDown = function (aEvent) {
  // Override me
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


SVGSelection.prototype.onMouseMove = function (aEvent) {
  // Override me
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


SVGSelection.prototype.onMouseUp = function (aEvent) {
  // Override me
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


SVGSelection.prototype.onDblClick = function (aEvent) {
  // Override me (optional)
};




function LineSelection () {}

LineSelection.prototype = new SVGSelection();

LineSelection.prototype.init = function (aEditor, aObject, aTxMgr) {
  SVGSelection.prototype.init.apply(this, arguments);

  if (this.allowInteraction) {
    this.startKnob = new LineSelection.Knob();
    this.startKnob.init(this, LineSelection.Knob.START);
    this.endKnob = new LineSelection.Knob();
    this.endKnob.init(this, LineSelection.Knob.END);
  }

  this.updatePosition();
};


LineSelection.prototype.createMoveByTx = function (object, dx, dy) {
  var x1 = Number(object.getAttribute("x1"));
  var y1 = Number(object.getAttribute("y1"));
  var x2 = Number(object.getAttribute("x2"));
  var y2 = Number(object.getAttribute("y2"));

  var tx = new BatchTx();
  tx.addTransaction(new SetAttrTx(object, "x1", x1, x1 + dx));
  tx.addTransaction(new SetAttrTx(object, "y1", y1, y1 + dy));
  tx.addTransaction(new SetAttrTx(object, "x2", x2, x2 + dx));
  tx.addTransaction(new SetAttrTx(object, "y2", y2, y2 + dy));
  return tx;
};


LineSelection.prototype.updatePosition = function () {
  SVGSelection.prototype.updatePosition.apply(this, arguments);

  if (this.allowInteraction) {
    this.startKnob.updatePosition();
    this.endKnob.updatePosition();
  }
};


LineSelection.prototype.onMouseDown = function (aEvent) {
  this._objectStart = {
    x1: Number(this.object.getAttribute("x1")),
    y1: Number(this.object.getAttribute("y1")),
    x2: Number(this.object.getAttribute("x2")),
    y2: Number(this.object.getAttribute("y2"))
  };
};


LineSelection.prototype.onMouseMove = function (aEvent) {
  var dx = aEvent.clientX - this._mouseStart.x;
  var dy = aEvent.clientY - this._mouseStart.y;

  this.object.setAttribute("x1", this._objectStart.x1 + dx);
  this.object.setAttribute("y1", this._objectStart.y1 + dy);
  this.object.setAttribute("x2", this._objectStart.x2 + dx);
  this.object.setAttribute("y2", this._objectStart.y2 + dy);

  if (this.allowInteraction) {
    this.startKnob.updatePosition();
    this.endKnob.updatePosition();
  }
};


LineSelection.prototype.onMouseUp = function (aEvent) {
  var obj = this.object;
  var x1 = Number(obj.getAttribute("x1"));
  var y1 = Number(obj.getAttribute("y1"));
  var x2 = Number(obj.getAttribute("x2"));
  var y2 = Number(obj.getAttribute("y2"));

  var tx = new BatchTx();

  // On a move, x1 changes if and only if x2 changes, and similarly
  // for y1 and y2
  if (this._objectStart.x1 != x1) {
    tx.addTransaction(new SetAttrTx(obj, "x1", this._objectStart.x1, x1));
    tx.addTransaction(new SetAttrTx(obj, "x2", this._objectStart.x2, x2));
  }

  if (this._objectStart.y1 != y1) {
    tx.addTransaction(new SetAttrTx(obj, "y1", this._objectStart.y1, y1));
    tx.addTransaction(new SetAttrTx(obj, "y2", this._objectStart.y2, y2));
  }

  if (tx.hasTransactions()) {
    this.txmgr.doTransaction(tx);
  }
};


LineSelection.prototype.shutdown = function () {
  SVGSelection.prototype.shutdown.apply(this, arguments);

  if (this.allowInteraction) {
    this.startKnob.shutdown();
    this.endKnob.shutdown();
    this.startKnob = null;
    this.endKnob = null;
  }
};


LineSelection.Knob = function () {};


LineSelection.Knob.START = 0;
LineSelection.Knob.END = 1;


LineSelection.Knob.prototype = {
  init: function (aSelection, aCorner) {
    this.selection = aSelection;
    this.corner = aCorner;

    var doc = aSelection.editor.document;

    this.element = doc.createElementNS(Cx.NS_SVG, "circle");
    this.element.setAttribute("r", "4px");
    this.element.setAttribute("stroke", "none");
    this.element.setAttribute("fill", "url(#knobGradientYellow)");
    this.element.setAttribute("pointer-events", "fill");
    doc.documentElement.appendChild(this.element);

    this.element.addEventListener("mousedown", this, false);
  },


  shutdown: function () {
    this.element.removeEventListener("mousedown", this, false);
    this.element.parentNode.removeChild(this.element);
  },


  updatePosition: function () {
    var obj = this.selection.object;
    var x1 = Number(obj.getAttribute("x1"));
    var y1 = Number(obj.getAttribute("y1"));
    var x2 = Number(obj.getAttribute("x2"));
    var y2 = Number(obj.getAttribute("y2"));

    if (this.corner == LineSelection.Knob.START) {
      this.element.setAttribute("cx", x1);
      this.element.setAttribute("cy", y1);
    }
    else {
      this.element.setAttribute("cx", x2);
      this.element.setAttribute("cy", y2);
    }
  },


  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      case "mousedown":
        if (aEvent.ctrlKey || aEvent.shiftKey || aEvent.metaKey)
          this.selection.editor.unselectRequested(this.selection, aEvent);
        else
          this.onMouseDown(aEvent);
        break;
      case "mousemove":
        this.onMouseMove(aEvent);
        break;
      case "mouseup":
        this.onMouseUp(aEvent);
        break;
    }
  },


  onMouseDown: function (aEvent) {
    this.selection.editor.startSelectionDrag();

    this._mouseStart = {
      x: aEvent.clientX,
      y: aEvent.clientY
    };
    var obj = this.selection.object;
    this._objectStart = {
      x1: Number(obj.getAttribute("x1")),
      y1: Number(obj.getAttribute("y1")),
      x2: Number(obj.getAttribute("x2")),
      y2: Number(obj.getAttribute("y2"))
    };

    var docel = this.selection.editor.document.documentElement;
    docel.addEventListener("mousemove", this, false);
    docel.addEventListener("mouseup", this, false);
  },


  onMouseMove: function (aEvent) {
    var dx = aEvent.clientX - this._mouseStart.x;
    var dy = aEvent.clientY - this._mouseStart.y;

    var obj = this.selection.object;
    if (this.corner == LineSelection.Knob.START) {
      obj.setAttribute("x1", this._objectStart.x1 + dx);
      obj.setAttribute("y1", this._objectStart.y1 + dy);
    }
    else {
      obj.setAttribute("x2", this._objectStart.x2 + dx);
      obj.setAttribute("y2", this._objectStart.y2 + dy);
    }

    try {
      this.selection.updatePosition();
    }
    catch (ex) {
      dump("*** updatePosition: " + ex + "\n");
    }
  },


  onMouseUp: function (aEvent) {
    this.selection.editor.endSelectionDrag();

    var docel = this.selection.editor.document.documentElement;
    docel.removeEventListener("mousemove", this, false);
    docel.removeEventListener("mouseup", this, false);

    var obj = this.selection.object;
    var x1 = Number(obj.getAttribute("x1"));
    var y1 = Number(obj.getAttribute("y1"));
    var x2 = Number(obj.getAttribute("x2"));
    var y2 = Number(obj.getAttribute("y2"));

    var tx = new BatchTx();

    if (this.corner == LineSelection.Knob.START) {
      if (this._objectStart.x1 != x1) {
        tx.addTransaction(new SetAttrTx(obj, "x1", this._objectStart.x1, x1));
      }
      if (this._objectStart.y1 != y1) {
        tx.addTransaction(new SetAttrTx(obj, "y1", this._objectStart.y1, y1));
      }
    }
    else {
      if (this._objectStart.x2 != x2) {
        tx.addTransaction(new SetAttrTx(obj, "x2", this._objectStart.x2, x2));
      }
      if (this._objectStart.y2 != y2) {
        tx.addTransaction(new SetAttrTx(obj, "y2", this._objectStart.y2, y2));
      }
    }

    if (tx.hasTransactions()) {
      this.selection.txmgr.doTransaction(tx);
    }
  }
};




function RectangleSelection () {}


RectangleSelection.prototype = new SVGSelection();


RectangleSelection.prototype.init = function (aEditor, aObject, aTxMgr) {
  SVGSelection.prototype.init.apply(this, arguments);

  this.findTransformations();

  if (this.allowInteraction) {
    var Knob = RectangleSelection.Knob;
    this.tlKnob = new Knob();
    this.tlKnob.init(this, Knob.TOP_LEFT);
    this.trKnob = new Knob();
    this.trKnob.init(this, Knob.TOP_RIGHT);
    this.blKnob = new Knob();
    this.blKnob.init(this, Knob.BOTTOM_LEFT);
    this.brKnob = new Knob();
    this.brKnob.init(this, Knob.BOTTOM_RIGHT);

    this.circle = aEditor.document.createElementNS(Cx.NS_SVG, "circle");
    this.circle.setAttribute("fill", "none");
    this.circle.setAttribute("stroke", "green");
    this.circle.setAttribute("stroke-dasharray", "4,4");
    this.circle.setAttribute("pointer-events", "none");
    aEditor.document.documentElement.appendChild(this.circle);

    this.rotateKnob = new RectangleSelection.RotateKnob();
    this.rotateKnob.init(this);
  }

  this.updatePosition();
};


RectangleSelection.prototype.findTransformations = function () {
  this.rotateTx = null;

  var tlist = this.object.transform.baseVal;
  for (var i = 0; i < tlist.numberOfItems; ++i) {
    var transform = tlist.getItem(i);
    switch (transform.type) {
      case transform.SVG_TRANSFORM_ROTATE:
        if (this.rotateTx)
          throw new Error("Multiple rotations defined for object");
        this.rotateTx = transform;
        rotateIndex = i;
        break;
      case transform.SVG_TRANSFORM_SCALE:
        throw new Error("Can't handle scale transformations on rectangles");
      case transform.SVG_TRANSFORM_TRANSLATE:
        throw new Error(
          "Can't handle translate transformations on rectangles");
      default:
        throw new Error("Unhandled transformation type: " + transform.type);
    }
  }

  var docel = this.editor.document.documentElement;

  if (! this.rotateTx) {
    var center = this.getObjectCenter();
    this.rotateTx = docel.createSVGTransform();
    this.rotateTx.setRotate(0, center.x, center.y);
    tlist.appendItem(this.rotateTx);
  }
};


RectangleSelection.prototype.getObjectCenter = function () {
  var obj = this.object;
  var x = Number(obj.getAttribute("x"));
  var y = Number(obj.getAttribute("y"));
  var width = Number(obj.getAttribute("width"));
  var height = Number(obj.getAttribute("height"));
  return {
    x: x + 0.5 * width,
    y: y + 0.5 * height
  };
};


RectangleSelection.prototype.createMoveByTx = function (object, dx, dy) {
  var x = Number(object.getAttribute("x"));
  var y = Number(object.getAttribute("y"));
  var width = Number(object.getAttribute("width"));
  var height = Number(object.getAttribute("height"));

  var center = {
    x: x + 0.5 * width,
    y: y + 0.5 * height
  };
  var rotateTx = null;
  var tlist = object.transform.baseVal;
  for (var i = 0; i < tlist.numberOfItems; ++i) {
    var transform = tlist.getItem(i);
    if (transform.type == transform.SVG_TRANSFORM_ROTATE) {
      rotateTx = transform;
      break;
    }
  }

  var tx = new BatchTx();
  tx.addTransaction(new SetAttrTx(object, "x", x, x + dx));
  tx.addTransaction(new SetAttrTx(object, "y", y, y + dy));
  if (rotateTx) {
    tx.addTransaction(new RotateTransformTx(rotateTx,
      rotateTx.angle, center.x, center.y,
      rotateTx.angle, center.x + dx, center.y + dy));
  }
  return tx;
};


RectangleSelection.prototype.updatePosition = function () {
  // SVGSelection.prototype.updatePosition.apply(this, arguments);

  var obj = this.object;
  var x = Number(obj.getAttribute("x"));
  var y = Number(obj.getAttribute("y"));
  var width = Number(obj.getAttribute("width"));
  var height = Number(obj.getAttribute("height"));
  var cx = x + width * 0.5;
  var cy = y + height * 0.5;

  this.rect.setAttribute("x", x - kSelectionPadding / 2);
  this.rect.setAttribute("y", y - kSelectionPadding / 2);
  this.rect.setAttribute("width", width + kSelectionPadding);
  this.rect.setAttribute("height", height + kSelectionPadding);

  this.rect.setAttribute("transform", "rotate("
    + this.rotateTx.angle + " " + cx + " " + cy + ")");

  if (this.allowInteraction) {
    var radius = Math.max(width, height) * 0.5;
    this.circle.setAttribute("cx", cx);
    this.circle.setAttribute("cy", cy);
    this.circle.setAttribute("r", radius);

    this.tlKnob.updatePosition();
    this.trKnob.updatePosition();
    this.blKnob.updatePosition();
    this.brKnob.updatePosition();
    this.rotateKnob.updatePosition();
  }
};


RectangleSelection.prototype.onMouseDown = function (aEvent) {
  var obj = this.object;
  this._objectStart = {
    x: Number(obj.getAttribute("x")),
    y: Number(obj.getAttribute("y")),
    width: Number(obj.getAttribute("width")),
    height: Number(obj.getAttribute("height"))
  };
};


RectangleSelection.prototype.onMouseMove = function (aEvent) {
  var dx = aEvent.clientX - this._mouseStart.x;
  var dy = aEvent.clientY - this._mouseStart.y;

  this.object.setAttribute("x", this._objectStart.x + dx);
  this.object.setAttribute("y", this._objectStart.y + dy);

  var center = this.getObjectCenter();
  this.rotateTx.setRotate(this.rotateTx.angle, center.x, center.y);

  this.updatePosition();
};


RectangleSelection.prototype.onMouseUp = function (aEvent) {
  var obj = this.object;
  var x = Number(obj.getAttribute("x"));
  var y = Number(obj.getAttribute("y"));
  var width = Number(obj.getAttribute("width"));
  var height = Number(obj.getAttribute("height"));

  var tx = new BatchTx();

  if (this._objectStart.x != x) {
    tx.addTransaction(new SetAttrTx(obj, "x", this._objectStart.x, x));
  }
  if (this._objectStart.y != y) {
    tx.addTransaction(new SetAttrTx(obj, "y", this._objectStart.y, y));
  }

  var startCenter = {
    x: this._objectStart.x + 0.5 * this._objectStart.width,
    y: this._objectStart.y + 0.5 * this._objectStart.height
  };
  var center = {
    x: x + 0.5 * width,
    y: y + 0.5 * height
  };
  var angle = this.rotateTx.angle;
  if (startCenter.x != center.x || startCenter.y != center.y) {
    tx.addTransaction(new RotateTransformTx(this.rotateTx,
      angle, startCenter.x, startCenter.y, angle, center.x, center.y));
  }

  if (tx.hasTransactions()) {
    this.txmgr.doTransaction(tx);
  }
};


RectangleSelection.prototype.shutdown = function () {
  SVGSelection.prototype.shutdown.apply(this, arguments);

  if (this.allowInteraction) {
    this.tlKnob.shutdown();
    this.trKnob.shutdown();
    this.blKnob.shutdown();
    this.brKnob.shutdown();
    this.circle.parentNode.removeChild(this.circle);
    this.rotateKnob.shutdown();
    this.tlKnob = null;
    this.trKnob = null;
    this.blKnob = null;
    this.brKnob = null;
    this.circle = null;
    this.rotateKnob = null;
  }
};


RectangleSelection.RotateKnob = function () {};


RectangleSelection.RotateKnob.prototype = {
  init: function (aSelection) {
    this.selection = aSelection;

    var doc = aSelection.editor.document;

    this.element = doc.createElementNS(Cx.NS_SVG, "circle");
    this.element.setAttribute("r", "4px");
    this.element.setAttribute("stroke", "none");
    this.element.setAttribute("fill", "url(#knobGradientPink)");
    this.element.setAttribute("pointer-events", "fill");
    doc.documentElement.appendChild(this.element);

    this.element.addEventListener("mousedown", this, false);
  },


  shutdown: function () {
    this.element.removeEventListener("mousedown", this, false);
    this.element.parentNode.removeChild(this.element);
  },


  updatePosition: function () {
    var center = this.selection.getObjectCenter();
    var obj = this.selection.object;
    var width = Number(obj.getAttribute("width"));
    // The equivalent of (1, 0) on a unit circle
    var offset = { x: width * 0.5, y: 0.0 };
    offset = rotatePoint(offset, this.selection.rotateTx.angle);
    this.element.setAttribute("cx", center.x + offset.x);
    this.element.setAttribute("cy", center.y + offset.y);
  },


  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      case "mousedown":
        if (aEvent.ctrlKey || aEvent.shiftKey || aEvent.metaKey)
          this.selection.editor.unselectRequested(this.selection, aEvent);
        else
          this.onMouseDown(aEvent);
        break;
      case "mousemove":
        this.onMouseMove(aEvent);
        break;
      case "mouseup":
        this.onMouseUp(aEvent);
        break;
    }
  },


  onMouseDown: function (aEvent) {
    this.selection.editor.startSelectionDrag();

    var center = this.selection.getObjectCenter();
    this._objectStart = {
      cx: center.x,
      cy: center.y,
      angle: this.selection.rotateTx.angle
    };

    var docel = this.selection.editor.document.documentElement;
    docel.addEventListener("mousemove", this, false);
    docel.addEventListener("mouseup", this, false);
  },


  onMouseMove: function (aEvent) {
    var cx = this._objectStart.cx;
    var cy = this._objectStart.cy;
    var dx = aEvent.clientX - cx;
    var dy = aEvent.clientY - cy;

    if (dx == 0 && dy == 0)
      return;

    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (isNaN(angle))
      return;

    this.selection.rotateTx.setRotate(angle, cx, cy);

    this.selection.updatePosition();
  },


  onMouseUp: function (aEvent) {
    this.selection.editor.endSelectionDrag();

    var docel = this.selection.editor.document.documentElement;
    docel.removeEventListener("mousemove", this, false);
    docel.removeEventListener("mouseup", this, false);

    var angle = this.selection.rotateTx.angle;
    var cx = this._objectStart.cx;
    var cy = this._objectStart.cy;
    if (angle != this._objectStart.angle) {
      var tx = new RotateTransformTx(this.selection.rotateTx,
        this._objectStart.angle, cx, cy, angle, cx, cy);
      this.selection.txmgr.doTransaction(tx);
    }
  }
};


RectangleSelection.Knob = function () {};


RectangleSelection.Knob.TOP_LEFT = 0;
RectangleSelection.Knob.TOP_RIGHT = 1;
RectangleSelection.Knob.BOTTOM_LEFT = 2;
RectangleSelection.Knob.BOTTOM_RIGHT = 3;


RectangleSelection.Knob.prototype = {
  init: function (aSelection, aCorner) {
    this.selection = aSelection;
    this.corner = aCorner;

    var doc = aSelection.editor.document;

    this.element = doc.createElementNS(Cx.NS_SVG, "circle");
    this.element.setAttribute("r", "4px");
    this.element.setAttribute("stroke", "none");
    this.element.setAttribute("fill", "url(#knobGradientYellow)");
    this.element.setAttribute("pointer-events", "fill");
    doc.documentElement.appendChild(this.element);

    this.element.addEventListener("mousedown", this, false);
  },


  shutdown: function () {
    this.element.removeEventListener("mousedown", this, false);
    this.element.parentNode.removeChild(this.element);
  },


  updatePosition: function () {
    var obj = this.selection.object;
    var width = Number(obj.getAttribute("width"));
    var height = Number(obj.getAttribute("height"));
    var center = this.selection.getObjectCenter();
    var offset = { x: width * 0.5, y: height * 0.5 };
    var rotateTx = this.selection.rotateTx;

    var Knob = RectangleSelection.Knob;
    if (this.corner == Knob.TOP_LEFT || this.corner == Knob.BOTTOM_LEFT)
      offset.x = -offset.x;
    if (this.corner == Knob.TOP_LEFT || this.corner == Knob.TOP_RIGHT)
      offset.y = -offset.y;

    offset = rotatePoint(offset, rotateTx.angle);

    this.element.setAttribute("cx", center.x + offset.x);
    this.element.setAttribute("cy", center.y + offset.y);
  },


  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      case "mousedown":
        if (aEvent.ctrlKey || aEvent.shiftKey || aEvent.metaKey)
          this.selection.editor.unselectRequested(this.selection, aEvent);
        else
          this.onMouseDown(aEvent);
        break;
      case "mousemove":
        this.onMouseMove(aEvent);
        break;
      case "mouseup":
        this.onMouseUp(aEvent);
        break;
    }
  },


  onMouseDown: function (aEvent) {
    this.selection.editor.startSelectionDrag();

    this._mouseStart = {
      x: aEvent.clientX,
      y: aEvent.clientY
    };
    var obj = this.selection.object;
    this._objectStart = {
      x: Number(obj.getAttribute("x")),
      y: Number(obj.getAttribute("y")),
      width: Number(obj.getAttribute("width")),
      height: Number(obj.getAttribute("height"))
    };

    var docel = this.selection.editor.document.documentElement;
    docel.addEventListener("mousemove", this, false);
    docel.addEventListener("mouseup", this, false);
  },


  onMouseMove: function (aEvent) {
    /*
     * I found the easiest way to visualize manipulation of a rotated
     * rectangle is this, since the center of rotation is the center of
     * the rectangle:
     *
     * Let (dx_g, dy_g) be the translation of the mouse in global coordinates
     * and let (dx_l, dy_l) be the translation of the mouse in the coordinate
     * space of the rotated rectangle. Then:
     *
     * The center of the rectangle moves by 1/2 (dx_g, dy_g)
     * The width of the rectangle changes by dx_l
     * The height of the rectangle changes by dy_l
     *
     * The direction of change for width and height depends on which knob is
     * being manipulated. The coordinate of the top left corner of the
     * rectangle is then recalculated based on the new center and dimensions.
     * If width or height is negative, then the center should be adjusted to
     * restore them to their absolute values.
     */

    var Knob = RectangleSelection.Knob;
    var isLeft =  this.corner == Knob.TOP_LEFT    ||
                  this.corner == Knob.BOTTOM_LEFT ;
    var isTop =   this.corner == Knob.TOP_LEFT    ||
                  this.corner == Knob.TOP_RIGHT   ;

    // Get the translation of the mouse
    var delta_g = {
      x: aEvent.clientX - this._mouseStart.x,
      y: aEvent.clientY - this._mouseStart.y
    };

    // Transform it into local coordinate space
    var angle = this.selection.rotateTx.angle;
    var delta_l = rotatePoint(delta_g, -angle);

    // Calculate the new center and dimensions
    var startWidth = this._objectStart.width;
    var startHeight = this._objectStart.height;
    var newCenter = {
      x: this._objectStart.x + 0.5 * (startWidth + delta_g.x),
      y: this._objectStart.y + 0.5 * (startHeight + delta_g.y)
    };

    var newWidth = startWidth + (isLeft ? -delta_l.x : delta_l.x);
    var newHeight = startHeight + (isTop ? -delta_l.y : delta_l.y);

    // Check for negative width or height
    if (newWidth < 0) {
      newCenter.x += newWidth;
      newWidth = -newWidth;
    }
    if (newHeight < 0) {
      newCenter.y += newHeight;
      newHeight = -newHeight;
    }

    var obj = this.selection.object;
    obj.setAttribute("x", newCenter.x - 0.5 * newWidth);
    obj.setAttribute("y", newCenter.y - 0.5 * newHeight);
    obj.setAttribute("width", newWidth);
    obj.setAttribute("height", newHeight);

    this.selection.rotateTx.setRotate(angle, newCenter.x, newCenter.y);

    this.selection.updatePosition();
  },


  onMouseUp: function (aEvent) {
    this.selection.editor.endSelectionDrag();

    var docel = this.selection.editor.document.documentElement;
    docel.removeEventListener("mousemove", this, false);
    docel.removeEventListener("mouseup", this, false);

    var obj = this.selection.object;
    var x = Number(obj.getAttribute("x"));
    var y = Number(obj.getAttribute("y"));
    var width = Number(obj.getAttribute("width"));
    var height = Number(obj.getAttribute("height"));

    var tx = new BatchTx();

    if (this._objectStart.x != x) {
      tx.addTransaction(new SetAttrTx(obj, "x", this._objectStart.x, x));
    }
    if (this._objectStart.y != y) {
      tx.addTransaction(new SetAttrTx(obj, "y", this._objectStart.y, y));
    }
    if (this._objectStart.width != width) {
      tx.addTransaction(new SetAttrTx(obj, "width",
        this._objectStart.width, width));
    }
    if (this._objectStart.height != height) {
      tx.addTransaction(new SetAttrTx(obj, "height",
        this._objectStart.height, height));
    }
    var startCenter = {
      x: this._objectStart.x + 0.5 * this._objectStart.width,
      y: this._objectStart.y + 0.5 * this._objectStart.height
    };
    var center = {
      x: x + 0.5 * width,
      y: y + 0.5 * height
    };
    var angle = this.selection.rotateTx.angle;
    if (startCenter.x != center.x || startCenter.y != center.y) {
      tx.addTransaction(new RotateTransformTx(this.selection.rotateTx,
        angle, startCenter.x, startCenter.y, angle, center.x, center.y));
    }

    if (tx.hasTransactions()) {
      this.selection.txmgr.doTransaction(tx);
    }
  }
};




function EllipseSelection () {}


EllipseSelection.prototype = new SVGSelection();


EllipseSelection.prototype.init = function (aEditor, aObject, aTxMgr) {
  SVGSelection.prototype.init.apply(this, arguments);

  this.findTransformations();

  if (this.allowInteraction) {
    this.startKnob = new EllipseSelection.Knob();
    this.startKnob.init(this, EllipseSelection.Knob.TOP_LEFT);
    this.endKnob = new EllipseSelection.Knob();
    this.endKnob.init(this, EllipseSelection.Knob.BOTTOM_RIGHT);

    this.circle = aEditor.document.createElementNS(Cx.NS_SVG, "circle");
    this.circle.setAttribute("fill", "none");
    this.circle.setAttribute("stroke", "green");
    this.circle.setAttribute("stroke-dasharray", "4,4");
    this.circle.setAttribute("pointer-events", "none");
    aEditor.document.documentElement.appendChild(this.circle);

    this.rotateKnob = new EllipseSelection.RotateKnob();
    this.rotateKnob.init(this);
  }

  this.updatePosition();
};


EllipseSelection.prototype.findTransformations = function () {
  this.rotateTx = null;

  var tlist = this.object.transform.baseVal;
  for (var i = 0; i < tlist.numberOfItems; ++i) {
    var transform = tlist.getItem(i);
    switch (transform.type) {
      case transform.SVG_TRANSFORM_ROTATE:
        if (this.rotateTx)
          throw new Error("Multiple rotations defined for object");
        this.rotateTx = transform;
        rotateIndex = i;
        break;
      case transform.SVG_TRANSFORM_SCALE:
        throw new Error("Can't handle scale transformations on ellipses");
      case transform.SVG_TRANSFORM_TRANSLATE:
        throw new Error(
          "Can't handle translate transformations on ellipses");
      default:
        throw new Error("Unhandled transformation type: " + transform.type);
    }
  }

  var docel = this.editor.document.documentElement;

  if (! this.rotateTx) {
    var center = this.getObjectCenter();
    this.rotateTx = docel.createSVGTransform();
    this.rotateTx.setRotate(0, center.x, center.y);
    tlist.appendItem(this.rotateTx);
  }
};


EllipseSelection.prototype.getObjectCenter = function () {
  var obj = this.object;
  return {
    x: Number(obj.getAttribute("cx")),
    y: Number(obj.getAttribute("cy"))
  };
};


EllipseSelection.prototype.createMoveByTx = function (object, dx, dy) {
  var cx = Number(object.getAttribute("cx"));
  var cy = Number(object.getAttribute("cy"));

  var rotateTx = null;
  var tlist = object.transform.baseVal;
  for (var i = 0; i < tlist.numberOfItems; ++i) {
    var transform = tlist.getItem(i);
    if (transform.type == transform.SVG_TRANSFORM_ROTATE) {
      rotateTx = transform;
      break;
    }
  }

  var tx = new BatchTx();
  tx.addTransaction(new SetAttrTx(object, "cx", cx, cx + dx));
  tx.addTransaction(new SetAttrTx(object, "cy", cy, cy + dy));
  if (rotateTx) {
    tx.addTransaction(new RotateTransformTx(rotateTx,
      rotateTx.angle, cx, cy, rotateTx.angle, cx + dx, cy + dy));
  }
  return tx;
};


EllipseSelection.prototype.updatePosition = function () {
  // SVGSelection.prototype.updatePosition.apply(this, arguments);

  var obj = this.object;
  var cx = Number(obj.getAttribute("cx"));
  var cy = Number(obj.getAttribute("cy"));
  var rx = Number(obj.getAttribute("rx"));
  var ry = Number(obj.getAttribute("ry"));

  this.rect.setAttribute("x", cx - rx - kSelectionPadding / 2);
  this.rect.setAttribute("y", cy - ry - kSelectionPadding / 2);
  this.rect.setAttribute("width", 2 * rx + kSelectionPadding);
  this.rect.setAttribute("height", 2 * ry + kSelectionPadding);

  this.rect.setAttribute("transform", "rotate("
    + this.rotateTx.angle + " " + cx + " " + cy + ")");

  if (this.allowInteraction) {
    var radius = Math.max(rx, ry);
    this.circle.setAttribute("cx", cx);
    this.circle.setAttribute("cy", cy);
    this.circle.setAttribute("r", radius);

    this.startKnob.updatePosition();
    this.endKnob.updatePosition();
    this.rotateKnob.updatePosition();
  }
};


EllipseSelection.prototype.onMouseDown = function (aEvent) {
  this._objectStart = {
    cx: Number(this.object.getAttribute("cx")),
    cy: Number(this.object.getAttribute("cy"))
  };
};


EllipseSelection.prototype.onMouseMove = function (aEvent) {
  var dx = aEvent.clientX - this._mouseStart.x;
  var dy = aEvent.clientY - this._mouseStart.y;

  var cx = this._objectStart.cx + dx;
  var cy = this._objectStart.cy + dy;
  this.object.setAttribute("cx", cx);
  this.object.setAttribute("cy", cy);
  this.rotateTx.setRotate(this.rotateTx.angle, cx, cy);

  this.updatePosition();
};


EllipseSelection.prototype.onMouseUp = function (aEvent) {
  var cx = Number(this.object.getAttribute("cx"));
  var cy = Number(this.object.getAttribute("cy"));

  if (this._objectStart.cx != cx || this._objectStart.cy != cy) {
    var tx = new BatchTx();

    tx.addTransaction(new SetAttrTx(this.object, "cx",
      this._objectStart.cx, cx));

    tx.addTransaction(new SetAttrTx(this.object, "cy",
      this._objectStart.cy, cy));

    var angle = this.rotateTx.angle;
    tx.addTransaction(new RotateTransformTx(this.rotateTx,
      angle, this._objectStart.cx, this._objectStart.cy, angle, cx, cy));

    this.txmgr.doTransaction(tx);
  }
};


EllipseSelection.prototype.shutdown = function () {
  SVGSelection.prototype.shutdown.apply(this, arguments);

  if (this.allowInteraction) {
    this.startKnob.shutdown();
    this.endKnob.shutdown();
    this.circle.parentNode.removeChild(this.circle);
    this.rotateKnob.shutdown();
    this.startKnob = null;
    this.endKnob = null;
    this.circle = null;
    this.rotateKnob = null;
  }
};


EllipseSelection.RotateKnob = function () {};


EllipseSelection.RotateKnob.prototype = {
  init: function (aSelection) {
    this.selection = aSelection;

    var doc = aSelection.editor.document;

    this.element = doc.createElementNS(Cx.NS_SVG, "circle");
    this.element.setAttribute("r", "4px");
    this.element.setAttribute("stroke", "none");
    this.element.setAttribute("fill", "url(#knobGradientPink)");
    this.element.setAttribute("pointer-events", "fill");
    doc.documentElement.appendChild(this.element);

    this.element.addEventListener("mousedown", this, false);
  },


  shutdown: function () {
    this.element.removeEventListener("mousedown", this, false);
    this.element.parentNode.removeChild(this.element);
  },


  updatePosition: function () {
    var center = this.selection.getObjectCenter();
    var obj = this.selection.object;
    var rx = Number(obj.getAttribute("rx"));
    // The equivalent of (1, 0) on a unit circle
    var offset = { x: rx, y: 0.0 };
    offset = rotatePoint(offset, this.selection.rotateTx.angle);
    this.element.setAttribute("cx", center.x + offset.x);
    this.element.setAttribute("cy", center.y + offset.y);
  },


  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      case "mousedown":
        if (aEvent.ctrlKey || aEvent.shiftKey || aEvent.metaKey)
          this.selection.editor.unselectRequested(this.selection, aEvent);
        else
          this.onMouseDown(aEvent);
        break;
      case "mousemove":
        this.onMouseMove(aEvent);
        break;
      case "mouseup":
        this.onMouseUp(aEvent);
        break;
    }
  },


  onMouseDown: function (aEvent) {
    this.selection.editor.startSelectionDrag();

    var center = this.selection.getObjectCenter();
    this._objectStart = {
      cx: center.x,
      cy: center.y,
      angle: this.selection.rotateTx.angle
    };

    var docel = this.selection.editor.document.documentElement;
    docel.addEventListener("mousemove", this, false);
    docel.addEventListener("mouseup", this, false);
  },


  onMouseMove: function (aEvent) {
    var cx = this._objectStart.cx;
    var cy = this._objectStart.cy;
    var dx = aEvent.clientX - cx;
    var dy = aEvent.clientY - cy;

    if (dx == 0 && dy == 0)
      return;

    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (isNaN(angle))
      return;

    this.selection.rotateTx.setRotate(angle, cx, cy);

    this.selection.updatePosition();
  },


  onMouseUp: function (aEvent) {
    this.selection.editor.endSelectionDrag();

    var docel = this.selection.editor.document.documentElement;
    docel.removeEventListener("mousemove", this, false);
    docel.removeEventListener("mouseup", this, false);

    var angle = this.selection.rotateTx.angle;
    var cx = this._objectStart.cx;
    var cy = this._objectStart.cy;
    if (angle != this._objectStart.angle) {
      var tx = new RotateTransformTx(this.selection.rotateTx,
        this._objectStart.angle, cx, cy, angle, cx, cy);
      this.selection.txmgr.doTransaction(tx);
    }
  }
};


EllipseSelection.Knob = function () {};


EllipseSelection.Knob.TOP_LEFT = 0;
EllipseSelection.Knob.BOTTOM_RIGHT = 1;


EllipseSelection.Knob.prototype = {
  init: function (aSelection, aCorner) {
    this.selection = aSelection;
    this.corner = aCorner;

    var doc = aSelection.editor.document;

    this.element = doc.createElementNS(Cx.NS_SVG, "circle");
    this.element.setAttribute("r", "4px");
    this.element.setAttribute("stroke", "none");
    this.element.setAttribute("fill", "url(#knobGradientYellow)");
    this.element.setAttribute("pointer-events", "fill");
    doc.documentElement.appendChild(this.element);

    this.element.addEventListener("mousedown", this, false);
  },


  shutdown: function () {
    this.element.removeEventListener("mousedown", this, false);
    this.element.parentNode.removeChild(this.element);
  },


  updatePosition: function () {
    var obj = this.selection.object;
    var rx = Number(obj.getAttribute("rx"));
    var ry = Number(obj.getAttribute("ry"));
    var center = this.selection.getObjectCenter();
    var offset = {
      x: Number(obj.getAttribute("rx")),
      y: Number(obj.getAttribute("ry"))
    };
    if (this.corner == EllipseSelection.Knob.TOP_LEFT) {
      offset.x = -offset.x;
      offset.y = -offset.y;
    }

    offset = rotatePoint(offset, this.selection.rotateTx.angle);

    this.element.setAttribute("cx", center.x + offset.x);
    this.element.setAttribute("cy", center.y + offset.y);
  },


  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      case "mousedown":
        if (aEvent.ctrlKey || aEvent.shiftKey || aEvent.metaKey)
          this.selection.editor.unselectRequested(this.selection, aEvent);
        else
          this.onMouseDown(aEvent);
        break;
      case "mousemove":
        this.onMouseMove(aEvent);
        break;
      case "mouseup":
        this.onMouseUp(aEvent);
        break;
    }
  },


  onMouseDown: function (aEvent) {
    this.selection.editor.startSelectionDrag();

    this._mouseStart = {
      x: aEvent.clientX,
      y: aEvent.clientY
    };
    var obj = this.selection.object;
    this._objectStart = {
      cx: Number(obj.getAttribute("cx")),
      cy: Number(obj.getAttribute("cy")),
      rx: Number(obj.getAttribute("rx")),
      ry: Number(obj.getAttribute("ry"))
    };

    var docel = this.selection.editor.document.documentElement;
    docel.addEventListener("mousemove", this, false);
    docel.addEventListener("mouseup", this, false);
  },


  onMouseMove: function (aEvent) {
    var dx = aEvent.clientX - this._mouseStart.x;
    var dy = aEvent.clientY - this._mouseStart.y;

    var delta_g = {
      x: aEvent.clientX - this._mouseStart.x,
      y: aEvent.clientY - this._mouseStart.y
    };

    var angle = this.selection.rotateTx.angle;
    var delta_l = rotatePoint(delta_g, -angle);

    var newCenter = {
      x: this._objectStart.cx + 0.5 * delta_g.x,
      y: this._objectStart.cy + 0.5 * delta_g.y
    };

    var isTL = this.corner == EllipseSelection.Knob.TOP_LEFT;
    var newRx = this._objectStart.rx + 0.5 * (isTL ? -delta_l.x : delta_l.x);
    var newRy = this._objectStart.ry + 0.5 * (isTL ? -delta_l.y : delta_l.y);

    if (newRx < 0) {
      newCenter.x += 2.0 * newRx;
      newRx = -newRx;
    }
    if (newRy < 0) {
      newCenter.y += 2.0 * newRy;
      newRy = -newRy;
    }

    var obj = this.selection.object;
    obj.setAttribute("cx", newCenter.x);
    obj.setAttribute("cy", newCenter.y);
    obj.setAttribute("rx", newRx);
    obj.setAttribute("ry", newRy);

    this.selection.rotateTx.setRotate(angle, newCenter.x, newCenter.y);

    this.selection.updatePosition();
  },


  onMouseUp: function (aEvent) {
    this.selection.editor.endSelectionDrag();

    var docel = this.selection.editor.document.documentElement;
    docel.removeEventListener("mousemove", this, false);
    docel.removeEventListener("mouseup", this, false);

    var obj = this.selection.object;
    var cx = Number(obj.getAttribute("cx"));
    var cy = Number(obj.getAttribute("cy"));
    var rx = Number(obj.getAttribute("rx"));
    var ry = Number(obj.getAttribute("ry"));

    var tx = new BatchTx();

    if (this._objectStart.cx != cx) {
      tx.addTransaction(new SetAttrTx(obj, "cx", this._objectStart.cx, cx));
    }
    if (this._objectStart.cy != cy) {
      tx.addTransaction(new SetAttrTx(obj, "cy", this._objectStart.cy, cy));
    }
    if (this._objectStart.rx != rx) {
      tx.addTransaction(new SetAttrTx(obj, "rx", this._objectStart.rx, rx));
    }
    if (this._objectStart.ry != ry) {
      tx.addTransaction(new SetAttrTx(obj, "ry", this._objectStart.ry, ry));
    }
    if (this._objectStart.cx != cx || this._objectStart.cy != cy) {
      var angle = this.selection.rotateTx.angle;
      tx.addTransaction(new RotateTransformTx(this.selection.rotateTx,
        angle, this._objectStart.cx, this._objectStart.cy, angle, cx, cy));
    }

    if (tx.hasTransactions()) {
      this.selection.txmgr.doTransaction(tx);
    }
  }
};




function TextSelection () {}


TextSelection.prototype = new SVGSelection();


TextSelection.prototype.createMoveByTx = function (object, dx, dy) {
  var x = Number(object.getAttribute("x"));
  var y = Number(object.getAttribute("y"));

  var tx = new BatchTx();
  tx.addTransaction(new SetAttrTx(object, "x", x, x + dx));
  tx.addTransaction(new SetAttrTx(object, "y", y, y + dy));
  return tx;
};


TextSelection.prototype.canSetStrokeColour = function () {
  return false;
};


TextSelection.prototype.setStrokeColour = function (aColour) {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


TextSelection.prototype.onMouseDown = function (aEvent) {
  this._objectStart = {
    x: Number(this.object.getAttribute("x")),
    y: Number(this.object.getAttribute("y"))
  };
};


TextSelection.prototype.onMouseMove = function (aEvent) {
  var dx = aEvent.clientX - this._mouseStart.x;
  var dy = aEvent.clientY - this._mouseStart.y;

  this.object.setAttribute("x", this._objectStart.x + dx);
  this.object.setAttribute("y", this._objectStart.y + dy);
};


TextSelection.prototype.onMouseUp = function (aEvent) {
  var dx = aEvent.clientX - this._mouseStart.x;
  var dy = aEvent.clientY - this._mouseStart.y;

  var tx = new BatchTx();

  if (dx != 0) {
    var x = this._objectStart.x + dx;
    tx.addTransaction(
      new SetAttrTx(this.object, "x", this._objectStart.x, x));
  }
  if (dy != 0) {
    var y = this._objectStart.y + dy;
    tx.addTransaction(
      new SetAttrTx(this.object, "y", this._objectStart.y, y));
  }

  if (tx.hasTransactions()) {
    this.txmgr.doTransaction(tx);
  }
};


TextSelection.prototype.onDblClick = function (aEvent) {
  var config = {
    font: this.object.getAttribute("font-family"),
    size: this.object.getAttribute("font-size"),
    text: this.object.firstChild.nodeValue,
    bold: this.object.getAttribute("font-weight") == "bold",
    italic: this.object.getAttribute("font-style") == "italic",
    underline: this.object.getAttribute("text-decoration") == "underline",
    accepted: false
  };

  var oldconfig = {};
  for (var key in config) oldconfig[key] = config[key];

  openDialog(Cx.CONTENT_PATH + "editors/shottextdialog.xul", "",
    Cx.MODAL_DIALOG_FLAGS, config);

  if (! config.accepted)
    return;

  var tx = new BatchTx();

  if (oldconfig.text != config.text)
    tx.addTransaction(new EditLabelTx(this.object, config.text));

  if (oldconfig.font != config.font)
    tx.addTransaction(new SetAttrTx(this.object, "font-family",
      oldconfig.font, config.font));

  if (oldconfig.size != config.size)
    tx.addTransaction(new SetAttrTx(this.object, "font-size",
      oldconfig.size, config.size));

  if (oldconfig.bold != config.bold)
    tx.addTransaction(new SetAttrTx(this.object, "font-weight",
      oldconfig.bold ? "bold" : null, config.bold ? "bold" : null));

  if (oldconfig.italic != config.italic)
    tx.addTransaction(new SetAttrTx(this.object, "font-style",
      oldconfig.italic ? "italic" : null, config.italic ? "italic" : null));

  if (oldconfig.underline != config.underline)
    tx.addTransaction(new SetAttrTx(this.object, "text-decoration",
      oldconfig.underline ? "underline" : null,
      config.underline ? "underline" : null));

  if (tx.hasTransactions()) {
    this.txmgr.doTransaction(tx);
  }

  this.updatePosition();
};




function GroupSelection () {}


GroupSelection.prototype = new SVGSelection();


GroupSelection.prototype.init = function (aEditor, aObject, aTx) {
  if (! (aObject instanceof Components.interfaces.nsIDOMSVGGElement))
    throw new Error("GroupSelection lacks an enclosing transformation group");

  SVGSelection.prototype.init.apply(this, arguments);

  this.rootSVG = this.findRootSVG();
  this.findTransformations();
  this.isComposite = aObject.hasAttributeNS(Cx.NS_CX, "group");

  if (this.allowInteraction && ! this.isComposite) {
    this.circle = aEditor.document.createElementNS(Cx.NS_SVG, "circle");
    this.circle.setAttribute("fill", "none");
    this.circle.setAttribute("stroke", "green");
    this.circle.setAttribute("stroke-dasharray", "4,4");
    this.circle.setAttribute("pointer-events", "none");
    aEditor.document.documentElement.appendChild(this.circle);

    var Knob = GroupSelection.Knob;
    this.rotateKnob = new Knob();
    this.rotateKnob.init(this, Knob.ROTATE);
    this.scaleKnob = new Knob();
    this.scaleKnob.init(this, Knob.SCALE);
  }

  this.updatePosition();
};


GroupSelection.prototype.findRootSVG = function () {
  var ISVG = Components.interfaces.nsIDOMSVGSVGElement;
  var queue = [ this.object ];
  while (queue.length > 0) {
    var element = queue.shift();
    if (element instanceof ISVG)
      return element;
    if (element.hasChildNodes()) {
      for (var i = 0; i < element.childNodes.length; ++i) {
        queue.push(element.childNodes[i]);
      }
    }
  }

  throw new Error("Root SVG for selection not found");
};


GroupSelection.prototype.findTransformations = function () {
  this.translateTx = null;
  this.rotateTx = null;
  this.scaleTx = null;

  var translateIndex = -1;
  var rotateIndex = -1;
  var scaleIndex = -1;

  var tlist = this.object.transform.baseVal;
  for (var i = 0; i < tlist.numberOfItems; ++i) {
    var transform = tlist.getItem(i);
    switch (transform.type) {
      case transform.SVG_TRANSFORM_ROTATE:
        if (this.rotateTx)
          throw new Error("Multiple rotations defined for object");
        this.rotateTx = transform;
        rotateIndex = i;
        break;
      case transform.SVG_TRANSFORM_SCALE:
        if (this.scaleTx)
          throw new Error("Multiple scalings defined for object");
        this.scaleTx = transform;
        scaleIndex = i;
        break;
      case transform.SVG_TRANSFORM_TRANSLATE:
        if (this.translateTx)
          throw new Error("Multiple translations defined for object");
        this.translateTx = transform;
        translateIndex = i;
        break;
      default:
        throw new Error("Unhandled transformation type: " + transform.type);
    }
  }

  var docel = this.editor.document.documentElement;

  if (! this.translateTx)
    throw new Error("Did not find a translation on selected object");

  // Some housekeeping, just in case. The correct for the transformations
  // to keep them from affecting each other is translate, scale, rotate.
  if (translateIndex != 0) {
    dump("*** Correcting translation order\n");
    if (rotateIndex >= 0 && rotateIndex < translateIndex) ++rotateIndex;
    if (scaleIndex >= 0 && scaleIndex < translateIndex) ++scaleIndex;
    tlist.insertItemBefore(this.translateTx, 0);
    translateIndex = 0;
  }

  // Get the SVG element's internal width and height
  var width = this.rootSVG.width.baseVal;
  if (width.unitType == width.SVG_LENGTHTYPE_NUMBER) {
    width = width.value;
  }
  else {
    var tmp = this.editor.image.createSVGLength();
    tmp.newValueSpecifiedUnits(width.unitType, width.value);
    tmp.convertToSpecifiedUnits(width.SVG_LENGTHTYPE_NUMBER);
    width = tmp.value;
  }

  var height = this.rootSVG.height.baseVal;
  if (height.unitType == height.SVG_LENGTHTYPE_NUMBER) {
    height = height.value;
  }
  else {
    var tmp = this.editor.image.createSVGLength();
    tmp.newValueSpecifiedUnits(height.unitType, height.value);
    tmp.convertToSpecifiedUnits(height.SVG_LENGTHTYPE_NUMBER);
    height = tmp.value;
  }

  this._cx = width / 2;
  this._cy = height / 2;

  if (! this.scaleTx) {
    this.scaleTx = docel.createSVGTransform();
    this.scaleTx.setScale(1, 1);
    if (rotateIndex >= 0) {
      dump("*** Correcting reversed scale-rotate order\n");
      tlist.insertItemBefore(this.scaleTx, rotateIndex);
      // Need to adjust the rotate transformation from the scaled center
      // to the proper center. This was a mistake I made in the 2.5 release,
      // applying scaling before rotation about a point.
      this.rotateTx.setRotate(this.rotateTx.angle, this._cx, this._cy);
    }
    else {
      tlist.appendItem(this.scaleTx);
    }
  }

  if (! this.rotateTx) {
    this.rotateTx = docel.createSVGTransform();
    this.rotateTx.setRotate(0, this._cx, this._cy);
    tlist.appendItem(this.rotateTx);
  }
};


GroupSelection.prototype.shutdown = function () {
  SVGSelection.prototype.shutdown.apply(this, arguments);

  if (this.allowInteraction && ! this.isComposite) {
    this.circle.parentNode.removeChild(this.circle);

    this.rotateKnob.shutdown();
    this.scaleKnob.shutdown();
    this.rotateKnob = null;
    this.scaleKnob = null;
  }
};


GroupSelection.prototype.getBBox = function () {
  if (! this.object) {
    dump("*** GroupSelection.getBBox: Not initialized\n");
    printStackTrace();
    throw Components.results.NS_ERROR_NOT_INITIALIZED;
  }

  return bboxForTransformGroup(this.object, this.editor.image);
};


GroupSelection.prototype.canSetStrokeColour = function () {
  return false;
};


GroupSelection.prototype.canSetFillColour = function () {
  return false;
};


GroupSelection.prototype.setStrokeColour = function (colour) {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


GroupSelection.prototype.setFillColour = function (colour) {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


GroupSelection.prototype.canUngroup = function () {
  return this.object.getAttributeNS(Cx.NS_CX, "group") == "true";
};


GroupSelection.prototype.ungroupSelection = function () {
  var tx = new BatchTx();
  // g -> svg -> g -> [objects]
  var children = this.object.firstChild.firstChild.childNodes;
  var before = this.object.nextSibling;
  var objects = [];
  // Fetch the CTM of the inner group (the original transformations)
  var ctm = this.object.firstChild.firstChild.getCTM();
  var dx = ctm.e;
  var dy = ctm.f;

  var ILine = Components.interfaces.nsIDOMSVGLineElement;
  var IRect = Components.interfaces.nsIDOMSVGRectElement;
  var IEllipse = Components.interfaces.nsIDOMSVGEllipseElement;
  var IText = Components.interfaces.nsIDOMSVGTextElement;
  var IGroup = Components.interfaces.nsIDOMSVGGElement;

  // Restore each object, with the new offset
  for (var i = 0; i < children.length; ++i) {
    var object = children[i];
    objects.push(object);

    if (object instanceof ILine) {
      var x1 = Number(object.getAttribute("x1"));
      var y1 = Number(object.getAttribute("y1"));
      var x2 = Number(object.getAttribute("x2"));
      var y2 = Number(object.getAttribute("y2"));
      tx.addTransaction(new SetAttrTx(object, "x1", x1, x1 + dx));
      tx.addTransaction(new SetAttrTx(object, "y1", y1, y1 + dy));
      tx.addTransaction(new SetAttrTx(object, "x2", x2, x2 + dx));
      tx.addTransaction(new SetAttrTx(object, "y2", y2, y2 + dy));
    }
    else if (object instanceof IRect || object instanceof IText) {
      var x = Number(object.getAttribute("x"));
      var y = Number(object.getAttribute("y"));
      tx.addTransaction(new SetAttrTx(object, "x", x, x + dx));
      tx.addTransaction(new SetAttrTx(object, "y", y, y + dy));
    }
    else if (object instanceof IEllipse) {
      var cx = Number(object.getAttribute("cx"));
      var cy = Number(object.getAttribute("cy"));
      tx.addTransaction(new SetAttrTx(object, "cx", cx, cx + dx));
      tx.addTransaction(new SetAttrTx(object, "cy", cy, cy + dy));
    }
    else {
      var translatetx = object.transform.baseVal.getItem(0);
      var x = translatetx.matrix.e;
      var y = translatetx.matrix.f;
      tx.addTransaction(
        new TranslateTransformTx(translatetx, x, y, x + dx, y + dy));
    }
    tx.addTransaction(
      new InsertNodeTx(children[i], this.object.parentNode, before));
  }
  tx.addTransaction(new DeleteTx(this.object));
  this.txmgr.doTransaction(tx);

  var selection = new MultiSelection();
  selection.init(this.editor, objects, this.txmgr);
  this.editor.selectionController = selection;
};


GroupSelection.prototype.createMoveByTx = function (object, dx, dy) {
  var tlist = object.transform.baseVal;
  var translate = null;
  for (var i = 0; i < tlist.numberOfItems; ++i) {
    var transform = tlist.getItem(i);
    if (transform.type == transform.SVG_TRANSFORM_TRANSLATE) {
      translate = transform;
      break;
    }
  }
  if (! translate)
    throw Components.results.NS_ERROR_UNEXPECTED;

  var x = translate.matrix.e;
  var y = translate.matrix.f;

  return new TranslateTransformTx(translate, x, y, x + dx, y + dy);
};


GroupSelection.prototype.updatePosition = function () {
  SVGSelection.prototype.updatePosition.apply(this, arguments);

  if (this.allowInteraction && ! this.isComposite) {
    var bbox = this.getBBox();
    var halfwidth = bbox.width / 2;
    var halfheight = bbox.height / 2;
    var cx = bbox.x + halfwidth;
    var cy = bbox.y + halfheight;
    var r = Math.max(halfwidth, halfheight);
    this.circle.setAttribute("cx", cx);
    this.circle.setAttribute("cy", cy);
    this.circle.setAttribute("r", r);

    this.rotateKnob.updatePosition();
    this.scaleKnob.updatePosition();
  }
};


GroupSelection.prototype.onMouseDown = function (aEvent) {
  this._objectStart = {
    x: this.translateTx.matrix.e,
    y: this.translateTx.matrix.f
  };
};


GroupSelection.prototype.onMouseMove = function (aEvent) {
  var dx = aEvent.clientX - this._mouseStart.x;
  var dy = aEvent.clientY - this._mouseStart.y;

  this.translateTx.setTranslate(this._objectStart.x + dx,
    this._objectStart.y + dy);

  if (this.allowInteraction)
    this.updatePosition();
};


GroupSelection.prototype.onMouseUp = function (aEvent) {
  var x = this.translateTx.matrix.e;
  var y = this.translateTx.matrix.f;

  if (x == this._objectStart.x && y == this._objectStart.y)
    return;

  var tx = new TranslateTransformTx(this.translateTx, this._objectStart.x,
    this._objectStart.y, x, y);
  this.txmgr.doTransaction(tx);
};


GroupSelection.Knob = function () {};


GroupSelection.Knob.ROTATE = 0;
GroupSelection.Knob.SCALE = 1;


GroupSelection.Knob.prototype = {
  init: function (aSelection, aCorner) {
    this.selection = aSelection;
    this.corner = aCorner;

    var doc = aSelection.editor.document;

    this.element = doc.createElementNS(Cx.NS_SVG, "circle");
    this.element.setAttribute("r", "4px");
    this.element.setAttribute("stroke", "none");
    if (this.corner == GroupSelection.Knob.SCALE)
      this.element.setAttribute("fill", "url(#knobGradientYellow)");
    else
      this.element.setAttribute("fill", "url(#knobGradientPink)");
    this.element.setAttribute("pointer-events", "fill");
    doc.documentElement.appendChild(this.element);

    this.element.addEventListener("mousedown", this, false);
  },


  shutdown: function () {
    this.element.removeEventListener("mousedown", this, false);
    this.element.parentNode.removeChild(this.element);
  },


  updatePosition: function () {
    var bbox = this.selection.getBBox();
    if (this.corner == GroupSelection.Knob.SCALE) {
      this.element.setAttribute("cx", bbox.x + bbox.width);
      this.element.setAttribute("cy", bbox.y + bbox.height);
    }
    else {
      var halfwidth = bbox.width / 2;
      var halfheight = bbox.height / 2;
      var r = Math.max(halfwidth, halfheight);
      var cx = bbox.x + halfwidth;
      var cy = bbox.y + halfheight;
      var angle = this.selection.rotateTx.angle * Math.PI / 180;
      this.element.setAttribute("cx", cx + r * Math.cos(angle));
      this.element.setAttribute("cy", cy + r * Math.sin(angle));
    }
  },


  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      case "mousedown":
        if (aEvent.ctrlKey || aEvent.shiftKey || aEvent.metaKey)
          this.selection.editor.unselectRequested(this.selection, aEvent);
        else
          this.onMouseDown(aEvent);
        break;
      case "mousemove":
        if (this.corner == GroupSelection.Knob.SCALE)
          this.onMouseMoveScale(aEvent);
        else
          this.onMouseMoveRotate(aEvent);
        break;
      case "mouseup":
        this.onMouseUp(aEvent);
        break;
    }
  },


  onMouseDown: function (aEvent) {
    this.selection.editor.startSelectionDrag();

    this._mouseStart = {
      x: aEvent.clientX,
      y: aEvent.clientY
    };

    var bbox = this.selection.getBBox();
    this._objectStart = {
      // Transformation values
      x: this.selection.translateTx.matrix.e,
      y: this.selection.translateTx.matrix.f,
      angle: this.selection.rotateTx.angle,
      scale: this.selection.scaleTx.matrix.a,

      // Coordinate values
      cx: bbox.x + bbox.width / 2,
      cy: bbox.y + bbox.height / 2,
      boxx: bbox.x,
      boxy: bbox.y,
      width: bbox.width,
      height: bbox.height,
      diagonal: Math.sqrt(bbox.width*bbox.width + bbox.height*bbox.height)
    };

    var docel = this.selection.editor.document.documentElement;
    docel.addEventListener("mousemove", this, false);
    docel.addEventListener("mouseup", this, false);
  },


  onMouseMoveScale: function (aEvent) {
    var dx = aEvent.clientX - this._objectStart.cx;
    var dy = aEvent.clientY - this._objectStart.cy;

    // No non-positive scaling
    if (dx <= 0 || dy <= 0)
      return;

    // The distance from the center to the scaling corner
    var radius = Math.sqrt(dx*dx + dy*dy);
    // Minimum threshold (arbitrarily chosen)
    if (radius < 8)
      return;

    // This is relative to the original scale
    var ratio = 2 * radius / this._objectStart.diagonal;

    // Now we adjust the scale to make it absolute for the transformation
    ratio *= this._objectStart.scale;

    // The bounding box may not be congruent to the object's viewbox, and it
    // does not necesarily have either the same center or the same top left
    // corner, so we need to translate the object based on the offset of its
    // own center as a result of scaling, not that of the bounding box.

    /*
     * Suppose an object has its top left corner at (x0, y0), and its relative
     * center at (xc, yc), i.e., its absolute center at (x0 + xc, y0 + yc).
     *
     * At scale s1, its center becomes (s1*xc, s1*yc). This is a translation
     * of (s1*xc - xc, s1*yc - yc) = ((s1 - 1)xc, (s1 - 1)yc). To maintain
     * the absolute position of its center, we translate to:
     * (x0 - (s1 - 1)xc, y0 - (s1 - 1)yc).
     *
     * At scale s2, its center becomes (s2*xc, s2*yc). This is a translation
     * of (s2*xc - xc, s2*yc - yc) = ((s2 - 1)xc, (s2 - 1)yc). To maintain
     * the absolute position of its center, we translate to:
     * (x0 - (s2 - 1)xc, y0 - (s2 - 1)yc).
     *
     * Suppose an object has already been scaled by s1, and its new top left
     * corner is (x1, y1) = (x0 - (s1 - 1)xc, y0 - (s1 - 1)yc). To maintain
     * the absolute position of its center, we translate to:
     * (x1 + (s1 - 1)xc - (s2 - 1)xc, y1 + (s1 - 1)yc - (s2 - 1)yc)
     * = (x1 + (s1 - s2)xc, y1 + (s1 - s2)yc
     */
    var dx = this.selection._cx * (ratio - this._objectStart.scale);
    var dy = this.selection._cy * (ratio - this._objectStart.scale);
    this.selection.translateTx.setTranslate(this._objectStart.x - dx,
      this._objectStart.y - dy);

    this.selection.scaleTx.setScale(ratio, ratio);

    this.selection.updatePosition();
  },


  onMouseMoveRotate: function (aEvent) {
    var dx = aEvent.clientX - this._objectStart.cx;
    var dy = aEvent.clientY - this._objectStart.cy;
    var cx = this.selection._cx;
    var cy = this.selection._cy;

    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    this.selection.rotateTx.setRotate(angle, cx, cy);

    this.selection.updatePosition();
  },


  onMouseUp: function (aEvent) {
    this.selection.editor.endSelectionDrag();

    var docel = this.selection.editor.document.documentElement;
    docel.removeEventListener("mousemove", this, false);
    docel.removeEventListener("mouseup", this, false);

    var tx = new BatchTx();

    var x = this.selection.translateTx.matrix.e;
    var y = this.selection.translateTx.matrix.f;
    if (x != this._objectStart.x || y != this._objectStart.y) {
      tx.addTransaction(new TranslateTransformTx(this.selection.translateTx,
        this._objectStart.x, this._objectStart.y, x, y));
    }

    var angle = this.selection.rotateTx.angle;
    var cx = this.selection._cx;
    var cy = this.selection._cy;
    if (angle != this._objectStart.angle) {
      tx.addTransaction(new RotateTransformTx(this.selection.rotateTx,
        this._objectStart.angle, cx, cy, angle, cx, cy));
    }

    var scale = this.selection.scaleTx.matrix.a;
    if (scale != this._objectStart.scale) {
      tx.addTransaction(new ScaleTransformTx(this.selection.scaleTx,
        this._objectStart.scale, this._objectStart.scale, scale, scale));
    }

    if (tx.hasTransactions()) {
      this.selection.txmgr.doTransaction(tx);
    }
  }
};




function MultiSelection () {};


MultiSelection.prototype = new SVGSelection();


MultiSelection.prototype.init = function (aEditor, aObject, aTxMgr) {
  if (this.initialized)
    throw Components.results.NS_ERROR_ALREADY_INITIALIZED;

  this.initialized = true;

  this.editor = aEditor;
  this.objects = this.object = aObject;
  this.selections = [];
  this.txmgr = aTxMgr;
  this.txsink = new TransactionSink();

  for (var i = 0; i < this.objects.length; ++i)
    this.addObject(this.objects[i]);
};


MultiSelection.prototype.addObject = function (aObject) {
  if (this.containsObject(aObject))
    return;

  var selection = SVGSelectionFactory.selectionForObject(aObject);
  if (! selection) {
    dump("*** Couldn't not find selection for " + aObject.nodeName + "\n");
  }
  selection.allowInteraction = false;
  selection.init(this.editor, aObject, this.txsink);
  selection.rect.addEventListener("mousedown", this, false);
  this.selections.push(selection);
};


MultiSelection.prototype.removeObject = function (aObject) {
  for (var i = 0; i < this.selections.length; ++i) {
    if (this.selections[i].containsObject(aObject)) {
      this.selections[i].shutdown();
      this.selections.splice(i, 1);
      break;
    }
  };
};


MultiSelection.prototype.containsObject = function (aObject) {
  for (var i = 0; i < this.selections.length; ++i) {
    if (this.selections[i].containsObject(aObject))
      return true;
  }
  return false;
};


MultiSelection.prototype.getObjectCount = function () {
  return this.selections.length;
};


MultiSelection.prototype.getObjectAt = function (aIndex) {
  return this.selections[aIndex].object;
};


MultiSelection.prototype.hasValidSelection = function () {
  if (this.selections.length <= 1)
    return false;

  for (var i = 0; i < this.selections.length; ++i) {
    if (! this.selections[i].hasValidSelection())
      return false;
  }
  return true;
};


MultiSelection.prototype.isMultipleSelection = function () {
  return true;
};


MultiSelection.prototype.canLower = function () {
  return false;
};


MultiSelection.prototype.canRaise = function () {
  return false;
};


MultiSelection.prototype.canGroup = function () {
  return this.selections.length > 1;
};


MultiSelection.prototype.copySelection = function () {
  var doc = this.editor.document.implementation.createDocument(Cx.NS_SVG,
    "svg", null);
  for (var i = 0; i < this.selections.length; ++i) {
    doc.documentElement.appendChild(
      doc.importNode(this.selections[i].object, true));
  }
  var serializer = new XMLSerializer();
  var domstr = serializer.serializeToString(doc);
  var helper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
    .createInstance(Components.interfaces.nsIClipboardHelper);
  helper.copyString(domstr);
};


MultiSelection.prototype.lowerSelection = function () {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


MultiSelection.prototype.lowerSelectionToBottom = function () {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


MultiSelection.prototype.raiseSelection = function () {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


MultiSelection.prototype.raiseSelectionToTop = function () {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


MultiSelection.prototype.groupSelection = function () {
  // Get the enclosing bounding box
  var boxes = [];
  for (var i = 0; i < this.selections.length; ++i) {
    boxes.push(this.selections[i].getBBox());
  }
  var union = rectEnclosingRects(boxes, this.editor.image);

  // Create an svg viewport for it (it's what GroupSelection expects)
  var svg = this.editor.document.createElementNS(Cx.NS_SVG, "svg");
  svg.setAttribute("viewPort", "0 0 " + union.width + " " + union.height);
  svg.setAttribute("x", "0");
  svg.setAttribute("y", "0");
  svg.setAttribute("width", union.width);
  svg.setAttribute("height", union.height);
  svg.setAttribute("overflow", "visible");

  // Compensate so we can actually rotate about its center
  var innerg = this.editor.document.createElementNS(Cx.NS_SVG, "g");
  innerg.setAttribute("transform",
    "translate(" + (-union.x) + ", " + (-union.y) + ")");
  svg.appendChild(innerg);

  // Sort the items to maintain z-order
  var allchildren = this.editor.image.childNodes;
  var sorted = [];
  for (var i = 0; i < allchildren.length; ++i) {
    for (var j = 0; j < this.selections.length; ++j) {
      if (this.selections[j].object == allchildren[i]) {
        sorted.push(this.selections[j].object);
        break;
      }
    }
  }

  var tx = new BatchTx();

  var before = sorted[sorted.length - 1].nextSibling;
  var grouptx = new CreateGroupTx(this.editor.image, union.x, union.y, svg);
  tx.addTransaction(grouptx);
  tx.addTransaction(
    new SetAttrNSTx(grouptx.group, Cx.NS_CX, "group", null, "true"));
  tx.addTransaction(
    new InsertNodeTx(grouptx.group, this.editor.image, before));

  for (var i = 0; i < sorted.length; ++i) {
    tx.addTransaction(new InsertNodeTx(sorted[i], innerg, null));
  }

  this.txmgr.doTransaction(tx);

  var selection = new GroupSelection();
  selection.init(this.editor, grouptx.group, this.txmgr);
  this.editor.selectionController = selection;
};


MultiSelection.prototype.canSetStrokeColour = function () {
  for (var i = 0; i < this.selections.length; ++i) {
    if (this.selections[i].canSetStrokeColour())
      return true;
  }
  return false;
};


MultiSelection.prototype.canSetFillColour = function () {
  for (var i = 0; i < this.selections.length; ++i) {
    if (this.selections[i].canSetFillColour())
      return true;
  }
  return false;
};


MultiSelection.prototype.setStrokeColour = function (aColour) {
  this.txsink.startNewTransaction();
  for (var i = 0; i < this.selections.length; ++i) {
    if (this.selections[i].canSetStrokeColour()) {
      this.selections[i].setStrokeColour(aColour);
    }
  }
  this.txmgr.doTransaction(this.txsink.transaction);
};


MultiSelection.prototype.setFillColour = function (aColour) {
  this.txsink.startNewTransaction();
  for (var i = 0; i < this.selections.length; ++i) {
    if (this.selections[i].canSetFillColour()) {
      this.selections[i].setFillColour(aColour);
    }
  }
  this.txmgr.doTransaction(this.txsink.transaction);
};


MultiSelection.prototype.createMoveByTx = function (objects, dx, dy) {
  var tx = new BatchTx();
  for (var i = 0; i < objects.length; ++i) {
    var selection = SVGSelectionFactory.selectionForObject(objects[i]);
    tx.addTransaction(selection.createMoveByTx(objects[i], dx, dy));
  }
  return tx;
};


MultiSelection.prototype.updatePosition = function () {
  for (var i = 0; i < this.selections.length; ++i)
    this.selections[i].updatePosition();
};


MultiSelection.prototype.handleEvent = function (aEvent) {
  switch (aEvent.type) {
    case "mousedown":
      if (aEvent.ctrlKey || aEvent.shiftKey || aEvent.metaKey)
        this.onUnselect(aEvent);
      else
        this.onMouseDown(aEvent);
      break;
    case "mousemove":
      this.onMouseMove(aEvent);
      break;
    case "mouseup":
      this.onMouseUp(aEvent);
      break;
  }
};


MultiSelection.prototype.onUnselect = function (aEvent) {
  for (var i = 0; i < this.selections.length; ++i) {
    if (aEvent.target == this.selections[i].rect) {
      this.editor.unselectRequested(this.selections[i], aEvent);
      break;
    }
  }
};


MultiSelection.prototype.onMouseDown = function (aEvent) {
  this.editor.startSelectionDrag();
  this.txsink.startNewTransaction();

  for (var i = 0; i < this.selections.length; ++i)
    this.selections[i].handleEvent(aEvent);

  var root = this.editor.document.documentElement;
  root.addEventListener("mousemove", this, false);
  root.addEventListener("mouseup", this, false);
};


MultiSelection.prototype.onMouseMove = function (aEvent) {
  for (var i = 0; i < this.selections.length; ++i)
    this.selections[i].handleEvent(aEvent);
};


MultiSelection.prototype.onMouseUp = function (aEvent) {
  this.editor.endSelectionDrag();

  var root = this.editor.document.documentElement;
  root.removeEventListener("mousemove", this, false);
  root.removeEventListener("mouseup", this, false);

  for (var i = 0; i < this.selections.length; ++i)
    this.selections[i].handleEvent(aEvent);

  this.txmgr.doTransaction(this.txsink.transaction);
};


MultiSelection.prototype.shutdown = function (aEvent) {
  for (var i = 0; i < this.selections.length; ++i) {
    this.selections[i].rect.removeEventListener("mousedown", this, false);
    this.selections[i].shutdown();
  }

  if (! this.initialized) {
    dump("*** MultiSelection.shutdown: Not initialized\n");
    printStackTrace();
    throw Components.results.NS_ERROR_NOT_INITIALIZED;
  }

  this.initialized = false;
};


MultiSelection.prototype.deleteSelection = function () {
  this.txsink.startNewTransaction();
  for (var i = 0; i < this.selections.length; ++i) {
    this.selections[i].deleteSelection();
  }
  this.txmgr.doTransaction(this.txsink.transaction);
};

