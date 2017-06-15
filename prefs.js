/* Credit to gcampax and fmuellner who I have shamelessly taken the workspace
   indicator settings from to add to a second tab in the preferences, to get
   all the preference changing and workspace label updating done from the one
   extensions (it doesn't seem to make much sense to have both extensions
   active at the same time). */

const GdkPixbuf = imports.gi.GdkPixbuf;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Pango = imports.gi.Pango;

const Gettext = imports.gettext.domain('markbokil.com-extensions;');
const _ = Gettext.gettext;
const _N = function(x) { return x; }

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Keys = Me.imports.keys;

const positions = [
        "left",
        "center",
        "right"];
const mBtnNum = [2, 3];
const mBtnBtn = ["Middle", "Right"];

const WORKSPACE_SCHEMA = 'org.gnome.desktop.wm.preferences';
const WORKSPACE_KEY = 'workspace-names';

const WorkspaceBarSettings = new GObject.Class({
    Name: 'WorkspaceBarGeneralPrefs',
    Extends: Gtk.Grid,
    
    _init: function(params) {
        this.parent(params);
        this.margin = 10;
        this.column_spacing = 50;
        this.row_spacing = 10;
	    this._settings = Convenience.getSettings();

        // Start building the objects

        // Position Settings label
        let lblPosTitle = new Gtk.Label({
            label: "<b>Position Settings</b>",
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });
        // Easiest way to understand attach format:-
        //   Object, Column, Row, ColSpan, RowSpan
        this.attach(lblPosTitle, 0, 0, 3, 1);
        
        // Workspace position label
        let lblPosition = new Gtk.Label({
            label: "WorkspaceBar position",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblPosition, 0, 1, 2, 1);
        
        // Workspace position dropdown
        this.cmbPosition = new Gtk.ComboBoxText({
            halign: Gtk.Align.END
        });
        for (let i = 0; i < positions.length; i++) {
            this.cmbPosition.append_text(this._capCase(positions[i]));
        }
        this.cmbPosition.set_active(positions.indexOf(this._settings.get_string(Keys.panelPos)));
        this._onPositionChanged(this.cmbPosition); // If empty, set to default, if not, set to current
        this.cmbPosition.connect ('changed', Lang.bind (this, this._onPositionChanged));
        this.attach(this.cmbPosition, 2, 1, 1, 1);
        
        // Position Index enable label
        let lblPositionEnable = new Gtk.Label({
            label: "Change the index for the bar position",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblPositionEnable, 0, 2, 2, 1);
        
        // Position Index enable switch
        let swPositionIndexEnable = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.panelPosChange),
            halign: Gtk.Align.END
        });
        this._setIndexEnableChange(swPositionIndexEnable);
        swPositionIndexEnable.connect ('notify::active', Lang.bind (this, function() {
             this._setIndexEnableChange(swPositionIndexEnable);
             lblPositionIndex.set_sensitive(swPositionIndexEnable.active === true ? true : false);
             this.spnPosition.set_sensitive(swPositionIndexEnable.active === true ? true : false);
        }));
        this.attach(swPositionIndexEnable, 2, 2, 1, 1);
                
        // Position Index label
        let lblPositionIndex = new Gtk.Label({
            label: "Specify position index",
            margin_left: 15,
            sensitive: this._settings.get_boolean(Keys.panelPosChange) === true ? true : false,
            halign: Gtk.Align.START
        });
        this.attach(lblPositionIndex, 0, 3, 2, 1);
        
        // Position Index adjustment
        this._adjPositionIndex = new Gtk.Adjustment ({
            //Don't set value here, we'll get it after creating the spin button
            lower: -999,
            upper: 999,
            step_increment: 1,
            page_increment: 10
        });

        // Position Index spinbutton
        this.spnPosition = new Gtk.SpinButton ({
            adjustment: this._adjPositionIndex,
            sensitive: this._settings.get_boolean(Keys.panelPosChange) === true ? true : false,
            halign: Gtk.Align.END
        });
        this.spnPosition.set_value (this._settings.get_int(Keys.panelPosIndex));
        this.spnPosition.set_digits (0);
        this.spnPosition.set_wrap (false);
        this._setPositionIndexChange(this.spnPosition);
        this.spnPosition.connect ('value-changed', Lang.bind (this, this._setPositionIndexChange));
        this.attach(this.spnPosition, 2, 3, 1, 1);
        
        // General Settings label
        let lblGenTitle = new Gtk.Label({
            label: "<b>General Settings</b>",
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });
        this.attach(lblGenTitle, 0, 4, 3, 1);
        
        // Show Overview label
        let lblOverview = new Gtk.Label({
            label: "Show overview when mousing over the workspace bar",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblOverview, 0, 5, 2, 1);
        
        // Show Overview switch
        let swOverview = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.overviewMode),
            halign: Gtk.Align.END
        });
        this._setOverViewMode(swOverview);
        swOverview.connect ('notify::active', Lang.bind (this, this._setOverViewMode));
        this.attach(swOverview, 2, 5, 1, 1);
        
        // Show Wrap Around label
        let lblWrapAround = new Gtk.Label({
            label: "Wrap around when scrolling over the workspace bar",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblWrapAround, 0, 6, 2, 1);

        // Show Wrap Around switch
        let swWrapAround = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.wrapAroundMode),
            halign: Gtk.Align.END
        });
        this._setWrapAroundMode(swWrapAround);
        swWrapAround.connect ('notify::active', Lang.bind (this, this._setWrapAroundMode));
        this.attach(swWrapAround, 2, 6, 1, 1);
        
        // Preferences mouse button label
        let lblMouseBtn = new Gtk.Label({
            label: "Mouse button to open the preferences dialog",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblMouseBtn, 0, 7, 2, 1);
        
        // Preferences mouse button dropdown
        this.cmbMouseBtn = new Gtk.ComboBoxText({
            halign: Gtk.Align.END
        });
        for (let i = 0; i < mBtnBtn.length; i++) {
            this.cmbMouseBtn.append_text(mBtnBtn[i]);
        }
        this.cmbMouseBtn.set_active(mBtnNum.indexOf(this._settings.get_int(Keys.prefsMouseBtn)));
        this._onBtnChanged(this.cmbMouseBtn);
        this.cmbMouseBtn.connect ('changed', Lang.bind (this, this._onBtnChanged));
        this.attach(this.cmbMouseBtn, 2, 7, 1, 1);
    },
    
    _capCase: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    _lowCase: function(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    },
    
    _onPositionChanged: function() {
        let activeItem = this.cmbPosition.get_active();
        this._settings.set_string(Keys.panelPos, positions[activeItem]);
    },
    
    _setIndexEnableChange: function(object) {
        this._settings.set_boolean(Keys.panelPosChange, object.active);
    },

    _setPositionIndexChange: function(object) {
        this._settings.set_int(Keys.panelPosIndex, object.value);
    },
    
    _setOverViewMode: function(object) {
        this._settings.set_boolean(Keys.overviewMode, object.active);
    },
    
    _setWrapAroundMode: function(object) {
        this._settings.set_boolean(Keys.wrapAroundMode, object.active);
    },
    
    _onBtnChanged: function() {
        let activeItem = this.cmbMouseBtn.get_active();
        this._settings.set_int(Keys.prefsMouseBtn, mBtnNum[activeItem]);
    },
    
    _resetSettings: function() {
        this._settings.set_string(Keys.panelPos, positions[0]);
        this._settings.set_boolean(Keys.panelPosChange, false);
        this._settings.set_int(Keys.panelPosIndex, 1);
        this._settings.set_boolean(Keys.overviewMode, false);
        this._settings.set_boolean(Keys.wrapAroundMode, false);
    }
});

