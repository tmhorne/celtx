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
 * This file consolidates all the code related to saving a Celtx project.
 *
 * Part of the reason was that the save code was becoming complicated,
 * turning into a Gordian knot. In addition, the addition of Studio features
 * means that a lot of these calls are no longer guaranteed to be blocking,
 * which gave good reason to cut the knot by rewriting it from scratch.
 */


var gAllowLocalSaveCancel = false;


// Use this to 
var gSaveLogger = null;
function savelogmsg (aMsg, aFlush) {
  if (! gSaveLogger) {
    var logsvc = Components.classes["@celtx.com/log-service;1"]
      .getService(Components.interfaces.celtxILogService);
    gSaveLogger = logsvc.openNamedLog("save");
  }
  gSaveLogger.logMessage(aMsg);
  if (aFlush)
    gSaveLogger.flush();
}


/**
 * Note: Determining the Default Save Location.
 *
 * The default save location of a project is determined when it is opened,
 * and set as a property on the Project object. This property is transient;
 * it is not stored in the RDF. If the user saves the project to a different
 * location, the property is updated to reflect it.
 *
 * Project.saveLocation takes on one of the following values:
 *   null (no default save location)
 *   Project.SAVE_TO_DISK
 *   Project.SAVE_TO_SERVER
 *
 * The specific location is determined differently, according to whether it
 * is saved to disk or to the server. If it is saved to disk, the location
 * is determined by the getProjectFile function. If it is saved to the
 * server, it is determined by the wsref property.
 */


/*
 * Section 1: User Actions
 *
 * These handle user actions and provide them with feedback. They should
 * provide only the logic necessary to determine the user's intention and
 * advise them of success or failure. They should not return any value and
 * they must not take any parameters, except a strictly optional callback.
 *
 * A user action function should never be called except as the first call in
 * response to user input or as a delegate of another user action function.
 */


/**
 * Handler for the generic "Save Project" option. Saves the project back to
 * its original location if one exists, otherwise it prompts the user for
 * a location.
 */
function cmdSaveProject (callback) {
  savelogmsg("cmdSaveProject: " + gProject.title);
  if (isSavePending()) {
    savelogmsg("  Save already pending", true);
    if (callback) {
      try {
        // TODO: i18n
        callback.failed(new Error("Save already in progress"));
      } catch (ex) {
        dump("*** callback.failed: " + ex + "\n");
      }
    }
    return;
  }

  if (gProject.saveLocation == Project.SAVE_TO_DISK) {
    savelogmsg("  Save to disk");
    var file = getProjectFile();
    if (file) {
      doSaveProjectToFile(file, callback);
    }
    else {
      savelogmsg("  File missing, starting over with cmdSaveProjectAsFile");
      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFileNotFoundTitle"),
        gApp.getText("SaveFileNotFoundMsg"));
      cmdSaveProjectAsFile();
    }
  }
  else if (gProject.saveLocation == Project.SAVE_TO_SERVER) {
    savelogmsg("  Save to server");
    var cxsvc = getCeltxService();
    if (! cxsvc.loggedIn) {
      savelogmsg("  Not logged in, starting over if login succeeds", true);
      var observer = {
        onLogin: function (good) {
          if (good) cmdSaveProject(callback);
        }
      };
      cxsvc.login("", observer, false, window);
      return;
    }
    if (gProject.standalone)
      doSaveScriptToServer(callback);
    else if (gProject.wsref)
      doSaveProjectToServer(gProject.wsref, callback);
    else
      cmdSaveProjectToServer(callback);
  }
  else {
    // For now, we assume they want to save to disk.
    savelogmsg("  New project, starting over with cmdSaveProjectAsFile");
    cmdSaveProjectAsFile(callback);
  }
}


/**
 * Handler for the "Save Project as File" option.
 */
function cmdSaveProjectAsFile (callback) {
  savelogmsg("cmdSaveProjectAsFile");
  if (isSavePending()) {
    savelogmsg("  Save already pending", true);
    if (callback) {
      try {
        // TODO: i18n
        callback.failed(new Error("Save already in progress"));
      } catch (ex) {
        dump("*** callback.failed: " + ex + "\n");
      }
    }
    return;
  }

  var location = promptForFileSaveLocation(getCeltxProjectsDir(), false);
  if (location) {
    savelogmsg("  Received user location: " + location.path);
    setCeltxProjectsDir(location.parent);
    gProject.title = location.leafName.replace(/\.celtx$/, "");
    setWindowTitle(location.leafName);
    doSaveProjectToFile(location, callback);
  }
  else
    dump("  Save cancelled");
}


/**
 * Handler for the "Save Project to Studio" option.
 */
function cmdSaveProjectToServer (callback) {
  savelogmsg("cmdSaveProjectToServer");
  if (isSavePending()) {
    savelogmsg("  Save already pending", true);
    if (callback) {
      try {
        // TODO: i18n
        callback.failed(new Error("Save already in progress"));
      } catch (ex) {
        dump("*** callback.failed: " + ex + "\n");
      }
    }
    return;
  }

  var cxsvc = getCeltxService();
  if (! cxsvc.loggedIn) {
    savelogmsg("  Not logged in, starting over if login succeeds", true);
    var observer = {
      onLogin: function (good) {
        if (good) cmdSaveProjectToServer(callback);
      }
    };
    cxsvc.login("", observer, false, window);
    return;
  }

  var config = {
    accepted: false,
    wsref: gProject.wsref,
    title: gProject.title
  };

  savelogmsg("  Prompting for save message");
  openDialog(Cx.CONTENT_PATH + "savestudiodialog.xul", "",
    Cx.MODAL_DIALOG_FLAGS, config);

  if (config.accepted) {
    gProject.title = config.title;
    setWindowTitle(gProject.title);
    doSaveProjectToServer(config.wsref, callback);
  }
  else
    savelogmsg("  Save cancelled", true);
}


/**
 * Handler for the "Save Project as Template" option.
 */
function cmdSaveProjectAsTemplate (callback) {
  savelogmsg("cmdSaveProjectAsTemplate");
  if (isSavePending()) {
    savelogmsg("  Save already pending", true);
    if (callback) {
      try {
        // TODO: i18n
        callback.failed(new Error("Save already in progress"));
      } catch (ex) {
        dump("*** callback.failed: " + ex + "\n");
      }
    }
    return;
  }

  var location = promptForFileSaveLocation(null, true);
  if (location) {
    savelogmsg("  Received user location: " + location.path);
    doSaveProjectToTemplate(location, callback);
  }
  else
    savelogmsg("  Save cancelled", true);
}


