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

function copyFolder (srcres, srcproj, dstproj, ruleds) {
  var rdfsvc = getRDFService();
  var IRes = Components.interfaces.nsIRDFResource;
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  if (! (srcres instanceof IRes))
    throw "Folder is not an RDF resource";
  var cu = getRDFContainerUtils();
  if (! (cu.IsSeq(srcproj.ds, srcres)))
    throw "Folder is not an RDF sequence";
  var srcseq = new RDFSeq(srcproj.ds, srcres);
  var dstres = rdfsvc.GetAnonymousResource();
  var dstseq = new RDFSeq(dstproj.ds, dstres);
  setRDFString(dstproj.ds, dstres, titlearc,
    getRDFString(srcproj.ds, srcres, titlearc));
  var items = srcseq.toArray();
  for (var i = 0; i < items.length; ++i) {
    if (! (items[i] instanceof IRes))
      continue;
    if (cu.IsSeq(srcproj.ds, items[i]))
      dstseq.push(copyFolder(items[i], srcproj, dstproj, ruleds));
    else
      dstseq.push(copyDocument(items[i], srcproj, dstproj, ruleds));
  }
  return dstres;
}

function copyDocument (srcres, srcproj, dstproj, ruleds) {
  var rdfsvc = getRDFService();
  var IRes = Components.interfaces.nsIRDFResource;
  var doctype = srcproj.ds.GetTarget(srcres,
    rdfsvc.GetResource(Cx.NS_CX + "doctype"), true);
  if (! doctype || ! (doctype instanceof IRes))
    throw "Document lacks a cx:doctype resource";
  doctype = doctype.QueryInterface(IRes);
  var rule = getRuleForDoctype(doctype, ruleds);
  if (! rule)
    throw "No rule for copying a " + doctype.Value;
  var dstres = rdfsvc.GetResource(dstproj.mintURI());
  rule.copy(srcres, dstres, srcproj, dstproj);
  return dstres;
}

function cloneDocument (srcres, srcproj, dstproj, ruleds) {
  var rdfsvc = getRDFService();
  var IRes = Components.interfaces.nsIRDFResource;
  var doctype = srcproj.ds.GetTarget(srcres,
    rdfsvc.GetResource(Cx.NS_CX + "doctype"), true);
  if (! doctype || ! (doctype instanceof IRes))
    throw "Document lacks a cx:doctype resource";
  doctype = doctype.QueryInterface(IRes);
  var rule = getRuleForDoctype(doctype, ruleds);
  if (! rule)
    throw "No rule for cloning a " + doctype.Value;
  var dstres = rdfsvc.GetResource(dstproj.mintURI());
  rule.clone(srcres, dstres, srcproj, dstproj);
  return dstres;
}

function renameDocument (srcres, srcproj, ruleds) {
  var dstres = copyDocument(srcres, srcproj, srcproj, ruleds);
  clearDocument(srcres, srcproj, ruleds);
  return dstres;
}

function clearDocument (srcres, srcproj, ruleds) {
  var rdfsvc = getRDFService();
  var IRes = Components.interfaces.nsIRDFResource;
  var doctype = srcproj.ds.GetTarget(srcres,
    rdfsvc.GetResource(Cx.NS_CX + "doctype"), true);
  if (! doctype || ! (doctype instanceof IRes))
    throw "Document lacks a cx:doctype resource";
  doctype = doctype.QueryInterface(IRes);
  var rule = getRuleForDoctype(doctype, ruleds);
  if (! rule)
    throw "No rule for clearing a " + doctype.Value;
  rule.clear(srcres, srcproj);
}

function getRuleForDoctype (doctype, ruleds) {
  var rdfsvc = getRDFService();
  var appliesarc = rdfsvc.GetResource(Cx.NS_CX + "appliesTo");
  var ruleres = ruleds.GetSource(appliesarc, doctype, true);
  if (! ruleres)
    return null;
  try {
    ruleres = ruleres.QueryInterface(Components.interfaces.nsIRDFResource);
  }
  catch (ex) {
    dump("*** getRuleForDoctype: Rule is not an nsIRDFResource\n");
    return null;
  }

  return new DocTypeRule(ruleres, ruleds);
}

