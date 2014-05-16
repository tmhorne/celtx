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

var gWindow;

var gController = {
  commands: {
    "cmd-find": 1,
    "cmd-find-again": 1,
    "cmd-find-previous": 1,
    "cmd-replace": 1,
    "cmd-replace-and-find": 1,
    "cmd-replace-all": 1
  },


  supportsCommand: function (cmd) {
    return this.commands[cmd] == 1;
  },


  isCommandEnabled: function (cmd) {
    if (! gWindow)
      return false;

    var findEnabled     = gWindow.fields.find.value != "" &&
                          ! gWindow.currentSearchFailed;

    var replaceEnabled  = ! gWindow.replaceVisible.collapsed;

    switch (cmd) {
      case "cmd-find":
      case "cmd-find-again":
      case "cmd-find-previous":
        return findEnabled;
      default:
        return findEnabled && replaceEnabled;
    }
  },


  doCommand: function (cmd) {
    switch (cmd) {
      case "cmd-find":
      case "cmd-find-again":
      case "cmd-find-previous":
        findNext(cmd == "cmd-find-previous");
        break;
      case "cmd-replace":
        replace();
        break;
      case "cmd-replace-and-find":
        replace();
        findNext();
        break;
      case "cmd-replace-all":
        replaceAll();
        break;
    }
  }
};


var gKeyupListener = {
  handleEvent: function (event) {
    const nsIDOMKeyEvent = Components.interfaces.nsIDOMKeyEvent;
    event = event.QueryInterface(nsIDOMKeyEvent);
    if (event.keyCode == nsIDOMKeyEvent.DOM_VK_RETURN ||
        event.keyCode == nsIDOMKeyEvent.DOM_VK_ENTER)
      findNext();
    else if (event.keyCode == nsIDOMKeyEvent.DOM_VK_ESCAPE) {
      window.controllers.removeController(gController);
      window.controllers.removeController(gApp);
      window.close();
    }
  }
};


// Window arguments: webBrowserFind[,editor[,showReplace]]
function loaded() {
  gWindow = new Object;

  var IReq = Components.interfaces.nsIInterfaceRequestor;
  var IFind = Components.interfaces.nsIWebBrowserFind;

  gWindow.findTabs       = document.getElementById("findtabs");
  gWindow.replaceVisible = document.getElementById("replace-visible");

  try {
    gWindow.findInst = window.arguments[0];
    gWindow.findSvc = getFindService();
    if (window.arguments.length > 1) {
      gWindow.editor = window.arguments[1];
      if (window.arguments.length > 2) {
        if (window.arguments[2])
        gWindow.findTabs.selectedIndex = 1;
      }
    }
    else {
      gWindow.editor = null;
      document.getElementById("replacetab").hidden = true;
    }
  }
  catch (ex) {
    dump("*** findreplace: " + ex + "\n");
    window.close();
  }

  gWindow.notfound  = document.getElementById("not-found-label");

  gWindow.opt = {
    caseSensitive:   document.getElementById("case-sensitive-option"),
    searchBackwards: document.getElementById("search-backwards-option")
  };

  gWindow.fields = {
    find:    document.getElementById("find-field"),
    replace: document.getElementById("replace-field")
  };

  window.addEventListener("keyup", gKeyupListener, true);

  var fi = gWindow.findInst;
  var fs = gWindow.findSvc;

  gWindow.fields.find.value = fi.searchString || fs.searchString;
  gWindow.fields.replace.value = fs.replaceString;
  gWindow.opt.caseSensitive.checked = fi.matchCase || fs.matchCase;
  gWindow.opt.searchBackwards.radioGroup.selectedIndex =
    fi.findBackwards ? 0 : 1;
  gWindow.notfound.value = "";

  gWindow.fields.find.select();
  gWindow.fields.find.focus();

  window.controllers.appendController(gController);
  window.controllers.appendController(gApp);

  updateCommands();
}

function updateCommands () {
  for (var cmd in gController.commands) {
    goUpdateCommand(cmd);
    window.opener.goUpdateCommand(cmd);
  }
}

function findFieldInput () {
  gWindow.currentSearchFailed = false;
  updateCommands();
}


function replaceFieldInput () {
  updateCommands();
}


function updateFindService () {
  gWindow.findSvc.searchString  = gWindow.fields.find.value;
  gWindow.findSvc.matchCase     = gWindow.opt.caseSensitive.checked;
  gWindow.findSvc.wrapFind      = true;
  gWindow.findSvc.findBackwards = gWindow.opt.searchBackwards.selected;
}