/*
 * Section 2: User Action Utilities
 *
 * These group common behaviour for user actions. They are allowed to interact
 * with the user, so it should not be assumed that they will run silently.
 * This is also the place for actions that are not in response to user input,
 * but may nevertheless require user interaction, such as  an auto-save
 * feature that needs to alert the user if it fails.
 *
 * Ideally, these should focus on translating user choices into the right
 * function calls and handling errors when they are returned.
 */


/**
 * Prompts the user with a file save dialog.
 * @param dir{nsIFile}  a directory to start in
 * @param template{boolean}  prompt to save as a template file if true
 */
function promptForFileSaveLocation (dir, template) {
  var defaultext = template ? "tceltx" : "celtx";
  var typename = gApp.getText(template ? "CeltxTemplate" : "CeltxProject");

  var fp = getFilePicker();
  var IFilePicker = Components.interfaces.nsIFilePicker;
  fp.init(window, gApp.getText("SaveProject"), IFilePicker.modeSave);
  fp.appendFilter(typename, "*." + defaultext);
  fp.defaultExtension = defaultext;
  fp.defaultString = gProject.title + "." + defaultext;
  if (dir)
    fp.displayDirectory = dir;

  if (fp.show() == IFilePicker.returnCancel)
    return null;

  var extre = new RegExp("\." + defaultext + "$");
  if (! extre.test(fp.file.leafName))
    fp.file.leafName += "." + defaultext;

  return fp.file;
}


/**
 * Callback for auto-save.
 */
function autosave () {
  if (! isProjectModified())
    return;

  savelogmsg("autosave");

  if (isSavePending()) {
    savelogmsg("  Save already pending", true);
    return;
  }

  if (gProject.saveLocation == Project.SAVE_TO_DISK) {
    savelogmsg("  Attempting save to disk");
    var file = getProjectFile();
    if (! file) {
      savelogmsg("  No known save file, aborting", true);
      return;
    }

    if (isReadableFile(file) && file.isWritable()) {
      savelogmsg("  Auto-saving to " + file.path);
      doSaveProjectToFile(file);
    }
    else {
      savelogmsg("  Invalid auto-save file, aborting", true);
      var ps = getPromptService();
      ps.alert(window, gApp.getText("AutosaveFailedTitle"),
        gApp.getText("AutosaveFailedMsg"));
    }
  }
  else if (gProject.saveLocation == Project.SAVE_TO_SERVER) {
    savelogmsg("  Auto-saving to server");
    if (gProject.standalone)
      doSaveScriptToServer();
    else if (gProject.wsref)
      doSaveProjectToServer(gProject.wsref);
    else
      savelogmsg("  No wsref for project, aborting", true);
  }
}


/**
 * Pretty self-explanatory, don't you think?
 */
function doSaveProject (callback) {
  savelogmsg("doSaveProject");
  if (gProject.saveLocation == Project.SAVE_TO_DISK) {
    var file = getProjectFile();
    savelogmsg("  Saving to " + file.path);
    if (isReadableFile(file) && file.isWritable()) {
      doSaveProjectToFile(file, callback);
    }
    else if (isReadableFile(file)) {
      savelogmsg("  File not writable, requesting alternate location");
      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFileNotWritableTitle"),
        gApp.getText("SaveFileNotWritableMsg"));

      var location = promptForFileSaveLocation(getCeltxProjectsDir(), false);
      if (location) {
        savelogmsg("  Received user location: " + location.path);
        setCeltxProjectsDir(location.parent);
        doSaveProjectToFile(location, callback);
      }
      else
        savelogmsg("  Save cancelled", true);
    }
    else {
      savelogmsg("  File not found, requesting alternate location");
      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFileNotFoundTitle"),
        gApp.getText("SaveFileNotFoundMsg"));

      var location = promptForFileSaveLocation(getCeltxProjectsDir(), false);
      if (location) {
        savelogmsg("  Received user location: " + location.path);
        setCeltxProjectsDir(location.parent);
        doSaveProjectToFile(location, callback);
      }
      else
        savelogmsg("  Save cancelled", true);
    }
  }
  else if (gProject.saveLocation == Project.SAVE_TO_SERVER) {
    savelogmsg("  Saving to server");
    if (gProject.standalone)
      doSaveScriptToServer(callback);
    else
      doSaveProjectToServer(gProject.wsref, callback);
  }
  else {
    savelogmsg("  No default save location, prompting user");
    // For now, we assume they want to save to disk.
    var location = promptForFileSaveLocation(getCeltxProjectsDir(), false);
    if (location) {
      savelogmsg("  Received user location: " + location.path);
      setCeltxProjectsDir(location.parent);
      doSaveProjectToFile(location, callback);
    }
    else
      savelogmsg("  Save cancelled", true);
  }
}


/**
 * Saves the project to a file on disk. This handles any user interaction
 * or updating of the interface status.
 * @param file{nsIFile}  the destination for the project
 * @param callback  a callback for interested listeners (optional)
 */
function doSaveProjectToFile (file, callback) {
  savelogmsg("doSaveProjectToFile");
  var statusbox = document.getElementById("statusbox");
  var statusmsg = document.getElementById("statusmsg");
  var statusbar = document.getElementById("statusprogress");
  var cancelbtn = document.getElementById("statuscancelbutton");

  var innercb = {
    succeeded: function () {
      savelogmsg("  doSaveProjectToFile::succeeded (callback)", true);
      statusmsg.value = gApp.getText("Saved") + ".";
      statusbar.value = 100;
      cancelbtn.collapsed = true;

      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = gApp.getText("LastLocalSavePrompt") + " "
          + new Date();
      }, 1000);

      goUpdateCommand("cmd-reveal-project");

      if (callback)
        callback.succeeded();
    },
    cancelled: function () {
      savelogmsg("  doSaveProjectToFile::cancelled (callback)", true);
      statusmsg.value = gApp.getText("Cancelled") + ".";
      statusbar.mode = "determined";
      statusbar.value = 0;
      cancelbtn.collapsed = true;

      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = "";
      }, 1000);

      goUpdateCommand("cmd-reveal-project");

      if (callback)
        callback.cancelled();
    },
    failed: function (error) {
      savelogmsg("  doSaveProjectToFile::failed (callback): " + error, true);
      statusmsg.value = gApp.getText("SaveFailedTitle");
      statusbar.value = 0;
      cancelbtn.collapsed = true;
      statusbar.collapsed = true;

      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFailedTitle"),
        gApp.getText("SaveFailedPrompt") + " " + error.toString());

      goUpdateCommand("cmd-reveal-project");

      if (callback)
        callback.failed(error);
    },
    progress: function (current, total) {
      if (total == 0)
        statusbar.value = 100;
      else
        statusbar.value = Math.floor(100 * current / total);

      if (callback)
        callback.progress(current, total);
    }
  };

  statusmsg.value = gApp.getText("SavingProjectProgressMsg");
  statusbar.mode = "determined";
  statusbar.value = 0;
  statusbar.collapsed = false;
  cancelbtn.collapsed = ! gAllowLocalSaveCancel;
  statusbox.collapsed = false;

  saveProjectToFile(file, innercb);
}


