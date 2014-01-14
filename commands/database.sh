## NEW WINDOW, START DB AND CLIENT
path='/Users/brian.kenny/Dropbox/ganjazoid2'
osascript   -e "tell application \"Terminal\" to do script \"zoid; mongod --dbpath=$path/data/db;\""
osascript   -e "tell application \"Terminal\"" -e "tell application \"System Events\" to keystroke \"t\" using {command down}" -e "tell application \"Terminal\" to do script \"mongo;\"" > /dev/null