#!/bin/bash

SERVER=3.16.26.248:5000

DIST_NAME=stream

make build-container && \
    podman tag localhost/parsegraph-$DIST_NAME:latest $SERVER/parsegraph-$DIST_NAME && \
    podman push $SERVER/parsegraph-$DIST_NAME
