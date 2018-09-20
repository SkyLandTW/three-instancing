Runtime Dependencies
====================

```bash
npm install -g @babel/standalone
```


Development Dependencies
========================

Grab all libs:

```bash
pushd lib
.update.bat
popd

pushd webfonts
.update.bat
popd
```

Grab all typings:

```bash
npm install
```


Development Checkings
=====================

Sync *runBabel.js* with *tsconfig.json*

Note typescript files (.tsx) are compiled by Babel not TypeScript compiler.
They might not confirm to standard TypeScript setup (lib issues etc).


Execute
=======

files under wwwroot are reloaded automatically. No need to re-build for views.