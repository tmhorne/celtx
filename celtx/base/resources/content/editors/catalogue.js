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

function loaded () {
  gController.schemads = getRDFService().GetDataSourceBlocking(Cx.SCHEMA_URL);
  gController._frame = document.getElementById("sheet");
  gController._itemlist = document.getElementById("itemlist");
  gController._removebutton = document.getElementById("removebutton");
  gController._searchbox = document.getElementById("searchbox");
}


function getController () {
  return gController;
}


function getBrowser () {
  return gController._frame;
}


function getPPBrowser () {
  return getBrowser();
}

function getNavToolbox () {
  if ("navtoolbox" in gController._activeController)
    return gController._activeController.navtoolbox;
  return getPPBrowser();
}

function getWebNavigation () {
  var browser = getBrowser();
  return browser ? browser.webNavigation : null;
}


/**
 * This restores the selection when the sort column changes.
 */
var gTreeSelectionPreserver = {
  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIXULTreeBuilderObserver))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  _tree: null,


  init: function (tree) {
    if (this._tree)
      this.shutdown();

    this._tree = tree;
    tree.builderView.addObserver(this);
  },


  shutdown: function () {
    if (! this._tree)
      return;

    this._tree.builderView.removeObserver(this);
    this._tree = null;
  },


  onCycleHeader: function (colID, element) {
    gController.cacheSelection();
    setTimeout(function () {
      gController.restoreSelection();
    }, 0);
  },


  canDrop: function (row, orientation) { return false; },
  onDrop: function (row, orientation) {},
  onToggleOpenState: function (row) {},
  onSelectionChanged: function () {},
  onCycleCell: function (row, colID) {},
  onPerformAction: function (action) {},
  onPerformActionOnRow: function (action, row) {},
  onPerformActionOnCell: function (action, row, colID) {}
  
};


