
  <broadcaster id="toolbar-broadcaster" mode="none"/>

  <commandset id="fileCommandSet">
    <command id="cmd-new-project"
             oncommand="goDoCommand('cmd-new-project')"/>
    <command id="cmd-download-project"
             oncommand="goDoCommand('cmd-download-project')"/>
    <command id="cmd-open-project"
             oncommand="goDoCommand('cmd-open-project')"/>
    <command id="cmd-open-studio"
             oncommand="goDoCommand('cmd-open-studio')"/>
    <command id="cmd-open-pc"
             oncommand="goDoCommand('cmd-open-pc')"/>
    <command id="cmd-copy-project"
             disabled="true"
             oncommand="goDoCommand('cmd-copy-project')"/>
    <command id="cmd-save-project"
             disabled="true"
             oncommand="goDoCommand('cmd-save-project')"/>
    <command id="cmd-save-project-as"
             disabled="true"
             oncommand="goDoCommand('cmd-save-project-as')"/>
    <command id="cmd-save-project-template"
             disabled="true"
             oncommand="goDoCommand('cmd-save-project-template')"/>
    <command id="cmd-close"
             oncommand="goDoCommand('cmd-close')"/>
    <command id="cmd-close-window"
             oncommand="goDoCommand('cmd-close-window')"/>
    <command id="cmd-page-setup"
             disabled="true"
             oncommand="goDoCommand('cmd-page-setup');"/>
    <command id="cmd-print-preview"
             disabled="true"
             oncommand="goDoCommand('cmd-print-preview')"/>
    <command id="cmd-print"
             disabled="true"
             oncommand="goDoCommand('cmd-print')"/>
    <command id="cmd-quit"
             oncommand="goQuitApplication()"/>
  </commandset>

  <keyset id="fileMenuKeyset">
    <key id="key-new-project"
         key="&newNavigatorCmd.key;"
         command="cmd-new-project"
         modifiers="accel"/>
    <key id="key-open-project"
         key="&openFileCmd.commandkey;"
         command="cmd-open-project"
         modifiers="accel"/>
    <key id="key-save-project-as"
         key="&savePageCmd.commandkey;"
         command="cmd-save-project-as"
         modifiers="accel,shift"/>
    <key id="key-save-project"
         key="&savePageCmd.commandkey;"
         command="cmd-save-project"
         modifiers="accel"/>
    <key id="key-close"
         key="&closeCmd.key;"
         command="cmd-close"
         modifiers="accel"/>
    <key id="key-close-window"
         key="&closeCmd.key;"
         command="cmd-close-window"
         modifiers="accel,shift"/>
    <key id="key-print"
         key="&printCmd.commandkey;"
         command="cmd-print"
         modifiers="accel"/>
#ifdef XP_UNIX
    <key id="key_quitApplication"
          key="&quitApplicationCmdMac.key;"
          command="cmd-quit"
          modifiers="accel"/>
#endif
  </keyset>

  <commandset id="globalEditCommandSet"
              commandupdater="true"
              events="focus"
              oncommandupdate="goUpdateGlobalEditMenuItems()"/>
  <commandset id="selectEditCommandSet"
              commandupdater="true"
              events="select"
              oncommandupdate="goUpdateSelectEditMenuItems()"/>
  <commandset id="undoEditCommandSet"
              commandupdater="true"
              events="undo"
              oncommandupdate="goUpdateUndoEditMenuItems()"/>
  <commandset id="pasteCommandSet"
              commandupdater="true"
              events="clipboard"
              oncommandupdate="goUpdatePasteMenuItems()"/>

  <commandset id="editCommandSet">
    <command id="cmd_undo" 
             oncommand="goDoCommand('cmd_undo')"
             disabled="true"/>
    <command id="cmd_redo" 
             oncommand="goDoCommand('cmd_redo')"
             disabled="true"/>
    <command id="cmd_cut" 
             oncommand="goDoCommand('cmd_cut')"
             disabled="true"/>
    <command id="cmd_copy" 
             oncommand="goDoCommand('cmd_copy')"
             disabled="true"/>
    <command id="cmd_paste" 
             oncommand="goDoCommand('cmd_paste')"
             disabled="true"/>
    <command id="cmd_delete"
             oncommand="goDoCommand('cmd_delete')"
             valueDefault="&deleteCmd.label;"
             disabled="true"/>
    <command id="cmd_selectAll"
             oncommand="goDoCommand('cmd_selectAll')"
             disabled="true"/>
    <command id="cmd-find"
             disabled="true"
             oncommand="goDoCommand('cmd-find')"/>
    <command id="cmd-replace"
             disabled="true"
             oncommand="goDoCommand('cmd-replace')"/>
    <command id="cmd-find-again"
             disabled="true"
             oncommand="goDoCommand('cmd-find-again')"/>
    <command id="cmd-find-previous"
             disabled="true"
             oncommand="goDoCommand('cmd-find-previous')"/>
  </commandset>

  <keyset id="editMenuKeySet">
    <key id="key_undo"
         key="&undoCmd.key;"
         modifiers="accel"/>
