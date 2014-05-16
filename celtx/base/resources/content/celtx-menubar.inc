
<menubar id="main-menubar" statusbar="statusbar-display"
         style="border:0px;padding:0px;margin:0px;-moz-appearance:none">
    <menu id="file-menu"
          label="&fileMenu.label;"
          accesskey="&fileMenu.accesskey;">
      <menupopup id="menu_FilePopup"
                 onpopupshowing="goUpdateCommand('cmd-page-setup');
                                 goUpdateCommand('cmd-print');
                                 goUpdateCommand('cmd-print-preview');">
        <menuitem id="menu-new-project"
                  label="&newProjectCmd.label;"
                  key="key-new-project"
                  command="cmd-new-project"/>
        <menuitem id="menu-open-project"
                  label="&openProjectCmd.label;"
                  key="key-open-project"
                  command="cmd-open-project"/>
        <menu label="&openRecentCmd.label;">
          <menupopup id="menu-recent-projects">
            <menuseparator id="recent-projects-menusep"
                           collapsed="true"/>
          </menupopup>
        </menu>
        <menuitem id="menu-save-project"
                  label="&saveProjectCmd.label;"
                  key="key-save-project"
                  accel="&savePageCmd.commandkey;"
                  command="cmd-save-project"/>
        <menuitem id="menu-save-project-as"
                  label="&saveProjectAsCmd.label;"
                  key="key-save-project-as"
                  accel="&savePageCmd.accesskey;"
                  command="cmd-save-project-as"/>
        <menuitem id="menu-save-as-template"
                  label="&createTemplate.label;&ellipsis;"
                  command="cmd-save-project-template"/>
        <menuitem id="menu_close"
                  label="&closeCmd.label;"
                  key="key-close"
                  accesskey="&closeCmd.accesskey;"
                  command="cmd-close"/>
        <menuitem id="menu_closeWindow"
                  hidden="true"
                  command="cmd-close-window"
                  key="key-close-window"
                  label="&closeWindow.label;"/>
        <menuseparator/>
        <menuitem label="&openFromStudio.label;&ellipsis;"
                  command="cmd-open-studio"/>
        <menuitem label="&saveToStudio.label;&ellipsis;"
                  oncommand="cmdSaveProjectToServer();"/>
        <menuseparator/>
        <menuitem id="menu-add-item"
                  label="&addItem.label;"
                  disabled="true"
                  command="cmd-add-document"/>
        <menuitem id="menu-add-folder"
                  label="&addFolder.label;"
                  disabled="true"
                  command="cmd-add-folder"/>
        <menuitem id="menu-delete-item"
                  label="&deleteItem.label;"
                  disabled="true"
                  command="cmd-remove-document"/>
        <menuseparator/>
        <menuitem label="&printSetupCmd.label;"
                  accesskey="&printSetupCmd.accesskey;"
                  command="cmd-page-setup"/>
#ifndef XP_MACOSX
        <menuitem label="&printPreviewCmd.label;"
                  accesskey="&printPreviewCmd.accesskey;"
                  command="cmd-print-preview"/>
#endif
        <menuitem label="&printCmd.label;"
                  accesskey="&printCmd.accesskey;"
                  key="key-print"
                  command="cmd-print"/>
        <menuseparator/>
        <menuitem id="menu-reveal-project"
                  label="&showProjectFileCmd.label;"
                  disabled="true"
                  command="cmd-reveal-project"/>
#ifndef XP_MACOSX
        <menuseparator/>
#endif
        <menuitem id="menu_FileQuitItem" 
#ifdef XP_WIN
                  label="&quitApplicationCmdWin.label;"
                  accesskey="&quitApplicationCmdWin.accesskey;"
#else
                  label="&quitApplicationCmd.label;"
                  accesskey="&quitApplicationCmd.accesskey;"
#ifdef XP_MACOSX
                  key="key_quitApplication"