const WorkspaceBarWorkspaceFormat = new GObject.Class({
    Name: 'WorkspaceBarWorkspacePrefs',
    Extends: Gtk.Grid,
    
    _init: function(params) {
        this.parent(params);
        this.margin = 10;
        this.column_spacing = 50;
        this.row_spacing = 10;
	    this._settings = Convenience.getSettings();

        // Start building the objects

        // Workspace apperance/label format label
        let lblWorkspaceFormat = new Gtk.Label({
            label: "<b>Workspace Appearance/Label Format</b>",
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });
        this.attach(lblWorkspaceFormat, 0, 0, 3, 1);
        
        // Hide Empty Workspaces label
        let lblHideWorkspace = new Gtk.Label({
            label: "Hide empty workspaces from the workspace list",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblHideWorkspace, 0, 1, 2, 1);
        
        // Hide Empty Workspace switch
        let swHideWorkspace = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.hideEmptyWork),
            halign: Gtk.Align.END
        });
        this._setHideWorkspace(swHideWorkspace);
        swHideWorkspace.connect ('notify::active', Lang.bind (this, function() {
            this._setHideWorkspace(swHideWorkspace);
            lblEmptyWorkspace.set_sensitive(swHideWorkspace.active === true ? false : true);
            swEmptyWorkspace.set_sensitive(swHideWorkspace.active === true ? false : true);
        }));
        this.attach(swHideWorkspace, 2, 1, 1, 1);
        
        // Show Empty Workspace label
        let lblEmptyWorkspace = new Gtk.Label({
            label: "Enable styling to indicate empty workspaces\n<span font_size='small'>Will not be visible if option to hide workspaces is enabled</span>",
            margin_left: 15,
            use_markup: true,
            sensitive: this._settings.get_boolean(Keys.hideEmptyWork) === true ? false : true,
            halign: Gtk.Align.START
        });
        this.attach(lblEmptyWorkspace, 0, 2, 2, 1);
        
        // Show Empty Workspace switch
        let swEmptyWorkspace = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.emptyWorkStyle),
            sensitive: this._settings.get_boolean(Keys.hideEmptyWork) === true ? false : true,
            halign: Gtk.Align.END
        });
        this._setEmptyWorkspaceStyle(swEmptyWorkspace);
        swEmptyWorkspace.connect ('notify::active', Lang.bind (this, this._setEmptyWorkspaceStyle));
        this.attach(swEmptyWorkspace, 2, 2, 1, 1);
        
        // Show Urgent Workspace label
        let lblUrgentWorkspace = new Gtk.Label({
            label: "Enable styling to indicate urgent workspaces",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblUrgentWorkspace, 0, 3, 2, 1);
        
        // Show Urgent Workspace switch
        let swUrgentWorkspace = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.urgentWorkStyle),
            halign: Gtk.Align.END
        });
        this._setUrgentWorkspaceStyle(swUrgentWorkspace);
        swUrgentWorkspace.connect ('notify::active', Lang.bind (this, this._setUrgentWorkspaceStyle));
        this.attach(swUrgentWorkspace, 2, 3, 1, 1);
        
        // Show workspace numbers label
        let lblWkspNumber = new Gtk.Label({
            sensitive: this._settings.get_boolean(Keys.nameLabel) || this._settings.get_boolean(Keys.indLabel) ? true : false,
            label: "Enable workspace numbers",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblWkspNumber, 0, 4, 2, 1);
        
        // Show workspace numbers switch
        let swWkspNumber = new Gtk.Switch({
            sensitive: this._settings.get_boolean(Keys.nameLabel) || this._settings.get_boolean(Keys.indLabel) ? true : false,
            active: this._settings.get_boolean(Keys.numLabel),
            halign: Gtk.Align.END
        });
        this._setWkspNumber(swWkspNumber);
        swWkspNumber.connect ('notify::active', Lang.bind (this, function () {
            this._setWkspNumber(swWkspNumber);
            
            // Disable workspace label separator if both workspace numbers and names are not
            //  enabled
            lblSeparator.set_sensitive(swWkspNumber.active === true && swWkspName.active === true ? true : false);
            this.txtSeparator.set_sensitive(swWkspNumber.active === true && swWkspName.active === true ? true : false);
            
            // Disable the ability to disable workspace names unless the activity indicators are
            //  enabled as we have to have some sort of indicator
            if (swActInd.active === true) {
                lblWkspName.set_sensitive(false);
                swWkspName.set_sensitive(false);
            } else {
                lblWkspName.set_sensitive(swWkspNumber.active === true || swActInd.active === true ? true : false);
                swWkspName.set_sensitive(swWkspNumber.active === true || swActInd.active === true ? true : false);
            }
            
        }));
        this.attach(swWkspNumber, 2, 4, 1, 1);
        
        // Show workspace names label
        let lblWkspName = new Gtk.Label({
            sensitive: this._settings.get_boolean(Keys.indLabel) ? false :(this._settings.get_boolean(Keys.numLabel) ? true : false),
            label: "Enable workspace names",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblWkspName, 0, 5, 2, 1);
        
        // Show workspace names switch
        let swWkspName = new Gtk.Switch({
            sensitive: this._settings.get_boolean(Keys.indLabel) ? false : this._settings.get_boolean(Keys.numLabel) ? true : false,
            active: this._settings.get_boolean(Keys.nameLabel),
            halign: Gtk.Align.END
        });
        this._setWkspName(swWkspName);
        swWkspName.connect ('notify::active', Lang.bind (this, function () {
            this._setWkspName(swWkspName);
            
            // Disable workspace label separator if both workspace numbers and names are not
            //  enabled
            lblSeparator.set_sensitive(swWkspNumber.active === true && swWkspName.active === true ? true : false);
            this.txtSeparator.set_sensitive(swWkspNumber.active === true && swWkspName.active === true ? true : false);
            
            // Disable the ability to disable workspace numbers unless the activity indicators are
            //  enabled as we have to have some sort of indicator
            lblWkspNumber.set_sensitive(swWkspName.active === true || swActInd.active === true ? true : false);
            swWkspNumber.set_sensitive(swWkspName.active === true || swActInd.active === true ? true : false);
        }));
        this.attach(swWkspName, 2, 5, 1, 1);
        
        // Workspace label separator label
        let lblSeparator = new Gtk.Label({
            label: "Workspace label separator\n<span font_size='small'>Add spaces here as they will not be automatically added otherwise</span>",
            margin_left: 15,
            use_markup: true,
            sensitive: swWkspNumber.active === true && swWkspName.active === true ? true : false,
            halign: Gtk.Align.START
        });
        this.attach(lblSeparator, 0, 6, 2, 1);
        
        // Workspace label separator text entry
        this.txtSeparator = new Gtk.Entry({
            sensitive: swWkspNumber.active === true && swWkspName.active === true ? true : false,
            width_chars: 7,
            halign: Gtk.Align.END
        });
        this.txtSeparator.set_text(this._settings.get_string(Keys.labelSeparator));
        this._onSeparatorChanged();
        this.txtSeparator.connect ('changed', Lang.bind (this, this._onSeparatorChanged));
        this.txtSeparator.connect ('activate', Lang.bind (this, this._onSeparatorChanged));
        this.attach(this.txtSeparator, 2, 6, 1, 1);
        
        // Show activity indicators label
        let lblActInd = new Gtk.Label({
            label: "Enable activity indicators\n<span font_size='small'>This will override workspace names (numbers can still be visible)</span>",
            margin_left: 15,
            use_markup: true,
            halign: Gtk.Align.START
        });
        this.attach(lblActInd, 0, 7, 2, 1);
        
        // Show activity indicators switch
        let swActInd = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.indLabel),
            halign: Gtk.Align.END
        });
        this._setActInd(swActInd);
        swActInd.connect ('notify::active', Lang.bind (this, function() {
            this._setActInd(swActInd);
            
            let actIndEnable = this._settings.get_boolean(Keys.indLabel);
            let numIndEnable = this._settings.get_boolean(Keys.numLabel);
            let nameIndEnable = this._settings.get_boolean(Keys.nameLabel);
            
            lblActIndBorder.set_sensitive(actIndEnable);
            swActIndBorder.set_sensitive(actIndEnable);
            
            if (actIndEnable === true) {
                lblWkspNumber.set_sensitive(true);
                swWkspNumber.set_sensitive(true);
                lblWkspName.set_sensitive(false);
                swWkspName.set_sensitive(false);                
            } else {
                if (nameIndEnable === false) {
                    lblWkspName.set_sensitive(true);
                    swWkspName.set_sensitive(true);
                    lblWkspNumber.set_sensitive(false);
                    swWkspNumber.set_sensitive(false);
                } else if (numIndEnable === false) {
                    lblWkspName.set_sensitive(false);
                    swWkspName.set_sensitive(false);
                    lblWkspNumber.set_sensitive(true);
                    swWkspNumber.set_sensitive(true);
                } else if (numIndEnable === true && nameIndEnable === true) {
                    lblWkspName.set_sensitive(true);
                    swWkspName.set_sensitive(true);
                    lblWkspNumber.set_sensitive(true);
                    swWkspNumber.set_sensitive(true);
                }
                if (numIndEnable === false && nameIndEnable === false) {
                    lblWkspName.set_sensitive(false);
                    swWkspName.set_sensitive(false);
                    swWkspName.active = true;
                    this._setWkspName(swWkspName);
                    lblWkspNumber.set_sensitive(true);
                    swWkspNumber.set_sensitive(true);
                }
            }
            
            lblEmptyInd.set_sensitive(actIndEnable);
            this.txtEmptyInd.set_sensitive(actIndEnable);
            lblInactiveInd.set_sensitive(actIndEnable);
            this.txtInactiveInd.set_sensitive(actIndEnable);
            lblActiveInd.set_sensitive(actIndEnable);
            this.txtActiveInd.set_sensitive(actIndEnable);
        }));
        this.attach(swActInd, 2, 7, 1, 1);
        
        // Show border styles for activity indicators label
        let lblActIndBorder = new Gtk.Label({
            sensitive: this._settings.get_boolean(Keys.indLabel) === true ? true : false,
            label: "Enable activity indicator borders\n<span font_size='small'>Border styles will be hidden for all but active workspaces by default</span>",
            margin_left: 15,
            use_markup: true,
            halign: Gtk.Align.START
        });
        this.attach(lblActIndBorder, 0, 8, 2, 1);
        
        // Show border styles for activity indicators switch
        let swActIndBorder = new Gtk.Switch({
            sensitive: this._settings.get_boolean(Keys.indLabel) === true ? true : false,
            active: this._settings.get_boolean(Keys.indLabelBorder),
            halign: Gtk.Align.END
        });
        this._setActBorder(swActIndBorder);
        swActIndBorder.connect ('notify::active', Lang.bind (this, this._setActBorder));
        this.attach(swActIndBorder, 2, 8, 1, 1);
        
        // Activity indicators label
        let lblActivityInd = new Gtk.Label({
            label: "<b>Activity Indicators</b>\n<span font_size='small'>These will replace the workspace names as noted</span>",
            use_markup: true,
            halign: Gtk.Align.START
        });
        this.attach(lblActivityInd, 0, 9, 3, 1);
        
        // Empty workspace activity indicator label
        let lblEmptyInd = new Gtk.Label({
            label: "Empty Workspace",
            sensitive: this._settings.get_boolean(Keys.indLabel) === true ? true : false,
            halign: Gtk.Align.CENTER
        });
        this.attach(lblEmptyInd, 0, 10, 1, 1);
        
        //Inactive workspace activity indicator label
        let lblInactiveInd = new Gtk.Label({
            label: "Inactive Workspace",
            sensitive: this._settings.get_boolean(Keys.indLabel) === true ? true : false,
            halign: Gtk.Align.CENTER
        });
        this.attach(lblInactiveInd, 1, 10, 1, 1);
        
        //Active workspace activity indicator label
        let lblActiveInd = new Gtk.Label({
            label: "Active Workspace",
            sensitive: this._settings.get_boolean(Keys.indLabel) === true ? true : false,
            halign: Gtk.Align.CENTER
        });
        this.attach(lblActiveInd, 2, 10, 1, 1);
        
        // Get the array of workspace label indicators
        let indList = this._settings.get_strv(Keys.labelIndicators);
        
        // Empty workspace activity indicator text entry
        this.txtEmptyInd = new Gtk.Entry({
            sensitive: this._settings.get_boolean(Keys.indLabel) === true ? true : false,
            width_chars: 15,
            halign: Gtk.Align.CENTER
        });
        this.txtEmptyInd.set_text(indList[0] !== undefined ? indList[0] : '');
        this.txtEmptyInd.connect ('changed', Lang.bind (this, this._onIndicatorChanged));
        this.txtEmptyInd.connect ('activate', Lang.bind (this, this._onIndicatorChanged));
        this.attach(this.txtEmptyInd, 0, 11, 1, 1);
        
        // Inactive workspace activity indicator text entry
        this.txtInactiveInd = new Gtk.Entry({
            sensitive: this._settings.get_boolean(Keys.indLabel) === true ? true : false,
            width_chars: 15,
            halign: Gtk.Align.CENTER
        });
        this.txtInactiveInd.set_text(indList[1] !== undefined ? indList[1] : '');
        this.txtInactiveInd.connect ('changed', Lang.bind (this, this._onIndicatorChanged));
        this.txtInactiveInd.connect ('activate', Lang.bind (this, this._onIndicatorChanged));
        this.attach(this.txtInactiveInd, 1, 11, 1, 1);
        
        // Active workspace activity indicator text entry
        this.txtActiveInd = new Gtk.Entry({
            sensitive: this._settings.get_boolean(Keys.indLabel) === true ? true : false,
            width_chars: 15,
            halign: Gtk.Align.CENTER
        });
        this.txtActiveInd.set_text(indList[2] !== undefined ? indList[2] : '');
        this.txtActiveInd.connect ('changed', Lang.bind (this, this._onIndicatorChanged));
        this.txtActiveInd.connect ('activate', Lang.bind (this, this._onIndicatorChanged));
        this.attach(this.txtActiveInd, 2, 11, 1, 1);
        
        //Set indicators once all Gtk.Entry boxes have been created
        this._onIndicatorChanged();
    },
    
    _capCase: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    _lowCase: function(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    },
    
    _setHideWorkspace: function(object) {
        this._settings.set_boolean(Keys.hideEmptyWork, object.active);
    },
    
    _setEmptyWorkspaceStyle: function(object) {
        this._settings.set_boolean(Keys.emptyWorkStyle, object.active);
    },
    
    _setUrgentWorkspaceStyle: function(object) {
        this._settings.set_boolean(Keys.urgentWorkStyle, object.active);
    },
    
    _setWkspNumber: function(object) {
        this._settings.set_boolean(Keys.numLabel, object.active);
    },
    
    _setWkspName: function(object) {
        this._settings.set_boolean(Keys.nameLabel, object.active);
    },
    
    _setActInd: function(object) {
        this._settings.set_boolean(Keys.indLabel, object.active);
    },
    
    _setActBorder: function(object) {
        this._settings.set_boolean(Keys.indLabelBorder, object.active);
    },
    
    _onSeparatorChanged: function() {
        this._settings.set_string(Keys.labelSeparator, this.txtSeparator.get_text());
    },
    
    _onIndicatorChanged: function(object) {
        let arrIndicators = [];
        arrIndicators[0] = this.txtEmptyInd.get_text();
        arrIndicators[1] = this.txtInactiveInd.get_text();
        arrIndicators[2] = this.txtActiveInd.get_text();
        this._settings.set_strv(Keys.labelIndicators, arrIndicators);
    },
    
    _resetSettings: function() {
        this._settings.set_boolean(Keys.emptyWorkStyle, true);
        this._settings.set_boolean(Keys.urgentWorkStyle, true);
        this._settings.set_boolean(Keys.urgentWorkStyle, mBtnNum[1]);
    }
});

