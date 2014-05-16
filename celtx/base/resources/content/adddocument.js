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

var gDialog = new Object;

var gPropsPopulated     = false;
var gWardrobePopulated  = false;
var gScriptsPopulated   = false;

var kFolderImage = "chrome://celtx/skin/folder.png";

function loaded () {
  gDialog.config        = window.arguments[0];
  gDialog.acceptButton  = document.documentElement.getButton("accept");
  gDialog.locationDeck  = document.getElementById("locationdeck");
  gDialog.locationList  = document.getElementById("location-list");
  gDialog.titleBox      = document.getElementById("title-box");
  gDialog.doctypeTree   = document.getElementById("doctype-tree");
  gDialog.doctypeTitle  = document.getElementById("doctype-title");
  gDialog.doctypeDesc   = document.getElementById("doctype-description");
  gDialog.doctypeImage  = document.getElementById("doctype-image");
  gDialog.sourceDeck    = document.getElementById("source-deck");
  gDialog.urlBox        = document.getElementById("url-box");
  gDialog.fileImage     = document.getElementById("file-image");
  gDialog.fileName      = document.getElementById("file-name");
  gDialog.scriptFrame   = document.getElementById("script-frame");
  gDialog.propList      = document.getElementById("prop-list");
  gDialog.wardrobeList  = document.getElementById("wardrobe-list");
  gDialog.sceneList     = document.getElementById("scene-list");
  gDialog.catalogList   = document.getElementById("cataloglist");
  gDialog.customDeck    = document.getElementById("custom-deck");
  gDialog.extfile       = null;
  gDialog.model         = new RDFModel(gDialog.config.project.ds);

  populateLocations(gDialog.config.project.rootFolder);

  var treebody = gDialog.catalogList.body;
  treebody.appendChild(document.createElementNS(Cx.NS_XUL, "treeseparator"));
  var manualitem = document.createElementNS(Cx.NS_XUL, "treeitem")
  manualitem.setAttribute("label", gApp.getText("ManualCatalog"));
  manualitem.setAttribute("value", "manual");
  treebody.appendChild(manualitem);

  gDialog.titleBox.focus();
  gDialog.titleBox.select();

  var rdfsvc = getRDFService();
  gDialog.doctypeTree.builder.rebuild();

  window.setTimeout("gDialog.doctypeTree.view.selection.select(0)", 0);

  validate();

  window.setTimeout(populateScriptPopups, 100);
}

function populateLocations(parent, depth) {
  if (! depth)
    depth = 0;

  var rdfsvc = getRDFService();
  var cu = getRDFContainerUtils();
  var ds = parent.ds;
  var titleArc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var title = ds.GetTarget(parent.res, titleArc, true);
  if (title && parent.res.Value != gDialog.config.project.rootFolder.res.Value)
    title = title.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
  else
    title = gDialog.config.project.title;

  var item = gDialog.locationList.appendItem(title, parent.res.Value);
  item.class = "menuitem-iconic";
  item.setAttribute("style", "margin-left: " + depth + "em;");
  item.setAttribute("image", kFolderImage);

  if (parent.res.Value == gDialog.config.location.Value)
    gDialog.locationList.selectedItem = item;

  var elems = parent.toArray();
  for (var i = 0; i < elems.length; i++) {
    if (cu.IsSeq(ds, elems[i]))
      populateLocations(new RDFSeq(ds, elems[i]), depth + 1);
  }
}

