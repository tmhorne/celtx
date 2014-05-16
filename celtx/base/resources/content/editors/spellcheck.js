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

var dialog = {};

var enableSelectionChecking = true;


function loaded () {
  dialog.getEditor   = function () { return dialog.editor; };
  dialog.editor      = window.arguments[0];
  dialog.misspelled  = document.getElementById('mispelled-word');
  dialog.wordEdit    = document.getElementById('word-edit-field');
  dialog.suggestions = document.getElementById('suggestions-list');
  dialog.ignoreBtn   = document.getElementById('ignore-button');
  dialog.replaceBtn  = document.getElementById('replace-button');
  dialog.word        = '';
  dialog.lastWord    = '';
  dialog.locale      = '';
  dialog.canSelect   = false;

  try {
    window.addEventListener("keyup", function (aEvent) {
      const nsIDOMKeyEvent = Components.interfaces.nsIDOMKeyEvent;
      aEvent = aEvent.QueryInterface(nsIDOMKeyEvent);
      if (aEvent.keyCode == nsIDOMKeyEvent.DOM_VK_ESCAPE)
        window.close();
    }, false);
  }
  catch (ex) {
    dump("*** Failed to add keyup listener: " + ex + "\n");
  }

  try {
    var prefService = Components.classes['@mozilla.org/preferences-service;1']
      .getService(Components.interfaces.nsIPrefService);
    var prefBranch = prefService.getBranch('spellchecker.');
    try {
      dialog.locale = prefBranch.getCharPref('dictionary');
    }
    catch (ex) {
      dialog.locale = 'en-US';
      prefBranch.setCharPref('dictionary', dialog.locale);
    }
    dialog.checker = getEditorSpellCheck();
    // We don't need a text filter yet
    dialog.checker.setFilter(getTextServicesFilter());
    dialog.checker.InitSpellChecker(dialog.getEditor(), enableSelectionChecking);
    // dialog.checker = dialog.editor.inlineSpellChecker.spellChecker;

    // Populate the languages menu list
    var languages = getLanguages();
    if (!languages || languages.length < 1)
      // *** LOCALISE ME ***
      throw "No dictionaries installed!";

    var languageMenu = document.getElementById('languageMenu');
    var defaultToFirstItem = true;
    for (var i = 0; i < languages.length; i++) {
      if (languages[i][1] == dialog.locale) {
        languageMenu.selectedItem =
          languageMenu.appendItem(languages[i][0], languages[i][1]);
        defaultToFirstItem = false;
      }
      else
        languageMenu.appendItem(languages[i][0], languages[i][1]);
    }
    if (defaultToFirstItem)
      languageMenu.selectedIndex = 0;
    setTimeout(nextWord, 0);
  }
  catch (ex) {
    dump("spellchecker error: " + ex + "\n");
    alert(ex);
  }
}

// Produces an array of <name, locale> pairs corresponding
// to available dictionaries.
function getLanguages() {
  var dictionaries = {};
  var numDictionaries = {};
  try {
    dialog.checker.GetDictionaryList(dictionaries, numDictionaries);
  } catch (ex) {
    dump("*** getLanguages: GetDictionaryList failed: " + ex + "\n");
    return [];
  }
  dictionaries = dictionaries.value;
  numDictionaries = numDictionaries.value;

  // Retrieve language names
  var languageBundle = document.getElementById('languageBundle');
  var languages = [];
  for (var i = 0; i < dictionaries.length; i++) {
    try {
      var ab_cd = dictionaries[i];
      var splitArray = ab_cd.split(/_|-/);
      var langname = languageBundle.getString(splitArray[0].toLowerCase());
      if (splitArray.length > 1 && splitArray[1])
        langname += " (" + splitArray[1] + ")";
      languages[i] = [langname, ab_cd];
    } catch (ex) {
      dump("*** getLanguages: Couldn't find string for " + splitArray[0] + "\n");
      languages[i] = [ab_cd, ab_cd];
    }
  }
  return languages;
}


function changeDictionary() {
  try {
    dialog.locale = document.getElementById('languageMenu')
      .selectedItem.value;
    dialog.checker.SetCurrentDictionary(dialog.locale);
    updateSuggestions();
  } catch (ex) {
    dump(ex + "\n");
    alert(ex);
  }
}


function accepted () {
  try {
    var prefService = Components.classes['@mozilla.org/preferences-service;1']
      .getService(Components.interfaces.nsIPrefService);
    var prefBranch = prefService.getBranch('spellchecker.');
    prefBranch.setCharPref('dictionary', dialog.locale);
  } catch (ex) {
    dump("*** Couldn't save dictionary choice: " + ex + "\n");
  }
  return true;
}


