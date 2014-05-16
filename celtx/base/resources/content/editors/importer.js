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

function ScriptImporter () {
  this.listeners = [];

  this.heap = {
    lines: [],
    state: new State(),
    lineparse: /^( *)(.*)/,
    lmargin: 0,
    rmargin: 0,
    cmargin: 0,
    dmargin: 0,
    pmargin: 0,
    count: 0,
    limit: 0,
    chunkSize: 0
  };
}


ScriptImporter.translate_chars = [
  { code: 8230, repl: '...' },
  { code: 8211, repl: '-'   },
  { code: 8212, repl: '--'  },
  { code: 8220, repl: '"'   },
  { code: 8221, repl: '"'   },
  { code: 8226, repl: '*'   },
  { code: 8216, repl: "'"   },
  { code: 8217, repl: "'"   }
];

var translate_str = '';

for (var i in ScriptImporter.translate_chars) {
  ScriptImporter.translate_chars[i].chr =
    String.fromCharCode(ScriptImporter.translate_chars[i].code);
  ScriptImporter.translate_chars[i].regex =
    new RegExp(ScriptImporter.translate_chars[i].chr, 'g');
  translate_str += ScriptImporter.translate_chars[i].chr;
}

ScriptImporter.translate_test = new RegExp('[' + translate_str + ']');


ScriptImporter.CHUNK_DELAY  = 100;
ScriptImporter.CHUNK_COUNT  = 20;
ScriptImporter.CHUNK_MIN    = 50;
ScriptImporter.CHUNK_MAX    = 200;


ScriptImporter.MAX_MARGIN_LEFT          = 50,
ScriptImporter.MODE_UNDETERMINED        = -1,
ScriptImporter.MODE_SCREENPLAY          = 0,
ScriptImporter.MODE_STAGEPLAY           = 1;
ScriptImporter.MODE_INDENTED_SCREENPLAY = 2;


ScriptImporter.parseAsync = function (importer) {
  if (importer.finished) {
    var scenetree = importer.transformToSceneTree();
    importer.notifyFinished(scenetree);
  }
  else {
    importer.parseChunk();
    setTimeout(ScriptImporter.parseAsync,
               ScriptImporter.CHUNK_DELAY, importer);
  }
};


