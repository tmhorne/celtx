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

function TransactionSink () {};


TransactionSink.prototype = {
  startNewTransaction: function () {
    this.transaction = new BatchTx();
  },


  doTransaction: function (aTx) {
    this.transaction.addTransaction(aTx);
  }
};


function CreateLineTx (aParent, aX1, aY1, aX2, aY2, aArrow) {
  this.parent = aParent;
  this.x1 = aX1;
  this.y1 = aY1;
  this.x2 = aX2;
  this.y2 = aY2;
  this.arrow = aArrow;
}

CreateLineTx.prototype = {
  doTransaction: function () {
    var doc = this.parent.ownerDocument;
    this.line = doc.createElementNS(Cx.NS_SVG, "line");

    this.line.setAttribute("x1", this.x1);
    this.line.setAttribute("y1", this.y1);
    this.line.setAttribute("x2", this.x2);
    this.line.setAttribute("y2", this.y2);
    if (this.arrow)
      this.line.setAttribute("marker-end", "url(#arrowMarker)");
    this.line.setAttribute("stroke", "black");
    this.line.setAttribute("stroke-width", "2");

    this.parent.appendChild(this.line);
  },

  undoTransaction: function () {
    this.parent.removeChild(this.line);
  },

  redoTransaction: function () {
    this.parent.appendChild(this.line);
  }
};


function CreateRectTx (aParent, aX, aY, aWidth, aHeight) {
  this.parent = aParent;
  this.x = aX;
  this.y = aY;
  this.width = aWidth;
  this.height = aHeight;
}

CreateRectTx.prototype = {
  doTransaction: function () {
    var doc = this.parent.ownerDocument;
    this.rect = doc.createElementNS(Cx.NS_SVG, "rect");

    this.rect.setAttribute("x", this.x);
    this.rect.setAttribute("y", this.y);
    this.rect.setAttribute("width", this.width);
    this.rect.setAttribute("height", this.height);
    this.rect.setAttribute("stroke", "black");
    this.rect.setAttribute("stroke-width", "2");
    this.rect.setAttribute("fill", "white");

    this.parent.appendChild(this.rect);
  },

  undoTransaction: function () {
    this.parent.removeChild(this.rect);
  },

  redoTransaction: function () {
    this.parent.appendChild(this.rect);
  }
};


function CreateEllipseTx (aParent, aCx, aCy, aRx, aRy) {
  this.parent = aParent;
  this.cx = aCx;
  this.cy = aCy;
  this.rx = aRx;
  this.ry = aRy;
}

CreateEllipseTx.prototype = {
  doTransaction: function () {
    var doc = this.parent.ownerDocument;
    this.ellipse = doc.createElementNS(Cx.NS_SVG, "ellipse");

    this.ellipse.setAttribute("cx", this.cx);
    this.ellipse.setAttribute("cy", this.cy);
    this.ellipse.setAttribute("rx", this.rx);
    this.ellipse.setAttribute("ry", this.ry);
    this.ellipse.setAttribute("stroke", "black");
    this.ellipse.setAttribute("stroke-width", "2");
    this.ellipse.setAttribute("fill", "white");

    this.parent.appendChild(this.ellipse);
  },

  undoTransaction: function () {
    this.parent.removeChild(this.ellipse);
  },

  redoTransaction: function () {
    this.parent.appendChild(this.ellipse);
  }
};


function CreateTextTx (aParent, aX, aY, aText) {
  this.parent = aParent;
  this.x = aX;
  this.y = aY;
  this.text = aText;
  this.object = this.parent.ownerDocument.createElementNS(Cx.NS_SVG, "text");
}

CreateTextTx.prototype = {
  doTransaction: function () {
    var doc = this.parent.ownerDocument;
    this.object.setAttribute("x", this.x);
    this.object.setAttribute("y", this.y);
    this.object.appendChild(doc.createTextNode(this.text));

    this.parent.appendChild(this.object);
  },

  undoTransaction: function () {
    this.parent.removeChild(this.object);
  },

  redoTransaction: function () {
    this.parent.appendChild(this.object);
  }
};