function doctypeSelected () {
  var ILit = Components.interfaces.nsIRDFLiteral;
  var treeview = gDialog.doctypeTree.view;
  var index = treeview.selection.currentIndex;
  if (index < 0)
    return;
  var doctype = treeview.getResourceAtIndex(index);
  var rdfsvc = getRDFService();
  var ds = gDialog.doctypeTree.database;

  // Don't make changes for folders
  var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
  if (! ds.HasAssertion(doctype, typearc,
    rdfsvc.GetResource(Cx.NS_CX + "DocType"), true)) {
    gDialog.customDeck.selectedIndex = 0;
    gDialog.doctypeTitle.value = "";
    gDialog.doctypeDesc.firstChild.nodeValue = "";
    gDialog.titleBox.value = "";
    validate();
    return;
  }

  var titleArc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var descArc = rdfsvc.GetResource(Cx.NS_DC + "description");
  var thumbArc = rdfsvc.GetResource(Cx.NS_CX + "thumbnail");
  var title = ds.GetTarget(doctype, titleArc, true);
  var desc = ds.GetTarget(doctype, descArc, true);
  var thumbnail = ds.GetTarget(doctype, thumbArc, true);

  try {
    gDialog.doctypeTitle.value = title.QueryInterface(ILit).Value;
  }
  catch (ex) {}
  try {
    gDialog.doctypeDesc.firstChild.nodeValue = desc.QueryInterface(ILit).Value;
  }
  catch (ex) {
    dump("*** doctypeSelected: " + ex + "\n");
  }
  try {
    gDialog.doctypeImage.src = thumbnail.QueryInterface(ILit).Value;
  }
  catch (ex) {}

  // Breakdown items get added to the catalog, not the project library
  if (ds.hasArcOut(doctype, rdfsvc.GetResource(Cx.NS_CX + "category")))
    gDialog.locationDeck.selectedIndex = 1;
  else
    gDialog.locationDeck.selectedIndex = 0;

  if (doctype.Value == Cx.NS_CX + "BookmarkDocument")
    gDialog.sourceDeck.selectedIndex = 1;
  else if (doctype.Value == Cx.NS_CX + "ExternalDocument")
    gDialog.sourceDeck.selectedIndex = 2;
  else if (doctype.Value == Cx.NS_CX + "ScheduleDocument" ||
           doctype.Value == Cx.NS_CX + "StoryboardDocument2")
    gDialog.sourceDeck.selectedIndex = 3;
  else
    gDialog.sourceDeck.selectedIndex = 0;

  if (doctype.Value == Cx.NS_CX + "ScriptGroupDocument") {
    gDialog.customDeck.selectedPanel =
      document.getElementById("custom-script");
  }
  else if (doctype.Value == Cx.NS_CX + "SceneDocument") {
    gDialog.customDeck.selectedPanel = document.getElementById("custom-scene");
    if (! gScriptsPopulated)
      populateScriptPopups();
  }
  else if (doctype.Value == Cx.NS_CX + "CatalogDocument") {
    gDialog.customDeck.selectedPanel
      = document.getElementById("custom-catalog");
    var catlist = document.getElementById("cataloglist");
    if (! catlist.selectedItem)
      catlist.selectedIndex = 0;
  }
  else if (doctype.Value == Cx.NS_CX + "StoryboardDocument2") {
    gDialog.customDeck.selectedIndex = 0;
    if (! gScriptsPopulated)
      populateScriptPopups();
  }
  else {
    gDialog.customDeck.selectedIndex = 0;
  }

  if (ds.GetTarget(doctype, rdfsvc.GetResource(Cx.NS_CX + "category"), true))
    gDialog.titleBox.value = "";
  else if (doctype.Value == Cx.NS_CX + "ScriptGroupDocument")
    gDialog.titleBox.value = document.getElementById("scripttype")
      .selectedItem.label;
  else if (doctype.Value == Cx.NS_CX + "CatalogDocument") {
    catalogTypeSelected();
  }
  else
    gDialog.titleBox.value = getRDFString(ds, doctype, titleArc);

  validate();
  if (! gDialog.titleBox.disabled) {
    gDialog.titleBox.select();
    window.setTimeout("gDialog.titleBox.focus();", 0);
  }
}


function catalogTypeSelected () {
  var idx = gDialog.catalogList.view.selection.currentIndex;
  if (idx < 0) {
    gDialog.titleBox.value = "";
  }
  else {
    var view = gDialog.catalogList.view.QueryInterface(
      Components.interfaces.nsITreeContentView);
    var item = view.getItemAtIndex(idx);
    if (item.getAttribute("value") == "manual")
      gDialog.titleBox.value = item.getAttribute("label");
    else
      gDialog.titleBox.value = gApp.getText("CatalogWithType",
        [ item.getAttribute("label") ]);
  }
  validate();
}

function scriptTypeSelected () {
  // This can be called before the dialog load script has run
  if (! gDialog.titleBox)
    return;

  var scripttypes = document.getElementById("scripttype");
  gDialog.titleBox.value = scripttypes.selectedItem.label;
  gDialog.titleBox.select();
}


