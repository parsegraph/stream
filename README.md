# room

This is for Node projects:

## Hosting a container

    make build-container
    docker run --net bridge --name raintest -e SITE_HOST=0.0.0.0 -e CONTENT_ROOT=/usr/src --expose 3000 -p=10.11.0.2:15000:3000/tcp localhost/parsegraph-stream:latest

## Setup

1. Pick a new package name.

2. Go to https://github.com/parsegraph/ and create a new repository using that name.

3. Clone latest microproject from https://github.com/parsegraph/room

4. Run ./update-package-name.sh with your package name:

<pre>
  # Set the package name to test
  ./update-package-name.sh test
</pre>

5. Commit (e.g. "Give package a name")

6. Push the repository to Github.
