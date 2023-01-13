
`
interface ParsegraphServerState {
    // Sets the background color in RGBA space. Numbers are expected to be in range [0, 1].
    setBackgroundColor(r:number, g:number, b:number, a:number);

    // Returns a Parsegraph caret, using the given type as the initial value of the caret root node.
    newCaret(type?: any): ParsegraphCaret

    // Sets the root to the given Parsegraph node.
    setRoot(n: ParsegraphNode): void
}

interface ParsegraphServer {
    // Sets the callback URL used by the server
    setCallbackUrl(callbackUrl: string)

    // Connects to the server, streaming server events as arguments
    // back to the given callback.
    connect(cb:(...args: any) => void): () => void

    // Send all saved server events back to the given callback.
    forEach(cb:(...args: any) => void): void

    // Invokes the server callback
    callback(callbackIndex: number, val?: any): void

    // Returns the server state.
    state(): ParsegraphServerState
}
`

# streamPath(mainPath: string, subPath: string): ParsegraphServer module method
Returns a Parsegraph server designed for streaming and callbacks.

A new Parsegraph streaming server is launched for the subPath if necessary.

* mainPath - the contentRoot.
* subPath - the URL part specific to the stream.

# servePath(mainPath, subPath): module method
Returns a Parsegraph server designed for caching.

A new Parsegraph server is launched for the subPath if necessary.

* mainPath - the contentRoot.
* subPath - the URL part specific to the stream.

# /testroute: text/plain endpoint
health check.

Responds 200 with "testroute from server" on success.

# GET /parsegraph/(.*): EventStream endpoint
Connect to a Parsegraph streaming server named by the URL and stream
Parsegraph events back to the client.

# GET /raw/(.*) Raw content
Stream raw content from the given path, under the content root.

# GET /events/(.*) EventStream endpoint
Content to a Parsegraph server named by the URL and stream
Parsegraph events back to the client.

# GET /graph/(.*) text/plain endpoint
Connects to a Parsegraph server and writes all saved events back to
the client, and close the connection.

# GET /feed text/plain endpoint
Creates a new Parsegraph server, containing a block with a label,
and writes those events back to the client, and close the
connection.

# GET /service text/plain endpoint
Does the same as /feed

# POST /splice/(.*) JSON request
Takes a JSON request of the following form:

interface SpliceRequest {
    offset: number;
    len: number;
    val: string;
}

And splices val in the file at the named subPath, under the content
root. All servers and streams are replaced.

* Responds 200 if the splice is successful.
* Responds 500 on server error
* Responds 400 if the offset or len are NaN.

# POST /callback/(.*)?cb=123 JSON request

Finds a Parsegraph streaming server named by the URL, and calls callback by
index, passing the request body as the argument.

The cb query parameter is the callback index.

* Responds 500 on server error
* Responds 200 on success
