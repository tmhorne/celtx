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

function MediaSidebarController () {}


MediaSidebarController.prototype = {
  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) ||
        aIID.equals(Components.interfaces.nsIDOMEventListener) ||
        aIID.equals(Components.interfaces.nsISelectionListener) ||
        aIID.equals(Components.interfaces.celtxISidebar))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  commands: {},
  mediaIDs: {},
  editor: null,
  context: null,
  _suppressMutationEvents: false,


  supportsCommand: function (aCommand) {
    return (aCommand in this.commands);
  },


  isCommandEnabled: function (aCommand) {
    switch (aCommand) {
      default:
        return true;
    }
  },


  doCommand: function (aCommand) {
    switch (aCommand) {
    }
  },


  onEvent: function (aEventName) {
    switch (aEventName) {
    }
  },


  init: function (aEditor) {
    this.editor = aEditor;

    this.mediaDragObserver = new MediaDragObserver(this);

    var privsel = this.editor.editor.selection.QueryInterface(
      Components.interfaces.nsISelectionPrivate);
    privsel.addSelectionListener(this);

    var body = this.editor.editor.contentDocument.body;
    body.addEventListener("click", this, false);
    body.addEventListener("DOMNodeInserted", this, false);
    body.addEventListener("DOMNodeRemoved", this, false);

    this.addbutton = document.getElementById("mediaAddButton");
    this.addbutton.addEventListener("command", this, false);

    this.removebutton = document.getElementById("mediaRemoveButton");
    this.removebutton.addEventListener("command", this, false);

    this.gisbutton = document.getElementById("mediaGISButton");
    this.gisbutton.addEventListener("command", this, false);

    this.medialist = document.getElementById("medialist");
    this.medialist.addEventListener("select", this, false);
    this.medialist.addEventListener("change", this, false);
    this.medialist.addEventListener("remove", this, false);
    this.medialist.addEventListener("dblclick", this, false);
    this.medialist.addEventListener("dragover", this, false);
    this.medialist.addEventListener("dragdrop", this, false);

    this.cacheMediaIDs();

    this.contextChanged(this.editor.selectedBreakdownUnit);
  },


  shutdown: function () {
    try {
      var body = this.editor.editor.contentDocument.body;
      body.removeEventListener("click", this, false);
      body.removeEventListener("DOMNodeInserted", this, false);
      body.removeEventListener("DOMNodeRemoved", this, false);
    }
    catch (ex) {
      dump("*** media.body.removeEventListener: " + ex + "\n");
    }

    try {
      this.addbutton.removeEventListener("command", this, false);
    }
    catch (ex) {
      dump("*** media.addbutton.removeEventListener: " + ex + "\n");
    }
    this.addbutton = null;

    try {
      this.removebutton.addEventListener("command", this, false);
    }
    catch (ex) {
      dump("*** media.removebutton.removeEventListener: " + ex + "\n");
    }
    this.removebutton = null;

    try {
      this.gisbutton.addEventListener("command", this, false);
    }
    catch (ex) {
      dump("*** media.gisbutton.removeEventListener: " + ex + "\n");
    }
    this.gisbutton = null;

    try {
      this.medialist.addEventListener("select", this, false);
      this.medialist.addEventListener("change", this, false);
      this.medialist.addEventListener("remove", this, false);
      this.medialist.addEventListener("dblclick", this, false);
      this.medialist.addEventListener("dragover", this, false);
      this.medialist.addEventListener("dragdrop", this, false);
    }
    catch (ex) {
      dump("*** media.medialist.removeEventListener: " + ex + "\n");
    }
    this.medialist = null;

    try {
      var privsel = this.editor.editor.selection.QueryInterface(
        Components.interfaces.nsISelectionPrivate);
      privsel.removeSelectionListener(this);
    }
    catch (ex) {
      dump("*** media.privsel.removeSelectionListener: " + ex + "\n");
    }

    try {
      this.mediaDragObserver.delegate = null;
    }
    catch (ex) {
      dump("*** media.mediaDragObserver.delegate: " + ex + "\n");
    }
    this.mediaDragObserver = null;

    this.mediaIDs = new Object();

    this.context = null;
    this.editor = null;
  },


  cacheMediaIDs: function () {
    var xpath = new XPathEvaluator();
    var body = this.editor.editor.contentDocument.body;
    var xset = xpath.evaluate("//span[@class='media']", body, null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    var node;
    while ((node = xset.iterateNext()) != null) {
      var mediaid = node.id;
      while (! mediaid || (mediaid in this.mediaIDs))
        mediaid = generateID();
      if (mediaid != node.id)
        node.id = mediaid;
      this.mediaIDs[mediaid] = 1;
    }
  },


  willDeleteContext: function (aContext) {
    this._suppressMutationEvents = true;
  },


  didDeleteContext: function (aContext) {
    this._suppressMutationEvents = false;
  },


  willMoveContext: function (aContext) {
    this._suppressMutationEvents = true;
  },


  didMoveContext: function (aContext) {
    this._suppressMutationEvents = false;
  },


  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      case "click":
        this.editorClicked(aEvent);
        break;
      case "DOMNodeInserted":
        this.nodeInserted(aEvent);
        break;
      case "DOMNodeRemoved":
        this.nodeRemoved(aEvent);
        break;
      case "command":
        if (aEvent.target == this.addbutton)
          this.insertMedia();
        else if (aEvent.target == this.removebutton)
          this.removeSelectedMedia();
        else if (aEvent.target == this.gisbutton)
          this.gisSearch();
        break;
      case "select":
        if (aEvent.currentTarget == this.medialist) {
          var media = this.medialist.selectedItem;
          aEvent.stopPropagation();
          this.mediaSelected(media);
        }
        break;
      case "change":
        if (aEvent.currentTarget == this.medialist) {
          var media = aEvent.target;
          aEvent.stopPropagation();
          if (media.nodeName == "mediaitem")
            this.mediaTitleChanged(media);
        }
        break;
      case "remove":
        if (aEvent.currentTarget == this.medialist) {
          var media = aEvent.target;
          aEvent.stopPropagation();
          if (media.nodeName == "mediaitem")
            this.removeMedia(media);
        }
        break;
      case "dblclick":
        if (aEvent.currentTarget == this.medialist) {
          var media = aEvent.target;
          aEvent.stopPropagation();
          if (media.nodeName == "mediaitem")
            this.mediaDoubleClicked(media);
        }
        break;
      case "dragover":
        if (aEvent.target == this.medialist)
          this.mediaDragOver(aEvent);
        break;
      case "dragdrop":
        if (aEvent.target == this.medialist)
          this.mediaDragDrop(aEvent);
        break;
    }
  },


  lock: function () {
  },


  unlock: function () {
  },


  contextChanged: function (aContext) {
    if (! aContext)
      return;

    if (this.context && this.context.equals(aContext))
      return;

    this.context = aContext;

    this.refreshMedia();
  },


  editorClicked: function (aEvent) {
    this.contextChanged(this.editor.selectedBreakdownUnit);

    var elem = aEvent.target;
    var tag = elem.localName.toLowerCase();
    if (tag == "span" && elem.className == "media")
      this.selectMediaWithID(elem.id);
  },


  notifySelectionChanged: function (aDoc, aSelection, aReason) {
    var IListener = Components.interfaces.nsISelectionListener;
    var mask = IListener.MOUSEUP_REASON | IListener.KEYPRESS_REASON
    if ((aReason & mask) == 0)
      return;

    var textbox = document.getElementById("mediaGISTextbox");

    try {
      if (aSelection.isCollapsed)
        textbox.inputField.value = "";
      else
        textbox.inputField.value = aSelection.toString();
    }
    catch (ex) {
      dump("*** notifySelectionChanged: " + ex + "\n");
    }
  },


  nodeInserted: function (aEvent) {
    if (this._suppressMutationEvents)
      return;

    this._foundMedia = false;
    try {
      this.nodeInsertedImpl(aEvent.target);
    }
    catch (ex) {
      dump("*** nodeInsertedImpl: " + ex + "\n");
    }
    if (this._foundMedia)
      this.refreshMedia();
  },


  nodeInsertedImpl: function (aNode) {
    if (aNode.hasChildNodes()) {
      var children = aNode.childNodes;
      for (var i = 0; i < children.length; ++i) {
        try {
          this.nodeInsertedImpl(children[i]);
        }
        catch (ex) {
          dump("*** nodeInsertedImpl: " + ex + "\n");
        }
      }
    }

    if (aNode.nodeName.toLowerCase() != "span" ||
        aNode.className != "media")
      return;

    if (! aNode.hasAttribute("mediares"))
      throw new Error("Media inserted without mediares attribute");

    var context = this.editor.breakdownUnitContainingNode(aNode);
    if (! context)
      throw new Error("Media inserted outside of a breakdown context");

    // Ensure unique IDs
    var mediaid = aNode.id;
    while (! mediaid || (mediaid in this.mediaIDs))
      mediaid = generateID();
    if (mediaid != aNode.id)
      aNode.id = mediaid;
    this.mediaIDs[mediaid] = 1;

    var ds = this.editor.document.project.ds;
    var rdfsvc = getRDFService();
    var mediaarc = rdfsvc.GetResource(Cx.NS_CX + "media");
    var mediaseq = ds.GetTarget(context.resource, mediaarc, true);
    if (! mediaseq) {
      mediaseq = rdfsvc.GetAnonymousResource();
      ds.Assert(context.resource, mediaarc, mediaseq, true);
    }
    mediaseq = new RDFSeq(ds, mediaseq);

    var mediares = rdfsvc.GetResource(aNode.getAttribute("mediares"));
    if (mediaseq.indexOf(mediares) < 0)
      mediaseq.push(mediares);

    this._foundMedia = true;
  },


  nodeRemoved: function (aEvent) {
    if (this._suppressMutationEvents)
      return;

    try {
      this.nodeRemovedImpl(aEvent.target);
    }
    catch (ex) {
      dump("*** nodeRemovedImpl: " + ex + "\n");
    }
  },


  nodeRemovedImpl: function (aNode) {
    if (aNode.hasChildNodes()) {
      var children = aNode.childNodes;
      for (var i = 0; i < children.length; ++i) {
        try {
          this.nodeRemovedImpl(children[i]);
        }
        catch (ex) {
          dump("*** nodeRemovedImpl: " + ex + "\n");
        }
      }
    }

    if (aNode.nodeName.toLowerCase() != "span" ||
        aNode.className != "media")
      return;

    if (! aNode.hasAttribute("mediares"))
      throw new Error("Media removed without mediares attribute");

    var context = this.editor.breakdownUnitContainingNode(aNode);
    if (! context)
      return;

    var ds = this.editor.document.project.ds;
    var rdfsvc = getRDFService();
    var mediaarc = rdfsvc.GetResource(Cx.NS_CX + "media");
    var mediaseq = ds.GetTarget(context.resource, mediaarc, true);
    if (! mediaseq)
      throw new Error("Media removed from context without media sequence");
    mediaseq = new RDFSeq(ds, mediaseq);

    var mediares = rdfsvc.GetResource(aNode.getAttribute("mediares"));
    mediaseq.remove(mediares);

    var mediaid = aNode.id;
    if (! mediaid)
      return;

    delete this.mediaIDs[mediaid];

    var media = this.medialist.childNodes;
    for (var i = 0; i < media.length; ++i) {
      if (media[i].getAttribute("noteid") == mediaid) {
        this.medialist.removeChild(media[i]);
        break;
      }
    }
  },


  refreshMedia: function () {
    var medialist = this.medialist;
    while (medialist.hasChildNodes())
      medialist.removeChild(medialist.lastChild);

    var ds = this.editor.document.project.ds;
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");

    var seenIDs = {};
    var zombies = [];
    var iter = Components.classes["@celtx.com/dom/iterator;1"]
      .createInstance(Components.interfaces.celtxINodeIterator);
    iter.init(this.context.element, this.context.domRange);

    var node;
    while ((node = iter.nextNode()) != null) {
      if (node.nodeName.toLowerCase() != "span" || node.className != "media")
        continue;

      var mediauri = node.getAttribute("mediares");
      if (! mediauri) {
        dump("*** Media zombie: No mediares attribute\n");
        zombies.push(node);
        continue;
      }
      var mediares = rdfsvc.GetResource(mediauri);
      // Ditch media notes without corresponding media (this can happen on
      // a cross-project copy and paste).
      var arcs = ds.ArcLabelsOut(mediares);
      if (! arcs.hasMoreElements()) {
        dump("*** Media zombie: No arcs out for " + mediauri + "\n");
        zombies.push(node);
        continue;
      }

      var noteid = node.id;
      while (! noteid || seenIDs[noteid]) {
        noteid = generateID();
        node.id = noteid;
      }
      seenIDs[noteid] = 1;
      var media = document.createElementNS(Cx.NS_XUL, "mediaitem");
      media.setAttribute("noteid", noteid);
      media.setAttribute("id", mediares.Value);
      var type = ds.GetTarget(mediares, typearc, true);
      type = type.QueryInterface(IRes);
      media.setAttribute("type", type.Value);
      var title = getRDFString(ds, mediares, titlearc);
      media.setAttribute("title", title);
      medialist.appendChild(media);
    }

    this._suppressMutationEvents = true;
    try {
      for (var i = 0; i < zombies.length; ++i)
        zombies[i].parentNode.removeChild(zombies[i]);
    }
    catch (ex) {
      dump("*** refreshMedia: " + ex + "\n");
    }
    this._suppressMutationEvents = false;
  },


  selectMediaWithID: function (noteid) {
    var media = this.medialist.childNodes;
    for (var i = 0; i < media.length; ++i) {
      if (media[i].getAttribute("noteid") == noteid) {
        this.medialist.selectedItem = media[i];
        return media[i];
      }
    }
    dump("*** selectMediaWithID: No media has id " + noteid + "\n");
    return null;
  },


  insertMedia: function () {
    var mediamgr = getMediaManager();
    var files = mediamgr.showMediaPicker(window, "all", false, {});
    if (files.length == 0)
      return;

    var mediares = mediamgr.addMediaFromFile(files[0],
      this.editor.document.project);
    var media = { id: generateID(), mediares: mediares.Value };
    this.editor.editor.insertMedia(media);
    this.selectMediaWithID(media.id);
  },


  removeSelectedMedia: function () {
    var medialist = document.getElementById("medialist");
    var item = medialist.selectedItem;
    if (item)
      this.removeMedia(item);
  },


  removeMedia: function (aItem) {
    var noteid = aItem.getAttribute("noteid");
    if (! noteid) {
      dump("*** " + aItem.nodeName + " does not have a noteid\n");
      return;
    }
    var media = this.editor.editor.contentDocument
      .getElementById(noteid);
    this.editor.editor.removeMedia(media);
  },


  mediaSelected: function (aItem) {
    var scriptmedia = this.editor.editor.contentDocument
      .getElementById(aItem.getAttribute("noteid"));
    if (scriptmedia && ! this.editor.editor.isLocked)
      // Unfortunate nomenclature
      this.editor.editor.editor.selectElement(scriptmedia);
  },


  mediaTitleChanged: function (aItem) {
    var rdfsvc = getRDFService();
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var res = rdfsvc.GetResource(aItem.id);
    setRDFString(this.editor.document.project.ds, res, titlearc, aItem.title);

    this.editor.document.project.isModified = true;
  },


  mediaDoubleClicked: function (aItem) {
    var rdfsvc = getRDFService();
    var res = rdfsvc.GetResource(aItem.id);
    var file = this.editor.document.project.localFileFor(res);
    if (isReadableFile(file))
      openExternalFile(file);
  },


  gisSearch: function () {
    var textbox = document.getElementById("mediaGISTextbox");
    if (! textbox.value) {
      gApp.openBrowser("http://images.google.com/");
      return;
    }

    var prefix = 'http://images.google.com/images?q=';
    var suffix = '&btnG=Google+Search';
    var term = encodeURIComponent(textbox.value);

    gApp.openBrowser(prefix + term + suffix);
  },


  mediaDragOver: function mediaDragOver (event) {
    nsDragAndDrop.dragOver(event, this.mediaDragObserver);
  },
  
  
  mediaDragDrop: function mediaDragDrop (event) {
    nsDragAndDrop.drop(event, this.mediaDragObserver);
  }
};


