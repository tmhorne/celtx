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

var gDeptOrder = [
  Cx.NS_CX + "Location",
  Cx.NS_CX + "Cast",
  Cx.NS_CX + "Actor",
  Cx.NS_CX + "Crew",
  Cx.NS_CX + "Extras",
  Cx.NS_CX + "Hair",
  Cx.NS_CX + "Makeup",
  Cx.NS_CX + "Wardrobe",
  Cx.NS_CX + "Props",
  Cx.NS_CX + "Set",
  Cx.NS_CX + "SetDressing",
  Cx.NS_CX + "Painting",
  Cx.NS_CX + "Construction",
  Cx.NS_CX + "Greenery",
  Cx.NS_CX + "Camera",
  Cx.NS_CX + "Lights",
  Cx.NS_CX + "Electrics",
  Cx.NS_CX + "Stunts",
  Cx.NS_CX + "Vehicles",
  Cx.NS_CX + "Weapons",
  Cx.NS_CX + "SpecialEquipment",
  Cx.NS_CX + "AdditionalLabour",
  Cx.NS_CX + "Security",
  Cx.NS_CX + "AnimalHandler",
  Cx.NS_CX + "Animals",
  Cx.NS_CX + "Livestock",
  Cx.NS_CX + "Storyboard",
  Cx.NS_CX + "Music",
  Cx.NS_CX + "Sound",
  Cx.NS_CX + "SoundFX",
  Cx.NS_CX + "MechFX",
  Cx.NS_CX + "OpticalFX",
  Cx.NS_CX + "SpecialFX",
  Cx.NS_CX + "CGI",
  Cx.NS_CX + "ProductionNotes",
  Cx.NS_CX + "Misc"
];


