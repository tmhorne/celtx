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

var gDialog;

function loaded () {
  gDialog = new Object;
  gDialog.title   = document.getElementById("bmtitle");
  gDialog.url     = document.getElementById("bmurl");
  gDialog.config = window.arguments[0];

  if (gDialog.config.title)
    gDialog.title.value = gDialog.config.title;
  if (gDialog.config.url)
    gDialog.url.value   = gDialog.config.url;
}

function accepted () {
  gDialog.config.accepted = true;
  gDialog.config.title    = gDialog.title.value;
  gDialog.config.url      = canonizeWebURL(gDialog.url.value);
  return true;
}

function canceled () {
  return true;
}

