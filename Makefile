DIST_NAME = stream

SCRIPT_FILES = \
	src/index.ts \
	src/service.ts \
	src/app.ts \
	src/feed.ts \
	src/ParsegraphStream.ts \
	src/parseRain.ts \
	src/demo.ts \
	test/test.ts

EXTRA_SCRIPTS =

include ./Makefile.microproject
