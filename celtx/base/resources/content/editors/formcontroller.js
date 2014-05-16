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
 * A controller for a breakdown item form.
 * @param name  the form name
 */
function FormController (name) {
  this.formName = name;
  this.commands = {
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1,
  };
  this.openwindows = { findreplace: null, spellcheck: null };
}


FormController.prototype.supportsCommand = function (cmd) {
  return this.commands[cmd] == 1;
};


FormController.prototype.isCommandEnabled = function (cmd) {
  // XXX
  switch (cmd) {
    case "cmd-print-preview":
      return ! this.inPrintPreview;
    case "cmd-page-setup":
    case "cmd-print":
      return true;
    default:
      return false;
  }
};


FormController.prototype.doCommand = function (cmd) {
  // XXX
  switch (cmd) {
    case "cmd-page-setup":
      PrintUtils.showPageSetup();
      break;
    case "cmd-print":
      this.print();
      break;
    case "cmd-print-preview":
      this.printPreview();
      break;
  }
};


FormController.prototype.print = function (preview, enterHook, exitHook) {
  var doc = document.getElementById("sheet").contentDocument;
  var inputs = doc.forms[0].elements;
  for (var i = 0; i < inputs.length; i++) {
    if (inputs[i].type!="radio") {
      // inputs[i].nextSibling.innerHTML=inputs[i].value;
      var text = "";
      if (inputs[i].type == "select-one") {
        var idx = inputs[i].selectedIndex;
        if (idx >= 0) {
          var options = inputs[i].getElementsByTagName("option");
          text = doc.createTextNode(options[idx].text);
        }
      }
      else {
        text = doc.createTextNode(inputs[i].value);
      }
      var printdiv = inputs[i].nextSibling;
      if (printdiv.hasChildNodes() && printdiv.firstChild)
        printdiv.replaceChild(text, printdiv.firstChild);
      else
        printdiv.appendChild(text);
    }
  }

  if (preview)
    PrintUtils.printPreview(enterHook, exitHook);
  else
    PrintUtils.print();
};


FormController.prototype.printPreview = function () {
  this.print(true, onEnterPrintPreview, onExitPrintPreview);
};


FormController.prototype.updateCommands = function () {
  for (var cmd in this.commands)
    goUpdateCommand(cmd);
  top.goUpdateCommand("cmd-print-preview");
};


FormController.prototype.open = function (project, docres) {
  this.project  = project;
  this.model    = new RDFModel(project.ds);
  this.docres   = RES(docres.Value);
  var itemres   = this.model.target(this.docres, PROP("dc:source"));
  var doctype   = this.model.target(this.docres, PROP("rdf:type"));
  // Check if we've already got a breakdown item association
  if (itemres) {
    this.res = itemres;
    return;
  }
  // Check if we were passed the breakdown item itself (for use in
  // catalog displays).
  var doctype   = this.model.target(this.docres, PROP("cx:doctype"));
  if (! doctype) {
    this.res = this.docres;
    return;
  }

  var docsds    = getRDFService().GetDataSourceBlocking(Cx.DOCTYPES_URL);
  var docmodel  = new RDFModel(docsds);
  var category  = docmodel.target(doctype, PROP("cx:category"));
  if (! category) {
    this.res = this.docres;
    return;
  }

  var title = this.model.target(this.docres, PROP("dc:title"));
  this.res = RES(Cx.DOCUMENTS_URL + generateID());
  this.model.add(this.res, PROP("dc:title"), title);
  this.model.add(this.res, PROP("rdf:type"), category);
  this.model.add(this.docres, PROP("dc:source"), this.res);
};


FormController.prototype.modified getter = function () {
  return this.form ? this.form.modified : false;
};


FormController.prototype.save = function () {
  if (! this.form)
    return;

  this.store();
  this.form.reset();
  // this.populate();  // Re-populate
  /*
  var self = this;
  function delayedPopulate () { self.populate(); };
  setTimeout(delayedPopulate, 100);
  */
};


/**
 * Determines whether or not a field is a calculated field.
 * @param name  the name of the field
 * @type boolean
 * @return true if the field is a calculated field
 */
FormController.prototype.isCalculatedField = function (name) {
  if (name == "scenesUsed")
    return true;

  return false;
};


FormController.prototype.isResourceProperty = function (name) {
  if (name == "actor")
    return true;

  return false;
};


