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

var dialog = {};


function loaded () {
  dialog.config  = window.arguments[0];
  dialog.self    = document.documentElement;
  dialog.sb      = document.getElementById('celtx-bundle');
  dialog.tree    = document.getElementById('projects-tree');

  dialog.accept = dialog.self.getButton('accept');
  dialog.accept.label = dialog.sb.getString('Download');
  dialog.accept.disabled = true;

  try {
    var ds = getRemoteDataSource(dialog.config.projURL);

    var sink = ds.QueryInterface(Components.interfaces.nsIRDFXMLSink);
    sink.addXMLSinkObserver(loadObserver);

    dialog.dateTransformer = new DateTransformerDS(ds);
    dialog.tree.database.AddDataSource(dialog.dateTransformer);
    dialog.tree.builder.rebuild();
  }
  catch (ex) {
    dump("getproj: " + ex + "\n");
  }
}


// --------------------------------------------------------------------


function selected () {
  dialog.accept.disabled = false;
}


function canceled () {
  dialog.config.canceled = true;
  dialog.tree.database.RemoveDataSource(dialog.dateTransformer);
}


function accepted () {
  var i = dialog.tree.currentIndex;
  if (i == -1) return;

  var res = dialog.tree.view.getResourceAtIndex(i);
  var projectURL = res.Value;
  var title = dialog.tree.view.getCellText(i,
    dialog.tree.columns.getNamedColumn('title'));

  try {
    var rdfs = getRDFService();
    var ds = dialog.dateTransformer.source;
    var contentsRes = ds.GetTarget(res,
                                   rdfs.GetResource(Cx.NS_CX + 'contents'),
                                   true);
    contentsRes.QueryInterface(Components.interfaces.nsIRDFResource);
    var contentsURL = contentsRes.Value;
  }
  catch (ex) {
    dump(ex);
  }

  dialog.config.projectURL = projectURL;
  dialog.config.contentsURL = contentsURL;
  dialog.config.title = title;

  dialog.tree.database.RemoveDataSource(dialog.dateTransformer);
}


// Handles our busy cursor
var loadObserver = {
  onBeginLoad: function (sink) { },
  onInterrupt: function (sink) { },
  onResume:    function (sink) { },
  onEndLoad:   function (sink) { setCursor('default'); },
  onError:     function (sink, status, errMsg) { setCursor('default'); }
};



function DateTransformerEnumerator(enumerator) {
  this.enumerator = enumerator;
  this.svc = getRDFService();
}

DateTransformerEnumerator.prototype.QueryInterface = function(iid) {
  if (iid.equals(Components.interfaces.nsISupports) ||
      iid.equals(Components.interfaces.nsISimpleEnumerator))
    return this;
  throw Components.results.NS_NOINTERFACE;
};

DateTransformerEnumerator.prototype.getNext = function() {
  var next = this.enumerator.getNext();
  next = next.QueryInterface(Components.interfaces.nsIRDFLiteral);
  var dateLit = ISODateStringToDate(next.Value);
  if (dateLit)
    return this.svc.GetDateLiteral(dateLit.valueOf() * 1000);
  else
    return this.svc.GetLiteral("");
};

DateTransformerEnumerator.prototype.hasMoreElements = function() {
  return this.enumerator.hasMoreElements();
};


function DateTransformerDS (source) {
  this.source = source;
  this.svc = getRDFService();
}

DateTransformerDS.prototype = {
  source: null, // the internal data source,
  svc: null, // a cached copy of the RDFService
  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIRDFDataSource))
      return this;
    else
      throw Components.results.NS_NOINTERFACE;
  },

  URI getter: function() { return this.source.URI; },
  AddObserver: function(observer) { this.source.AddObserver(observer); },
  ArcLabelsIn: function(node) { return this.source.ArcLabelsIn(node); },
  ArcLabelsOut: function(source) { return this.source.ArcLabelsOut(source); },
  Assert: function(source, property, target, truthValue) {
    this.source.Assert(source, property, target, truthValue); },
  beginUpdateBatch: function() { this.source.beginUpdateBatch(); },
  Change: function(source, property, oldTarget, newTarget) {
    this.source.Change(source, property, oldTarget, newTarget); },
  DoCommand: function(sources, command, arguments) {
    this.source.DoCommand(sources, command, arguments); },
  endUpdateBatch: function() { this.source.endUpdateBatch(); },
  GetAllCmds: function(source) { return this.source.GetAllCmds(source); },
  GetAllResources: function() { return this.source.GetAllResources(); },
  GetSource: function(property, target, truthValue) {
    return this.source.GetSource(property, target, truthValue); },
  GetSources: function(property, target, truthValue) {
    return this.source.GetSources(property, target, truthValue); },
  GetTarget: function(source, property, truthValue) {
    var target = this.source.GetTarget(source, property, truthValue);
    if (target == null)
      return null;
    if (property.Value == Cx.NS_DC + "created" ||
        property.Value == Cx.NS_DC + "modified") {
      target = target.QueryInterface(Components.interfaces.nsIRDFLiteral);
      var dateLit = ISODateStringToDate(target.Value);
      return this.svc.GetDateLiteral(dateLit.valueOf() * 1000);
    }
    else
      return target;
  },
  GetTargets: function(source, property, truthValue) {
    var targets = this.source.GetTargets(source, property, truthValue);
    if (property.Value == Cx.NS_DC + "created" ||
        property.Value == Cx.NS_DC + "modified")
      return new DateTransformerEnumerator(targets);
    else
      return targets;
  },
  hasArcIn: function(node, arc) { return this.source.hasArcIn(node, arc); },
  hasArcOut: function(source, arc) {
    return this.source.hasArcOut(source, arc); },
  HasAssertion: function(source, property, target, truthValue) {
    return this.source.HasAssertion(source, property, target, truthValue); },
  IsCommandEnabled: function(sources, command, arguments) {
    return this.source.IsCommandEnabled(sources, command, arguments); },
  Move: function(oldSource, newSource, property, target) {
    this.source.Move(oldSource, newSource, property, target); },
  RemoveObserver: function(observer) { this.source.RemoveObserver(observer); },
  Unassert: function(source, property, target) {
    this.source.Unassert(source, property, target); }
};


function ISODateStringToDate(isoDate) {
  var elems = isoDate.match(/(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)Z/);
  if (elems)
    return new Date(elems[1], elems[2]-1, elems[3],
                    elems[4], elems[5], elems[6]);
  else
    return null;
}
