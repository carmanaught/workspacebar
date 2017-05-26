# WorkspaceBar
Gnome Shell Extension for switching workspaces on the panel, forked from mbokil/workspacebar.

This is how the WorkspaceBar looks in action with the current choice of styling. This can be changed in the stylesheet.css if desired.

![WorkspaceBar in action](http://i.imgur.com/LlWShgF.png)
- The active or current workspace has a blue underline and uses bright white text
- The urgent workspace with a window which is urgent or demands attention has a red underline with red text to draw attention to it
- The inactive worspaces which have a window/application in them have a grey underline and uses light grey text
- The empty workspaces with no window/application in them have no underline and uses dull grey text

These are the General Settings on the Settings page. These have been changed somewhat from the original settings.

![WorkspaceBar - General Settings](http://i.imgur.com/w689WPo.png)

This is the Workspace Names settings page which is copied from the the Workspace Indicator extension (attributed in prefs.js) - [Gnome Extensions Page](https://extensions.gnome.org/extension/21/workspace-indicator/) - [Gnome Git](https://git.gnome.org/browse/gnome-shell-extensions/tree/extensions/workspace-indicator).

![WorkspaceBar - Workspace Names](http://i.imgur.com/PW28PVx.png)

Some changes from the original extension
- Fixed prefs error in older version
- Changed label format to include the workspace name (as per `/org/gnome/desktop/wm/preferences/workspace-names`).
- Changed workspace click event to use an attached workspace ID property instead of using the label text to select the workspace (credit to gcampax).
- Changed border styling.
- Added scroll behaviour to 'wrap-around'.
- Added code to identify workspace with no windows, ignoring windows on all workspaces (credit to null4bl3).
- Added window-create event handling to react to windows being created on unfocused workspaces (again, credit to gcampax).
- Added window-demands-attention and window-marked-urgent handling to windows demanding attention on unfocused workspaces (triggers along with "window is ready" type of notifications, for instance).
- Overhauled the preferences (index position is now a drop-down rather than radio buttons).

Changes to preferences
- Added a tabbed layout with general settings on the first tab and workspace name editing on the second.
- Added the capability to modify the index position of the box containing the workspace bar along with a switch to enable (capability to change the index defaults to off and index defaults to 0).
- Added switch for 'wrap-around' behaviour to enable or disable (defaults to on).
- Added switch to enable or disable the empty/urgent workspace styling (both default to on).

## Credits
Thanks to mbokil for the original extension and thanks to these people for some code of theirs that I've used
- fmuellner
- gcampax
- null4bl3
