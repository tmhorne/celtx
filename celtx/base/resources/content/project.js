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

function Project (fileuri) {
  try {
    var file = fileURLToFile(fileuri);
    sanitizeUTF8File(file);
  }
  catch (ex) {
    dump("*** sanitizeUTF8File: " + ex + "\n");
  }
  var rdfsvc = getRDFService();
  this.ds = rdfsvc.GetDataSourceBlocking(fileuri);

  if (! this.ds)
    throw "Invalid project.rdf datasource: " + fileuri;

  // Force refresh, since datasources can be cached
  try {
    var IRemoteDS = Components.interfaces.nsIRDFRemoteDataSource;
    var rds = this.ds.QueryInterface(IRemoteDS);
    rds.Refresh(true);
  }
  catch (ex) {
    dump("*** Project.constructor: " + ex + "\n");
  }

  this.dir = fileURLToFile(fileuri).parent;
  this.model = new RDFModel(this.ds);

  this.init();
}


Project.SAVE_TO_DISK = 1;
Project.SAVE_TO_SERVER = 2;


Project.prototype = {
  saveLocation: null,


  init: function init () {
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var rdfTypeArc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var projType = rdfsvc.GetResource(Cx.NS_CX + "Project");
    var compArc = rdfsvc.GetResource(Cx.NS_CX + "components");
    this.res = this.ds.GetSource(rdfTypeArc, projType, true);
    if (! this.res) {
      throw "Couldn't locate cx:Project resource in project.rdf";
    }
    this.components = this.ds.GetTarget(this.res, compArc, true);
    if (! this.components) {
      this.components = rdfsvc.GetResource(this.mintURI());
      this.ds.Assert(this.res, compArc, this.components, true);
    }
    this.components = new RDFSeq(this.ds, this.components);

    // Check for the project pseudo-folder
    var projectRootArc = rdfsvc.GetResource(Cx.NS_CX + "projectRoot");
    var trueLit = rdfsvc.GetLiteral("true");
    if (this.components.length == 1 &&
        this.ds.HasAssertion(this.components.get(0), projectRootArc,
                             trueLit, true)) {
      this._rootFolder = new RDFSeq(this.ds, this.components.get(0));
    }
    else {
      this._rootFolder = this.components;
      this.ds.Unassert(this.res, compArc, this._rootFolder.res);
      this.ds.Assert(this._rootFolder.res, projectRootArc, trueLit, true);
      // For backwards compatibility: Make sure the project pseudo-folder
      // has a dc:title so it shows up in the old XUL template.
      var titleArc = rdfsvc.GetResource(Cx.NS_DC + "title");
      var projTitle = this.ds.GetTarget(this.res, titleArc, true);
      if (projTitle)
        this.ds.Assert(this._rootFolder.res, titleArc, projTitle, true);
      this.components = rdfsvc.GetResource(this.mintURI());
      this.ds.Assert(this.res, compArc, this.components, true);
      this.components = new RDFSeq(this.ds, this.components);
      this.components.push(this._rootFolder.res);
    }

    // Check for the "Project Catalog" document
    var hasProjCatalog = false;
    if (this._rootFolder.length > 0) {
      var catalog = this._rootFolder.get(0);
      catalog = catalog.QueryInterface(IRes);
      var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
      var doctype = this.ds.GetTarget(catalog, doctypearc, true);
      if (doctype && doctype instanceof IRes) {
        doctype = doctype.QueryInterface(IRes);
        if (doctype.Value == Cx.NS_CX + "CatalogDocument") {
          hasProjCatalog = true;
          this.masterCatalog = catalog;
        }
      }
    }
    if (! hasProjCatalog) {
      var catalog = rdfsvc.GetResource(this.mintURI());
      this.masterCatalog = catalog;
      var typeres = rdfsvc.GetResource(Cx.NS_CX + "Document");
      var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
      var doctype = rdfsvc.GetResource(Cx.NS_CX + "CatalogDocument");
      var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
      var filterarc = rdfsvc.GetResource(Cx.NS_CX + "filter");
      var filter = rdfsvc.GetResource("celtx:filter:all");
      var title = gApp.getText("ProjectCatalog");
      this.ds.Assert(catalog, rdfTypeArc, typeres, true);
      this.ds.Assert(catalog, doctypearc, doctype, true);
      this.ds.Assert(catalog, filterarc, filter, true);
      setRDFString(this.ds, catalog, titlearc, title);
      this._rootFolder.insert(catalog, 0);
    }
    this.flush();
  },


  get id () {
    return this.res.Value.replace(/^.*\//, "");
  },


  get wsref () {
    var wsarc = getRDFService().GetResource(Cx.NS_CX + "wsref");
    return getRDFString(this.ds, this.res, wsarc);
  },


  set wsref (val) {
    var wsarc = getRDFService().GetResource(Cx.NS_CX + "wsref");
    setRDFString(this.ds, this.res, wsarc, val);
    return val;
  },


  changeProjectID: function changeProjectID () {
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var projres = this.res;
    var newprojres = rdfsvc.GetResource(Cx.PROJECTS_URL + "/" + generateID());
    var oldFormPrefix = this.res.Value + '/NS/';
    var newFormPrefix = newprojres.Value + '/NS/';
    this.ds.beginUpdateBatch();
    try {
      changeAllRDFArcsIn(this.ds, projres, newprojres);
      changeAllRDFArcsIn(this.localDS, projres, newprojres);
      changeAllRDFArcsOut(this.ds, projres, newprojres);
      changeAllRDFArcsOut(this.localDS, projres, newprojres);
      // Fix up forms
      var srcs = this.ds.GetAllResources();
      while (srcs.hasMoreElements()) {
        var src = srcs.getNext().QueryInterface(IRes);
        var arcs = this.ds.ArcLabelsOut(src);
        while (arcs.hasMoreElements()) {
          var arc = arcs.getNext().QueryInterface(IRes);
          if (arc.Value.indexOf(oldFormPrefix) != 0)
            continue;
          var newarc = rdfsvc.GetResource(newFormPrefix
            + arc.Value.substring(oldFormPrefix.length));
          var tgts = this.ds.GetTargets(src, arc, true);
          while (tgts.hasMoreElements()) {
            var tgt = tgts.getNext();
            this.ds.Unassert(src, arc, tgt);
            this.ds.Assert(src, newarc, tgt, true);
          }
        }
      }
    }
    catch (ex) {
      dump("*** changeProjectID: " + ex + "\n");
    }
    this.ds.endUpdateBatch();
    this.res = newprojres;
    return newprojres;
  },


  // All statements we use are reachable from the project, so we can mark
  // all those statements and purge the rest.
  purgeUnreachableStatements: function () {
    var IPurgeable = Components.interfaces.nsIRDFPurgeableDataSource;
    if (! (this.ds instanceof IPurgeable)) {
      dump("*** project datasource is not purgeable\n");
      return;
    }
    var purgeds = this.ds.QueryInterface(IPurgeable);
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var rsrcs = [ this.res ];
    var seen = {};
    while (rsrcs.length > 0) {
      var res = rsrcs.shift();
      if (res.Value in seen)
        continue;
      seen[res.Value] = 1;
      var arcs = this.ds.ArcLabelsOut(res);
      while (arcs.hasMoreElements()) {
        var arc = arcs.getNext().QueryInterface(IRes);
        var tgts = this.ds.GetTargets(res, arc, true);
        while (tgts.hasMoreElements()) {
          var tgt = tgts.getNext();
          purgeds.Mark(res, arc, tgt, true);
          if (tgt instanceof IRes)
            rsrcs.push(tgt.QueryInterface(IRes));
        }
      }
    }
    purgeds.Sweep();
  },


  flush: function flush () {
    // this.ds.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource)
    //   .Flush();
    // To make it easier to move projects around, flush will manually
    // serialize the datasource, recreating the path each time.
    try {
      var serializer = this.ds.QueryInterface(
        Components.interfaces.nsIRDFXMLSource);
      var dsfile = this.projectFolder;
      dsfile.append(Cx.PROJECT_FILE);
      if (! dsfile.exists())
        dsfile.create(0, 0600);
      dsfile.permissions = 0600;
      var bfos = getBufferedFileOutputStream(dsfile);
      serializer.Serialize(bfos);
      bfos.close();
      this.flushLocalDS();
    }
    catch (ex) {
      dump("*** Project.flush: " + ex + "\n");
    }
  },


  // The on-disk folder
  get projectFolder () {
    return this.dir.clone();
  },


  set projectFolder (val) {
    this.dir = val.clone();
  },


  get rootFolder () {
    return this._rootFolder;
  },


  // For use when creating a project from a template.
  // Don't use while the project is already attached to a project window,
  // or you will just give yourself a headache!
  changeAllIDs: function changeAllIDs () {
    // No cx:doctype arc on a project, so we need to duplicate some
    // functionality here. docrules.rdf has to be acyclic at the moment, and
    // it doesn't allow any pattern matching to pick a rule based on the
    // same arc, which rules out a way to copy the document tree.
    this.ds.beginUpdateBatch();
    try {
      var rdfsvc = getRDFService();
      var ruleds = rdfsvc.GetDataSourceBlocking(
        Cx.CONTENT_PATH + "docrules.rdf");
      var ruleres = rdfsvc.GetResource(Cx.NS_CX + "DocRule/Project");
      var newprojres = rdfsvc.GetResource(Cx.PROJECTS_URL + "/" + generateID());
      var projres = this.res;
      var projrule = new DocTypeRule(ruleres, ruleds);
      projrule.copy(projres, newprojres, this, this);
      projrule.clear(projres, this);
      var componentsarc = rdfsvc.GetResource(Cx.NS_CX + "components");
      var components = this.components;
      this.ds.Assert(newprojres, componentsarc, components.res, true);
      this.ds.Unassert(projres, componentsarc, components.res);
      this.changeAllDocuments(components, ruleds);
      this.ds.endUpdateBatch();
      this.res = newprojres;
      return newprojres;
    }
    catch (ex) {
      dump("*** changeAllIDs: " + ex + "\n");
      this.ds.endUpdateBatch();
      return null;
    }
  },


  changeAllDocuments: function changeAllDocuments (seq, ruleds) {
    var IRes = Components.interfaces.nsIRDFResource;
    var cu = getRDFContainerUtils();
    var items = seq.toArray();
    for (var i = 0; i < items.length; ++i) {
      if (! (items[i] instanceof IRes))
        continue;
      items[i] = items[i].QueryInterface(IRes);
      if (cu.IsSeq(this.ds, items[i])) {
        this.changeAllDocuments(new RDFSeq(this.ds, items[i]), ruleds);
      }
      else {
        try {
          var docres = renameDocument(items[i], this, ruleds);
          seq.remove(i);
          seq.insert(docres, i);
        }
        catch (ex) {
          dump("*** changeAllDocuments: Failed to rename " + items[i].Value
            + "\n");
          throw ex;
        }
      }
    }
  },


  // If second argument is null, root level is assumed
  createFolder: function createFolder (title, parent) {
    if (parent)
      parent = new RDFSeq(this.ds, parent);
    else
      parent = this.rootFolder;
    var rdfsvc = getRDFService();
    var folder = rdfsvc.GetResource(this.mintURI());
    parent.push(folder);
    var titleArc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var typeArc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var folderType = rdfsvc.GetResource(Cx.NS_CX + "Folder");
    this.ds.Assert(folder, titleArc, rdfsvc.GetLiteral(title), true);
    this.ds.Assert(folder, typeArc, folderType, true);
    folder = new RDFSeq(this.ds, folder);
    this.flush();
    return folder;
  },


  isEmpty: function () {
    return this.rootFolder.length == 0;
  },


  // If the third argument is null, root level is assumed
  createDocument: function createDocument (title, docType, parent, source) {
    if (parent)
      parent = new RDFSeq(this.ds, parent);
    else
      parent = this.rootFolder;
    var rdfsvc = getRDFService();
    var rdfTypeArc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var rdfType = rdfsvc.GetResource(Cx.NS_CX + "Document");
    var docTypeArc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
    var titleArc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var sourceArc = rdfsvc.GetResource(Cx.NS_DC + "source");
    var docres = rdfsvc.GetResource(this.mintURI());
    this.ds.Assert(docres, rdfTypeArc, rdfType, true);
    this.ds.Assert(docres, docTypeArc, docType, true);
    this.ds.Assert(docres, titleArc, rdfsvc.GetLiteral(title), true);
    if (source && source instanceof Components.interfaces.nsIRDFNode)
      this.ds.Assert(docres, sourceArc, source, true);
    parent.push(docres);
    this.flush();
    return docres;
  },


  addFileToDocument: function addFileToDocument (file, docres, type) {
    var prop = 'localFile';
    if (type && type == 'secondary') prop = 'auxFile';

    var rdfsvc   = getRDFService();
    var fileProp = rdfsvc.GetResource(Cx.NS_CX + prop);
    var fileName = rdfsvc.GetLiteral(file.leafName);

    this.ds.Assert(docres, fileProp, fileName, true);
  },


  parentFolder: function parentFolder (docres) {
    var IRes = Components.interfaces.nsIRDFResource;
    var folders = [ this.rootFolder ];
    var cu = getRDFContainerUtils();
    while (folders.length > 0) {
      var folder = folders.shift();
      var count = folder.length;
      for (var i = 0; i < count; i++) {
        var res = folder.get(i).QueryInterface(IRes);
        if (res.Value == docres.Value)
          return folder;
        if (cu.IsSeq(this.ds, res))
          folders.push(new RDFSeq(this.ds, res));
      }
    }
    return null;
  },


  removeDocument: function removeDocument (docres) {
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var ILit = Components.interfaces.nsIRDFLiteral;

    try {
      var file = this.fileForResource(docres);
      if (file && file.exists()) file.remove(false);

      var auxFile = this.fileForResource(docres, 'secondary');
      if (auxFile && auxFile.exists()) auxFile.remove(false);
    }
    catch (ex) {
      dump("*** Project.removeDocument: file: " + ex + "\n");
    }

    var parent = this.parentFolder(docres);
    if (parent)
      parent.remove(docres);
    else
      dump("*** Project.removeDocument: Couldn't find parent folder\n");
    var arcs = this.ds.ArcLabelsOut(docres);
    while (arcs.hasMoreElements()) {
      var arc = arcs.getNext().QueryInterface(IRes);
      var targets = this.ds.GetTargets(docres, arc, true);
      while (targets.hasMoreElements()) {
        var target = targets.getNext();
        this.ds.Unassert(docres, arc, target);
      }
    }
  },


  fileURLOf: function fileURLOf (relPath) {
    try {
      var f = this.projectFolder;
      f.append(relPath);
      return fileToFileURL(f);
    }
    catch (ex) {
      dump("fileURLOf: " + ex + "\n");
      return '';
    }
  },


  fileForResource: function (res, type) {
    try {
      var IRes = Components.interfaces.nsIRDFResource;
      var ILit = Components.interfaces.nsIRDFLiteral;
      var prop = 'localFile';
      if (type && type == 'secondary') prop = 'auxFile';

      var rdfsvc   = getRDFService();
      var fileProp = rdfsvc.GetResource(Cx.NS_CX + prop);
      var filename = this.ds.GetTarget(res, fileProp, true);

      if (! (filename && filename instanceof ILit))
        return null;
      filename = filename.QueryInterface(ILit);

      var file = this.projectFolder;
      file.append(filename.Value);
      return file;
    }
    catch (ex) {
      dump("fileForResource: " + ex + "\n");
    }

    return null;
  },

  
  localFileFor: function (res) {
    try {
      return this.fileForResource(res);
    }
    catch (ex) {
      dump("localFileFor: " + ex + "\n");
    }

    return null;
  },


  get localDS () {
    if (this._localDS) return this._localDS;

    var file = this.projectFolder;
    file.append(Cx.LOCAL_DS_FILE);

    if (! file.exists()) {
      var ds = getInMemoryDataSource();
      serializeDataSourceToFile(ds, file);
    }

    var url = fileToFileURL(file);

    this._localDS = getRDFService().GetDataSourceBlocking(url);
    this._localDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);

    return this._localDS;
  },


  flushLocalDS: function () {
    if (! this._localDS) return;

    this._localDS.Flush();
  },


  mintURI: function () {
    return Cx.DOCUMENTS_URL + generateID();
  },


  get fileVersion () {
    var version = this.model.target(RES(this.res), PROP('cx:fileVersion'));
    return version ? version.value : "1.0";
  },
  set fileVersion (val) {
    setLiteralProp(this.model, RES(this.res), PROP('cx:fileVersion'), LIT(val));
    return val;
  },


  get title () {
    var title = this.model.target(RES(this.res), PROP('dc:title'));
    return title ? title.value : gApp.getText("Untitled");
  },
  set title (val) {
    setLiteralProp(this.model, RES(this.res), PROP('dc:title'), LIT(val));
    // Update the project pseudo-folder for backwards compatibility
    var folderRes = RES(this.rootFolder.res);
    setLiteralProp(this.model, folderRes, PROP('dc:title'), LIT(val));
  },


  get description () {
    var desc = this.model.target(RES(this.res), PROP('dc:description'));
    return desc ? desc.value : "";
  },
  set description (val) {
    setLiteralProp(this.model, RES(this.res), PROP('dc:description'), LIT(val));
  },


  get modified () {
    var date = this.model.target(RES(this.res), PROP('dc:modified'));
    return date ? isoDateStringToDate(date.value) : "";
  },
  set modified (val) {
    var date = LIT(dateToISODateString(val));
    setLiteralProp(this.model, RES(this.res), PROP('dc:modified'), date);
  },


  get language () {
    var lang = this.model.target(RES(this.res), PROP('dc:language'));
    if (lang) return lang.value;
    var reg = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
      .getService(Components.interfaces.nsIXULChromeRegistry);
    return reg.getSelectedLocale("celtx");
  },
  set language (val) {
    setLiteralProp(this.model, RES(this.res), PROP('dc:language'), LIT(val));
  },


  get publishSettings  () {
    var m   = this.model;
    var res = RES(this.res.Value);

    var settings = { project: this, mode: 'private', users: '' };

    var pubMode = m.target(res, PROP('cx:publishMode'));
    if (pubMode) settings.mode = pubMode.value;

    var users = m.target(res, PROP('cx:sharedUsers'));
    if (users) settings.users = users.value;

    var owner = m.target(res, PROP('dc:creator'));
    if (owner) settings.owner = owner.value;

    return settings;
  },


  savePublishSettings: function (settings) {
    setLiteralProp(this.model, RES(this.res), PROP('cx:publishMode'),
      LIT(settings.mode));
    setLiteralProp(this.model, RES(this.res), PROP('cx:sharedUsers'),
      LIT(settings.users));
  },


  get revision () {
    var revision = this.model.target(RES(this.res), PROP('cx:revision'));
    return revision ? revision.value : 0;
  },


  set revision (ver) {
    this.setRevision(ver);
  },


  setRevision: function (ver) {
    setLiteralProp(this.model, RES(this.res), PROP('cx:revision'), LIT(ver));
  },


  get tagline () {
    var tagline = this.model.target(RES(this.res), PROP('cx:projectTagline'));
    return tagline ? tagline.value : "";
  },
  set tagline (val) {
    setLiteralProp(this.model, RES(this.res), PROP('cx:projectTagline'),
      LIT(val));
  },


  get image () {
    var image = this.model.target(RES(this.res), PROP('cx:projectImageFile'));
    return image ? image.value : "";
  },
  set image (val) {
    setLiteralProp(this.model, RES(this.res), PROP('cx:projectImageFile'),
      LIT(val));
  },


  get embed () {
    var embed = this.model.target(RES(this.res), PROP('cx:projectEmbedMarkup'));
    return embed ? embed.value : "";
  },
  set embed (val) {
    setLiteralProp(this.model, RES(this.res), PROP('cx:projectEmbedMarkup'),
      LIT(val));
  },


  get isTemplate () {
    return this.model.contains(RES(this.res), PROP('cx:template'), LIT('true'));
  },
  set isTemplate (val) {
    if (val) {
      if (! this.isTemplate)
        this.model.add(RES(this.res), PROP('cx:template'), LIT('true'));
    }
    else {
      if (this.isTemplate)
        this.model.remove(RES(this.res), PROP('cx:template'), LIT('true'));
    }
  }

};
