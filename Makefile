DIST_NAME = stream

SCRIPT_FILES = \
	src/ParsegraphStream.ts \
	src/demo.ts \
	src/index.ts \
	test/test.ts

EXTRA_SCRIPTS =

app:
	CONTENT_ROOT=`pwd` npx electron ./electron
.PHONY: app

include ./Makefile.microproject
