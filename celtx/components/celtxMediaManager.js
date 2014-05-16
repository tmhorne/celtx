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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const NS_RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const NS_CX = "http://celtx.com/NS/v1/";
const NS_DC = "http://purl.org/dc/elements/1.1/";

// This is a service, so many API calls require a project

function celtxMediaManager () {
}

celtxMediaManager.prototype = {
  QueryInterface: function cxsvc_QI(iid) {
    if (iid.equals(Ci.nsISupports) ||
        iid.equals(Ci.nsIObserver) ||
        iid.equals(Ci.celtxIMediaManager))
      return this;

    throw Cr.NS_ERROR_NO_INTERFACE;
  },


  startup: function startup () {
    this.rdf = Cc["@mozilla.org/rdf/rdf-service;1"]
      .getService(Ci.nsIRDFService);
    this.cu = Cc["@mozilla.org/rdf/container-utils;1"]
      .getService(Ci.nsIRDFContainerUtils);
    this.loadShotPalettes();
  },


  shutdown: function shutdown () {
    this.rdf = null;
    this.cu = null;
  },


  observe: function (subject, topic, data) {
    if (topic == "app-startup") {
      var os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
      os.addObserver(this, "final-ui-startup", false);
      os.addObserver(this, "quit-application", false);
    }
    else if (topic == "final-ui-startup") {
      try {
        this.startup();
      }
      catch (ex) {
        dump("*** startup: " + ex + "\n");
      }
    }
    else if (topic == "quit-application") {
      try {
        this.shutdown();
      }
      catch (ex) {
        dump("*** shutdown: " + ex + "\n");
      }

      var os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
      os.removeObserver(this, "quit-application");
      os.removeObserver(this, "final-ui-startup");
    }
  },


  loadShotPalettes: function () {
    this.palettes = [];

    var extmgr = Cc["@mozilla.org/extensions/manager;1"]
      .getService(Ci.nsIExtensionManager);
    var exttype = Ci.nsIUpdateItem.TYPE_EXTENSION;
    var extensions = extmgr.getItemList(exttype, {});
    for (var i = 0; i < extensions.length; ++i) {
      var extension = extensions[i].QueryInterface(Ci.nsIUpdateItem);
      try {
        if (ShotPalette.isPaletteExtension(extension.id)) {
          var palette = new ShotPalette(extension.id);
          this.palettes.push(palette);
        }
      }
      catch (ex) {
        dump("*** loadShotPalettes: " + ex + "\n");
      }
    }

    this.resolveShotOverrides();
  },


  getShotPalettes: function (oSize) {
    oSize.value = this.palettes.length;
    return this.palettes;
  },


  resolveShotOverrides: function () {
    var overridemap = {};
    for (var i = 0; i < this.palettes.length; ++i) {
      var palette = this.palettes[i];
      for (var j = 0; j < palette.overrides.length; ++j)
        overridemap[palette.overrides[j]] = 1;
    }
    for (var i = 0; i < this.palettes.length; ++i) {
      if (this.palettes[i].id in overridemap)
        this.palettes.splice(i--, 1);
    };
  },


  /**
   * Decode an image file. Throws an exception if decoding failed.
   * @param file{nsILocalFile}  an image file
   * @type imgIContainer
   * @return the decoded image
   */
  decodeImageFile: function (file) {
    // Step 1: Build buffered input stream around file
    var fis = Cc["@mozilla.org/network/file-input-stream;1"]
      .createInstance(Ci.nsIFileInputStream);
    // PR_RDONLY
    fis.init(file, 0x01, 0, 0);
    var bfis = Cc["@mozilla.org/network/buffered-input-stream;1"]
      .createInstance(Ci.nsIBufferedInputStream);
    bfis.init(fis, 4096);


    // Step 2: Get mime type by peeking at stream
    var sniffer = Cc["@mozilla.org/network/content-sniffer;1"]
      .createInstance(Ci.nsIContentSniffer);
    // We need to QI to a seekable stream, because we have to rewind the
    // stream after we sniff the type.
    var seekin = bfis.QueryInterface(Ci.nsISeekableStream);
    // We also need a scriptable input stream so that we can read
    // a few bytes from the stream to pass to the sniffer.
    var sis = Components.classes["@mozilla.org/scriptableinputstream;1"]
      .createInstance(Components.interfaces.nsIScriptableInputStream);
    sis.init(bfis);

    // Peeking at 16 bytes should be more than enough
    var peekedstr = sis.read(16);
    var peekedbytes = [];
    // Note: If a null byte shows up in the data we're peeking at,
    // peekedstr will be truncated to whatever came before the null byte.
    for (var i = 0; i < peekedstr.length; ++i)
      peekedbytes[i] = peekedstr.charCodeAt(i);
    var mimetype = sniffer.getMIMETypeFromContent(null,
      peekedbytes, peekedbytes.length);
    if (! mimetype || mimetype.indexOf("image/") != 0) {
      bfis.close();
      throw new Error("Non-image mime-type: " + mimetype);
    }

    // Reset the input stream
    seekin.seek(0, 0);

    // Step 3: Decode to an image container
    try {
      var tools = Components.classes["@mozilla.org/image/tools;1"]
        .createInstance(Components.interfaces.imgITools);
      var ocontainer = { value: null };
      tools.decodeImageData(bfis, mimetype, ocontainer);
      return ocontainer.value;
    }
    catch (ex) {
      throw ex;
    }
    finally {
      bfis.close();
    }
  },


  /**
   * Set the width and height attributes for all images in a project.
   */
  checkMediaAttributes: function (project) {
    var IRes = Ci.nsIRDFResource;
    var typearc = this.rdf.GetResource(NS_RDF + "type");
    var widtharc = this.rdf.GetResource(NS_CX + "width");
    var heightarc = this.rdf.GetResource(NS_CX + "height");
    var imagetype = this.rdf.GetResource(NS_CX + "Image");
    var images = project.ds.GetSources(typearc, imagetype, true);

    function isReadableFile (file) {
      return file && file.exists() && file.isFile() && file.isReadable();
    }

    while (images.hasMoreElements()) {
      var imageres = images.getNext().QueryInterface(IRes);
      if (project.ds.hasArcOut(imageres, widtharc) &&
          project.ds.hasArcOut(imageres, heightarc))
        continue;

      try {
        var file = this.fileForMedia(imageres, project);
        if (! isReadableFile(file))
          continue;
        var imgcontainer = this.decodeImageFile(file);
        if (imgcontainer) {
          setRDFString(project.ds, imageres, widtharc, imgcontainer.width);
          setRDFString(project.ds, imageres, heightarc, imgcontainer.height);
        }
      }
      catch (ex) {
        dump("*** checkMediaAttributes: " + ex + "\n");
      }
    }
  },


  urlForMedia: function (mediares, project) {
    var file = this.fileForMedia(mediares, project);
    var ios = Cc["@mozilla.org/network/io-service;1"]
      .getService(Ci.nsIIOService);
    return ios.newFileURI(file).spec;
  },


  fileForMedia: function (mediares, project) {
    var filearc = this.rdf.GetResource(NS_CX + "localFile");
    var filename = getRDFString(project.ds, mediares, filearc);
    if (! filename) {
      throw new Error("No localFile for media");
    }
    var file = project.projectFolder;
    file.append(filename);
    return file;
  },


  mediaForFilename: function (filename, project) {
    var filearc = this.rdf.GetResource(NS_CX + "localFile");
    var filelit = this.rdf.GetLiteral(filename);

    var sources = project.ds.GetSources(filearc, filelit, true);
    if (sources.hasMoreElements())
      return sources.getNext().QueryInterface(Ci.nsIRDFResource);

    // Try a sanitized version
    filelit = this.rdf.GetLiteral(safeFileName(filename));
    sources = project.ds.GetSources(filearc, filelit, true);
    if (sources.hasMoreElements())
      return sources.getNext().QueryInterface(Ci.nsIRDFResource);

    return null;
  },


  /**
   * Create a thumbnail for the given media resource, with optional
   * constraints on width or height. It only works for images currently.
   * @param mediares  the media resource
   * @param maxwidth  the maximum width of the thumbnail (optional)
   * @param maxheight  the maximum height of the thumbnail (optional)
   * @type nsIFile
   * @return the thumbnail file
   */
  createThumbnail: function (mediares, project, maxwidth, maxheight,
                             observer) {
    if (! maxwidth)
      maxwidth = 256;
    if (! maxheight)
      maxheight = 256;

    var file = this.fileForMedia(mediares, project);
    var nameparts = file.leafName.match(/^(.+)\.([^.]+)$/);
    if (nameparts.length != 3) {
      var errmsg = file.leafName + " is not a recognizable image name";
      dump("*** createThumbnail: " + errmsg + "\n");
      if (observer)
        observer.thumbnailFailed(mediares, errmsg);
      return;
    }

    var thumb = file.clone();
    thumb.leafName = nameparts[1] + "_thumb.png";
    if (! thumb.exists())
      thumb.create(0, thumb.parent.permissions & 0644);

    var fos = Cc["@mozilla.org/network/file-output-stream;1"]
      .createInstance(Ci.nsIFileOutputStream);
    // PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE
    fos.init(thumb, 0x04 | 0x08 | 0x20, 0600, 0);
    var bfos = Cc["@mozilla.org/network/buffered-output-stream;1"]
      .createInstance(Ci.nsIBufferedOutputStream);
    bfos.init(fos, 4096);

    try {
      var imgcontainer = this.decodeImageFile(file);
      var width = imgcontainer.width;
      var height = imgcontainer.height;
      if (height > maxheight || width > maxwidth) {
        var aspect = width / height;
        if (width > height) {
          width = maxwidth;
          height = Math.floor(maxwidth / aspect);
          if (height > maxheight) {
            width = Math.floor(height * aspect);
            height = maxheight;
          }
        }
        else {
          height = maxheight;
          width = Math.floor(maxheight * aspect);
          if (width > maxwidth) {
            height = Math.floor(width / aspect);
            width = maxwidth;
          }
        }
      }
      var tools = Cc["@mozilla.org/image/tools;1"]
        .createInstance(Ci.imgITools);
      var encodedstream = tools.encodeScaledImage(imgcontainer, "image/png",
        width, height);
      var available = 0;
      while ((available = encodedstream.available()) > 0) {
        bfos.writeFrom(encodedstream, available);
      }
      var thumbarc = this.rdf.GetResource(NS_CX + "thumbnail");
      setRDFString(project.ds, mediares, thumbarc, thumb.leafName);

      try {
        if (observer)
          observer.onThumbnail(mediares, thumb);
      } catch (ex) {}
    }
    catch (ex) {
      dump("*** createThumbnail: " + ex + "\n");
      if (observer)
        observer.onThumbnailFailed(mediares, ex.toString());
    }
    finally {
      bfos.close();
    }
  },


  getThumbnail: function (mediares, project, force, maxwidth, maxheight,
                          observer) {
    var thumbarc = this.rdf.GetResource(NS_CX + "thumbnail");
    var thumbname = getRDFString(project.ds, mediares, thumbarc);
    if (! thumbname) {
      if (force) {
        this.createThumbnail(mediares, project, maxwidth, maxheight,
          observer);
      }
      return null;
    }
    var file = project.projectFolder;
    file.append(thumbname);
    if (! file.exists()) {
      if (force) {
        this.createThumbnail(mediares, project, maxwidth, maxheight,
          observer);
      }
      return null;
    }
    try {
      if (observer) {
        // The name suggests the wrong this, but this is consistent with
        // how it was being used before the media manager into a component
        observer.onThumbnail(mediares, file);
      }
    }
    catch (ex) {}
    return file;
  },


  /**
   * This function should only be used for creating a media resource
   * for media files that have already been added to the project, but
   * were not added with a corresponding media resource. This is not
   * the correct way to add new media files.
   * @see #addMediaFromFile
   * @param filename  the name of the file in the project folder
   * @type nsIRDFResource
   * @return a resource representing the given file
   */
  createMediaForExistingFilename: function (filename, project) {
    var file = project.projectFolder;
    file.append(filename);
    if (! file.exists())
      throw new Error("File " + filename + " does not exist");

    // Ensure it's a supported media type
    var supported = { image: 1, audio: 1, video: 1 };
    var msvc = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
    var mimeType = msvc.getTypeFromFile(file);
    var type = mimeType.split('/').shift();
    if (! supported[type])
      throw new Error(getText("UnsupportedMediaMsg"));

    var typeres;
    switch (type) {
      case "image": typeres = this.rdf.GetResource(NS_CX + "Image"); break;
      case "audio": typeres = this.rdf.GetResource(NS_CX + "Audio"); break;
      case "video": typeres = this.rdf.GetResource(NS_CX + "Video"); break;
    }

    var fileres = this.rdf.GetResource(project.mintURI());
    var typearc = this.rdf.GetResource(NS_RDF + "type");
    var titlearc = this.rdf.GetResource(NS_DC + "title");
    var filearc = this.rdf.GetResource(NS_CX + "localFile");

    setRDFString(project.ds, fileres, titlearc, file.leafName);
    setRDFString(project.ds, fileres, filearc, file.leafName);
    project.ds.Assert(fileres, typearc, typeres, true);

    return fileres;
  },


  /**
   * Add a media file to the project and create the corresponding resource.
   * @param file  the media file to add
   * @type nsIRDFResource
   * @return a resource representing the given file
   */
  addMediaFromFile: function (file, project) {
    var msvc = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
    var mimeType = msvc.getTypeFromFile(file);
    if (mimeType == "application/octet-stream") {
      var ext = file.leafName.match(/\.([^\.]+)$/);
      if (ext) {
        switch (ext[1].toLowerCase()) {
          case "bmp":
            mimeType = "image/bmp"; break;
          case "jpg":
          case "jpeg":
            mimeType = "image/jpeg"; break;
          case "png":
            mimeType = "image/png"; break;
          case "gif":
            mimeType = "image/gif"; break;
        }
      }
    }
    var type = mimeType.split('/').shift();

    // Ensure it's a supported media type
    var supported = { image: 1, audio: 1, video: 1 };

    if (! supported[type])
      throw new Error(getText("UnsupportedMediaMsg"));

    var typeres;
    switch (type) {
      case "image": typeres = this.rdf.GetResource(NS_CX + "Image"); break;
      case "audio": typeres = this.rdf.GetResource(NS_CX + "Audio"); break;
      case "video": typeres = this.rdf.GetResource(NS_CX + "Video"); break;
    }

    var dstfile = copyToUnique(file, project.projectFolder, file.leafName);

    var fileres = this.rdf.GetResource(project.mintURI());
    var typearc = this.rdf.GetResource(NS_RDF + "type");
    var titlearc = this.rdf.GetResource(NS_DC + "title");
    var filearc = this.rdf.GetResource(NS_CX + "localFile");

    setRDFString(project.ds, fileres, titlearc, file.leafName);
    setRDFString(project.ds, fileres, filearc, dstfile.leafName);
    project.ds.Assert(fileres, typearc, typeres, true);

    return fileres;
  },


  showMediaPicker: function (window, type, multiple, oCount) {
    type = type ? type : "all";

    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    var mode = multiple ? fp.modeOpenMultiple : fp.modeOpen;
    fp.init(window, getText("AddMedia"), mode);
    fp.displayDirectory = getMediaDir(window);
    if (type == "image")
      fp.appendFilters(fp.filterImages);
    else
      fp.appendFilters(fp.filterAll);

    if (fp.show() != fp.returnOK) {
      oCount.value = 0;
      return [];
    }

    var supportedTypes = {
      image: (type == "image" || type == "all") ? true : false,
      audio: (type == "audio" || type == "all") ? true : false,
      video: (type == "video" || type == "all") ? true : false
    };

    var msvc = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
    var files = [];
    if (multiple) {
      var fileiter = fp.files;
      var ILocalFile = Components.interfaces.nsILocalFile;
      while (fileiter.hasMoreElements()) {
        var file = fileiter.getNext().QueryInterface(ILocalFile);
        var mimetype = msvc.getTypeFromFile(file);
        if (mimetype == "application/octet-stream") {
          var ext = file.leafName.match(/\.([^\.]+)$/);
          if (ext) {
            switch (ext[1].toLowerCase()) {
              case "bmp":
                mimetype = "image/bmp"; break;
              case "jpg":
              case "jpeg":
                mimetype = "image/jpeg"; break;
              case "png":
                mimetype = "image/png"; break;
              case "gif":
                mimetype = "image/gif"; break;
            }
          }
        }
        var maintype = mimetype.split("/").shift();
        if (supportedTypes[maintype])
          files.push(file);
      }
    }
    else {
      var mimetype = msvc.getTypeFromFile(fp.file);
      var maintype = mimetype.split("/").shift();
      if (supportedTypes[maintype])
        files.push(fp.file);
    }

    if (files.length == 0)
      throw new Error(getText("UnsupportedMediaMsg"));

    setMediaDir(files[0].parent);

    oCount.value = files.length;
    return files;
  }
};


