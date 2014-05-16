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

function expandCollapse (imgid, targetid) {
  var imgelem = document.getElementById(imgid);
  var targetelem = document.getElementById(targetid);
  var collapsed = targetelem.style.display == "none";
  targetelem.style.display = collapsed ? "block" : "none";
  var imgname = collapsed ? "minus.png" : "plus.png";
  imgelem.src = "chrome://celtx/skin/" + imgname;
}


function googlemap() {
  var element = document.getElementById('mapaddress');
  var qstring = escape(element.value);

  for(i=0; i<qstring.length; i++){
    if(qstring.indexOf("%0D%0A") > -1){
      qstring=qstring.replace("%0D%0A",'%20');
    }
    else if(qstring.indexOf("%0A") > -1){
      qstring=qstring.replace("%0A",'%20');
    }
    else if(qstring.indexOf("%0D") > -1){
      qstring=qstring.replace("%0D",'%20');
    }
  }

  var url = 'http://www.google.com/maps?f=q&q=' + qstring;
  top.gApp.openBrowser(url);
}