/**
 * Saves the project to a template on disk. This handles any user interaction
 * or updating of the interface status.
 * @param file{nsIFile}  the destination for the project
 * @param callback  a callback for interested listeners (optional)
 */
function doSaveProjectToTemplate (file, callback) {
  savelogmsg("doSaveProjectToTemplate");
  var statusbox = document.getElementById("statusbox");
  var statusmsg = document.getElementById("statusmsg");
  var statusbar = document.getElementById("statusprogress");
  var cancelbtn = document.getElementById("statuscancelbutton");

  var wasmodified = isProjectModified();
  var oldtitle = gProject.title;

  gProject.isTemplate = true;

  var innercb = {
    succeeded: function () {
      savelogmsg("  doSaveProjectToTemplate::succeeded (callback)", true);
      gProject.isTemplate = false;
      gProject.title = oldtitle;
      gProject.isModified = wasmodified;

      statusmsg.value = gApp.getText("Saved") + ".";
      statusbar.value = 100;
      cancelbtn.collapsed = true;

      try {
        addToTemplates(file);
      }
      catch (ex) { dump("*** " + ex + "\n"); }

      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = "";
      }, 1000);

      if (callback)
        callback.succeeded();
    },
    cancelled: function () {
      savelogmsg("  doSaveProjectToTemplate::cancelled (callback)", true);
      gProject.isTemplate = false;
      gProject.title = oldtitle;
      gProject.isModified = wasmodified;

      statusmsg.value = gApp.getText("Cancelled") + ".";
      statusbar.mode = "determined";
      statusbar.value = 0;
      cancelbtn.collapsed = true;

      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = "";
      }, 1000);

      if (callback)
        callback.cancelled();
    },
    failed: function (error) {
      savelogmsg("  doSaveProjectToTemplate::failed (callback): " + error, true);
      gProject.isTemplate = false;
      gProject.title = oldtitle;
      gProject.isModified = wasmodified;

      statusmsg.value = "";
      statusbar.value = 0;
      cancelbtn.collapsed = true;
      statusbar.collapsed = true;

      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFailedTitle"),
        gApp.getText("SaveTemplateFailedPrompt") + " " + error.toString());

      if (callback)
        callback.failed(error);

    },
    progress: function (current, total) {
      if (total == 0)
        statusbar.value = 100;
      else
        statusbar.value = Math.floor(100 * current / total);

      if (callback)
        callback.progress(current, total);
    }
  };

  statusbar.mode = "determined";
  statusbar.value = 0;
  statusbar.collapsed = false;
  statusmsg.value = gApp.getText("SavingTemplateProgressMsg");
  cancelbtn.collapsed = ! gAllowLocalSaveCancel;
  statusbox.collapsed = false;

  gProject.title = file.leafName.replace(/\.t?celtx$/, "");
  saveProjectToFile(file, innercb);
}


function doSaveScriptToServer (callback) {
  savelogmsg("doSaveScriptToServer, url = " + gProject.remoteURL);
  var statusbox = document.getElementById("statusbox");
  var statusmsg = document.getElementById("statusmsg");
  var statusbar = document.getElementById("statusprogress");
  var cancelbtn = document.getElementById("statuscancelbutton");

  var innercb = {
    succeeded: function () {
      savelogmsg("  doSaveScriptToServer::succeeded (callback)", true);
      statusmsg.value = gApp.getText("Saved") + ".";
      statusbar.value = 100;
      cancelbtn.collapsed = true;

      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = gApp.getText("LastStudioSavePrompt") + " "
          + new Date();
      }, 1000);

      if (callback)
        callback.succeeded();
    },
    cancelled: function () {
      savelogmsg("  doSaveScriptToServer::cancelled (callback)", true);
      statusmsg.value = gApp.getText("Cancelled") + ".";
      statusbar.mode = "determined";
      statusbar.value = 0;
      cancelbtn.collapsed = true;

      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = "";
      }, 1000);

      if (callback)
        callback.cancelled();
    },
    failed: function (error) {
      savelogmsg("  doSaveScriptToServer::failed (callback): " + error, true);
      statusmsg.value = "";
      statusbar.value = 0;
      cancelbtn.collapsed = true;
      statusbar.collapsed = true;

      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFailedTitle"),
        gApp.getText("SaveStudioFailedPrompt") + " " + error.toString());

      if (callback)
        callback.failed(error);
    },
    progress: function (current, total) {
      if (statusbar.mode != "determined")
        statusbar.mode = "determined";

      if (total == 0)
        statusbar.value = 100;
      else
        statusbar.value = Math.floor(100 * current / total);

      if (callback)
        callback.progress(current, total);
    }
  };

  statusmsg.value = gApp.getText("SavingProjectProgressMsg");
  statusbar.mode = "determined";
  statusbar.value = 0;
  statusbar.collapsed = false;
  cancelbtn.collapsed = ! gAllowLocalSaveCancel;
  statusbox.collapsed = false;

  saveScriptToServer(innercb);
}


