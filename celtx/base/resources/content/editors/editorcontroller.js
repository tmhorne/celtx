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

/**
 * The prototype class for an editor controller object. You can sub-class it
 * by starting any class with ClassName.prototype = new EditorController.
 * @class A generic editor controller.
 */
function EditorController () {
  /**
   * A set of commands supported by this controller, where a command is
   * supported if this.commands[commandname] is set to 1.
   */
  this.commands = {};

  /**
   * Internally tracks if the controller's document is modified.
   * @type boolean
   * @private
   */
  this._modified = false;

  /**
   * Internally tracks if this controller is currently focused.
   * @type boolean
   * @private
   */
  this._focused = false;

  /**
   * The window representing this controller's outline view (navigation panel).
   * @type window
   * @private
   */
  this._outlineView = null;

  /**
   * Internally tracks if this controller is currently locked.
   * @type boolean
   * @private
   */
  this._locked = false;
}

EditorController.prototype = {
  // Command Management
  commands: {},

  /**
   * If an editor controller is part of a greater set (i.e., MultiController),
   * this points to the parent controller.
   */
  parentController: null,


  /**
   * Determine if a command is supported.
   * @param {string} cmd  the name of a command
   * @type boolean
   * @return true if the command is supported, false otherwise
   */
  supportsCommand: function (cmd) {
    return (cmd in this.commands);
  },

  /**
   * Determine if a command is currently enabled. Users should call
   * supportsCommand first to determine if the command is supported.
   * @param {string} cmd  the name of a command
   * @type boolean
   * @return true if the command is currently enabled, false otherwise
   * @see #supportsCommand
   */
  isCommandEnabled: function (cmd) { return this.supportsCommand(cmd); },

  /**
   * Performs the action associated with a command. Users should ensure the
   * command is supported and currently enabled first.
   * @param {string} cmd  the name of a command
   * @see #supportsCommand
   * @see #isCommandEnabled
   */
  doCommand: function (cmd) {},

  /**
   * Update the enabled status of all commands supported by this controller.
   */
  updateCommands: function () {
    // Update my commands
    for (var cmd in this.commands) {
      goUpdateCommand(cmd);
    }
    // Update any custom menu commands
    top.gFrameLoader.updateMenuCommands();
  },

  // Standard Editor Functions

  /**
   * Gets the modified state of controller's document.
   * @type boolean
   * @return true if the controller's document is modified
   */
  get modified () { return this._modified; },

  /**
   * Gets the lock state of the controller's document.
   * @type boolean
   * @return true if the controller's document is locked for editing
   */
  get locked () { return this._locked; },

  /**
   * Gets a list of controllers that are under this controller. For a simple
   * EditorController, this list will be empty.
   * @type array
   * @return a list of controllers that are under this controller
   */
  get childControllers () { return new Array(); },

  /**
   * Gets the deepest controller that is active under this controller. For a
   * simple EditorController, this will be the controller itself.
   * @type EditorController
   * @return the deepest active controller
   */
  get activeController () { return self; },

  /**
   * Returns true if this is the currently active controller in its hierarchy.
   * @type boolean
   * @return true if this controller is active
   */
  isActive: function () {
    if (! this.parentController)
      return true;
    return this.parentController.activeController == this;
  },

  /**
   * The project this controller's document belongs to.
   * @type Project
   * @private
   */
  project: null,

  /**
   * The RDF resource corresponding to this controller's document.
   * @type nsIRDFResource
   * @private
   */
  docres: null,

  /**
   * Performs any necessary initialization after the controller's window
   * has loaded.
   */
  load: function () {},

  /**
   * Opens a document from a project in the editor.
   * @param {Project} project  a Celtx project
   * @param {nsIRDFResource} docres  a document RDF resource
   */
  open: function (project, docres) {
    this.project = project;
    this.docres = docres;
  },

  /**
   * Reloads the currently loaded document from storage. After updating a
   * project with changes from the server, this method should be called to
   * display the latest changes in the editor.
   */
  reload: function () {},

  /**
   * Performs any necessary cleanup prior to closing a document.
   */
  close: function () {
    window.controllers.removeController(this);
  },

  /**
   * Locks the editor, placing it in read-only mode.
   */
  lock: function () {
    this._locked = true;
  },

  /**
   * Unlocks the editor, releasing it from read-only mode.
   */
  unlock: function () {
    this._locked = false;
  },

  /**
   * Tells the controller it has received focus.
   */
  focus: function () {
    this._focused = true;
  },

  /**
   * Tells the controller it has lost focus.
   */
  blur: function () {
    this._focused = false;
  },

  /**
   * Saves the currently loaded document to storage.
   */
  save: function () {
    if (this._locked) return;

    this._modified = false;
  },

  /**
   * Gets the controller's outline view (navigation panel).
   * @type window
   * @return the controller's outline view, or null if it does not have one
   */
  get outlineView () { return this._outlineView; },

  /**
   * Sets the controller's outline view (navigation panel).
   * @param {window} val  the outline view
   */
  set outlineView (val) { this._outlineView = val; return val; }
};