#endif
#endif
                  command="cmd-quit"/>
      </menupopup>
    </menu>

    <menu id="edit-menu"
          label="&editMenu.label;"
          accesskey="&editMenu.accesskey;">
      <menupopup id="menu_EditPopup">
        <menuitem label="&undoCmd.label;"
                  key="key_undo"
                  accesskey="&undoCmd.accesskey;"
                  command="cmd_undo"/>
        <menuitem label="&redoCmd.label;"
                  key="key_redo"
                  accesskey="&redoCmd.accesskey;"
                  command="cmd_redo"/>
        <menuseparator/>
        <menuitem label="&cutCmd.label;"
                  key="key_cut"
                  accesskey="&cutCmd.accesskey;"
                  command="cmd_cut"/>
        <menuitem label="&copyCmd.label;"
                  key="key_copy"
                  accesskey="&copyCmd.accesskey;"
                  command="cmd_copy"/>
        <menuitem label="&pasteCmd.label;"
                  key="key_paste"
                  accesskey="&pasteCmd.accesskey;"
                  command="cmd_paste"/>
        <menuseparator/>
        <menuitem label="&selectAllCmd.label;"
                  key="key_selectAll"
                  accesskey="&selectAllCmd.accesskey;"
                  command="cmd_selectAll"/>
        <menuseparator/>
        <menuitem label="&findCmd.label;"
                  accesskey="&findCmd.accesskey;"
                  key="key_find"
                  command="cmd-find"/>
        <menuitem label="&replaceCmd.label;"
                  command="cmd-replace"/>
        <menuitem label="&findAgainCmd.label;"
                  accesskey="&findAgainCmd.accesskey;"
                  key="key_findAgain"
                  command="cmd-find-again"/>
        <menuitem label="&findPreviousCmd.label;"
                  key="key_findPrevious"
                  command="cmd-find-previous"/>
#ifdef XP_UNIX
#ifndef XP_MACOSX
        <menuseparator/>
        <menuitem id="menu_preferences"
                  label="&preferencesCmdUnix.label;"
                  accesskey="&preferencesCmdUnix.accesskey;"
                  oncommand="openPreferences();"/>
#endif
#endif
#ifdef XP_MACOSX
        <menuitem id="menu_preferences"
                  label="&preferencesCmdMac.label;"
                  key="key_preferencesCmdMac"
                  oncommand="openPreferences();"/>
        <menuitem id="menu_mac_services"
                  label="&servicesMenuMac.label;"/>
        <menuitem id="menu_mac_hide_app"
                  label="&hideThisAppCmdMac.label;"
                  key="key_hideThisAppCmdMac"/>
        <menuitem id="menu_mac_hide_others"
                  label="&hideOtherAppsCmdMac.label;"
                  key="key_hideOtherAppsCmdMac"/>
        <menuitem id="menu_mac_show_all"
                  label="&showAllAppsCmdMac.label;"/>
#endif
      </menupopup>
    </menu>

    <menu id="view-menu"
          label="&viewMenu.label;"
          accesskey="&viewMenu.accesskey;">
      <menupopup id="menu_viewPopup">
        <menu id="viewToolbarsMenu"
              label="&viewToolbarsMenu.label;"
              accesskey="&viewToolbarsMenu.accesskey;">
          <menupopup>
            <menuitem id="menu-toolbarmode-both"
                      label="&iconsAndText.label;"
                      value="both"
                      type="radio"
                      name="celtx:toolbarmode"
                      oncommand="gApp.setToolbarMode(this.value)"/>
            <menuitem id="menu-toolbarmode-icons"
                      label="&icons.label;"
                      value="icons"
                      type="radio"
                      name="celtx:toolbarmode"
                      oncommand="gApp.setToolbarMode(this.value)"/>
            <menuitem id="menu-toolbarmode-text"
                      label="&text.label;"
                      value="text"
                      type="radio"
                      name="celtx:toolbarmode"
                      oncommand="gApp.setToolbarMode(this.value)"/>
            <menuitem id="menu-toolbarmode-none"
                      label="&none.label;"
                      value="none"
                      type="radio"
                      name="celtx:toolbarmode"
                      oncommand="gApp.setToolbarMode(this.value)"/>
          </menupopup>
        </menu>
      </menupopup>
    </menu>

