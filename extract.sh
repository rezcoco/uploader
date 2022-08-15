fullpath="$1"
dir="$2"
unrar x "$fullpath" "$dir" -pmrcong.com -y &
sleep(1)
rm -rf "$fullpath"