/**
 * The prototype class for a composite editor controller object, which is
 * composed of multiple controllers. This is typically used for editors
 * containing sub-tabs, which have an editor controller assigned to each
 * sub-tab.
 */
function MultiController () {
  this._controllers = [];
  this._activeController = null;
}

MultiController.prototype = {
  // Command Management

  /**
   * Determine if a command is supported.
   * @param {string} cmd  the name of a command
   * @type boolean
   * @return true if the command is supported, false otherwise
   */
  supportsCommand: function (cmd) {
    // supportsCommand is the union of all the controllers' supported commands
    if (cmd in this.commands)
      return true;

    for (var i = 0; i < this._controllers.length; ++i) {
      if (this._controllers[i].supportsCommand(cmd))
        return true;
    }

    return false;
  },

  /**
   * Determine if a command is currently enabled. Users should call
   * supportsCommand first to determine if the command is supported.
   * @param {string} cmd  the name of a command
   * @type boolean
   * @return true if the command is currently enabled, false otherwise
   * @see #supportsCommand
   */
  isCommandEnabled: function (cmd) {
    // isCommandEnabled is true only if it's true for the active controller
    if (! this._activeController)
      return false;

    return (this._activeController.supportsCommand(cmd) &&
            this._activeController.isCommandEnabled(cmd));
  },

  /**
   * Performs the action associated with a command. Users should ensure the
   * command is supported and currently enabled first.
   * @param {string} cmd  the name of a command
   * @see #supportsCommand
   * @see #isCommandEnabled
   */
  doCommand: function (cmd) {
    if (this._activeController &&
        this._activeController.supportsCommand(cmd) &&
        this._activeController.isCommandEnabled(cmd))
      this._activeController.doCommand(cmd);
  },

  /**
   * Update the enabled status of all commands supported by this controller.
   */
  updateCommands: function () {
    // Update my commands
    for (var cmd in this.commands)
      goUpdateCommand(cmd);

    // Update the active controller's commands
    if (this._activeController)
      this._activeController.updateCommands();

    // Update any custom menu commands
    top.gFrameLoader.updateMenuCommands();
  },

  // Standard Editor Functions

  /**
   * Gets the modified state of controller's document.
   * @type boolean
   * @return true if the controller's document is modified
   */
  get modified () {
    if (this._modified)
      return true;

    for (var i = 0; i < this._controllers.length; ++i) {
      if (this._controllers[i].modified)
        return true;
    }

    return false;
  },

  /**
   * Gets the lock state of the controller's document.
   * @type boolean
   * @return true if the controller's document is locked for editing
   */
  get locked () { return this._locked; },

  /**
   * Gets a list of controllers that are under this controller. For a simple
   * EditorController, this list will be empty.
   * @type array
   * @return a list of controllers that are under this controller
   */
  get childControllers () {
    // Return a copy, rather than our private variable
    return new Array().concat(this._controllers);
  },

  /**
   * Gets the deepest controller that is active under this controller. For a
   * simple EditorController, this will be the controller itself.
   * @type EditorController
   * @return the deepest active controller
   */
  get activeController () {
    return this._activeController;
  },

  /**
   * Returns true if this is the currently active controller in its hierarchy.
   * @type boolean
   * @return true if this controller is active
   */
  isActive: function () {
    if (this.parentController &&
        this.parentController.activeController != this)
      return false;

    if (this.activeController && this.activeController != this)
      return false;

    return true;
  },

  /**
   * The project this controller's document belongs to.
   * @type Project
   * @private
   */
  project: null,

  /**
   * The RDF resource corresponding to this controller's document.
   * @type nsIRDFResource
   * @private
   */
  docres: null,

  /**
   * Appends the controller to the controller list.
   */
  addController: function (aController) {
    this._controllers.push(aController);
  },

  /**
   * Inserts the controller at the given index, or appends it if index
   * is greater than or equal to the size of the controller list.
   */
  insertController: function (aController, aIndex) {
    if (aIndex >= this._controllers.length) {
      this.addController(aController);
      return;
    }

    for (controller in this._controllers) {
      if (controller == aController)
        return;
    }
    this._controllers.splice(aIndex, 0, aController);
  },

  removeController: function (aController) {
    for (var i = 0; i < this._controllers.length; ++i) {
      if (this._controllers[i] == aController) {
        this._controllers.splice(i, 1);
        break;
      }
    }
  },

  /**
   * Performs any necessary initialization after the controller's window
   * has loaded.
   */
  load: function () {
    for (var i = 0; i < this._controllers.length; ++i)
      this._controllers[i].load();
  },

  /**
   * Opens a document from a project in the editor.
   * @param {Project} project  a Celtx project
   * @param {nsIRDFResource} docres  a document RDF resource
   */
  open: function (project, docres) {
    this.project = project;
    this.docres = docres;

    for (var i = 0; i < this._controllers.length; ++i)
      this._controllers[i].open(project, docres);
  },

  /**
   * Reloads the currently loaded document from storage. After updating a
   * project with changes from the server, this method should be called to
   * display the latest changes in the editor.
   */
  reload: function () {
    for (var i = 0; i < this._controllers.length; ++i)
      this._controllers[i].reload();
  },

  /**
   * Performs any necessary cleanup prior to closing a document.
   */
  close: function () {
    if (this._focused) {
      dump("*** receiving a close event without blurring…\n");
      this.blur();
    }
    for (var i = 0; i < this._controllers.length; ++i) {
      try {
        this._controllers[i].close();
      }
      catch (ex) {
        dump("*** MultiController.close: " + ex + "\n");
      }
    }
    window.controllers.removeController(this);
  },

  /**
   * Locks the editor, placing it in read-only mode.
   */
  lock: function () {
    this._locked = true;

    for (var i = 0; i < this._controllers.length; ++i)
      this._controllers[i].lock();
  },

  /**
   * Unlocks the editor, releasing it from read-only mode.
   */
  unlock: function () {
    this._locked = false;

    for (var i = 0; i < this._controllers.length; ++i)
      this._controllers[i].unlock();
  },

  /**
   * Tells the controller it has received focus.
   */
  focus: function () {
    this._focused = true;

    if (this._activeController)
      this._activeController.focus();

    this.updateCommands();
  },

  /**
   * Tells the controller it has lost focus.
   */
  blur: function () {
    this._focused = false;

    if (this._activeController)
      this._activeController.blur();
  },

  /**
   * Saves the currently loaded document to storage.
   */
  save: function () {
    if (this._locked) return;

    this._modified = false;

    for (var i = 0; i < this._controllers.length; ++i)
      this._controllers[i].save();
  },

  /**
   * Gets the controller's outline view (navigation panel).
   * @type window
   * @return the controller's outline view, or null if it does not have one
   */
  get outlineView () { return this._outlineView; },

  /**
   * Sets the controller's outline view (navigation panel).
   * @param {window} val  the outline view
   */
  set outlineView (val) { this._outlineView = val; return val; }
};
