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

function CeltxDocument () {
}


CeltxDocument.prototype = {
  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) ||
        aIID.equals(Components.interfaces.celtxIDocument))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  _project: null,
  _resource: null,


  init: function (aProject, aResource) {
    this._project = aProject;
    this._resource = aResource;
  },


  get project () {
    return this._project;
  },


  get resource () {
    return this._resource;
  },


  get title () {
    var ds = this.project.ds;
    var titlearc = getRDFService().GetResource(Cx.NS_DC + "title");
    return getRDFString(ds, this.resource, titlearc);
  },
  set title (val) {
    var ds = this.project.ds;
    var titlearc = getRDFService().GetResource(Cx.NS_DC + "title");
    setRDFString(ds, this.resource, titlearc, val);
    return val;
  }
};
