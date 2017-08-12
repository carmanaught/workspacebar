/* WorkspaceBar Extension
 * author: Mark Bokil
 * 9/16/12
 * forked and extended by carmanaught including code from null4bl3
 * version 1.0.1
 * credit: gcampax for some code from Workspace Indicator and Auto Move Windows,
 *   null4bl3 for some empty workspace detection ideas and lyonell for some code
 *    from All Windows for filtering lists of windows in workspaces.
 * 
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
const _N = function (x) { return x; }

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Keys = Me.imports.keys;

const prefsDialog = 'gnome-shell-extension-prefs workspace-bar@markbokil.com';

const WORKSPACE_SCHEMA = 'org.gnome.desktop.wm.preferences';
const WORKSPACE_KEY = 'workspace-names';

const ONE = "single";
const ALL = "all";

function init(extensionMeta) {
    return new WorkspaceBar(extensionMeta);
}

function WorkspaceBar(extensionMeta) {
    this.init(extensionMeta);
}

function debug(str) {
    str = "[ WorkspaceBar ]--------> " + str;
    global.log(str);
}

WorkspaceBar.prototype = {

    init: function (extensionMeta) {
        this.extensionMeta = extensionMeta;
        this._settings = Convenience.getSettings();
    },

    enable: function () {
        // Set a couple of global variables
        this.mouseOver = false;
        this.mouseOverIndex = 0;
        
        this._windowTracker = Shell.WindowTracker.get_default();
        let display = global.screen.get_display();
        
        // Set signals to get changes when made to preferences
        this._settingsSignals = [];
        
        // Changes to these settings require no rebuild as the menu can simply be removed from one
        // location and moved to another.
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.panelPos, Lang.bind(this, this._setPosition)));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.panelPosChange, Lang.bind(this, this._setPosition)));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.panelPosIndex, Lang.bind(this, this._setPosition)));
        
        // These are purely settings updates
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.overviewMode, Lang.bind(this, function () {
            this.overViewMode = this._settings.get_boolean(Keys.overviewMode);
        })));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.wrapAroundMode, Lang.bind(this, function () {
            this.wraparoundMode = this._settings.get_boolean(Keys.wrapAroundMode);
        })));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.prefsMouseBtn, Lang.bind(this, function () {
            this.btnMouseBtn = this._settings.get_int(Keys.prefsMouseBtn);
        })));
        
        // Hide and show empty workspaces based on this setting (done through _setStyle)
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.hideEmptyWork, Lang.bind(this, function() { this._setStyle(ALL); } )));
        
        // Change the buttons style (applied to the label)
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.emptyWorkStyle, Lang.bind(this, function() { this._setStyle(ALL); } )));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.urgentWorkStyle, Lang.bind(this, function() { this._setStyle(ALL); } )));
        
        // Change the text of the labels as needed
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.numLabel, Lang.bind(this, function() { this._setLabel(ALL); } )));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.nameLabel, Lang.bind(this, function() { this._setLabel(ALL); } )));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.labelSeparator, Lang.bind(this, function() { this._setLabel(ALL); } )));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.indLabel, Lang.bind(this, function() {
            this._setLabel(ALL);
            this._setStyle(ALL);
        } )));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.indLabelBorder, Lang.bind(this, function() {
            this._setLabel(ALL);
            this._setStyle(ALL);
        } )));
        this._settingsSignals.push(this._settings.connect('changed::' + Keys.labelIndicators, Lang.bind(this, function() { this._setLabel(ALL); } )));
        
        // Detect workspace name changes and update the button labels accordingly
        this._wkspNameSettings = new Gio.Settings({ schema_id: WORKSPACE_SCHEMA });
        this._settingsSignals.push(this._wkspNameSettings.connect('changed::' + WORKSPACE_KEY, Lang.bind(this, function() { this._setLabel(ALL); } )));
         
        
        // Get settings
        // Move buttons
        this.boxPosition = this._settings.get_string(Keys.panelPos);
        this.boxIndexChange = this._settings.get_boolean(Keys.panelPosChange);
        this.boxIndex = this._settings.get_int(Keys.panelPosIndex);
        // Event/action (show overview, wraparound, button click)
        this.overViewMode = this._settings.get_boolean(Keys.overviewMode);
        this.wraparoundMode = this._settings.get_boolean(Keys.wrapAroundMode);
        this.btnMouseBtn = this._settings.get_int(Keys.prefsMouseBtn);
        // Hide/Show workspaces
        this.hideEmpty = this._settings.get_boolean(Keys.hideEmptyWork);
        // Workspace style
        this.emptyWorkspaceStyle = this._settings.get_boolean(Keys.emptyWorkStyle);
        this.urgentWorkspaceStyle = this._settings.get_boolean(Keys.urgentWorkStyle);
        // Workspace label
        this.wkspNumber = this._settings.get_boolean(Keys.numLabel);
        this.wkspName = this._settings.get_boolean(Keys.nameLabel);
        this.wkspLabelSeparator = this._settings.get_string(Keys.labelSeparator);
        this.indStyle = this._settings.get_boolean(Keys.indLabel);
        this.indStyleBorder = this._settings.get_boolean(Keys.indLabelBorder);
        this.activityIndicators = [];
        this.activityIndicators = this._settings.get_strv(Keys.labelIndicators);
        
        // Build a box layout to contain the workspace buttons
        this.boxMain = new St.BoxLayout();
        this.boxMain.add_style_class_name("panelBox");
        // Build an outer button to detect the mouse entry over the workspace bar and put
        // the box layout inside there.
        this.buttonBox = new St.Button();
        this.buttonBox.connect('enter-event', Lang.bind(this, this._showOverview));
        this.buttonBox.add_actor(this.boxMain);
        
        // Add box to panel
        let box = Main.panel["_" + this.boxPosition + "Box"];
        if (this.boxIndexChange) {
            box.insert_child_at_index(this.buttonBox, this.boxIndex);
        } else {
            box.insert_child_at_index(this.buttonBox, 0); // We'll use 0 as the default position
        }
        
        // Set signals to get event changes that we need to handle
        this._screenSignals = [];
        
        // If a window is closed, we want to change the style if it's empty and an empty style
        // has been configured
        this._screenSignals.push(global.screen.connect('window-left-monitor', Lang.bind(this, function() { this._setStyle(ALL); } )));
        
        // It's easiest if we rebuild the menu when workspaces are removed or added
        this._screenSignals.push(global.screen.connect_after('workspace-removed', Lang.bind(this, this._buildWorkSpaceBtns)));
        this._screenSignals.push(global.screen.connect_after('workspace-added', Lang.bind(this, this._buildWorkSpaceBtns)));
        
        // We'll need to update the workspace style when the workspace is changed
        this._screenSignals.push(global.screen.connect_after('workspace-switched', Lang.bind(this, function (screenObj, wsFrom, wsTo, wsDirection, wsPointer) {
            this._setStyle(ONE, wsFrom); 
            this._setStyle(ONE, wsTo);
        })));
        
        // Connect AFTER we've got display (let display above) to ensure we can get the signal
        // on 'MetaScreen' and avoid errors and so the handler from ShellWindowTracker has
        // already run. We can then change the style of the workspaces that trigger these.
        this._screenSignals.push(display.connect_after('window-demands-attention', Lang.bind(this, function() { this._setStyle(ALL); } )));
        this._screenSignals.push(display.connect_after('window-marked-urgent', Lang.bind(this, function() { this._setStyle(ALL); } )));
        this._screenSignals.push(display.connect_after('window-created', Lang.bind(this, function() { this._setStyle(ALL); } )));
        
        // Build the workspace buttons (only needed here and when workspaces are removed/added)
        this._buildWorkSpaceBtns();
    },

    disable: function () {
        let box = Main.panel["_" + this.boxPosition + "Box"];
        box.remove_actor(this.buttonBox);
        this.buttonBox = null;
        let display = global.screen.get_display();
        
        // Disconnect screen signals
        for (let x = 0; x < this._screenSignals.length; x++) {
            // Disconnect the correct signals (x check is 0 indexed)
            if (x < 4) {
                global.screen.disconnect(this._screenSignals[x]);
            } else {
                display.disconnect(this._screenSignals[x]);
            }
        }
        this._screenSignals = [];
        this._screenSignals = null;

        // Disconnect settings bindings
        for (let x = 0; x < this._settingsSignals.length; x++) {
            // Disconnect the correct signals (x check is 0 indexed)
            if (x < (this._settingsSignals.length - 1)) {
                this._settings.disconnect(this._settingsSignals[x]);
            } else {
                this._wkspNameSettings.disconnect(this._settingsSignals[x]);
            }
        }
        this._settingsSignals = [];
        this._settingsSignals = null;
    },

    _buildWorkSpaceBtns: function () {
        this._removeAllChildren(this.boxMain); // Clear box container
        this.currentWorkSpace = global.screen.get_active_workspace().index();
        this.buttons = []; // Truncate arrays to release memory
        this.labels = [];
        let workSpaces = global.screen.n_workspaces;
        
        for (let x = 0; x < workSpaces; x++) {
            let str = '';
            // Create an empty label with the baseStyle style
            this.labels[x] = new St.Label({ text: str, style_class: "baseStyle" });
            
            // Create a button
            this.buttons[x] = new St.Button();
            
            // Add an empty label to the button, which will be updated once the button is added
            // to the box layout
            this.buttons[x].set_child(this.labels[x]);
            
            // Attach workspace number to .workspaceId property
            this.buttons[x].workspaceId = x;
            
            // Connect to enter/leave events to give a "mouse-over" style, though this isn't
            // applied if the button is urgent.
            this.buttons[x].connect('enter-event', Lang.bind(this, function (actor) {
                var btnLabel = actor.get_child();
                if (btnLabel.has_style_class_name("urgentBtn") != true) {
                    btnLabel.add_style_class_name("highlight");
                    this.mouseOver = true;
                    this.mouseOverIndex = actor.workspaceId;
                }
            }));
            this.buttons[x].connect('leave-event', Lang.bind(this, function (actor) {
                var btnLabel = actor.get_child();
                if (btnLabel.has_style_class_name("urgentBtn") != true) {
                    actor.get_child().remove_style_class_name("highlight");
                    this.mouseOver = false;
                }
            }));
            
            // Connect to the button-press-event and scroll-event to handle changing workspace
            this.buttons[x].connect('button-press-event', Lang.bind(this, function (actor, event) {
                let button = event.get_button();
                if (button == this.btnMouseBtn) { // This preference defaults to right-mouse
                    Main.Util.trySpawnCommandLine(prefsDialog);
                } else {
                    // Use the buttons workspaceId property for the index
                    this._setWorkSpace(actor.workspaceId);
                }
            }));
            this.buttons[x].connect('scroll-event', Lang.bind(this, this._onScrollEvent));
            
            // Add the button with its label to the box layout
            this.boxMain.add_actor(this.buttons[x]);
            
            // Set the style and add labels AFTER the button has been created with a blank label
            this._setStyle(ONE, x);
            this._setLabel(ONE, x);
        }
    },
    
    _removeAllChildren: function (box) {
        let children = box.get_children();
        if (children) {
            let len = children.length;
            for (let x = len - 1; x >= 0; x--) { box.remove_actor(children[x]); }
        }
    },
    
    _showOverview: function () {
        if (this.overViewMode) {
            if (!Main.overview.visible) {
                Main.overview.show();
            }
        }
    },

    _setPosition: function () {
        let oldPosition = this.boxPosition;
        this.boxPosition = this._settings.get_string(Keys.panelPos);
        
        this.boxIndexChange = this._settings.get_boolean(Keys.panelPosChange);
        this.boxIndex = this._settings.get_int(Keys.panelPosIndex);
        
        // Remove box
        let box = Main.panel["_" + oldPosition + "Box"];
        if (this.buttonBox) {
            box.remove_actor(this.buttonBox);
        }

        // Add box
        box = Main.panel["_" + this.boxPosition + "Box"];
        if (this.boxIndexChange) {
            box.insert_child_at_index(this.buttonBox, this.boxIndex);
        } else {
            box.insert_child_at_index(this.buttonBox, 0);
        }
    },
    
    _setStyle(setMode, setIndex) {
        // Get style settings
        this.hideEmpty = this._settings.get_boolean(Keys.hideEmptyWork);
        this.emptyWorkspaceStyle = this._settings.get_boolean(Keys.emptyWorkStyle);
        this.urgentWorkspaceStyle = this._settings.get_boolean(Keys.urgentWorkStyle);
        this.indStyle = this._settings.get_boolean(Keys.indLabel);
        this.indStyleBorder = this._settings.get_boolean(Keys.indLabelBorder);
        
        var workSpaces = 0;
        workSpaces = setMode == "all" ? global.screen.n_workspaces : 1;
        
        var wkspStyle = [];
        var wkspBorder = [];
        var actIndicator = false;
        this.currentWorkSpace = global.screen.get_active_workspace().index();

        for (let x = 0; x < workSpaces; x++) {
            x = workSpaces == 1 ? setIndex : x;
            
            let wsButton = this.boxMain.get_child_at_index(x);
            let wsLabel = wsButton.get_child();
            
            if (this.indStyle === true) { actIndicator = true; }
            
            // Get a list of windows on each workspace as we're building buttons and filter
            // in/out the windows we want/don't want.
            let metaWorkspace = global.screen.get_workspace_by_index(x);
            let windows = metaWorkspace.list_windows();
            let stickyWindows = windows.filter(function (w) {
                return !w.is_skip_taskbar() && w.is_on_all_workspaces();
            });
            let regularWindows = windows.filter(function (w) {
                return !w.is_on_all_workspaces();
            });
            let urgentWindows = windows.filter(function (w) {
                return w.urgent || w.demands_attention;
            });
            
            // Check empty workspace hiding status, check that it's not the current
            // workspace and that there are no windows on the workspace and adjust
            // the visibility of the buttons as necessary.
            if (this.hideEmpty == true) {
                if (x != this.currentWorkSpace && regularWindows.length == 0) {
                    if (wsButton.get_paint_visibility() == true) {
                        wsButton.hide();
                    }
                } else {
                    if (wsButton.get_paint_visibility() == false) {
                        wsButton.show();
                    }
                }
            } else {
                if (wsButton.get_paint_visibility() == false) {
                    wsButton.show();
                }
            }
            
            // Reset the style of the button completely by overriding with the baseStyle style
            wsLabel.set_style_class_name("baseStyle");
            
            // Do checks to determine the style that should be applied
            if (x == this.currentWorkSpace) {
                wkspStyle[x] = "activeBtn";
            }
            else if (x != this.currentWorkSpace && urgentWindows.length > 0 && this.urgentWorkspaceStyle == true) {
                wkspStyle[x] = "urgentBtn";
                wkspBorder[x] = "urgentBorder";
            }
            else if (x != this.currentWorkSpace && regularWindows.length == 0 && this.emptyWorkspaceStyle == true) {
                wkspStyle[x] = "emptyBtn";
                wkspBorder[x] = "emptyBorder";
            }
            else if (regularWindows.length > 0 || x != this.currentWorkSpace) {
                wkspStyle[x] = "inactiveBtn";
                wkspBorder[x] = "inactiveBorder";
            }
            
            // Apply the button style (only the activeBtn style includes a border)
            wsLabel.add_style_class_name(wkspStyle[x])
            // Add border if not activity indicator style (except for the active workspace)
            //  or if the border style override is active
            if (x != this.currentWorkSpace && actIndicator === false) {
                wsLabel.add_style_class_name(wkspBorder[x]);
            } else if (x != this.currentWorkSpace && actIndicator === true && this.indStyleBorder === true) {
                wsLabel.add_style_class_name(wkspBorder[x]);
            }
            
            // Add the mouseover style when we're applying styles if the current button has
            // the mouse in it
            if (this.mouseOver === true && x == this.mouseOverIndex) {
                wsLabel.add_style_class_name("highlight")
            }
        }
    },
    
    _setLabel: function (setMode, setIndex) {
        this.emptyWorkspaceStyle = this._settings.get_boolean(Keys.emptyWorkStyle);
        this.urgentWorkspaceStyle = this._settings.get_boolean(Keys.urgentWorkStyle);
        this.wkspNumber = this._settings.get_boolean(Keys.numLabel);
        this.wkspName = this._settings.get_boolean(Keys.nameLabel);
        this.wkspLabelSeparator = this._settings.get_string(Keys.labelSeparator);
        this.indStyle = this._settings.get_boolean(Keys.indLabel);
        this.indStyleBorder = this._settings.get_boolean(Keys.indLabelBorder);
        
        var wsNum = '';
        var wsName = '';
        var str = '';
        var workspaceName = '';
        var actIndicator = false;
        // Get this whenever rebuilding (called on activity indicator changes)
        this.activityIndicators = [];
        this.activityIndicators = this._settings.get_strv(Keys.labelIndicators);
        
        var workSpaces = 0;
        workSpaces = setMode == "all" ? global.screen.n_workspaces : 1;
        
        for (let x = 0; x < workSpaces; x++) {
            x = workSpaces == 1 ? setIndex : x;

            let wsButton = this.boxMain.get_child_at_index(x);
            let wsLabel = wsButton.get_child();
            
            str = '';
            let emptyName = false;
            // Get the workspace name for the workspace
            let workspaceName = Meta.prefs_get_workspace_name(x);

            // Check that workspace has label (returns "Workspace <Num>" if not),
            // which also explicitly blocks use of the word "Workspace" in a label.
            if (workspaceName.indexOf("Workspace") != -1) {
                emptyName = true;
            }
            
            wsNum = (x + 1).toString();
            wsName = workspaceName;
            
            // Change workspace label depending on the use of activity indicators
            if (this.wkspNumber === true && this.wkspName === false) {
                str = wsNum;
            }
            if (this.wkspNumber === false && this.wkspName === true) {
                if (this.indStyle === true) { actIndicator = true; }
                else {
                    if (emptyName == true) { str = wsNum; }
                    else { str = wsName; }
                }
            }
            if (this.wkspNumber === true && this.wkspName === true) {
                if (this.indStyle === true) {
                    actIndicator = true;
                    str = wsNum + this.wkspLabelSeparator;
                } else {
                    if (emptyName == true) { str = wsNum; }
                    else { str = wsNum + this.wkspLabelSeparator + wsName; }
                }
            }
            
            // Get a list of windows on each workspace as we're building buttons and filter
            // in/out the windows we want/don't want.
            let metaWorkspace = global.screen.get_workspace_by_index(x);
            let windows = metaWorkspace.list_windows();
            let stickyWindows = windows.filter(function (w) {
                return !w.is_skip_taskbar() && w.is_on_all_workspaces();
            });
            let regularWindows = windows.filter(function (w) {
                return !w.is_on_all_workspaces();
            });
            let urgentWindows = windows.filter(function (w) {
                return w.urgent || w.demands_attention;
            });
            
            // Do checks to determine the format of the label
            if (x == this.currentWorkSpace) {
                str = actIndicator === true ? str + this.activityIndicators[2] : str;
            }
            else if (x != this.currentWorkSpace && urgentWindows.length > 0 && this.urgentWorkspaceStyle == true) {
                str = actIndicator === true ? str + this.activityIndicators[1] : str;
            }
            else if (x != this.currentWorkSpace && regularWindows.length == 0 && this.emptyWorkspaceStyle == true) {
                str = actIndicator === true ? str + this.activityIndicators[0] : str;
            }
            else if (regularWindows.length > 0 || x != this.currentWorkSpace) {
                str = actIndicator === true ? str + this.activityIndicators[1] : str;
            }
            
            wsLabel.set_text(_(str));
        }
        
    },
    
    _setWorkSpace: function (index) {
        // Taken from workspace-indicator
        if (index >= 0 && index <  global.screen.n_workspaces) {
	        let metaWorkspace = global.screen.get_workspace_by_index(index);
	        metaWorkspace.activate(global.get_current_time());
        }
    },
    
    _activateScroll: function (offSet) {
        this.currentWorkSpace = global.screen.get_active_workspace().index() + offSet;
        let workSpaces = global.screen.n_workspaces - 1;
        let scrollBack = 0;
        let scrollFwd = 0;
        
        if (this.wraparoundMode) {
            scrollBack = workSpaces;
            scrollFwd = 0;
        } else {
            scrollBack = 0;
            scrollFwd = workSpaces;
        }
        
        if (this.currentWorkSpace < 0) this.currentWorkSpace = scrollBack;
        if (this.currentWorkSpace > workSpaces) this.currentWorkSpace = scrollFwd;
        
        this._setWorkSpace(this.currentWorkSpace);
    },

    _onScrollEvent: function (actor, event) {
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

