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

function BreakdownUnit (aDS, aResource) {
  if (! aDS)
    throw new Error("Can't create breakdown unit without a datasource");
  if (! aResource)
    throw new Error("Can't create breakdown unit without a resource");

  this.ds = aDS;
  this.resource = aResource.QueryInterface(
    Components.interfaces.nsIRDFResource);

  var rdfsvc = getRDFService();
  var membersarc = rdfsvc.GetResource(Cx.NS_CX + "members");
  var members = aDS.GetTarget(aResource, membersarc, true);
  if (! members) {
    members = rdfsvc.GetAnonymousResource();
    aDS.Assert(aResource, membersarc, members, true);
  }
  this.members = new RDFSeq(aDS, members);

  var markuparc = rdfsvc.GetResource(Cx.NS_CX + "markup");
  var markup = aDS.GetTarget(aResource, markuparc, true);
  if (! markup) {
    markup = rdfsvc.GetAnonymousResource();
    aDS.Assert(aResource, markuparc, markup, true);
  }
  this.markup = new RDFSeq(aDS, markup);

  this.wrappedJSObject = this;
}


BreakdownUnit.prototype = {
  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  suspendNotifications: function () {
    this._suspendNotifications = true;
  },


  resumeNotifications: function () {
    this._suspendNotifications = false;
  },


  notify: function (aMessage) {
    if (! this._suspendNotifications)
      getObserverService().notifyObservers(this, aMessage, null);
  },


  get title () {
    return getRDFString(this.ds, this.resource,
      getRDFService().GetResource(Cx.NS_DC + "title"));
  },
  set title (val) {
    this.notify("breakdownUnit:willChangeTitle");
    setRDFString(this.ds, this.resource,
      getRDFService().GetResource(Cx.NS_DC + "title"), val);
    this.notify("breakdownUnit:didChangeTitle");
    return val;
  },


  get alttitle () {
    return getRDFString(this.ds, this.resource,
      getRDFService().GetResource(Cx.NS_CX + "alttitle"));
  },
  set alttitle (val) {
    this.notify("breakdownUnit:willChangeAltTitle");
    setRDFString(this.ds, this.resource,
      getRDFService().GetResource(Cx.NS_CX + "alttitle"), val);
    this.notify("breakdownUnit:didChangeAltTitle");
    return val;
  },


  get description () {
    return getRDFString(this.ds, this.resource,
      getRDFService().GetResource(Cx.NS_DC + "description"));
  },
  set description (val) {
    this.notify("breakdownUnit:willChangeDescription");
    setRDFString(this.ds, this.resource,
      getRDFService().GetResource(Cx.NS_DC + "description"), val);
    this.notify("breakdownUnit:didChangeDescription");
    return val;
  },


  get ordinal () {
    return getRDFString(this.ds, this.resource,
      getRDFService().GetResource(Cx.NS_CX + "ordinal"));
  },
  set ordinal (val) {
    this.notify("breakdownUnit:willChangeOrdinal");
    setRDFString(this.ds, this.resource,
      getRDFService().GetResource(Cx.NS_CX + "ordinal"), val);
    this.notify("breakdownUnit:didChangeOrdinal");
    return val;
  },


  get colour () {
    return getRDFString(this.ds, this.resource,
      getRDFService().GetResource(Cx.NS_CX + "colour"));
  },
  set colour (val) {
    this.notify("breakdownUnit:willChangeColour");
    setRDFString(this.ds, this.resource,
      getRDFService().GetResource(Cx.NS_CX + "colour"), val);
    this.notify("breakdownUnit:didChangeColour");
    return val;
  },


  addItem: function addItem (itemres) {
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = this.ds.GetTarget(itemres, typearc, true);
    if (! (type && type instanceof Components.interfaces.nsIRDFResource))
      throw new Error("Cannot add item without a type to BreakdownUnit");
    type = type.QueryInterface(Components.interfaces.nsIRDFResource);
    var deptseq = this._getDeptSequence(type, true);
    if (deptseq.indexOf(itemres) < 0)
      deptseq.push(itemres);
    var sizearc = rdfsvc.GetResource(Cx.NS_CX + "size");
    setRDFString(this.ds, deptseq.res, sizearc, deptseq.length);
  },


  removeItem: function removeItem (itemres) {
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = this.ds.GetTarget(itemres, typearc, true);
    if (! (type && type instanceof Components.interfaces.nsIRDFResource))
      throw new Error("Cannot remove item without a type from BreakdownUnit");
    type = type.QueryInterface(Components.interfaces.nsIRDFResource);
    var deptseq = this._getDeptSequence(type);
    if (! deptseq)
      return;

    deptseq.remove(itemres);
    var sizearc = rdfsvc.GetResource(Cx.NS_CX + "size");

    if (deptseq.isEmpty()) {
      this.members.remove(deptseq.res);
      var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
      var deptlisttype = rdfsvc.GetResource(Cx.NS_CX + "DepartmentList");
      this.ds.Unassert(deptseq.res, deptarc, type);
      this.ds.Unassert(deptseq.res, typearc, deptlisttype);
      clearRDFObject(this.ds, deptseq.res, sizearc);
    }
    else {
      setRDFString(this.ds, deptseq.res, sizearc, deptseq.length);
    }
  },


  containsItem: function containsItem (itemres) {
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = this.ds.GetTarget(itemres, typearc, true);
    if (! (type && type instanceof Components.interfaces.nsIRDFResource))
      throw new Error("Cannot find item without a type in BreakdownUnit: "
        + itemres.Value);
    type = type.QueryInterface(Components.interfaces.nsIRDFResource);
    var deptseq = this._getDeptSequence(type);
    return deptseq ? deptseq.indexOf(itemres) >= 0 : false;
  },


  addToMarkup: function addToMarkup (itemres) {
    if (this.markup.indexOf(itemres) < 0)
      this.markup.push(itemres);
  },


  removeFromMarkup: function removeFromMarkup (itemres) {
    this.markup.remove(itemres);
  },


  containsInMarkup: function containsInMarkup (itemres) {
    return this.markup.indexOf(itemres) >= 0;
  },


  _getDeptSequence: function (deptres, force) {
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var deptlisttype = rdfsvc.GetResource(Cx.NS_CX + "DepartmentList");
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var depts = this.members.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var list = depts[i].QueryInterface(Components.interfaces.nsIRDFResource);
      var dept = this.ds.GetTarget(list, deptarc, true);
      if (dept && deptres.EqualsNode(dept))
        return new RDFSeq(this.ds, list);
    }
    if (! force)
      return null;
    var listres = rdfsvc.GetAnonymousResource();
    this.ds.Assert(listres, deptarc, deptres, true);
    this.ds.Assert(listres, typearc, deptlisttype, true);
    var list = new RDFSeq(this.ds, listres);
    this.members.push(listres);
    return list;
  }
};