function nextWord () {
  try {
    dialog.word = dialog.checker.GetNextMisspelledWord();
    // dump("word: " + dialog.word + "\n");
    dialog.misspelled.value = dialog.word; // TODO: maybe truncate/cleanup
    dialog.wordEdit.value   = dialog.word;
    dialog.lastWord         = dialog.word;

    updateSuggestions();
    updateCommands();

    if (dialog.word == '') {
      dialog.misspelled.value = gApp.getText('CheckSpellingDone');
    }
    
  }
  catch (ex) {
    dump("*** nextWord: " + ex + "\n");
  }
}


function updateSuggestions () {
  var list = dialog.suggestions;

  // Clear the current contents of the list
  dialog.canSelect = false;
  list.clearSelection();
  while (list.hasChildNodes()) list.removeChild(list.firstChild);

  if (dialog.word == '') {
    var blank = list.appendItem('', '');
    blank.disabled = true;
    return;
  }

  // Get suggested words until an empty string is returned
  var count = 0;
  var word = '';
  do {
    word = dialog.checker.GetSuggestedWord();
    if (word != '') {
      list.appendItem(word, '');
      count++;
    }
  } while (word != '');

  if (count == 0) {
    // No suggestions - show a message but don't let user select it
    var none = list.appendItem(gApp.getText('NoSuggestedWords'));
    none.disabled = true;
  }
  else {
    // Select the first item
    dialog.canSelect = true;
    list.selectedIndex = 0;  // causes selectSuggestion to be called
  }
}


function updateCommands () {
  if (dialog.word == '') {
    disableCommand('cmd-replace-word');
    disableCommand('cmd-replace-all');
    disableCommand('cmd-ignore-word');
    disableCommand('cmd-ignore-all');
    disableCommand('cmd-add-word');
  }
  else {
    enableCommand('cmd-replace-word');
    enableCommand('cmd-replace-all');
    enableCommand('cmd-ignore-word');
    enableCommand('cmd-ignore-all');
    enableCommand('cmd-add-word');
  }
}


function enableCommand (name) {
  var cmd = document.getElementById(name);
  if (cmd) cmd.removeAttribute('disabled');
}


function disableCommand (name) {
  var cmd = document.getElementById(name);
  if (cmd) cmd.setAttribute('disabled', true);
}


function unloaded () {
  if (dialog.checker) {
    try {
      dialog.checker.UninitSpellChecker();
    }
    catch (ex) { }
  }
}


function wordEditInput () {
  // TODO: maybe select matching word from list, if any?
}


function selectSuggestion () {
  if (! dialog.canSelect) return;

  if (dialog.suggestions.selectedItem) {
    var word = dialog.suggestions.selectedItem.label;
    dialog.wordEdit.value = word;
    dialog.lastWord = word;
  }
  else {
    dialog.wordEdit.value = dialog.lastWord;
  }

  updateCommands();
}


function suggestionDoubleClicked () {
  if (dialog.canSelect) replaceWord();
}


function replaceWord () {
  var word = dialog.wordEdit.value;
  if (dialog.word != word) {
    var ed = dialog.getEditor();
    ed.beginTransaction();
    try {
      dialog.checker.ReplaceWord(dialog.word, word, false);
    } catch (ex) {
      dump("replace word: " + ex + "\n");
    }
    ed.endTransaction();
  }

  nextWord();
}


function replaceAll () {
  // BUG: ReplaceWord with allOccurrences true was not properly
  // setting the context back to the first occurrence. As a
  // workaround, we do it manually with selection ranges.
  var word = dialog.wordEdit.value;
  if (dialog.word != word) {
    var ed = dialog.getEditor();
    var sel = ed.selection;
    sel.collapseToStart();
    var rng = sel.getRangeAt(0);
    ed.beginTransaction();
    try {
      dialog.checker.ReplaceWord(dialog.word, word, true);
    } catch (ex) {
      dump("replace word: " + ex + "\n");
    }
    sel = ed.selection;
    sel.removeAllRanges();
    sel.addRange(rng);
    sel.collapseToStart();
    ed.endTransaction();
  }

  nextWord();
}


function ignoreWord () {
  nextWord();
}


function ignoreAll () {
  if (dialog.word) {
    dialog.checker.IgnoreWordAllOccurrences(dialog.word);
  }
  nextWord();
}


function addWord () {
  if (dialog.word) {
    try {
      dialog.checker.AddWordToDictionary(dialog.word);
    } catch (ex) { dump(ex) }
  }
  nextWord();
}
