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

var gDialog = new Object();

function loaded () {
  gDialog.config = window.arguments[0];

  gDialog.list = document.getElementById("deptlist");
  gDialog.name = document.getElementById("namebox");

  var rdfsvc = getRDFService();
  var rdfsrc = currentProfileDir();
  rdfsrc.append(Cx.PREFS_FILE);
  var prefds = rdfsvc.GetDataSourceBlocking(fileToFileURL(rdfsrc));
  gDialog.list.database.AddDataSource(prefds);
  gDialog.list.builder.rebuild();

  validate();

  setTimeout(selectDefaultCategory, 0);
}

function selectDefaultCategory () {
  setTimeout(function () { gDialog.name.focus(); }, 0);

  if (! gDialog.config.department) {
    gDialog.list.selectedIndex = 0;
    return;
  }

  var items = gDialog.list.getElementsByTagName("listitem");
  for (var i = 0; i < items.length; ++i) {
    if (items[i].value == gDialog.config.department) {
      gDialog.list.selectedItem = items[i];
      gDialog.list.ensureElementIsVisible(items[i]);
      return;
    }
  }

  gDialog.list.selectedIndex = 0;
}

function validate () {
  var valid = gDialog.name.value.match(/\S/);
  document.documentElement.getButton("accept").disabled = ! valid;
}

function accepted () {
  gDialog.config.title = gDialog.name.value;
  gDialog.config.department = gDialog.list.selectedItem.value;
  gDialog.config.accepted = true;
  return true;
}

function canceled () {
  gDialog.config.accepted = false;
  return true;
}
