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

/*

An SVG manipulator tool, to allow scaling, translating, and rotating of
existing SVG objects. I use "manipulator" rather than "editor" to emphasize
the limited scope of its purpose.

Here are some notes describing the general sort of stuff it needs to track
and be able to do:

- Load a primary SVG image from a URL (file initially)
- Load a palette of SVG images from a list of URLs
- Allow inserting of palette images into the primary SVG image in a manner
  such that they are identifiable as distinct objects
- Allow selecting of objects that have been placed in the primary SVG image.
- Allow scaling, translating, and rotation of placed objects.

*/

var gController;


function getController () {
  if (! gController)
    gController = new ShotEditor();

  return gController;
}


function loaded () {
  getController().load();
}


function openObjectsLink () {
  top.gApp.openBrowser("http://www.celtx.com/toolbox.html");
}


function rotatePoint (aPoint, aAngle) {
  var cosa = Math.cos(aAngle * Math.PI / 180);
  var sina = Math.sin(aAngle * Math.PI / 180);
  return {
    x: aPoint.x * cosa - aPoint.y * sina,
    y: aPoint.x * sina + aPoint.y * cosa
  };
}


function rectIntersectsRect (rect1, rect2) {
  // We use the Mozilla convention that rectangles are closed on the
  // left and top, and open on the right and bottom, i.e., the points that
  // are contained are those (x,y) such that x1 <= x < x2 and y1 <= y < y2.

  // Two rectangles fail to intersect if either is fully "after" the other
  // horizontally or vertically.
  return ! (rect2.x >= rect1.x + rect1.width ||
            rect1.x >= rect2.x + rect2.width ||
            rect2.y >= rect1.y + rect1.height ||
            rect1.y >= rect2.y + rect2.height);
}


// Return the bounding box for a group that applies a transformation to
// its children. This requires an svg:svg element as the second parameter
// so that it can create intermediate SVG data structures.
function bboxForTransformGroup (group, svg) {
  var bbox = group.getBBox();
  var ctm = group.getCTM();

  // top left, top right, bottom left, bottom right
  var corners = [
    svg.createSVGPoint(),
    svg.createSVGPoint(),
    svg.createSVGPoint(),
    svg.createSVGPoint()
  ];

  corners[0].x = bbox.x;
  corners[0].y = bbox.y;

  corners[1].x = bbox.x + bbox.width;
  corners[1].y = bbox.y;

  corners[2].x = bbox.x;
  corners[2].y = bbox.y + bbox.height;

  corners[3].x = bbox.x + bbox.width;
  corners[3].y = bbox.y + bbox.height;

  corners = [
    corners[0].matrixTransform(ctm),
    corners[1].matrixTransform(ctm),
    corners[2].matrixTransform(ctm),
    corners[3].matrixTransform(ctm)
  ];

  var newbox = svg.createSVGRect();
  newbox.x = Math.min(corners[0].x, corners[1].x,
    corners[2].x, corners[3].x);
  newbox.y = Math.min(corners[0].y, corners[1].y,
    corners[2].y, corners[3].y);
  newbox.width = Math.max(corners[0].x, corners[1].x,
    corners[2].x, corners[3].x) - newbox.x;
  newbox.height = Math.max(corners[0].y, corners[1].y,
    corners[2].y, corners[3].y) - newbox.y;

  return newbox;
}


function rectEnclosingRects (rects, svg) {
  var xs = [];
  var ys = [];
  for (var i = 0; i < rects.length; ++i) {
    xs.push(rects[i].x);
    xs.push(rects[i].x + rects[i].width);
    ys.push(rects[i].y);
    ys.push(rects[i].y + rects[i].height);
  }

  var minx = Math.min.apply(null, xs);
  var maxx = Math.max.apply(null, xs);
  var miny = Math.min.apply(null, ys);
  var maxy = Math.max.apply(null, ys);

  var rect = svg.createSVGRect();
  rect.x = minx;
  rect.y = miny;
  rect.width = maxx - minx;
  rect.height = maxy - miny;

  return rect;
}


// Factor a transformation matrix of the form M = TRS, where T is a
// translation matrix, R is a rotation matrix, and S is a scaling matrix.
// An svg:svg element must be supplied to create the SVGMatrix results.
function factorTransformationMatrix (svg, M) {
  var T = svg.createSVGMatrix();
  T.e = M.e;
  T.f = M.f;

  var sx = Math.sqrt(M.a * M.a + M.b * M.b);
  var sy = Math.sqrt(M.c * M.c + M.d * M.d);
  var S = svg.createSVGMatrix();
  S.a = sx;
  S.d = sy;

  var cost = M.a / sx;
  if (cost > 1)
    cost = 1;
  else if (cost < -1)
    cost = -1;
  var sint = M.b / sy;
  var R = svg.createSVGMatrix();
  R.a = cost;
  R.b = sint;
  R.c = -sint;
  R.d = cost;

  return { T: T, R: R, S: S };
}


function factorTransformationMatrixWithCenter (svg, M, cx, cy) {
  var factors = factorTransformationMatrix(svg, M);

  // Rotation about a center point only affects the translation components
  // of the transformation matrix; the rotation and scaling are the same,
  // but it translates differently. A TSR matrix with rotation about a
  // center (cx, cy), scaling by (sx, sy) and translation by (tx, ty)
  // has e and f components:
  //   e = sx(cx cos t - cy sin t - cx) + tx
  //   f = sy(cx sin t + cy cos t - cy) + ty

  var dx = factors.S.a * (cx * (factors.R.a - 1) - cy * factors.R.b);
  var dy = factors.S.d * (cx * factors.R.b + cy * (factors.R.a - 1));
  factors.T.e -= dx;
  factors.T.f -= dy;

  return factors;
}


function ShotEditor () {
  this.txmgr = new TransactionManager();
  this.txmgr.addListener(this);
}