FormController.prototype.store = function () {
  // if (! this.form.modified) return;
  this.project.ds.beginUpdateBatch();
  var rdfsvc = getRDFService();
  try {
    for (var e in this.form.changedFields) {
      // This is a read-only attribute
      if (this.isCalculatedField(e))
        continue;

      var vals = this.form.values(e);

      if (this.form.schema[e].type == 'media') {
        this.updateComplex(this.propMap[e], vals);
      }
      else if (this.isResourceProperty(e)) {
        if (vals[0])
          setRDFObject(this.project.ds, this.res.resource(rdfsvc),
            rdfsvc.GetResource(this.propMap[e]), rdfsvc.GetResource(vals[0]));
        else
          clearRDFObject(this.project.ds, this.res.resource(rdfsvc),
            rdfsvc.GetResource(this.propMap[e]));
      }
      else {
        this.updateResource(this.propMap[e], vals);
      }
    }
  }
  catch (ex) {
    dump("*** store: " + ex + "\n");
  }
  this.project.ds.endUpdateBatch();
};


FormController.prototype.updateResource = function (prop, vals) {
  try {
    setCustomPropValues(this.model, this.res, RES(prop), vals);
  }
  catch (ex) {
    dump("*** updateResource: " + ex + "\n");
  }
};


FormController.prototype.updateComplex = function (prop, vals) {
  // For now, the only complex type is a media sequence

  try {
    var mediaSeq = this.model.target(this.res, RES(prop));
    if (! mediaSeq) {
      // Don't do anything if there's no sequence and no values to put in it
      if (vals.length == 0)
        return;

      // Mint one
      mediaSeq = RES(this.project.mintURI());
      this.model.add(this.res, RES(prop), mediaSeq);
    }

    var cont = null;
    if (this.model.isContainer(mediaSeq)) {
      cont = this.model.container(mediaSeq);
    }
    else {
      cont = this.model.makeSeq(mediaSeq);
    }

    var list, i;
    var left = {};

    list = cont.elements();
    for (i = 0; i < list.length; i++) {
      left[list[i].value] = 1;
    }

    var typeMap = {};
    typeMap['video'] = Cx.NS_CX + 'Video';
    typeMap['audio'] = Cx.NS_CX + 'Audio';
    typeMap['image'] = Cx.NS_CX + 'Image';

    var rec, res, leafName;
    for (i = 0; i < vals.length; i++) {
      rec = vals[i];
      if (! rec.uri) {
        // Media files are added immediately, so this code path is now dead
        throw "No uri on media item!";
      }
      else {
        res = RES(rec.uri);
        if (cont.indexOf(res) < 0)
          cont.append(res);
        delete left[rec.uri];
      }

      setLiteralProp(this.model, res, PROP('dc:title'), LIT(rec.title));
    }

    // Delete leftovers
    for (var uri in left) {
      res = RES(uri);
      cont.remove(res);
      // Find and remove all properties of resource
      list = this.model.find(res, null, null);
      for (i = 0; i < list.length; i++) {
        this.model.remove(list[i][0], list[i][1], list[i][2]);
      }
    }

    if (cont.length == 0)
      this.model.remove(this.res, RES(prop), mediaSeq);
  }
  catch (ex) {
    dump("*** updateComplex: " + ex + "\n");
  }
};


FormController.prototype.close = function () {
  if (! this.form)
    return;

  if (this.form.modified) {
    // TODO: prompt to save if modified
    this.store();
  }

  window.controllers.removeController(this);
};


FormController.prototype.focus = function () {
  var sheet = document.getElementById("sheet");
  if (! sheet)
    return;
  sheet.setAttribute("type", "content-primary");
  if (this.form)
    this.populate();
};


FormController.prototype.blur = function () {
  if (this.inPrintPreview)
    PrintUtils.exitPrintPreview();
  var sheet = document.getElementById("sheet");
  if (! sheet)
    return;
  sheet.setAttribute("type", "content");
  if (this.modified) {
    this.save();
    this.project.isModified = true;
  }
};


FormController.prototype.checkSpelling = function () {

};


FormController.prototype.findReplace = function (showReplace) {

};


FormController.prototype.findAgain = function (cmd) {

};


/**
 * Attaches the FormController to a specific datasheet form, making
 * necessary bindings to form fields.
 * @param form  the datasheet to bind with
 */
FormController.prototype.attach = function (form) {
  try {
    this.form = form;
    form.project = this.project;
    this.buildSchema();
    this.populatePopups();
  }
  catch (ex) {
    dump("*** attach: " + ex + "\n");
  }
};


FormController.prototype.setTitle = function (title) {
  try {
    var doc = this.form.contentDocument;
    var labels = doc.getElementsByTagName('itemlabel');
    var label = labels[0];
    if (! label) return;
    while (label.hasChildNodes()) {
      label.removeChild(label.lastChild);
    }
    label.appendChild(doc.createTextNode(title));
  }
  catch (ex) {
    dump("*** setTitle: " + ex + "\n");
  }

};


