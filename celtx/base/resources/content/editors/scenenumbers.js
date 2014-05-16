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

// Helper for dealing with scene numbering schemes

function NumberingScheme (ds, scheme) {
  this.rdf = getRDFService();
  this.ds = ds;
  this.scheme = scheme;

  var schemads = this.rdf.GetDataSourceBlocking(Cx.SCHEMA_URL);
  this.compds = getCompositeDataSource();
  this.compds.AddDataSource(schemads);
  if (this.ds)
    this.compds.AddDataSource(this.ds);

  if (this.ds)
    this.seq = new RDFSeq(this.ds, this.scheme);
  else
    this.seq = new RDFSeq(schemads, this.scheme);

  var schemes = [];
  for (var i = 0; i < this.depth; ++i)
    schemes.push(this.getSchemeAt(i));
}


NumberingScheme.prototype = {
  equals: function (numberscheme) {
    if (! numberscheme)
      return false;

    if (this.scheme.EqualsNode(numberscheme.scheme))
      return true;

    if (this.depth != numberscheme.depth)
      return false;

    for (var i = 0; i < this.depth; ++i) {
      var scheme1 = this.getSchemeAt(i);
      var scheme2 = numberscheme.getSchemeAt(i);
      if (scheme1.position != scheme2.position    ||
          scheme1.numbering != scheme2.numbering  ||
          scheme1.prefix != scheme2.prefix        ||
          scheme1.suffix != scheme2.suffix        )
        return false;
    }

    return true;
  },


  get title () {
    return getRDFString(this.compds, this.scheme,
      this.rdf.GetResource(Cx.NS_DC + "title"));
  },
  set title (val) {
    if (! this.ds)
      throw new Error("Numbering scheme is read-only");

    setRDFString(this.ds, this.scheme,
      this.rdf.GetResource(Cx.NS_DC + "title"), val);

    return val;
  },


  get shortname () {
    return getRDFString(this.compds, this.scheme,
      this.rdf.GetResource(Cx.NS_CX + "shortname"));
  },
  set shortname (val) {
    if (! this.ds)
      throw new Error("Numbering scheme is read-only");

    setRDFString(this.ds, this.scheme,
      this.rdf.GetResource(Cx.NS_CX + "shortname"), val);

    return val;
  },


  get depth () {
    return this.seq.length;
  },


  getSchemeAt: function (level) {
    var item = this.seq.get(level);
    if (! item)
      return null;
    item = item.QueryInterface(Components.interfaces.nsIRDFResource);

    var numberingarc = this.rdf.GetResource(Cx.NS_CX + "numbering");
    var posarc = this.rdf.GetResource(Cx.NS_CX + "position");
    var prefixarc = this.rdf.GetResource(Cx.NS_CX + "prefix");
    var suffixarc = this.rdf.GetResource(Cx.NS_CX + "suffix");
    var result = {
      position:   getRDFString(this.compds, item, posarc),
      numbering:  getRDFString(this.compds, item, numberingarc),
      prefix:     getRDFString(this.compds, item, prefixarc),
      suffix:     getRDFString(this.compds, item, suffixarc)
    };

    return result;
  },
  setSchemeAt: function (level, item) {
    if (! this.ds)
      throw new Error("Numbering scheme is read-only");

    if (level > this.seq.length)
      throw new Error("NumberingScheme.setSchemeAt: Invalid depth (" + level
        + " > " + this.seq.length + ")");

    var itemres = null;
    if (level == this.seq.length) {
      itemres = this.rdf.GetAnonymousResource();
      this.seq.push(itemres);
    }
    else {
      itemres = this.seq.get(level).QueryInterface(
        Components.interfaces.nsIRDFResource);
    }

    var numberingarc = this.rdf.GetResource(Cx.NS_CX + "numbering");
    var posarc = this.rdf.GetResource(Cx.NS_CX + "position");
    var prefixarc = this.rdf.GetResource(Cx.NS_CX + "prefix");
    var suffixarc = this.rdf.GetResource(Cx.NS_CX + "suffix");

    setRDFString(this.ds, itemres, numberingarc, item.numbering);
    setRDFString(this.ds, itemres, posarc, item.position);
    setRDFString(this.ds, itemres, prefixarc, item.prefix);
    setRDFString(this.ds, itemres, suffixarc, item.suffix);

    return item;
  },


  getPosition: function (level) {
    return this.getSchemeAt(level).position;
  },
  setPosition: function (level, position) {
    var scheme = this.getSchemeAt(level);
    scheme.position = position;
    return this.setSchemeAt(level, scheme);
  },


  getNumbering: function (level) {
    return this.getSchemeAt(level).numbering;
  },
  setNumbering: function (level, numbering) {
    var scheme = this.getSchemeAt(level);
    scheme.numbering = numbering;
    return this.setSchemeAt(level, scheme);
  },


  getPrefix: function (level) {
    return this.getSchemeAt(level).prefix;
  },
  setPrefix: function (level, prefix) {
    var scheme = this.getSchemeAt(level);
    scheme.prefix = prefix;
    return this.setSchemeAt(level, scheme);
  },


  getSuffix: function (level) {
    return this.getSchemeAt(level).suffix;
  },
  setSuffix: function (level, suffix) {
    var scheme = this.getSchemeAt(level);
    scheme.suffix = suffix;
    return this.setSchemeAt(level, scheme);
  }
};
