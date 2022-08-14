filename="$1"
filepath="$2"
echo $filename
echo $filepath
cd "$(dirname "$filepath")" || exit
rar a -df "$filename" "$filepath" -y
