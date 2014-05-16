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

function loaded () {
  gController.load();
}


function getSelectedCalendar () {
  return gController.calendar;
}


var gCalendarDelegate = {
  viewController: null,


  init: function (aViewController) {
    this.viewController = aViewController;
    aViewController.delegate = this;
  },


  getSelectedCalendar: function () {
    return gCalendarWindow.calendar;
  },


  /**
   *  Deletes items currently selected in the view.
   */
  deleteSelectedEvents: function () {
    var selectedItems = gCalendarWindow.currentView.getSelectedItems({});
    this.viewController.deleteOccurrences(selectedItems.length,
      selectedItems, false, false);
  },


  /**
   *  Delete the current selected item with focus from the task tree
   */
  deleteToDoCommand: function (aEvent, aDoNotConfirm) {
    var tasks = this.getSelectedTasks(aEvent);
    this.viewController.deleteOccurrences(tasks.length,
      tasks, false, aDoNotConfirm);
  },


  getSelectedTasks: function (aEvent) {
    var taskTree = gCalendarWindow.unifinderTodoTree;
    return taskTree ? taskTree.selectedTasks : [];
  },


  /**
   *  Edit the items currently selected in the view.
   */
  editSelectedEvents: function () {
    var selectedItems = gCalendarWindow.currentView.getSelectedItems({});
    if (selectedItems && selectedItems.length >= 1)
      this.modifyEventWithDialog(selectedItems[0], null, true);
  },


  createEventWithDialog: function (aCalendar, aStart, aEnd, aSummary, aEvent,
                                   aForceAllday) {
    this.viewController.createEventWithDialog(aCalendar, aStart, aEnd,
      aSummary, aEvent, aForceAllday);
  },


  createTodoWithDialog: function (calendar, dueDate, summary, todo) {
    this.viewController.createTodoWithDialog(calendar, dueDate, summary, todo);
  },


  modifyEventWithDialog: function (aOccurrence, aPendingModification, aX) {
    this.viewController.modifyEventWithDialog(aOccurrence,
      aPendingModification, aX);
  },


  openEventDialog: function (aItem, aCalendar, aMode, aCallback, aJob) {
    this.viewController.openEventDialog(aItem, aCalendar, aMode,
      aCallback, aJob);
  },


  promptOccurrenceModification: function (aItem, aX, aAction) {
    return this.viewController.promptOccurrenceModification(aItem, aX, aAction);
  },


  finalizePendingModification: function (aOccurrence) {
    return this.viewController.finalizePendingModification(aOccurrence);
  },


  setDefaultAlarmValues: function(aItem) {
    this.viewController.setDefaultAlarmValues(aItem);
  }
};