function ShotPalette (id) {
  this.id = id;
  this.rdf = Cc["@mozilla.org/rdf/rdf-service;1"]
    .getService(Ci.nsIRDFService);

  var extmgr = Cc["@mozilla.org/extensions/manager;1"]
    .getService(Ci.nsIExtensionManager);
  var instlocation = extmgr.getInstallLocation(id);
  var installrdf = instlocation.getItemFile(id, "install.rdf");
  var ios = Cc["@mozilla.org/network/io-service;1"]
    .getService(Ci.nsIIOService);
  var installuri = ios.newFileURI(installrdf).spec;
  var installds = this.rdf.GetDataSourceBlocking(installuri);

  var manifestres = this.rdf.GetResource("urn:mozilla:install-manifest");
  var palettefilearc = this.rdf.GetResource(NS_CX + "paletteFile");
  var palettefile = getRDFString(installds, manifestres, palettefilearc);
  if (! palettefile)
    throw new Error("No cx:paletteFile for palette " + id);

  this.overrides = [];
  var overridesarc = this.rdf.GetResource(NS_CX + "overrides");
  var overrides = installds.GetTargets(manifestres, overridesarc, true);
  while (overrides.hasMoreElements()) {
    try {
      var override = overrides.getNext().QueryInterface(Ci.nsIRDFLiteral);
      this.overrides.push(override.Value);
    }
    catch (ex) {
      dump("*** ShotPalette: " + ex + "\n");
    }
  }

  this.ds = this.rdf.GetDataSourceBlocking(palettefile);
  this.paletteres = this.rdf.GetResource("urn:celtx:palette-index");
  var categoriesarc = this.rdf.GetResource(NS_CX + "categories");
  var categoryseq = this.ds.GetTarget(this.paletteres, categoriesarc, true);
  if (! (categoryseq && categoryseq instanceof Ci.nsIRDFResource))
    throw new Error("No cx:categories for " + id);

  categoryseq = categoryseq.QueryInterface(Ci.nsIRDFResource);
  var cu = Cc["@mozilla.org/rdf/container-utils;1"]
    .getService(Ci.nsIRDFContainerUtils);
  if (! cu.IsSeq(this.ds, categoryseq))
    throw new Error(categoryseq.Value + " is not an RDF sequence");
  this.categories = Cc["@mozilla.org/rdf/container;1"]
    .createInstance(Ci.nsIRDFContainer);
  this.categories.Init(this.ds, categoryseq);
}


