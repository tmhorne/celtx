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

// Transaction manager, for a simpler style than the editor needs.
// It expects nsITransaction objects, but 

function TransactionManager () {
  this._stack = [];
  this._stackPosition = 0; // One past the end normally
  this._listeners = [];
}


TransactionManager.prototype = {
  doTransaction: function (aTransaction) {
    aTransaction.doTransaction();

    if (this._stackPosition < this._stack.length) {
      this._stack = this._stack.slice(0, this._stackPosition);
    }
    // Transaction is only added to stack if it succeeds
    this._stack.push(aTransaction);
    ++this._stackPosition;
    this.notifyListeners("DoTransaction");
  },


  canUndo: function () {
    return this._stackPosition > 0;
  },


  canRedo: function () {
    return this._stackPosition < this._stack.length;
  },


  undo: function () {
    if (! this.canUndo()) {
      throw new Error("Nothing to undo");
    }

    try {
      var tx = this._stack[--this._stackPosition];
      tx.undoTransaction();
      this.notifyListeners("UndoTransaction");
    }
    catch (ex) {
      ++this._stackPosition;
      throw ex;
    }
  },


  redo: function () {
    if (! this.canRedo()) {
      throw new Error("Nothing to redo");
    }

    var tx = this._stack[this._stackPosition];
    tx.redoTransaction();
    ++this._stackPosition;
    this.notifyListeners("RedoTransaction");
  },


  clearUndoStack: function () {
    this._stack = this._stack.slice(this._stackPosition);
    this._stackPosition = 0;
    this.notifyListeners("ClearUndoStack");
  },


  peekUndoStack: function () {
    if (this.canUndo())
      return this._stack[this._stackPosition - 1];
    else
      return null;
  },


  addListener: function (aListener) {
    if (! aListener) return;

    for (var i = 0; i < this._listeners.length; i++) {
      if (this._listeners[i] == aListener) return;
    }

    this._listeners.push(aListener);
  },


  removeListener: function (aListener) {
    if (! aListener) return;

    for (var i = 0; i < this._listeners.length; i++) {
      if (this._listeners[i] == aListener) {
        this._listeners = this._listeners.splice(i, 1);
        return;
      }
    }
  },


  notifyListeners: function (aEventType) {
    var callback = "on" + aEventType;
    for (var i = 0; i < this._listeners.length; ++i) {
      try {
        if (callback in this._listeners[i]) {
          this._listeners[i][callback]();
        }
      }
      catch (ex) {
        dump("*** notifyListeners (" + aEventType + "): " + ex + "\n");
      }
    }
  }
};
