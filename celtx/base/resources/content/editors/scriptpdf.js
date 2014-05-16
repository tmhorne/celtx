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

var gPDFController = {
  __proto__: EditorController.prototype,


  allowpdf: true,
  // Cached options
  paperSize: "USLetter",
  sceneNumbers: "none",
  showScenes: false,
  theatreFormat: "stageplay",
  avFormat: "columns",
  showTitle: true,
  showAVHeader: false,
  showCharNumbers: false,
  avHeaders: [],
  bbcShowName: "",
  bbcSketchName: "",
  bbcContact: "",
  pagecount: 1,
  curpage: 1,


  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIDOMEventListener) ||
        iid.equals(Components.interfaces.nsIObserver))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  loaded: function loaded () {
    this.frame = document.getElementById("pdfview");
    this.lastModCount = -1;

    /*
    try {
      var ps = getPrefService().getBranch("celtx.pdf.");
      this.allowpdf = ps.getBoolPref("useraccepted");
    }
    catch (ex) {}
    */
    if (! this.allowpdf) {
      this.frame.setAttribute("src",
        Cx.CONTENT_PATH + "editors/pdfwarning.xhtml");
      this.setPDFEnabled(false);
      this.hideProgressBox();
    }
    gController.updateCommands();
  },


  updatePages: function updatePages () {
    if (this.frame.docShell.busyFlags) {
      setTimeout("gPDFController.updatePages()", 100);
      return;
    }
    var doc = this.frame.contentDocument;
    var xpath = new XPathEvaluator();
    var result = xpath.evaluate("count(/html/body/div[@class='page'])", doc,
      null, XPathResult.NUMBER_TYPE, null);
    this.pagecount = result.numberValue;
    document.getElementById("pdfNumPages").value = this.pagecount;
    doc.addEventListener("scroll", this, false);
    this.updateCurrentPage();
  },


  handleEvent: function handleEvent (event) {
    if (event.type == "scroll")
      this.updateCurrentPage();
  },


  updateCurrentPage: function updateCurrentPage () {
    var scrollY = this.frame.contentWindow.scrollY;
    var xpath = new XPathEvaluator();
    var result = xpath.evaluate("/html/body/div[@class='page']",
      this.frame.contentDocument, null,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    var count = 1;
    var page = result.iterateNext();
    while (page) {
      if (scrollY < page.offsetTop + page.clientHeight)
        break;
      ++count;
      page = result.iterateNext();
    }
    this.curpage = count;
    document.getElementById("pdfPageNumber").value = this.curpage;
  },


  goToPage: function goToPage (pageno) {
    if (! this.allowpdf)
      return;

    if (pageno == this.curpage)
      return;

    if (! isNaN(pageno) && pageno >= 1 && pageno <= this.pagecount) {
      var doc = this.frame.contentDocument;
      var xpath = new XPathEvaluator();
      var result = xpath.evaluate("/html/body/div[@class='page']"
        + "[position() = " + pageno + "]", doc, null,
        XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      if (result.singleNodeValue) {
        this.frame.contentWindow.scrollTo(0, result.singleNodeValue.offsetTop);
        this.curpage = pageno;
      }
      else {
        dump("*** goToPage: no page for pageno " + pageno + "\n");
      }
    }

    document.getElementById("pdfPageNumber").value = this.curpage;
  },


  firstPage: function firstPage () { this.goToPage(1);                },
  prevPage:  function prevPage ()  { this.goToPage(this.curpage - 1); },
  nextPage:  function nextPage ()  { this.goToPage(this.curpage + 1); },
  lastPage:  function lastPage ()  { this.goToPage(this.pagecount);   },


  acceptPDFWarning: function acceptPDFWarning () {
    try {
      var ps = getPrefService().getBranch("celtx.pdf.");
      ps.setBoolPref("useraccepted", true);
    }
    catch (ex) {
      dump("*** gPDFController.acceptPDFWarning: " + ex + "\n");
    }
    this.allowpdf = true;
    gController.updateCommands();
    this.setPDFEnabled(true);
    this.frame.setAttribute("src", "about:blank");
    this.cmdGeneratePreview();
  },


  setPDFEnabled: function setPDFEnabled (val) {
    document.getElementById("pdfsaveasbtn").disabled = ! val;
    document.getElementById("pdfoptionsbtn").disabled = ! val;
    document.getElementById("pdfzoommenu").disabled = ! val;
  },


  hideProgressBox: function hideProgressBox () {
    document.getElementById("pdfprogressbox").collapsed = true;
  },


  showProgressBox: function showProgressBox () {
    document.getElementById("pdfprogressbox").collapsed = false;
  },


  open: function open (project, docres) {
    if (gScriptController.mode == "av")
      this.showTitle = false;
  },


  onScriptLoad: function onScriptLoad () {
    this.paperSize = gScriptController.scriptConfig.size;
    var ed = gScriptController.editor;

    var sceneNumbers = ed.getMetaValue("CX.sceneNumbering");
    if (sceneNumbers) this.sceneNumbers = sceneNumbers;
    this.showCharNumbers = ed.getMetaValue("CX.showCharNumbers") == "true";
    this.showAVHeader = ed.getMetaValue("CX.avShowHeader") == "True";

    var bbcShowName = ed.getMetaValue("CX.bbcShowName");
    if (bbcShowName)    this.bbcShowName = bbcShowName;
    var bbcSketchName = ed.getMetaValue("CX.bbcSketchName");
    if (bbcSketchName)  this.bbcSketchName = bbcSketchName;
    var bbcContact = ed.getMetaValue("CX.bbcContact");
    if (bbcContact)     this.bbcContact = bbcContact;

    var doc = gScriptController.editor.contentDocument.documentElement;
    var metas = doc.firstChild.getElementsByTagName("meta");
    for (var i = 0; i < metas.length; ++i) {
      if (metas[i].name != "CX.avHeader")
        continue;

      var index = (Number(metas[i].getAttribute("row")) - 1) * 2;
      if (metas[i].getAttribute("col") == "B")
        ++index;
      this.avHeaders[index] = {
        name: metas[i].getAttribute("label"),
        value: metas[i].content
      };
    }
  },


  updateMetas: function updateMetas () {
    var ed = gScriptController.editor;
    ed.setMetaValue("CX.sceneNumbering", this.sceneNumbers);

    if (gScriptController.mode == "radio") {
      ed.setMetaValue("CX.bbcShowName", this.bbcShowName);
      ed.setMetaValue("CX.bbcSketchName", this.bbcSketchName);
      ed.setMetaValue("CX.bbcContact", this.bbcContact);
    }

    if (gScriptController.mode != "av")
      return;

    // A/V Specific Metas
    ed.setMetaValue("CX.avShowHeader", this.showAVHeader ? "True" : "False");

    var doc = gScriptController.editor.contentDocument;
    var metas = doc.documentElement.firstChild.getElementsByTagName("meta");
    var metalist = [];
    var dups = [];
    for (var i = 0; i < metas.length; ++i) {
      if (metas[i].name != "CX.avHeader")
        continue;
      var index = (Number(metas[i].getAttribute("row")) - 1) * 2;
      if (metas[i].getAttribute("col") == "B")
        ++index;
      // Catch dups from previous erroneous code
      if (metalist[index])
        dups.push(metalist[index]);
      metalist[index] = metas[i];
    }
    while (metalist.length > this.avHeaders.length) {
      var meta = metalist.pop();
      if (meta)
        meta.parentNode.removeChild(meta);
    }
    while (dups.length > 0) {
      var meta = dups.pop();
      meta.parentNode.removeChild(meta);
    }
    for (var i = 0; i < this.avHeaders.length; ++i) {
      if (metalist.length <= i || ! metalist[i]) {
        metalist[i] = doc.createElement("meta");
        metalist[i].setAttribute("name", "CX.avHeader");
        doc.documentElement.firstChild.appendChild(metalist[i]);
      }
      if (i % 2 == 0) {
        metalist[i].setAttribute("row", i / 2 + 1);
        metalist[i].setAttribute("col", "A");
      }
      else {
        metalist[i].setAttribute("row", (i + 1) / 2);
        metalist[i].setAttribute("col", "B");
      }
      metalist[i].setAttribute("label", this.avHeaders[i].name);
      metalist[i].content = this.avHeaders[i].value;
    }
  },


  close: function close () {
  },


  save: function save () {
  },


  init: function init () {
  },


  destroy: function destroy () {
  },


  focus: function focus () {
    this.frame.setAttribute("type", "content-primary");
    this.paperSize = gScriptController.scriptConfig.size;
    gController.outlineView.showSceneNav();

    // Check this pref again, there may be multiple scripts
    // open and another one might have confirmed the pref.
    /*
    try {
      var ps = getPrefService().getBranch("celtx.pdf.");
      this.allowpdf = ps.getBoolPref("useraccepted");
    }
    catch (ex) {}
    */

    if (! this.allowpdf) return;
    // var scriptModCount = gScriptController.editor.modificationCount;
    // if (this.lastModCount == -1 || (scriptModCount != 0 &&
    //     scriptModCount != this.lastModCount)) {
    //   this.lastModCount = scriptModCount;
      this.cmdGeneratePreview();
    // }
  },


  blur: function blur () {
    this.frame.setAttribute("type", "content");
  },


  commands: {
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1,
    "cmd-script-format": 1,
    "cmd-treeitem-delete": 1,
    "cmd-treeitem-down": 1,
    "cmd-treeitem-goto": 1,
    "cmd-treeitem-recycle": 1,
    "cmd-treeitem-up": 1
  },


  supportsCommand: function supportsCommand (cmd) {
    return this.commands[cmd] == 1;
  },


  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
        return true;
      case "cmd-print":
      case "cmd-script-format":
      case "cmd-treeitem-goto":
        return this.allowpdf;
      case "cmd-print-preview":
      default:
        return false;
    }
  },


  doCommand: function doCommand (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        gApp.resetPrintingPrefs(false);
        gApp.setPrintMargins(0, 0, 0, 0);
        PrintUtils.print();
        break;
      case "cmd-print-preview":
        dump("*** TODO: implement cmd-print-preview in pdf\n");
        break;
      case "cmd-script-format":
        this.cmdOptions();
        break;
      case "cmd-treeitem-goto":
        this.cmdTreeitemGoto();
        break;
    }
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);
  },


  cmdOptions: function cmdOptions () {
    var config = {
      accepted: false,
      mode: gScriptController.mode,
      paperSize: this.paperSize,
      sceneNumbers: this.sceneNumbers,
      showScenes: this.showScenes,
      showTitle: this.showTitle,
      theatreFormat: this.theatreFormat,
      avFormat: this.avFormat,
      showAVHeader: this.showAVHeader,
      showCharNumbers: this.showCharNumbers,
      avHeaders: [],
      bbcShowName: this.bbcShowName,
      bbcSketchName: this.bbcSketchName,
      bbcContact: this.bbcContact
    };
    for (var i = 0; i < this.avHeaders.length; ++i) {
      config.avHeaders.push({
        name: this.avHeaders[i].name, value: this.avHeaders[i].value
      });
    }
    openDialog(Cx.CONTENT_PATH + "editors/pdfoptions.xul", "_blank",
      Cx.MODAL_DIALOG_FLAGS, config);
    if (config.accepted) {
      this.paperSize = config.paperSize;
      this.sceneNumbers = config.sceneNumbers;
      this.showScenes = config.showScenes;
      this.showTitle = config.showTitle;
      this.theatreFormat = config.theatreFormat;
      this.avFormat = config.avFormat;
      this.showAVHeader = config.showAVHeader;
      this.showCharNumbers = config.showCharNumbers;
      for (var i = 0; i < config.avHeaders.length; ++i) {
        if (i >= this.avHeaders.length || ! this.avHeaders[i])
          this.avHeaders[i] = { name: null, value: null };
        this.avHeaders[i].name = config.avHeaders[i].name;
        this.avHeaders[i].value = config.avHeaders[i].value;
      }

      this.bbcShowName = config.bbcShowName;
      this.bbcSketchName = config.bbcSketchName;
      this.bbcContact = config.bbcContact;

      this.updateMetas();
      this.cmdGeneratePreview();

      if (gScriptController.scriptConfig.size != this.paperSize) {
        gScriptController.scriptConfig.size = this.paperSize;
        setTimeout(function () { gScriptController.scriptConfig.update(); }, 0);
      }
    }
  },


  apply: function apply () {
    this.cmdGeneratePreview();
  },


  cancel: function cancel () {
    
  },


  formatSelected: function formatSelected (event) {
    // Don't make the checkbox item the menu's selected item
    if (event.target.getAttribute("type") == "checkbox") {
      // Manually toggle checkbox item's selection state
      if (event.target.getAttribute("checked"))
        event.target.removeAttribute("checked");
      else
        event.target.setAttribute("checked", "true");

      // Reset the proper selected item
      var menulist = document.getElementById("pdfformatlist");
      var items = menulist.getElementsByTagName("menuitem");
      for (var i = 0; i < items.length; ++i) {
        if (items[i].hasAttribute("name") &&
            items[i].getAttribute("checked")) {
          menulist.selectedItem = items[i];
          break;
        }
      }
    }
    this.apply();
  },


  sceneNumbersSelected: function sceneNumbersSelected (event) {
    this.apply();
  },


  scrollToCursor: function scrollToCursor () {
    var cursor = this.frame.contentDocument.getElementById("cursor");
    if (! cursor)
      return;
    cursor.scrollIntoView(true);
  },


  // For PrintUtils support
  get browser () {
    return this.frame;
  },


  setZoom: function setZoom (val) {
    var viewer = this.frame.docShell.contentViewer.QueryInterface(
      Components.interfaces.nsIMarkupDocumentViewer);
    viewer.textZoom = val / 100.0;
  },


  cmdTreeitemGoto: function cmdTreeitemGoto () {
    var id = null;
    if ("getSelectedID" in gController.outlineView)
      id = gController.outlineView.getSelectedID();
    else if ("getSelectedSceneID" in gController.outlineView)
      id = gController.outlineView.getSelectedSceneID();
    if (! id) {
      dump("*** gPDFController.cmdTreeitemGoto: no selected scene id\n");
      return;
    }
    var para = this.frame.contentDocument.getElementById(id);
    if (! para) {
      dump("*** gPDFController.cmdTreeitemGoto: no paragraph matches " + id + "\n");
      return;
    }
    para.scrollIntoView(true);
  },


  cmdGeneratePreview: function cmdGeneratePreview () {
    this.showProgressBox();

    var tmpfile = tempFile('html');

    var ios = getIOService();

    var fileURL = prefilterForPDF(gScriptController.editor.contentDocument);
    if (! fileURL) throw "PDF prefilter failed";

    // Get a buffered input stream for the script file
    var src = ios.newURI(fileURL, null, null);
    var srcChannel = ios.newChannelFromURI(src);

    var bufferedStream = getBufferedInputStream(srcChannel.open(),
      srcChannel.contentLength);

    // The upload channel
    var previewURL = getCeltxService().PDF_PREVIEW_URL;
    // if (gScriptController.mode == "av")
    //   previewURL += "av";
    var target = ios.newURI(previewURL, null, null);
    var upload = ios.newChannelFromURI(target);

    var charset = "UTF-8"; // this.editor.documentCharacterSet;
    var contentType = "text/html; charset=" + charset;
    upload = upload.QueryInterface(Components.interfaces.nsIHttpChannel);
    var us = upload.QueryInterface(Components.interfaces.nsIUploadChannel);
    us.setUploadStream(bufferedStream, contentType, -1);
    upload.requestMethod = "POST";

    var listener = {
      canceled: false,
      dstpath:  fileToFileURL(tmpfile),
      channel:  upload,

      QueryInterface: function (id) {
        if (id.equals(Components.interfaces.nsIDownloadObserver) ||
            id.equals(Components.interfaces.nsISupports)) return this;

        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
      },

      onDownloadComplete: function (downloader, request, context,
                                    status, result) {
        document.getElementById("pdfcancel").disabled = true;
        document.getElementById("pdfprogressmeter").mode = "determined";
        document.getElementById("pdfprogressmeter").value = 100;
        if (this.canceled) {
          document.getElementById("pdfprogressmsg").value
            = gApp.getText("Cancelled");
          return;
        }
        else if (status != Components.results.NS_OK ||
            ! this.channel.requestSucceeded) {
          gPDFController.frame.setAttribute("src",
            Cx.CONTENT_PATH + "editors/pdferror.xhtml");
          return;
        }

        gPDFController.hideProgressBox();
        document.getElementById("pdfprogressmsg").value = gApp.getText("Done");
        gPDFController.frame.setAttribute("src", this.dstpath);
        gPDFController.frame.contentWindow.focus();
        setTimeout("gPDFController.scrollToCursor()", 100);
        setTimeout("gPDFController.updatePages()", 200);
      }
    };

    // An nsIDownloader to handle the result
    var downloader = getDownloader();
    downloader.init(listener, tmpfile);

    upload.asyncOpen(downloader, null);

    document.getElementById("pdfprogressmeter").mode = "undetermined";
    document.getElementById("pdfprogressmeter").value = 0;
    document.getElementById("pdfprogressmsg").value
      = gApp.getText("FormattingScript");
    document.getElementById("pdfcancel").disabled = false;
  },


  cmdGeneratePDF: function cmdGeneratePDF () {
    try {
      var fp = getFilePicker();
      fp.init(window, gApp.getText("SaveAs"), fp.modeSave);
      fp.appendFilter("PDF", "*.pdf");
      var title = gScriptController.editor.contentDocument.title;
      fp.defaultString = sanitizeFilename(title) + ".pdf";
      fp.defaultExtension = "pdf";
      if (fp.show() == fp.returnCancel) return;

      if (fp.filterIndex == 0)
        this.exportScriptAsPDF(fp.file);
      else
        throw "Invalid filter index";
    }
    catch (ex) {
      dump("*** generatePDF: " + ex + "\n");
    }
  },


  pdfExportData: {},


  exportScriptAsPDF: function exportScriptAsPDF (file) {
    this.pdfExportData.file = file;

    try {
      if (! this.pdfExportData.file)
        throw "No destination for PDF export";

      if (! this.pdfExportData.file.leafName.match(/\.pdf$/i))
        this.pdfExportData.file.leafName += ".pdf";

      var tmpfile = getTempDir();
      tmpfile.append(generateID() + ".pdf");

      var truepath = tmpfile.path;

      var listener = {
        canceled: false,
        channel:  null,

        QueryInterface: function (id) {
          if (id.equals(Components.interfaces.nsIDownloadObserver) ||
              id.equals(Components.interfaces.nsISupports)) return this;

          throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        },

        onDownloadComplete: function (downloader, request, context, status, result) {
          document.getElementById("pdfcancel").disabled = true;
          document.getElementById("pdfprogressmeter").mode = "determined";
          document.getElementById("pdfprogressmeter").value = 100;
          if (this.canceled) {
            document.getElementById("pdfprogressmsg").value
              = gApp.getText("Cancelled");
            if (result.exists())
              result.remove(false);
            return;
          }
          else if (status != Components.results.NS_OK ||
              ! this.channel.requestSucceeded) {
            gPDFController.frame.setAttribute("src",
              Cx.CONTENT_PATH + "editors/pdferror.xhtml");
            if (result.exists())
              result.remove(false);
            return;
          }

          gPDFController.hideProgressBox();
          document.getElementById("pdfprogressmsg").value
            = gApp.getText("Done");

          var dstfile = gPDFController.pdfExportData.file;
          try {
            if (dstfile.exists())
              dstfile.remove(false);
            result.copyTo(dstfile.parent, dstfile.leafName);
          }
          catch (ex) {
            dump("*** exportScriptAsPDF: " + ex + "\n");
          }

          gPDFController.pdfExportData.file = null;
        }

      };


      var ios = getIOService();

      var fileURL = prefilterForPDF(gScriptController.editor.contentDocument);
      if (! fileURL) throw "PDF prefilter failed";

      // Get a buffered input stream for the script file
      var src = ios.newURI(fileURL, null, null);
      var srcChannel = ios.newChannelFromURI(src);

      var bufferedStream = getBufferedInputStream(srcChannel.open(),
        srcChannel.contentLength);

      // The upload channel
      var convertURL = getCeltxService().PDF_CONVERT_URL;
      // if (gScriptController.mode == "av")
      //   convertURL += "av";
      var target = ios.newURI(convertURL, null, null);
      var upload = ios.newChannelFromURI(target);

      var charset = "UTF-8"; // this.editor.documentCharacterSet;
      var contentType = "text/html; charset=" + charset;
      upload = upload.QueryInterface(Components.interfaces.nsIHttpChannel);
      var us = upload.QueryInterface(Components.interfaces.nsIUploadChannel);
      us.setUploadStream(bufferedStream, contentType, -1);
      upload.requestMethod = "POST";

      listener.channel = upload;

      // An nsIDownloader to handle the result
      var downloader = getDownloader();
      downloader.init(listener, tmpfile);

      upload.asyncOpen(downloader, null);

      document.getElementById("pdfprogressmeter").mode = "undetermined";
      document.getElementById("pdfprogressmeter").value = 0
      document.getElementById("pdfprogressmsg").value
        = gApp.getText("FormattingScript");
      document.getElementById("pdfcancel").disabled = false;
    }
    catch (ex) {
      dump("*** goDoPDF: " + ex + "\n");
    }

  }
};


