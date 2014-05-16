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
 * @class A Catalog Manager is an object that tracks all the catalogs in
 * a project and makes sure their membership list is up to date.
 *
 * @constructor
 * @param project  the project whose catalogs should be managed
 */
function CatalogManager (project) {
  this.rdf = getRDFService();
  this.ds = project.ds;
  this.ds.AddObserver(this);
  this.schemads = this.rdf.GetDataSourceBlocking(Cx.SCHEMA_URL);
  this.docds = this.rdf.GetDataSourceBlocking(Cx.DOCTYPES_URL);

  // Build up the list of catalogs in the project
  var IRes = Components.interfaces.nsIRDFResource;
  var doctypearc = this.rdf.GetResource(Cx.NS_CX + "doctype");
  var cattype = this.rdf.GetResource(Cx.NS_CX + "CatalogDocument");
  var catalogs = this.ds.GetSources(doctypearc, cattype, true);
  this._catalogs = [];
  this._pendingCatalogs = [];
  while (catalogs.hasMoreElements())
    this._catalogs.push(catalogs.getNext().QueryInterface(IRes));

  this.ds.beginUpdateBatch();
  try {
    for (var i = 0; i < this._catalogs.length; ++i)
      this.updateCatalog(this._catalogs[i]);
  }
  catch (ex) {
    dump("*** CatalogManager.constructor: " + ex + "\n");
  }
  this.ds.endUpdateBatch();
}