ShotPalette.isPaletteExtension = function (id) {
  var rdfsvc = Cc["@mozilla.org/rdf/rdf-service;1"]
    .getService(Ci.nsIRDFService);

  var extmgr = Cc["@mozilla.org/extensions/manager;1"]
    .getService(Ci.nsIExtensionManager);
  var instlocation = extmgr.getInstallLocation(id);
  if (! instlocation)
    return false;

  var installrdf = instlocation.getItemFile(id, "install.rdf");
  if (! installrdf.exists())
    return false;

  var ios = Cc["@mozilla.org/network/io-service;1"]
    .getService(Ci.nsIIOService);
  var installuri = ios.newFileURI(installrdf).spec;
  var installds = rdfsvc.GetDataSourceBlocking(installuri);

  var manifestres = rdfsvc.GetResource("urn:mozilla:install-manifest");
  var palettefilearc = rdfsvc.GetResource(NS_CX + "paletteFile");
  var palettefile = getRDFString(installds, manifestres, palettefilearc);

  return palettefile && palettefile.length > 0;
};


ShotPalette.prototype = {
  QueryInterface: function (aIID) {
    if (aIID.equals(Ci.nsISupports) ||
        aIID.equals(Ci.celtxIPalette))
      return this;

    throw Cr.NS_ERROR_NO_INTERFACE;
  },


  getCategories: function (oSize) {
    var categories = this.categories.GetElements();
    var result = [];
    while (categories.hasMoreElements()) {
      result.push(categories.getNext().QueryInterface(Ci.nsIRDFResource));
    }
    oSize.value = result.length;
    return result;
  },


  getCategoryName: function (aCategory) {
    var rdfsvc = Cc["@mozilla.org/rdf/rdf-service;1"]
      .getService(Ci.nsIRDFService);
    var titlearc = rdfsvc.GetResource(NS_DC + "title");
    var title = this.ds.GetTarget(aCategory, titlearc, true);
    if (! title)
      return "";

    if (! (title instanceof Ci.nsIRDFLiteral))
      throw Cr.NS_ERROR_UNEXPECTED;

    return title.QueryInterface(Ci.nsIRDFLiteral).Value;
  },


  getCategoryIconURI: function (aCategory) {
    var rdfsvc = Cc["@mozilla.org/rdf/rdf-service;1"]
      .getService(Ci.nsIRDFService);
    var iconarc = rdfsvc.GetResource(NS_CX + "icon");
    var icon = this.ds.GetTarget(aCategory, iconarc, true);
    if (! icon)
      return "";

    if (! (icon instanceof Ci.nsIRDFLiteral))
      throw Cr.NS_ERROR_UNEXPECTED;

    return icon.QueryInterface(Ci.nsIRDFLiteral).Value;
  },


  getImagesInCategory: function (aCategory, oSize) {
    var seq = Cc["@mozilla.org/rdf/container;1"]
      .createInstance(Ci.nsIRDFContainer);
    seq.Init(this.ds, aCategory);
    var result = [];
    var images = seq.GetElements();
    while (images.hasMoreElements()) {
      result.push(images.getNext().QueryInterface(Ci.nsIRDFResource));
    }
    oSize.value = result.length;
    return result;
  },


  getImageName: function (aImage) {
    var rdfsvc = Cc["@mozilla.org/rdf/rdf-service;1"]
      .getService(Ci.nsIRDFService);
    var titlearc = rdfsvc.GetResource(NS_DC + "title");
    var title = this.ds.GetTarget(aImage, titlearc, true);
    if (! (title && title instanceof Ci.nsIRDFLiteral))
      throw Cr.NS_ERROR_UNEXPECTED;

    return title.QueryInterface(Ci.nsIRDFLiteral).Value;
  },


  getImageLocation: function (aImage) {
    var rdfsvc = Cc["@mozilla.org/rdf/rdf-service;1"]
      .getService(Ci.nsIRDFService);
    var localfilearc = rdfsvc.GetResource(NS_CX + "localFile");
    var uri = this.ds.GetTarget(aImage, localfilearc, true);
    if (! (uri && uri instanceof Ci.nsIRDFLiteral))
      throw Cr.NS_ERROR_UNEXPECTED;

    return uri.QueryInterface(Ci.nsIRDFLiteral).Value;
  },


  getImageIconURI: function (aImage) {
    var rdfsvc = Cc["@mozilla.org/rdf/rdf-service;1"]
      .getService(Ci.nsIRDFService);
    var iconarc = rdfsvc.GetResource(NS_CX + "icon");
    var icon = this.ds.GetTarget(aImage, iconarc, true);
    if (! icon)
      return "";

    if (! (icon instanceof Ci.nsIRDFLiteral))
      throw Cr.NS_ERROR_UNEXPECTED;

    return icon.QueryInterface(Ci.nsIRDFLiteral).Value;
  }
};