ShotEditor.prototype = {
  __proto__: EditorController.prototype,


  commands: {
    "cmd-print": 1,
    "cmd-page-setup": 1,
    "cmd-lower": 1,
    "cmd-lower-to-bottom": 1,
    "cmd-raise": 1,
    "cmd-raise-to-top": 1,
    "cmd-group": 1,
    "cmd-ungroup": 1,
    "cmd-set-stroke-colour": 1,
    "cmd-set-fill-colour": 1,
    "cmd_cut": 1,
    "cmd_copy": 1,
    "cmd_paste": 1,
    "cmd_selectAll": 1,
    "cmd_delete": 1,
    "cmd_undo": 1,
    "cmd_redo": 1
  },


  isCommandEnabled: function (aCommand) {
    switch (aCommand) {
      case "cmd_copy":
      case "cmd_cut":
      case "cmd_delete":
        return this.selectionController &&
               this.selectionController.hasValidSelection();
      case "cmd_paste":
        return this.canPaste();
      case "cmd-lower":
      case "cmd-lower-to-bottom":
        return this.selectionController &&
               this.selectionController.canLower();
      case "cmd-raise":
      case "cmd-raise-to-top":
        return this.selectionController &&
               this.selectionController.canRaise();
      case "cmd-group":
        return this.selectionController &&
               this.selectionController.canGroup();
      case "cmd-ungroup":
        return this.selectionController &&
               this.selectionController.canUngroup();
      case "cmd_undo":
        return this.txmgr.canUndo();
      case "cmd_redo":
        return this.txmgr.canRedo();
      case "cmd-set-stroke-colour":
        return this.selectionController &&
               this.selectionController.canSetStrokeColour();
      case "cmd-set-fill-colour":
        return this.selectionController &&
               this.selectionController.canSetFillColour();
      default:
        return (aCommand in this.commands);
    }
  },


  doCommand: function (aCommand) {
    switch (aCommand) {
      case "cmd-print":
        PrintUtils.print();
        break;
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-lower":
        this.selectionController.lowerSelection();
        break;
      case "cmd-lower-to-bottom":
        this.selectionController.lowerSelectionToBottom();
        break;
      case "cmd-raise":
        this.selectionController.raiseSelection();
        break;
      case "cmd-raise-to-top":
        this.selectionController.raiseSelectionToTop();
        break;
      case "cmd-group":
        this.selectionController.groupSelection();
        break;
      case "cmd-ungroup":
        this.selectionController.ungroupSelection();
        break;
      case "cmd-set-stroke-colour":
        var strokepicker = document.getElementById("strokepicker");
        this.selectionController.setStrokeColour(strokepicker.color);
        strokepicker.parentNode.hidePopup();
        break;
      case "cmd-set-fill-colour":
        var fillpicker = document.getElementById("fillpicker");
        this.selectionController.setFillColour(fillpicker.color);
        fillpicker.parentNode.hidePopup();
        break;
      case "cmd_cut":
        this.selectionController.copySelection();
        this.selectionController.deleteSelection();
        this.selectionController = null;
        break;
      case "cmd_copy":
        this.selectionController.copySelection();
        break;
      case "cmd_paste":
        this.doPaste();
        break;
      case "cmd_undo":
        if (this.txmgr.canUndo())
          this.txmgr.undo();
        break;
      case "cmd_redo":
        if (this.txmgr.canRedo())
          this.txmgr.redo();
        break;
      case "cmd_selectAll":
        this.selectAll();
        break;
      case "cmd_delete":
        this.deleteSelection();
        break;
    }
    document.getElementById("shotframe").contentWindow.focus();
    this.updateSelectionCommands();
  },


  updateSelectionCommands: function () {
    goUpdateCommand("cmd-lower");
    goUpdateCommand("cmd-lower-to-bottom");
    goUpdateCommand("cmd-raise");
    goUpdateCommand("cmd-raise-to-top");
    goUpdateCommand("cmd-group");
    goUpdateCommand("cmd-ungroup");
    goUpdateCommand("cmd-set-stroke-colour");
    goUpdateCommand("cmd-set-fill-colour");
    top.goUpdateGlobalEditMenuItems();
    goUpdateGlobalEditMenuItems();
  },


  get selectionController () {
    return this._selectionController;
  },


  set selectionController (val) {
    if (this._selectionController)
      this._selectionController.shutdown();
    this._selectionController = val;
    this.updateSelectionCommands();
  },


  onDoTransaction: function () {
    if (this.selectionController &&
        ! this.selectionController.hasValidSelection())
      this.selectionController = null;
    this.updateSelectionCommands();
  },


  onUndoTransaction: function () {
    if (this.selectionController &&
        ! this.selectionController.hasValidSelection())
      this.selectionController = null;
    this.updateCurrentSelection();
    this.updateSelectionCommands();
  },


  onRedoTransaction: function () {
    if (this.selectionController &&
        ! this.selectionController.hasValidSelection())
      this.selectionController = null;
    this.updateCurrentSelection();
    this.updateSelectionCommands();
  },


  onClearUndoStack: function () {
    this.updateSelectionCommands();
  },


  get modified () {
    return this._lastSaveTx != this.txmgr.peekUndoStack() ||
           ! isReadableFile(this.project.fileForResource(this.docres));
  },


  document: null,
  image: null,
  _lastSaveTx: null,
  _palette: [],
  _images: {},
  _selection: null,


  _selectionRect: null,
  _doingSelectionDrag: false,

  _toolMode: 0,
  SELECTION_MODE: 0,
  LINE_MODE: 1,
  ARROW_MODE: 2,
  RECTANGLE_MODE: 3,
  ELLIPSE_MODE: 4,
  TEXT_MODE: 5,


  load: function () {
    window.controllers.appendController(this);
  },


  setToolMode: function (aMode) {
    if (this._toolMode == this.SELECTION_MODE &&
        aMode != this._SELECTION_MODE)
      this.selectionController = null;

    var docel = this.document.documentElement;
    switch (aMode) {
      case this.LINE_MODE:
      case this.ARROW_MODE:
      case this.RECTANGLE_MODE:
      case this.ELLIPSE_MODE:
        docel.setAttribute("style", "cursor: crosshair;");
        break;
      case this.TEXT_MODE:
        docel.setAttribute("style", "cursor: text;");
        break;
      default:
        docel.removeAttribute("style");
    }

    var buttonname = null;
    switch (aMode) {
      case this.SELECTION_MODE:
        buttonname = "shotpointerbutton";
        break;
      case this.LINE_MODE:
        buttonname = "shotlinebutton";
        break;
      case this.ARROW_MODE:
        buttonname = "shotarrowbutton";
        break;
      case this.RECTANGLE_MODE:
        buttonname = "shotrectanglebutton";
        break;
      case this.ELLIPSE_MODE:
        buttonname = "shotellipsebutton";
        break;
      case this.TEXT_MODE:
        buttonname = "shottextbutton";
        break;
    }
    if (buttonname) {
      var button = document.getElementById(buttonname);
      if (! button.checked)
        button.checked = true;
    }

    this._toolMode = aMode;
  },


  startSelectionDrag: function () {
    this._doingSelectionDrag = true;
  },


  endSelectionDrag: function () {
    this._doingSelectionDrag = false;
  },


  open: function (project, docres) {
    this.project = project;
    this.docres = docres;

    try {
      this.loadPalettes();
      this.populatePalettes();
      this.addPaletteHandlers();
      this.addDropHandlers();
    } catch (ex) { celtxBugAlert(ex, Components.stack, ex); }

    try {
      this.loadShot();
    } catch (ex) { celtxBugAlert(ex, Components.stack, ex); }

    this.updateSelectionCommands();
  },


  save: function () {
    var file = this.project.fileForResource(this.docres);
    if (! file) {
      file = this.project.projectFolder;
      file.append("setup.svg");
      file.createUnique(0, 0600);
      this.project.addFileToDocument(file, this.docres);
    }

    var selectedObject = null;
    try {
      if (this.selectionController) {
        selectedObject = this.selectionController.object;
        this.selectionController.shutdown();
      }
    }
    catch (ex) {
      dump("*** save: " + ex + "\n");
      selectedObject = null;
    }

    serializeDOMtoFile(this.image, file);
    this._lastSaveTx = this.txmgr.peekUndoStack();
    var obsvc = getObserverService();
    obsvc.notifyObservers(this.docres, "celtx:shot-document-saved", null);

    if (selectedObject) {
      try {
        this.selectionController.init(this, selectedObject, this.txmgr);
      }
      catch (ex) {
        dump("*** save: " + ex + "\n");
        try {
          this.selectionController = null;
        } catch (ex2) { this._selectionController = null; }
      }
    }
  },


  focus: function () {
    this._focused = true;
    var frame = document.getElementById("shotframe");
    frame.setAttribute("type", "content-primary");
    window.content.controllers.insertControllerAt(0, this);
    window.content.focus();

    this.updateSelectionCommands();
  },


  blur: function () {
    window.content.controllers.removeController(this);
    var frame = document.getElementById("shotframe");
    frame.setAttribute("type", "content");
    this._focused = false;
  },


  loadPalettes: function () {
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();

    // The master datasource
    this.compds = getCompositeDataSource();

    // The category list
    var categoryuri = Cx.CONTENT_PATH + "editors/shotschema.rdf";
    this.categoryds = rdfsvc.GetDataSourceBlocking(categoryuri);
    this.compds.AddDataSource(this.categoryds);

    // Create an in-memory datasource to aggregate all the palettes into a
    // single, coherent list.
    this.generatedds = getInMemoryDataSource();
    this.compds.AddDataSource(this.generatedds);

    // Recreate the category list so we can modify it at run-time
    var catres = rdfsvc.GetResource("urn:celtx:categories");
    var catseq = new RDFSeq(this.generatedds, catres);
    var origres = rdfsvc.GetResource(categoryuri + "#categories");
    var elements = new RDFSeq(this.categoryds, origres).toArray();
    for (var i = 0; i < elements.length; ++i) {
      catseq.push(elements[i].QueryInterface(IRes));
    }

    // Load all the palettes
    var mediamgr = getMediaManager();
    var palettes = mediamgr.getShotPalettes({});
    for (var i = 0; i < palettes.length; ++i) {
      try {
        this.loadPalette(palettes[i]);
      }
      catch (ex) {
        dump("*** Failed to load palette " + palettes[i].id
          + ": " + ex + "\n");
      }
    }
  },


  loadPalette: function (palette) {
    var rdfsvc = getRDFService();
    var localfilearc = rdfsvc.GetResource(Cx.NS_CX + "localFile");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var iconarc = rdfsvc.GetResource(Cx.NS_CX + "icon");

    var categoryseq = rdfsvc.GetResource("urn:celtx:categories");
    categoryseq = new RDFSeq(this.generatedds, categoryseq);
    var categories = palette.getCategories({});
    for (var i = 0; i < categories.length; ++i) {
      if (categoryseq.indexOf(categories[i]) < 0) {
        var title = palette.getCategoryName(categories[i]);
        if (! title) {
          dump("*** Untitled category: " + categories[i].Value + "\n");
          continue;
        }
        setRDFString(this.generatedds, categories[i], titlearc, title);

        var iconuri = palette.getCategoryIconURI(categories[i]);
        if (iconuri)
          setRDFString(this.generatedds, categories[i], iconarc, iconuri);

        categoryseq.push(categories[i]);
      }
      var category = new RDFSeq(this.generatedds, categories[i]);
      var images = palette.getImagesInCategory(categories[i], {});
      for (var j = 0; j < images.length; ++j) {
        setRDFString(this.generatedds, images[j], titlearc,
          palette.getImageName(images[j]));
        setRDFString(this.generatedds, images[j], localfilearc,
          palette.getImageLocation(images[j]));
        iconuri = palette.getImageIconURI(images[j]);
        if (iconuri)
          setRDFString(this.generatedds, images[j], iconarc, iconuri);
        category.push(images[j]);
      }
    }
  },


  populatePalettes: function () {
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var iconarc = rdfsvc.GetResource(Cx.NS_CX + "icon");

    var localstore = Components.classes[
      "@mozilla.org/rdf/datasource;1?name=local-store"]
      .getService(Components.interfaces.nsIRDFDataSource);

    var defaulticon = "chrome://celtx/skin/documents/misc.png";

    var tree = document.getElementById("palettetree");
    this.groupCreator = new GroupCreator(this);
    var treebody = tree.getElementsByTagName("treechildren")[0];

    var categories = rdfsvc.GetResource("urn:celtx:categories");
    categories = new RDFSeq(this.generatedds, categories);
    for (var i = 0; i < categories.length; ++i) {
      var catres = categories.get(i).QueryInterface(
        Components.interfaces.nsIRDFResource);
      var catseq = new RDFSeq(this.generatedds, catres);
      if (catseq.isEmpty())
        continue;

      var label = getRDFString(this.compds, catres, titlearc);
      var catitem = document.createElement("treeitem");
      catitem.setAttribute("id", catres.Value);
      catitem.setAttribute("container", "true");
      catitem.setAttribute("persist", "open");
      var persistres = rdfsvc.GetResource(Cx.CONTENT_PATH
        + "editors/shoteditor.xul#" + catres.Value);
      var openarc = rdfsvc.GetResource("open");
      if (getRDFString(localstore, persistres, openarc) != "false")
        catitem.setAttribute("open", "true");
      var row = document.createElement("treerow");
      catitem.appendChild(row);
      var cell = document.createElement("treecell");
      row.appendChild(cell);
      cell.setAttribute("label", label);
      cell.setAttribute("src", "chrome://celtx/skin/folder.png");
      var catbody = document.createElement("treechildren");
      catitem.appendChild(catbody);

      for (var j = 0; j < catseq.length; ++j) {
        try {
          var itemres = catseq.get(j).QueryInterface(IRes);
          label = getRDFString(this.compds, itemres, titlearc);
          var item = document.createElement("treeitem");
          catbody.appendChild(item);
          item.setAttribute("id", itemres.Value);
          item.setAttribute("category", catres.Value);
          row = document.createElement("treerow");
          item.appendChild(row);
          cell = document.createElement("treecell");
          row.appendChild(cell);
          cell.setAttribute("label", label);

          var iconuri = getRDFString(this.compds, itemres, iconarc);
          if (! iconuri)
            iconuri = getRDFString(this.compds, catres, iconarc);
          if (! iconuri)
            iconuri = defaulticon;
          cell.setAttribute("src", iconuri);
        }
        catch (ex) {
          dump("*** Failed to add palette item " + itemres.Value
            + ": " + ex + "\n");
        }
      }

      treebody.appendChild(catitem);
    }
  },


  addPaletteHandlers: function () {
    var list = document.getElementById("palettetree");
    this.groupCreator = new GroupCreator(this);
    list.addEventListener("draggesture", this.groupCreator, false);
  },


  addDropHandlers: function () {
    var frame = document.getElementById("shotframe");
    this.dropHandler = new DropHandler(this);
    frame.addEventListener("dragover", this.dropHandler, false);
    frame.addEventListener("dragdrop", this.dropHandler, false);
  },


  loadPaletteImage: function (itemres, category) {
    var rdfsvc = getRDFService();

    // Get the image's title
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var title = getRDFString(this.compds, itemres, titlearc);

    // Load the image into memory
    var fileuriarc = rdfsvc.GetResource(Cx.NS_CX + "localFile");
    var fileuri = getRDFString(this.generatedds, itemres, fileuriarc);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", fileuri, false);
    xhr.send(null);
    var filedom = xhr.responseXML;
    this._images[itemres.Value] = filedom;

    // Set the label if it's a character
    if (category == "characters") {
      var text = filedom.documentElement.getElementsByTagName("text")[0];
      while (text.hasChildNodes())
        text.removeChild(text.lastChild);
      text.appendChild(filedom.createTextNode(title));
    }
  },


  loadShot: function () {
    // I think what makes the most sense here is to have an outer SVG document
    // as our "frame", where we can place anything that should act as a layer
    // on top of our image (palettes, selection rectangles, symbols).

    this.document = document.getElementById("shotframe").contentDocument;
    this.document.documentElement.addEventListener("mousedown", this, false);
    this.document.documentElement.addEventListener("keypress", this, false);

    try {
      var file = this.project.fileForResource(this.docres);
      if (file) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", fileToFileURL(file), false);
        xhr.send(null);
        this.image = xhr.responseXML.documentElement;
      }
      else {
        this.image = this.document.createElementNS(Cx.NS_SVG, "svg");
      }
      this.document.documentElement.appendChild(this.image);
    }
    catch (ex) {
      dump("*** loadShot: " + ex + "\n");
      celtxBugAlert(ex, Components.stack, ex);
    }
  },


  cmdExportShot: function () {
    try {
    var defaultExt = "png";
    var fp = getFilePicker();
    fp.init(window, gApp.getText("ExportSketch"), fp.modeSave);
    fp.appendFilter("PNG", "png");
    fp.defaultExtension = defaultExt;
    if (isMac())
      fp.defaultString = this.project.title + "." + defaultExt;
    else
      fp.defaultString = this.project.title;
    if (fp.show() == fp.returnCancel) return;

      this.exportShotToFile(fp.file);
    }
    catch (ex) {
      dump("*** cmdExportShot: " + ex + "\n");
    }
  },


  exportShotToFile: function (aFile) {
    // Save and clear the selection
    var selectedObject = null;
    try {
      if (this.selectionController) {
        selectedObject = this.selectionController.object;
        this.selectionController.shutdown();
      }
    }
    catch (ex) {
      dump("*** save: " + ex + "\n");
      selectedObject = null;
    }

    // Save to the file
    var frame = document.getElementById("shotframe");
    var width = frame.boxObject.width;
    var height = frame.boxObject.height;
    var canvas = document.createElementNS(Cx.NS_XHTML, "canvas");
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext("2d");
    var white = "rgb(255, 255, 255)";
    context.drawWindow(frame.contentWindow, 0, 0, width, height, white);

    // Step 1: Get a PNG representation as a data: URL
    var data = canvas.toDataURL("image/png");

    // Step 2: Create a channel for the data
    var ios = getIOService();
    var channel = ios.newChannel(data, "ascii", null);

    // Step 3: Open the channel with a downloader as the listener
    var observer = {
      onDownloadComplete: function (downloader, request, ctxt, status, result) {
      }
    };
    var downloader = Components.classes["@mozilla.org/network/downloader;1"]
      .createInstance(Components.interfaces.nsIDownloader);
    downloader.init(observer, aFile);
    channel.asyncOpen(downloader, this);

    // Restore the selection
    if (selectedObject) {
      try {
        this.selectionController.init(this, selectedObject, this.txmgr);
      }
      catch (ex) {
        dump("*** save: " + ex + "\n");
        try {
          this.selectionController = null;
        } catch (ex2) { this._selectionController = null; }
      }
    }
  },


  canPaste: function () {
    try {
      var clipboard = Components.classes["@mozilla.org/widget/clipboard;1"]
        .getService(Components.interfaces.nsIClipboard);
      var transferable = nsTransferable.createTransferable();
      transferable.addDataFlavor("text/unicode");
      clipboard.getData(transferable, clipboard.kGlobalClipboard);
      var data = { value: null };
      var datalen = { value: 0 };
      transferable.getTransferData("text/unicode", data, datalen);
      if (datalen.value == 0 || ! data.value)
        return false;

      var domstr = data.value.QueryInterface(
        Components.interfaces.nsISupportsString);
      domstr = domstr.data.substring(0, datalen.value / 2);
      var parser = new DOMParser();
      var svgdoc = parser.parseFromString(domstr, "text/xml");
      if (svgdoc.documentElement.nodeName != "svg")
        return false;

      return true;
    }
    catch (ex) {
      return false;
    }
  },


  doPaste: function () {
    try {
      var clipboard = Components.classes["@mozilla.org/widget/clipboard;1"]
        .getService(Components.interfaces.nsIClipboard);
      var transferable = nsTransferable.createTransferable();
      transferable.addDataFlavor("text/unicode");
      clipboard.getData(transferable, clipboard.kGlobalClipboard);

      var data = { value: null };
      var datalen = { value: 0 };
      transferable.getTransferData("text/unicode", data, datalen);
      var domstr = data.value.QueryInterface(
        Components.interfaces.nsISupportsString);
      domstr = domstr.data.substring(0, datalen.value / 2);

      var parser = new DOMParser();
      var svgdoc = parser.parseFromString(domstr, "text/xml");
      if (svgdoc.documentElement.nodeName != "svg")
        throw new Error("Can't paste non-svg content");
      var svg = svgdoc.documentElement;
      if (svg.childNodes.length == 0)
        return;

      var offset = 15;
      var tx = new BatchTx();
      var pastednodes = [];
      for (var i = 0; i < svg.childNodes.length; ++i) {
        var node = this.document.importNode(svg.childNodes[i], true);
        pastednodes.push(node);
        tx.addTransaction(new InsertNodeTx(node, this.image, null));
        var selection = SVGSelectionFactory.selectionForObject(node);
        tx.addTransaction(selection.createMoveByTx(node, offset, offset));
      }
      this.txmgr.doTransaction(tx);

      var selection = null;
      if (pastednodes.length == 1) {
        var obj = pastednodes[0];
        selection = SVGSelectionFactory.selectionForObject(obj);
        selection.init(this, obj, this.txmgr);
      }
      else {
        selection = new MultiSelection();
        selection.init(this, pastednodes, this.txmgr);
      }
      this.selectionController = selection;
    }
    catch (ex) {
      dump("*** doPaste: " + ex + "\n");
    }
  },


  addSVGAt: function (aSVG, aX, aY) {
    var svg = this.document.importNode(aSVG, true);
    svg.setAttribute("width", "100");
    svg.setAttribute("height", "100");
    try {
      var tx = new CreateGroupTx(this.image, aX, aY, svg);
      this.txmgr.doTransaction(tx);
      return tx.group;
    }
    catch (ex) {
      dump("*** CreateGroupTx failed: " + ex + "\n");
      return null;
    }
  },


  addItemAt: function (aItem, aX, aY) {
    this.addSVGAt(aItem.svg);
  },


  containingSVGElement: function (aNode) {
    var ISVG = Components.interfaces.nsIDOMSVGSVGElement;

    if (aNode instanceof ISVG)
      return aNode;
    else
      return aNode.ownerSVGElement;
  },


  getTransformationGroup: function (aNode, aCreate) {
    var IGroup = Components.interfaces.nsIDOMSVGGElement;

    var group = aNode;
    while (group) {
      if (! (group instanceof IGroup)) {
        group = group.parentNode;
        continue;
      }

      var role = group.getAttributeNS(Cx.NS_CX, "role");
      if (role && ! (role.match(/translate/))) {
        group = group.parentNode;
        continue;
      }

      break;
    }

    if (! group && aCreate) {
      group = this.document.createElementNS(Cx.NS_SVG, "g");
      aNode.parentNode.insertBefore(group, aNode);
      group.appendChild(aNode);
    }

    return group;
  },


  handleEvent: function (event) {
    switch (event.type) {
      case "mousedown":
        this.onMouseDown(event);
        break;
      case "keypress":
        this.onKeyPress(event);
        break;
    }
  },


  onMouseDown: function (event) {
    switch (this._toolMode) {
      case this.LINE_MODE:
        this._mouseActionController = new LineCreator(this, event, false);
        break;
      case this.ARROW_MODE:
        this._mouseActionController = new LineCreator(this, event, true);
        break;
      case this.RECTANGLE_MODE:
        this._mouseActionController = new RectangleCreator(this, event);
        break;
      case this.ELLIPSE_MODE:
        this._mouseActionController = new EllipseCreator(this, event);
        break;
      case this.TEXT_MODE:
        this._mouseActionController = new TextCreator(this, event);
        break;
      default:
        if (event.target == this.document.documentElement) {
          if (! (event.ctrlKey || event.shiftKey || event.metaKey)) {
            this.selectionController = null;
            this._mouseActionController = new SelectionCreator(this, event);
          }
        }
        else
          this.checkMouseDownSelection(event);
        break;
    }
  },


  checkMouseDownSelection: function (aEvent) {
    if (this._toolMode != this.SELECTION_MODE || this._doingSelectionDrag) {
      return;
    }
    else if (this._doingUnselect) {
      this._doingUnselect = false;
      return;
    }

    if (aEvent.ctrlKey || aEvent.shiftKey || aEvent.metaKey) {
      if (this.selectionController) {
        this.augmentSelection(aEvent);
        return;
      }
    }

    var object = SVGSelectionFactory.selectableObjectForNode(aEvent.target,
      this.image);
    var selection = SVGSelectionFactory.selectionForObject(object);

    if (selection) {
      selection.init(this, object, this.txmgr);
      this.selectionController = selection;
      selection.handleEvent(aEvent);
    }
    else {
      this.selectionController = null;
    }
  },


  augmentSelection: function (aEvent) {
    var object = SVGSelectionFactory.selectableObjectForNode(aEvent.target,
      this.image);
    if (! object) {
      dump("*** No selectable object found\n");
      return;
    }

    var sel = this.selectionController;
    if (sel.isMultipleSelection()) {
      sel.addObject(object);
      sel.updatePosition();
    }
    else {
      var objects = [ sel.object, object ];
      sel = new MultiSelection();
      sel.init(this, objects, this.txmgr);
      this.selectionController = sel;
    }
  },


  unselectRequested: function (aSelection, aEvent) {
    this._doingUnselect = true;
    var sel = this.selectionController;
    if (! sel.isMultipleSelection()) {
      this.selectionController = null;
      return;
    }

    var object = aSelection.object;
    sel.removeObject(object);
    if (sel.getObjectCount() == 1) {
      var object = sel.getObjectAt(0);
      sel = SVGSelectionFactory.selectionForObject(object);
      sel.init(this, object, this.txmgr);
      this.selectionController = sel;
    }
    else {
      sel.updatePosition();
    }
  },


  updateCurrentSelection: function () {
    if (! this.selectionController)
      return;

    if (this.selectionController.hasValidSelection()) {
      this.selectionController.updatePosition();
    }
    else {
      this.selectionController = null;
    }
  },


  selectAll: function () {
    var selection = new MultiSelection();
    selection.init(this, this.image.childNodes, this.txmgr);
    this.selectionController = selection;
  },


  deleteSelection: function () {
    if (this.selectionController) {
      this.selectionController.deleteSelection();
      this.selectionController = null;
    }
  },


  isCharacter: function (aObject) {
    return aObject.getAttributeNS(Cx.NS_CX, "type") == "character";
  },


  onKeyPress: function (event) {
    switch (event.keyCode) {
      case event.DOM_VK_BACK_SPACE:
      case event.DOM_VK_DELETE:
        this.deleteSelection();
        break;
    }
  }
};