const WorkspaceNameModel = new GObject.Class({
    Name: 'WorkspaceBar.WorkspaceNameModel',
    GTypeName: 'WorkspaceNameModel',
    Extends: Gtk.ListStore,

    Columns: {
        LABEL: 0,
    },

    _init: function(params) {
        this.parent(params);
        this.set_column_types([GObject.TYPE_STRING]);

        this._wnsettings = new Gio.Settings({ schema_id: WORKSPACE_SCHEMA });
        //this._wnsettings.connect('changed::workspace-names', Lang.bind(this, this._reloadFromSettings));

        this._reloadFromSettings();

        // overriding class closure doesn't work, because GtkTreeModel
        // plays tricks with marshallers and class closures
        this.connect('row-changed', Lang.bind(this, this._onRowChanged));
        this.connect('row-inserted', Lang.bind(this, this._onRowInserted));
        this.connect('row-deleted', Lang.bind(this, this._onRowDeleted));
    },

    _reloadFromSettings: function() {
        if (this._preventChanges)
            return;
        this._preventChanges = true;

        let newNames = this._wnsettings.get_strv(WORKSPACE_KEY);

        let i = 0;
        let [ok, iter] = this.get_iter_first();
        while (ok && i < newNames.length) {
            this.set(iter, [this.Columns.LABEL], [newNames[i]]);

            ok = this.iter_next(iter);
            i++;
        }

        while (ok)
            ok = this.remove(iter);

        for ( ; i < newNames.length; i++) {
            iter = this.append();
            this.set(iter, [this.Columns.LABEL], [newNames[i]]);
        }

        this._preventChanges = false;
    },

    _onRowChanged: function(self, path, iter) {
        if (this._preventChanges)
            return;
        this._preventChanges = true;

        let index = path.get_indices()[0];
        let names = this._wnsettings.get_strv(WORKSPACE_KEY);

        if (index >= names.length) {
            // fill with blanks
            for (let i = names.length; i <= index; i++)
                names[i] = '';
        }

        names[index] = this.get_value(iter, this.Columns.LABEL);

        this._wnsettings.set_strv(WORKSPACE_KEY, names);

        this._preventChanges = false;
    },

    _onRowInserted: function(self, path, iter) {
        if (this._preventChanges)
            return;
        this._preventChanges = true;

        let index = path.get_indices()[0];
        let names = this._wnsettings.get_strv(WORKSPACE_KEY);
        let label = this.get_value(iter, this.Columns.LABEL) || '';
        names.splice(index, 0, label);

        this._wnsettings.set_strv(WORKSPACE_KEY, names);

        this._preventChanges = false;
    },

    _onRowDeleted: function(self, path) {
        if (this._preventChanges)
            return;
        this._preventChanges = true;

        let index = path.get_indices()[0];
        let names = this._wnsettings.get_strv(WORKSPACE_KEY);

        if (index >= names.length)
            return;

        names.splice(index, 1);

        // compact the array
        for (let i = names.length -1; i >= 0 && !names[i]; i++)
            names.pop();

        this._wnsettings.set_strv(WORKSPACE_KEY, names);

        this._preventChanges = false;
    },
});