var initModule = {
  ServiceCID: Components.ID("{e2fb3084-ce62-4f3d-a7da-b7a20c6fcf3e}"),
  ServiceContractID: "@celtx.com/media-manager;1",
  ServiceName: "Celtx Media Manager",


  registerSelf: function (compMgr, fileSpec, location, type) {
    compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(this.ServiceCID, this.ServiceName,
      this.ServiceContractID, fileSpec, location, type);

    var catman = Cc["@mozilla.org/categorymanager;1"]
      .getService(Ci.nsICategoryManager);
    catman.addCategoryEntry("app-startup", "Celtx Media Manager",
      "service," + this.ServiceContractID, true, true);
  },


  unregisterSelf: function (compMgr, fileSpec, location) {
    compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation(this.ServiceCID, fileSpec);
  },


  getClassObject: function (compMgr, cid, iid) {
    if (! cid.equals(this.ServiceCID))
      throw Cr.NS_ERROR_NO_INTERFACE;
    if (! iid.equals(Ci.nsIFactory))
      throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    return this.instanceFactory;
  },


  canUnload: function (compMgr) {
    return true;
  },


  instanceFactory: {
    createInstance: function (outer, iid) {
      if (outer != null)
        throw Cr.NS_ERROR_NO_AGGREGATION;
      return new celtxMediaManager().QueryInterface(iid);
    }
  }
};