function DropHandler (aEditor) {
  this.editor = aEditor;

  this._flavours = new FlavourSet();
  this._flavours.appendFlavour("text/x-moz-url");
}


DropHandler.prototype = {
  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      case "dragover":
        nsDragAndDrop.dragOver(aEvent, this);
        break;
      case "dragdrop":
        nsDragAndDrop.drop(aEvent, this);
        break;
    }
  },


  canDrop: function (aEvent, aSession) {
    return aSession.isDataFlavorSupported("text/x-moz-url");
  },


  onDragOver: function (aEvent, aFlavour, aSession) {},


  onDrop: function (aEvent, aXferData, aSession) {
    var editbox = document.getElementById("shotframe").boxObject;
    var x = aEvent.screenX - editbox.screenX;
    var y = aEvent.screenY - editbox.screenY;

    if (x < 0 || y < 0 || x > editbox.width || y > editbox.height)
      return;

    try {
      var data = aXferData.data.toString().split("\n");
      var itemuri = data[0];
      var category = data[1];
      if (! (itemuri in this.editor._images)) {
        var rdfsvc = getRDFService();
        var itemres = rdfsvc.GetResource(itemuri);
        this.editor.loadPaletteImage(itemres, category);
      }

      var svgdoc = this.editor._images[itemuri];
      var object = this.editor.addSVGAt(svgdoc.documentElement, x, y);
      document.getElementById("shotframe").contentWindow.focus();

      this.editor.setToolMode(this.editor.SELECTION_MODE);

      var selection = SVGSelectionFactory.selectionForObject(object);
      selection.init(this.editor, object, this.editor.txmgr);
      this.editor.selectionController = selection;
    }
    catch (ex) {
      dump("*** onDrop: " + ex + "\n");
    }
  },


  getSupportedFlavours: function () {
    return this._flavours;
  },
};


