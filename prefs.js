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
    Name: 'WorkspaceBarPrefs',
    Extends: Gtk.Grid,
    
    _init: function(params) {
        this._window = new Gtk.ApplicationWindow({
            window_position: Gtk.WindowPosition.CENTER,
            title: "WorkspaceBar Settings"
        });
        
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
        this.attach(lblPosTitle, 0, 0, 2, 1);
        
        // Workspace position label
        let lblPosition = new Gtk.Label({
            label: "WorkspaceBar position",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblPosition, 0, 1, 1, 1);
        
        // Workspace position dropdown
        this.cmbPosition = new Gtk.ComboBoxText({
            halign: Gtk.Align.END
        });
        for (let i = 0; i < positions.length; i++) {
            this.cmbPosition.append_text(this._capCase(positions[i]));
        }
        this.cmbPosition.set_active(0);
        //this.cmbPosition.set_active(positions.indexOf(_capCase(this._settings.get_string(Keys.panelPos)));
        this.cmbPosition.connect ('changed', Lang.bind (this, this._onPositionChanged));
        this.attach(this.cmbPosition, 1, 1, 1, 1);
        
        // Position Index enable label
        let lblPositionEnable = new Gtk.Label({
            label: "Change the index for the bar position",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblPositionEnable, 0, 2, 1, 1);
        
        // Position Index enable switch
        let swPositionIndexEnable = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.panelPosChange),
            halign: Gtk.Align.END
        });
        swPositionIndexEnable.connect ('notify::active', Lang.bind (this, this._setIndexEnableChange));
        this.attach(swPositionIndexEnable, 1, 2, 1, 1);
                
        // Position Index label
        let lblPositionIndex = new Gtk.Label({
            label: "Specify position index",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblPositionIndex, 0, 3, 1, 1);
        
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
            halign: Gtk.Align.END
        });
        this.spnPosition.set_value (this._settings.get_int(Keys.panelPosIndex));
        this.spnPosition.set_digits (0);
        this.spnPosition.set_wrap (false);
        this.spnPosition.connect ('value-changed', Lang.bind (this, this._setPositionIndexChange));
        this.attach(this.spnPosition, 1, 3, 1, 1);
        
        // General Settings label
        let lblGenTitle = new Gtk.Label({
            label: "<b>General Settings</b>",
            hexpand: true,
            halign: Gtk.Align.START,
            use_markup: true
        });
        this.attach(lblGenTitle, 0, 4, 2, 1);
        
        // Show Overview label
        let lblOverview = new Gtk.Label({
            label: "Show overview when mousing over the workspace bar",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblOverview, 0, 5, 1, 1);
        
        // Show Overview switch
        let swOverlay = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.overviewMode),
            halign: Gtk.Align.END
        });
        swOverlay.connect ('notify::active', Lang.bind (this, this._setOverViewMode));
        this.attach(swOverlay, 1, 5, 1, 1);
        
        // Show Wrap Around label
        let lblWrapAround = new Gtk.Label({
            label: "Wrap around when scrolling over the workspace bar",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblWrapAround, 0, 6, 1, 1);

        // Show Wrap Around switch
        let swWrapAround = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.wrapAroundMode),
            halign: Gtk.Align.END
        });
        swWrapAround.connect ('notify::active', Lang.bind (this, this._setWrapAroundMode));
        this.attach(swWrapAround, 1, 6, 1, 1);
        
        // Show Empty Workspace label
        let lblEmptyWorkspace = new Gtk.Label({
            label: "Enable styling to indicate empty workspaces",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblEmptyWorkspace, 0, 7, 1, 1);
        
        // Show Empty Workspace switch
        let swEmptyWorkspace = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.emptyWorkStyle),
            halign: Gtk.Align.END
        });
        swEmptyWorkspace.connect ('notify::active', Lang.bind (this, this._setEmptyWorkspaceStyle));
        this.attach(swEmptyWorkspace, 1, 7, 1, 1);
        
        // Show Urgent Workspace label
        let lblUrgentWorkspace = new Gtk.Label({
            label: "Enable styling to indicate urgent workspaces",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblUrgentWorkspace, 0, 8, 1, 1);
        
        // Show Urgent Workspace switch
        let swUrgentWorkspace = new Gtk.Switch({
            active: this._settings.get_boolean(Keys.urgentWorkStyle),
            halign: Gtk.Align.END
        });
        swUrgentWorkspace.connect ('notify::active', Lang.bind (this, this._setUrgentWorkspaceStyle));
        this.attach(swUrgentWorkspace, 1, 8, 1, 1);
        
        // Preferences mouse button label
        let lblMouseBtn = new Gtk.Label({
            label: "Button to open the preferences dialog",
            margin_left: 15,
            halign: Gtk.Align.START
        });
        this.attach(lblMouseBtn, 0, 9, 1, 1);
        
        // Preferences mouse button dropdown
        this.cmbMouseBtn = new Gtk.ComboBoxText({
            halign: Gtk.Align.END
        });
        for (let i = 0; i < mBtnBtn.length; i++) {
            this.cmbMouseBtn.append_text(mBtnBtn[i]);
        }
        this.cmbMouseBtn.set_active(mBtnNum.indexOf(this._settings.get_int(Keys.prefsMouseBtn)));
        this.cmbMouseBtn.connect ('changed', Lang.bind (this, this._onBtnChanged));
        this.attach(this.cmbMouseBtn, 1, 9, 1, 1);
    },
    
    _capCase: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
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
    
    _setEmptyWorkspaceStyle: function(object) {
        this._settings.set_boolean(Keys.emptyWorkStyle, object.active);
    },
    
    _setUrgentWorkspaceStyle: function(object) {
        this._settings.set_boolean(Keys.urgentWorkStyle, object.active);
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
    
    // Add the workspace names page
    this.wsPage = new Gtk.Box();
    this.wsPage.border_width = 10;
    this.wsPage.add(new WorkspaceSettingsWidget);
    this.notebook.append_page(this.wsPage, new Gtk.Label({label: "Workspace Names"}));

    this.notebook.show_all();
    return notebook;
}