/**
 * Creates a bijection mapping form field names to RDF predicates
 * and vice versa. These are stored as propMap and nameMap respectively.
 */
FormController.prototype.buildSchema = function () {
  this.propMap = {};
  this.nameMap = {};

  // Title is Dublin Core
  this.nameMap[Cx.NS_DC + "title"] = "title";
  this.propMap["title"] = Cx.NS_DC + "title";

  // Description is Dublin Core
  this.nameMap[Cx.NS_DC + "description"] = "description";
  this.propMap["description"] = Cx.NS_DC + "description";

  // Comments, Media, and Tags are global
  this.nameMap[Cx.NS_CX + "comments"] = "comments";
  this.propMap["comments"] = Cx.NS_CX + "comments";

  this.nameMap[Cx.NS_CX + "media"] = "media";
  this.propMap["media"] = Cx.NS_CX + "media";

  this.nameMap[Cx.NS_CX + "tags"] = "tags";
  this.propMap["tags"] = Cx.NS_CX + "tags";

  // cx:scriptName corresponds to script-name
  this.nameMap[Cx.NS_CX + "scriptName"] = "script-name";
  this.propMap["script-name"] = Cx.NS_CX + "scriptName";

  this.nameMap[Cx.NS_CX + "actor"] = "actor";
  this.propMap["actor"] = Cx.NS_CX + "actor";

  this.nameMap[Cx.NS_CX + "department"] = "department";
  this.propMap["department"] = Cx.NS_CX + "department";

  this.nameMap[Cx.NS_CX + "scenesUsed"] = "scenesUsed";
  this.propMap["scenesUsed"] = Cx.NS_CX + "scenesUsed";

  this.nameMap[Cx.NS_CX + "scheduleID"] = "scheduleid";
  this.propMap["scheduleid"] = Cx.NS_CX + "scheduleID";

  try {
    for (var name in this.form.schema) {
      var prop = this.customPropertyURI(name);
      if (! this.propMap[name]) {
        this.propMap[name] = prop;
        this.nameMap[prop] = name;
      }
    }
  }
  catch (ex) {
    dump("*** buildSchema: " + ex + "\n");
  }
};


/**
 * Populate any popups in the form that draw from the RDF, such as
 * Actor selectors.
 */
FormController.prototype.populatePopups = function () {
  var rdfsvc = getRDFService();
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
  var selects = this.form.form.getElementsByTagName("select");
  for (var i = 0; i < selects.length; ++i) {
    if (selects[i].name == "actor") {
      var typeres = rdfsvc.GetResource(Cx.NS_CX + "Actor");
      var actors = this.project.ds.GetSources(typearc, typeres, true);
      while (actors.hasMoreElements()) {
        var actor = actors.getNext().QueryInterface(
          Components.interfaces.nsIRDFResource);
        var title = getRDFString(this.project.ds, actor, titlearc);
        var opt = this.form.contentDocument.createElement("option");
        opt.setAttribute("label", title);
        opt.setAttribute("value", actor.Value);
        opt.appendChild(this.form.contentDocument.createTextNode(title));
        selects[i].appendChild(opt);
      }
    }
    else if (selects[i].name == "department") {
      var labelarc = rdfsvc.GetResource(Cx.NS_RDFS + "label");
      var schemads = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
      var deptseq = rdfsvc.GetResource(Cx.SCHEMA_URL + "#default-markup");
      deptseq = new RDFSeq(schemads, deptseq);
      for (var j = 0; j < deptseq.length; ++j) {
        var dept = deptseq.get(j).QueryInterface(
          Components.interfaces.nsIRDFResource);
        var title = getRDFString(schemads, dept, labelarc);
        var opt = this.form.contentDocument.createElement("option");
        opt.setAttribute("label", title);
        opt.setAttribute("value", dept.Value);
        opt.appendChild(this.form.contentDocument.createTextNode(title));
        selects[i].appendChild(opt);
      }
    }
  }
};


/**
 * Creates an RDF predicate based on a field name.
 * @param name  a field name
 * @type string
 * @return an RDF predicate corresponding to the field name
 */
FormController.prototype.customPropertyURI = function (name) {
  return this.project.res.Value + '/NS/' + this.formName + '-' + name;
};


/**
 * Populates the attached form's fields with stored values.
 */
FormController.prototype.populate = function () {
  try {
    var title = this.model.target(this.res, PROP('dc:title'));
    this.setTitle(title.value);

    var rec = this.fetch();
    this.form.fill(rec);
    this.form.reset();
  }
  catch (ex) {
    dump("*** populate: " + rec + "\n" + ex + "\n");
  }
};


/**
 * Fetch stored values for the attached form.
 * @type object
 * @return an object mapping field names to stored values
 */