// Prototype to be extended by each tool, for creation of objects
function MouseActionController () {
}


MouseActionController.prototype.init = function (aEditor, aEvent) {
  this.editor = aEditor;
  this.startX = aEvent.clientX;
  this.startY = aEvent.clientY;

  var root = this.editor.document.documentElement;
  root.addEventListener("mousemove", this, false);
  root.addEventListener("mouseup", this, false);
};


MouseActionController.prototype.handleEvent = function (aEvent) {
  switch (aEvent.type) {
    case "mousemove":
      this.onMouseMove(aEvent.clientX, aEvent.clientY);
      break;
    case "mouseup":
      this.onMouseUp(aEvent.clientX, aEvent.clientY);
      this.unregister();
      break;
  }
};


MouseActionController.prototype.unregister = function () {
  var root = this.editor.document.documentElement;
  root.removeEventListener("mousemove", this, false);
  root.removeEventListener("mouseup", this, false);

  this.editor._mouseActionController = null;
};


MouseActionController.prototype.onMouseMove = function (x, y) {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};


MouseActionController.prototype.onMouseUp = function (x, y) {
  throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
};




function LineCreator (aEditor, aEvent, aHasArrow) {
  this.ghost = null;
  this.minLength2 = 64; // Minimum square length 8^2 px
  this.hasArrow = aHasArrow;

  this.init(aEditor, aEvent);
}