ScriptImporter.prototype = {
  get finished () {
    return this.heap.lines.length == 0;
  },


  parse: function parse (txt, async) {
    this.heap.lines = txt.split('\n');
    this.heap.limit = this.heap.lines.length;

    var n = Math.ceil(this.heap.limit / ScriptImporter.CHUNK_COUNT);
        n = Math.max(n, ScriptImporter.CHUNK_MIN);
        n = Math.min(n, ScriptImporter.CHUNK_MAX);
    this.heap.chunkSize = n;

    this.notifyProgress(0.10);  // Arbitrary

    if (async) {
      setTimeout(ScriptImporter.parseAsync,
                 ScriptImporter.CHUNK_DELAY, this);
    }
    else {
      while (! this.finished)
        this.parseChunk();
      var scenetree = this.transformToSceneTree();
      this.notifyFinished(scenetree);
      return scenetree;
    }
  },


  // We can add a removeImportListener if it's really necessary...
  addImportListener: function addImportListener (listener) {
    for (var i = 0; i < this.listeners.length; i++) {
      if (this.listeners[i] == listener)
        return;
    }
    this.listeners.push(listener);
  },


  notifyProgress: function notifyProgress (progress) {
    for (var i = 0; i < this.listeners.length; i++) {
      try {
        this.listeners[i].onImportProgress(this, progress);
      }
      catch (ex) {}
    }
  },


  notifyFinished: function notifyFinished (scenetree) {
    for (var i = 0; i < this.listeners.length; i++) {
      try {
        this.listeners[i].onImportFinished(this, scenetree);
      }
      catch (ex) {}
    }
  },


  parseChunk: function parseChunk () {
    for (var i = 0; i < this.heap.chunkSize; i++) {
      if (this.heap.lines.length == 0) {
        this.heap.state.dispatch('ws', null);
        return;
      }

      this.heap.count++;

      var str    = this.heap.lines.shift();
      var m      = this.heap.lineparse.exec(str);
      // This shouldn't ever happen, but we're somehow getting multi-line
      // "lines" that don't contain newlines. Maybe linefeeds?
      if (! m) continue; 
      var offset = m[1].length;
      var text   = m[2];

      text = this.cleanup(text);

      if (text == "") {
        this.heap.state.dispatch("ws", null);
        continue;
      }

      // Event dispatch
      if (offset < this.heap.lmargin)
        this.heap.state.dispatch("action", text);
      else if (this.is_transition(text, offset))
        this.heap.state.dispatch("transition", text);
      else if (this.is_heading(text, offset))
        this.heap.state.dispatch('heading', text);
      else if (this.is_shot(text, offset))
        this.heap.state.dispatch("shot", text);
      else if (this.is_character(text, offset))
        this.heap.state.dispatch('character', text);
      else if (this.is_parenthetical(text, offset))
        this.heap.state.dispatch('paren', text);
      else if (this.is_dialog(text, offset))
        this.heap.state.dispatch('dialog', text);
      else
        this.heap.state.dispatch('action', text);
    }

    this.notifyProgress(this.heap.count / this.heap.limit);
  },


  transformToSceneTree: function transformToSceneTree () {
    var xsl = document.implementation.createDocument('', '', null);
    xsl.async = false;
    xsl.load(Cx.TRANSFORM_PATH + 'import-text.xml');

    var proc = new XSLTProcessor();
    proc.importStylesheet(xsl);

    return proc.transformToDocument(this.heap.state.dom);
  },


  cleanup: function cleanup (str) {
    if (str == '') return '';

    if (ScriptImporter.translate_test.test(str)) {
      for (var i = 0; i < ScriptImporter.translate_chars.length; i++) {
        str = str.replace(ScriptImporter.translate_chars[i].regex,
                          ScriptImporter.translate_chars[i].repl);
      }
    }

    return str;
  },


  is_transition: function is_transition (text, offset) {
    if (this.heap.state.mode == ScriptImporter.MODE_UNDETERMINED ||
        this.heap.state.mode == ScriptImporter.MODE_STAGEPLAY)
      return false;

    if (text != text.toUpperCase())
      return false;

    return ((this.heap.state.mode == ScriptImporter.MODE_SCREENPLAY ||
             offset > this.heap.lmargin) &&
            text.match(/:$/));
  },


  is_heading: function is_heading (text, offset) {
    if (this.heap.state.mode == ScriptImporter.MODE_UNDETERMINED) {
      if (text.match(/^ACT [IVXLC]+/) ||
          text.match(/^SCENE [IVXLC]+/)) {
        this.change_state(ScriptImporter.MODE_STAGEPLAY);
        return true;
      }
      else if ((text.match(/^[0-9 ]*INT[ .-]/) ||
                text.match(/^[0-9 ]*EXT[ .-]/)) &&
               text == text.toUpperCase()) {
        if (offset > 0) {
          this.change_state(ScriptImporter.MODE_INDENTED_SCREENPLAY);
          this.heap.lmargin = offset;
        }
        else
          this.change_state(ScriptImporter.MODE_SCREENPLAY);
        return true;
      }
      else
        return false;
    }
    else if (this.heap.state.mode == ScriptImporter.MODE_STAGEPLAY) {
      return text.match(/^SCENE [IVXLC]+/)
          || text.match(/^ACT [IVXLC]+/);
    }
    // else ...
    if (! (text.match(/^[0-9 ]*INT[ .-]/) || text.match(/^[0-9 ]*EXT[ .-]/)))
      return false;
    if (this.heap.state.mode == ScriptImporter.MODE_INDENTED_SCREENPLAY) {
      return offset == this.heap.lmargin &&
      text == text.toUpperCase();
    }
    else { // ScriptImporter.MODE_SCREENPLAY
      return text == text.toUpperCase();
    }
  },


  is_action: function is_action (text, offset) {
    if (this.heap.state.mode == ScriptImporter.MODE_UNDETERMINED)
      return false;

    if (this.heap.state.mode == ScriptImporter.MODE_STAGEPLAY) {
      return text.match(/^\[.*\]$/);
    }
    else {
      if (offset != this.heap.lmargin)
        return false;
      if (this.heap.state.state != "action" && text == text.toUpperCase())
        return false;
      return true;
    }
  },


  // This one is a real pain. Don't even try unless the script is indented.
  is_shot: function is_shot (text, offset) {
    if (this.heap.state.mode == ScriptImporter.MODE_UNDETERMINED ||
        this.heap.state.mode == ScriptImporter.MODE_STAGEPLAY)
      return false;
    if (this.heap.state.mode == ScriptImporter.MODE_INDENTED_SCREENPLAY)
      return (offset == this.heap.lmargin && text == text.toUpperCase() &&
              this.heap.state.state != "action");
    else {
      if (text !=  text.toUpperCase())
        return false;
      if (text.match(/^ANGLE/) || text.match(/^CLOSER/) ||
          text.match(/^POV/) || text.match(/^TIGHT/))
        return true;
    }
    return false;
  },


  is_character: function is_character (text, offset) {
    if (this.heap.state.mode == ScriptImporter.MODE_UNDETERMINED ||
        text != text.toUpperCase())
      return false;

    if (this.heap.state.mode == ScriptImporter.MODE_STAGEPLAY) {
      return (offset == this.heap.lmargin && text.match(/^[A-Z ]+\.$/));
    }
    else if (this.heap.state.mode == ScriptImporter.MODE_INDENTED_SCREENPLAY) {
      // It's possible we misidentified something less indented as character,
      // so allow for the character being at a greater offset than expected.
      if (offset > this.heap.cmargin &&
          offset < ScriptImporter.MAX_MARGIN_LEFT)
        this.heap.cmargin = offset;
      return (offset == this.heap.cmargin);
    }
    else if (this.heap.state.mode == ScriptImporter.MODE_SCREENPLAY) {
      // There's an opportunity to refine our mode
      if (offset > this.heap.lmargin) {
        this.heap.cmargin = offset;
        this.change_state(ScriptImporter.MODE_INDENTED_SCREENPLAY);
      }
      return true;
    }
  },


  is_parenthetical: function is_parenthetical (text, offset) {
    if (this.heap.state.mode == ScriptImporter.MODE_STAGEPLAY ||
        this.heap.state.mode == ScriptImporter.MODE_UNDETERMINED)
      return false;

    if (this.heap.state.state != "character" &&
        this.heap.state.state != "dialog" &&
        this.heap.state.state != "paren")
      return false;

    if (this.heap.state.mode == ScriptImporter.MODE_INDENTED_SCREENPLAY) {
      if (offset == this.heap.lmargin)
        return false;
      if (this.heap.pmargin == 0) {
        if (text.charAt(0) != "(")
          return false;
        this.heap.pmargin = offset;
        return true;
      }
      else
        // Sometimes the margin starts after the opening parenthesis
        return (Math.abs(offset - this.heap.pmargin) < 2);
    }
    else if (this.heap.state.mode == ScriptImporter.MODE_SCREENPLAY) {
      if (text.charAt(0) == "(" ||
          text.charAt(text.length - 1) == ")" ||
          this.heap.state.state == "paren") {
        return true;
      }
    }
    return false;
  },


  is_dialog: function is_dialog (text, offset) {
    if (this.heap.state.mode == ScriptImporter.MODE_UNDETERMINED)
      return false;

    if (this.heap.state.mode == ScriptImporter.MODE_STAGEPLAY) {
      if (this.heap.state.state != "character" &&
          this.heap.state.state != "dialog")
        return false;
      return ! text.match(/^\[.*\]$/);
    }
    else if (this.heap.state.mode == ScriptImporter.MODE_INDENTED_SCREENPLAY) {
      if (offset == this.heap.lmargin)
        return false;
      if (this.heap.dmargin == 0) {
        if (this.heap.state.state == "character" ||
            this.heap.state.state == "paren") {
          this.heap.dmargin = offset;
          return true;
        }
      }
      else if (offset == this.heap.dmargin)
        return true;
    }
    else if (this.heap.state.mode == ScriptImporter.MODE_SCREENPLAY) {
      return (this.heap.state.state == "character" ||
              this.heap.state.state == "paren" ||
              this.heap.state.state == "dialog");
    }
    return false;
  },


  change_state: function change_state (state) {
    this.heap.state.mode = state;
    switch (state) {
      case ScriptImporter.MODE_UNDETERMINED:
        dump("--- change_state: undetermined\n");
        break;
      case ScriptImporter.MODE_SCREENPLAY:
        dump("--- change_state: screen play\n");
        break;
      case ScriptImporter.MODE_STAGEPLAY:
        dump("--- change_state: stage play\n");
        break;
      case ScriptImporter.MODE_INDENTED_SCREENPLAY:
        dump("--- change_state: screen play (indented)\n");
        break;
      default:
        dump("*** change_state: unknown mode!\n");
    }
  }
};


