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

var gController = {
  observe: function (subject, topic, data) {
    if (topic == "celtx:recent-projects-changed")
      rebuildRecentProjectsMenu();
  }
};

function loaded() {
  gApp.init();
  window.controllers.appendController(gApp);

  window.tryToClose = tryToClose;

  var obsvc = getObserverService();
  obsvc.addObserver(gController, "celtx:recent-projects-changed", false);
}


function tryToClose () {
  var obsvc = getObserverService();
  obsvc.removeObserver(gController, "celtx:recent-projects-changed");
  window.controllers.removeController(gApp);
  return true;
}
