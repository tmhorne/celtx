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

var gApp = {
  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsISupportsWeakReference) ||
        iid.equals(Components.interfaces.nsIController) ||
        iid.equals(Components.interfaces.nsIObserver))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },


  sb: null,
  initialized: false,


  getText: function (name, params) {
    if (! this.sb) {
      var bundleSvc = getStringBundleService();
      var bundlePath = Cx.LOCALE_PATH + "celtx.properties";
      this.sb = bundleSvc.createBundle(bundlePath);
    }
    try {
      if (params)
        return this.sb.formatStringFromName(name, params, params.length);
      else
        return this.sb.GetStringFromName(name);
    }
    catch (ex) {
      dump("*** gApp.getText: Couldn't get " + name + "\n");
      return null;
    }
  },


  commands: {
    "cmd-new-project": 1,
    "cmd-open-pc": 1,
    "cmd-open-project": 1,
    "cmd-open-studio": 1,
    "cmd-about-celtx": 1,
    "cmd-help-support": 1,
    "cmd-celtx-wiki": 1,
    "cmd-video-tutorial": 1,
    "cmd-help-report-bug": 1
  },


  supportsCommand: function (cmd) {
    return this.commands[cmd] == 1;
  },


  isCommandEnabled: function (cmd) {
    switch (cmd) {
      default:
        return true;
    }
  },


  doCommand: function (cmd) {
    if (! this.initialized)
      this.init();
    switch (cmd) {
      case "cmd-new-project":
        this.cmdNewProject();
        break;
      case "cmd-open-pc":
        this.openBrowser(Cx.PROJ_CENTRAL_URL);
        break;
      case "cmd-open-project":
        this.openProject();
        break;
      case "cmd-open-studio":
        // this.openBrowser(getCeltxService().STUDIO_BASEURL + "/");
        this.openStudioProject();
        break;
      case "cmd-about-celtx":
        this.showAboutDialog();
        break;
      case "cmd-help-support":
        this.openBrowser(Cx.FORUMS_URL);
        break;
      case "cmd-celtx-wiki":
        this.openBrowser(Cx.USER_GUIDE_URL);
        break;
      case "cmd-video-tutorial":
        this.openBrowser(Cx.WALKTHRU_URL);
        break;
      case "cmd-help-report-bug":
        this.openBrowser(Cx.BUG_REPORT_URL);
        break;
    }
  },


  setToolbarMode: function setToolbarMode (mode) {
    var ps = getPrefService().getBranch("celtx.toolbar.");
    ps.setCharPref("show", mode);
  },


  observe: function (subject, topic, data) {
    if (topic != "nsPref:changed" || data != "celtx.toolbar.show")
      return;
    var ps = getPrefService().getBranch("celtx.toolbar.");
    var mode = ps.getCharPref("show");
    var obs = document.getElementById("toolbar-broadcaster");
    if (obs)
      obs.setAttribute("mode", mode);
    var menuitem = document.getElementById("menu-toolbarmode-" + mode);
    if (! menuitem) {
      return;
    }
    if (menuitem && menuitem.getAttribute("checked") != "true")
      menuitem.setAttribute("checked", "true");
    else
      dump("*** gApp.observe: menuitem already marked?\n");
  },


  handleEvent: function handleEvent (event) {
    if (event.type == "load")
      this.init();
    else
      dump("*** gApp.handleEvent: Unknown event '" + event.type + "'\n");
  },


  get userID () {
    try {
      var prefsvc = getPrefService().QueryInterface(
        Components.interfaces.nsIPrefBranch);
      return prefsvc.getCharPref(Cx.PREF_USER_ID);
    }
    catch (ex) {
      return null;
    }
  },


  set userID (val) {
    try {
      prefsvc = getPrefService().QueryInterface(
        Components.interfaces.nsIPrefBranch);
      if (val)
        prefsvc.setCharPref(Cx.PREF_USER_ID, val);
      else
        prefsvc.clearUserPref(Cx.PREF_USER_ID);
    }
    catch (ex) {
      dump("*** gApp.userID setter: " + ex + "\n");
    }
  },


  init: function init () {
    if (this.initialized) return;

    var ps = getPrefService();
    ps = ps.QueryInterface(Components.interfaces.nsIPrefBranch2);
    ps.addObserver("celtx.toolbar.", this, false);
    this.initPrefs();
    rebuildRecentProjectsMenu();
    try {
      this.checkTemplates();
    }
    catch (ex) {
      dump("*** checkTemplates: " + ex + "\n");
    }
    try {
      this.checkSamples();
    }
    catch (ex) {
      dump("*** checkSamples: " + ex + "\n");
    }
    try {
      this.checkSuperbundle();
    }
    catch (ex) {
      dump("*** checkSuperbundle: " + ex + "\n");
    }
    getPrefService().getBranch("celtx.").setCharPref("version", Cx.VERSION);
    this.initialized = true;
  },


  checkProfileDir: function checkProfileDir (dirname, forceupdate) {
    // See if there's already a directory with at least
    // one entry in it. If so, return without action.
    var IFile = Components.interfaces.nsIFile;
    var dstdir = currentProfileDir();
    dstdir.append(dirname);
    if (dstdir.exists()) {
      if (! forceupdate) {
        var entries = dstdir.directoryEntries;
        while (entries.hasMoreElements()) {
          var entry = entries.getNext().QueryInterface(IFile);
          if (entry.leafName.match(/\.t?celtx$/))
            return;
        }
      }
    }
    else {
      dstdir.create(1, dstdir.parent.permissions);
    }

    // Copy over all the default templates
    var srcdir = currentProcessDir();
    srcdir.append("defaults");
    srcdir.append("profile");
    srcdir.append(dirname);
    var srcfiles = srcdir.directoryEntries;
    while (srcfiles.hasMoreElements()) {
      var srcfile = srcfiles.getNext().QueryInterface(IFile);
      var dstfile = dstdir.clone();
      dstfile.append(srcfile.leafName);
      if (dstfile.exists() && dstfile.fileSize != srcfile.fileSize)
        dstfile.remove(false);
      if (! dstfile.exists()) {
        try {
          srcfile.copyTo(dstdir, srcfile.leafName);
        }
        catch (ex) {
          dump("*** checkProfileDir: " + ex + "\n");
        }
      }
    }
  },


  checkTemplates: function checkTemplates () {
    this.checkProfileDir(Cx.TEMPLATES_DIR, true);

    // Add the Comic Book template if we're upgrading from pre-1.0
    var prefsvc = getPrefService().QueryInterface(
      Components.interfaces.nsIPrefBranch);
    var lastVersion = new Version();
    try {
      lastVersion = new Version(prefsvc.getCharPref("celtx.version"));
    }
    catch (ex) {
      // Not upgrading at all
      return;
    }
    var pre10 = (lastVersion.compare(new Version("1.0")) < 0);
    if (! pre10)
      return;

    var dstfile = currentProfileDir();
    dstfile.append(Cx.TEMPLATES_DIR);

    var audiotmpl = dstfile.clone();
    audiotmpl.append("4_Podcast.celtx");
    if (audiotmpl.exists()) {
      audiotmpl.remove(false);

      var srcfile = currentProcessDir();
      srcfile.append("defaults");
      srcfile.append("profile");
      srcfile.append(Cx.TEMPLATES_DIR);
      srcfile.append("4_Podcast.celtx");
      srcfile.copyTo(dstfile, srcfile.leafName);
    }

    // Renumber the Text project from 7 to 6
    var txttmpl = dstfile.clone();
    txttmpl.append("6_Text.tceltx");
    if (txttmpl.exists()) {
      try {
        txttmpl.moveTo(txttmpl.parent, "7_Text.celtx");
      }
      catch (ex) {
        dump("*** Error moving 6_Text.tceltx to 7_Text.celtx: " + ex + "\n");
      }
    }

    var oldcomic = dstfile.clone();
    oldcomic.append("7_ComicBook.celtx");
    if (oldcomic.exists()) {
      try {
        oldcomic.remove(false);
      }
      catch (ex) {
        dump("*** Error deleting 7_ComicBook.celtx: " + ex + "\n");
      }
    }

    var dsticon = dstfile.clone();
    dstfile.append("6_ComicBook.celtx");
    dsticon.append("ComicBook.png");

    var srcfile = currentProcessDir();
    srcfile.append("defaults");
    srcfile.append("profile");
    srcfile.append(Cx.TEMPLATES_DIR);

    var srcicon = srcfile.clone();
    srcfile.append("6_ComicBook.celtx");
    srcicon.append("ComicBook.png");

    if (! dstfile.exists())
      srcfile.copyTo(dstfile.parent, srcfile.leafName);
    if (! dsticon.exists())
      srcicon.copyTo(dsticon.parent, srcicon.leafName);
  },


  checkSamples: function checkSamples () {
    this.checkProfileDir(Cx.SAMPLES_DIR, true);
  },


  checkSuperbundle: function checkSuperbundle () {
    /* The assumption is that each extension's ID can be formed from its
     * install file by replacing .xpi with @celtx.com, e.g.,
     *     art-pack-1.xpi -> art-pack-1@celtx.com
     *
     * That avoids needing to unpack and analyze every extension,
     * every time Celtx is launched.
     */
    var superbundledir = currentProcessDir();
    superbundledir.append("superbundle");
    if (! superbundledir.exists())
      return;

    var prefsvc = getPrefService();
    var installing = true;
    try {
      installing = prefsvc.getBranch("celtx.superbundle.").getBoolPref("installing");
    }
    catch (ex) {
      dump("*** Couldn't check celtx.superbundle.installing pref");
    }

    var IFile = Components.interfaces.nsIFile;
    var extmgr = Components.classes["@mozilla.org/extensions/manager;1"]
      .getService(Components.interfaces.nsIExtensionManager);
    var files = superbundledir.directoryEntries;
    var newInstalls = false;
    while (files.hasMoreElements()) {
      var extfile = files.getNext().QueryInterface(IFile);
      if (! extfile.leafName.match(/\.(xpi|cxext)$/))
        continue;
      var extid = extfile.leafName.replace(/\.(xpi|cxext)$/, "@celtx.com");
      try {
        if (! extmgr.getInstallLocation(extid)) {
          extmgr.installItemFromFile(extfile, "app-profile");
          newInstalls = true;
        }
      }
      catch (ex) {
        dump("*** Failed to install " + extfile.leafName + ": " + ex + "\n");
      }
    }

    if (newInstalls && ! installing) {
      try {
        prefsvc.getBranch("celtx.superbundle.").setBoolPref("installing", true);
        var IAppStartup = Components.interfaces.nsIAppStartup;
        var appStartup = Components.classes[
          '@mozilla.org/toolkit/app-startup;1'].getService(IAppStartup);
        appStartup.quit(IAppStartup.eForceQuit | IAppStartup.eRestart);
      }
      catch (ex) {
        dump("*** Unable to restart app: " + ex + "\n");
      }
    }

    prefsvc.getBranch("celtx.superbundle.").setBoolPref("installing", false);
  },


  initPrefs: function initPrefs () {
    var prefsvc = null;
    try {
      prefsvc = getPrefService().QueryInterface(
        Components.interfaces.nsIPrefBranch);
    }
    catch (ex) {
      throw "Unable to get the preferences service";
    }

    // Adjust an old preference to the new name. We changed this slightly,
    // because disabling cookies interefered with the ability to log in
    // to the Studio. Instead this disables cookies specifically for the
    // launch statistics, as was the original intent of the preference.
    try {
      var cookiepref = "network.cookie.cookieBehavior";
      // This only has a user value if the user disabled the ping.
      if (prefsvc.prefHasUserValue(cookiepref)) {
        prefsvc.clearUserPref(cookiepref);
        prefsvc.setBoolPref("celtx.server.ping", false);

        var IPerm = Components.interfaces.nsIPermissionManager;
        var pm = Components.classes["@mozilla.org/permissionmanager;1"]
          .getService(IPerm);
        var uri = getIOService().newURI("http://publish.celtx.com", null, null);
        pm.add(uri, "cookie", IPerm.DENY_ACTION);
      }
    } catch (ex) {
      dump("*** initPrefs: " + ex + "\n");
    }

    try {
      var clearpass = prefsvc.getCharPref("celtx.user.password");
      if (clearpass) {
        prefsvc.setCharPref("celtx.user.encpassword",
          base64_encodew(clearpass));
        prefsvc.clearUserPref("celtx.user.password");
      }
    }
    catch (ex) {}

    var firstLaunch = true;
    try {
      firstLaunch = prefsvc.getBoolPref("celtx.firstlaunch");
      if (firstLaunch) {
        prefsvc.setBoolPref("celtx.firstlaunch", false);
        firstLaunch = false;
      }
    }
    catch (ex) {
      prefsvc.setBoolPref("celtx.firstlaunch", true);
    }

    var lastVersion = new Version();
    try {
      lastVersion = new Version(prefsvc.getCharPref("celtx.version"));
    }
    catch (ex) {}

    
    var pre097 = (lastVersion.compare(new Version("0.9.7")) < 0);
    var pre098 = (lastVersion.compare(new Version("0.9.8")) < 0);
    var pre099 = (lastVersion.compare(new Version("0.9.9")) < 0);
    var pre10  = (lastVersion.compare(new Version("1.0"))   < 0);

    if (pre098) {
      try {
        this.createDefaultDeptList();
      }
      catch (ex) {
        dump("*** createDefaultDeptList: " + ex + "\n");
      }
    }
    else if (pre10) {
      // Add "Crew" and "Scene Details" only if there's an established
      // department list preference
      try {
        gProjMgr.fixupRecentProjects();
      }
      catch (ex) {
        dump("*** checkRecentProjects: " + ex + "\n");
      }

      try {
        var rdfsvc = getRDFService();
        var rdfsrc = currentProfileDir();
        rdfsrc.append(Cx.PREFS_FILE);
        var ds = rdfsvc.GetDataSourceBlocking(fileToFileURL(rdfsrc));
        var seqres = rdfsvc.GetResource(Cx.NS_CX + "Prefs/Categories");
        var seq = new RDFSeq(ds, seqres);
        var crewres = rdfsvc.GetResource(Cx.NS_CX + "Crew");
        if (seq.indexOf(crewres) < 0)
          seq.push(crewres);
        var sceneres = rdfsvc.GetResource(Cx.NS_CX + "SceneDetails");
        if (seq.indexOf(sceneres) < 0)
          seq.push(sceneres);
      }
      catch (ex) {
        dump("*** pre10 update: " + ex + "\n");
      }
    }

    if (pre099) {
      try {
        if (prefsvc.prefHasUserValue("print.macosx.pagesetup-2"))
          prefsvc.clearUserPref("print.macosx.pagesetup-2");
      }
      catch (ex) {
        dump("*** pre099 update: " + ex + "\n");
      }
    }

    // Make sure the user dictionary has a value, otherwise inline spell
    // checking will fail silently.
    try {
      prefsvc.getCharPref("spellchecker.dictionary");
    }
    catch (ex) {
      prefsvc.setCharPref("spellchecker.dictionary", "en-US");
    }

    // Set the toolbar icon/text mode
    try {
      this.setToolbarMode(prefsvc.getCharPref("celtx.toolbar.show"));
    }
    catch (ex) {
      this.setToolbarMode("icons");
    }
    // No event is sent if the preference doesn't actually change, so we need
    // to force it to set the toolbar mode and check the menu item on init.
    this.observe(prefsvc, "nsPref:changed", "celtx.toolbar.show");

    try {
      var dir = prefsvc.getCharPref("celtx.projectsdirectory");
    }
    catch (ex) {
      try {
        dir = userDocsDir().path;
        prefsvc.setCharPref("celtx.projectsdirectory", dir);
      }
      catch (ex2) {
        dump("*** Unable to set projects directory: " + ex2 + "\n");
      }
    }

    try {
      gApp.resetPrintingPrefs();
    }
    catch (ex) {
      dump("*** resetPrintingPrefs: " + ex + "\n");
    }
  },


  createDefaultDeptList: function createDefaultDeptList () {
    var rdfsrc = currentProfileDir();
    rdfsrc.append(Cx.PREFS_FILE);
    if (rdfsrc.exists())
      return;

    var rdfsvc = getRDFService();
    var ds = getInMemoryDataSource();
    var seqres = rdfsvc.GetResource(Cx.NS_CX + "Prefs/Categories");
    var seq = new RDFSeq(ds, seqres);

    var schemads = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
    var defaultres = rdfsvc.GetResource(Cx.SCHEMA_URL + "#default-markup");
    var defaultseq = new RDFSeq(schemads, defaultres);
    var itemlist = defaultseq.toArray();

    for (var i = 0; i < itemlist.length; ++i)
      seq.push(itemlist[i]);

    try {
      serializeDataSourceToFile(ds, rdfsrc);
    }
    catch (ex) {
      dump("*** createDefaultDeptList: " + ex + "\n");
    }
  },


  setPrintMargins: function setPrintMargins (top, right, bottom, left) {
    var PSSVC = Components.classes["@mozilla.org/gfx/printsettings-service;1"]
      .getService(Components.interfaces.nsIPrintSettingsService);
    var opts = PSSVC.QueryInterface(Components.interfaces.nsIPrintOptions);
    /*
    if (! opts.availablePrinters().hasMoreElements()) {
      dump("--- setPrintMargins: No printers available. Aborting.\n");
      return;
    }
    */

    try {
      var printSettings = PrintUtils.getPrintSettings();
      printSettings.marginTop       = top;
      printSettings.marginBottom    = bottom;
      printSettings.marginLeft      = left;
      printSettings.marginRight     = right;
      var flags = printSettings.kInitSaveMargins;
      PSSVC.savePrintSettingsToPrefs(printSettings, true, flags);
    }
    catch (ex) {
      dump("*** app.setPrintMargins: " + ex + "\n");
    }
  },


  resetPrintingPrefs: function resetPrintingPrefs (showPageNumbers) {
    // Oops, this should never have been set.
    var IPrefBranch = Components.interfaces.nsIPrefBranch;
    var prefsvc = getPrefService().QueryInterface(IPrefBranch);
    if (prefsvc.prefHasUserValue("print.print_printer") &&
        prefsvc.getCharPref("print.print_printer") != "") {
      prefsvc.clearUserPref("print.print_printer", "");
    }

    var PSSVC = Components.classes["@mozilla.org/gfx/printsettings-service;1"]
      .getService(Components.interfaces.nsIPrintSettingsService);
    var opts = PSSVC.QueryInterface(Components.interfaces.nsIPrintOptions);
    /*
    if (! opts.availablePrinters().hasMoreElements()) {
      dump("--- resetPrintingPrefs: No printers available. Aborting.\n");
      return;
    }
    */
    // Initialise the printer settings to our preferred defaults
    try {
      var printSettings = PrintUtils.getPrintSettings();
      printSettings.headerStrLeft   = "";
      printSettings.headerStrCenter = "";
      printSettings.headerStrRight  = showPageNumbers ? "&P" : "";
      printSettings.footerStrLeft   = "";
      printSettings.footerStrCenter = "";
      printSettings.footerStrRight  = "";
      printSettings.printBGColors   = true;
      printSettings.marginTop       = 0.5;
      printSettings.marginBottom    = 0.5;
      printSettings.marginLeft      = 0.5;
      printSettings.marginRight     = 0.5;
      printSettings.shrinkToFit     = false;
      var flags = printSettings.kInitSaveHeaderLeft   |
        printSettings.kInitSaveHeaderCenter |
        printSettings.kInitSaveHeaderRight  |
        printSettings.kInitSaveFooterLeft   |
        printSettings.kInitSaveFooterCenter |
        printSettings.kInitSaveFooterRight  |
        printSettings.kInitSaveBGColors     |
        printSettings.kInitSaveMargins      |
        printSettings.kInitSaveShrinkToFit  ;
      PSSVC.savePrintSettingsToPrefs(printSettings, true, flags);
    }
    catch (ex) {
      dump("*** app.initPrefs: " + ex + "\n");
    }
  },


  cmdNewProject: function cmdNewProject () {
    try {
      if (0) {
        window.openDialog(Cx.CONTENT_PATH, "_blank", Cx.NEW_WINDOW_FLAGS);
      }
      else if (0) {
        var spec = this.createTempProject();
        window.openDialog(Cx.CONTENT_PATH, "_blank", Cx.NEW_WINDOW_FLAGS, spec);
      }
      else {
        window.openDialog(Cx.CONTENT_PATH + "newproject.xul", "_blank",
          Cx.NEW_WINDOW_FLAGS + ",centerscreen");
      }
    }
    catch (ex) {
      dump("*** cmdNewProject: " + ex + "\n");
    }
  },


  findProjectWindowByFile: function findProjectWindowByFile (file) {
    var wm = getWindowMediator();
    var e  = wm.getEnumerator('celtx:main');
    while (e.hasMoreElements()) {
      var w = e.getNext();
      var celtxfile = w.getProjectFile();
      if (celtxfile && celtxfile.equals(file)) {
        return w;
      }
    }

    return null;
  },


  findProjectWindowByID: function findProjectWindowByID (projid) {
    var wm = getWindowMediator();
    var e  = wm.getEnumerator('celtx:main');
    while (e.hasMoreElements()) {
      var w = e.getNext();
      if (w.gProject && w.gProject.id == projid) {
        return w;
      }
    }

    return null;
  },


  createTempProject: function createTempProject () {
    var projdir = getTempDir();
    projdir.append("project");
    projdir.createUnique(1, projdir.parent.permissions);
    var projfile = gProjMgr.createProject(projdir);
    var project = new Project(projfile);
    project.init();
    project.flush();
    return projfile;
  },


  createProject: function createProject (dir, title, docs) {
    var rdfsvc = getRDFService();
    var doctypeurl = Cx.CONTENT_PATH + "doctypes.rdf";
    var doctyperdf = rdfsvc.GetDataSourceBlocking(doctypeurl);
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");

    var projdir = dir.clone();
    projdir.append(sanitizeFilename(title));
    projdir.createUnique(1, 0700);
    var celtxfile = projdir.clone();
    celtxfile.append(projdir.leafName + ".celtx");
    celtxfile.create(0, 0600);

    var projFile = gProjMgr.createProject(projdir, title);
    var project = new Project(projFile);
    project.init();
    for (var i = 0; i < docs.length; i++) {
      var doctype = rdfsvc.GetResource(docs[i]);
      var doctitle = doctyperdf.GetTarget(doctype, titlearc, true);
      if (doctitle) {
        doctitle = doctitle.QueryInterface(Components.interfaces.nsIRDFLiteral);
        project.createDocument(doctitle.Value, doctype);
      }
      else
        dump("*** no doctitle for " + doctype.Value + "\n");
    }
    project.flush();

    return projFile;
  },


  openProject: function openProject () {
    var IFilePicker = Components.interfaces.nsIFilePicker;
    var fp = getFilePicker();
    fp.init(window, gApp.getText("OpenProject"), IFilePicker.modeOpen);
    fp.appendFilter(gApp.getText("CeltxProject"), "*.celtx");
    // fp.appendFilter(gApp.getText("CeltxTemplate"), "*.tceltx");
    fp.displayDirectory = getCeltxProjectsDir();
    if (fp.show() != IFilePicker.returnOK)
      return false;

    if (! (fp.file.leafName.match(/\.t?celtx$/))) {
      alert(gApp.getText("InvalidProjectFile"));
      return false;
    }
    var spec = fp.fileURL.spec;

    setCeltxProjectsDir(fp.file.parent);

    // Check if the project is already open
    var existingWindow = this.findProjectWindowByFile(fp.file);
    if (existingWindow) {
      existingWindow.focus();
      return true;
    }

    window.openDialog(Cx.CONTENT_PATH, "_blank", Cx.NEW_WINDOW_FLAGS, spec);

    return true;
  },


  openStudioProject: function openStudioProject () {
    var cxsvc = getCeltxService();
    if (! cxsvc.loggedIn) {
      var observer = {
        onLogin: function (good) {
          if (good) gApp.openStudioProject();
        }
      };
      cxsvc.login("", observer, false, window);
      return;
    }

    var config = {
      accepted: false,
      serverItem: null
    };

    openDialog(Cx.CONTENT_PATH + "openstudiodialog.xul", "",
      Cx.MODAL_DIALOG_FLAGS, config);

    if (config.accepted) {
      try {
        dump("--- openStudioProject: Opening " + config.serverItem.title + "\n");
      }
      catch (ex) {
        dump("*** Don't seem to have a server item: " + config.serverItem + "\n");
      }
      window.openDialog(Cx.CONTENT_PATH, "_blank", Cx.NEW_WINDOW_FLAGS,
        config.serverItem);
    }
  },


  showAboutDialog: function showAboutDialog () {
    window.openDialog(Cx.CONTENT_PATH + "about.xul", "_blank",
                      Cx.MODAL_DIALOG_FLAGS);
  },


  showPicklist: function showPicklist (filter, obj) {
    window.openDialog(Cx.CONTENT_PATH + "picklist.xul", "_blank",
                      Cx.MODAL_DIALOG_FLAGS, filter, obj, gProject);
  },


  openBrowser: function openBrowser (url) {
    var ios = getIOService();
    var eps = getExternalProtocolService();
    var uri = ios.newURI(url, null, null);
    if (uri.scheme != "http" && uri.scheme != "https") {
      dump("*** openBrowser only supports http[s] uris!\n");
      return;
    }
    if (! eps.externalProtocolHandlerExists(uri.scheme)) {
      if (! (isMac() || isWin())) {
        var xdgfile = pathToFile("/usr/bin/xdg-open");
        if (! xdgfile.exists())
          xdgfile = pathToFile("/bin/xdg-open");
        if (xdgfile.exists()) {
          var proc = Components.classes["@mozilla.org/process/util;1"]
            .createInstance(Components.interfaces.nsIProcess);
          proc.init(xdgfile);
          proc.run(true, [ url ], 1);
          if (proc.exitValue == 0)
            return;
        }
      }
      dump("*** No external handler for " + uri.scheme + "\n");
      return;
    }
    eps.loadURI(uri, null);
  },


  cmdAccountWizard: function cmdAccountWizard () {
    // TODO: Update when the Studio link is ready
    gApp.openBrowser(getCeltxService().STUDIO_BASEURL + "/");
  }
};


