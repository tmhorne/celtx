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

var gMockupTimer = null;
var gMockupAnimTimer = null;
var gMockupOpacity = 0.0;
var gMockupState = "hidden";

var kMockupAnimSteps = 20;
var kMockupAnimDuration = 500;
var kMockupAnimStepSize = kMockupAnimDuration / kMockupAnimSteps;
var kMockupAnimOpacityStepSize = 1 / kMockupAnimSteps;

var kMockupHideDuration = 30000; // 30 seconds
var kMockupShowDuration = 10000; // 10 seconds

function mockupStepAnimation () {
  var frame = document.getElementById("sponsorframe");
  gMockupAnimTimer = null;

  if (gMockupState == "showing") {
    gMockupOpacity += kMockupAnimOpacityStepSize;

    if (gMockupOpacity >= 1) {
      gMockupState = "shown";
      gMockupOpacity = 1;
    }
    else {
      gMockupAnimTimer = setTimeout(mockupStepAnimation, kMockupAnimStepSize);
    }

    frame.setAttribute("style", "opacity: " + gMockupOpacity + ";");
  }
  else if (gMockupState == "hiding") {
    gMockupOpacity -= kMockupAnimOpacityStepSize;

    if (gMockupOpacity <= 0) {
      gMockupState = "hidden";
      gMockupOpacity = 0;
    }
    else {
      gMockupAnimTimer = setTimeout(mockupStepAnimation, kMockupAnimStepSize);
    }

    frame.setAttribute("style", "opacity: " + gMockupOpacity + ";");
  }
}

function mockupChangeState () {
  if (gMockupState == "hidden" || gMockupState == "hiding") {
    gMockupState = "showing";
    mockupStepAnimation();
    gMockupTimer = setTimeout(mockupChangeState, kMockupShowDuration);
  }
  else {
    gMockupState = "hiding";
    mockupStepAnimation();
    gMockupTimer = setTimeout(mockupChangeState, kMockupHideDuration);
  }
}

function initMockup () {
  gMockupTimer = setTimeout(mockupChangeState, kMockupHideDuration);
}

initMockup();