function DocTypeRule (ruleres, ruleds) {
  var ILit = Components.interfaces.nsIRDFLiteral;
  var IRes = Components.interfaces.nsIRDFResource;
  var rdfsvc = getRDFService();

  // this.arcname = getRDFString(ruleds, ruleres,
  //   rdfsvc.GetResource(Cx.NS_CX + "arcname"));
  this.arcname = ruleds.GetTarget(ruleres,
    rdfsvc.GetResource(Cx.NS_CX + "arcname"), true);
  if (this.arcname instanceof ILit)
    this.arcname = this.arcname.QueryInterface(ILit).Value;
  else if (this.arcname instanceof IRes)
    this.arcname = this.arcname.QueryInterface(IRes).Value;
  this.arctype = getRDFString(ruleds, ruleres,
    rdfsvc.GetResource(Cx.NS_CX + "arctype"));
  this.unique = getRDFString(ruleds, ruleres,
    rdfsvc.GetResource(Cx.NS_CX + "unique"));
  this.unique = (this.unique == "true");
  this.owner = getRDFString(ruleds, ruleres,
    rdfsvc.GetResource(Cx.NS_CX + "owner"));
  this.owner = (this.owner == "true");

  this.subrules = {};
  var subrules = ruleds.GetTargets(ruleres,
    rdfsvc.GetResource(Cx.NS_CX + "subrule"), true);
  while (subrules.hasMoreElements()) {
    try {
      var subruleres = subrules.getNext().QueryInterface(IRes);
      var subrule = new DocTypeRule(subruleres, ruleds);
      this.subrules[subrule.arcname] = subrule;
    }
    catch (ex) {
      dump("*** Error parsing sub-rule: " + ex + "\n");
    }
  }
}