<!-- FIXME: On Leopard, this menu label isn't updated, so we're statically
            setting it to Script, since that's the only editor with its
            own menu. Set label back to "dontseeme" once the Leopard issue
            is resolved. -->
    <menu id="tool-specific-menu"
          label="&script.label;"
          hidden="true"/>

    <menu id="tools-menu"
          label="&toolsMenu.label;"
          accesskey="&toolsMenu.accesskey;">
      <menupopup id="menu_ToolsPopup">
        <menuitem id="spell-check-menu"
                  label="&spellCheckCmd.label;"
                  command="cmd-check-spelling"/>
        <menuitem id="toggle-inline-spellcheck-menu"
                  label="&inlineSpellCheckCmd.label;"
                  type="checkbox"
                  command="cmd-toggle-inline-spelling"/>
#ifdef MOZ_DEBUG
        <menuitem id="javascriptConsole" 
                  label="Javascript Console" 
                  oncommand="openJavaScriptConsole();"/>
        <menuitem id="inspectorMenuitem"
                  label="DOM Inspector"
                  oncommand="inspectDOMDocument();"/>
        <menuitem id="venkmanMenuItem"
                  label="JS Debugger"
                  oncommand="openJSDebugger();"/>
        <menuitem label="Celtx Debug Tools"
                  oncommand="openDebugWindow();"/>
#endif
        <menuitem label="&toolbox.label;"
                  oncommand="openExtensionsManager();"/>
#ifndef XP_UNIX
        <menuseparator id="prefSep"/>
        <menuitem id="menu_preferences"
                  label="&preferencesCmd.label;"
                  accesskey="&preferencesCmd.accesskey;"
                  oncommand="openPreferences();"/>
#endif
      </menupopup>
    </menu>

#ifdef XP_MACOSX
    <menu id="windowMenu"
          label="&windowMenu.label;"
          datasources="rdf:window-mediator" ref="NC:WindowMediatorRoot"
          onpopupshowing="checkFocusedWindow();"
          hidden="false">
        <template>
        <rule>
            <menupopup>
                <menuitem uri="rdf:*"
                          label="rdf:http://home.netscape.com/NC-rdf#Name"
                          type="radio"
                          name="windowList"
                          oncommand="ShowWindowFromResource(event.target)"/>
            </menupopup>
        </rule>
        </template>
        <menupopup id="windowPopup">
            <menuitem command="minimizeWindow" key="key_minimizeWindow"/>
            <menuitem command="zoomWindow"/>
            <!-- decomment when "BringAllToFront" is implemented
                <menuseparator/>
                <menuitem label="&bringAllToFront.label;" disabled="true"/> -->
            <menuseparator/>
            <menuitem label="&splashScreen.label;"
                      oncommand="showSplashWindow();"/>
            <menuseparator id="sep-window-list"/>
        </menupopup>
    </menu>
#endif

#ifdef XP_WIN
    <menu id="helpMenu"
          label="&helpMenuWin.label;"
          accesskey="&helpMenuWin.accesskey;">
#else
    <menu id="helpMenu"
          label="&helpMenu.label;"
          accesskey="&helpMenu.accesskey;">
#endif
      <menupopup id="menu_HelpPopup">
        <menuitem id="aboutName"
                  accesskey="&aboutCmd.accesskey;"
                  label="&aboutCmd.label;"
#ifdef XP_MACOSX
                  hidden="true"
#endif
                  command="cmd-about-celtx"/>
#ifndef XP_MACOSX
        <menuseparator/>
        <menuitem label="&splashScreen.label;"
                  oncommand="showSplashWindow();"/>
#endif
        <menuitem label="&helpSupportCmd.label;"
                  accesskey="&helpSupportCmd.accessKey;"
                  command="cmd-help-support"/>
        <menuitem label="&helpReportBugCmd.label;"
                  accesskey="&helpReportBugCmd.accessKey;"
                  command="cmd-help-report-bug"/>
      </menupopup>
    </menu>
</menubar>
