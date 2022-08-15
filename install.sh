wget 'https://www.rarlab.com/rar/rarlinux-x64-612.tar.gz'
tar -zxvf rarlinux-x64-612.tar.gz
cd rar
cp -v rar unrar /usr/local/bin/
cd && rm -rf 'rarlinux-x64-612.tar.gz'