function NSGetModule (compMgr, fileSpec) {
  return initModule;
}


function copyToUnique (file, dir, name, nosanitize) {
  const kAlreadyExists = Components.results.NS_ERROR_FILE_ALREADY_EXISTS;
  if (! file || ! file.exists())
    throw "copyToUnique: Source file does not exist";
  if (! name)
    name = file.leafName;
  if (! dir)
    dir = file.parent;
  if (! dir.isDirectory())
    throw Components.results.NS_ERROR_FILE_DESTINATION_NOT_DIR;

  if (! nosanitize)
    name = safeFileName(name);

  var dstfile = dir.clone();
  dstfile.append(name);
  if (! dstfile.exists()) {
    try {
      file.copyTo(dir, name);
      var resultfile = dir.clone();
      resultfile.append(name);
      return resultfile;
    }
    catch (ex) {
      if (! ("result" in ex && ex.result == kAlreadyExists))
        throw ex;
    }
  }

  var parts = name.match(/(.*)(\.[^\.]*)$/);
  var suffix = "";
  if (parts) {
    name    = parts[1];
    suffix  = parts[2];
  }

  for (var i = 1; i < 1000; i++) {
    var leafname = name + "-" + i + suffix;
    try {
      dstfile = dir.clone();
      dstfile.append(leafname);
      if (dstfile.exists())
        continue;
      file.copyTo(dir, leafname);
      var resultfile = dir.clone();
      resultfile.append(leafname);
      return resultfile;
    }
    catch (ex) {
      if (! ("result" in ex && ex.result == kAlreadyExists))
        throw ex;
    }
  }

  // nsIFile.createUnique throws NS_ERROR_FILE_TOO_BIG
  throw kAlreadyExists;
}