#ifdef XP_UNIX
    <key id="key_redo"
         key="&undoCmd.key;"
         modifiers="accel,shift"/>
#else
    <key id="key_redo"
         key="&redoCmd.key;"
         modifiers="accel"/>
#endif
    <key id="key_cut"
         key="&cutCmd.key;"
         modifiers="accel"/>
    <key id="key_copy"
         key="&copyCmd.key;"
         modifiers="accel"/>
    <key id="key_paste"
         key="&pasteCmd.key;"
         modifiers="accel"/>
    <key id="key_delete"
         keycode="VK_DELETE"
         command="cmd_delete"/>
    <key id="key_selectAll"
         key="&selectAllCmd.key;"
         modifiers="accel"/>
    <key id="key_find"
         key="&findOnCmd.commandkey;"
         command="cmd-find"
         modifiers="accel"/>
    <key id="key_findAgain"
         key="&findAgainCmd.commandkey;"
         command="cmd-find-again"
         modifiers="accel"/>
    <key id="key_findPrevious"
         key="&findAgainCmd.commandkey;"
         command="cmd-find-previous"
         modifiers="accel,shift"/>
    <key keycode="&findAgainCmd.commandkey2;"
         command="cmd-find-again"/>
    <key keycode="&findAgainCmd.commandkey2;"
         command="cmd-find-previous"
         modifiers="shift"/>
  </keyset>

  <commandset id="toolsCommandSet">
    <command id="cmd-check-spelling"
             oncommand="goDoCommand('cmd-check-spelling')"
             disabled="true"/>
    <command id="cmd-toggle-inline-spelling"
             oncommand="goDoCommand('cmd-toggle-inline-spelling')"
             disabled="true"/>
  </commandset>

  <commandset id="helpCommandSet">
    <command id="cmd-about-celtx"
             oncommand="goDoCommand('cmd-about-celtx')"/>
    <command id="cmd-help-support"
             oncommand="goDoCommand('cmd-help-support')"/>
    <command id="cmd-celtx-wiki"
             oncommand="goDoCommand('cmd-celtx-wiki')"/>
    <command id="cmd-video-tutorial"
             oncommand="goDoCommand('cmd-video-tutorial')"/>
    <command id="cmd-help-report-bug"
             oncommand="goDoCommand('cmd-help-report-bug')"/>
  </commandset>


  <keyset id="baseMenuKeyset">
#ifdef XP_MACOSX
    <key id="key_openHelpMacFrontend"
         oncommand="openHelpLink('firefox-help');"
         key="&openHelpMac.frontendCommandkey;"
         modifiers="&openHelpMac.frontendModifiers;"/>
<!-- These are used to build the Application menu under Cocoa widgets -->
    <key id="key_preferencesCmdMac"
         key="&preferencesCmdMac.commandkey;"
         modifiers="&preferencesCmdMac.modifiers;"/>
    <key id="key_hideThisAppCmdMac"
         key="&hideThisAppCmdMac.commandkey;"
         modifiers="&hideThisAppCmdMac.modifiers;"/>
    <key id="key_hideOtherAppsCmdMac"
         key="&hideOtherAppsCmdMac.commandkey;"
         modifiers="&hideOtherAppsCmdMac.modifiers;"/>
#else
    <key id="key_openHelp"
         oncommand="openHelpLink('firefox-help');"
         keycode="&openHelp.commandkey;"/>
#endif
  </keyset>

#ifdef XP_MACOSX
  <commandset id="windowMenuCommandSet">
    <command id="minimizeWindow"
             label="&minimizeWindow.label;"
             oncommand="window.minimize();" />
    <command id="zoomWindow"
             label="&zoomWindow.label;"
             oncommand="zoomWindow();" />
  </commandset>
  <keyset id="windowMenuKeyset">
    <key id="key_minimizeWindow"
         command="minimizeWindow"
         key="&minimizeWindow.key;"
         modifiers="accel"/>
  </keyset>
#endif
