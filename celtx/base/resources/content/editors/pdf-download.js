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

var session = {};

function loaded () {
    // session = window.arguments[0];
    // session.responder.win = window;
    // session.channel.asyncOpen(session.receiver, null);
  session.listener = window.arguments[0];
  dump("--- loaded!\n");
  setTimeout("checkComplete()", 100);
}

function checkComplete () {
  if (! session.listener.complete) {
    setTimeout("checkComplete()", 100);
    return;
  }
  if (session.listener.channel.requestSucceeded)
    window.close();
}

function canceled () {
    // session.responder.canceled = true;
    session.listener.canceled = true;
    return true;
}