const WorkspaceSettingsWidget = new GObject.Class({
    Name: 'WorkspaceBar.WorkspaceSettingsWidget',
    GTypeName: 'WorkspaceSettingsWidget',
    Extends: Gtk.Grid,

    _init: function(params) {
        this.parent(params);
        this.margin = 12;
        this.orientation = Gtk.Orientation.VERTICAL;

        this.add(new Gtk.Label({ label: '<b>' + _("Workspace Names") + '</b>',
                                 use_markup: true, margin_bottom: 6,
                                 hexpand: true, halign: Gtk.Align.START }));

        let scrolled = new Gtk.ScrolledWindow({ shadow_type: Gtk.ShadowType.IN });
        scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this.add(scrolled);

        this._store = new WorkspaceNameModel();
        this._treeView = new Gtk.TreeView({ model: this._store,
                                            headers_visible: false,
                                            reorderable: true,
                                            hexpand: true,
                                            vexpand: true
                                          });

        let column = new Gtk.TreeViewColumn({ title: _("Name") });
        let renderer = new Gtk.CellRendererText({ editable: true });
        renderer.connect('edited', Lang.bind(this, this._cellEdited));
        column.pack_start(renderer, true);
        column.add_attribute(renderer, 'text', this._store.Columns.LABEL);
        this._treeView.append_column(column);

        scrolled.add(this._treeView);

        let toolbar = new Gtk.Toolbar({ icon_size: Gtk.IconSize.SMALL_TOOLBAR });
        toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);

        let newButton = new Gtk.ToolButton({ icon_name: 'list-add-symbolic' });
        newButton.connect('clicked', Lang.bind(this, this._newClicked));
        toolbar.add(newButton);

        let delButton = new Gtk.ToolButton({ icon_name: 'list-remove-symbolic' });
        delButton.connect('clicked', Lang.bind(this, this._delClicked));
        toolbar.add(delButton);

        let selection = this._treeView.get_selection();
        selection.connect('changed',
            function() {
                delButton.sensitive = selection.count_selected_rows() > 0;
            });
        delButton.sensitive = selection.count_selected_rows() > 0;

        this.add(toolbar);
    },

    _cellEdited: function(renderer, path, new_text) {
        let [ok, iter] = this._store.get_iter_from_string(path);

        if (ok)
            this._store.set(iter, [this._store.Columns.LABEL], [new_text]);
    },

    _newClicked: function() {
        let iter = this._store.append();
        let index = this._store.get_path(iter).get_indices()[0];

        let label = _("Workspace %d").format(index + 1);
        this._store.set(iter, [this._store.Columns.LABEL], [label]);
    },

    _delClicked: function() {
        let [any, model, iter] = this._treeView.get_selection().get_selected();

        if (any)
            this._store.remove(iter);
    }
});

function init() {
    Convenience.initTranslations();
}

function buildPrefsWidget() {
    this.notebook = new Gtk.Notebook();
    
    // Add the settings page
    this.setPage = new Gtk.Box();
    this.setPage.border_width = 10;
    this.setPage.add(new WorkspaceBarSettings);
    this.notebook.append_page(this.setPage, new Gtk.Label({label: "Settings"}));
    
    // Add the workspace format page
    this.wsFrmt = new Gtk.Box();
    this.wsFrmt.border_width = 10;
    this.wsFrmt.add(new WorkspaceBarWorkspaceFormat);
    this.notebook.append_page(this.wsFrmt, new Gtk.Label({label: "Workspace Format"}));
    
    // Add the workspace names page
    this.wsNamePage = new Gtk.Box();
    this.wsNamePage.border_width = 10;
    this.wsNamePage.add(new WorkspaceSettingsWidget);
    this.notebook.append_page(this.wsNamePage, new Gtk.Label({label: "Workspace Names"}));

    this.notebook.show_all();
    return notebook;
}