function MediaDragObserver (aDelegate) {
  this.delegate = aDelegate;
}


MediaDragObserver.prototype = {
  flavours: [
    "text/x-moz-url",
    "text/x-moz-url-data",
    "text/unicode",
    "application/x-moz-file",
  ],


  canHandleMultipleItems: true,


  getSupportedFlavours: function () {
    var flavours = new FlavourSet();
    for (var i = 0; i < this.flavours.length; i++)
      flavours.appendFlavour(this.flavours[i]);
    return flavours;
  },


  onDragOver: function (event, flavour, session) {},


  addFile: function (file) {
    var mediamgr = getMediaManager();
    var mediares = mediamgr.addMediaFromFile(file,
      this.delegate.editor.document.project);
    var media = { id: generateID(), mediares: mediares.Value };
    this.delegate.editor.editor.insertMedia(media);
  },


  onDrop: function (event, data, session) {
    var urls = [];

    for (var i = 0; i < data.dataList.length; i++) {
      var dataitem = data.dataList[i];
      var flavours = {};
      for (var j = 0; j < dataitem.dataList.length; j++) {
        var flavourData = dataitem.dataList[j];
        if (flavourData.flavour.contentType == "application/x-moz-file") {
          // For some reason, this gets assigned nsISupportsString instead
          // of nsIFile, causing flavourData.data to fail.
          var nsIFile = Components.interfaces.nsIFile;
          var file = flavourData.supports.QueryInterface(nsIFile);
          flavours["application/x-moz-file"] = file;
        }
        else
          flavours[flavourData.flavour.contentType] = flavourData.data;
      }
      if (flavours["text/x-moz-url"]) {
        urls.push(flavours["text/x-moz-url"].split("\n")[0]);
      }
      else if (flavours["text/x-moz-url-data"]) {
        urls.push(flavours["text/x-moz-url-data"]);
      }
      else if (flavours["text/unicode"]) {
        urls.push(flavours["text/unicode"]);
      }
      else if (flavours["application/x-moz-file"]) {
        urls.push(fileToFileURL(flavours["application/x-moz-file"]));
      }
    }

    for (var i = 0 ; i < urls.length; i++) {
      var imgURL = urls[i];
      if (imgURL.match(/^http/)) {
        // Check for GIS searches
        var gis = imgURL.match(/imgurl=([^&]+)/);
        if (gis)
          imgURL = unescape(gis[1]);
      }

      if (! imgURL) {
        dump("*** Couldn't match " + imgURL + " to anything meaningful.\n");
        return;
      }

      try {
        var ios = getIOService();
        var url = ios.newURI(imgURL, null, null);
        if (url.scheme == "file") {
          var file = fileURLToFile(imgURL);
          this.addFile(file);
        }
        else {
          var filename = unescape(url.path.replace(/.*\//, ""));
          var tmpfile = getTempDir();
          tmpfile.append(filename);
          tmpfile.createUnique(0, 0600);
          var self = this;
          var listener = {
            onProgressChange: function (webProgress, request,
                            curSelfProgress, maxSelfProgress,
                            curTotalProgress, maxTotalProgress) {},
            onStateChange: function (prog, request, stateFlags, status) {
              var IProg = Components.interfaces.nsIWebProgressListener;
              if (stateFlags & IProg.STATE_STOP)
                self.addFile(tmpfile);
            },
            onLocationChange: function (prog, request, location) {},
            onStatusChange: function (prog, request, status, message) {},
            onSecurityChange: function (prog, request, state) {}
          };
          var persist = getWebBrowserPersist();
          persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;
          persist.progressListener = listener;
          persist.saveURI(url, null, null, null, null, tmpfile);
        }
      }
      catch (ex) {
        dump("*** MediaDragObserver.onDrop error: " + ex + "\n");
      }
    }
  }
};
