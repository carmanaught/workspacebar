/* WorkspaceBar Extension
 * author: Mark Bokil
 * 9/16/12
 * forked and extended by carmanaught including code from null4bl3
 * version 1.0.1
 * credit: gcampax for some code from Workspace Indicator and Auto Move Windows,
 *   null4bl3 for some empty workspace detection
 */

const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Main = imports.ui.main;
const Util = imports.misc.util;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Gettext = imports.gettext.domain('markbokil.com-extensions');
const _ = Gettext.gettext;
const _N = function(x) { return x; }

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Keys = Me.imports.keys;

const DEBUG = false;
const prefsDialog = 'gnome-shell-extension-prefs workspace-bar@markbokil.com';

const WORKSPACE_SCHEMA = 'org.gnome.desktop.wm.preferences';
const WORKSPACE_KEY = 'workspace-names';

function init(extensionMeta) {
    return new WorkspaceBar(extensionMeta);
}

function WorkspaceBar(extensionMeta) {
    this.init(extensionMeta);
}

function debug(str) {
    if (DEBUG) {
        str = "[ WorkspaceBar ]--------> " + str;
        global.log(str);
    }
}

WorkspaceBar.prototype = {

    init: function(extensionMeta) {
        this.extensionMeta = extensionMeta;
        this._settings = Convenience.getSettings();
        // The following init lines were copied from Auto Move Windows extension to
        //  attach a window creation handler, to update the buttons when new windows
        //  are created (even when created on another unfocused workspace)
        this._windowTracker = Shell.WindowTracker.get_default();

        let display = global.screen.get_display();
        // Connect after so the handler from ShellWindowTracker has already run
        this._windowCreatedId = display.connect_after('window-created', Lang.bind(this, this._buildWorkSpaceBtns));
    },

    enable: function() {
        this._windowTracker = Shell.WindowTracker.get_default();
        let display = global.screen.get_display();
        
        // Set signals to get changes when made to preferences
        this._settingsSignals = [];
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.panelPos, Lang.bind(this, this._setPosition)));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.panelPosChange, Lang.bind(this, this._SetPositionChange)));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.panelPosIndex, Lang.bind(this, this._SetPositionChange)));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.overviewMode, Lang.bind(this, function(w) {
            this.overViewMode = this._settings.get_boolean(Keys.overviewMode);
        })));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.wrapAroundMode, Lang.bind(this, function(w) {
            this.wraparoundMode = this._settings.get_boolean(Keys.wrapAroundMode);
        })));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.emptyWorkStyle, Lang.bind(this, this._setWorkspaceStyle)));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.urgentWorkStyle, Lang.bind(this, this._setWorkspaceStyle)));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.prefsMouseBtn, Lang.bind(this, function(w) {
            this.btnMouseBtn = this._settings.get_int(Keys.prefsMouseBtn);
        })));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.labelFormat, Lang.bind(this, this._setWorkspaceFormat)));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.labelSeparator, Lang.bind(this, this._setWorkspaceFormat)));
        
        // Detect workspace name changes and update buttons accordingly
        this._wkspNameSettings = new Gio.Settings({ schema_id: WORKSPACE_SCHEMA });
        this._settingsSignals.push(this._wkspNameSettings.connect('changed::' + WORKSPACE_KEY, Lang.bind(this, this._buildWorkSpaceBtns)));
         
        
        // Get settings
        this.boxPosition = this._settings.get_string(Keys.panelPos);
        this.boxIndexChange = this._settings.get_boolean(Keys.panelPosChange);
        this.boxIndex = this._settings.get_int(Keys.panelPosIndex);
        this.overViewMode = this._settings.get_boolean(Keys.overviewMode);
        this.wraparoundMode = this._settings.get_boolean(Keys.wrapAroundMode);
        this.emptyWorkspaceStyle = this._settings.get_boolean(Keys.emptyWorkStyle);
        this.urgentWorkspaceStyle = this._settings.get_boolean(Keys.urgentWorkStyle);
        this.btnMouseBtn = this._settings.get_int(Keys.prefsMouseBtn);
        this.wkspLabelFormat = this._settings.get_string(Keys.labelFormat);
        this.wkspLabelSeparator = this._settings.get_string(Keys.labelSeparator);
        
        this.boxMain = new St.BoxLayout();
        this.boxMain.add_style_class_name("panelBox");
        this.buttonBox = new St.Button();
        this.buttonBox.connect('enter-event', Lang.bind(this, this._showOverview));
        this.buttonBox.add_actor(this.boxMain);
        this.currentWorkSpace = this._getCurrentWorkSpace();
        
        // Add box to panel
        let box = Main.panel["_" + this.boxPosition + "Box"];
        if (this.boxIndexChange) {
            box.insert_child_at_index(this.buttonBox, this.boxIndex);
        } else {
            box.insert_child_at_index(this.buttonBox, 0); // We'll use 0 as the default position
        }

        this._screenSignals = [];
        this._screenSignals.push(global.screen.connect('window-left-monitor', Lang.bind(this, this._buildWorkSpaceBtns)));
        this._screenSignals.push(global.screen.connect_after('workspace-removed', Lang.bind(this, this._buildWorkSpaceBtns)));
        this._screenSignals.push(global.screen.connect_after('workspace-added', Lang.bind(this, this._buildWorkSpaceBtns)));
        this._screenSignals.push(global.screen.connect_after('workspace-switched', Lang.bind(this, this._buildWorkSpaceBtns)));
        // Connect after we've got display (let display above) to ensure we can get the signal
        //   on 'MetaScreen' and avoid errors
        this._screenSignals.push(display.connect_after('window-demands-attention', Lang.bind(this, this._buildWorkSpaceBtns)));
        this._screenSignals.push(display.connect_after('window-marked-urgent', Lang.bind(this, this._buildWorkSpaceBtns)));
        
        this._buildWorkSpaceBtns();
    },

    disable: function() {
        let box = Main.panel["_" + this.boxPosition + "Box"];
        box.remove_actor(this.buttonBox);
        this.buttonBox = null;

        // Disconnect screen signals
        for (let x = 0; x < this._screenSignals.length; x++) {
            global.screen.disconnect(this._screenSignals[x]);
        }
        this._screenSignals = [];
        this._screenSignals = null;

        // Disconnect settings bindings
        for (let x = 0; x < this._settingsSignals.length; x++) {
            global.screen.disconnect(this._settingsSignals[x]);
        }
        this._settingsSignals = [];
        this._settingsSignals = null;
        
        // Copied from Auto Move Windows extension
        if (this._windowCreatedId) {
            global.screen.get_display().disconnect(this._windowCreatedId);
            this._windowCreatedId = 0;
        }
    },

    _doPrefsDialog: function() {
        Main.Util.trySpawnCommandLine(prefsDialog);
    },
    
    _setWorkspaceStyle: function() {
        this.emptyWorkspaceStyle = this._settings.get_boolean(Keys.emptyWorkStyle);
        this.urgentWorkspaceStyle = this._settings.get_boolean(Keys.urgentWorkStyle);
        this._buildWorkSpaceBtns();
    },
    
    _setWorkspaceFormat: function() {
        this.wkspLabelFormat = this._settings.get_string(Keys.labelFormat);
        this.wkspLabelSeparator = this._settings.get_string(Keys.labelSeparator);
        this._buildWorkSpaceBtns();
    },
    
    _showOverview: function() {
        if (this.overViewMode) {
            if (!Main.overview.visible) {
                Main.overview.show();
            }
        }
    },

    _setPosition: function() {
        let oldPosition = this.boxPosition;
        this.boxPosition = this._settings.get_string(Keys.panelPos);

        // Remove box
        let box = Main.panel["_" + oldPosition + "Box"];
        box.remove_actor(this.buttonBox);

        // Add box
        box = Main.panel["_" + this.boxPosition + "Box"];
        if (this.boxIndexChange) {
            box.insert_child_at_index(this.buttonBox, this.boxIndex);
        } else {
            box.insert_child_at_index(this.buttonBox, 0);
        }
    },
    
    _SetPositionChange: function() {
        this.boxIndexChange = this._settings.get_boolean(Keys.panelPosChange);
        this.boxIndex = this._settings.get_int(Keys.panelPosIndex);
        
        this._setPosition();
    },
    
    _getCurrentWorkSpace: function() {
        return global.screen.get_active_workspace().index();
    },

    _buildWorkSpaceBtns: function() {
        this._removeAllChildren(this.boxMain); //clear box container
        this.currentWorkSpace = this._getCurrentWorkSpace();
        this.buttons = []; //truncate arrays to release memory
        this.labels = [];
        let emptyWorkspaces = [];
        let urgentWorkspaces = [];
        let workSpaces = global.screen.n_workspaces - 1;
        let str = '';
        let labelText = '';
        let windows = '';
        // GETS ALL EXISTING WINDOWS
        windows = global.get_window_actors();
        for (let i = 0; i < windows.length; i++) {
            let winActor = windows[i];
            let win = winActor.meta_window;
            // Is .is_skip_taskbar() also relevant here?
            if (win.is_on_all_workspaces()) { continue; }
            let workspaceIndex = win.get_workspace().index();
            if (win.urgent || win.demands_attention) {
                if (this.urgentWorkspaceStyle) {
                    urgentWorkspaces[workspaceIndex] = "urgent";
                } else {
                    urgentWorkspaces[workspaceIndex] = "not-urgent";
                }
            }
            emptyWorkspaces[workspaceIndex] = workspaceIndex;
        }
        
        // Check for and identify actual empty workspaces
        for (let i = 0; i <= workSpaces; i++) {
            if (this.emptyWorkspaceStyle) {
                if (emptyWorkspaces[i] == undefined) {
                    emptyWorkspaces[i] = "empty";
                } else {
                    emptyWorkspaces[i] = "not-empty";
                }
            }
        }

        for (let x = 0; x <= workSpaces; x++) {
            let emptyName = false;
            // Get the workspace name for the workspace
            let labelText = Meta.prefs_get_workspace_name(x);

            // Check that workspace has label (returns "Workspace <Num>" if not),
            //  which also explicitly blocks use of the word "Workspace" in a label.
            if (labelText.indexOf("Workspace") == -1) {
                emptyName = true;
            }
            
            switch (this.wkspLabelFormat) {
                case "Number Only":
                    str = (x + 1).toString();
                    break;
                case "Number and Name":
                    str = (x + 1) + this.wkspLabelSeparator + labelText;
                    break;
                case "Name Only":
                    str = labelText;
                    break;
                default:
                    str = (x + 1).toString();
            }
            
            /*
            if (labelText.indexOf("Workspace") == -1) {
                str = (x + 1) + this.wkspLabelSeparator + labelText;
            } else {
                str = (x + 1).toString();
            }*/

            // Can't use true/false for indicators since it conflicts with workspace numbers
            //   equating to false (0) or true (1), so specific strings are used and checked.
            if (x == this.currentWorkSpace) {
                this.labels[x] = new St.Label({ text: _(str), style_class: "activeBtn" });
            } else if (x != this.currentWorkSpace && urgentWorkspaces[x] == "urgent") {
                this.labels[x] = new St.Label({ text: _(str), style_class: "urgentBtn" });
            } else if (x != this.currentWorkSpace && emptyWorkspaces[x] == "empty") {
                this.labels[x] = new St.Label({ text: _(str), style_class: "emptyBtn" });
            } else if (!emptyWorkspaces[x] || x != this.currentWorkSpace) {
                this.labels[x] = new St.Label({ text: _(str), style_class: "inactiveBtn" });
            }
            this.buttons[x] = new St.Button(); //{style_class: "panel-button"}
            this.buttons[x].set_child(this.labels[x]);
            // Attach workspace number to .workspaceId property
            this.buttons[x].workspaceId = x;
            this.buttons[x].connect('button-press-event', Lang.bind(this, function(actor, event) {
                let button = event.get_button();
                if (button == this.btnMouseBtn) { //This preference defaults to right-mouse
                    this._doPrefsDialog();
                } else {
                    //Use the buttons workspaceId property for the index
                    this._setWorkSpace(actor.workspaceId);
                }
            }));
            this.buttons[x].connect('scroll-event', Lang.bind(this, this._onScrollEvent));
            this.boxMain.add_actor(this.buttons[x]);
        }
    },

    _removeAllChildren: function(box) {
        let children = box.get_children();

        if (children) {
            let len = children.length;

            for (let x = len - 1; x >= 0; x--) {
                box.remove_actor(children[x]);
            }
        }

    },

    _setWorkSpace: function(index) {
        // Taken from workspace-indicator
        if(index >= 0 && index <  global.screen.n_workspaces) {
	    let metaWorkspace = global.screen.get_workspace_by_index(index);
	    metaWorkspace.activate(global.get_current_time());
	}

        this._buildWorkSpaceBtns(); //refresh GUI after add,remove,switch workspace
    },

    _activateScroll: function(offSet) {
        this.currentWorkSpace = this._getCurrentWorkSpace() + offSet;
        let workSpaces = global.screen.n_workspaces - 1;

        if (this.wraparoundMode) {
            if (this.currentWorkSpace < 0) this.currentWorkSpace = workSpaces;
            if (this.currentWorkSpace > workSpaces) this.currentWorkSpace = 0;
        } else {
            if (this.currentWorkSpace < 0) this.currentWorkSpace = 0;
            if (this.currentWorkSpace > workSpaces) this.currentWorkSpace = workSpaces;
        }

        this._setWorkSpace(this.currentWorkSpace);
    },

    _onScrollEvent: function(actor, event) {
        let direction = event.get_scroll_direction();
        let offSet = 0;

        if (direction == Clutter.ScrollDirection.DOWN) {
            offSet = 1;
        } else if (direction == Clutter.ScrollDirection.UP) {
            offSet = -1;
        } else {
            return;
        }

        this._activateScroll(offSet);
    }
}