function getText (name, params) {
  var bundleSvc = Cc["@mozilla.org/intl/stringbundle;1"]
    .getService(Ci.nsIStringBundleService);
  var bundlePath = "chrome://celtx/locale/celtx.properties";
  var sb = bundleSvc.createBundle(bundlePath);
  try {
    if (params)
      return sb.formatStringFromName(name, params, params.length);
    else
      return sb.GetStringFromName(name);
  }
  catch (ex) {
    dump("*** getText: Couldn't get " + name + "\n");
    return null;
  }
}


function setRDFObject (ds, subj, pred, obj) {
  if (! obj) {
    clearRDFObject(ds, subj, pred);
    return;
  }
  var oldobj = ds.GetTarget(subj, pred, true);
  if (oldobj)
    ds.Change(subj, pred, oldobj, obj);
  else
    ds.Assert(subj, pred, obj, true);
}

function clearRDFObject (ds, subj, pred) {
  var oldobj = ds.GetTarget(subj, pred, true);
  if (oldobj)
    ds.Unassert(subj, pred, oldobj);
}

function getRDFLiteral (ds, subj, pred) {
  var lit = ds.GetTarget(subj, pred, true);
  if (lit && lit instanceof Components.interfaces.nsIRDFLiteral)
    return lit.QueryInterface(Components.interfaces.nsIRDFLiteral);
  else
    return null;
}

