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

function CalendarViewController (delegate) {
  this.delegate = delegate || this;
}


CalendarViewController.prototype = {
  QueryInterface: function (aIID) {
    if (! aIID.equals(Components.interfaces.calICalendarViewController) &&
        ! aIID.equals(Components.interfaces.nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;

    return this;
  },


  // calICalendarViewController implementation


  createNewEvent: function (aCalendar, aStartTime, aEndTime, aForceAllday) {
    aCalendar = aCalendar || this.delegate.getSelectedCalendar();
    if (! aCalendar)
      throw "createNewEvent: No calendar selected";

    if (aStartTime && aEndTime && ! aStartTime.isDate && ! aEndTime.isDate) {
      var event = createEvent();
      event.startDate = aStartTime;
      end.endDate = aEndTime;
      var sbs = Components.classes["@mozilla.org/intl/stringbundle;1"]
        .getService(Components.interfaces.nsIStringBundleService);
      var props = sbs.createBundle(
        "chrome://calendar/locale/calendar.properties");
      event.title = props.GetStringFromName("newEvent");
      this.delegate.setDefaultAlarmValues(event);
      doTransaction("add", event, aCalendar, null, null);
    }
    else {
      this.delegate.createEventWithDialog(aCalendar, aStartTime, null,
        null, null, aForceAllday);
    }
  },



  modifyOccurrence: function (aOccurrence, aNewStart, aNewEnd, aNewTitle) {
    aOccurrence = this.delegate.finalizePendingModification(aOccurrence);

    // if modifying this item directly (e.g. just dragged to new time),
    // then do so; otherwise pop up the dialog
    if (aNewStart || aNewEnd || aNewTitle) {
      var instance = aOccurrence.clone();

      if (aNewTitle) {
        instance.title = aNewTitle;
      }

      // When we made the executive decision (in bug 352862) that
      // dragging an occurrence of a recurring event would _only_ act
      // upon _that_ occurrence, we removed a bunch of code from this
      // function. If we ever revert that decision, check CVS history
      // here to get that code back.

      if (aNewStart || aNewEnd) {
        // Yay for variable names that make this next line look silly
        if (instance instanceof Components.interfaces.calIEvent) {
          if (aNewStart && instance.startDate) {
            instance.startDate = aNewStart;
          }
          if (aNewEnd && instance.endDate) {
            instance.endDate = aNewEnd;
          }
        } else {
          if (aNewStart && instance.entryDate) {
            instance.entryDate = aNewStart;
          }
          if (aNewEnd && instance.dueDate) {
            instance.dueDate = aNewEnd;
          }
        }
      }

      // If the item contains attendees then they need to be notified
      if (instance.getProperty("X-MOZ-SEND-INVITATIONS") == "TRUE") {
        sendItipInvitation(instance, 'REQUEST', []);
      }

      doTransaction('modify', instance, instance.calendar, aOccurrence, null);
    } else {
      this.delegate.modifyEventWithDialog(aOccurrence);
    }
  },


  deleteOccurrences: function (aCount, aOccurrences, aUseParentItems,
                               aDoNotConfirm) {
    startBatchTransaction();
    var recurringItems = {};

    function getSavedItem(aItemToDelete) {
      // Get the parent item, saving it in our recurringItems object for
      // later use.
      var hashVal = aItemToDelete.parentItem.hashId;
      if (!recurringItems[hashVal]) {
        recurringItems[hashVal] = {
          oldItem: aItemToDelete.parentItem,
          newItem: aItemToDelete.parentItem.clone()
        };
      }
      return recurringItems[hashVal];
    }

    // Make sure we are modifying a copy of aOccurrences, otherwise we will
    // run into race conditions when the view's doDeleteItem removes the
    // array elements while we are iterating through them.
    var occurrences = aOccurrences.slice(0);

    for each (var itemToDelete in occurrences) {
      if (aUseParentItems) {
        // Usually happens when ctrl-click is used. In that case we
        // don't need to ask the user if he wants to delete an
        // occurrence or not.
        itemToDelete = itemToDelete.parentItem;
      } else if (!aDoNotConfirm && occurrences.length == 1) {
        // Only give the user the selection if only one occurrence is
        // selected. Otherwise he will get a dialog for each occurrence
        // he deletes.
        var [itemToDelete, hasFutureItem, response] =
          this.delegate.promptOccurrenceModification(itemToDelete,
            false, "delete");
        if (!response) {
          // The user canceled the dialog, bail out
          break;
        }
      }

      // Now some dirty work: Make sure more than one occurrence can be
      // deleted by saving the recurring items and removing occurrences as
      // they come in. If this is not an occurrence, we can go ahead and
      // delete the whole item.
      itemToDelete = this.finalizePendingModification(itemToDelete);
      if (itemToDelete.parentItem.hashId != itemToDelete.hashId) {
        var savedItem = getSavedItem(itemToDelete);
        savedItem.newItem.recurrenceInfo
          .removeOccurrenceAt(itemToDelete.recurrenceId);
        // Dont start the transaction yet. Do so later, in case the
        // parent item gets modified more than once.
      } else {
        // Add sending ITIP IMIP cancelation
        // If the item contains attendees then they need to be notified
        if (itemToDelete.hasProperty("X-MOZ-SEND-INVITATIONS") &&
            (itemToDelete.getProperty("X-MOZ-SEND-INVITATIONS") == "TRUE")) {
          sendItipInvitation(itemToDelete,'CANCEL', []);
        }
        doTransaction('delete', itemToDelete, itemToDelete.calendar,
          null, null);
      }
    }

    // Now handle recurring events. This makes sure that all occurrences
    // that have been passed are deleted.
    for each (var ritem in recurringItems) {
      doTransaction('modify', ritem.newItem, ritem.newItem.calendar,
        ritem.oldItem, null);
    }
    endBatchTransaction();
  },


  // Delegate methods (default implementation, feel free to provide
  // a delegate of your own!)


  getSelectedCalendar: function () {
    return null;
  },


  createEventWithDialog: function (calendar, startDate, endDate, summary,
                                   event, aForceAllday) {
    const kDefaultTimezone = calendarDefaultTimezone();

    var onNewEvent = function(item, calendar, originalItem, listener) {
      var innerListener = new opCompleteListener(originalItem, listener);
      if (item.id) {
        // If the item already has an id, then this is the result of
        // saving the item without closing, and then saving again.
        doTransaction('modify', item, calendar, originalItem, innerListener);
      } else {
        // Otherwise, this is an addition
        doTransaction('add', item, calendar, null, innerListener);
      }
    };

    if (event) {
      if (!event.isMutable) {
        event = event.clone();
      }
      // If the event should be created from a template, then make sure to
      // remove the id so that the item obtains a new id when doing the
      // transaction
      event.id = null;

      if (aForceAllday) {
        event.startDate.isDate = true;
        event.endDate.isDate = true;
        if (event.startDate.compare(event.endDate) == 0) {
          // For a one day all day event, the end date must be 00:00:00 of
          // the next day.
          event.endDate.day++;
        }
      }
    }
    else {
      event = createEvent();

      if (startDate) {
        event.startDate = startDate.clone();
        if (startDate.isDate && !aForceAllday) {
          // This is a special case where the date is specified, but the
          // time is not. To take care, we setup up the time to our
          // default event start time.
          event.startDate = getDefaultStartDate(event.startDate);
        }
        else if (aForceAllday) {
          // If the event should be forced to be allday, then don't set up
          // any default hours and directly make it allday.
          event.startDate.isDate = true;
          event.startDate.timezone = floating();
        }
      }
      else {
        // If no start date was passed, then default to the next full hour
        // of today, but with the date of the selected day
        // FIXME: Don't call currentView as a global function
        var refDate = currentView().initialized && currentView().selectedDay.clone();
        event.startDate = getDefaultStartDate(refDate);
      }

      if (endDate) {
        event.endDate = endDate.clone();
        if (aForceAllday) {
          // XXX it is currently not specified, how callers that force all
          // day should pass the end date. Right now, they should make
          // sure that the end date is 00:00:00 of the day after.
          event.endDate.isDate = true;
          event.endDate.timezone = floating();
        }
      }
      else {
        event.endDate = event.startDate.clone();
        if (!aForceAllday) {
          // If the event is not all day, then add the default event
          // length.
          event.endDate.minute += getPrefSafe("calendar.event.defaultlength",
            60);
        } else {
          // All day events need to go to the beginning of the next day.
          event.endDate.day++;
        }
      }

      event.calendar = calendar || this.delegate.getSelectedCalendar();

      if (summary) {
        event.title = summary;
      }

      this.delegate.setDefaultAlarmValues(event);
    }

    this.delegate.openEventDialog(event, calendar, "new", onNewEvent, null);
  },


  modifyEventWithDialog: function (aItem, job, aPromptOccurrence) {
    if (! job)
      job = this.createPendingModification(aItem);

    var onModifyItem = function (item, calendar, originalItem, listener) {
      var innerListener = new opCompleteListener(originalItem, listener);
      doTransaction('modify', item, calendar, originalItem, innerListener);
    };

    var item = aItem;
    var futureItem, response;
    if (aPromptOccurrence !== false) {
      [item, futureItem, response] =
        this.delegate.promptOccurrenceModification(aItem, true, "edit");
    }

    if (item && (response || response === undefined)) {
      this.delegate.openEventDialog(item, item.calendar, "modify",
        onModifyItem, job);
    }
    else if (job && job.dispose) {
      // If the action was canceled and there is a job, dispose it directly.
      job.dispose();
    }
  },


  createTodoWithDialog: function (calendar, dueDate, summary, todo) {
    const kDefaultTimezone = calendarDefaultTimezone();

    var onNewItem = function(item, calendar, originalItem, listener) {
      var innerListener = new opCompleteListener(originalItem, listener);
      if (item.id) {
        // If the item already has an id, then this is the result of
        // saving the item without closing, and then saving again.
        doTransaction('modify', item, calendar, originalItem, innerListener);
      } else {
        // Otherwise, this is an addition
        doTransaction('add', item, calendar, null, innerListener);
      }
    }

    if (todo) {
      // If the too should be created from a template, then make sure to
      // remove the id so that the item obtains a new id when doing the
      // transaction
      if (todo.id) {
        todo = todo.clone();
        todo.id = null;
      }
    } else {
      todo = createTodo();
      todo.calendar = calendar || this.delegate.getSelectedCalendar();

      if (summary)
        todo.title = summary;

      if (dueDate)
        todo.dueDate = dueDate;

      this.delegate.setDefaultAlarmValues(todo);
    }

    this.delegate.openEventDialog(todo, calendar, "new", onNewItem, null);
  },


  openEventDialog: function (calendarItem, calendar, mode, callback, job) {
    // Set up some defaults
    mode = mode || "new";
    calendar = calendar || this.delegate.getSelectedCalendar();
    var calendars = getCalendarManager().getCalendars({});
    calendars = calendars.filter(isCalendarWritable);

    var isItemSupported;
    if (isToDo(calendarItem)) {
      isItemSupported = function isTodoSupported(cal) {
        return (cal.getProperty("capabilities.tasks.supported") !== false);
      };
    }
    else if (isEvent(calendarItem)) {
      isItemSupported = function isEventSupported(cal) {
        return (cal.getProperty("capabilities.events.supported") !== false);
      };
    }

    // Filter out calendars that don't support the given calendar item
    calendars = calendars.filter(isItemSupported);

    if (mode == "new" && calendars.length < 1 &&
        (!isCalendarWritable(calendar) || !isItemSupported(calendar))) {
        // There are no writable calendars or no calendar supports the given
        // item. Don't show the dialog.
      return;
    }
    else if (mode == "new" &&
             (!isCalendarWritable(calendar) || !isItemSupported(calendar))) {
      // Pick the first calendar that supports the item and is writable
      calendar = calendars[0];
      if (calendarItem) {
        // XXX The dialog currently uses the items calendar as a first
        // choice. Since we are shortly before a release to keep regression
        // risk low, explicitly set the item's calendar here.
        calendarItem.calendar = calendars[0];
      }
    }

    // Setup the window arguments
    var args = new Object();
    args.calendarEvent = calendarItem;
    args.calendar = calendar;
    args.mode = mode;
    args.onOk = callback;
    args.job = job;

    // this will be called if file->new has been selected from within the dialog
    args.onNewEvent = function(calendar) {
      this.delegate.createEventWithDialog(calendar, null, null);
    }

    // the dialog will reset this to auto when it is done loading.
    window.setCursor("wait");

    // ask the provide if this item is an invitation. if this is the case
    // we'll open the summary dialog since the user is not allowed to change
    // the details of the item.
    var isInvitation = false;
    if (calendar instanceof Components.interfaces.calISchedulingSupport) {
        isInvitation = calendar.isInvitation(calendarItem);
    }

    // open the dialog modeless
    // var url = "chrome://calendar/content/sun-calendar-event-dialog.xul";
    var url = "chrome://celtx/content/editors/calendareventdialog.xul";
    if ((mode != "new" && isInvitation) || !isCalendarWritable(calendar)) {
        url = "chrome://calendar/content/calendar-summary-dialog.xul";
    }
    openDialog(url, "_blank", "chrome,titlebar,resizable", args);
  },


/**
 * Prompts the user how the passed item should be modified. If the item is an
 * exception or already a parent item, the item is returned without prompting.
 * If "all occurrences" is specified, the parent item is returned. If "this
 * occurrence only" is specified, then aItem is returned. If "this and following
 * occurrences" is selected, aItem's parentItem is modified so that the
 * recurrence rules end (UNTIL) just before the given occurrence. If
 * aNeedsFuture is specified, a new item is made from the part that was stripped
 * off the passed item.
 *
 * EXDATEs and RDATEs that do not fit into the items recurrence are removed. If
 * the modified item or the future item only consist of a single occurrence,
 * they are changed to be single items.
 *
 * @param aItem                         The item to check.
 * @param aNeedsFuture                  If true, the future item is parsed.
 *                                        This parameter can for example be
 *                                        false if a deletion is being made.
 * @param aAction                       Either "edit" or "delete". Sets up
 *                                          the labels in the occurrence prompt
 * @return [modifiedItem, futureItem, promptResponse]
 *                                      If "this and all following" was chosen,
 *                                        an array containing the item *until*
 *                                        the given occurrence (modifiedItem),
 *                                        and the item *after* the given
 *                                        occurrence (futureItem).
 *
 *                                        If any other option was chosen,
 *                                        futureItem is null  and the
 *                                        modifiedItem is either the parent item
 *                                        or the passed occurrence, or null if
 *                                        the dialog was canceled.
 *
 *                                        The promptResponse parameter gives the
 *                                        response of the dialog as a constant.
 */
  promptOccurrenceModification: function (aItem, aNeedsFuture, aAction) {
    const CANCEL = 0;
    const MODIFY_OCCURRENCE = 1;
    const MODIFY_FOLLOWING = 2;
    const MODIFY_PARENT = 3;

    var futureItem = false;
    var pastItem;
    var type = CANCEL;

    // Check if this actually is an instance of a recurring event
    if (aItem == aItem.parentItem) {
      type = MODIFY_PARENT;
    }
    else if (aItem.parentItem.recurrenceInfo
            .getExceptionFor(aItem.recurrenceId, false) != null) {
      // If the user wants to edit an occurrence which is already an exception
      // always edit this single item.
      // XXX  Why? I think its ok to ask also for exceptions.
      type = MODIFY_OCCURRENCE;
    }
    else {
      // Prompt the user. Setting modal blocks the dialog until it is closed. We
      // use rv to pass our return value.
      var rv = { value: CANCEL, item: aItem, action: aAction};
      window.openDialog(
        "chrome://calendar/content/calendar-occurrence-prompt.xul",
        "prompt-occurrence-modification",
        "centerscreen,chrome,modal,titlebar", rv);
      type = rv.value;
    }

    switch (type) {
      case MODIFY_PARENT:
        pastItem = aItem.parentItem;
        break;
      case MODIFY_FOLLOWING:
        // TODO tbd in a different bug
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        break;
      case MODIFY_OCCURRENCE:
        pastItem = aItem;
        break;
      case CANCEL:
        // Since we have not set past or futureItem, the return below will
        // take care.
        break;
    }

    return [pastItem, futureItem, type];
  },


  pendingJobs: [],


  // in order to initiate a modification for the occurrence passed as argument
  // we create an object that records the necessary details and store it in an
  // internal array ('pendingJobs'). this way we're in a position to terminate
  createPendingModification: function (aOccurrence) {
    // finalize a (possibly) pending modification. this will notify
    // an open dialog to save any outstanding modifications.
    aOccurrence = this.finalizePendingModification(aOccurrence);

    // XXX TODO logic to ask for which occurrence to modify is currently in
    // modifyEventWithDialog, since the type of transactions done depend on
    // this. This in turn makes the aOccurrence here be potentially wrong, I
    // haven't seen it used anywhere though.
    var pendingModification = {
      controller: this,
      item: aOccurrence,
      finalize: null,
      dispose: function() {
        var array = this.controller.pendingJobs;
        for (var i=0; i<array.length; i++) {
          if (array[i] == this) {
            array.splice(i,1);
            break;
          }
        }
      }
    }

    this.pendingJobs.push(pendingModification);

    return pendingModification;
  },



  // iterate the list of pending modifications and see if the occurrence
  // passed as argument is currently about to be modified (event dialog is
  // open with the item in question). if this should be the case we call
  // finalize() in order to bring the dialog down and avoid dataloss.
  finalizePendingModification: function (aOccurrence) {
    for each (var job in this.pendingJobs) {
      var item = job.item;
      var parent = item.parent;
      if ((item.hashId == aOccurrence.hashId) ||
          (item.parentItem.hashId == aOccurrence.hashId) ||
          (item.hashId == aOccurrence.parentItem.hashId)) {
        // terminate() will most probably create a modified item instance.
        aOccurrence = job.finalize();
        break;
      }
    }

    return aOccurrence;
  },


/**
 * Read default alarm settings from user preferences and apply them to
 * the event/todo passed in.
 *
 * @param aItem   The event or todo the settings should be applied to.
 */
  setDefaultAlarmValues: function(aItem) {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService);
    var alarmsBranch = prefService.getBranch("calendar.alarms.");

    if (isEvent(aItem)) {
      try {
        if (alarmsBranch.getIntPref("onforevents") == 1) {
          var alarmOffset =
            Components.classes["@mozilla.org/calendar/duration;1"]
              .createInstance(Components.interfaces.calIDuration);
          var units = alarmsBranch.getCharPref("eventalarmunit");
          alarmOffset[units] = alarmsBranch.getIntPref("eventalarmlen");
          alarmOffset.isNegative = true;
          aItem.alarmOffset = alarmOffset;
          aItem.alarmRelated = Components.interfaces.calIItemBase.ALARM_RELATED_START;
        }
      }
      catch (ex) {
        Components.utils.reportError(
          "Failed to apply default alarm settings to event: " + ex);
      }
    }
    else if (isToDo(aItem)) {
      try {
        if (alarmsBranch.getIntPref("onfortodos") == 1) {
          // You can't have an alarm if the entryDate doesn't exist.
          if (!aItem.entryDate) {
            aItem.entryDate = getSelectedDay() &&
                              getSelectedDay().clone() || now();
          }
          var alarmOffset =
            Components.classes["@mozilla.org/calendar/duration;1"]
              .createInstance(Components.interfaces.calIDuration);
          var units = alarmsBranch.getCharPref("todoalarmunit");
          alarmOffset[units] = alarmsBranch.getIntPref("todoalarmlen");
          alarmOffset.isNegative = true;
          aItem.alarmOffset = alarmOffset;
          aItem.alarmRelated = Components.interfaces.calIItemBase.ALARM_RELATED_START;
        }
      } catch (ex) {
        Components.utils.reportError(
          "Failed to apply default alarm settings to task: " + ex);
      }
    }
  }
};