function accepted () {
  var rdfsvc = getRDFService();
  var index = gDialog.doctypeTree.view.selection.currentIndex;
  var typeres = gDialog.doctypeTree.view.getResourceAtIndex(index);
  var location = gDialog.locationList.selectedItem.value;

  // Substitute breakdown item "documents" for breakdown items themselves
  var ds = gDialog.doctypeTree.database;
  var categoryarc = rdfsvc.GetResource(Cx.NS_CX + "category");
  var category = ds.GetTarget(typeres, categoryarc, true);
  if (category)
    typeres = category.QueryInterface(Components.interfaces.nsIRDFResource);

  gDialog.config.accepted   = true;
  gDialog.config.title      = gDialog.titleBox.value;
  gDialog.config.type       = typeres;
  gDialog.config.location   = rdfsvc.GetResource(location);

  if (typeres.Value == Cx.NS_CX + "BookmarkDocument") {
    gDialog.config.source   = rdfsvc.GetLiteral(
      canonizeWebURL(gDialog.urlBox.value));
  }
  else if (typeres.Value == Cx.NS_CX + "ScheduleDocument" ||
           typeres.Value == Cx.NS_CX + "StoryboardDocument2") {
    if (document.getElementById("scriptlist").value)
      gDialog.config.source = rdfsvc.GetResource(
        document.getElementById("scriptlist").value);
  }
  else if (typeres.Value == Cx.NS_CX + "ExternalDocument") {
    gDialog.config.source   = rdfsvc.GetLiteral(fileToFileURL(gDialog.extfile));
  }
  else if (typeres.Value == Cx.NS_CX + "ScriptGroupDocument") {
    var scriptradio = document.getElementById("scripttype");
    gDialog.config.type = rdfsvc.GetResource(scriptradio.selectedItem.value);
  }
  else if (typeres.Value == Cx.NS_CX + "CatalogDocument") {
    var catlist = document.getElementById("cataloglist");
    var idx = catlist.view.selection.currentIndex;
    var item = catlist.view.getItemAtIndex(idx);
    if (item.getAttribute("value") != "manual")
      gDialog.config.source = rdfsvc.GetResource(item.getAttribute("value"));
  }
  else {
    gDialog.config.source = null;
  }

  return true;
}

function canceled () {
  return true;
}

function validate () {
  var index = gDialog.doctypeTree.view.selection.currentIndex;
  var typeres = null;
  if (index >= 0)
    typeres = gDialog.doctypeTree.view.getResourceAtIndex(index);
  var disabled = false;

  if (gDialog.titleBox.value == "") {
    disabled = true;
  }

  if (typeres) {
    switch (typeres.Value) {
      case Cx.NS_CX + "BookmarkDocument":
        if (gDialog.config.source == "")
          disabled = true;
        break;
      case Cx.NS_CX + "ExternalDocument":
        if (gDialog.extfile == null)
          disabled = true;
        break;
      case Cx.NS_CX + "ScheduleDocument":
        var selectedscript = document.getElementById("scriptlist").selectedItem;
        if (! selectedscript || ! selectedscript.value)
          disabled = true;
        break;
      case Cx.NS_CX + "CatalogDocument":
        var catlist = document.getElementById("cataloglist");
        if (catlist.view.selection.count == 0) {
          disabled = true;
        }
        else {
          var idx = catlist.view.selection.currentIndex;
          var item = catlist.view.getItemAtIndex(idx);
          if (! item.hasAttribute("value"))
            disabled = true;
        }
        break;
    }
    if (typeres.Value == Cx.NS_CX + "ExternalDocument" && ! gDialog.extfile)
      gDialog.titleBox.disabled = true;
    else
      gDialog.titleBox.disabled = false;
  }
  else {
    disabled = true;
    gDialog.titleBox.disabled = true;
  }

  gDialog.acceptButton.disabled = disabled;
}

function existingItemSelected (event) {
  var item = event.target.selectedItem;
  if (! item || item.disabled)
    return;
  gDialog.titleBox.value = item.label;
  gDialog.titleBox.select();
  validate();
}

function browseExternalFile () {
  var fp = getFilePicker();
  fp.init(window, gApp.getText("ChooseFile"), fp.modeOpen);
  fp.appendFilters(fp.filterAll);
  fp.displayDirectory = getMiscFileDir();
  if (fp.show() == fp.returnCancel)
    return;
  setMiscFileDir(fp.file.parent);
  gDialog.extfile = fp.file;
  gDialog.fileName.value = fp.file.leafName;
  gDialog.fileImage.src = iconURLForFile(fp.file);
  gDialog.titleBox.value = fp.file.leafName;

  validate();
}