var gReportController = {
  __proto__: EditorController.prototype,


  kScenesURL: "http://celtx.com/selection/scenes",
  kDeptsURL: "http://celtx.com/selection/departments",
  kItemsURL: "http://celtx.com/selection/items",

  selections: null,
  sceneAllSelected: false,
  selectEventsSuppressed: false,
  _loaded: false,
  _focused: false,
  _changedScenes: [],


  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIRDFObserver))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },


  get mediachecked () {
    return this.mediacheckbox.checked;
  },


  loaded: function loaded () {
    this.reporttitle    = document.getElementById("reporttitle");
    this.browser        = document.getElementById("reportframe");
    this.columnbox      = document.getElementById("columnbox");
    this.columndeck     = document.getElementById("columndeck");
    this.scenelist      = document.getElementById("scene-listbox");
    this.deptlist       = document.getElementById("dept-listbox");
    this.itemlist       = document.getElementById("item-listbox");
    this.charlist       = document.getElementById("charlist");
    this.elemlist       = document.getElementById("elemlist");
    this.mediacheckbox  = document.getElementById("media-checkbox");
  },


  commands: {
    "cmd-export-report": 1,
    "cmd-report-changed": 1,
    "cmd-report-scene-changed": 1,
    "cmd-report-dept-changed": 1,
    "cmd-report-item-changed": 1,
    "cmd-report-speaker-changed": 1,
    "cmd-report-element-changed": 1,
    "cmd-report-toggle-media": 1,
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1
  },


  supportsCommand: function supportsCommand (cmd) {
    return this.commands[cmd] == 1;
  },


  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
      case "cmd-print":
      case "cmd-print-preview":
        return true;
      default:
        return ! this.inPrintPreview;
    }
  },


  doCommand: function doCommand (cmd) {
    if (! this._loaded)
      return;

    switch (cmd ) {
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        gApp.setPrintMargins(0.25, 0, 0.5, 0);
        this.print();
        break;
      case "cmd-print-preview":
        gApp.setPrintMargins(0.25, 0, 0.5, 0);
        PrintUtils.printPreview(report_onEnterPrintPreview,
          report_onExitPrintPreview);
        break;
      case "cmd-export-report":
        this.cmdExportReport();
        break;
      case "cmd-report-scene-changed":
        this.cmdSceneSelectionChanged();
        break;
      case "cmd-report-dept-changed":
        this.cmdDeptSelectionChanged();
        break;
      case "cmd-report-item-changed":
        this.cmdItemSelectionChanged();
        break;
      case "cmd-report-element-changed":
      case "cmd-report-speaker-changed":
        if (! this.selectEventsSuppressed)
          this.cmdCreateScriptReport();
        break;
      case "cmd-report-toggle-media":
        this.cmdCreateBreakdown();
        break;
      case "cmd-report-changed":
        this.cmdChangeReport();
        break;
    }
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);
  },


  open: function open (project, docres) {
    this.project = project;
    this.docres = docres;
    this.outlineView = gController.outlineView;
    if (! this.outlineView)
      dump("*** gReportController.open: no outline view\n");

    this.reportFile = tempFile('xhtml');
    this.project.ds.AddObserver(this);
  },


  onScriptLoad: function onScriptLoad () {
    // Update the "Scenes" label to correspond to whatever is the
    // designated sceneheading format name.
    var scenelabel = document.getElementById("scenelabel");

    var rdfsvc = getRDFService();
    var schemads = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var elemarc = rdfsvc.GetResource(Cx.NS_CX + "element");

    var ps = getPrefService().getBranch("celtx.scripteditor."
      + gScriptController.mode + ".");
    var formats = ps.getCharPref("formats").split(",");
    for (var i = 0; i < formats.length; ++i) {
      var format = rdfsvc.GetResource(Cx.NS_CX + "Formats/" + formats[i]);
      if (getRDFString(schemads, format, elemarc) == "sceneheading") {
        scenelabel.value = getRDFString(schemads, format, titlearc);
        break;
      }
    }
  },


  generateData: function generateData () {
    var progressController = {
      owner: this,
      canceled: false,
      initialized: false,
      postprocessed: false,
      sceneCount: gScriptController.editor.sceneCount,
      curScene: 0,
      get progress () {
        var base = 0;
        if (this.initialized) base += 1;
        if (this.sceneCount > 0)
          base += Math.floor(98 * this.curScene / this.sceneCount);
        else
          base += 98;
        if (this.postprocessed)
          base += 1;
        return base;
      },
      get message () {
        return gApp.getText("GeneratingReportMsg");
      },
      get finished () {
        return this.postprocessed;
      },
      performNextTask: function () {
        try {
          if (! this.initialized) {
            this.owner.beginScriptTree();
            this.initialized = true;
            return true;
          }
          if (this.curScene < this.sceneCount) {
            this.owner.updateScriptTree(this.curScene);
            this.curScene += 1;
            return true;
          }
          if (! this.postprocessed) {
            this.owner.endScriptTree();
            this.postprocessed = true;
            return true;
          }
        }
        catch (ex) {
          this.stack = Components.stack;
          this.exception = ex;
          return false;
        }
      },
      abort: function () {
        this.canceled = true;
      }
    };
    window.openDialog(Cx.CONTENT_PATH + "progress.xul", "_blank",
                      Cx.MODAL_DIALOG_FLAGS, progressController);
    if (progressController.canceled)
      return;
    if (! progressController.finished) {
      var stack = progressController.stack;
      var ex = progressController.exception;
      var msg = gApp.getText("GenerateReportFailedMsg");
      celtxBugAlert(msg, stack, ex);
      return;
    }

    this.generateDataCallback();
  },


  generateDataCallback: function generateDataCallback () {
    this.outlineView.selectReportIndex(0);

    // Initialize the datasources
    var rdfsvc = getRDFService();
    var utils = getRDFContainerUtils();
    var ILit = Components.interfaces.nsIRDFLiteral;
    var IRes = Components.interfaces.nsIRDFResource;

    this.scenelist.database.AddDataSource(this.project.ds);
    var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");
    var scenes = this.project.ds.GetTarget(this.docres, scenesarc, true);
    if (scenes) {
      scenes = scenes.QueryInterface(IRes);
    }
    else {
      scenes = rdfsvc.GetAnonymousResource();
      this.project.ds.Assert(this.docres, scenesarc, scenes, true);
    }
    // Make sure it's decorated as an RDF sequence
    new RDFSeq(this.project.ds, scenes);
    this.scenelist.setAttribute("ref", scenes.Value);

    var allDS = this.createBogusAllDS();

    // The magical "ALL" scene
    var titleArc      = rdfsvc.GetResource(Cx.NS_DC + "title");
    var sortordArc    = rdfsvc.GetResource(Cx.NS_CX + "sortord");
    var allItemArc    = rdfsvc.GetResource(Cx.NS_CX + "allItem");
    var allScene = rdfsvc.GetResource("urn:celtx:scene:all");
    allDS.Assert(scenes, allItemArc, allScene, true);
    allDS.Assert(allScene, sortordArc, rdfsvc.GetLiteral("0"), true);
    allDS.Assert(allScene, titleArc, rdfsvc.GetLiteral("ALL"), true);

    // Selections (intermediate datasources)
    this.selections = getInMemoryDataSource();
    var sceneSeq = rdfsvc.GetResource(this.kScenesURL);
    this.scenes = utils.MakeSeq(this.selections, sceneSeq);
    // bd_win.depts is not a sequence; it uses cx:member instead
    this.depts = rdfsvc.GetResource(this.kDeptsURL);
    var itemSeq = rdfsvc.GetResource(this.kItemsURL);
    this.items = utils.MakeSeq(this.selections, itemSeq);

    // Scenes
    this.scenelist.database.allowNegativeAssertions = false;
    this.scenelist.database.AddDataSource(allDS);
    this.scenelist.builder.rebuild();

    // Departments
    this.deptlist.database.allowNegativeAssertions = false;
    this.deptlist.database.AddDataSource(allDS);
    this.deptlist.database.AddDataSource(this.project.ds);
    this.deptlist.builder.rebuild();

    // Items
    this.itemlist.database.allowNegativeAssertions = false;
    this.itemlist.database.AddDataSource(allDS);
    this.itemlist.database.AddDataSource(this.project.ds);
    this.itemlist.database.AddDataSource(this.selections);
    this.itemlist.builder.rebuild();

    // Speakers
    this.charlist.database.allowNegativeAssertions = false;
    this.charlist.database.AddDataSource(allDS);
    this.chards = this.createCharacterDS(this.scripttree);
    this.charlist.database.AddDataSource(this.chards);
    this.charlist.builder.rebuild();

    // Elements
    // this.elemlist.database.allowNegativeAssertions = false;
    // Prune the element list (remove Act and unused)
    var mode = this.scripttree.documentElement.getAttribute("scriptmode");
    var ps = getPrefService().getBranch("celtx.scripteditor." + mode + ".");
    var formats = ps.getCharPref("formats").split(/\s*,\s*/);
    var elemview = this.elemlist.view;
    var elemcontent = elemview.QueryInterface(
      Components.interfaces.nsITreeContentView);
    for (var i = 0; i < elemview.rowCount; ++i) {
      var elem = elemcontent.getItemAtIndex(i);
      if (elem.id == Cx.NS_CX + "Formats/Act") {
        elem.hidden = true;
        --i;
      }
      else {
        var found = false;
        for (var j = 0; j < formats.length; ++j) {
          if (elem.id == Cx.NS_CX + "Formats/" + formats[j]) {
            found = true;
            break;
          }
        }
        if (! found) {
          elem.hidden = true;
          --i;
        }
      }
    }

    this._loaded = true;

    this.selectEventsSuppressed = true;
    this.deptlist.view.selection.select(0);
    this.charlist.view.selection.select(0);
    this.elemlist.view.selection.select(0);
    this.itemlist.view.selection.select(0);
    this.columnbox.collapsed = false;
    this.columndeck.selectedIndex = 1;
    this.columndeck.flex = 1;
    this.mediacheckbox.collapsed = true;
    this.selectEventsSuppressed = false;
    this.scenelist.view.selection.select(0);
  },


  save: function save () {
    // Implementation-dependent mechanism: If closing is triggered by a
    // window close event, this will get called as part of saveAllFrames, so
    // that when this document gets restored the next time the project is
    // opened, it doesn't bork itself for lack of data. If the tab is closed
    // instead by clicking the tab close button, nothing gets saved.
    this.saved = true;
  },


  close: function close () {
    gScriptController.sceneTracker.removeObserver(this);
    this.project.ds.RemoveObserver(this);

    this.reportFile.remove(false);

    if (this.saved)
      return;
  },


  focus: function focus () {
    this._focused = true;
    this.browser.setAttribute("type", "content-primary");
    this.outlineView.showReportNav();
    if (! this._loaded) {
      this.generateData();
      gScriptController.sceneTracker.addObserver(this);
      return;
    }

    if (this._dirty) {
      this.refresh();
    }
    else if (this._changedScenes.length > 0) {
      this.updateChangedScenes();
    }

    // Refresh the report regardless, because breakdown may have changed, due
    // to adding, removing, or renaming.
    this.cmdChangeReport();
  },


  onAssert: function (ds, src, prop, tgt) {},
  onChange: function (ds, src, prop, oldtgt, newtgt) {},
  onMove: function (ds, oldsrc, newsrc, prop, tgt) {},
  onUnassert: function (ds, src, prop, tgt) {},


  onBeginUpdateBatch: function onBeginUpdateBatch (ds) {
    this.selectEventsSuppressed = true;
    this.cacheSelections();
  },


  onEndUpdateBatch: function onEndUpdateBatch (ds) {
    this.restoreSelections();
    this.selectEventsSuppressed = false;
  },


  cacheSelections: function cacheSelections () {
    // This is a quick and dirty implementation. We cache the rows
    // that are selected by row index rather than value. Insertions or
    // removals will result in an incorrect restore.
    var trees = [ this.scenelist, this.deptlist, this.itemlist,
      this.charlist, this.elemlist ];
    this._cachedSelections = {};
    for (var i = 0; i < trees.length; ++i) {
      var ranges = [];
      var sel = trees[i].view.selection;
      var count = sel.getRangeCount();
      for (var j = 0; j < count; ++j) {
        var min = { value: 0 };
        var max = { value: 0 };
        sel.getRangeAt(j, min, max);
        ranges.push([min.value, max.value]);
      }
      this._cachedSelections[trees[i].id] = ranges;
    }
  },


  restoreSelections: function restoreSelections () {
    var trees = [ this.scenelist, this.deptlist, this.itemlist,
      this.charlist, this.elemlist ];
    for (var i = 0; i < trees.length; ++i) {
      var ranges = this._cachedSelections[trees[i].id];
      var sel = trees[i].view.selection;
      sel.clearSelection();
      try {
        for (var j = 0; j < ranges.length; ++j) {
          sel.rangedSelect(ranges[j][0], ranges[j][1], true);
        }
      }
      catch (ex) {
        dump("*** restoreSelections: " + ex + "\n");
        sel.select(0);
      }
    }
  },


  // Observer method
  sceneListChanged: function sceneListChanged () {
    this._dirty = true;
  },


  sceneChanged: function sceneChanged (sceneres) {
    this.sceneContentChanged(sceneres);
  },


  // Observer method
  sceneContentChanged: function sceneContentChanged (sceneres) {
    var rdfsvc = getRDFService();
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
    var sceneid = getRDFString(this.project.ds, sceneres, sceneidarc);
    if (! sceneid) {
      dump("*** sceneContentChanged: no cx:sceneid on sceneres\n");
      return;
    }
    for (var i = 0; i < this._changedScenes.length; ++i) {
      if (this._changedScenes[i] == sceneid)
        return;
    }
    this._changedScenes.push(sceneid);
  },


  refresh: function refresh () {
    this._dirty = false;
    this._changedScenes = [];
  },


  updateChangedScenes: function updateChangedScenes () {
    while (this._changedScenes.length > 0) {
      var sceneid = this._changedScenes.shift();
      var idx = gScriptController.editor.scenePosition(sceneid);
      this.updateScriptTree(idx - 1);
    }
  },


  blur: function blur () {
    this._focused = false;
    if (this.inPrintPreview)
      PrintUtils.exitPrintPreview();
    this.browser.setAttribute("type", "content");
  },


  print: function print () {
    try {
      var webBrowserPrint = PrintUtils.getWebBrowserPrint();
      var printSettings = PrintUtils.getPrintSettings();
      printSettings.headerStrLeft   = "&D";
      printSettings.headerStrCenter = "&T";
      printSettings.headerStrRight  = "&PT";
      printSettings.footerStrLeft   = "";
      printSettings.footerStrCenter = "";
      printSettings.footerStrRight  = "";
      webBrowserPrint.print(printSettings, null);
    }
    catch (ex) {
      dump("*** scriptreport.print: " + ex + "\n");
    }
  },


  createBogusAllDS: function createBogusAllDS () {
    // The datasource providing "ALL" for scenes and departments
    var svc = getRDFService();
    var ds = getInMemoryDataSource();

    var typeArc       = svc.GetResource(Cx.NS_RDF + "type");
    var titleArc      = svc.GetResource(Cx.NS_DC + "title");
    var labelArc      = svc.GetResource(Cx.NS_RDFS + "label");
    var ordArc        = svc.GetResource(Cx.NS_CX + "ordinal");
    var sceneType     = svc.GetResource(Cx.NS_CX + "Scene");
    var memberArc     = svc.GetResource(Cx.NS_CX + "member");
    var breakdownType = svc.GetResource(Cx.NS_CX + "Breakdown");
    var castType      = svc.GetResource(Cx.NS_CX + "Cast");
    var formatType    = svc.GetResource(Cx.NS_CX + "Format");

    // The magical "ALL" scene
    var allScene = svc.GetResource("urn:celtx:scene:all");
    ds.Assert(allScene, typeArc, sceneType, true);
    ds.Assert(allScene, ordArc, svc.GetIntLiteral(0), true);
    ds.Assert(allScene, titleArc, svc.GetLiteral("ALL"), true);
    

    // The magical "ALL" department
    var allDept = svc.GetResource("urn:celtx:department:all");
    var markupURL = svc.GetResource(this.deptlist.ref);
    ds.Assert(allDept, typeArc, breakdownType, true);
    // This isn't how the rest are done, it's just a convenient work-around
    // since markupURL is a sequence and sequences don't merge well
    ds.Assert(markupURL, memberArc, allDept, true);
    ds.Assert(allDept, labelArc, svc.GetLiteral("0ALL"), true);

    // The magical "ALL" character
    var allChar = svc.GetResource("urn:celtx:speaker:all");
    ds.Assert(allChar, typeArc, castType, true);
    ds.Assert(allChar, titleArc, svc.GetLiteral("0ALL"), true);

    // The magical "ALL" item
    var allItem = svc.GetResource("urn:celtx:item:all");
    var scenes = svc.GetResource(this.kScenesURL);
    ds.Assert(scenes, memberArc, allItem, true);

    return ds;
  },


  createCharacterDS: function createCharacterDS (doc) {
    var rdfsvc = getRDFService();
    var ds = getInMemoryDataSource();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var casttype = rdfsvc.GetResource(Cx.NS_CX + "Cast");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");

    var xpath = new XPathEvaluator();
    var xset = xpath.evaluate("/script/scene/speech", doc, null, 0, null);
    var chars = {};
    var e = null;
    while (e = xset.iterateNext()) {
      var name = e.getAttribute("speaker");
      name = name.replace(/\s*\(.*\)\s*$/, "");
      if (name == "" || name in chars) continue;
      chars[name] = 1;
    }

    for (var char in chars) {
      var res = rdfsvc.GetAnonymousResource();
      ds.Assert(res, typearc, casttype, true);
      ds.Assert(res, titlearc, rdfsvc.GetLiteral(char), true);
    }
    return ds;
  },


  cmdSceneSelectionChanged: function cmdSceneSelectionChanged () {
    if (this.selectEventsSuppressed)
      return;
    var svc = getRDFService();
    // Clear the initial selection list
    while (this.scenes.GetCount() > 0)
      this.scenes.RemoveElementAt(this.scenes.GetCount(), true);
    // Repopulate it, checking for the "ALL" special case
    if (isTreeRowSelected(this.scenelist, 0)) {
      this.sceneAllSelected = true;
      // If ALL is selected, make it the only selection
      // scenelist.view.selection.selectEventsSupressed = true;
      this.selectEventsSuppressed = true;
      this.scenelist.view.selection.select(0);
      this.selectEventsSuppressed = false;
      // scenelist.view.selection.selectEventsSupressed = false;
      var count = this.scenelist.view.rowCount;
      for (var i = 1; i < count; ++i) {
        var res = this.scenelist.view.getResourceAtIndex(i);
        this.scenes.AppendElement(res);
      }
    }
    else {
      this.sceneAllSelected = false;
      var seliter = new TreeSelectionIterator(this.scenelist);
      while (seliter.hasMore()) {
        var res = this.scenelist.view.getResourceAtIndex(seliter.getNext());
        this.scenes.AppendElement(res);
      }
    }

    switch (this.outlineView.getSelectedReportIndex()) {
      case 0: // Dialog
      case 1: // Elements
      case 2: // Script with Notes
        this.cmdCreateScriptReport();
        break;
      case 3: // Scene Breakdown
      case 4: // Scene Breakdown with Description
        this.cmdDeptSelectionChanged();
        break;
    }
  },


  cmdDeptSelectionChanged: function cmdDeptSelectionChanged () {
    if (this.selectEventsSuppressed)
      return;
    var svc = getRDFService();
    var member = svc.GetResource(Cx.NS_CX + "member");
    // Check membership assertions, checking for the "ALL" special case
    if (isTreeRowSelected(this.deptlist, 0)) {
      // If ALL is selected, make it the only selection
      this.deptlist.view.selection.selectEventsSupressed = true;
      this.deptlist.view.selection.select(0);
      this.deptlist.view.selection.selectEventsSupressed = false;
      var count = this.deptlist.view.rowCount;
      for (var i = 1; i < count; ++i) {
        var res = this.deptlist.view.getResourceAtIndex(i);
        if (! this.selections.HasAssertion(this.depts, member, res, true))
          this.selections.Assert(this.depts, member, res, true);
      }
    }
    else {
      var count = this.deptlist.view.rowCount;
      for (var i = 1; i < count; i++) {
        var res = this.deptlist.view.getResourceAtIndex(i);
        if (isTreeRowSelected(this.deptlist, i)) {
          if (! this.selections.HasAssertion(this.depts, member, res, true))
            this.selections.Assert(this.depts, member, res, true);
        }
        else {
          if (this.selections.HasAssertion(this.depts, member, res, true))
            this.selections.Unassert(this.depts, member, res);
        }
      }
    }
    this.cmdItemSelectionChanged();
  },


  cmdItemSelectionChanged: function cmdItemSelectionChanged () {
    if (this.selectEventsSuppressed)
      return;
    var svc = getRDFService();
    // Clear the initial selection list
    while (this.items.GetCount() > 0)
      this.items.RemoveElementAt(this.items.GetCount(), true);
    // Repopulate it, counting no selection as "ALL"
    if (this.itemlist.view.selection.count == 0 ||
        this.itemlist.view.selection.isSelected(0)) {
      var count = this.itemlist.view.rowCount;
      for (var i = 0; i < count; ++i) {
        var res = this.itemlist.view.getResourceAtIndex(i);
        this.items.AppendElement(res);
      }
    }
    else {
      var seliter = new TreeSelectionIterator(this.itemlist);
      while (seliter.hasMore()) {
        var res = this.itemlist.view.getResourceAtIndex(seliter.getNext());
        this.items.AppendElement(res);
      }
    }
    try {
      this.cmdCreateBreakdown();
    }
    catch (ex) {
      dump("*** cmdCreateBreakdown: " + ex + "\n");
    }
  },


  cmdCreateScriptReport: function cmdCreateScriptReport () {
    this.reporttitle.value = this.outlineView.getSelectedReportName();
    var xslt = document.implementation.createDocument("", "", null);
    xslt.async = false;
    xslt.load(Cx.TRANSFORM_PATH + "script-report.xml");

    var proc = new XSLTProcessor();
    proc.importStylesheet(xslt);

    proc.setParameter(null, "show-dialog-numbers",
      gScriptController.scriptConfig.showDialogNumbers);

    // Determine the transformation parameters
    var svc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;

    var reportIndex = this.outlineView.getSelectedReportIndex();
    // Scene restrictions
    // Does not apply for Script with Notes
    if (reportIndex != 2 && ! this.sceneAllSelected) {
      var ds = this.project.ds;
      var sceneidarc = svc.GetResource(Cx.NS_CX + "sceneid");
      proc.setParameter(null, "limit-scenes", 1);
      var prefixLength = Cx.SCENE_PREFIX.length;
      var scenes = this.scenes.GetElements();
      var scenelist = "|"
        while (scenes.hasMoreElements()) {
          var scene = scenes.getNext().QueryInterface(IRes);
          var sceneid = getRDFString(ds, scene, sceneidarc);
          if (! sceneid) {
            dump("*** skipping scene res without scene id\n");
            continue;
          }
          scenelist += sceneid + "|";
        }
      proc.setParameter(null, "scenes", scenelist);
    }

    // Element/character restrictions
    var titleArc = svc.GetResource(Cx.NS_DC + "title");
    // Dialog report
    if (reportIndex == 0) {
      proc.setParameter(null, "show-dialog", 1);
      proc.setParameter(null, "show-character", 1);
      proc.setParameter(null, "show-parenthetical", 1);
      // Show Shot/Panel for A/V and Comic Book
      if (gScriptController.mode == "av" || gScriptController.mode == "comic")
        proc.setParameter(null, "show-shot", 1);
      if (this.charlist.view.selection.count > 0 &&
          ! isTreeRowSelected(this.charlist, 0)) {
        proc.setParameter(null, "limit-chars", 1);
        var charlist = "|";
        var charview = this.charlist.view;
        var sel = charview.selection;
        for (var i = 0; i < charview.rowCount; ++i) {
          if (sel.isSelected(i)) {
            var res = charview.getResourceAtIndex(i);
            var title = this.charlist.database.GetTarget(res, titleArc, true);
            title = title.QueryInterface(Components.interfaces.nsIRDFLiteral);
            charlist += title.Value + "|";
          }
        }
        proc.setParameter(null, "chars", charlist);
      }
    }
    else {
      var schemads = svc.GetDataSourceBlocking(Cx.SCHEMA_URL);
      var formatseq = svc.GetResource(Cx.NS_CX + "Formats");
      formatseq = (new RDFSeq(schemads, formatseq)).toArray();
      var elemarc = svc.GetResource(Cx.NS_CX + "element");
      var elems = {};
      for (var i = 0; i < formatseq.length; ++i) {
        var format = formatseq[i].QueryInterface(IRes);
        elems[format.Value] = getRDFString(schemads, format, elemarc);
      }
      elems[Cx.NS_CX + "Formats/Text"] = "text";
      // Script with Notes
      if (reportIndex != 2 &&
          this.elemlist.view.selection.count > 0 &&
          ! isTreeRowSelected(this.elemlist, 0)) {
        var elemview = this.elemlist.view;
        var sel = elemview.selection;
        var elemcontent = elemview.QueryInterface(
          Components.interfaces.nsITreeContentView);
        var elemrows = elemview.rowCount;
        for (var i = 1; i < elemrows; ++i) {
          var elem = elemcontent.getItemAtIndex(i);
          if (sel.isSelected(i)) {
            if (elems[elem.id])
              proc.setParameter(null, "show-" + elems[elem.id], 1);
          }
        }
      }
      else {
        for (var res in elems) {
          proc.setParameter(null, "show-" + elems[res], 1);
        }
      }
      // Script with Notes
      if (reportIndex == 2)
        proc.setParameter(null, "show-notes", 1);
    }

    var report = proc.transformToDocument(this.scripttree);
    // Prune empty scene headings
    /* tony: Was there a reason for doing this? Maybe so Dialog report would
             only show scenes with dialog? I don't think this is a good idea
             any more, and it messes with the Script with Notes report.
    const IHTMLPElem = Components.interfaces.nsIDOMHTMLParagraphElement;
    const IHTMLDivElem = Components.interfaces.nsIDOMHTMLDivElement;
    var para = report.documentElement.lastChild.firstChild;
    while (para) {
      var nextpara = para.nextSibling;
      while (nextpara && ! (nextpara instanceof IHTMLPElem)) {
        nextpara = nextpara.nextSibling;
      }
      if (para.className == "sceneheading") {
        if (! nextpara || nextpara.className == "sceneheading") {
          para.parentNode.removeChild(para);
        }
      }
      para = nextpara;
    }
    */
    // var reportFile = tempFile('html');
    serializeDOMtoFile(report, this.reportFile);
    this.browser.webNavigation.loadURI(fileToFileURL(this.reportFile),
      Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE,
      null, null, null);
  },


  cmdCreateBreakdown: function cmdCreateBreakdown () {
    this.reporttitle.value = this.outlineView.getSelectedReportName();
    try {
      this.createBreakdownImpl();
    }
    catch (ex) {
      celtxBugAlert(gApp.getText("UnknownErrorMsg"), Components.stack, ex);
    }
  },


  createBreakdownImpl: function () {
    if (this.scenes.GetCount() == 0)
      return;

    var usemedia = this.mediachecked;

    const IRes = Components.interfaces.nsIRDFResource;
    const ILit = Components.interfaces.nsIRDFLiteral;

    var svc = getRDFService();
    var ds = this.project.ds;
    var schema = svc.GetDataSourceBlocking(Cx.CONTENT_PATH + "schema.rdf");

    var typeArc = svc.GetResource(Cx.NS_RDF + "type");
    var deptArc = svc.GetResource(Cx.NS_CX + "department");
    var titleArc = svc.GetResource(Cx.NS_DC + "title");
    var descArc = svc.GetResource(Cx.NS_DC + "description");
    var labelArc = svc.GetResource(Cx.NS_RDFS + "label");
    var ordinalArc = svc.GetResource(Cx.NS_CX + "ordinal");
    var mediaArc = svc.GetResource(Cx.NS_CX + "media");
    var imgRsrc = svc.GetResource(Cx.NS_CX + "Image");
    var memberArc = svc.GetResource(Cx.NS_CX + "member");

    var title = this.scripttree.documentElement.getAttribute("title");
    var date = (new Date()).toLocaleDateString();
    var bddoc = document.implementation.createDocument("", "breakdown", null);
    var breakdown = bddoc.documentElement;
    breakdown.setAttribute("title", title);
    breakdown.setAttribute("date", date);

    var scenes = this.scenes.GetElements();
    while (scenes.hasMoreElements()) {
      var sceneres = scenes.getNext().QueryInterface(IRes);
      var sceneOrdinal = getRDFString(ds, sceneres, ordinalArc);
      var sceneTitle = getRDFString(ds, sceneres, titleArc);
      var sceneDesc = getRDFString(ds, sceneres, descArc);

      var scenenode = bddoc.createElement("scene");
      scenenode.setAttribute("ordinal", sceneOrdinal);
      scenenode.setAttribute("title", sceneTitle);
      scenenode.setAttribute("description", sceneDesc);

      var scene = new Scene(this.project.ds, sceneres);
      var deptseqs = scene.members.toArray();
      for (var i = 0; i < deptseqs.length; ++i) {
        var dept = ds.GetTarget(deptseqs[i], deptArc, true);
        dept = dept.QueryInterface(IRes);
        if (! this.selections.HasAssertion(this.depts, memberArc, dept, true))
          continue;

        var depttitle = getRDFString(schema, dept, labelArc);
        var deptnode = bddoc.createElement("department");
        deptnode.setAttribute("title", depttitle);

        var items = (new RDFSeq(ds, deptseqs[i])).toArray();
        for (var j = 0; j < items.length; ++j) {
          var item = items[j].QueryInterface(IRes);
          if (this.items.IndexOf(item) < 0)
            continue;

          var itemtitle = getRDFString(ds, item, titleArc);
          var itemdesc = getRDFString(ds, item, descArc);
          var itemnode = bddoc.createElement("item");
          itemnode.setAttribute("title", itemtitle);
          itemnode.setAttribute("description", itemdesc);
          deptnode.appendChild(itemnode);

          if (! usemedia)
            continue;

          var mediaseq = ds.GetTarget(item, mediaArc, true);
          if (! (mediaseq && mediaseq instanceof IRes))
            continue;
          mediaseq = new RDFSeq(ds, mediaseq.QueryInterface(IRes));
          var media = mediaseq.toArray();
          for (var k = 0; k < media.length; ++k) {
            var image = media[k].QueryInterface(IRes);
            if (! ds.HasAssertion(image, typeArc, imgRsrc, true))
              continue;
            var imagefile = this.project.localFileFor(image);
            if (imagefile) {
              var uri = fileToFileURL(imagefile);
              var imagenode = bddoc.createElement("image");
              imagenode.setAttribute("src", uri);
              itemnode.appendChild(imagenode);
            }
          }
        }

        if (deptnode.hasChildNodes())
          scenenode.appendChild(deptnode);
      }

      if (scenenode.hasChildNodes())
        breakdown.appendChild(scenenode);
    }

    // Perform an XSL transformation on the result DOM
    var xslt = document.implementation.createDocument('', '', null);
    xslt.async = false;
    xslt.load(Cx.TRANSFORM_PATH + "breakdown-report.xml");

    var proc = new XSLTProcessor();
    proc.importStylesheet(xslt);
    // Breakdown with Description
    if (this.outlineView.getSelectedReportIndex() == 4)
      proc.setParameter(null, "show-description", 1);

    if (this.mediachecked)
      proc.setParameter(null, "show-media", 1);

    var report = proc.transformToDocument(breakdown);
    serializeDOMtoFile(report, this.reportFile);
    this.browser.webNavigation.loadURI(fileToFileURL(this.reportFile),
      Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE,
      null, null, null);
  },


  cmdChangeReport: function cmdChangeReport () {
    switch (this.outlineView.getSelectedReportIndex()) {
      case 0: // Dialog
        this.columnbox.collapsed = false;
        this.columndeck.selectedIndex = 1;
        this.columndeck.flex = 1;
        this.mediacheckbox.collapsed = true;
        this.cmdCreateScriptReport();
        break;
      case 1: // Elements
        this.columnbox.collapsed = false;
        this.columndeck.selectedIndex = 2;
        this.columndeck.flex = 1;
        this.mediacheckbox.collapsed = true;
        this.cmdCreateScriptReport();
        break;
      case 2: // Script with Notes
        this.columnbox.collapsed = true;
        this.mediacheckbox.collapsed = true;
        this.cmdCreateScriptReport();
        break;
      case 3: // Scene Breakdown
      case 4: // Scene Breakdown with Description
        this.columnbox.collapsed = false;
        this.columndeck.selectedIndex = 0;
        this.columndeck.flex = 2;
        this.mediacheckbox.collapsed = false;
        // Triggers cmdCreateBreakdown after appropriate updates
        this.cmdSceneSelectionChanged();
        break;
    }
  },


  beginScriptTree: function beginScriptTree () {
    var xslt = document.implementation.createDocument("", "", null);
    xslt.async = false;
    xslt.load(Cx.TRANSFORM_PATH + "script-tree.xml");
    this.scriptproc = new XSLTProcessor();
    this.scriptproc.importStylesheet(xslt);
    this.scripttree = document.implementation.createDocument("", "script",
      null);
  },


  updateFragmentInTree: function updateFragmentInTree (frag, idx) {
    var sceneid = frag.firstChild.getAttribute("id");
    var existing = null;
    var scenes = this.scripttree.documentElement.childNodes;
    for (var i = 0; i < scenes.length; ++i) {
      if (scenes[i].getAttribute("id") == sceneid) {
        existing = scenes[i];
        break;
      }
    }
    if (existing)
      existing.parentNode.removeChild(existing);

    if (scenes.length > idx) {
      this.scripttree.documentElement.insertBefore(frag.firstChild,
        scenes[idx]);
    }
    else {
      this.scripttree.documentElement.appendChild(frag.firstChild);
    }
  },


  updateScriptTree: function updateScriptTree (idx) {
    var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
    var scene = gScriptController.editor.sceneAt(idx + 1);
    var frag = this.scriptproc.transformToFragment(scene, this.scripttree);
    this.updateFragmentInTree(frag, idx);
  },


  endScriptTree: function endScriptTree () {
    var m = new RDFModel(this.project.ds);
    var docres = RES(this.docres.Value);
    var titleprop = PROP("dc:title");
    var title = m.target(docres, titleprop);
    if (title)
      title = this.project.title + " - " + title.value;
    else
      title = this.project.title;
    this.scripttree.documentElement.setAttribute("title", title);
    this.scripttree.documentElement.setAttribute("scriptmode",
      gScriptController.mode);
    this.scripttree.documentElement.setAttribute("papersize",
      gScriptController.scriptConfig.size);
  },


  cmdExportReport: function cmdExportReport () {
    var namestr = this.reporttitle.value;
    var fp = getFilePicker();
    fp.init(window, gApp.getText("ExportReport"), fp.modeSave);
    fp.appendFilters(fp.filterHTML);
    fp.defaultExtension = "html";
    if (isMac())
      fp.defaultString = namestr + ".html";
    else
      fp.defaultString = namestr;

    if (fp.show() == fp.returnCancel) return;

    // The nsIWebBrowserPersist implementation doesn't follow @import
    // rules in CSS stylesheets, so we need to track them down and add
    // them in manually first.
    var doc = this.browser.contentDocument;
    try {
      var IDocStyle = Components.interfaces.nsIDOMDocumentStyle;
      var ICSSSheet = Components.interfaces.nsIDOMCSSStyleSheet;
      var ICSSRule = Components.interfaces.nsIDOMCSSRule;
      var ICSSImportRule = Components.interfaces.nsIDOMCSSImportRule;
      var styledoc = doc.QueryInterface(IDocStyle);
      var sheets = [];
      for (var i = 0; i < styledoc.styleSheets.length; ++i)
        sheets.push(styledoc.styleSheets[i]);
      var knownSheets = {};
      var importRules = [];
      while (sheets.length > 0) {
        var sheet = sheets.shift();
        if (sheet.type != "text/css" || (sheet.href in knownSheets))
          continue;
        knownSheets[sheet.href] = 1;
        sheet = sheet.QueryInterface(ICSSSheet);
        var rules = sheet.cssRules;
        for (var j = 0; j < rules.length; ++j) {
          if (rules[j].type != ICSSRule.IMPORT_RULE)
            continue;
          var importRule = rules[j].QueryInterface(ICSSImportRule);
          importRules.push(importRule.href);
          sheets.push(importRule.styleSheet);
        }
      }

      var head = doc.firstChild;
      while (importRules.length > 0) {
        var href = importRules.shift();
        if (href in knownSheets)
          continue;
        knownSheets[href] = 1;
        var link = doc.createElement("link");
        link.setAttribute("rel", "stylesheet");
        link.setAttribute("type", "text/css");
        link.setAttribute("href", href);
        head.appendChild(link);
      }
    }
    catch (ex) {
      dump("*** cmdExportReport: " + ex + "\n");
      return;
    }

    var file = fp.file;
    var datafoldername = file.leafName.replace(/\.[^.]*$/, "")
      + gApp.getText("FilesFolderSuffix");
    var datafolder = file.clone();
    datafolder.leafName = datafoldername;

    var IPersist = Components.interfaces.nsIWebBrowserPersist;
    var persist = getWebBrowserPersist();
    var flags = IPersist.ENCODE_FLAGS_ENCODE_BASIC_ENTITIES;
    var columns = 80;

    persist.saveDocument(doc, file, datafolder, "text/html", flags, columns);
  }
};


function report_onEnterPrintPreview () {
  gReportController.inPrintPreview = true;
  document.getElementById("reportheader").collapsed = true;
  document.getElementById("columnbox").collapsed = true;
  /*
  try {
    var printPreviewTB = document.createElementNS(XUL_NS, "toolbar");
    printPreviewTB.setAttribute("printpreview", true);
    printPreviewTB.setAttribute("id", "print-preview-toolbar");
    getBrowser().parentNode.insertBefore(printPreviewTB, getBrowser());
  }
  catch (ex) {
    dump("*** report_onEnterPrintPreview: " + ex + "\n");
  }
  */
  gController.updateCommands();
  getBrowser().contentWindow.focus();
}


function report_onExitPrintPreview () {
  /*
  try {
    var printPreviewTB = document.getElementById("print-preview-toolbar");
    if (printPreviewTB)
      printPreviewTB.parentNode.removeChild(printPreviewTB);
  }
  catch (ex) {
    dump("*** report_onExitPrintPreview: " + ex  + "\n");
  }
  */
  gReportController.inPrintPreview = false;
  document.getElementById("reportheader").collapsed = false;
  document.getElementById("columnbox").collapsed = false;
  gController.updateCommands();
}
