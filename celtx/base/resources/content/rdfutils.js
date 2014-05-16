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

/**
 * Sets the unique target of |subj| and |pred|. If |obj| is null, then
 * it clears any target of |subj| and |pred|. This function helps to
 * ensure there is never more than one triple starting with |subj| and |pred|.
 *
 * @param ds{nsIRDFDatasource} the datasource in which to assert the triple
 * @param subj{nsIRDFResource} the triple subject
 * @param pred{nsIRDFResource} the triple predicate
 * @param obj{nsIRDFResource} the triple object, or null to clear an
 * existing triple
 */
function setRDFObject (ds, subj, pred, obj) {
  if (! obj) {
    clearRDFObject(ds, subj, pred);
    return;
  }
  var oldobj = ds.GetTarget(subj, pred, true);
  if (oldobj)
    ds.Change(subj, pred, oldobj, obj);
  else
    ds.Assert(subj, pred, obj, true);
}

function clearRDFObject (ds, subj, pred) {
  var oldobj = ds.GetTarget(subj, pred, true);
  if (oldobj)
    ds.Unassert(subj, pred, oldobj);
}

// Returns null in case of failure
function getRDFLiteral (ds, subj, pred) {
  var lit = ds.GetTarget(subj, pred, true);
  if (lit && lit instanceof Components.interfaces.nsIRDFLiteral)
    return lit.QueryInterface(Components.interfaces.nsIRDFLiteral);
  else
    return null;
}

// Returns empty string in case of failure
function getRDFString (ds, subj, pred) {
  var lit = getRDFLiteral(ds, subj, pred);
  return lit ? lit.Value : "";
}

// Clears if string is empty
function setRDFString (ds, subj, pred, str) {
  if (str || str == 0) {
    var rdfsvc = getRDFService();
    setRDFObject(ds, subj, pred, rdfsvc.GetLiteral(str));
  }
  else
    clearRDFObject(ds, subj, pred);
}

function setRDFStringAllowEmpty (ds, subj, pred, str) {
  if (str === null || str === undefined) {
    clearRDFObject(ds, subj, pred);
  }
  else {
    var rdfsvc = getRDFService();
    if (str == "")
      setRDFObject(ds, subj, pred, rdfsvc.GetLiteral(" "));
    else
      setRDFObject(ds, subj, pred, rdfsvc.GetLiteral(str));
  }
}


function changeAllRDFArcsIn (ds, oldres, newres) {
  var IRes = Components.interfaces.nsIRDFResource;
  var arcs = ds.ArcLabelsIn(oldres);
  while (arcs.hasMoreElements()) {
    var arc = arcs.getNext().QueryInterface(IRes);
    var srcs = ds.GetSources(arc, oldres, true);
    while (srcs.hasMoreElements()) {
      var src = srcs.getNext().QueryInterface(IRes);
      ds.Change(src, arc, oldres, newres);
    }
  }
}


function changeAllRDFArcsOut (ds, oldres, newres) {
  var IRes = Components.interfaces.nsIRDFResource;
  var arcs = ds.ArcLabelsOut(oldres);
  while (arcs.hasMoreElements()) {
    var arc = arcs.getNext().QueryInterface(IRes);
    var tgts = ds.GetTargets(oldres, arc, true);
    while (tgts.hasMoreElements()) {
      var tgt = tgts.getNext();
      ds.Move(oldres, newres, arc, tgt);
    }
  }
}


function deleteAllRDFArcsIn (ds, node) {
  var IRes = Components.interfaces.nsIRDFResource;
  var cu = getRDFContainerUtils();
  // If we're a member of a sequence twice, we want to remove ourselves
  // back to front so the arc labels in don't become invalid.
  // This keeps track of the sequences we're in and the positions, by
  // associating an array of indices with each sequence URI.
  var sequences = {};
  var arcs = ds.ArcLabelsIn(node);
  while (arcs.hasMoreElements()) {
    var arc = arcs.getNext().QueryInterface(IRes);
    if (cu.IsOrdinalProperty(arc)) {
      var srcs = ds.GetSources(arc, node, true);
      while (srcs.hasMoreElements()) {
        var src = srcs.getNext().QueryInterface(IRes);
        if (! (src.Value in sequences))
          sequences[src.Value] = [];
        sequences[src.Value].push(cu.OrdinalResourceToIndex(arc));
      }
    }
    else {
      var srcs = ds.GetSources(arc, node, true);
      while (srcs.hasMoreElements()) {
        var src = srcs.getNext().QueryInterface(IRes);
        ds.Unassert(src, arc, node);
      }
    }
  }

  // Now clear the sequences
  var rdfsvc = getRDFService();
  for (var sequri in sequences) {
    var seqres = rdfsvc.GetResource(sequri);
    var cont = getRDFContainer();
    cont.Init(ds, seqres);
    var ords = sequences[sequri].sort();
    for (var i = ords.length - 1; i >= 0; --i) {
      cont.RemoveElementAt(ords[i], true);
    }
  }
}