function getRDFString (ds, subj, pred) {
  var lit = getRDFLiteral(ds, subj, pred);
  return lit ? lit.Value : "";
}

function setRDFString (ds, subj, pred, str) {
  if (str || str == 0) {
    var rdfsvc = Cc["@mozilla.org/rdf/rdf-service;1"]
      .getService(Ci.nsIRDFService);
    setRDFObject(ds, subj, pred, rdfsvc.GetLiteral(str));
  }
  else
    clearRDFObject(ds, subj, pred);
}


function isMac (window) {
  return window.navigator.platform.indexOf('Mac') != -1;
}


function isWin (window) {
  return window.navigator.platform.indexOf('Win') != -1;
}


function userDocsDir (window) {
  var dirsvc = Components.classes["@mozilla.org/file/directory_service;1"]
  .getService(Components.interfaces.nsIDirectoryServiceProvider);
  if (isMac(window))
    return dirsvc.getFile("UsrDocs", {value:0});
  else if (isWin(window))
    return dirsvc.getFile("Pers", {value:0});
  else
    return dirsvc.getFile("Home", {value:0});
}


function getMediaDir (window) {
  try {
    var ps = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefService).getBranch("celtx.directory.");
    var path = ps.getCharPref("media");
    var dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    dir.initWithPath(path);
    return dir;
  }
  catch (ex) {
    return userDocsDir(window);
  }
}


function setMediaDir (dir) {
  var ps = Cc["@mozilla.org/preferences-service;1"]
    .getService(Ci.nsIPrefService).getBranch("celtx.directory.");
  ps.setCharPref("media", dir.path);
}


function safeFileName (fileName) {
  var str = fileName.replace(/[* \'()]/g, '_');
  var enc = encodeURIComponent(str);
  if (enc == str) {
    return enc;
  }
  
  enc = enc.replace(/\%\w\w/g, '_');

  var a = enc.split(/_/);
  if (a.length <= enc.length / 4) {
    // Tolerable
    return enc;
  }
    
  // More than 25% underscores by volume ... give up and generate a name
  var m = fileName.match(/\.[^\.]*$/);
  var ext = m == undefined ? '.bin' : m;
  var name = 'obj-' + generateID(8) + ext;
  return name;
}


const ID_CHARS =
'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ID_CHARS_LEN   = 62;
const ID_DEFAULT_LEN = 12;


function generateID (length) {
  if (! length) length = ID_DEFAULT_LEN;
  var id = '';
  for (var i = 0; i < length; i++) {
    id += ID_CHARS[Math.floor(Math.random() * ID_CHARS_LEN)];
  }
  return id;
}