var gProjMgr = new ProjectManager();


function addToRecentProjects (filedesc) {
  if (! filedesc) {
    celtxBugAlert("fileuri is undefined", Components.stack);
    return;
  }

  removeFromRecentProjects(filedesc);

  var recent = gProjMgr.recentProjects;
  filedesc = getRDFService().GetLiteral(filedesc);

  recent.insert(filedesc, 0);
  while (recent.length > 10)
    recent.remove(recent.length - 1);
  gProjMgr.flush();
  getObserverService().notifyObservers(gProjMgr,
    "celtx:recent-projects-changed", null);
}


function removeFromRecentProjects (filedesc) {
  var desclit = getRDFService().GetLiteral(filedesc);
  var recent = gProjMgr.recentProjects;
  while (recent.indexOf(desclit) >= 0)
    recent.remove(desclit)

  // Also check by path
  try {
    var file = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsILocalFile);
    file.persistentDescriptor = filedesc;
    for (var i = 0; i < recent.length; ++i) {
      try {
        var recentdesc = recent.get(i).QueryInterface(
          Components.interfaces.nsIRDFLiteral).Value;
        var recentfile = Components.classes["@mozilla.org/file/local;1"]
          .createInstance(Components.interfaces.nsILocalFile);
        recentfile.persistentDescriptor = recentdesc;
        if (file.equals(recentfile))
          recent.remove(i--);
      }
      catch (ex) {}
    }
  }
  catch (ex) {}
}