function CreateGroupTx (aParent, aX, aY, aSVG) {
  this.parent = aParent;
  this.x = aX;
  this.y = aY;
  this.svg = aSVG;

  // Create the group now, in case we need to refer to it as part of a
  // batch transaction.
  var doc = this.parent.ownerDocument;
  this.group = doc.createElementNS(Cx.NS_SVG, "g");
  this.group.setAttribute("transform",
    "translate(" + this.x + "," + this.y + ")");
}

CreateGroupTx.prototype = {
  doTransaction: function () {
    this.group.appendChild(this.svg);

    this.parent.appendChild(this.group);
  },

  undoTransaction: function () {
    this.parent.removeChild(this.group);
  },

  redoTransaction: function () {
    this.parent.appendChild(this.group);
  }
};


function DeleteTx (aObject) {
  this.parent = aObject.parentNode;
  this.nextSibling = aObject.nextSibling;
  this.object = aObject;
}

DeleteTx.prototype = {
  doTransaction: function () {
    this.parent.removeChild(this.object);
  },

  undoTransaction: function () {
    this.parent.insertBefore(this.object, this.nextSibling);
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};


function SetAttrTx (aObject, aAttr, aOldValue, aNewValue) {
  this.object = aObject;
  this.attr = aAttr;
  this.oldValue = aOldValue;
  this.newValue = aNewValue;
}

SetAttrTx.prototype = {
  doTransaction: function () {
    if (this.newValue)
      this.object.setAttribute(this.attr, this.newValue);
    else
      this.object.removeAttribute(this.attr);
  },

  undoTransaction: function () {
    if (this.oldValue)
      this.object.setAttribute(this.attr, this.oldValue);
    else
      this.object.removeAttribute(this.attr);
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};


function SetAttrNSTx (aObject, aNS, aAttr, aOldValue, aNewValue) {
  this.object = aObject;
  this.ns = aNS;
  this.attr = aAttr;
  this.oldValue = aOldValue;
  this.newValue = aNewValue;
}

SetAttrNSTx.prototype = {
  doTransaction: function () {
    if (this.newValue)
      this.object.setAttributeNS(this.ns, this.attr, this.newValue);
    else
      this.object.removeAttributeNS(this.ns, this.attr);
  },

  undoTransaction: function () {
    if (this.oldValue)
      this.object.setAttributeNS(this.ns, this.attr, this.oldValue);
    else
      this.object.removeAttributeNS(this.ns, this.attr);
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};


function ScaleTransformTx (aTransform, aOldX, aOldY, aNewX, aNewY) {
  this.transform = aTransform;
  this.oldX = aOldX;
  this.oldY = aOldY;
  this.newX = aNewX;
  this.newY = aNewY;
}

ScaleTransformTx.prototype = {
  doTransaction: function () {
    this.transform.setScale(this.newX, this.newY);
  },

  undoTransaction: function () {
    this.transform.setScale(this.oldX, this.oldY);
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};


function TranslateTransformTx (aTransform, aOldX, aOldY, aNewX, aNewY) {
  this.transform = aTransform;
  this.oldX = aOldX;
  this.oldY = aOldY;
  this.newX = aNewX;
  this.newY = aNewY;
}

TranslateTransformTx.prototype = {
  doTransaction: function () {
    this.transform.setTranslate(this.newX, this.newY);
  },

  undoTransaction: function () {
    this.transform.setTranslate(this.oldX, this.oldY);
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};


function RotateTransformTx (aTransform, aOldAngle, aOldCx, aOldCy,
                                        aNewAngle, aNewCx, aNewCy) {
  this.transform = aTransform;
  this.oldAngle = aOldAngle;
  this.oldCx = aOldCx;
  this.oldCy = aOldCy;
  this.newAngle = aNewAngle;
  this.newCx = aNewCx;
  this.newCy = aNewCy;
}

RotateTransformTx.prototype = {
  doTransaction: function () {
    this.transform.setRotate(this.newAngle, this.newCx, this.newCy);
  },

  undoTransaction: function () {
    this.transform.setRotate(this.oldAngle, this.oldCx, this.oldCy);
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};


function AddLabelTx (aObject, aGroup, aTextValue) {
  this.object = aObject;
  this.group = aGroup;
  this.textValue = aTextValue;
}


AddLabelTx.prototype = {
  doTransaction: function () {
    var doc = this.object.ownerDocument;

    var viewport = getViewportWH(this.object);
    var fontsize;
    // Since the viewport gets seated into a 100x100 square, we need to assume
    // scaling happens relative to the largest dimension.
    if (viewport.height > viewport.width)
      fontsize = Math.ceil(viewport.height * 0.16);
    else
      fontsize = Math.ceil(viewport.width * 0.16);
    this.text = doc.createElementNS(Cx.NS_SVG, "text");
    this.text.setAttributeNS(Cx.NS_CX, "role", "label");
    this.text.setAttribute("x", viewport.minx + viewport.width / 2);
    this.text.setAttribute("y", viewport.miny + viewport.height + fontsize);
    this.text.setAttribute("text-anchor", "middle");
    this.text.setAttribute("font-family", "sans-serif");
    this.text.setAttribute("font-size", fontsize);
    this.text.appendChild(doc.createTextNode(this.textValue));

    this.rotateidx = -1;
    var txs = this.group.transform.baseVal;
    var ROTATE_TYPE = Components.interfaces.nsIDOMSVGTransform
      .SVG_TRANSFORM_ROTATE;
    for (var i = 0; i < txs.numberOfItems; ++i) {
      var tx = txs.getItem(i);
      if (tx.type != ROTATE_TYPE)
        continue;
      if (this.rotateidx >= 0)
        throw new Error("Can't handle multiple rotation transforms");
      this.rotateidx = i;
    }

    this.rotateGroup = doc.createElementNS(Cx.NS_SVG, "g");
    this.rotateGroup.setAttributeNS(Cx.NS_CX, "role", "rotate");
    while (this.object.childNodes.length > 0)
      this.rotateGroup.appendChild(this.object.childNodes[0]);
    this.object.appendChild(this.rotateGroup);
    var angle = 0;
    if (this.rotateidx >= 0) {
      this.oldtx = this.group.transform.baseVal.removeItem(this.rotateidx);
      angle = this.oldtx.angle;
    }
    var rotatetx = doc.documentElement.createSVGTransform();
    rotatetx.setRotate(angle, viewport.minx + viewport.width / 2,
      viewport.miny + viewport.height / 2);
    this.rotateGroup.transform.baseVal.appendItem(rotatetx);

    this.previousOverflow = this.object.getAttribute("overflow");
    if (this.previousOverflow != "visible")
      this.object.setAttribute("overflow", "visible");

    this.object.appendChild(this.text);
  },

  undoTransaction: function () {
    this.text.parentNode.removeChild(this.text);
    this.text = null;

    while (this.rotateGroup.childNodes.length > 0) {
      this.object.insertBefore(this.rotateGroup.childNodes[0],
        this.object.firstChild);
    }
    if (this.rotateidx >= 0) {
      this.group.transform.baseVal.insertItemBefore(this.oldtx,
        this.rotateidx);
    }

    this.rotateGroup.parentNode.removeChild(this.rotateGroup);
    this.rotateGroup = null;

    if (this.previousOverflow) {
      if (this.previousOverflow != "visible")
        this.object.setAttribute("overflow", this.previousOverflow);
    }
    else {
      this.object.removeAttribute("overflow");
    }
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};


function EditLabelTx (aText, aTextValue) {
  this.text = aText;
  this.textValue = aTextValue;
}

EditLabelTx.prototype = {
  doTransaction: function () {
    this.oldValue = this.text.firstChild.nodeValue;
    this.text.firstChild.nodeValue = this.textValue;
  },

  undoTransaction: function () {
    this.text.firstChild.nodeValue = this.oldValue;
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};


function LowerObjectTx (aObject) {
  this.object = aObject;
}

LowerObjectTx.prototype = {
  doTransaction: function () {
    if (! this.object.parentNode)
      throw new Error("LowerObjectTx: Object no longer in document");
    if (! this.object.previousSibling)
      throw new Error("LowerObjectTx: Object already at bottom");
    this.object.parentNode.insertBefore(this.object,
      this.object.previousSibling);
  },

  undoTransaction: function () {
    if (! this.object.parentNode)
      throw new Error("LowerObjectTx: Object no longer in document during undo");
    if (! this.object.nextSibling)
      throw new Error("LowerObjectTx: Object already at top during undo");
    this.object.parentNode.insertBefore(this.object,
      this.object.nextSibling.nextSibling);
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};


function LowerObjectToBottomTx (aObject) {
  this.object = aObject;
}

LowerObjectToBottomTx.prototype = {
  doTransaction: function () {
    if (! this.object.parentNode)
      throw new Error("LowerObjectTx: Object no longer in document");
    if (! this.object.previousSibling)
      throw new Error("LowerObjectTx: Object already at bottom");
    this.nextSibling = this.object.nextSibling;
    this.object.parentNode.insertBefore(this.object,
      this.object.parentNode.firstChild);
  },

  undoTransaction: function () {
    if (! this.object.parentNode)
      throw new Error("LowerObjectTx: Object no longer in document during undo");
    this.object.parentNode.insertBefore(this.object, this.nextSibling);
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};


function RaiseObjectTx (aObject) {
  this.object = aObject;
}

RaiseObjectTx.prototype = {
  doTransaction: function () {
    if (! this.object.parentNode)
      throw new Error("RaiseObjectTx: Object no longer in document");
    if (! this.object.nextSibling)
      throw new Error("RaiseObjectTx: Object already at top");
    this.object.parentNode.insertBefore(this.object,
      this.object.nextSibling.nextSibling);
  },

  undoTransaction: function () {
    if (! this.object.parentNode)
      throw new Error("RaiseObjectTx: Object no longer in document during undo");
    if (! this.object.previousSibling)
      throw new Error("RaiseObjectTx: Object already at bottom during undo");
    this.object.parentNode.insertBefore(this.object,
      this.object.previousSibling);
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};


function RaiseObjectToTopTx (aObject) {
  this.object = aObject;
}

RaiseObjectToTopTx.prototype = {
  doTransaction: function () {
    if (! this.object.parentNode)
      throw new Error("RaiseObjectTx: Object no longer in document");
    if (! this.object.nextSibling)
      throw new Error("RaiseObjectTx: Object already at top");
    this.nextSibling = this.object.nextSibling;
    this.object.parentNode.appendChild(this.object);
  },

  undoTransaction: function () {
    if (! this.object.parentNode)
      throw new Error("RaiseObjectTx: Object no longer in document during undo");
    this.object.parentNode.insertBefore(this.object, this.nextSibling);
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};


function BatchTx () {
  this._txs = [];
}

BatchTx.prototype = {
  addTransaction: function (aTx) {
    this._txs.push(aTx);
  },

  hasTransactions: function () {
    return this._txs.length > 0;
  },

  doTransaction: function () {
    for (var i = 0; i < this._txs.length; ++i) {
      this._txs[i].doTransaction();
    }
  },

  undoTransaction: function () {
    for (var i = this._txs.length - 1; i >= 0; --i) {
      this._txs[i].undoTransaction();
    }
  },

  redoTransaction: function () {
    for (var i = 0; i < this._txs.length; ++i) {
      this._txs[i].redoTransaction();
    }
  }
};


function InsertNodeTx (aNode, aParent, aBefore) {
  this.node = aNode;
  this.parent = aParent;
  this.before = aBefore;
}


InsertNodeTx.prototype = {
  doTransaction: function () {
    this.oldparent = this.node.parentNode;
    this.oldbefore = this.node.nextSibling;
    this.parent.insertBefore(this.node, this.before);
  },


  undoTransaction: function () {
    if (this.oldparent)
      this.oldparent.insertBefore(this.node, this.oldbefore);
    else
      this.parent.removeChild(this.node);
  },

  redoTransaction: function () {
    this.doTransaction();
  }
};
