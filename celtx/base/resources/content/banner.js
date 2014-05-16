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

var gBannerController = {
  rotationTimer: null,
  fadeTimer: null,
  fadeOpacity: 0.0,
  state: "hidden",

  fadeSteps: 20,
  fadeDuration: 500,

  banners: null,
  current: null,


  init: function () {
    this.fadeStepSize = this.fadeDuration / this.fadeSteps;
    this.fadeOpacityStepSize = 1.0 / this.fadeSteps;

    this.frame = document.getElementById("bannerframe");

    var obsvc = getObserverService();
    obsvc.addObserver(this, "celtx:banner-data-changed", false);
  },


  shutdown: function () {
    var obsvc = getObserverService();
    obsvc.removeObserver(this, "celtx:banner-data-changed");
  },


  observe: function (subject, topic, data) {
    if (topic == "celtx:banner-data-changed")
      this.restart();
  },


  restart: function () {
    if (this.fadeTimer)
      clearTimeout(this.fadeTimer);

    if (this.rotationTimer)
      clearTimeout(this.rotationTimer);

    this.fadeOpacity = 0.0;
    this.frame.setAttribute("style", "opacity: 0.0;");
    this.frame.setAttribute("src", "about:blank");

    var cxsvc = getCeltxService();

    this.banners = cxsvc.banners;
    this.current = null;

    if (this.banners) {
      this.rotationTimer = setTimeout(function () {
        gBannerController.showNextBanner()
      }, 0);
    }
  },


  showNextBanner: function () {
  try {
    this.rotationTimer = null;

    var prevBanner = this.current;

    if (this.current)
      this.current = this.current.nextSibling;
    else
      this.current = this.banners.documentElement.firstChild;

    var INode = Components.interfaces.nsIDOMNode;
    while (this.current && this.current.nodeType != INode.ELEMENT_NODE)
      this.current = this.current.nextSibling;

    // Allow for wrap-around
    if (! this.current && prevBanner) {
      this.current = this.banners.documentElement.firstChild;
      while (this.current && this.current.nodeType != INode.ELEMENT_NODE)
        this.current = this.current.nextSibling;
    }

    if (! this.current || this.current == prevBanner)
      return;

    this.state = "hiding";
    this.fadeTimer = setTimeout(function () {
      gBannerController.stepAnimation();
    }, this.fadeStepSize);
  }
  catch (ex) { dump("*** showNextBanner: " + ex + "\n"); }
  },


  stepAnimation: function () {
    this.fadeTimer = null;

    if (this.state == "hiding") {
      this.fadeOpacity -= this.fadeOpacityStepSize;
      if (this.fadeOpacity <= 0) {
        this.fadeOpacity = 0;
        if (this.current) {
          this.frame.setAttribute("src", this.current.getAttribute("src"));
          this.state = "showing";
          this.fadeTimer = setTimeout(function () {
            gBannerController.stepAnimation();
          }, this.fadeStepSize);
        }
      }
      else {
        this.fadeTimer = setTimeout(function () {
          gBannerController.stepAnimation();
        }, this.fadeStepSize);
      }
    }
    else if (this.state == "showing") {
      this.fadeOpacity += this.fadeOpacityStepSize;
      if (this.fadeOpacity >= 1) {
        this.fadeOpacity = 1;
        if (this.current) {
          this.state = "shown";
          var delay = this.current.getAttribute("time");
          delay = delay ? Number(delay) : 0;
          if (delay > 0) {
            this.rotationTimer = setTimeout(function () {
              gBannerController.showNextBanner();
            }, delay);
          }
        }
      }
      else {
        this.fadeTimer = setTimeout(function () {
          gBannerController.stepAnimation();
        }, this.fadeStepSize);
      }
    }
    var opacitystr = "opacity: " + this.fadeOpacity + ";";
    this.frame.setAttribute("style", opacitystr);
  }
};