LineCreator.prototype = new MouseActionController();


LineCreator.prototype.onMouseMove = function (x, y) {
  var dx = this.startX - x;
  var dy = this.startY - y;

  // Cut-off: 8px
  if (dx*dx + dy*dy < this.minLength2) {
    if (this.ghost) {
      this.ghost.parentNode.removeChild(this.ghost);
      this.ghost = null;
    }
    return;
  }

  if (this.ghost) {
    this.ghost.setAttribute("x2", x);
    this.ghost.setAttribute("y2", y);
    return;
  }

  this.ghost = this.editor.document.createElementNS(Cx.NS_SVG, "line");
  this.ghost.setAttribute("stroke-dasharray", "5,5");
  this.ghost.setAttribute("stroke", "lightgrey");
  this.ghost.setAttribute("x1", this.startX);
  this.ghost.setAttribute("y1", this.startY);
  this.ghost.setAttribute("x2", x);
  this.ghost.setAttribute("y2", y);
  if (this.hasArrow)
    this.ghost.setAttribute("marker-end", "url(#arrowMarker)");
  this.editor.document.documentElement.appendChild(this.ghost);
};


LineCreator.prototype.onMouseUp = function (x, y) {
  if (! this.ghost)
    return;

  var dx = this.startX - x;
  var dy = this.startY - y;

  if (dx*dx + dy*dy >= this.minLength2) {
    try {
      var tx = new CreateLineTx(this.editor.image, this.startX, this.startY,
        x, y, this.hasArrow);
      this.editor.txmgr.doTransaction(tx);
    }
    catch (ex) {
      dump("*** CreateLineTx failed: " + ex + "\n");
    }
  }

  this.ghost.parentNode.removeChild(this.ghost);
  this.ghost = null;
};




