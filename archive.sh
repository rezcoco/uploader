filename="$1"
filepath="$2"

cd "$(dirname "$filepath")" || exit
rar a "$filename" "$filepath" -y
