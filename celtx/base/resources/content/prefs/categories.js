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

var gDeptDS = null;
var gAntiDS = null;

function categoriesLoaded () {
  dump("    categories pane loaded\n");
  populateCategoryList();
  window.setTimeout("sortUserDeptList();", 0);
}

function selectionChanged () {
  var addButton = document.getElementById("category-add-button");
  var removeButton = document.getElementById("category-remove-button");
  var allList = document.getElementById("allDeptList");
  var userList = document.getElementById("userDeptList");
  addButton.disabled = allList.selectedCount == 0;
  removeButton.disabled = userList.selectedCount == 0;
}

function populateCategoryList () {
  var rdfsvc = getRDFService();
  if (! gDeptDS) {
    var rdfsrc = currentProfileDir();
    rdfsrc.append(Cx.PREFS_FILE);
    // For some reason, GetDataSourceBlocking doesn't actually block
    gDeptDS = rdfsvc.GetDataSource(fileToFileURL(rdfsrc));
  }
  var rds = gDeptDS.QueryInterface(
    Components.interfaces.nsIRDFRemoteDataSource);
  if (! rds.loaded) {
    window.setTimeout(populateCategoryList, 100);
    return;
  }

  var list = document.getElementById("userDeptList");
  list.database.AddDataSource(gDeptDS);
  list.builder.rebuild();

  // Since XUL templates lack two fundamental things, a negation operator
  // and an implicit "member of" predicate, we need to build a list manually
  // to express the difference of two sequences.
  gAntiDS = getInMemoryDataSource();
  var disseqres = rdfsvc.GetResource(Cx.NS_CX + "Prefs/CategoriesDisabled");
  var disseq = new RDFSeq(gAntiDS, disseqres);
  var schemaDS = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
  var allseqres = rdfsvc.GetResource(Cx.SCHEMA_URL + "#default-markup");
  var allseq = new RDFSeq(schemaDS, allseqres);
  var deptseqres = rdfsvc.GetResource(Cx.NS_CX + "Prefs/Categories");
  var deptseq = new RDFSeq(gDeptDS, deptseqres);
  var items = allseq.toArray();
  for (var i = 0; i < items.length; ++i) {
    if (deptseq.indexOf(items[i]) < 0)
      disseq.push(items[i]);
  }

  var allList = document.getElementById("allDeptList");
  allList.database.AddDataSource(gAntiDS);
  allList.builder.rebuild();
}

function sortUserDeptList () {
  var userList = document.getElementById("userDeptList");
  var sortService = Components.classes["@mozilla.org/xul/xul-sort-service;1"]
    .getService(Components.interfaces.nsIXULSortService);
  sortService.sort(userList, Cx.NS_RDFS + "label", "ascending");
}

function sortDisabledDeptList () {
  var disList = document.getElementById("allDeptList");
  var sortService = Components.classes["@mozilla.org/xul/xul-sort-service;1"]
    .getService(Components.interfaces.nsIXULSortService);
  sortService.sort(disList, Cx.NS_RDFS + "label", "ascending");
}

function addCategory () {
  var rdfsvc = getRDFService();
  var seqres = rdfsvc.GetResource(Cx.NS_CX + "Prefs/Categories");
  var seq = new RDFSeq(gDeptDS, seqres);
  var disseqres = rdfsvc.GetResource(Cx.NS_CX + "Prefs/CategoriesDisabled");
  var disseq = new RDFSeq(gAntiDS, disseqres);
  var list = document.getElementById("allDeptList");
  var items = list.selectedItems;
  gDeptDS.beginUpdateBatch();
  gAntiDS.beginUpdateBatch();
  for (var i = 0; i < items.length; ++i) {
    var addres = rdfsvc.GetResource(items[i].id);
    disseq.remove(addres);
    if (seq.indexOf(addres) < 0)
      seq.push(addres);
  }
  gAntiDS.endUpdateBatch();
  gDeptDS.endUpdateBatch();
  sortUserDeptList();
}

function removeCategory () {
  var rdfsvc = getRDFService();
  var seqres = rdfsvc.GetResource(Cx.NS_CX + "Prefs/Categories");
  var seq = new RDFSeq(gDeptDS, seqres);
  var disseqres = rdfsvc.GetResource(Cx.NS_CX + "Prefs/CategoriesDisabled");
  var disseq = new RDFSeq(gAntiDS, disseqres);
  var list = document.getElementById("userDeptList");
  var items = list.selectedItems;
  gDeptDS.beginUpdateBatch();
  gAntiDS.beginUpdateBatch();
  for (var i = 0; i < items.length; ++i) {
    var remres = rdfsvc.GetResource(items[i].id);
    seq.remove(remres);
    if (disseq.indexOf(remres) < 0)
      disseq.push(remres);
  }
  gAntiDS.endUpdateBatch();
  gDeptDS.endUpdateBatch();
  sortDisabledDeptList();
}