function RectangleCreator (aEditor, aEvent) {
  this.ghost = null;
  this.minLength2 = 64; // Minimum square length 8^2 px

  this.init(aEditor, aEvent);
}


RectangleCreator.prototype = new MouseActionController();


RectangleCreator.prototype.onMouseMove = function (x, y) {
  var dx = this.startX - x;
  var dy = this.startY - y;

  // Cut-off: 8px
  if (dx*dx + dy*dy < this.minLength2) {
    if (this.ghost) {
      this.ghost.parentNode.removeChild(this.ghost);
      this.ghost = null;
    }
    return;
  }

  var left = this.startX < x ? this.startX : x;
  var top = this.startY < y ? this.startY : y;
  var right = this.startX < x ? x : this.startX;
  var bottom = this.startY < y ? y : this.startY;

  var width = right - left;
  var height = bottom - top;

  if (this.ghost) {
    this.ghost.setAttribute("x", left);
    this.ghost.setAttribute("y", top);
    this.ghost.setAttribute("width", width);
    this.ghost.setAttribute("height", height);
    return;
  }

  this.ghost = this.editor.document.createElementNS(Cx.NS_SVG, "rect");
  this.ghost.setAttribute("stroke-dasharray", "5,5");
  this.ghost.setAttribute("stroke", "lightgrey");
  this.ghost.setAttribute("fill", "none");
  this.ghost.setAttribute("x", left);
  this.ghost.setAttribute("y", top);
  this.ghost.setAttribute("width", width);
  this.ghost.setAttribute("height", height);
  this.editor.document.documentElement.appendChild(this.ghost);
};