DocTypeRule.prototype = {
  _copy: function (srcres, dstres, srcproj, dstproj, dontRename) {
    var ILit = Components.interfaces.nsIRDFLiteral;
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var cu = getRDFContainerUtils();
    for (var arcname in this.subrules) {
      var rule = this.subrules[arcname];
      // Special case for _projectns_ rule
      if (arcname == "_projectns_") {
        var srcprojns = srcproj.res.Value + "/NS/";
        var arcs = srcproj.ds.ArcLabelsOut(srcres);
        while (arcs.hasMoreElements()) {
          var srcarc = arcs.getNext().QueryInterface(IRes);
          if (srcarc.Value.indexOf(srcprojns) != 0)
            continue;
          var dstarc = rdfsvc.GetResource(dstproj.res.Value + "/NS/"
            + srcarc.Value.substring(srcproj.res.Value.length + 4));
          if (rule.arctype == "Literal") {
            var lit = srcproj.ds.GetTarget(srcres, srcarc, true);
            if (lit) {
              lit = lit.QueryInterface(ILit);
              dstproj.ds.Assert(dstres, dstarc, lit, true);
            }
          }
        }
      }
      // Special case for sequences
      else if (arcname == Cx.NS_RDF + "li") {
        if (! cu.IsSeq(srcproj.ds, srcres))
          continue;
        var srccont = getRDFContainer();
        srccont.Init(srcproj.ds, srcres);
        var dstcont = null;
        if (cu.IsSeq(dstproj.ds, dstres)) {
          dstcont = getRDFContainer();
          dstcont.Init(dstproj.ds, dstres);
        }
        else {
          dstcont = cu.MakeSeq(dstproj.ds, dstres);
        }
        var nodes = srccont.GetElements();
        while (nodes.hasMoreElements()) {
          dump("--- copy: li in " + srcres.Value + "\n");
          var node = nodes.getNext();
          if (rule.arctype == "Literal") {
            node = node.QueryInterface(ILit);
            dstcont.AppendElement(node);
          }
          else if (rule.arctype == "File") {
            node = node.QueryInterface(ILit);
            var srcfile = srcproj.projectFolder;
            srcfile.append(node.Value);
            var dstfile = copyToUnique(srcfile, dstproj.projectFolder,
              srcfile.leafName);
            dstcont.AppendElement(rdfsvc.GetLiteral(dstfile.leafName));
          }
          else if (rule.arctype =="Resource") {
            node = node.QueryInterface(IRes);
            var dstnode = node;
            if (rule.owner && ! dontRename) {
              if (rdfsvc.IsAnonymousResource(node))
                dstnode = rdfsvc.GetAnonymousResource();
              else
                dstnode = rdfsvc.GetResource(dstproj.mintURI());
            }
            dstcont.AppendElement(dstnode);
            rule._copy(node, dstnode, srcproj, dstproj, dontRename);
          }
        }
      }
      else {
        var arc = rdfsvc.GetResource(arcname);
        var nodes = srcproj.ds.GetTargets(srcres, arc, true);
        while (nodes.hasMoreElements()) {
          dump("--- copy: " + arc.Value + "\n");
          var node = nodes.getNext();
          if (rule.arctype == "Literal") {
            node = node.QueryInterface(ILit);
            dstproj.ds.Assert(dstres, arc, node, true);
          }
          else if (rule.arctype == "File") {
            node = node.QueryInterface(ILit);
            var srcfile = srcproj.projectFolder;
            srcfile.append(node.Value);
            var dstfile = copyToUnique(srcfile, dstproj.projectFolder,
              srcfile.leafName);
            dstproj.ds.Assert(dstres, arc,
              rdfsvc.GetLiteral(dstfile.leafName), true);
          }
          else if (rule.arctype == "Resource") {
            node = node.QueryInterface(IRes);
            var dstnode = node;
            if (rule.owner && ! dontRename) {
              if (rdfsvc.IsAnonymousResource(node))
                dstnode = rdfsvc.GetAnonymousResource();
              else
                dstnode = rdfsvc.GetResource(dstproj.mintURI());
            }
            dstproj.ds.Assert(dstres, arc, dstnode, true);
            rule._copy(node, dstnode, srcproj, dstproj, dontRename);
          }
          if (rule.unique)
            break;
        }
      }
    }
  },

  copy: function copy (srcres, dstres, srcproj, dstproj) {
    this._copy(srcres, dstres, srcproj, dstproj, false);
  },

  // Same as copy, but doesn't rename even if cx:owner=true
  clone: function clone (srcres, dstres, srcproj, dstproj) {
    this._copy(srcres, dstres, srcproj, dstproj, true);
  },

  clear: function clear (res, proj) {
    var ILit = Components.interfaces.nsIRDFLiteral;
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var cu = getRDFContainerUtils();
    for (var arcname in this.subrules) {
      var rule = this.subrules[arcname];
      // Special case for _projectns_ rule
      if (arcname == "_projectns_") {
        var projns = proj.res.Value + "/NS/";
        var arcs = proj.ds.ArcLabelsOut(res);
        while (arcs.hasMoreElements()) {
          var arc = arcs.getNext().QueryInterface(IRes);
          if (arc.Value.indexOf(projns) != 0)
            continue;
          var node = proj.ds.GetTarget(res, arc, true);
          // TODO: Handle non-Literal types?
          proj.ds.Unassert(res, arc, node);
        }
      }
      // Special case for sequences
      else if (arcname == Cx.NS_RDF + "li") {
        var arcs = proj.ds.ArcLabelsOut(res);
        while (arcs.hasMoreElements()) {
          var arc = arcs.getNext().QueryInterface(IRes);
          if (! cu.IsOrdinalProperty(arc))
            continue;

          var node = proj.ds.GetTarget(res, arc, true);
          if (rule.arctype == "File") {
            node = node.QueryInterface(ILit);
            var file = proj.projectFolder;
            file.append(node.Value);
            if (file.exists()) {
              try {
                file.remove(false);
              }
              catch (ex) {
                dump("*** DocTypeRule.clear: " + ex + "\n");
              }
            }
          }
          else if (rule.arctype =="Resource") {
            if (rule.owner) {
              node = node.QueryInterface(IRes);
              rule.clear(node, proj);
            }
          }
          proj.ds.Unassert(res, arc, node);
        }
      }
      else {
        var arc = rdfsvc.GetResource(arcname);
        var nodes = proj.ds.GetTargets(res, arc, true);
        while (nodes.hasMoreElements()) {
          var node = nodes.getNext();
          if (rule.arctype == "File") {
            node = node.QueryInterface(ILit);
            var file = proj.projectFolder;
            file.append(node.Value);
            if (file.exists()) {
              try {
                file.remove(false);
              }
              catch (ex) {
                dump("***DocTypeRule.clear: " + ex + "\n");
              }
            }
          }
          else if (rule.arctype == "Resource") {
            if (rule.owner) {
              node = node.QueryInterface(IRes);
              rule.clear(node, proj);
            }
          }
          proj.ds.Unassert(res, arc, node);
          if (rule.unique)
            break;
        }
      }
    }
  }
};