function State () {
  this.dom = document.implementation.createDocument(null, 'scriptdoc', null);
  this.context = this.dom.documentElement;
  this.state = 'document';
  this.text = '';
  this.input = '';
  this.mode = ScriptImporter.MODE_UNDETERMINED;
}


State.prototype.dispatch = function (signal, value) {
  this.input = value;

  // dump("  signal: " + signal + "\n");

  switch (this.state) {

  case 'document':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'shot'      : this.transition('shot');       break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.do_state('document');     break;
    }
    break;

  case 'action':
    switch (signal) {
    case 'action'    : this.do_state('action');       break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'shot'      : this.transition('shot');       break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  case 'character':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.do_state('character');    break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'shot'      : this.transition('shot');       break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;
    
  case 'dialog':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.do_state('dialog');       break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'shot'      : this.transition('shot');       break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  case 'heading':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.do_state('heading');      break;
    case 'paren'     : this.transition('paren');      break;
    case 'shot'      : this.transition('shot');       break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  case 'paren':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.do_state('paren');        break;
    case 'shot'      : this.transition('shot');       break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  case 'scene':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'shot'      : this.transition('shot');       break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.do_state('scene');        break;
    }
    break;

  case 'shot':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'shot'      : this.do_state('shot');         break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  case 'transition':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'shot'      : this.transition('shot');       break;
    case 'transition': this.do_state('transition');   break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  case 'text':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'shot'      : this.transition('shot');       break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.do_state('text');         break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  default:
    dump("unknown state: " + this.state + "\n");

  }
    
};    