RectangleCreator.prototype.onMouseUp = function (x, y) {
  if (! this.ghost)
    return;

  var dx = this.startX - x;
  var dy = this.startY - y;

  var left = this.startX < x ? this.startX : x;
  var top = this.startY < y ? this.startY : y;
  var right = this.startX < x ? x : this.startX;
  var bottom = this.startY < y ? y : this.startY;

  var width = right - left;
  var height = bottom - top;

  if (dx*dx + dy*dy >= this.minLength2) {
    try {
      var tx = new CreateRectTx(this.editor.image, left, top, width, height);
      this.editor.txmgr.doTransaction(tx);
    }
    catch (ex) {
      dump("*** CreateLineTx failed: " + ex + "\n");
    }
  }

  this.ghost.parentNode.removeChild(this.ghost);
  this.ghost = null;
};




function EllipseCreator (aEditor, aEvent) {
  this.ghost = null;
  this.minLength2 = 64; // Minimum square length 8^2 px

  this.init(aEditor, aEvent);
}


EllipseCreator.prototype = new MouseActionController();


EllipseCreator.prototype.onMouseMove = function (x, y) {
  var dx = this.startX - x;
  var dy = this.startY - y;

  // Cut-off: 8px
  if (dx*dx + dy*dy < this.minLength2) {
    if (this.ghost) {
      this.ghost.parentNode.removeChild(this.ghost);
      this.ghost = null;
    }
    return;
  }

  var left = this.startX < x ? this.startX : x;
  var top = this.startY < y ? this.startY : y;
  var right = this.startX < x ? x : this.startX;
  var bottom = this.startY < y ? y : this.startY;

  var rx = (right - left) / 2;
  var ry = (bottom - top) / 2;
  var cx = left + rx;
  var cy = top + ry;

  if (this.ghost) {
    this.ghost.setAttribute("cx", cx);
    this.ghost.setAttribute("cy", cy);
    this.ghost.setAttribute("rx", rx);
    this.ghost.setAttribute("ry", ry);
    return;
  }

  this.ghost = this.editor.document.createElementNS(Cx.NS_SVG, "ellipse");
  this.ghost.setAttribute("stroke-dasharray", "5,5");
  this.ghost.setAttribute("stroke", "lightgrey");
  this.ghost.setAttribute("fill", "none");
  this.ghost.setAttribute("cx", cx);
  this.ghost.setAttribute("cy", cy);
  this.ghost.setAttribute("rx", rx);
  this.ghost.setAttribute("ry", ry);
  this.editor.document.documentElement.appendChild(this.ghost);
};


EllipseCreator.prototype.onMouseUp = function (x, y) {
  if (! this.ghost)
    return;

  var dx = this.startX - x;
  var dy = this.startY - y;

  var left = this.startX < x ? this.startX : x;
  var top = this.startY < y ? this.startY : y;
  var right = this.startX < x ? x : this.startX;
  var bottom = this.startY < y ? y : this.startY;

  var rx = (right - left) / 2;
  var ry = (bottom - top) / 2;
  var cx = left + rx;
  var cy = top + ry;

  if (dx*dx + dy*dy >= this.minLength2) {
    try {
      var tx = new CreateEllipseTx(this.editor.image, cx, cy, rx, ry);
      this.editor.txmgr.doTransaction(tx);
    }
    catch (ex) {
      dump("*** CreateEllipseTx failed: " + ex + "\n");
    }
  }

  this.ghost.parentNode.removeChild(this.ghost);
  this.ghost = null;
};




function TextCreator (aEditor, aEvent) {
  this.init(aEditor, aEvent);
}


TextCreator.prototype = new MouseActionController();


TextCreator.prototype.onMouseMove = function (x, y) {};


TextCreator.prototype.onMouseUp = function (x, y) {
  var config = {
    font: null,
    size: null,
    text: "",
    bold: false,
    italic: false,
    underline: false,
    accepted: false
  };

  openDialog(Cx.CONTENT_PATH + "editors/shottextdialog.xul", "",
    Cx.MODAL_DIALOG_FLAGS, config);

  if (! config.accepted || ! config.text)
    return;

  var tx = new BatchTx();

  var createtx = new CreateTextTx(this.editor.image, x, y, config.text);
  tx.addTransaction(createtx);
  tx.addTransaction(new SetAttrTx(createtx.object, "font-family",
    null, config.font));
  tx.addTransaction(new SetAttrTx(createtx.object, "font-size",
    null, config.size));
  if (config.bold) {
    tx.addTransaction(new SetAttrTx(createtx.object, "font-weight",
      null, "bold"));
  }
  if (config.italic) {
    tx.addTransaction(new SetAttrTx(createtx.object, "font-style",
      null, "italic"));
  }
  if (config.underline) {
    tx.addTransaction(new SetAttrTx(createtx.object, "text-decoration",
      null, "underline"));
  }

  this.editor.txmgr.doTransaction(tx);
};