var gScriptList = [];

function populateScriptPopups () {
  // Prevent asynchronous re-entry
  gScriptsPopulated = true;
  try {
    var scripttypes = [ 'cx:ScriptDocument', 'cx:TheatreDocument',
      'cx:AVDocument', 'cx:RadioDocument', 'cx:ComicDocument' ];
    for (var i = 0; i < scripttypes.length; ++i) {
      var scripts = gDialog.model.sources(PROP('cx:doctype'),
        PROP(scripttypes[i]));
      for (var j = 0; j < scripts.length; ++j)
        gScriptList.push(scripts[j]);
    }

    var scriptPopup = document.getElementById("scriptpopup");
    if (gScriptList.length > 0)
      scriptPopup.appendChild(
        document.createElementNS(Cx.NS_XUL, "menuseparator"));
    for (var i = 0; i < gScriptList.length; ++i) {
      var item = document.createElementNS(Cx.NS_XUL, "menuitem");
      var title = gDialog.model.target(gScriptList[i], PROP('dc:title'));
      item.setAttribute("label", title.value);
      item.setAttribute("value", gScriptList[i].value);
      scriptPopup.appendChild(item);
    }
    window.setTimeout(processNextScript, 0);
  }
  catch (ex) {
    dump("*** populateScriptPopups: " + ex + "\n");
  }
}


var gOpenScript = null;

function processNextScript () {
  if (! gScriptList.length || gScriptList.length == 0)
    return;
  try {
    var script = gScriptList.shift();
    var title = gDialog.model.target(script, PROP('dc:title'));

    var li = gDialog.sceneList.appendItem(title.value, script.value);
    li.setAttribute("disabled", true);

    var frame = window.opener.gFrameLoader.frameForDocument(script.value);
    if (frame) {
      gOpenScript = frame.panel.contentWindow
        .gScriptController.editor.contentDocument;
      scriptLoaded();
    }
    else {
      var rdfsvc = getRDFService();
      var scriptres = script.resource(rdfsvc);
      var file = gDialog.config.project.fileForResource(scriptres);
      if (isReadableFile(file)) {
        var fileURL = fileToFileURL(file);
        gDialog.scriptFrame.setAttribute('src', fileURL);
        setTimeout(checkLoad, 100);
      }
      else
        setTimeout(processNextScript, 0);
    }
  }
  catch (ex) {
    dump("*** processNextScript: " + ex + "\n");
  }
}


function checkLoad () {
  if (gDialog.scriptFrame.docShell.busyFlags) {
    setTimeout(checkLoad, 100);
  }
  else {
    scriptLoaded();
  }
}


function scriptLoaded () {
  var items = fetchItems("scenes");
  for (var i = 0; i < items.length; i++) {
    // var item = document.createElement("menuitem");
    // item.setAttribute("label", items[i]);
    // gDialog.scenePopup.appendChild(item);
    gDialog.sceneList.appendItem(items[i]);
  }
  setTimeout(processNextScript, 100);
}


function fetchItems (filter) {
  var items = [];

  try {
    var doc = gOpenScript ? gOpenScript : gDialog.scriptFrame.contentDocument;

    var xpath = new XPathEvaluator();
    var xset, elem;

    if (filter == 'character') {
      var chars = {};
      xset  = xpath.evaluate('//p[@class="character"]',
                             doc,
                             null,
                             XPathResult.ORDERED_NODE_ITERATOR_TYPE,
                             null);
      while (elem = xset.iterateNext()) {
        var name = stringify(elem).toUpperCase();
        if (name && name.length > 0)
          chars[name]++;
      }

      for (var char in chars) {
        items.push(char);
      }
    }
    else {
      var n = 0;
      xset  = xpath.evaluate('//p[@class="sceneheading"]',
                             doc,
                             null,
                             XPathResult.ORDERED_NODE_ITERATOR_TYPE,
                             null);
      while (elem = xset.iterateNext()) {
        items.push(++n + ' ' + stringify(elem).toUpperCase());
      }
    }
  }
  catch (ex) {
    dump(ex);
  }

  return items;
}
