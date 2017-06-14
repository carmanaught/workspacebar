# WorkspaceBar
Gnome Shell Extension for switching workspaces on the panel, forked from mbokil/workspacebar.

This is how the WorkspaceBar looks in action with the current choice of styling. This can be changed in the stylesheet.css if desired.

![WorkspaceBar in action](http://i.imgur.com/zuKqPQx.png)
- The active or current workspace has a blue underline and uses bright white text
- The urgent workspace with a window which is urgent or demands attention has a red underline with red text to draw attention to it
- The inactive worspaces which have a window/application in them have a grey underline and uses light grey text
- The empty workspaces with no window/application in them have no underline and uses dull grey text

This is how the WorkspaceBar looks using the Activity Indicator option and with some indicators in use (thanks to 1k2ka and others who have used the characters). The indicators are  (U+F10C),  (U+F192),  (U+F111) for those interested.

![WorkspaceBar in action with indicators](http://i.imgur.com/owS3gHK.png)

These are the General Settings on the Settings page. These have been changed somewhat from the original settings.

![WorkspaceBar - General Settings](http://i.imgur.com/yit0Z9G.png)

Thse is the Workspace Format settings page which is used to change the settings to change how the workspace labels appear. The format settings are somewhat more extensive and allow a greater degree of customization.

![WorkspaceBar - Workspace Format](http://i.imgur.com/KKqEO5h.png)

This is the Workspace Names settings page which is copied from the the Workspace Indicator extension (attributed in prefs.js) - [Gnome Extensions Page](https://extensions.gnome.org/extension/21/workspace-indicator/) - [Gnome Git](https://git.gnome.org/browse/gnome-shell-extensions/tree/extensions/workspace-indicator).

![WorkspaceBar - Workspace Names](http://i.imgur.com/5N7eVva.png)

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
- Added a tabbed layout with general settings on the first tab, workspace format on the second tab and workspace name editing on the third.
- Added the capability to modify the index position of the box containing the workspace bar along with a switch to enable (capability to change the index defaults to off and index defaults to 0).
- Added switch for 'wrap-around' behaviour to enable or disable (defaults to on).
- Added switch to enable or disable the empty/urgent workspace styling (both default to on).
- Added switches for showing workspace numbers and names (with customizable separator via text entry field)
- Added switch to enable activity indicators (overrides workspace names) with text entry fields for empty/inactive/active workspaces (defaults to off and has no indicators set)
- Added switch to enable borders for activity indicators other than the active workspace, which is always visible (defaults to off)

## Credits
Thanks to mbokil for the original extension and thanks to these people for some code of theirs that I've used
- fmuellner
- gcampax
- null4bl3

Thanks to 1k2ka for the post of a desktop image that prompted me to add workspace indicators as a separate option to workspace labels
