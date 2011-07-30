## Install
Check your OpenSSL support (openssl list-message-digest-algorithms)
If it does not include SHA256 download new openssl before compiling node

Install node (v0.4.9).
Install [npm](http://github.com/isaacs/npm).
Install packages:
    sudo npm install mime
    sudo npm install opts
    sudo npm install less
    sudo npm install formidable
Install [socket.io](https://github.com/LearnBoost/socket.io):
    sudo npm install socket.io
Install the [TextMate LESS bundle](https://github.com/appden/less.tmbundle).

## Run server:

  node server.js

or with a specific port/hostname:

  node server.js --port 12345 --host localhost