function doSaveProjectToServer (wsref, callback) {
  savelogmsg("doSaveProjectToServer, wsref = " + wsref);
  var statusbox = document.getElementById("statusbox");
  var statusmsg = document.getElementById("statusmsg");
  var statusbar = document.getElementById("statusprogress");
  var cancelbtn = document.getElementById("statuscancelbutton");

  var innercb = {
    succeeded: function () {
      savelogmsg("  doSaveProjectToServer::succeeded (callback)", true);
      statusmsg.value = gApp.getText("Saved") + ".";
      statusbar.value = 100;
      cancelbtn.collapsed = true;


      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = gApp.getText("LastStudioSavePrompt") + " "
          + new Date();
      }, 1000);

      goUpdateCommand("cmd-reveal-project");

      if (callback)
        callback.succeeded();
    },
    cancelled: function () {
      savelogmsg("  doSaveProjectToServer::cancelled (callback)", true);
      statusmsg.value = gApp.getText("Cancelled") + ".";
      statusbar.mode = "determined";
      statusbar.value = 0;
      cancelbtn.collapsed = true;

      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = "";
      }, 1000);

      goUpdateCommand("cmd-reveal-project");

      if (callback)
        callback.cancelled();
    },
    failed: function (error) {
      savelogmsg("  doSaveProjectToServer::failed (callback): " + error, true);
      statusmsg.value = "";
      statusbar.value = 0;
      cancelbtn.collapsed = true;
      statusbar.collapsed = true;

      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFailedTitle"),
        gApp.getText("SaveStudioFailedPrompt") + " " + error.toString());

      goUpdateCommand("cmd-reveal-project");

      if (callback)
        callback.failed(error);
    },
    progress: function (current, total) {
      if (statusbar.mode != "determined")
        statusbar.mode = "determined";

      if (total == 0)
        statusbar.value = 100;
      else
        statusbar.value = Math.floor(100 * current / total);

      if (callback)
        callback.progress(current, total);
    }
  };


  // This captures the sequence of steps, even though they are each
  // triggered as a callback.
  function doSaveProjectToServer_step (step) {
    savelogmsg("    doSaveProjectToServer_step: " + step);
    if (step == "start") {
      statusbar.value = 0;
      statusbar.mode = "undetermined";
      statusbar.collapsed = false;
      statusmsg.value = gApp.getText("SavingStudioProgressMsg");
      cancelbtn.collapsed = false;
      statusbox.collapsed = false;

      setTimeout(doSaveProjectToServer_step, 0, "checkVersion");
    }
    else if (step == "checkVersion") {
      if (! wsref) {
        setTimeout(doSaveProjectToServer_step, 0, "getCommitMessage");
        return;
      }

      var xhr = new XMLHttpRequest();
      var projuri = getCeltxService().workspaceURI + "/project/" + wsref;
      xhr.open("GET", projuri, true);
      xhr.onerror = function () {
        gPendingSaveRequest = null;
        innercb.failed(xhr.status + " " + xhr.statusText);
      };
      xhr.onreadystatechange = function () {
        // There is no "aborted" signal for XMLHttpRequest, but you can tell
        // if it was cancelled because it transitions to readyState=4, then
        // silently transitions to readyState=0.
        if (xhr.readyState == 1) {
          gPendingSaveRequest = xhr;
        }
        else if (xhr.readyState == 4) {
          gPendingSaveRequest = null;
          setTimeout(function () {
            if (xhr.readyState == 0) innercb.cancelled();
          }, 0);
        }
      };
      xhr.onload = function () {
        if (xhr.status < 200 || xhr.status >= 300) {
          innercb.failed(xhr.statusText);
          return;
        }

        try {
          var projdata = JSON.parse(xhr.responseText);
          if (projdata.latest && wsref != projdata.latest) {
            // Disabled for 1.1 release
            /*
            var ps = getPromptService();
            var confirmed = ps.confirm(window,
              gApp.getText("OverwriteWithOlderTitle"),
              gApp.getText("OverwriteWithOlderMsg"));
            if (! confirmed) {
              innercb.cancelled();
              return;
            }
             */
            wsref = projdata.latest;
          }
          doSaveProjectToServer_step("getCommitMessage");
        }
        catch (ex) {
          innercb.failed(ex);
        }
      };
      xhr.setRequestHeader("Accept", "application/json");
      xhr.send(null);
    }
    else if (step == "getCommitMessage") {
      var rdfsvc = getRDFService();
      var msgarc = rdfsvc.GetResource(Cx.NS_CX + "commitMessage");

      var pref = getPrefService().getBranch("celtx.server.");
      if (! pref.getBoolPref("promptForCommitMessage")) {
        setTimeout(doSaveProjectToServer_step, 0, "sendModel", "");
        return;
      }

      var msg = { value: "" };
      var shouldprompt = { value: true };
      var ps = getPromptService();

      var confirmed = ps.prompt(window, gApp.getText("SaveCommentTitle"),
        gApp.getText("SaveCommentPrompt"), msg,
        gApp.getText("SaveCommentCheckbox"), shouldprompt);
      if (! confirmed) {
        innercb.cancelled();
        return;
      }

      if (! shouldprompt.value)
        pref.setBoolPref("promptForCommitMessage", false);

      setTimeout(doSaveProjectToServer_step, 0, "sendModel", msg.value);
    }
    else if (step == "sendModel") {
      var commitmsg = arguments.length > 1 ? arguments[1] : "";
      saveProjectToServer(wsref, commitmsg, innercb);
    }
  }

  savelogmsg("  Beginning save to server");
  doSaveProjectToServer_step("start");
}


/**
 * Section 3: Non-User Utilties
 *
 * These functions never interact with the user.
 */


/**
 * Stores the currently pending request, so that it can be cancelled.
 * @private
 */
var gPendingSaveRequest = null;


/**
 * Returns true if there is an active save request.
 */
function isSavePending () {
  return gPendingSaveRequest != null;
}


/**
 * Cancels any pending save request.
 */
function cancelPendingSaveRequest () {
  savelogmsg("cancelPendingSaveRequest");
  if (! gPendingSaveRequest) {
    savelogmsg("  No save pending", true);
    return;
  }
  try {
    savelogmsg("  Attempting to abort current save");
    var IPersist = Components.interfaces.nsIWebBrowserPersist;
    if (gPendingSaveRequest instanceof IPersist) {
      savelogmsg("  Aborting with gPendingSaveRequest.cancelSave()");
      gPendingSaveRequest.cancelSave();
    }
    else {
      savelogmsg("  Aborting with gPendingSaveRequest.abort()");
      gPendingSaveRequest.abort();
    }
  }
  catch (ex) {
    dump("*** cancelPendingSaveRequest: " + ex + "\n");
    savelogmsg("  Error while cancelling save: " + ex, true);
  }
  finally {
    gPendingSaveRequest = null;
  }
}


/**
 * Saves the project to a file on disk. This handles housekeeping around
 * the save process, such as clearing modified flags and recording the
 * new save location.
 */