CatalogManager.prototype = {
  /**
   * Internal cache of known catalogs.
   * @private
   */
  _catalogs: [],

  /**
   * Internal cache of catalogs being added.
   * @private
   */
  _pendingCatalogs: [],

  /**
   * A convenient reference to the RDF service
   * @private
   */
  rdf: null,

  /**
   * The project datasource.
   * @private
   */
  ds: null,

  /**
   * The Celtx schema datasource.
   * @private
   */
  schemads: null,

  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIRDFObserver))
      return this;
    throw Components.results.NS_ERROR_NOINTERFACE;
  },


  /**
   * Performs any necessary housekeeping. This should be called when the
   * catalog manager is no longer needed.
   */
  shutdown: function () {
    if (this.ds)
      this.ds.RemoveObserver(this);
    this._catalogs = [];
    this.rdf = null;
  },


  /**
   * Creates a function that takes a breakdown item as an argument and
   * returns true if it matches the filter for a catalog.
   *
   * @param res  the catalog to match against. It must be a catalog that
   *             uses a filter
   * @type function
   * @return a function that tests a breakdown item against the catalog filter
   */
  filterFunctionForCatalog: function (catres) {
    var IRes = Components.interfaces.nsIRDFResource;
    var filterarc = this.rdf.GetResource(Cx.NS_CX + "filter");
    var filter = this.ds.GetTarget(catres, filterarc, true);

    // We don't update anything for manual catalogs
    if (! (filter && filter instanceof IRes))
      throw "No filter function for manual catalogs";

    filter = filter.QueryInterface(IRes);
    if (filter.Value == "celtx:filter:all")
      return function (res) { return true; };

    var categories = new RDFSeq(this.ds, filter).toArray();
    var typearc = this.rdf.GetResource(Cx.NS_RDF + "type");
    var ds = this.ds;

    return function (res) {
      var type = ds.GetTarget(res, typearc, true);
      if (! type) return false;
      for (var i = 0; i < categories.length; ++i) {
        if (type.EqualsNode(categories[i]))
          return true;
      }
      return false;
    };
  },


  /**
   * Updates the membership list for a catalog.
   *
   * @param res  the catalog to update
   */
  updateCatalog: function (res) {
    var IRes = Components.interfaces.nsIRDFResource;
    var filterarc = this.rdf.GetResource(Cx.NS_CX + "filter");
    var filter = this.ds.GetTarget(res, filterarc, true);

    // We just update the size for manual catalogs
    if (! (filter && filter instanceof IRes)) {
      this.updateCatalogSize(res);
      return;
    }

    var matches = this.filterFunctionForCatalog(res);
    var typearc = this.rdf.GetResource(Cx.NS_RDF + "type");
    var catlistres = this.rdf.GetResource(Cx.SCHEMA_URL + "#default-markup");
    var categories = new RDFSeq(this.schemads, catlistres).toArray();
    for (var i = 0; i < categories.length; ++i) {
      var items = this.ds.GetSources(typearc, categories[i], true);
      while (items.hasMoreElements()) {
        try {
          var item = items.getNext().QueryInterface(IRes);
          if (matches(item))
            this.addItemToCatalog(item, res);
          else
            this.removeItemFromCatalog(item, res);
        }
        catch (ex) {
          dump("*** updateCatalog: " + ex + "\n");
        }
      }
    }
    this.updateCatalogSize(res);
  },


  /**
   * Updates the cached size of a catalog.
   *
   * @param res  the catalog to update
   */
  updateCatalogSize: function (res) {
    var IRes = Components.interfaces.nsIRDFResource;
    var membersarc = this.rdf.GetResource(Cx.NS_CX + "members");
    var members = this.ds.GetTarget(res, membersarc, true);
    if (! (members && members instanceof IRes)) {
      members = this.rdf.GetAnonymousResource();
      this.ds.Assert(res, membersarc, members, true);
    }
    else {
      members = members.QueryInterface(IRes);
    }
    members = new RDFSeq(this.ds, members);

    var sizearc = this.rdf.GetResource(Cx.NS_CX + "size");
    setRDFString(this.ds, res, sizearc, members.length);
  },


  /**
   * Adds an item to a catalog (unless the catalog already contains it).
   *
   * @param item  the item resource
   * @param catalog  the catalog where the item should be added
   * @type boolean
   * @return true if the item was added, false if it already contains it
   */
  addItemToCatalog: function (item, catalog) {
    var IRes = Components.interfaces.nsIRDFResource;
    var membersarc = this.rdf.GetResource(Cx.NS_CX + "members");
    var deptsarc = this.rdf.GetResource(Cx.NS_CX + "departments");
    var deptarc = this.rdf.GetResource(Cx.NS_CX + "department");
    var typearc = this.rdf.GetResource(Cx.NS_RDF + "type");

    var itemtype = this.ds.GetTarget(item, typearc, true);
    if (! (itemtype && itemtype instanceof IRes))
      throw "Adding something that is not an item";

    itemtype = itemtype.QueryInterface(IRes);

    var members = this.ds.GetTarget(catalog, membersarc, true);
    if (! (members && members instanceof IRes)) {
      members = this.rdf.GetAnonymousResource();
      this.ds.Assert(catalog, membersarc, members, true);
    }
    else {
      members = members.QueryInterface(IRes);
    }
    members = new RDFSeq(this.ds, members);

    // If it's here, no need to look further
    if (members.indexOf(item) >= 0)
      return false;

    members.push(item);

    var depts = this.ds.GetTarget(catalog, deptsarc, true);
    if (! (depts && depts instanceof IRes)) {
      depts = this.rdf.GetAnonymousResource();
      this.ds.Assert(catalog, deptsarc, depts, true);
    }
    else {
      depts = depts.QueryInterface(IRes);
    }
    depts = new RDFSeq(this.ds, depts);
    var count = depts.length;
    var deptseq = null;
    for (var i = 0; i < count.length; ++count) {
      var deptlist = depts.get(i).QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);
      if (deptres && itemtype.EqualsNode(deptres)) {
        deptseq = new RDFSeq(this.ds, deptlist);
        break;
      }
    }

    if (! deptseq) {
      // Department wasn't found, add it
      var deptlist = this.rdf.GetAnonymousResource();
      var listtype = this.rdf.GetResource(Cx.NS_CX + "DepartmentList");
      this.ds.Assert(deptlist, typearc, listtype, true);
      this.ds.Assert(deptlist, deptarc, itemtype, true);
      depts.push(deptlist);
      deptseq = new RDFSeq(this.ds, deptlist);
    }

    if (deptseq.indexOf(item) >= 0)
      dump("*** addItemToCatalog: Item already in department list\n");
    else
      deptseq.push(item);

    this.updateCatalogSize(catalog);

    return true;
  },


  /**
   * Removes an item from a catalog (unless the catalog does not contains it).
   *
   * @param item  the item resource
   * @param catalog  the catalog from which the item should be removed
   * @param oldtype  the original type of the item (optional)
   * @type boolean
   * @return true if the item was removed, false if it was not in the catalog
   */
  removeItemFromCatalog: function (item, catalog, oldtype) {
    var IRes = Components.interfaces.nsIRDFResource;
    var membersarc = this.rdf.GetResource(Cx.NS_CX + "members");
    var deptsarc = this.rdf.GetResource(Cx.NS_CX + "departments");
    var deptarc = this.rdf.GetResource(Cx.NS_CX + "department");
    var typearc = this.rdf.GetResource(Cx.NS_RDF + "type");

    var itemtype = oldtype ? oldtype : this.ds.GetTarget(item, typearc, true);
    if (! (itemtype && itemtype instanceof IRes))
      throw "Removing something that is not an item";

    itemtype = itemtype.QueryInterface(IRes);

    var members = this.ds.GetTarget(catalog, membersarc, true);
    if (! (members && members instanceof IRes))
      return false;
    members = new RDFSeq(this.ds, members.QueryInterface(IRes));

    // If it's not here, no need to look further
    var membersindex = members.indexOf(item);
    if (membersindex < 0)
      return false;

    while (members.indexOf(item) >= 0)
      members.remove(membersindex);

    this.updateCatalogSize(catalog);

    var depts = this.ds.GetTarget(catalog, deptsarc, true);
    if (! (depts && depts instanceof IRes)) {
      dump("*** removeItemFromCatalog: No depts arc\n");
      return true;
    }
    depts = new RDFSeq(this.ds, depts.QueryInterface(IRes));

    var count = depts.length;
    var deptseq = null;
    for (var i = 0; i < count; ++i) {
      var deptlist = depts.get(i).QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);
      if (deptres && itemtype.EqualsNode(deptres)) {
        deptseq = new RDFSeq(this.ds, deptlist);
        break;
      }
    }

    if (! deptseq) {
      dump("*** removeItemFromCatalog: No corresponding department list\n");
      return true;
    }

    var deptindex = deptseq.indexOf(item);
    if (deptindex < 0) {
      dump("*** removeItemFromCatalog: Item not in department list\n");
      return true;
    }

    while (deptseq.indexOf(item) >= 0)
      deptseq.remove(deptindex);

    if (deptseq.isEmpty())
      depts.remove(deptseq.res);

    return true;
  },


  /**
   * Finds the index of a catalog in the internal catalog list.
   *
   * @param res  the catalog to find
   * @type int
   * @return the index of the catalog in the internal list,
   *         or -1 if the catalog was not found
   */
  indexOfCatalog: function (res) {
    for (var i = 0; i < this._catalogs.length; ++i) {
      if (this._catalogs[i].Value == res.Value)
        return i;
    }
    return -1;
  },


  /**
   * Determines if a resource refers to a catalog.
   *
   * @param res  the resource to check
   * @type boolean
   * @return true if the resource refers to a catalog
   */
  isCatalog: function (res) {
    var doctypearc = this.rdf.GetResource(Cx.NS_CX + "doctype");
    var cattype = this.rdf.GetResource(Cx.NS_CX + "CatalogDocument");
    return this.ds.HasAssertion(res, doctypearc, cattype, true);
  },


  /**
   * Determines if a resource refers to a breakdown item.
   *
   * @param res  the resource to check
   * @type boolean
   * @return true if the resource is a breakdown item
   */
  isBreakdownItem: function (res) {
    var IRes = Components.interfaces.nsIRDFResource;
    var typearc = this.rdf.GetResource(Cx.NS_RDF + "type");
    var type = this.ds.GetTarget(res, typearc, true);
    if (! (type && type instanceof IRes))
      return false;
    type = type.QueryInterface(IRes);
    return this.isBreakdownType(type);
  },


  /**
   * Determines if a resource is a shortcut to a breakdown item.
   *
   * @param res{nsIRDFResource} the resource to check
   * @type boolean
   * @return true if the resource is a shortcut to a breakdown item
   */
  isBreakdownShortcut: function (res) {
    var IRes = Components.interfaces.nsIRDFResource;
    var doctypearc = this.rdf.GetResource(Cx.NS_CX + "doctype");
    var categoryarc = this.rdf.GetResource(Cx.NS_CX + "category");
    var sourcearc = this.rdf.GetResource(Cx.NS_DC + "source");

    var doctype = this.ds.GetTarget(res, doctypearc, true);
    if (! (doctype && doctype instanceof IRes))
      return false;
    doctype = doctype.QueryInterface(IRes);

    // We don't care what the category is, we just need to know it has one
    var category = this.docds.GetTarget(doctype, categoryarc, true);
    if (! (category && category instanceof IRes))
      return false;

    var source = this.ds.GetTarget(res, sourcearc, true);
    return (source && source instanceof IRes);
  },


  /**
   * Resolve the breakdown item a shortcut points to.
   *
   * @param res{nsIRDFResource} a resource for an item  shortcut
   * @type nsIRDFResource
   * @return the breakdown item the shortcut points to
   */
  resolveBreakdownShortcut: function (res) {
    if (! this.isBreakdownShortcut(res))
      throw "resolveBreakdownShortcut: Not a breakdown shortcut";
    var IRes = Components.interfaces.nsIRDFResource;
    var sourcearc = this.rdf.GetResource(Cx.NS_DC + "source");
    var source = this.ds.GetTarget(res, sourcearc, true);
    return source.QueryInterface(IRes);
  },


  /**
   * Determines if a resource refers to a breakdown type.
   *
   * @param res  the resource to check
   * @type boolean
   * @return true if the resource is a breakdown type
   */
  isBreakdownType: function (res) {
    var cu = getRDFContainerUtils();
    var schemaseq = this.rdf.GetResource(Cx.SCHEMA_URL + "#default-markup");
    return cu.indexOf(this.schemads, schemaseq, res) >= 0;
  },


  /**
   * Checks all known catalogs to see if a breakdown item should be
   * added to or removed from each catalog, taking the appropriate
   * action as necessary.
   *
   * @param res  the breakdown item to check for membership
   * @param oldtype  the original type when an item is being deleted (optional)
   */
  checkMembership: function (res, oldtype) {
    var IRes = Components.interfaces.nsIRDFResource;
    var filterarc = this.rdf.GetResource(Cx.NS_CX + "filter");
    var typearc = this.rdf.GetResource(Cx.NS_RDF + "type");
    var type = this.ds.GetTarget(res, typearc, true);
    for (var i = 0; i < this._catalogs.length; ++i) {
      var catres = this._catalogs[i];

      if (oldtype) {
        try {
          this.removeItemFromCatalog(res, catres, oldtype);
        }
        catch (ex) {
          dump("*** checkMembership: " + ex + "\n");
        }
      }
      else {
        var filter = this.ds.GetTarget(catres, filterarc, true);
        if (filter && filter instanceof IRes) {
          var matches = this.filterFunctionForCatalog(catres);
          if (matches(res)) {
            this.addItemToCatalog(res, catres);
          }
          else {
            this.removeItemFromCatalog(res, catres);
          }
        }
      }
    }
  },


  /**
   * Updates the titles of any shortcuts in the project library pointing
   * to the given item.
   * @param itemres  the nsIRDFResource for the item
   */
  updateShortcutsForItem: function (itemres) {
    var titlearc = this.rdf.GetResource(Cx.NS_DC + "title");
    var sourcearc = this.rdf.GetResource(Cx.NS_DC + "source");
    var doctypearc = this.rdf.GetResource(Cx.NS_CX + "doctype");
    var shortcuts = this.ds.GetSources(sourcearc, itemres, true);
    var title = getRDFString(this.ds, itemres, titlearc);
    while (shortcuts.hasMoreElements()) {
      var shortcut = shortcuts.getNext().QueryInterface(
        Components.interfaces.nsIRDFResource);
      if (this.ds.hasArcOut(shortcut, doctypearc))
        setRDFString(this.ds, shortcut, titlearc, title);
    }
  },


  /**
   * @private
   */
  onBeginUpdateBatch: function (ds) {},


  /**
   * @private
   */
  onEndUpdateBatch: function (ds) {
    while (this._pendingCatalogs.length > 0) {
      var catalog = this._pendingCatalogs.shift();
      this._catalogs.push(catalog);
      this.updateCatalog(catalog);
    }
  },


  /**
   * @private
   */
  onAssert: function (ds, src, prop, tgt) {
    var IRes = Components.interfaces.nsIRDFResource;
    if (! (tgt instanceof IRes)) {
      if (prop.Value == Cx.NS_DC + "title") {
        var typearc = this.rdf.GetResource(Cx.NS_RDF + "type");
        var type = ds.GetTarget(src, typearc, true);
        if (type && type instanceof IRes) {
          type = type.QueryInterface(IRes);
          if (this.isBreakdownType(type))
            this.updateShortcutsForItem(src);
        }
      }
      return;
    }
    tgt = tgt.QueryInterface(IRes);

    if (prop.Value == Cx.NS_CX + "doctype" &&
        tgt.Value ==  Cx.NS_CX + "CatalogDocument") {
      if (this.indexOfCatalog(src) < 0) {
        this._pendingCatalogs.push(src);
      }
    }
    else if (prop.Value == Cx.NS_RDF + "type" && this.isBreakdownType(tgt)) {
      this.checkMembership(src);
    }
  },


  /**
   * @private
   */
  onChange: function (ds, src, prop, oldtgt, newtgt) {
    this.onUnassert(ds, src, prop, oldtgt);
    this.onAssert(ds, src, prop, newtgt);
  },


  /**
   * @private
   */
  onMove: function (ds, oldsrc, newsrc, prop, tgt) {
    this.onUnassert(ds, oldsrc, prop, tgt);
    this.onAssert(ds, newsrc, prop, tgt);
  },


  /**
   * @private
   */
  onUnassert: function (ds, src, prop, tgt) {
    var IRes = Components.interfaces.nsIRDFResource;
    if (! (tgt instanceof IRes))
      return;
    tgt = tgt.QueryInterface(IRes);

    if (prop.Value == Cx.NS_CX + "doctype" &&
        tgt.Value ==  Cx.NS_CX + "CatalogDocument") {
      var idx = this.indexOfCatalog(src);
      if (idx < 0)
        return;
      this._catalogs.splice(idx, 1);
    }
    else if (prop.Value == Cx.NS_RDF + "type" && this.isBreakdownType(tgt)) {
      this.checkMembership(src, tgt);
    }
  }
};
