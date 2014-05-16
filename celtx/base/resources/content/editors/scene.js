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

var gController = new FormController('scene');


function getController () { return gController; }

function getBrowser    () { return document.getElementById('sheet'); }


function getPPBrowser () {
  return getBrowser();
}

function getNavToolbox () {
  if ("navtoolbox" in gController._activeController)
    return gController._activeController.navtoolbox;
  return getPPBrowser();
}

function getWebNavigation () {
  var browser = getBrowser();
  return browser ? browser.webNavigation : null;
}

//function getMenuPopup () {
//  return document.getElementById("outliner-popup");
//}


function loaded () {
  gWindow = new Object;

  window.controllers.appendController(gController);
  document.getElementById('sheet').init();
}


function ready () {
  if (! gController.res) {
    window.setTimeout(ready, 100);
    return;
  }
  try {
    var sheet = document.getElementById('sheet');
    gController.attach(sheet);
    gController.populate();
  }
  catch (ex) {
    dump(ex);
  }
}
