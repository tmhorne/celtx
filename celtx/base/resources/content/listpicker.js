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

gWindow = {};

function loaded () {
  gWindow.config = window.arguments[0];

  var heading = document.getElementById("heading");
  heading.value = gWindow.config.header;

  var listbox = document.getElementById("listbox");

  for (var i = 0; i < gWindow.config.list.length; ++i) {
    var item = document.createElementNS(Cx.NS_XUL, "listitem");
    item.setAttribute("type", "checkbox");
    item.setAttribute("label", gWindow.config.list[i].label);
    item.setAttribute("value", gWindow.config.list[i].label);
    item.setAttribute("checked", "true");
    if (gWindow.config.list[i].disabled)
      item.setAttribute("disabled", "true");

    listbox.appendChild(item);
  }
}


function accepted () {
  gWindow.config.result = [];
  var children = document.getElementById("listbox").childNodes;
  for (var i = 0; i < children.length; ++i) {
    if (children[i].checked)
      gWindow.config.result.push(children[i].getAttribute("value"));
  }
  gWindow.config.accepted = true;
}


function canceled () {
  gWindow.config.accepted = false;
}