FormController.prototype.fetch = function () {
  var rec = {};
  var e, i, p, targets;

  for (e in this.propMap) {
    rec[e] = [];
    if (this.isCalculatedField(e)) {
      rec[e].push(this.fetchCalculated(e));
    }
    else {
      p = this.propMap[e];
      targets = this.model.targets(this.res, RES(p));
      for (i = 0; i < targets.length; i++) {
        if (targets[i].type == 'resource') {
          // There should be only one target
          if (! this.form.schema[e]) {
            throw "No schema record for " + e;
          }
          rec[e] = this.fetchComplex(targets[i], this.form.schema[e].type);
        }
        else {
          rec[e].push(targets[i].value);
        }
      }
    }
  }

  return rec;
};


FormController.prototype.fetchCalculated = function (kind) {
  var values = [];

  if (kind == "scenesUsed") {
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var ds = this.project.ds;
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
    var ordarc = rdfsvc.GetResource(Cx.NS_CX + "ordinal");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");
    var membersarc = rdfsvc.GetResource(Cx.NS_CX + "members");
    var scripts = [];
    var types = [ 'ScriptDocument', 'AVDocument', 'TheatreDocument',
      'RadioDocument', 'ComicDocument' ];
    for (var i = 0; i < types.length; ++i) {
      var scripttype = rdfsvc.GetResource(Cx.NS_CX + types[i]);
      var scriptlist = ds.GetSources(doctypearc, scripttype, true);
      while (scriptlist.hasMoreElements())
        scripts.push(scriptlist.getNext().QueryInterface(IRes));
    }
    for (var i = 0; i < scripts.length; ++i) {
      var scriptused = false;
      var scriptname = getRDFString(ds, scripts[i], titlearc);
      var scenes = ds.GetTarget(scripts[i], scenesarc, true);
      if (! (scenes && scenes instanceof IRes)) {
        dump("*** no scenes for script " + scriptname + "\n");
        continue;
      }
      scenes = new RDFSeq(ds, scenes.QueryInterface(IRes));
      for (var j = 0; j < scenes.length; ++j) {
        var sceneres = scenes.get(j).QueryInterface(IRes);
        var scene = new Scene(ds, sceneres);
        if (! scene.containsItem(this.res.resource(rdfsvc)))
          continue;
        if (! scriptused) {
          scriptused = true;
          values.push(scriptname);
        }
        var scenetitle = getRDFString(ds, sceneres, ordarc) + ". "
          + getRDFString(ds, sceneres,  titlearc);
        values.push(scenetitle);
      }
    }
  }

  return values.join("\n");
};


FormController.prototype.fetchComplex = function (res, kind) {
  if (kind == "select-one") {
    return [ res.value ];
  }

  // Only one type for now
  if (kind != 'media') return [];

  var typeMap = {};
  typeMap[Cx.NS_CX + 'Video'] = 'video';
  typeMap[Cx.NS_CX + 'Audio'] = 'audio';
  typeMap[Cx.NS_CX + 'Image'] = 'image';

  if (! this.model.isContainer(res)) {
    dump("*** fetchComplex: not a container\n");
    return [];
  }

  var rec, item, title, leaf, type;
  var items = [];
  var cont = this.model.container(res);
  var list = cont.elements();

  for (var i = 0; i < list.length; i++) {
    item = list[i];

    rec = { uri: item.value, title: '', src: '', type: '' };

    title = this.model.target(item, PROP('dc:title'));
    if (title) rec.title = title.value;

    leaf = this.model.target(item, PROP('cx:localFile'));
    if (leaf) rec.src = this.project.fileURLOf(leaf.value);

    type = this.model.target(item, PROP('rdf:type'));
    // if (type) rec.type = typeMap[type.value];
    if (type) rec.type = type.value;
    
    items.push(rec);
  }

  return items;
};


function onEnterPrintPreview () {
  /*
  var printPreviewTB = document.createElementNS(XUL_NS, "toolbar");
  printPreviewTB.setAttribute("printpreview", true);
  printPreviewTB.setAttribute("id", "print-preview-toolbar");
  getBrowser().parentNode.insertBefore(printPreviewTB, getBrowser());
  */
  document.getElementById("formtoolbar").hidden = true;
  gController.inPrintPreview = true;
  gController.updateCommands();
  getBrowser().contentWindow.focus();
}


function onExitPrintPreview () {
  /*
  var printPreviewTB = document.getElementById("print-preview-toolbar");
  if (printPreviewTB)
    printPreviewTB.parentNode.removeChild(printPreviewTB);
  */
  document.getElementById("formtoolbar").hidden = false;
  gController.inPrintPreview = false;
  gController.updateCommands();
}