State.prototype.transition = function (state) {
  this.on_exit(this.state);
  this.state = state;
  this.on_enter(this.state);
  this.do_state(this.state);
};


State.prototype.on_enter = function (state) {
  // dump("entering: " + state + "\n");

  switch (state) {

  case 'heading':
    // If we're coming from the document state we already have a scene
    if (this.last_state != 'document') {
      // Add a scene
      var scene = this.dom.createElement('scene');
      this.context.parentNode.appendChild(scene);
      this.context = scene;
    }
    break;

  case 'action':
  case 'character':
  case 'dialog':
  case 'paren':
  case 'scene':
  case 'shot':
  case 'transition':
  case 'text':
    break;

  }

};


State.prototype.add_element = function (name) {
  var elem = this.dom.createElement(name);
  // elem.appendChild(this.dom.createTextNode(this.text));
  var lines = this.text.split("\n");
  elem.appendChild(this.dom.createTextNode(lines.shift()));
  while (lines.length > 0) {
    elem.appendChild(this.dom.createElement("linebreak"));
    elem.appendChild(this.dom.createTextNode(lines.shift()));
  }
  this.context.appendChild(elem);
};


State.prototype.on_exit = function (state) {
  // dump("exiting: " + state + "\n");

  this.last_state = state;

  switch (state) {

  case 'document':
    // Add a scene
    var scene = this.dom.createElement('scene');
    this.context.appendChild(scene);
    this.context = scene;
    break;
  case 'heading':
    this.add_element('sceneheading');
    break;
  case 'action':
    this.add_element('action');
    break;
  case 'character':
    if (! this.text.match(/\(MORE|CONT\)/)) {
      this.add_element('character');
    }
    break;
  case 'dialog':
    this.add_element('dialog');
    break;
  case 'paren':
    this.add_element('paren');
    break;
  case 'transition':
    this.add_element('transition');
    break;
  case 'shot':
    this.add_element('shot');
    break;
  case 'text':
    this.add_element('text');
    break;
  case 'scene':
    break;
  default:
    dump("on_exit: unknown state: " + state + "\n");
  }

  this.text = '';
};


State.prototype.do_state = function (state) {
  // dump("doing: " + state + "\n");

  switch (state) {
  case 'document':
  case 'scene':
    // No-op
    break;
  case 'action':
  case 'character':
  case 'dialog':
  case 'heading':
  case 'paren':
  case 'shot':
  case 'transition':
  case 'text':
    // In Shakespeare, line breaks are important!
    this.text = this.text == '' ? this.input : this.text +
      (this.mode == ScriptImporter.MODE_STAGEPLAY ? "\n" : ' ') + this.input;
    break;
  default:
    dump("do_state: unknown state: " + state + "\n");
  }

};