function GroupCreator (aEditor) {
  this.editor = aEditor;
}


GroupCreator.prototype = {
  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      case "draggesture":
        this.onDragGesture(aEvent);
        break;
      case "mouseup":
        this.onMouseUp(aEvent);
        break;
    }
  },


  onDragGesture: function (aEvent) {
    if (aEvent.target.nodeName != "treechildren")
      return;

    var tree = document.getElementById("palettetree");
    var treeview = tree.view.QueryInterface(
      Components.interfaces.nsITreeContentView);
    var index = treeview.selection.currentIndex;
    if (index < 0) {
      dump("*** GroupCreator.onDragGesture: nothing selected\n");
      return;
    }
    if (treeview.isContainer(index))
      return;

    var item = treeview.getItemAtIndex(index);

    if (! item) {
      dump("*** GroupCreator.onDragGesture: No item\n");
      return;
    }

    this.item = item;

    try {
      this.startDrag(aEvent);
    } catch (ex) {
      dump("*** GroupCreator.startDrag: " + ex + "\n");
    }
  },


  onDragStart: function (aEvent, aXferData, aAction) {
    aXferData.data = new TransferData();
    aXferData.data.addDataForFlavour("text/x-moz-url",
      this.item.id + "\n" + this.item.getAttribute("category"));

    var region = Components.classes["@mozilla.org/gfx/region;1"]
      .createInstance(Components.interfaces.nsIScriptableRegion);
    region.init();
    var x = aEvent.clientX;
    var y = aEvent.clientY;
    var width = 64;
    var height = 64;
    region.setToRect(x, y, width, height);
    aAction.dragrect = region;
  },


  // Modified version of nsDragAndDrop.startDrag with additional |dragrect|
  // field for specifying the drag rect in the |action| parameter
  startDrag: function (aEvent) {
    const kDSIID = Components.interfaces.nsIDragService;
    var dragAction = {
      action: kDSIID.DRAGDROP_ACTION_COPY |
              kDSIID.DRAGDROP_ACTION_MOVE |
              kDSIID.DRAGDROP_ACTION_LINK,
      dragrect: null
    };
    var transferData = { data: null };
    try {
      this.onDragStart(aEvent, transferData, dragAction);
    }
    catch (ex) {
      dump("*** onDragStart failed: " + ex + "\n");
      return;
    }
    if (! transferData.data) {
      dump("*** startDrag: No data\n");
      return;
    }
    transferData = transferData.data;

    var transArray = createSupportsArray();
    var count = 0;
    do {
      var trans = nsTransferable.set(transferData._XferID == "TransferData"
        ? transferData : transferData.dataList[count++]);
      transArray.AppendElement(trans.QueryInterface(
        Components.interfaces.nsISupports));
    }
    while (transferData.XferID == "TransferDataSet" &&
           count < transferData.dataList.length);
    try {
      nsDragAndDrop.mDragService.invokeDragSession(aEvent.target, transArray,
        dragAction.dragrect, dragAction.action);
    }
    catch (ex) {
      dump("*** invokeDragSession failed: " + ex + "\n");
    }
    aEvent.stopPropagation();
  }
};




function SelectionCreator (aEditor, aEvent) {
  this.rect = null;

  this.init(aEditor, aEvent);
}


SelectionCreator.prototype = new MouseActionController();


SelectionCreator.prototype.onMouseMove = function (x, y) {
  var width = Math.abs(x - this.startX);
  var height = Math.abs(y - this.startY);
  var kMinLength = 8;

  if (this.startX < x)
    x = this.startX;
  if (this.startY < y)
    y = this.startY;

  if (width < kMinLength || height < kMinLength) {
    if (this.rect) {
      this.rect.parentNode.removeChild(this.rect);
      this.rect = null;
    }
    return;
  }

  if (! this.rect) {
    var doc = this.editor.document;
    this.rect = doc.createElementNS(Cx.NS_SVG, "rect");
    this.rect.setAttribute("stroke", "blue");
    // this.rect.setAttribute("stroke-dasharray", "4,4");
    this.rect.setAttribute("fill", "blue");
    this.rect.setAttribute("fill-opacity", "0.05");
    this.editor.document.documentElement.appendChild(this.rect);
  }

  this.rect.setAttribute("x", x);
  this.rect.setAttribute("y", y);
  this.rect.setAttribute("width", width);
  this.rect.setAttribute("height", height);
};


SelectionCreator.prototype.onMouseUp = function (x, y) {
  // If the rect was too small, we don't display it, so don't
  // try to turn it into a selection.
  if (! this.rect)
    return;

  this.rect.parentNode.removeChild(this.rect);
  this.rect = null;

  var x1 = Math.min(x, this.startX);
  var x2 = Math.max(x, this.startX);
  var y1 = Math.min(y, this.startY);
  var y2 = Math.max(y, this.startY);

  var docel = this.editor.document.documentElement;
  var selrect = docel.createSVGRect();
  selrect.x = x1;
  selrect.width = x2 - x1;
  selrect.y = y1;
  selrect.height = y2 - y1;

  var kBandPadding = 3;

  var selected = [];
  var ISVGG = Components.interfaces.nsIDOMSVGGElement;
  var docel = this.editor.document.documentElement;
  var children = this.editor.image.childNodes;
  for (var i = 0; i < children.length; ++i) {
    if (children[i] instanceof Components.interfaces.nsIDOMSVGLocatable) {
      var bbox = children[i].getBBox();
      if (children[i] instanceof ISVGG) {
        bbox = bboxForTransformGroup(children[i], docel);
      }
      if (rectIntersectsRect(selrect, bbox)) {
        selected.push(children[i]);
      }
    }
  }

  if (selected.length == 0)
    return;

  var selection = null;
  if (selected.length == 1) {
    var selection = SVGSelectionFactory.selectionForObject(selected[0]);
    selection.init(this.editor, selected[0], this.editor.txmgr);
  }
  else {
    var selection = new MultiSelection();
    selection.init(this.editor, selected, this.editor.txmgr);
  }

  this.editor.selectionController = selection;
  this.editor.updateSelectionCommands();
};