function saveProjectToFile (file, callback) {
  savelogmsg("saveProjectToFile");
  try {
    savelogmsg("  Saving open tabs");
    saveOpenTabs(Project.SAVE_TO_DISK);
  }
  catch (ex) {
    // The open tab list is hardly a critical issue. Ignore any errors.
    dump("*** saveOpenTabs: " + ex + "\n");
  }

  try {
    var innercb = {
      succeeded: function () {
        savelogmsg("  saveProjectToFile::succeeded (callback)");
        if (! gProject.isTemplate) {
          gProject.isModified = false;
          gProject.saveLocation = Project.SAVE_TO_DISK;
          window.setProjectFile(file);
          addToRecentProjects(file.persistentDescriptor);
          cacheExternalFileModificationTimes();
        }

        if (callback)
          callback.succeeded();

        var obsvc = getObserverService();
        obsvc.notifyObservers(gProject, "celtx:project-saved", null);
      },
      cancelled: function () {
        savelogmsg("  saveProjectToFile::cancelled (callback)");
        gProject.isModified = true;

        if (callback)
          callback.cancelled();
      },
      failed: function (error) {
        savelogmsg("  saveProjectToFile::failed (callback): " + error, true);
        gProject.isModified = true;
        // Should we really reset the save location? It will force a
        // Save As dialog, which is probably what we want.
        gProject.saveLocation = null;

        if (callback)
          callback.failed(error);
      },
      progress: function (current, total) {
        if (callback)
          callback.progress(current, total);
      }
    };
    savelogmsg("  Writing out project files to temporary storage");
    writeProjectFiles();
    savelogmsg("  Creating an archive to " + file.path);
    archiveCeltxProject(file, innercb);
  }
  catch (ex) {
    savelogmsg("  Exception during save: " + ex, true);
    if (callback)
      callback.failed(ex);
  }
}


/**
 * Saves a standalone script to the server.
 */