function RDFSeq (ds, seq) {
  if (! (seq instanceof Components.interfaces.nsIRDFResource))
    throw "new RDFSeq argument is not an RDF resource";
  this.cu = getRDFContainerUtils();
  if (! this.cu.IsSeq(ds, seq)) {
    this.seq = this.cu.MakeSeq(ds, seq);
  }
  else {
    // This was a workaround for a bug when loading empty RDF:Seqs,
    // but I've since fixed the underlying bug in the RDF/XML parser
    var rdfsvc = getRDFService();
    var nextval = rdfsvc.GetResource(Cx.NS_RDF + "nextVal");
    var one = rdfsvc.GetLiteral("1");
    if (! ds.hasArcOut(seq, nextval)) {
      dump("*** Correcting a broken RDFSeq: " + seq.Value + "\n");
      printStackTrace();
      ds.Assert(seq, nextval, one, true);
    }
    this.seq = getRDFContainer();
    this.seq.Init(ds, seq);
  }
}

// Try to mimic an ECMAScript array as much as possible
RDFSeq.prototype = {
  get res () {
    return this.seq.Resource;
  },

  get ds () {
    return this.seq.DataSource;
  },

  get length () {
    return this.seq.GetCount();
  },

  isEmpty: function () {
    return this.seq.GetCount() == 0;
  },

  push: function (node) {
    this.seq.AppendElement(node);
  },

  indexOf: function (node) {
    var index = this.cu.indexOf(this.ds, this.res, node);
    if (index > 0)
      return index - 1;
    return -1;
  },

  get: function (index) {
    index = this.cu.IndexToOrdinalResource(index + 1);
    return this.seq.DataSource.GetTarget(this.res, index, true);
  },

  insert: function (node, index) {
    this.seq.InsertElementAt(node, index + 1, true);
  },

  remove: function (nodeOrIndex) {
    try {
    if (nodeOrIndex instanceof Components.interfaces.nsIRDFNode) {
      this.seq.RemoveElement(nodeOrIndex, true);
    }
    else {
      var index = Number(nodeOrIndex);
      this.seq.RemoveElementAt(index + 1, true);
    }
    }
    catch (ex) {
      dump("*** RDFSeq.remove (" + nodeOrIndex + "): " + ex + "\n");
      var frame = Components.stack;
      while (frame) {
        dump(frame + "\n");
        frame = frame.caller;
      }
    }
  },

  clear: function () {
    var count = this.length;
    while (count > 0)
      this.remove(--count);
  },

  toArray: function () {
    var elems = this.seq.GetElements();
    var array = new Array;
    while (elems.hasMoreElements())
      array.push(elems.getNext());
    return array;
  }
};


function dumpDS (rdfds) {
  const kResource = Components.interfaces.nsIRDFResource;
  const kLiteral = Components.interfaces.nsIRDFLiteral;
  const kInt = Components.interfaces.nsIRDFInt;
  var cu = getRDFContainerUtils();
  dump("*** Dumping RDF Datasource: " + rdfds.URI + "\n");
  var subjs = rdfds.GetAllResources();
  while (subjs.hasMoreElements()) {
    var subj = subjs.getNext().QueryInterface(kResource);
    dump("  " + subj.Value + "\n");
    if (cu.IsContainer(rdfds, subj)) {
      var cont = getRDFContainer();
      cont.Init(rdfds, subj);
      var elems = cont.GetElements();
      var idx = 1;
      while (elems.hasMoreElements()) {
        var elem = elems.getNext();
        try {
          elem = elem.QueryInterface(kResource);
        }
        catch (e1) {
          try {
            elem = elem.QueryInterface(kLiteral);
          }
          catch (e2) {
            try {
              elem = elem.QueryInterface(kInt);
            }
            catch (e3) {
              elem = { Value: "Couldn't query interface" };
            }
          }
        }
        dump("    [" + (idx++) + "] " + elem.Value + "\n");
      }
    }
    var arcs = rdfds.ArcLabelsOut(subj);
    while (arcs.hasMoreElements()) {
      var arc = arcs.getNext().QueryInterface(kResource);
      if (! cu.IsOrdinalProperty(arc)) {
        dump("    " + arc.Value + "\n");
        var objs = rdfds.GetTargets(subj, arc, true);
        while (objs.hasMoreElements()) {
          var obj = objs.getNext();
          try {
            obj = obj.QueryInterface(kResource);
          }
          catch (e1) {
            try {
              obj = obj.QueryInterface(kLiteral);
            }
            catch (e2) {
              try {
                obj = obj.QueryInterface(kInt);
              }
              catch (e3) {
                obj = { Value: "Couldn't query interface" };
              }
            }
          }
          dump("      " + obj.Value + "\n");
        }
      }
    }
  }
  dump("\n\n");
}