function rebuildRecentProjectsMenu () {
  var rdfsvc = getRDFService();
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var menusep = document.getElementById("recent-projects-menusep");
  var tbpopup = document.getElementById("recent-popup");

  // Check for the menu, but don't require the toolbar popup, since
  // hiddenWindow.xul has a menu but no toolbar.
  if (! menusep)
    return;

  while (menusep.nextSibling)
    menusep.parentNode.removeChild(menusep.nextSibling);
  if (tbpopup) {
    while (tbpopup.hasChildNodes())
      tbpopup.removeChild(tbpopup.lastChild);
  }

  var IRes = Components.interfaces.nsIRDFResource;
  var ILit = Components.interfaces.nsIRDFLiteral;

  try {
    gProjMgr.purgeMissingRecentProjects();
  }
  catch (ex) {
    dump("*** purgeMissingRecentProjects: " + ex + "\n");
  }

  var projects = gProjMgr.recentProjects.toArray();

  if (projects.length == 0)
    menusep.hidden = true;
  else
    menusep.hidden = false;

  for (var i = 0; i < projects.length; i++) {
    var filedesc = null;
    try {
      filedesc = projects[i].QueryInterface(ILit).Value;
      var file = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsILocalFile);
      file.persistentDescriptor = filedesc;

      var item = document.createElement("menuitem");
      item.setAttribute("label", file.leafName);
      item.setAttribute("value", filedesc);

      item.setAttribute("oncommand",
        "openRecentProject(this.getAttribute('value')); event.stopPropagation();");
      menusep.parentNode.appendChild(item);
      if (tbpopup)
        tbpopup.appendChild(item.cloneNode(true));
    }
    catch (ex) {
      // This shouldn't happen, since we purge missing projects first
      projects.splice(i--, 1);
    }
  }
}


