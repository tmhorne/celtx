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

// Proxy object for fullscreen add-on
var gPanel = {
  toggleSidebar: function () {
    var sidebar = document.getElementById("sidebar");
    sidebar.collapsed = ! sidebar.collapsed;
  }
};

function SidebarController (aSidebar, aEditor) {
  this.sidebar = aSidebar;
  this.editor = aEditor;

  var tabs = document.getElementById("sidebartabs");
  tabs.addEventListener("select", this, false);

  this.noteController = new NoteSidebarController();
  this.mediaController = new MediaSidebarController();
  this.breakdownController = new BreakdownSidebarController();
  this.controllers = [
    this.noteController,
    this.mediaController,
    this.breakdownController
  ];
  for (var i = 0; i < this.controllers.length; ++i) {
    try {
      this.controllers[i].init(aEditor);
    }
    catch (ex) {
      dump("*** sidebar controller init: " + ex + "\n");
    }
  }
}


SidebarController.prototype = {
  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) ||
        aIID.equals(Components.interfaces.nsIDOMEventListener))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      case "select":
        if (aEvent.target.id == "sidebartabs")
          this.tabSelected(aEvent);
        break;
    }
  },


  shutdown: function () {
    for (var i = 0; i < this.controllers.length; ++i) {
      try {
        this.controllers[i].shutdown();
      }
      catch (ex) {
        dump("*** sidebar controller shutdown: " + ex + "\n");
      }
    }
  },


  lock: function () {
    for (var i = 0; i < this.controllers.length; ++i) {
      try {
        this.controllers[i].lock();
      }
      catch (ex) {
        dump("*** sidebar lock: " + ex + "\n");
      }
    }
  },


  unlock: function () {
    for (var i = 0; i < this.controllers.length; ++i) {
      try {
        this.controllers[i].unlock();
      }
      catch (ex) {
        dump("*** sidebar unlock: " + ex + "\n");
      }
    }
  },


  get selectedTab () {
    var tabs = document.getElementById("sidebartabs");
    return tabs.selectedItem;
  },


  tabSelected: function (aEvent) {
    var deck = document.getElementById("sidebardeck");
    var tab = aEvent.target;
    var cardname = tab.value;
    var card = document.getElementById(cardname);
    if (card) {
      deck.selectedPanel = card;
    }
    else {
      dump("*** No such tab card: " + cardname + "\n");
    }
  },


  willDeleteContext: function (aContext) {
    for (var i = 0; i < this.controllers.length; ++i) {
      try {
        this.controllers[i].willDeleteContext(aContext);
      }
      catch (ex) {
        dump("*** willDeleteContext: " + ex + "\n");
      }
    }
  },


  didDeleteContext: function (aContext) {
    for (var i = 0; i < this.controllers.length; ++i) {
      try {
        this.controllers[i].didDeleteContext(aContext);
      }
      catch (ex) {
        dump("*** willDeleteContext: " + ex + "\n");
      }
    }
  },


  willMoveContext: function (aContext) {
    for (var i = 0; i < this.controllers.length; ++i) {
      try {
        this.controllers[i].willMoveContext(aContext);
      }
      catch (ex) {
        dump("*** willDeleteContext: " + ex + "\n");
      }
    }
  },


  didMoveContext: function (aContext) {
    for (var i = 0; i < this.controllers.length; ++i) {
      try {
        this.controllers[i].didMoveContext(aContext);
      }
      catch (ex) {
        dump("*** willDeleteContext: " + ex + "\n");
      }
    }
  },


  contextChanged: function (aContext) {
    var contextLabel = document.getElementById("sidebarcontextlabel");
    var title = aContext.title;
    var ordinal = aContext.ordinal;
    if (ordinal)
      title = ordinal + ". " + title;
    contextLabel.value = title;

    for (var i = 0; i < this.controllers.length; ++i) {
      try {
        this.controllers[i].contextChanged(aContext);
      }
      catch (ex) {
        dump("*** contextChanged: " + ex + "\n");
      }
    }
  },


  showSidebarItemByName: function (aName) {
    switch (aName) {
      case "notes":
        this.showSidebarItemById("sidebarnotes");
        break;
      case "media":
        this.showSidebarItemById("sidebarmedia");
        break;
      case "breakdown":
        this.showSidebarItemById("sidebaritems");
        break;
    }
  },


  showSidebarItemById: function (aId) {
    var tabs = document.getElementById("sidebartabs");
    var tab = getItemByValue(tabs, aId);
    if (tab)
      tabs.selectedItem = tab;
  }
};
