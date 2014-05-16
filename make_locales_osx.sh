#!/bin/sh -e

BUILD_OFFICIAL=1

ln -sf mozconfig-nodebug-osx .mozconfig

version=`cat celtx/config/version.txt`

for locale in "$@"
do
  rm -rf ../objdir/*/dist
  sed "s/%LOCALE%/$locale/" mozconfig-nodebug-osx.in > mozconfig-nodebug-osx
  make -f client.mk build
  hdiutil attach ~/Development/Celtx.dmg
  rm -rf /Volumes/Celtx/Celtx.app/Contents
  cp -RL ../objdir/ppc/dist/universal/celtx/Celtx.app/Contents /Volumes/Celtx/Celtx.app/Contents
  hdiutil detach /Volumes/Celtx
  hdiutil convert -format UDZO -o ~/Development/Release/Celtx-$version-$locale.dmg ~/Development/Celtx.dmg
done

