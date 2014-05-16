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

var dialog = {};


function loaded () {
  dialog.auth       = window.arguments[0];
  dialog.sb         = document.getElementById('celtx-bundle');
  dialog.username   = document.getElementById('username');
  dialog.password   = document.getElementById('password');
  dialog.autologin  = document.getElementById('auto-login-checkbox');
  dialog.serviceList = document.getElementById('service-list');

  var pref = getPrefService().getBranch("celtx.");

  try {
    var services = pref.getCharPref("server.studio.list").split(/\s*,\s*/);
    var selection = pref.getCharPref("server.studio.selection");
    for (var i = 0; i < services.length; ++i) {
      var parts = services[i].split(/\s*=\s*/);
      var service = parts[0];
      var name = parts.length > 1 ? gApp.getText(parts[1]) : service;
      var item = dialog.serviceList.appendItem(name, service);
      if (service == selection)
        dialog.serviceList.selectedItem = item;
    }
    if (! dialog.serviceList.selectedItem)
      dialog.serviceList.selectedIndex = 0;

    serviceSelectionChanged();
  }
  catch (ex) {
    dump("*** " + ex + "\n");
  }

  dialog.username.value = dialog.auth.username || "";
  if (! dialog.username.value) {
    try {
      dialog.username.value = pref.getCharPref("user.id");
    }
    catch (ex) {}
  }
  try {
    dialog.password.value = base64_decodew(
      pref.getCharPref("user.encpassword"));
    
  }
  catch (ex) {}
  if (dialog.username.value != "")
    dialog.password.focus();
  if (dialog.auth.reattempt) {
    var msg = document.getElementById("msgfield");
    var link = document.getElementById("msglink");

    if (dialog.auth.message.match(/FAIL/i))
      msg.appendChild(document.createTextNode(msg.getAttribute("failvalue")));
    else
      msg.appendChild(document.createTextNode(dialog.auth.message));

    if (dialog.auth.location) {
      link.setAttribute("src", dialog.auth.location);
      link.value = link.getAttribute("enabledvalue");
    }
    else {
      link.value = "";
    }
  }

  try {
    dialog.autologin.checked = pref.getBoolPref("user.loginOnStartup");
  }
  catch (ex) {}
}


function serviceSelectionChanged () {
  var prefs = getPrefService().getBranch("celtx.server.");
  prefs.setCharPref("studio.selection", dialog.serviceList.value);
  var usernameDeck = document.getElementById("username-deck");
  if (dialog.serviceList.value.match(/studio/))
    usernameDeck.selectedIndex = 1; // "Username"
  else
    usernameDeck.selectedIndex = 0; // "E-mail"
}


function recoverPassword () {
  // TODO: Update when the Studio link is ready
  var baseURL = getCeltxService().STUDIO_BASEURL;
  if (baseURL.match(/studio/))
    gApp.openBrowser(baseURL + "/reset");
  else
    gApp.openBrowser(baseURL + "/reset.html");
}


function createAccount () {
  // TODO: Update when the Studio link is ready
  gApp.openBrowser(getCeltxService().STUDIO_BASEURL + "/");
}


function canceled () {
  dialog.auth.canceled = true;
}


function accepted () {
  // Trim leading and trailing white space
  var username = dialog.username.value;
  username = username.replace(/^\s+/, "");
  username = username.replace(/\s+$/, "");
  dialog.auth.username = username;
  dialog.auth.password = dialog.password.value;
  var pref = getPrefService().getBranch("celtx.");
  try {
    pref.setBoolPref("user.loginOnStartup", dialog.autologin.checked);
  }
  catch (ex) {}
  if (dialog.autologin.checked) {
    pref.setCharPref("user.id", username);
    pref.setCharPref("user.encpassword", base64_encodew(dialog.password.value));
  }
  else {
    try {
      pref.clearUserPref("user.encpassword");
    }
    catch (ex) {}
  }
}