function ScriptScene (aDS, aRes, aElement) {
  if (! aElement)
    throw new Error("Can't create scene without scene heading");

  BreakdownUnit.call(this, aDS, aRes);

  this.element = aElement;
}


ScriptScene.prototype = {
  __proto__: BreakdownUnit.prototype,


  equals: function (aScene) {
    try {
      return this.resource.EqualsNode(aScene.resource);
    }
    catch (ex) {
      return false;
    }
  },


  get domRange () {
    // If a scene was just deleted, we might still hold a reference to
    // it and try to get its range
    if (! this.element.parentNode)
      return null;

    var xpath = new XPathEvaluator();
    var xset = xpath.evaluate("following::p[@class='sceneheading']",
      this.element, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    var nextHeading = xset.singleNodeValue;

    var doc = this.element.ownerDocument;
    var range = doc.createRange();
    range.setStartBefore(this.element);
    if (nextHeading)
      range.setEndBefore(nextHeading);
    else
      range.setEndAfter(doc.body.lastChild);

    return range;
  }
};


function scenesContainingItem (ds, itemres) {
  var results = [];
  var seen = {};

  var rdfsvc = getRDFService();
  var cu = getRDFContainerUtils();
  var IRes = Components.interfaces.nsIRDFResource;
  var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
  var depttype = rdfsvc.GetResource(Cx.NS_CX + "DepartmentList");
  var membersarc = rdfsvc.GetResource(Cx.NS_CX + "members");

  // Find the department lists the item is in
  var arcs = ds.ArcLabelsIn(itemres);
  while (arcs.hasMoreElements()) {
    var arc = arcs.getNext().QueryInterface(IRes);
    if (! cu.IsOrdinalProperty(arc))
      continue;
    var deptseqs = ds.GetSources(arc, itemres, true);
    while (deptseqs.hasMoreElements()) {
      var deptseq = deptseqs.getNext().QueryInterface(IRes);
      if (! ds.HasAssertion(deptseq, typearc, depttype, true))
        continue;

      // Find the sequence of department lists this list is in
      var deptarcs = ds.ArcLabelsIn(deptseq);
      while (deptarcs.hasMoreElements()) {
        var deptarc = deptarcs.getNext().QueryInterface(IRes);
        if (! cu.IsOrdinalProperty(deptarc))
          continue;

        // Department lists are anonymous nodes, so they should be
        // a member of only one sequence
        var mainseq = ds.GetSource(deptarc, deptseq, true);
        if (! mainseq)
          continue;

        // Likewise, the main sequence should belong to a unique scene
        var scene = ds.GetSource(membersarc, mainseq, true);
        if (scene && ! (scene.Value in seen)) {
          results.push(scene);
          seen[scene.Value] = 1;
        }
      }
    }
  }
  return results;
}


function Scene (ds, res) {
  this.ds = ds;
  this.res = res;

  var rdfsvc = getRDFService();

  var membersarc = rdfsvc.GetResource(Cx.NS_CX + "members");
  var members = ds.GetTarget(res, membersarc, true);
  if (! members) {
    members = rdfsvc.GetAnonymousResource();
    ds.Assert(res, membersarc, members, true);
  }
  this.members = new RDFSeq(ds, members);

  var markuparc = rdfsvc.GetResource(Cx.NS_CX + "markup");
  var markup = ds.GetTarget(res, markuparc, true);
  if (! markup) {
    markup = rdfsvc.GetAnonymousResource();
    ds.Assert(res, markuparc, markup, true);
  }
  this.markup = new RDFSeq(ds, markup);
}


Scene.prototype = {
  addItem: function addItem (itemres) {
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = this.ds.GetTarget(itemres, typearc, true);
    if (! (type && type instanceof Components.interfaces.nsIRDFResource))
      throw "Scene.addItem: Cannot add item without a type";
    type = type.QueryInterface(Components.interfaces.nsIRDFResource);
    var deptseq = this._getDeptSequence(type, true);
    if (deptseq.indexOf(itemres) < 0)
      deptseq.push(itemres);
    var sizearc = rdfsvc.GetResource(Cx.NS_CX + "size");
    setRDFString(this.ds, deptseq.res, sizearc, deptseq.length);
  },


  removeItem: function removeItem (itemres) {
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = this.ds.GetTarget(itemres, typearc, true);
    if (! (type && type instanceof Components.interfaces.nsIRDFResource))
      throw "Scene.removeItem: Cannot add item without a type";
    type = type.QueryInterface(Components.interfaces.nsIRDFResource);
    var deptseq = this._getDeptSequence(type);
    if (! deptseq)
      return;

    deptseq.remove(itemres);
    var sizearc = rdfsvc.GetResource(Cx.NS_CX + "size");

    if (deptseq.isEmpty()) {
      this.members.remove(deptseq.res);
      var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
      var deptlisttype = rdfsvc.GetResource(Cx.NS_CX + "DepartmentList");
      this.ds.Unassert(deptseq.res, deptarc, type);
      this.ds.Unassert(deptseq.res, typearc, deptlisttype);
      clearRDFObject(this.ds, deptseq.res, sizearc);
    }
    else {
      setRDFString(this.ds, deptseq.res, sizearc, deptseq.length);
    }
  },


  containsItem: function containsItem (itemres) {
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = this.ds.GetTarget(itemres, typearc, true);
    if (! (type && type instanceof Components.interfaces.nsIRDFResource))
      throw "Scene.containsItem: Cannot add item without a type: "
        + itemres.Value;
    type = type.QueryInterface(Components.interfaces.nsIRDFResource);
    var deptseq = this._getDeptSequence(type);
    return deptseq ? deptseq.indexOf(itemres) >= 0 : false;
  },


  addToMarkup: function addToMarkup (itemres) {
    if (this.markup.indexOf(itemres) < 0)
      this.markup.push(itemres);
  },


  removeFromMarkup: function removeFromMarkup (itemres) {
    this.markup.remove(itemres);
  },


  containsInMarkup: function containsInMarkup (itemres) {
    return this.markup.indexOf(itemres) >= 0;
  },


  _getDeptSequence: function (deptres, force) {
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var deptlisttype = rdfsvc.GetResource(Cx.NS_CX + "DepartmentList");
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var depts = this.members.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var list = depts[i].QueryInterface(Components.interfaces.nsIRDFResource);
      var dept = this.ds.GetTarget(list, deptarc, true);
      if (dept && deptres.EqualsNode(dept))
        return new RDFSeq(this.ds, list);
    }
    if (! force)
      return null;
    var listres = rdfsvc.GetAnonymousResource();
    this.ds.Assert(listres, deptarc, deptres, true);
    this.ds.Assert(listres, typearc, deptlisttype, true);
    var list = new RDFSeq(this.ds, listres);
    this.members.push(listres);
    return list;
  }
};
