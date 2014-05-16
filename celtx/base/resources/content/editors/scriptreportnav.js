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

function loaded () {
  gWindow = new Object;

  gWindow.reportTree = document.getElementById("report-tree");
}


function selectReportIndex (index) {
  gWindow.reportTree.view.selection.select(0);
}


function getSelectedReportIndex () {
  return gWindow.reportTree.view.selection.currentIndex;
}


function getSelectedReportName () {
  var idx = getSelectedReportIndex();
  var cols = gWindow.reportTree.columns;
  return gWindow.reportTree.view.getCellText(idx, cols.getFirstColumn());
}