var gController = {
  inPrintPreview: false,


  /*
  _suppressSelectEvents getter: function () {
    return this.__suppressSelectEvents;
  },



  _suppressSelectEvents setter: function (val) {
    dump("--- _suppressSelectEvents = " + val + "\n");
    this.__suppressSelectEvents = val;
    return val;
  },
  */


  modified getter: function () {
    if (this._activeController)
      return this._activeController.modified;
    return false;
  },


  /**
   * True if the catalog is filtered (including the master catalog)
   * @type boolean
   */
  isFiltered getter: function () {
    var filterarc = getRDFService().GetResource(Cx.NS_CX + "filter");
    return this.project.ds.hasArcOut(this.docres, filterarc);
  },


  /**
   * Adjust which columns are visible according to the filter used. This will
   * also adjust the bindings used in the list, since some of them have an
   * arc URI that is determined by the project ID.
   * @param filter  the filter nsIRDFResource
   * @private
   */
  adjustColumns: function (filter) {
    // The default state is for unfiltered and master catalogs
    if (! filter || filter.Value == "celtx:filter:all")
      return;

    var types = (new RDFSeq(this.project.ds, filter)).toArray();
    if (types.length == 0 || types.length > 1)
      return;

    // Hide the category column, since it's redundant for single-category
    document.getElementById("category_col").hidden = true;

    var IRes = Components.interfaces.nsIRDFResource;
    var formtype = this.formNameForType(types[0].QueryInterface(IRes));

    var phoneuri = this.customPropertyURI("contact-phone", formtype);
    var celluri = this.customPropertyURI("contact-cell", formtype);
    var emailuri = this.customPropertyURI("contact-email", formtype);
    var fullnameuri = this.customPropertyURI("full-name", formtype);
    var princfuncuri = this.customPropertyURI("princ_func", formtype);
    var jobtitleuri = this.customPropertyURI("crewJobTitle", formtype);
    var jobdepturi = this.customPropertyURI("crewDepartment", formtype);
    var addressuri = this.customPropertyURI("address", formtype);
    var contacturi = this.customPropertyURI("contact-name", formtype);
    var costuri = this.customPropertyURI("cost", formtype);
    var wornbyuri = this.customPropertyURI("character", formtype);
    var altnameuri = this.customPropertyURI("alter-name", formtype);

    var fields = [
      {
        column: "desc_col",
        usedBy: { generic: true, prop: true, scene: true, wardrobe: true}
      },
      {
        column: "phone_col",
        binding: "phone_pred",
        uri: phoneuri,
        usedBy: { actor: true, crew: true, location: true }
      },
      {
        column: "cell_col",
        binding: "cell_pred",
        uri: celluri,
        usedBy: { actor: true, crew: true, location: false }
      },
      {
        column: "email_col",
        binding: "email_pred",
        uri: emailuri,
        usedBy: { actor: true, crew: true, location: false }
      },
      {
        column: "fullname_col",
        binding: "fullname_pred",
        uri: fullnameuri,
        usedBy: { character: true }
      },
      {
        column: "princfunc_col",
        binding: "princfunc_pred",
        uri: princfuncuri,
        usedBy: { character: true }
      },
      {
        column: "actor_col",
        usedBy: { character: true }
      },
      {
        column: "jobtitle_col",
        binding: "jobtitle_pred",
        uri: jobtitleuri,
        usedBy: { crew: true }
      },
      {
        column: "jobdept_col",
        binding: "jobdept_pred",
        uri: jobdepturi,
        usedBy: { crew: true }
      },
      {
        column: "address_col",
        binding: "address_pred",
        uri: addressuri,
        usedBy: { location: true }
      },
      {
        column: "contact_col",
        binding: "contact_pred",
        uri: contacturi,
        usedBy: { location: true }
      },
      {
        column: "cost_col",
        binding: "cost_pred",
        uri: costuri,
        usedBy: { prop: true }
      },
      {
        column: "wornby_col",
        binding: "wornby_pred",
        uri: wornbyuri,
        usedBy: { wardrobe: true }
      },
      {
        column: "altname_col",
        binding: "altname_pred",
        uri: altnameuri,
        usedBy: { scene: true }
      }
    ];


    for (var i = 0; i < fields.length; ++i) {
      var column = document.getElementById(fields[i].column);
      if (fields[i].usedBy[formtype]) {
        column.hidden = false;
        if (fields[i].binding) {
          var binding = document.getElementById(fields[i].binding)
          var mediabinding = document.getElementById(
            fields[i].binding + "_media");
          binding.setAttribute("predicate", fields[i].uri);
          mediabinding.setAttribute("predicate", fields[i].uri);
        }
      }
      else {
        column.hidden = true;
      }
    }
  },


  /**
   * Creates an RDF predicate based on a field name and form type.
   * @param name  a field name
   * @param formname  the form type as a string
   * @see #formNameForType
   * @type string
   * @return an RDF predicate corresponding to the field name
   */
  customPropertyURI: function (name, formname) {
    return this.project.res.Value + '/NS/' + formname + '-' + name;
  },


  open: function open (project, docres) {
    this.project = project;
    this.docres = docres;

    // To maintain the current selection, we need to add an observer
    project.ds.AddObserver(this);

    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var filterarc = rdfsvc.GetResource(Cx.NS_CX + "filter");
    var filter = project.ds.GetTarget(docres, filterarc, true);
    if (filter && filter instanceof IRes)
      filter = filter.QueryInterface(IRes);
    else
      filter = null;

    this.filter = filter;
    this.adjustColumns(filter);

    var membersarc = rdfsvc.GetResource(Cx.NS_CX + "members");
    var members = project.ds.GetTarget(docres, membersarc, true);
    if (! (members && members instanceof IRes)) {
      // This will be the case for manual catalogs
      members = rdfsvc.GetAnonymousResource();
      project.ds.Assert(docres, membersarc, members, true);
    }
    members = members.QueryInterface(IRes);
    this.members = members;

    // Create the search filter datasource: We keep a separate, in memory
    // data source to mark individual items with a cx:marked="true" statement
    // if they match the search text.
    this.markedds = getInMemoryDataSource();
    this.updateSearchFilter();

    this._itemlist.database.AddDataSource(this.markedds);
    this._itemlist.database.AddDataSource(this.project.ds);
    this._itemlist.setAttribute("ref", members.Value);

    // This acts like an additional open parameter, like the web panel uses
    var selectedarc = rdfsvc.GetResource(Cx.NS_CX + "selected");
    var selitem = project.ds.GetTarget(docres, selectedarc, true);
    if (selitem && selitem instanceof IRes) {
      clearRDFObject(project.ds, docres, selectedarc);
      selitem = selitem.QueryInterface(IRes);
      var self = this;
      setTimeout(function () { self.selectItem(selitem); }, 0);
    }
    else
      setTimeout("gController.selectFirstItem();", 0);

    gTreeSelectionPreserver.init(this._itemlist);
  },


  close: function close () {
    gTreeSelectionPreserver.shutdown();
    this.project.ds.RemoveObserver(this);
    this._itemlist.database.RemoveDataSource(this.markedds);
    this._itemlist.database.RemoveDataSource(this.project.ds);
  },


  focus: function focus () {
    this.focused = true;
    if (this._activeController)
      this._activeController.focus();
  },


  blur: function blur () {
    if (this._activeController) {
      this._activeController.blur();
      if (this._activeController.modified) {
        this._activeController.save();
        this.project.isModified = true;
      }
    }
    this.focused = false;
  },


  save: function save () {
    if (this._activeController)
      this._activeController.save();
  },


  commands: {
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);
    top.goUpdateCommand("cmd-print");
    top.goUpdateCommand("cmd-print-preview");
  },


  supportsCommand: function supportsCommand (cmd) {
    return this.commands[cmd] == 1;
  },


  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
        return true;
      case "cmd-print":
        return this._activeController;
      case "cmd-print-preview":
        return this._activeController && ! this.inPrintPreview;
      return false;
    }
  },


  doCommand: function doCommand (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        this._activeController.print();
        break;
      case "cmd-print-preview":
        this._activeController.print(true, onEnterPrintPreview,
          onExitPrintPreview);
        break;
    }
  },


  searchFilterChanged: function () {
    this.cacheSelection();
    this.updateSearchFilter();
    this.restoreSelection();
  },


  /**
   * Update the filtered datasource to reflect the current search text.
   * This can also be used to update the status of a single item only.
   * @param aItem  an item to update (optional), if null then all items
   *               are updated
   */
  updateSearchFilter: function (aItem) {
    var rdfsvc = getRDFService();
    var ds = this.project.ds;
    var schemads = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var descarc = rdfsvc.GetResource(Cx.NS_DC + "description");
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var labelarc = rdfsvc.GetResource(Cx.NS_RDFS + "label");
    var tagsarc = rdfsvc.GetResource(Cx.NS_CX + "tags");
    var markedarc = rdfsvc.GetResource(Cx.NS_CX + "marked");
    var acceptfn = function (item) { return true; };
    if (this._searchbox.value) {
      var searchtext = this._searchbox.value.toLowerCase();;
      var basefn = function (item) {
        var title = getRDFString(ds, item, titlearc);
        if (title && title.toLowerCase().indexOf(searchtext) >= 0)
          return true;
        var desc = getRDFString(ds, item, descarc);
        if (desc && desc.toLowerCase().indexOf(searchtext) >= 0)
          return true;
        var tags = getRDFString(ds, item, tagsarc);
        if (tags && tags.toLowerCase().indexOf(searchtext) >= 0)
          return true;
        var catres = ds.GetTarget(item, typearc, true);
        catres = catres.QueryInterface(Components.interfaces.nsIRDFResource);
        var category = getRDFString(schemads, catres, labelarc);
        if (category && category.toLowerCase().indexOf(searchtext) >= 0)
          return true;
        return false;
      };
      // TODO: Create category-specific accept functions that incorporate
      // basefn, so we can test for values in category-specific columns.
      acceptfn = basefn;
    }

    this._suppressSelectEvents = true;
    this.markedds.beginUpdateBatch();
    var members = null;
    if (aItem)
      members = [ aItem ];
    else
      members = (new RDFSeq(ds, this.members)).toArray();
    for (var i = 0; i < members.length; ++i) {
      var item = members[i].QueryInterface(
        Components.interfaces.nsIRDFResource);
      if (acceptfn(item))
        setRDFString(this.markedds, item, markedarc, "true");
      else
        clearRDFObject(this.markedds, item, markedarc);
    }
    this.markedds.endUpdateBatch();
    this._suppressSelectEvents = false;
  },


  itemPopupShowing: function () {
    var createcatalog = document.getElementById("ctx_createcatalog");
    var remove = document.getElementById("ctx_remove");
    var noSelection = this._itemlist.view.selection.count == 0;
    if (noSelection) {
      createcatalog.setAttribute("disabled", "true");
      remove.setAttribute("disabled", "true");
    }
    else {
      createcatalog.removeAttribute("disabled");
      remove.removeAttribute("disabled");
    }
  },


  selectFirstItem: function () {
    if (this._suppressSelectEvents) {
      dump("*** selectFirstItem: Why are select events suppressed?\n");
      this._suppressSelectEvents = false;
    }
    if (this._itemlist.view.rowCount > 0)
      this._itemlist.view.selection.select(0);
    /* TODO:
    else if (this.isFiltered)
      this.show_filtered_blank_state();
    else
      this.show_manual_blank_state();
    */
  },


  selectItem: function (itemres) {
    var idx = this._itemlist.view.getIndexOfResource(itemres);
    if (idx >= 0) {
      this._itemlist.treeBoxObject.ensureRowIsVisible(idx);
      this._itemlist.view.selection.select(idx);
    }
  },


  openFormForSelectedItem: function (event) {
    if (event) {
      if (event.target.nodeName != "treechildren")
        return;
    }
    var sel = this._itemlist.view.selection;
    if (sel.count == 1) {
      var itemres = this._itemlist.view.getResourceAtIndex(sel.currentIndex);
      top.gFrameLoader.loadDocument(itemres);
    }
  },


  onItemDrag: function (event) {
    if (event.target.nodeName != "treechildren")
      return;
    nsDragAndDrop.startDrag(event, this);
  },


  /**
   * Drag event handler for the item list.
   *
   * @param event  a drag event
   */
  onDragStart: function (aEvent, aXferData, aDragAction) {
    var sel = this._itemlist.view.selection;
    if (sel.count == 0)
      return;

    var dataset = new TransferDataSet();
    var projid = this.project.id;
    for (var i = 0; i < sel.getRangeCount(); ++i) {
      var min = {};
      var max = {};
      sel.getRangeAt(i, min, max);
      for (var j = min.value; j <= max.value; ++j) {
        var res = this._itemlist.view.getResourceAtIndex(j);
        var data = new TransferData();
        data.addDataForFlavour("moz/rdfitem", res.Value + "\n" + projid);
        dataset.push(data);
      }
    }
    aXferData.data = dataset;
  },


  cacheSelection: function () {
    if (this._itemlist.view.selection.count == 1) {
      res = this._itemlist.view.getResourceAtIndex(
        this._itemlist.view.selection.currentIndex);
      this._cachedSelection = res.Value;
    }
    else
      this._cachedSelection = null;

    this._suppressSelectEvents = true;
  },


  restoreSelection: function () {
    if (this._cachedSelection) {
      var itemlist = this._itemlist;
      var res = getRDFService().GetResource(this._cachedSelection);
      var self = this;
      var restore = function () {
        // The selection may have changed as a result of creating a new item,
        // so we allow the "restore" select event to fire.
        self._suppressSelectEvents = false;
        var idx = itemlist.view.getIndexOfResource(res);
        if (idx >= 0)
          itemlist.view.selection.select(idx);
        else
          itemlist.view.selection.clearSelection();
        self._cachedSelection = null;
      };
      setTimeout(restore, 0);
    }
  },


  /**
   * How deep we are nested by a batch update.
   * @see #onBeginUpdateBatch
   * @see #onEndUpdateBatch
   * @private
   */
  _batchNestLevel: 0,


  /**
   * Implementation of nsIRDFObserver method. Caches the currently
   * selected item, to be restored after an update is over.
   * @param ds  an nsIRDFDataSource
   */
  onBeginUpdateBatch: function (ds) {
    if (this._batchNestLevel++ > 0)
      return;
    this.cacheSelection();
  },


  /**
   * Implementation of nsIRDFObserver method. Restores the cached
   * selected item.
   * @param ds  an nsIRDFDataSource
   */
  onEndUpdateBatch: function (ds) {
    if (--this._batchNestLevel > 0)
      return;

    this._batchNestLevel = 0;

    this.updateSearchFilter();
    this.restoreSelection();
  },


  /**
   * Implementation of nsIRDFObserver method. Does nothing.
   */
  onAssert: function (ds, src, prop, tgt) {},


  /**
   * Implementation of nsIRDFObserver method. Does nothing.
   */
  onUnassert: function (ds, src, prop, tgt) {},


  /**
   * Implementation of nsIRDFObserver method. Does nothing.
   */
  onChange: function (ds, src, prop, oldtgt, newtgt) {},


  /**
   * Implementation of nsIRDFObserver method. Does nothing.
   */
  onMove: function (ds, oldsrc, newsrc, prop, tgt) {},


  /**
   * Determines the form name for a given item type. This is used for
   * determining which XHTML form to use and how to form the URI for
   * custom form properties.
   * @param type  the nsIRDFResource for the item type
   * @type string
   * @return the name of the form for the item type
   */
  formNameForType: function (type) {
    switch (type.Value) {
      case Cx.NS_CX + "Actor":    return "actor";
      case Cx.NS_CX + "Cast":     return "character";
      case Cx.NS_CX + "Crew":     return "crew";
      case Cx.NS_CX + "Location": return "location";
      case Cx.NS_CX + "Props":    return "prop";
      case Cx.NS_CX + "SceneDetails":
      case Cx.NS_CX + "Scene":    return "scene";
      case Cx.NS_CX + "Wardrobe": return "wardrobe";
      default:                    return "generic";
    }
  },


  itemSelected: function itemSelected (event) {
    if (this._suppressSelectEvents)
      return;

    setTimeout(function () { gController.updateCommands(); }, 0);

    var res = null;

    if (this._itemlist.view.selection.count == 1) {
      res = this._itemlist.view.getResourceAtIndex(
        this._itemlist.view.selection.currentIndex);
    }

    if (this._activeController) {
      if (res && res.Value == this._activeController.res)
        return;

      if (this._activeController.modified) {
        this.project.isModified = true;
        this._activeController.save();
      }
      this._activeController.close();
      this._activeController = null;
    }

    this._frame.setAttribute("src", "about:blank");
    if (! res) {
      document.getElementById("removebutton").disabled = true;
      return;
    }

    document.getElementById("removebutton").disabled = false;

    var rdfsvc = getRDFService();
    var rdftypearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var rdftype = this.project.ds.GetTarget(res, rdftypearc, true);
    if (! rdftype)
      throw "itemSelected: Resource lacks an RDF type";
    rdftype = rdftype.QueryInterface(Components.interfaces.nsIRDFResource);

    setDefaultCategory(rdftype.Value);

    var type = this.formNameForType(rdftype);
    this._frame.setAttribute("formtype", type);
    this._activeController = new FormController(type);
    this._activeController.open(this.project, res);
    window.controllers.appendController(this._activeController);
    if (this.focused)
      this._activeController.focus();
    this._frame.init();
    // Wait for callback to sheetReady()
  },


  // Called from the datasheet.xml frame
  sheetReady: function sheetReady () {
    if (! this._activeController) {
      dump("*** ready: No active controller set\n");
      return;
    }
    if (this._activeController.formName == "generic") {
      var rdfsvc = getRDFService();
      var schemads = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
      var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
      var labelarc = rdfsvc.GetResource(Cx.NS_RDFS + "label");
      var itemres = this._activeController.res.resource(rdfsvc);
      var type = this.project.ds.GetTarget(itemres, typearc, true);
      type = type.QueryInterface(Components.interfaces.nsIRDFResource);
      var typename = getRDFString(schemads, type, labelarc);
      var typestr = typename + gApp.getText("Colon") + " ";

      var doc = this._frame.contentDocument;
      var typeSpan = doc.getElementById("formTypeSpan");
      typeSpan.replaceChild(doc.createTextNode(typestr), typeSpan.firstChild);
    }
    this._activeController.attach(this._frame);
    this._activeController.populate();
  },


  createItem: function () {
    var config = {
      department: this._defaultCategory,
      title: "",
      accepted: false
    };
    var singletype = null;
    if (this.filter && this.filter.Value != "celtx:filter:all") {
      var types = new RDFSeq(this.project.ds, this.filter);
      if (types.length == 1) {
        singletype = types.get(0).QueryInterface(
          Components.interfaces.nsIRDFResource);
      }
    }

    if (singletype) {
      config.department = singletype.Value;
      var ps = getPromptService();
      var title = { value: "" };
      var checked = { value: false };
      config.accepted = ps.prompt(window, gApp.getText("CreateItem"),
        gApp.getText("ItemNameMsg"), title, null, checked);
      if (config.accepted) {
        if (title.value.match(/\S/))
          config.title = title.value;
        else
          config.accepted = false;
      }
    }
    else {
      openDialog(Cx.CONTENT_PATH + "editors/catadditem.xul", "_blank",
        Cx.MODAL_DIALOG_FLAGS, config);
    }

    if (! config.accepted)
      return null;

    var rdfsvc = getRDFService();
    var rdftypearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var deptres = rdfsvc.GetResource(config.department);

    this.project.ds.beginUpdateBatch();
    var itemres = rdfsvc.GetResource(this.project.mintURI());
    this.project.ds.Assert(itemres, rdftypearc, deptres, true);
    setRDFString(this.project.ds, itemres, titlearc, config.title);
    this.project.ds.endUpdateBatch();

    this.project.isModified = true;

    return itemres;
  },


  cmdCreateItem: function cmdCreateItem (event) {
    if (event.target.nodeName == "menuitem")
      setDefaultCategory(event.target.value);

    this.project.ds.beginUpdateBatch();

    var itemres = this.createItem();
    if (! itemres) {
      this.project.ds.endUpdateBatch();
      return;
    }
    
    if (! this.isFiltered)
      top.gCatalogManager.addItemToCatalog(itemres, this.docres);

    // Trick the restore selection into selecting the new item
    // this._cachedSelection = itemres.Value;
    this._cachedSelection = null;

    this.project.ds.endUpdateBatch();

    var self = this;
    setTimeout(function () { self.selectItem(itemres); }, 0);
  },


  cmdRemoveItem: function cmdRemoveItem () {
    var sel = this._itemlist.view.selection;

    if (sel.count == 0)
      return;

    var oldindex = sel.currentIndex;

    var rdfsvc = getRDFService();
    var ps = getPromptService();
    var dlgTitle = gApp.getText("DeleteItem");
    var dlgMsg = null;
    if (sel.count == 1) {
      var itemres = this._itemlist.view.getResourceAtIndex(sel.currentIndex);
      var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
      var title = getRDFString(this.project.ds, itemres, titlearc);
      dlgMsg = gApp.getText("DeleteItemPrompt", [ title ]);
    }
    else {
      dlgMsg = gApp.getText("DeleteMultipleItemsPrompt");
    }
    if (! ps.confirm(window, dlgTitle, dlgMsg))
      return;

    if (this.isFiltered) {
      this.project.ds.beginUpdateBatch();
      try {
        for (var i = 0; i < sel.getRangeCount(); ++i) {
          var min = {};
          var max = {};
          var range = sel.getRangeAt(i, min, max);
          for (var j = min.value; j <= max.value; ++j) {
            var itemres = this._itemlist.view.getResourceAtIndex(j);
            top.removeBreakdownItem(itemres);
          }
        }
      }
      catch (ex) {
        dump("*** cmdRemoveItem: " + ex + "\n");
      }
      this.project.ds.endUpdateBatch();
    }
    else {
      for (var i = 0; i < sel.getRangeCount(); ++i) {
        var min = {};
        var max = {};
        var range = sel.getRangeAt(i, min, max);
        this.project.ds.beginUpdateBatch();
        try {
          for (var j = min.value; j <= max.value; ++j) {
            var itemres = this._itemlist.view.getResourceAtIndex(j);
            top.gCatalogManager.removeItemFromCatalog(itemres, this.docres);
          }
        }
        catch (ex) {
          dump("*** cmdRemoveItem: " + ex + "\n");
        }
        this.project.ds.endUpdateBatch();
      }
    }

    var tree = this._itemlist;
    function adjustSelection () {
      if (tree.view.rowCount > oldindex)
        tree.view.selection.select(oldindex);
      else if (tree.view.rowCount > 0)
        tree.view.selection.select(tree.view.rowCount - 1);
    }
    setTimeout(adjustSelection, 0);
  },


  cmdExportList: function () {
    var rdfsvc = getRDFService();
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var catname = getRDFString(this.project.ds, this.docres, titlearc);
    var fp = getFilePicker();
    fp.init(window, gApp.getText("ExportList"), fp.modeSave);
    fp.appendFilter(gApp.getText("CSV"), "*.csv");
    fp.appendFilters(fp.filterText);
    fp.defaultExtension = "csv";
    fp.defaultString = catname + ".csv";
    if (fp.show() == fp.returnCancel)
      return;

    var columns = [];
    for (var i = 0; i < this._itemlist.columns.count; ++i) {
      var col = this._itemlist.columns.getColumnAt(i);
      if (! col.element.hidden)
        columns.push(col);
    }

    var str = "";
    for (var i = 0; i < columns.length; ++i) {
      var title = columns[i].element.getAttribute("label").replace(/"/g, '""');
      var text = '"' + title + '"';
      if (i != 0)
        str += ",";
      str += text;
    }
    str += "\n";

    var view = this._itemlist.view;
    for (var i = 0; i < view.rowCount; ++i) {
      for (var j = 0; j < columns.length; ++j) {
        var text;
        if (columns[j].type == columns[j].TYPE_TEXT)
          text = '"' + view.getCellText(i, columns[j])
            .replace(/"/g, '""') + '"';
        else if (columns[j].type == columns[j].TYPE_CHECKBOX)
          text = view.getCellValue(i, columns[j]) == "true" ? "Y" : "N";
  
        if (j == 0)
          str += text;
        else
          str += "," + text;
      }
      str += "\n";
    }
    writeFile(str, fp.file);
  },


  createCatalogFromSelection: function () {
    var items = [];
    var sel = this._itemlist.view.selection;
    for (var i = 0; i < sel.getRangeCount(); ++i) {
      var min = {};
      var max = {};
      var range = sel.getRangeAt(i, min, max);
      for (var j = min.value; j <= max.value; ++j) {
        items.push(this._itemlist.view.getResourceAtIndex(j));
      }
    }
    // Should never happen, but just in case...
    if (items.length == 0)
      return;

    var dlgTitle = gApp.getText("ItemNameTitle");
    var dlgMsg = gApp.getText("ItemNameMsg");
    var title = { value: "" };
    var check = { value: false };
    var ps = getPromptService();
    if (! ps.prompt(window, dlgTitle, dlgMsg, title, null, check))
      return;

    if (! title.value)
      return;

    var rdfsvc = getRDFService();
    var doctype = rdfsvc.GetResource(Cx.NS_CX + "CatalogDocument");
    this.project.ds.beginUpdateBatch();
    try {
      var docres = this.project.createDocument(title.value, doctype);
      for (var i = 0; i < items.length; ++i)
        top.gCatalogManager.addItemToCatalog(items[i], docres);
    }
    catch (ex) {
      dump("*** createCatalogFromSelection: " + ex + "\n");
    }
    this.project.ds.endUpdateBatch();
  }
};


function setDefaultCategory (category) {
  gController._defaultCategory = category;
}


function onEnterPrintPreview () {
  // Create the print preview toolbar
  /*
  var printPreviewTB = document.createElementNS(XUL_NS, "toolbar");
  printPreviewTB.setAttribute("printpreview", true);
  printPreviewTB.setAttribute("id", "print-preview-toolbar");
  getBrowser().parentNode.insertBefore(printPreviewTB, getBrowser());
  */

  // Hide everything surrounding the browser/preview frame
  document.getElementById("catalogheader").collapsed = true;

  gController.inPrintPreview = true;
  gController.updateCommands();
  getBrowser().contentWindow.focus();
}


function onExitPrintPreview () {
  // Remove the print preview toolbar
  /*
  var printPreviewTB = document.getElementById("print-preview-toolbar");
  if (printPreviewTB)
    printPreviewTB.parentNode.removeChild(printPreviewTB);
  */

  // Show everything surrounding the browser/preview frame
  document.getElementById("catalogheader").collapsed = false;

  gController.inPrintPreview = false;
  gController.updateCommands();
}
