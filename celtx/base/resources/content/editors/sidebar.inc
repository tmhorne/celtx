<vbox id="sidebar">
  <hbox class="plaintabbar">
    <tabs id="sidebartabs"
          class="tabs-top"
          flex="1">
      <tab id="sidebarnotestab"
           class="nolabeltab"
           image="chrome://celtx/skin/sidebar/notes.png"
           tooltiptext="&notes.label;"
           value="sidebarnotes" />
      <tab id="sidebarmediatab"
           class="nolabeltab"
           image="chrome://celtx/skin/sidebar/media.png"
           tooltiptext="&media.label;"
           value="sidebarmedia" />
      <tab id="sidebarbreakdowntab"
           class="nolabeltab"
           image="chrome://celtx/skin/sidebar/breakdown.png"
           tooltiptext="&breakdown.label;"
           value="sidebaritems" />
    </tabs>
  </hbox>

  <separator class="thin"/>

  <hbox id="sidebarcontextheader" class="panelheader" align="center">
    <label id="sidebarcontextlabel"
           flex="1"
           style="font-size: 9pt;"
           crop="end"/>
  </hbox>

  <deck id="sidebardeck"
        flex="1">

    <!-- Notes Sidebar -->
    <vbox id="sidebarnotes"
          flex="1">
      <toolbar id="notesToolbar">
        <toolbarbutton id="notesAddButton"
                       class="library-toolbar-button
                              library-add-button"
                       orient="horizontal"
                       label="&addNote.label;" />
        <toolbarseparator />
        <toolbarbutton id="notesColourButton"
                       image="chrome://celtx/skin/colourpicker.png"
                       orient="horizontal"
                       type="menu">
          <menupopup id="notesColourPopup">
            <colorpicker id="notesColourPicker"
                         allowevents="true" />
          </menupopup>
        </toolbarbutton>
      </toolbar>
      <richlistbox id="noteslist"
                   flex="1" />
    </vbox>

    <!-- Media Sidebar -->
    <vbox id="sidebarmedia"
          flex="1">
      <toolbar class="celtxtoolbar">
        <toolbarbutton id="mediaAddButton"
                       class="library-toolbar-button
                              library-add-button"
                       tooltiptext="&addItem.label;" />
        <toolbarbutton id="mediaRemoveButton"
                       class="library-toolbar-button
                              library-remove-button"
                       tooltiptext="&deleteItem.label;" />
        <toolbarseparator />
        <toolbaritem align="center"
                     flex="1">
          <textbox id="mediaGISTextbox"
                   flex="1" />
        </toolbaritem>
        <toolbarbutton id="mediaGISButton" />
      </toolbar>
      <mediaview id="medialist"
                 flex="1" />
    </vbox>

    <!-- Breakdown Sidebar -->
    <vbox id="sidebaritems"
          flex="1">
      <toolbar id="sidebartoolbar"
               hidden="true">
        <toolbarbutton id="breakdownToggleAddButton"
                       orient="horizontal"
                       label="&addItemCmd.label;"
                       image="chrome://celtx/skin/arrow_down.gif" />
      </toolbar>
      <groupbox id="breakdownAddItemBox"
                flex="1">
        <listbox id="breakdownDeptList"
                 flex="1"
                 rows="5"
                 datasources="chrome://celtx/content/schema.rdf"
                 ref="chrome://celtx/content/schema.rdf#default-markup">
          <template>
            <rule>
              <conditions>
                <content uri="?uri" />
                <member container="?uri"
                        child="?category" />
                <triple subject="?category"
                        predicate="&ns_rdfs;label"
                        object="?title" />
                <!-- This lets us omit Scene Details from the list
                     since it has no cx:element -->
                <triple subject="?category"
                        predicate="&ns_cx;element"
                        object="?element" />
              </conditions>
              <action>
                <listitem uri="?category"
                          label="?title"
                          value="?category" />
              </action>
            </rule>
          </template>
        </listbox>
        <menulist id="breakdownNameBox"
                  editable="true">
          <menupopup id="breakdownItemPopup"
                     datasources="rdf:null"
                     ref=""
                     sortDirection="ascending"
                     sortResource="?title">
            <template>
              <rule>
                <conditions>
                  <content uri="?uri" />
                  <triple subject="?item"
                          predicate="&ns_rdf;type"
                          object="?uri" />
                  <triple subject="?item"
                          predicate="&ns_dc;title"
                          object="?title" />
                </conditions>
                <action>
                  <menuitem uri="?item"
                            label="?title"
                            value="?item" />
                </action>
              </rule>
            </template>
          </menupopup>
        </menulist>
        <hbox>
          <button id="breakdownRemoveMarkupButton"
                  label="&remove.label;"
                  disabled="true" />
          <spacer flex="1" />
          <button id="breakdownAddItemButton"
                  label="&add.label;"
                  default="true" />
        </hbox>
      </groupbox>
      <splitter collapse="after">
        <grippy />
      </splitter>
      <vbox flex="2">
      <tree id="breakdownItemTree"
            flex="1"
            hidecolumnpicker="true"
            context="_child"
            ref=""
            datasources="rdf:local-store chrome://celtx/content/schema.rdf">
        <menupopup>
          <menuitem id="breakdownOpenItem"
                    label="&open.label;" />
          <menuitem id="breakdownRenameItem"
                    label="&renameItem.label;" />
          <menuseparator />
          <menuitem id="breakdownRemoveItem"
                    label="&remove.label;" />
        </menupopup>
        <treecols>
          <treecol id="breakdownTitleCol"
                   label="&name.label;"
                   primary="true"
                   sort="?title"
                   sortDirection="ascending"
                   sortActive="true"
                   flex="1" />
        </treecols>
        <template>
          <rule>
            <conditions>
              <content uri="?uri" />
              <member container="?uri"
                      child="?item" />
              <triple subject="?item"
                      predicate="&ns_cx;department"
                      object="?dept" />
              <triple subject="?dept"
                      predicate="&ns_rdfs;label"
                      object="?title" />
            </conditions>
            <bindings>
              <binding subject="?item"
                       predicate="&ns_cx;size"
                       object="?size" />
              <binding subject="?dept"
                       predicate="&ns_cx;open"
                       object="?open" />
            </bindings>
            <action>
              <treechildren>
                <treeitem uri="?item" open="?open">
                  <treerow>
                    <treecell label="?title (?size^)" />
                  </treerow>
                  <treechildren />
                </treeitem>
              </treechildren>
            </action>
          </rule>
          <rule>
            <conditions>
              <content uri="?uri" />
              <member container="?uri"
                      child="?item" />
              <triple subject="?item"
                      predicate="&ns_dc;title"
                      object="?title" />
            </conditions>
            <action>
              <treechildren>
                <treeitem uri="?item">
                  <treerow>
                    <treecell label="?title" />
                  </treerow>
                  <treechildren/>
                </treeitem>
              </treechildren>
            </action>
          </rule>
        </template>
      </tree>
      </vbox>
    </vbox>

  </deck>
</vbox>