function findNext (forceBackwards) {
  gWindow.notfound.value = "";
  updateFindService();

  // Update the find instance
  gWindow.findInst.searchString   = gWindow.fields.find.value;
  gWindow.findInst.matchCase      = gWindow.opt.caseSensitive.checked;
  gWindow.findInst.wrapFind       = true;
  gWindow.findInst.findBackwards  = gWindow.opt.searchBackwards.selected ||
                                    forceBackwards;

  var rv = gWindow.findInst.findNext();
  if (! rv) {
    gWindow.notfound.value = gApp.getText("NoMatchesFound");
    gWindow.currentSearchFailed = true;
    updateCommands();
    return false;
  }

  updateCommands();

  return true;
}


function replace () {
  var sel = gWindow.editor.selection;
  if (sel.isCollapsed) return false;

  var findStr  = gWindow.fields.find.value;
  var replStr  = gWindow.fields.replace.value;
  var caseSens = gWindow.opt.caseSensitive.checked;
  if (! fuzzyMatchString(sel.toString(), findStr, caseSens)) return false;

  updateFindService();

  var savedRange = null;
  if (gWindow.opt.searchBackwards.selected) {
    savedRange = sel.getRangeAt(0).cloneRange();
    savedRange.collapse(true);
  }

  if (replStr == "") {
    gWindow.editor.deleteSelection(0);
  }
  else {
    var IPlaintextEditor = Components.interfaces.nsIPlaintextEditor;
    var texted = gWindow.editor.QueryInterface(IPlaintextEditor);
    texted.insertText(replStr);
  }

  if (savedRange) {
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  return true;
}


function fuzzyMatchString (str1, str2, caseSensitive) {
  if (! caseSensitive) {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
  }

  // Normalize whitespace to a single space
  str1 = str1.replace(/\s+/g, ' ');
  str2 = str2.replace(/\s+/g, ' ');

  return str1 == str2;
}


function replaceAll () {
  var findStr  = gWindow.fields.find.value;
  var replStr  = gWindow.fields.replace.value;
  var wrapping = true;
  var backward = gWindow.opt.searchBackwards.selected;
  var caseSens = gWindow.opt.caseSensitive.checked;

  updateFindService();

  var ed    = gWindow.editor;
  var doc   = ed.document;
  var body  = doc.body;
  var count = doc.body.childNodes.length;

  ed.beginTransaction();

  try {
    var sel = ed.selection;
    if (backward) sel.collapseToEnd();
    else sel.collapseToStart();

    var selRange = sel.getRangeAt(0);
    var origRange = selRange.cloneRange();

    var searchRange = doc.createRange();
    if (wrapping) {
      // Replace on entire document
      searchRange.setStart(body, 0);
      searchRange.setEnd(body, count);
    }
    else if (backward) {
      // Replace backwards
      searchRange.setStart(body, 0);
      searchRange.setEnd(selRange.startContainer, selRange.startOffset);
    }
    else {
      // Replace forwards
      searchRange.setStart(selRange.startContainer, selRange.startOffset);
      searchRange.setEnd(body, count);
    }

    replaceWithinRange(findStr, replStr, searchRange, caseSens);

    // TODO: position sel at start/end

  }
  catch (ex) {
    dump("replaceAll: " + ex + "\n");
  }

  ed.endTransaction();
}


function replaceWithinRange (findStr, replStr, range, caseSensitive) {
  var rf = getRangeFind();
  rf.caseSensitive = caseSensitive;

  var startPt = range.cloneRange();
  startPt.setStart(range.startContainer, range.startOffset);
  startPt.setEnd(range.startContainer, range.startOffset);
  // maybe: startPt.collapse(true);

  var endPt = range.cloneRange();
  endPt.setStart(range.endContainer, range.endOffset);
  endPt.setEnd(range.endContainer, range.endOffset);
  // maybe: endPt.collapse(false);

  var sel = gWindow.editor.selection;
  var found;
  while ((found = rf.Find(findStr, range, startPt, endPt)) != null) {
    // maybe need editor selectRange fn?
    sel.removeAllRanges();
    sel.addRange(found);

    if (replStr == '') {
      gWindow.editor.deleteSelection(0);
    }
    else {
      var IPlaintextEditor = Components.interfaces.nsIPlaintextEditor;
      var texted = gWindow.editor.QueryInterface(IPlaintextEditor);
      texted.insertText(replStr);
      sel = gWindow.editor.selection;
      sel.collapseToEnd();
      startPt = sel.getRangeAt(0);
    }
  }
}


function setReplaceVisible(visible) {
  // Apparently this gets called before loaded does!
  if (gWindow)
    gWindow.replaceVisible.collapsed = ! visible;
}