function saveScriptToServer (callback) {
  try {
    // Flush the project files
    savelogmsg("  Writing out project files to temporary storage");
    writeProjectFiles();

    var rdfsvc = getRDFService();
    var localURI = rdfsvc.GetResource(gProject.scriptURI);
    var file = gProject.localFileFor(localURI);

    var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
    var doctype = gProject.ds.GetTarget(localURI, doctypearc, true)
      .QueryInterface(Components.interfaces.nsIRDFResource);
    var typeMap = new Object();
    typeMap[Cx.NS_CX + "ScriptDocument"] = "screenplay";
    typeMap[Cx.NS_CX + "TheatreDocument"] = "theatre";
    typeMap[Cx.NS_CX + "AVDocument"] = "audiovisual";
    typeMap[Cx.NS_CX + "RadioDocument"] = "radio";
    typeMap[Cx.NS_CX + "ComicDocument"] = "comic";
    typeMap[Cx.NS_CX + "TextDocument"] = "novel";
    if (! (doctype.Value in typeMap)) {
      savelogmsg("  Unsupported script type: " + doctype.Value);
      callback.failed("Unsupported script type");
      return;
    }
    var scriptType = typeMap[doctype.Value];
    var contentType = "application/x-celtx-script+xml; "
      + "celtxType=" + scriptType;

    if (! isReadableFile(file)) {
      if (file)
        savelogmsg("  Script file is missing: " + file.path);
      else
        savelogmsg("  No script file associated with script");
      if (callback)
        callback.failed("Unable to read script");
      return;
    }

    savelogmsg("  Uploading " + file.leafName);

    var xhr = new XMLHttpRequest();
    xhr.open("PUT", gProject.remoteURL, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.onerror = function () {
      gPendingSaveRequest = null;
      if (callback)
        callback.failed(xhr.statusText);
    };
    xhr.onreadystatechange = function () {
      // There is no "aborted" signal for XMLHttpRequest, but you can tell
      // if it was cancelled because it transitions to readyState=4, then
      // silently transitions to readyState=0.
      if (xhr.readyState == 1) {
        gPendingSaveRequest = xhr;
      }
      else if (xhr.readyState == 4) {
        gPendingSaveRequest = null;
        savelogmsg("  Script upload finished, pending save nulled, "
          + "checking for cancellation");
        setTimeout(function () {
          if (xhr.readyState == 0 && callback) {
            savelogmsg("  Script upload cancelled", true);
            callback.cancelled();
          }
        }, 0);
      }
    };
    xhr.onload = function () {
      savelogmsg("  Script upload finished, pending save nulled");
      gPendingSaveRequest = null;

      if (xhr.status < 200 || xhr.status >= 300) {
        savelogmsg("  Script upload was a failure (" + xhr.status + " "
          + xhr.statusText + ")", true);
        if (callback)
          callback.failed(xhr.statusText);
      }
      else {
        savelogmsg("  Script upload was successful", true);
        gProject.isModified = false;
        if (callback)
          callback.succeeded();

        var obsvc = getObserverService();
        obsvc.notifyObservers(gProject, "celtx:project-saved", null);
      }
    };
    xhr.send(readFile(file.path));
  }
  catch (ex) {
    savelogmsg("  Exception during saveScriptToServer: " + ex);
    if (callback)
      callback.failed(ex);
  }
}


/**
 * Saves the project to the server. Similar to saveProjectToFile, but with
 * more complexity and even more modes of failure.
 * @param wsref{string}  the uri to save the project to, or null to create
 *                       a new one (optional)
 * @param callback  a callback for interested listeners (optional)
 */
function saveProjectToServer (wsref, commitmsg, callback) {
  savelogmsg("saveProjectToServer");
  try {
    savelogmsg("  Saving open tabs");
    saveOpenTabs(Project.SAVE_TO_SERVER);
  }
  catch (ex) {
    // The open tab list is hardly a critical issue. Ignore any errors.
    dump("*** saveOpenTabs: " + ex + "\n");
  }

  var cxsvc = getCeltxService();
  var method = wsref ? "PUT" : "POST";
  var uploaduri = cxsvc.workspaceURI;
  if (wsref)
    uploaduri += "/project/" + wsref;
  else
    uploaduri += "/projects";

  var innercb = {
    succeeded: function () {
      savelogmsg("  saveProjectToServer::succeeded (callback)");
      gProject.isModified = false;
      gProject.saveLocation = Project.SAVE_TO_SERVER;
      gProject.standalone = false;
      cacheExternalFileModificationTimes();

      if (callback)
        callback.succeeded();

      var obsvc = getObserverService();
      obsvc.notifyObservers(gProject, "celtx:project-saved", null);
    },
    cancelled: function () {
      savelogmsg("  saveProjectToServer::cancelled (callback)");
      gProject.isModified = true;

      if (callback)
        callback.cancelled();
    },
    failed: function (error) {
      savelogmsg("  saveProjectToServer::failed (callback)", true);
      gProject.isModified = true;

      if (callback)
        callback.failed(error);
    },
    progress: function (current, total) {
      if (callback)
        callback.progress(current, total);
    }
  };

  var tmpds = null;
  var uploads = [];
  var uploadindex = 0;

  // These are misnomers: They measure in bytes, not Kb or KB
  var totalKb = 0;
  var completedKb = 0;
  var pendingKb = 0; // "Size of file being uploaded", essentially

  var transRes = null;
  var finishURL = null;
  var new_wsref = null;

  function saveProjectToServer_step (step) {
    savelogmsg("    saveProjectToServer_step: " + step);
    if (step == "start") {
      // Flush the project files
      try {
        savelogmsg("      Writing out project files to temporary storage");
        writeProjectFiles();

        var rdfsvc = getRDFService();
        var commitarc = rdfsvc.GetResource(Cx.NS_CX + "commitMessage");
        savelogmsg("      Preparing upload RDF model");
        tmpds = prepareUploadModel();
        setRDFString(tmpds, gProject.res, commitarc, commitmsg);

        setTimeout(saveProjectToServer_step, 0, "sendModel");
      }
      catch (ex) {
        innercb.failed(ex);
        return;
      }
    }
    else if (step == "sendModel") {
      try {
        // Flush the temporary sync DS
        var remotetmpds = tmpds.QueryInterface(
          Components.interfaces.nsIRDFRemoteDataSource);
        remotetmpds.Flush();

        // We can't use nsIDOMDocument.load here because it throws a security
        // exception trying to parse a file:// URL as of Firefox 3.
        savelogmsg("      Converting upload RDF model to DOM document");
        var dsFile = fileURLToFile(tmpds.URI);
        var parser = new DOMParser();
        var bis = getBufferedFileInputStream(dsFile);
        var dom = parser.parseFromStream(bis, "UTF-8", dsFile.fileSize,
          "application/xml");
        bis.close();

        savelogmsg("      Sending " + method + " to " + uploaduri);
        // The XMLHttpRequest isn't assigned to gPendingSaveRequest until
        // after it has been started (see the onreadystatechange handler)
        var xhr = new XMLHttpRequest();
        xhr.open(method, uploaduri, true);
        xhr.onerror = function () {
          savelogmsg("      RDF upload failed, pending save nulled", true);
          gPendingSaveRequest = null;

          innercb.failed(xhr.statusText);
        };
        xhr.onreadystatechange = function () {
          // There is no "aborted" signal for XMLHttpRequest, but you can tell
          // if it was cancelled because it transitions to readyState=4, then
          // silently transitions to readyState=0.
          if (xhr.readyState == 1) {
            gPendingSaveRequest = xhr;
          }
          else if (xhr.readyState == 4) {
            savelogmsg("      RDF upload cancelled, pending save nulled", true);
            gPendingSaveRequest = null;
            setTimeout(function () {
              if (xhr.readyState == 0) innercb.cancelled();
            }, 0);
          }
        };
        xhr.onload = function () {
          savelogmsg("      RDF upload finished, pending save nulled "
            + "(to be continued)");
          gPendingSaveRequest = null;

          if (xhr.status != 200) {
            savelogmsg("      RDF upload was a failure (" + xhr.status + " "
              + xhr.statusText + ")");
            innercb.failed(xhr.statusText);
            return;
          }
          savelogmsg("      RDF upload was successful, continuing");
          setTimeout(saveProjectToServer_step, 0, "prepareUploads",
            xhr.responseText);
        };
        xhr.setRequestHeader("Content-Type", "application/rdf+xml");
        xhr.setRequestHeader("Accept", "application/rdf+xml");
        xhr.send(dom);
      }
      catch (ex) {
        savelogmsg("      Exception during sendModel: " + ex);
        innercb.failed(ex);
      }
    }
    else if (step == "prepareUploads") {
      if (arguments.length < 2) {
        savelogmsg("      Did not receive a response model");
        innercb.failed(new Error("Did not receive a response model"));
        return;
      }
      try {
        savelogmsg("      Parsing RDF/XML response");
        var m = stringToModel(arguments[1]);
        var projres = RES(gProject.res.Value);

        transRes = m.source(PROP('cx:project'), projres);
        if (! transRes)
          throw new Error("Missing transaction URI");

        var finishRes = m.target(transRes, PROP('cx:finish'));
        if (! finishRes)
          throw new Error("Missing transaction finish URI");
        finishURL = finishRes.value;

        // Find all our uploads
        var uploadList = m.targets(transRes, PROP('cx:action'));

        var leaf, dest, rec;
        for (var i = 0; i < uploadList.length; i++) {
          leaf = m.target(uploadList[i], PROP('cx:localFile'));
          dest = m.target(uploadList[i], PROP('cx:destination'));
          rec = { leaf: leaf.value, dest: dest.value };
          uploads.push(rec);
          var file = gProject.projectFolder;
          file.append(rec.leaf);
          if (isReadableFile(file))
            totalKb += file.fileSize;
        }

        innercb.progress(0, totalKb);

        var filesToUpload = new Array();
        for (var i = 0; i < uploads.length; ++i)
          filesToUpload.push(rec.leaf);
        savelogmsg("      Prepared uploads: " + filesToUpload.join(", ")
          + " -- total size " + totalKb + " bytes");
        setTimeout(saveProjectToServer_step, 0, "uploadNextFile");
      }
      catch (ex) {
        savelogmsg("      Exception during prepareUploads: " + ex);
        innercb.failed(ex);
      }
    }
    else if (step == "uploadNextFile") {
      try {
        completedKb += pendingKb;
        innercb.progress(completedKb, totalKb);

        if (uploadindex == uploads.length) {
          savelogmsg("      Finished uploading files");
          setTimeout(saveProjectToServer_step, 0, "finishUploads");
          return;
        }

        var rec = uploads[uploadindex++];
        var file = gProject.projectFolder;
        file.append(rec.leaf);
        if (! isReadableFile(file)) {
          savelogmsg("      Skipping missing file: " + file.leafName);
          dump("*** Missing file: " + rec.leaf);
          setTimeout(saveProjectToServer_step, 0, "uploadNextFile");
          return;
        }

        savelogmsg("      Uploading " + file.leafName);
        var ios  = getIOService();
        var uri  = ios.newURI(rec.dest, null, null);
        pendingKb += file.fileSize;

        // XXX really necessary?
        uri = uri.QueryInterface(Components.interfaces.nsIURL);

        var src  = ios.newFileURI(file);
        src = src.QueryInterface(Components.interfaces.nsIURL);    

        var IWebProgress = Components.interfaces.nsIWebProgressListener;
        var uploadListener = {
          QueryInterface: function (iid) {
            if (iid.equals(IWebProgress) ||
                iid.equals(Components.interfaces.nsISupportsWeakReference))
              return this;
            throw Components.results.NS_ERROR_NO_INTERFACE;
          },
          onStateChange: function (prog, req, flags, status) {
            var stopmask = IWebProgress.STATE_STOP |
                           IWebProgress.STATE_IS_NETWORK;
            if (status & 0x80000000) {
              gPendingSaveRequest = null;
              var NS_BINDING_ABORTED = 0x804B0002;
              if (status == NS_BINDING_ABORTED) {
                savelogmsg("      File upload cancel signalled");
                innercb.cancelled();
              }
              else {
                savelogmsg("      File upload error (" + status + ")");
                innercb.failed(status);
              }
            }
            else if ((flags & stopmask) == stopmask) {
              savelogmsg("      Upload completed, starting next");
              gPendingSaveRequest = null;
              setTimeout(saveProjectToServer_step, 0, "uploadNextFile");
            }
          },
          onProgressChange: function (prog, req, curself, maxself, curtotal,
                                      maxtotal) {
            innercb.progress(completedKb + curself, totalKb);
          },
          onLocationChange: function (prog, req, loc) {},
          onStatusChange: function (prog, req, status, msg) {},
          onSecurityChange: function (prog, req, status) {}
        };

        var persist = getWebBrowserPersist();
        persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;
        persist.progressListener = uploadListener;
        gPendingSaveRequest = persist;
        persist.saveURI(src, null, null, null, null, uri);
      }
      catch (ex) {
        savelogmsg("      Exception during uploadNextFile: " + ex);
        innercb.failed(ex);
      }
    }
    else if (step == "finishUploads") {
      try {
        savelogmsg("      Uploads finished, sending OK");
        var xhr = new XMLHttpRequest();
        xhr.open("POST", finishURL, true);
        xhr.onerror = function () {
          savelogmsg
          gPendingSaveRequest = null;

          innercb.failed(xhr.statusText);
        };
        xhr.onreadystatechange = function () {
          // There is no "aborted" signal for XMLHttpRequest, but you can tell
          // if it was cancelled because it transitions to readyState=4, then
          // silently transitions to readyState=0.
          if (xhr.readyState == 1) {
            gPendingSaveRequest = xhr;
          }
          else if (xhr.readyState == 4) {
            gPendingSaveRequest = null;
            setTimeout(function () {
              if (xhr.readyState == 0) innercb.cancelled();
            }, 0);
          }
        };
        xhr.onload = function () {
          gPendingSaveRequest = null;

          if (xhr.status != 200) {
            innercb.failed(xhr.statusText);
            return;
          }

          var m = stringToModel(xhr.responseText);
          var projres = RES(gProject.res.Value);
          if (! transRes)
            transRes = m.source(PROP('cx:project'), projres);

          var revision = m.target(transRes, PROP('cx:revision'));
          gProject.revision = revision ? revision.value : "0";

          var wsref = m.target(transRes, PROP('cx:wsref'));
          if (wsref)
            new_wsref = wsref.value;

          setTimeout(saveProjectToServer_step, 0, "downloadNextFile");
        };

        var xmlok = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\n<ok/>\n";
        xhr.send(xmlok);
      }
      catch (ex) {
        innercb.failed(ex);
      }
    }
    else if (step == "downloadNextFile") {
      setTimeout(saveProjectToServer_step, 0, "finishDownloads");
    }
    else if (step == "finishDownloads") {
      setTimeout(saveProjectToServer_step, 0, "finished");
    }
    else if (step == "finished") {
      if (new_wsref)
        gProject.wsref = new_wsref;
      innercb.succeeded();
    }
  }

  saveProjectToServer_step("start");
}


/**
 * Saves the list of tabs currently open. See restoreOpenTabs for an
 * explanation on the divergence of save location for open tabs.
 */
function saveOpenTabs (aSaveLocation) {
  savelogmsg("saveOpenTabs");
  var rdfsvc = getRDFService();
  var IRes = Components.interfaces.nsIRDFResource;
  var opentabsarc = rdfsvc.GetResource(Cx.NS_CX + "opentabs");
  var ds = gProject.localDS;
  var res = gProject.res;
  var cxsvc = getCeltxService();
  if (aSaveLocation == Project.SAVE_TO_SERVER && cxsvc.loggedIn) {
    ds = gProject.ds;
    var userdataarc = rdfsvc.GetResource(Cx.NS_CX + "userdata");
    var userdata = ds.GetTarget(res, userdataarc, true);
    if (userdata) {
      userdata = userdata.QueryInterface(IRes);
    }
    else {
      userdata = rdfsvc.GetAnonymousResource();
      ds.Assert(res, userdataarc, userdata, true);
    }
    var datalist = new RDFSeq(ds, userdata);
    res = rdfsvc.GetResource(res.Value + "/userdata/" + cxsvc.username);
    if (datalist.indexOf(res) < 0)
      datalist.push(res);
  }
  var opentabs = ds.GetTarget(res, opentabsarc, true);
  if (! opentabs) {
    opentabs = rdfsvc.GetAnonymousResource();
    ds.Assert(res, opentabsarc, opentabs, true);
  }
  opentabs = new RDFSeq(ds, opentabs);

  // Clear the old list of open tabs
  opentabs.clear();

  for (var i = 0; i < gFrameLoader.frames.length; i++) {
    var frame = gFrameLoader.frames[i];
    if (frame.temporary) continue;
    if (frame != gFrameLoader.currentFrame)
      opentabs.push(frame.docres);
  }
  if (gFrameLoader.currentFrame && ! gFrameLoader.currentFrame.temporary)
    opentabs.push(gFrameLoader.currentFrame.docres);
}


/**
 * Writes out all open documents.
 */
function writeProjectFiles () {
  savelogmsg("writeProjectFiles");
  var ds = gProject.ds;
  ds.beginUpdateBatch();

  try {
    // Save all open frames
    gFrameLoader.saveAllFrames();

    // Purge unreachable statements once, prior to media clean-up...
    gProject.purgeUnreachableStatements();

    // Remove broken media resources
    var medialist = getBrokenMediaResources();
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    for (var i = 0; i < medialist.length; ++i) {
      var mediares = medialist[i];
      try {
        deleteAllRDFArcsIn(ds, mediares);
        var typeres = ds.GetTarget(mediares, typearc, true);
        if (typeres)
          ds.Unassert(mediares, typearc, typeres);
      }
      catch (ex) {
        dump("*** writeProjectFiles: " + ex + "\n");
      }
    }

    // Remove unassociated media files
    var filelist = getUnassociatedMediaFiles();
    for (var i = 0; i < filelist.length; ++i) {
      try {
        savelogmsg("  Removing unassociated media file: "
          + filelist[i].leafName);
        filelist[i].remove(false);
      }
      catch (ex) {
        dump("*** writeProjectFiles: " + ex + "\n");
      }
    }

    // ... purge again now that media clean-up has been done.
    gProject.purgeUnreachableStatements();

  // Mark a new modification date on the project
  gProject.modified = new Date();
  }
  catch (ex) {
    throw ex;
  }
  finally {
    ds.endUpdateBatch();
  }

  // Write RDF to disk
  gProject.flush();
}


/**
 * Writes the Celtx project to a zip file.
 */
function archiveCeltxProject (file, callback) {
  savelogmsg("archiveCeltxProject");
  var IFile = Components.interfaces.nsIFile;

  savelogmsg("  Opening zipwriter for " + file.path);
  var safezipwriter = getSafeZipWriter();
  var zipwriter = safezipwriter.QueryInterface(
    Components.interfaces.nsIZipWriter);
  // PR_WRONLY | PR_CREATE_FILE | PR_TRUNCATE
  zipwriter.open(file, 0x02 | 0x08 | 0x20);
  var entries = gProject.projectFolder.directoryEntries;
  var queue = [];
  while (entries.hasMoreElements()) {
    var entry = entries.getNext().QueryInterface(IFile);
    if (! entry.isFile() || entry.leafName.match(/\.t?celtx$/)) {
      savelogmsg("  Skipping " + entry.leafName + " because it is not a file "
        + "or it ends in .celtx");
      continue;
    }
    savelogmsg("  Enqueuing " + entry.leafName + " ("
      + entry.fileSize + " bytes)");
    queue.push(entry);
  }

  var current = 0;
  var innercb = {
    aborted: false,


    succeeded: function () {
      if (this.aborted) return;

      gPendingSaveRequest = null;

      if (callback)
        callback.succeeded();
    },
    cancelled: function () {
      gPendingSaveRequest = null;

      if (callback)
        callback.cancelled();
    },
    failed: function (error) {
      if (this.aborted) return;

      gPendingSaveRequest = null;

      if (callback)
        callback.failed(error);
    },
    progress: function (current, total) {
      if (this.aborted) return;

      if (callback)
        callback.progress(current, total);
    },
    abort: function () {
      this.aborted = true;
      this.cancelled();
    }
  };
  gPendingSaveRequest = innercb;

  var mimesvc = getMIMEService();

  function archiveNextEntry () {
    savelogmsg("    archiveNextEntry");
    try {
      if (innercb.aborted) {
        savelogmsg("      Save was aborted, returning early");
        return;
      }

      if (current < queue.length) {
        innercb.progress(current, queue.length);
        var entry = queue[current++];
        // Compression doesn't give us any benefit and it makes it harder
        // to recover corrupted projects
        var compLevel = zipwriter.COMPRESSION_NONE;
        try {
          savelogmsg("      Adding " + entry.leafName + " to zip file");
          zipwriter.addEntryFile(entry.leafName, compLevel, entry, false);
          setTimeout(archiveNextEntry, 0);
        }
        catch (ex) {
          try {
            savelogmsg("      Exception during save, aborting zip file: "
              + ex);
            zipwriter.close();
          }
          catch (ex2) {
            savelogmsg("      Another exception while aborting: " + ex2);
          }
          innercb.failed(ex);
        }
      }
      else {
        try {
          innercb.progress(queue.length, queue.length);
        }
        catch (ex) {}

        try {
          savelogmsg("      Finished writing all files, closing archive");
          safezipwriter.finish();
          zipwriter.close();

          savelogmsg("      Performing integrity check on entire archive");
          var zipreader = getZipReader();
          zipreader.open(file);
          zipreader.test(null);
          savelogmsg("      Integrity check passed, files are:");
          var entryarray = new Array();
          try {
            var entries = zipreader.findEntries("*");
            while (entries.hasMore()) {
              var entryname = entries.getNext();
              var entry = zipreader.getEntry(entryname);
              savelogmsg("        " + entryname + " (size: " + entry.size
                + " / " + entry.realSize + " ; compressed / normal)");
            }
          }
          catch (ex) {
          }
          zipreader.close();

          innercb.succeeded();
        }
        catch (ex) {
          innercb.failed(ex);
        }
      }
    }
    catch (ex) {
      innercb.failed(ex);
    }
  }

  savelogmsg("  Processing queue");
  setTimeout(archiveNextEntry, 0);
}


// Server synchronization support

function prepareUploadModel () {
  // Create the sync directory and temporary RDF model
  var syncdir = getTempDir();
  syncdir.append("sync");
  syncdir.createUnique(1, 0700);

  var srcrdffile = gProject.projectFolder;
  srcrdffile.append(Cx.PROJECT_FILE);
  srcrdffile.copyTo(syncdir, Cx.PROJECT_FILE);
  var dstrdffile = syncdir.clone();
  dstrdffile.append(Cx.PROJECT_FILE);

  var rdfsvc = getRDFService();
  var ds = rdfsvc.GetDataSourceBlocking(fileToFileURL(dstrdffile));

  var model = new RDFModel(ds);
  updateFileMetaData(model, PROP('cx:localFile'), PROP('cx:fileSize'));
  updateFileMetaData(model, PROP('cx:auxFile'  ), PROP('cx:auxSize' ));

  return ds;
}


function updateFileMetaData (model, fileProp, sizeProp) {
  var i, res, leaf, file;
  var stmts = model.find(null, fileProp, null);

  for (i = 0; i < stmts.length; i++) {
    res  = stmts[i][0];
    leaf = stmts[i][2];
    file = gProject.projectFolder;
    file.append(leaf.value);
    if (! file.exists()) {
      dump("*** updateFileMetaData: file not found: " + leaf + "\n");
      continue;
    }
    setLiteralProp(model, res, sizeProp, LIT(file.fileSize));
  }
}


function stringToModel (str) {
  var ios = getIOService();
  var uri = ios.newURI(Cx.PROJECTS_URL, null, null);

  var ds = getRDFXMLDataSource();
  var p  = getRDFXMLParser();
  p.parseString(ds, uri, str);

  var m = new RDFModel(ds);

  return m;
}