var gController = {
  __proto__: new EditorController,


  commands: {
    "calendar_new_event_command": 1,
    "calendar_modify_event_command": 1,
    "calendar_delete_event_command": 1,
    "cmd_delete": 1,
    "button_delete": 1,
    "calendar_new_todo_command": 1,
    "calendar_delete_todo_command": 1
  },


  doCommand: function (cmd) {
    switch (cmd) {
      case "calendar_new_event_command":
        gCalendarWindow.calendarViewController.createEventWithDialog(
          gCalendarWindow.calendar);
        break;
      case "calendar_modify_event_command":
        gCalendarDelegate.editSelectedEvents();
        break;
      case "calendar_delete_event_command":
      case "cmd_delete":
      case "button_delete":
        var focusedElement = document.commandDispatcher.focusedElement;
        if (focusedElement) {
          var focusedRichListbox = getParentNodeOrThis(
            focusedElement, "richlistbox");
          if (focusedElement.className == "calendar-task-tree")
            gCalendarDelegate.deleteToDoCommand(null, false);
          else
            gCalendarDelegate.deleteSelectedEvents();
        }
        break;
      case "calendar_new_todo_command":
        gCalendarWindow.calendarViewController.createTodoWithDialog(
          gCalendarWindow.calendar);
        break;
      case "calendar_delete_todo_command":
        deleteToDoCommand();
        break;
    }
  },


  load: function () {
    window.controllers.appendController(this);

    // This is taking the place of calendarInit in calendar.js
    gCalendarWindow = new CeltxCalendarWindow();

    var viewdeck = document.getElementById("view-deck");
    gCalendarWindow.viewdeck = viewdeck;
    for (var i = 0; i < viewdeck.childNodes.length; ++i)
      gCalendarWindow.views.push(viewdeck.childNodes[i]);

    var unifinder = document.getElementById("unifinder-search-results-tree");
    gCalendarWindow.unifinderTree = unifinder;

    calendarViewController = new CalendarViewController();
    gCalendarWindow.calendarViewController = calendarViewController;
    gCalendarDelegate.init(calendarViewController);
  },


  open: function (project, docres) {
    this.project = project;
    this.docres = docres;

    var calfile = this.project.fileForResource(this.docres);

    if (! isReadableFile(calfile)) {
      calfile = this.project.projectFolder;
      calfile.append("calendar.ics");
      calfile.createUnique(0, 0644 & calfile.parent.permissions);
      this.project.addFileToDocument(calfile, this.docres);
    }

    var calmgr = Components.classes["@mozilla.org/calendar/manager;1"]
      .getService(Components.interfaces.calICalendarManager);
    this.initCalendarManager(calmgr);

    var ios = getIOService();
    var calsrc = ios.newURI(fileToFileURL(calfile), null, null);
    this.calendar = calmgr.createCalendar("ics", calsrc);
    try {
      calmgr.registerCalendar(this.calendar);
    }
    catch (ex) {}

    // this.calendar.addObserver(this);
    if (! this.calendar.name)
      this.calendar.name = getRDFString(project.ds, docres,
        getRDFService().GetResource(Cx.NS_DC + "title"));

    gCalendarWindow.calendar = this.calendar;
    gCalendarWindow.init();

    try {
      gCalendarWindow.switchToView("month");
    }
    catch (ex) {
      dump("*** gCalendarWindow.switchToView: " + ex + "\n");
    }
    try {
      gCalendarWindow.goToDay(new Date());
    }
    catch (ex) {
      dump("*** gCalendarWindow.goToDay: " + ex + "\n");
    }
  },


  initCalendarManager: function (mgr) {
    if (mgr.getCalendars({}).length > 0)
      return;

    var homeURL = getIOService().newURI("moz-profile-calendar://", null, null);
    var homeCalendar = mgr.createCalendar("storage", homeURL);
    mgr.registerCalendar(homeCalendar);
    homeCalendar.name = "Home"; // Don't bother localizing, it's bogus anyway
  },


  onSelectionChanged: function (event) {
  }
};


function getController () {
  return gController;
}


function setOutlineView (outline) {
  dump("--- setOutlineView\n");
  var unitodo = outline.document.getElementById("unifinder-todo-tree");
  gCalendarWindow.unifinderTodoTree = unitodo;
  unitodo.delegate = gCalendarDelegate;
  unitodo.controller = gController;

  var editbox = outline.document.getElementById("unifinder-task-edit-field");
  editbox.collapsed = true;
}


// Copied from applicationUtil.js because it's a Sunbird file



function goToggleToolbar (id, elementID) {
  var toolbar = document.getElementById(id);
  var element = document.getElementById(elementID);
  if (toolbar) {
    var isHidden = toolbar.hidden;
    toolbar.hidden = !isHidden;
    document.persist(id, 'hidden');
    if (element) {
      element.setAttribute("checked", isHidden ? "true" : "false");
      document.persist(elementID, 'checked');
    }
  }
}


// Overrides goToDate from calendar-views.js

function goToDate (date) {
  gCalendarWindow.goToDay(date.jsDate);
}
