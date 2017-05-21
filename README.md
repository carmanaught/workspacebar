# WorkspaceBar
Gnome Shell Extension for switching workspaces on the panel, forked from mbokil/workspacebar

Changes from the original extension
- Fixed prefs error
- Changed scroll behaviour to 'wrap-around'
- Changed label format to include the workspace name (as per `/org/gnome/desktop/wm/preferences/workspace-names`)
- Changed workspace click event to use an attached workspace ID property instead of using the label text to select the workspace (credit to gcampax)
- Added code to identify workspace with no windows, ignoring windows on all workspaces (credit to null4bl3)
- Added window-create event handling to react to windows being created on unfocused workspaces (again, credit to gcampax)

## Credits
Thanks to these people for some code of theirs that I've used
- gcampax
- null4bl3
