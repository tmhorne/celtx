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

var gDelegate = null;

function loaded () {
}

function setView (mode) {
  if (mode == "tree") {
    document.getElementById("iconviewbtn").removeAttribute("checked");
    document.getElementById("listviewbtn").setAttribute("checked", "true");
    document.getElementById("viewdeck").selectedIndex = 0;
  }
  else if (mode == "icons") {
    document.getElementById("iconviewbtn").setAttribute("checked", "true");
    document.getElementById("listviewbtn").removeAttribute("checked");
    document.getElementById("viewdeck").selectedIndex = 1;
  }
}

function setDelegate (delegate) {
  gDelegate = delegate;
}