function goDoPDF(succeeded) {
  if (succeeded)
    gPDFController.cmdGeneratePDF();
}


function prefilterForPDF (doc) {
  try {
    var xsl = document.implementation.createDocument("", "", null);
    xsl.async = false;
    xsl.load(Cx.TRANSFORM_PATH + 'pdf-prefilter.xml');

    var proc = new XSLTProcessor();
    proc.importStylesheet(xsl);

    if (gScriptController.mode == "film")
      proc.setParameter(null, "script.format", "screenplay");
    else if (gScriptController.mode == "theatre")
      proc.setParameter(null, "script.format", gPDFController.theatreFormat);
    else if (gScriptController.mode == "av")
      proc.setParameter(null, "script.format", gPDFController.avFormat);
    else if (gScriptController.mode == "radio")
      proc.setParameter(null, "script.format", "radioplay");
    else
      proc.setParameter(null, "script.format", gScriptController.mode);

    proc.setParameter(null, "page.size", gPDFController.paperSize);
    proc.setParameter(null, "script.titlepage", gPDFController.showTitle);
    proc.setParameter(null, "script.showscenes", gPDFController.showScenes);
    proc.setParameter(null, "script.soundcues", gPDFController.showCharNumbers);

    proc.setParameter(null, "bbc.showname", gPDFController.bbcShowName);
    proc.setParameter(null, "bbc.sketchname", gPDFController.bbcSketchName);
    proc.setParameter(null, "bbc.contact", gPDFController.bbcContact);

    var branch = getPrefService().getBranch('celtx.pdf.');
    var prefs = branch.getChildList('', {});

    for (var i = 0; i < prefs.length; i++) {
      var name = prefs[i];
      var type = branch.getPrefType(name);
      var value = '';

      if (type == branch.PREF_BOOL) {
        value = branch.getBoolPref(name);
      }
      else if (type == branch.PREF_INT) {
        value = branch.getIntPref(name);
      }
      else if (type == branch.PREF_STRING) {
        try {
          const nsISupportsString = Components.interfaces.nsISupportsString;
          value = branch.getComplexValue(name, nsISupportsString).toString();
        }
        catch (ex) {
          value = branch.getCharPref(name);
        }
      }

      proc.setParameter(null, name, value);
    }

    // Save the cursor location
    var cursorspan = null;
    try {
      if (! gScriptController.editor.isLocked) {
        var scriptdoc = gScriptController.editor.contentDocument;
        var oldcursor = scriptdoc.getElementById("cursor");
        while (oldcursor) {
          gScriptController.editor.editor.deleteNode(oldcursor);
          oldcursor = scriptdoc.getElementById("cursor");
        }
        var sel = gScriptController.editor.selection;
        var left = {};
        var node = sel.anchorNode;
        if (node && node.parentNode) {
          gScriptController.suppressRevisionStyle();
          cursorspan = gScriptController.editor.editor
            .createElementWithDefaults("span");
          cursorspan.setAttribute("id", "cursor");
          gScriptController.editor.editor.insertElementAtSelection(cursorspan, false);
          gScriptController.setRevisionStyle();
        }
      }
    }
    catch (ex) {
      dump("*** prefilterForPDF: " + ex + "\n");
      cursorspan = null;
    }
    var out = proc.transformToDocument(doc);
    try {
      if (cursorspan) {
        gScriptController.editor.editor.undo(1);
      }
    }
    catch (ex) {
      dump("*** prefilterForPDF: " + ex + "\n");
    }

    // Adjust the scene number preference (unless script is AV)
    if (gScriptController.mode != "av") {
      var metas = out.documentElement.firstChild.getElementsByTagName("meta");
      for (var i = 0; i < metas.length; ++i) {
        if (metas[i].getAttribute("name") == "CX.sceneNumbering")
          metas[i].setAttribute("content", gPDFController.sceneNumbers);
      }
    }

    var tmpFile = tempFile('html');

    serializeDOMtoFile(out, tmpFile);

    return fileToFileURL(tmpFile);
  }
  catch (ex) {
    dump("prefilterForPDF: " + ex + "\n");
  }

  return null;
}
