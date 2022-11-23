#!/bin/bash
while true; do
    make build-prod SITE_URL=$SITE_URL SITE_PORT=$SITE_PORT &
    make wait
done
