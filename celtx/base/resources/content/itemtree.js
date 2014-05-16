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

// Implements nsITreeView

function CatalogTreeView () {
  this.schemads = getRDFService().GetDataSourceBlocking(Cx.SCHEMA_URL);
}


CatalogTreeView.prototype = {
  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsITreeView) ||
        iid.equals(Components.interfaces.nsIRDFObserver))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  init: function (ds, seq) {
    if (! (ds instanceof Components.interfaces.nsIRDFDataSource))
      throw "ds is not an nsIRDFDataSource";
    if (! (seq instanceof Components.interfaces.nsIRDFResource))
      throw "seq is not an nsIRDFResource";

    if (this._boxObject)
      this._boxObject.beginUpdateBatch();

    this.ds = ds;
    this.seq = new RDFSeq(ds, seq);
    this._recalculateRowCount();

    if (this._boxObject) {
      this._boxObject.rowCountChanged(0, this.rowCount);
      this._boxObject.endUpdateBatch();
    }

    this.ds.AddObserver(this);
  },


  shutdown: function () {
    if (! this.ds)
      return;

    this.ds.RemoveObserver(this);

    if (this._boxObject) {
      this._boxObject.beginUpdateBatch();
      this._boxObject.rowCountChanged(0, -this.rowCount);
    }

    this.ds = null;
    this.seq = null;
    this._rowCount = 0;

    if (this._boxObject)
      this._boxObject.endUpdateBatch();
  },


  // Cached because it's called a lot
  _rowCount: 0,


  // Maps categories (RDF URIs) to open state. Any non-zero value (including
  // undefined) indicates that category's row is open.
  _toggleStates: {},


  // Our own reference of how deep the begin/endUpdateBatch nesting is
  _batchNestLevel: 0,


  selection: null,


  get selectedItem () {
    if (this.selection.count != 1)
      return null;

    var idx = this.selection.currentIndex;
    if (this.getLevel(idx) <= 0)
      return null;

    return this.resourceAtIndex(idx).Value;
  },


  set selectedItem (val) {
    if (! val) {
      this.selection.clearSelection();
      return;
    }

    // For items, ensure the parent category is toggled open.
    var rdfsvc = getRDFService();
    var res = rdfsvc.GetResource(val);
    var rdftypearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var rdftype = this.ds.GetTarget(res, rdftypearc, true);
    if (rdftype && rdftype instanceof Components.interfaces.nsIRDFResource) {
      rdftype = rdftype.QueryInterface(Components.interfaces.nsIRDFResource);
      if (this._toggleStates[rdftype.Value] == 0) {
        var parentrow = this.indexOfResource(rdftype);
        if (parentrow >= 0)
          this.toggleOpenState(parentrow);
      }
    }
    var idx = this.indexOfResource(getRDFService().GetResource(val));
    if (idx >= 0)
      this.selection.select(idx);
    else
      this.selection.clearSelection();
  },


  indexOfResource: function (res) {
    var IRes = Components.interfaces.nsIRDFResource;

    if (! (res instanceof IRes))
      throw "res must be an nsIRDFResource";
    res = res.QueryInterface(IRes);

    var rdfsvc = getRDFService();
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");

    var nextrow = 0;
    var depts = this.seq.toArray();
    // Check the list of department sequences and their contents
    for (var i = 0; i < depts.length; ++i) {
      var deptlist = depts[i].QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);

      if (! (deptres && deptres instanceof IRes)) {
        dump("*** indexOfResource: Missing department on dept sequence\n");
        continue;
      }

      deptres = deptres.QueryInterface(IRes);

      // This shouldn't get called during an update. Use the onAssert, etc.,
      // handlers to mark as dirty when _batchNestLevel > 0?
      var deptseq = new RDFSeq(this.ds, deptlist);
      if (deptseq.length <= 0)
        continue;

      // Check if the resource is the current department
      if (res.EqualsNode(deptres))
        return nextrow;

      // Check if the resource is an item in the current department
      // var inneridx = deptseq.indexOf(res);
      var inneridx = deptseq.indexOf(res);
      if (inneridx >= 0) {
        if (this._toggleStates[deptres.Value] != 0)
          return nextrow + inneridx + 1;
        else
          return -1; // row is invisible
      }

      if (this._toggleStates[deptres.Value] != 0)
        nextrow += deptseq.length + 1;
      else
        nextrow += 1;
    }

    return -1;
  },


  resourceAtIndex: function (row) {
    var res = this.getCellValue(row, null);
    return res ? getRDFService().GetResource(res) : null;
  },


  _recalculateRowCount: function () {
    var count = 0;
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var depts = this.seq.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var deptlist = depts[i].QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);
      if (! (deptres && deptres instanceof IRes))
        continue;
      deptres = deptres.QueryInterface(IRes);
      deptlist = new RDFSeq(this.ds, deptlist);
      var length = deptlist.length;
      if (length <= 0)
        continue;
      ++count;
      if (this._toggleStates[deptres.Value] != 0)
        count += length;
    }
    this._rowCount = count;
  },


  get rowCount () {
    if (! this.seq)
      return 0;

    // DEBUG: Make sure our cached value isn't getting out of sync
    if (1) {
      var count = this._rowCount;
      this._recalculateRowCount();
      if (this._rowCount != count) {
        dump("*** get rowCount: Cached value is incorrect (have "
          + this._rowCount + ", should be " + count + ")\n");
        this._rowCount = count;
      }
    }
    return this._rowCount;
  },


  canDrop: function (row, orientation) {
    return false;
  },


  cycleCell: function (row, col) {},


  cycleHeader: function (col) {},


  drop: function (row, orientation) {},


  getCellProperties: function (row, col, properties) {},


  getCellText: function (row, col) {
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var labelarc = rdfsvc.GetResource(Cx.NS_RDFS + "label");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var nextrow = 0;

    var depts = this.seq.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var deptlist = depts[i].QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);
      if (! (deptres && deptres instanceof IRes))
        continue;
      deptres = deptres.QueryInterface(IRes);

      var deptseq = new RDFSeq(this.ds, deptlist);
      if (deptseq.length <= 0)
        continue;

      if (row == nextrow)
        return getRDFString(this.ds, deptres, labelarc)
          + " (" + deptseq.length + ")";

      ++nextrow;
      if (this._toggleStates[deptres.Value] != 0) {
        if (row < nextrow + deptseq.length) {
          var item = deptseq.get(row - nextrow);
          item = item.QueryInterface(IRes);
          return getRDFString(this.ds, item, titlearc);
        }
        nextrow += deptseq.length;
      }
    }

    return "";
  },


  getCellValue: function (row, col) {
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var nextrow = 0;

    var depts = this.seq.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var deptlist = depts[i].QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);
      if (! (deptres && deptres instanceof IRes))
        continue;
      deptres = deptres.QueryInterface(IRes);

      var deptseq = new RDFSeq(this.ds, deptlist);
      if (deptseq.length <= 0)
        continue;

      if (row == nextrow)
        return deptres.Value;

      ++nextrow;
      if (this._toggleStates[deptres.Value] != 0) {
        if (row < nextrow + deptseq.length) {
          var item = deptseq.get(row - nextrow);
          item = item.QueryInterface(IRes);
          return item.Value;
        }
        nextrow += deptseq.length;
      }
    }

    return null;
  },


  getColumnProperties: function (col, properties) {},


  getImageSrc: function (row, col) {
    return "";
  },


  getLevel: function (row) {
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var nextrow = 0;

    var depts = this.seq.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var deptlist = depts[i].QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);
      if (! (deptres && deptres instanceof IRes))
        continue;
      deptres = deptres.QueryInterface(IRes);

      var deptseq = new RDFSeq(this.ds, deptlist);
      if (deptseq.length <= 0)
        continue;

      if (row == nextrow)
        return 0;

      ++nextrow;
      if (this._toggleStates[deptres.Value] != 0) {
        if (row < nextrow + deptseq.length)
          return 1;
        nextrow += deptseq.length;
      }
    }

    return -1;
  },


  getParentIndex: function (row) {
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var nextrow = 0;

    var depts = this.seq.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var deptlist = depts[i].QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);
      if (! (deptres && deptres instanceof IRes))
        continue;
      deptres = deptres.QueryInterface(IRes);

      var deptseq = new RDFSeq(this.ds, deptlist);
      if (deptseq.length <= 0)
        continue;

      if (row == nextrow)
        return -1;

      ++nextrow;
      if (this._toggleStates[deptres.Value] != 0) {
        if (row < nextrow + deptseq.length)
          return nextrow - 1;
        nextrow += deptseq.length;
      }
    }

    return -1;
  },


  getProgressMode: function (row, col) {
    return Components.interfaces.nsITreeView.PROGRESS_NONE;
  },


  getRowProperties: function (row, properties) {},


  hasNextSibling: function (row, afterIndex) {
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var nextrow = 0;

    var isDept = false;

    var depts = this.seq.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var deptlist = depts[i].QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);
      if (! (deptres && deptres instanceof IRes))
        continue;
      deptres = deptres.QueryInterface(IRes);

      var deptseq = new RDFSeq(this.ds, deptlist);
      if (deptseq.length <= 0)
        continue;

      if (row == nextrow)
        isDept = true;
      else if (row > afterIndex)
        return true;

      ++nextrow;
      if (this._toggleStates[deptres.Value] != 0) {
        if (row < nextrow + deptseq.length)
          return afterIndex < nextrow + deptseq.length;
        nextrow += deptseq.length;
      }
    }

    return false;
  },


  isContainer: function (row) {
    return this.getLevel(row) == 0;
  },


  isContainerEmpty: function (row) {
    // We don't list empty containers
    return false;
  },


  isContainerOpen: function (row) {
    return this._toggleStates[this.getCellValue(row, null)] != 0;
  },


  isEditable: function (row, col) {
    return false;
  },


  isSeparator: function (row) {
    return false;
  },


  isSorted: function () {
    return true;
  },


  performAction: function (action) {},


  performActionOnCell: function (action, row, col) {},


  performActionOnRow: function (action, row) {},


  selectedChanged: function () {},


  setCellText: function (row, col, value) {},


  setCellValue: function (row, col, value) {},


  setTree: function (tree) {
    this._boxObject = tree;
  },


  toggleOpenState: function (row) {
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var labelarc = rdfsvc.GetResource(Cx.NS_RDFS + "label");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var nextrow = 0;

    var depts = this.seq.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var deptlist = depts[i].QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);
      if (! (deptres && deptres instanceof IRes))
        continue;
      deptres = deptres.QueryInterface(IRes);

      var deptseq = new RDFSeq(this.ds, deptlist);
      if (deptseq.length <= 0)
        continue;

      var setOpen = this._toggleStates[deptres.Value] == 0;
      var delta = deptseq.length;

      if (row == nextrow) {
        this._toggleStates[deptres.Value] = setOpen ? 1 : 0;
        if (delta != 0 && this._boxObject) {
          if (setOpen) {
            dump("--- changing rowcount from " + this._rowCount);
            this._rowCount += delta;
            dump(" to " + this._rowCount + " [toggle, +delta]\n");
            this._boxObject.rowCountChanged(row + 1, delta);
          }
          else {
            dump("--- changing rowcount from " + this._rowCount);
            this._rowCount -= delta;
            dump(" to " + this._rowCount + " [toggle, -delta]\n");
            this._boxObject.rowCountChanged(row + 1, -delta);
          }
        }
        this._boxObject.invalidateRow(row);
        return;
      }

      if (setOpen) // row is toggled closed
        nextrow += 1;
      else
        nextrow += delta + 1;
    }
  },


  isProductionItem: function (res) {
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = this.ds.GetTarget(res, typearc, true);
    if (! (type && type instanceof IRes))
      return false;
    var schemares = rdfsvc.GetResource(Cx.SCHEMA_URL + "#default-markup");
    var schemaseq = new RDFSeq(this.schemads, schemares);
    return schemaseq.indexOf(type) >= 0;
  },


  // nsIRDFObserver implementation
  onBeginUpdateBatch: function (ds) {
    if (! this._boxObject)
      return;

    if (this._batchNestLevel++ > 0)
      return;

    this._cachedSizes = {};

    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");

    var depts = this.seq.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var deptlist = depts[i].QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);
      if (! (deptres && deptres instanceof IRes))
        continue;
      deptres = deptres.QueryInterface(IRes);
      var deptseq = new RDFSeq(this.ds, deptlist);
      this._cachedSizes[deptres.Value] = deptseq.length;
    }

    this._boxObject.beginUpdateBatch();
  },


  onEndUpdateBatch: function (ds) {
    if (--this._batchNestLevel > 0)
      return;

    var row = 0;

    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");

    var depts = this.seq.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var deptlist = depts[i].QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);
      if (! (deptres && deptres instanceof IRes))
        continue;
      deptres = deptres.QueryInterface(IRes);
      var deptseq = new RDFSeq(this.ds, deptlist);

      var oldlen = this._cachedSizes[deptres.Value];
      if (! oldlen)
        oldlen = 0;
      var newlen = deptseq.length;

      dump("    " + deptres.Value + "[" + deptlist.Value + "]: " + oldlen + " -> " + newlen + "\n");

      if (oldlen == newlen) {
        // No change
        if (oldlen > 0) {
          if (this._toggleStates[deptres.Value] != 0)
            row += oldlen + 1;
          else
            ++row;
        }
        continue;
      }

      // An appearing category
      if (oldlen == 0) {
        var added = 1;
        if (this._toggleStates[deptres.Value] != 0)
          added += newlen;
        dump("--- changing rowcount from " + this._rowCount);
        this._rowCount += added;
        dump(" to " + this._rowCount + " [added]\n");
        this._boxObject.rowCountChanged(row, added);
        row += added;
      }
      // A disappearing category
      else if (newlen == 0)  {
        var removed = 1;
        if (this._toggleStates[deptres.Value] != 0)
          removed += oldlen;
        dump("--- changing rowcount from " + this._rowCount);
        this._rowCount -= removed;
        dump(" to " + this._rowCount + " [removed]\n");
        this._boxObject.rowCountChanged(row, -removed);
      }
      // A change in size
      else {
        var diff = newlen - oldlen;
        if (this._toggleStates[deptres.Value] != 0) {
          dump("--- changing rowcount from " + this._rowCount);
          this._rowCount += diff;
          dump(" to " + this._rowCount + " [changed]\n");
          this._boxObject.rowCountChanged(row, diff);
          row += newlen + 1;
        }
        else {
          ++row;
        }
      }
    }

    this._boxObject.endUpdateBatch();
    this._boxObject.invalidate();
    this._cachedSizes = null;
  },


  onAssert: function (ds, src, prop, tgt) {
    /*
    var index = this.indexOfResource(src);
    if (index >= 0)
      this._boxObject.invalidateRow(index);
    return;
    */

    if (this._batchNestLevel > 0)
      return;

    // Does this involve membership in a sequence?
    var cu = getRDFContainerUtils();
    if (! cu.IsOrdinalProperty(prop)) {
      var index = this.indexOfResource(src);
      if (index >= 0)
        this._boxObject.invalidateRow(index);
      return;
    }

    return;

    // It involves membership. Check if it's a department list.
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var dept = this.ds.GetTarget(src, deptarc, true);
    if (! (dept && dept instanceof IRes))
      return;
    dept = dept.QueryInterface(IRes);

    var deptseq = new RDFSeq(this.ds, src);

    // If index >= 0, then the department is in our list and already has at
    // least one item in it.
    var index = this.indexOfResource(dept);
    if (index >= 0) {
      // Only change if the row is not collapsed
      if (this._toggleStates[dept.Value] != 0) {
        index += cu.OrdinalResourceToIndex(prop);
        ++this._rowCount;
        this._boxObject.rowCountChanged(index, 1);
      }
      return;
    }
    else {
      dump("*** wtf? index of " + dept.Value + " is " + index + "\n");
      return;
    }

    // It's newly appearing. We have to grope through to find its position.
    index = 0;
    var depts = this.seq.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var candidate = depts[i].QueryInterface(IRes);
      var canddept = this.ds.GetTarget(candidate, deptarc, true);

      if (! (canddept && canddept instanceof IRes))
        continue;

      canddept = canddept.QueryInterface(IRes);
      if (dept.Value == canddept.Value)
        break;

      var candseq = new RDFSeq(this.ds, candidate);
      if (candseq.length == 0)
        continue;

      if (this._toggleStates[canddept.Value] == 0)
        ++index;
      else
        index += candseq.length + 1;
    }

    // If it's toggle closed, it appears on its own, otherwise
    // both it and the item in it appear
    if (this._toggleStates[dept.Value] == 0) {
      ++this._rowCount;
      this._boxObject.rowCountChanged(index, 1);
    }
    else {
      this._rowCount += 2;
      this._boxObject.rowCountChanged(index, 2);
    }
  },


  onChange: function (ds, src, prop, oldtgt, newtgt) {
    if (this._batchNestLevel > 0)
      return;

    var index = this.indexOfResource(src);
    if (index >= 0)
      this._boxObject.invalidateRow(index);

    return;

    // Does this involve membership in a sequence?
    var cu = getRDFContainerUtils();
    if (! cu.IsOrdinalProperty(prop)) {
      var index = this.indexOfResource(src);
      if (index >= 0)
        this._boxObject.invalidateRow(index);
      return;
    }

    // It involves membership. Check if it's a department list.
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var dept = this.ds.GetTarget(src, deptarc, true);
    if (! (dept && dept instanceof IRes))
      return;
    dept = dept.QueryInterface(IRes);
  },


  onMove: function (ds, oldsrc, newsrc, prop, tgt) {},


  onUnassert: function (ds, src, prop, tgt) {
    if (this._batchNestLevel > 0)
      return;

    // Does this involve membership in a sequence?
    var cu = getRDFContainerUtils();
    if (! cu.IsOrdinalProperty(prop)) {
      var index = this.indexOfResource(src);
      if (index >= 0)
        this._boxObject.invalidateRow(index);
      return;
    }
    return;
    // It involves membership. Check if it's a department list.
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var dept = this.ds.GetTarget(src, deptarc, true);
    if (! (dept && dept instanceof IRes))
      return;
    dept = dept.QueryInterface(IRes);

    var deptseq = new RDFSeq(this.ds, src);
    var index = this.indexOfResource(dept);
    if (index < 0) {
      dump("*** indexOfResource(" + dept.Value + ") == " + index + "\n");
      return;
    }

    // onUnassert is called prior to the actual removal, so "empty" really
    // means a list of one.
    if (deptseq.length > 1) {
      // Only change if the row is not collapsed
      if (this._toggleStates[dept.Value] != 0) {
        index += cu.OrdinalResourceToIndex(prop);
        --this._rowCount;
        this._boxObject.rowCountChanged(index, -1);
      }
      return;
    }
    else {
      // If it's toggle closed, it disappears on its own, otherwise
      // both it and the item in it disappear
      if (this._toggleStates[dept.Value] == 0) {
        --this._rowCount;
        this._boxObject.rowCountChanged(index, -1);
      }
      else {
        this._rowCount -= 2;
        this._boxObject.rowCountChanged(index, -2);
      }
    }
  }
};
