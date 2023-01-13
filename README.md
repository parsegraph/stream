# parsegraph-stream

This project builds a client-side library to receive Parsegraph server events
and update a local graph accordingly. It also allows for the client to callback
the server based on graph interaction.

This module allows live updates from a Parsegraph server to multiple connected
clients.

It also contains a server used to stream Parsegraph server events.

## The problem

Parsegraph applications can be written solely on the client, with callbacks
embedded in the application. However, it becomes challenging to add sharing of
the Parsegraph environment to other users, because updates to the graph must be
maintained.

Parsegraph stream inverts this problem by making all graph updates come from
the server. It provides means to add callbacks to the graph, completing a
round-trip of serving an initial graph, letting the user invoke graph actions,
and sending graph updates back to the client once the callback is complete.

## How to use

Run a server, either locally or within a container, and navigate to /. You
should see a Parsegraph client. This will show the Parsegraph for the content
root. The content root is set by the CONTENT_ROOT environment variable.

## Hosting a container

The container will run the demo server.

    make build-container
    docker run --net bridge --name parsegraph -e SITE_HOST=0.0.0.0 -e CONTENT_ROOT=/usr/src --expose 3000 -p=127.0.0.1:15000:3000/tcp localhost/parsegraph-stream:latest

# interface ParsegraphServer

A Parsegraph server manages a collection of proxy Parsegraph objects, and is
able to stream changes to those Parsegraph objects to callbacks.

## server.setCallbackUrl(callbackUrl: string): void
Sets the callback URL used by the server

## server.connect(cb:(...args: any) => void): () => void
Stream server events as arguments back to the given callback.

## server.forEach(cb:(...args: any) => void): void
Send all saved server events back to the given callback.

## server.callback(callbackIndex: number, val?: any): void
Invokes the server callback

## server.state(): ParsegraphServerState
Returns the server state.

# interface ParsegraphServerState

The Parsegraph server state contains the current state of the Parsegraph, and provides methods
to update the state using Parsegraph proxy objects.

## server.state().setBackgroundColor(r:number, g:number, b:number, a:number): void
Sets the background color in RGBA space. Numbers are expected to be in range [0, 1].

## server.state().newCaret(type?: any): ParsegraphCaret
Returns a Parsegraph caret, using the given type as the initial value of the caret root node.

## server.state().setRoot(n: ParsegraphNode): void
Sets the root to the given Parsegraph node.

# script.js module methods

These are the two methods imported from script.js, used to create new ParsegraphServers.

## streamPath(mainPath: string, subPath: string): ParsegraphServer
Returns a Parsegraph server designed for streaming and callbacks.

A new Parsegraph streaming server is launched for the subPath if necessary.

* mainPath - the contentRoot.
* subPath - the URL part specific to the stream.

## servePath(mainPath: string, subPath: string): ParsegraphServer
Returns a Parsegraph server designed for caching.

A new Parsegraph server is launched for the subPath if necessary.

* mainPath - the contentRoot.
* subPath - the URL part specific to the stream.

# API Endpoints

## GET /testroute: text/plain endpoint
health check.

Responds 200 with "testroute from server" on success.

## GET /parsegraph/(.*): EventStream endpoint
Connect to a Parsegraph streaming server named by the URL and stream
Parsegraph events back to the client.

## GET /events/(.*) EventStream endpoint
Content to a Parsegraph server named by the URL and stream
Parsegraph events back to the client.

## GET /graph/(.*) text/plain endpoint
Connects to a Parsegraph server and writes all saved events back to
the client, and close the connection.

## GET /raw/(.*) Raw content
Stream raw content from the given path, under the content root.

## POST /callback/(.*)?cb=123 JSON request

Finds a Parsegraph streaming server named by the URL, and calls callback by
index, passing the request body as the argument.

The cb query parameter is the callback index.

* Responds 500 on server error
* Responds 200 on success

## POST /splice/(.*) JSON request
Takes a JSON request of the following form:

    interface SpliceRequest {
        offset: number;
        len: number;
        val: string;
    }

And splices val in the file at the named subPath, under the content
root. Both the Parsegraph servers and streaming server are replaced.

* Responds 200 if the splice is successful.
* Responds 500 on server error
* Responds 400 if the offset or len are NaN.