function openRecentProject (filedesc) {
  if (! filedesc)
    throw "openRecentProject: File descriptor is undefined";

  // var file = fileURLToFile(fileuri);
  var file = Components.classes["@mozilla.org/file/local;1"]
    .createInstance(Components.interfaces.nsILocalFile);
  try {
    try {
      file.persistentDescriptor = filedesc;
    }
    catch (ex) {
      file = null;
      throw ex;
    }
    if (! file.exists())
      throw "File not found";
    var existingWindow = gApp.findProjectWindowByFile(file);
    if (existingWindow && ! existingWindow.closed) {
      existingWindow.focus();
      return;
    }
    var fileuri = fileToFileURL(file);
    window.openDialog(Cx.CONTENT_PATH, "_blank", Cx.NEW_WINDOW_FLAGS, fileuri);
  }
  catch (ex) {
    var title = gApp.getText("ProjectNotFoundTitle");
    var msg = gApp.getText("ProjectNotFoundMsg",
      [ file ? file.path : filedesc ]);
    getPromptService().alert(window, title, msg);
    removeFromRecentProjects(filedesc);
  }
}


function bootstrapProject (dir, title) {
  var projdir = dir.clone();
  projdir.append(sanitizeFilename(title));
  projdir.createUnique(1, 0700);
  var celtxfile = projdir.clone();
  celtxfile.append(projdir.leafName + ".celtx");
  celtxfile.create(0, 0600);
  return projdir;
}


function showSplashWindow () {
  var med = Components.classes["@mozilla.org/appshell/window-mediator;1"]
    .getService(Components.interfaces.nsIWindowMediator);
  var splashes = med.getEnumerator("celtx:splash");
  if (splashes.hasMoreElements())
    splashes.getNext().focus();
  else
    window.openDialog(Cx.CONTENT_PATH + "templates.xul", "_blank",
                      "chrome,centerscreen,titlebar=no,border=no");
}



// update menu items that rely on focus
function goUpdateGlobalEditMenuItems() {
  goUpdateCommand('cmd_undo');
  goUpdateCommand('cmd_redo');
  goUpdateCommand('cmd_cut');
  goUpdateCommand('cmd_copy');
  goUpdateCommand('cmd_paste');
  goUpdateCommand('cmd_selectAll');
  goUpdateCommand('cmd_delete');
}

// update menu items that rely on the current selection
function goUpdateSelectEditMenuItems() {
  goUpdateCommand('cmd_cut');
  goUpdateCommand('cmd_copy');
  goUpdateCommand('cmd_paste');
  goUpdateCommand('cmd_delete');
  goUpdateCommand('cmd_selectAll');
}

// update menu items that relate to undo/redo
function goUpdateUndoEditMenuItems() {
  goUpdateCommand('cmd_undo');
  goUpdateCommand('cmd_redo');
}

// update menu items that depend on clipboard contents
function goUpdatePasteMenuItems() {
  goUpdateCommand('cmd_paste');
}

function openPreferences (paneID) {
  window.openDialog(Cx.CONTENT_PATH + "prefs.xul", "Preferences",
    "chrome,titlebar,toolbar,centerscreen,modal", paneID);
}

function inspectDOMDocument() {
  window.openDialog("chrome://inspector/content/", "_blank", 
                    "chrome,all,dialog=no", document);
}

function openJavaScriptConsole () {
  window.openDialog("chrome://global/content/console.xul", "_blank",
    "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar");
}


function openJSDebugger () {
  window.open("chrome://venkman/content/", "_blank",
    "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar");
}
