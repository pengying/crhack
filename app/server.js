/*
 * Copyright (c) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Authors: Eric Bidelman <ericbidelman@chromium.org>
 */

// Dependencies.
var http = require('http');
var https = require('https');
var fs = require('fs');
var opts = require('opts');
var url = require('url');
var mime = require('mime');
var sys = require('sys');

var formidable = require('formidable');
var sio = require('socket.io');

// Server global defaults.
var host = 'localhost';
var port = 5103;

// Parse command-line arguments
var options = [{
  short: 'p',
  long: 'port',
  description: 'Port to serve content on',
  value: true,
  callback: function(value) {
    port = value;
  }
}, {
  short: 'h',
  long: 'host',
  value: true,
  description: 'Host to serve content on',
  callback: function(value) {
    host = value;
  }
}];
opts.parse(options);

mime.define({
  'application/x-chrome-extension': ['crx'], // Chrome Extensions / Apps
  'text/cache-manifest': ['.appcache', '.mf'] // Appcache manifest file.
});


function Server() {
  var self = this;
  this.server = http.createServer(this.onRequest.bind(this));
  this.server.listen(port, host);

  this.playingFile = null;

  var io = sio.listen(this.server);
  io.set('log level', 1);

  // Global state.
  var users = {};
  var djs = [];
  var currentDj = 0;
  var lastChunkReceived = 0;

  var nextDj = function() {
    if (currentDj >= djs.length - 1) {
      currentDj = 0;
    } else {
      currentDj += 1;
    }
  };

  this.getCurrentDjSocket = function() {
    return djs[currentDj] || null;
  };

  var removeDj = function(socket) {
    for (var i = 0, dj; dj = djs[i]; ++i) {
      if (dj.id == socket.id) {
        djs.splice(i, 1);
        console.log('Num djs:' + djs.length);
        return;
      }
    }
  };
  
  var addDj = function(socket) {
    console.log("New audio socket connected: " + socket.id);
    djs.push(socket);
    console.log('Num djs:' + djs.length);
  };

  var checkAndPlayNextSong = function() {
    if (lastChunkReceived < Date.now()-3000) {
      nextDj();
      var djSocket = self.getCurrentDjSocket();
      if (djSocket) {
        djSocket.emit('start');
      }
    }
  };

  //setInterval(checkAndPlayNextSong, 3000);

  var chat = io.of('/chat').on('connection', function(socket) {
    
    socket.json.emit('userlist', {senderID: socket.id, users: users});

    socket.on('setnickname', function(data) {

      socket.set('profileid', data.id, function() {
        users[data.id] = data;

        chat.json.emit('newuser', {
          senderID: socket.id,
          displayName: data.displayName,
          profileId: data.id,
          users: users
        }); // broadcast
        //socket.json.emit('newuser', {nickname: nickname, users: users});
      });
    });

    socket.on('chat', function(data) {
      socket.get('profileid', function(err, profileId) {
        //socket.json.emit('chat', {msg: msg, nickname: nickname});

        chat.json.emit('chat', {
          senderID: socket.id,
          msg: data.msg, 
          displayName: users[profileId].displayName, // TODO(ericbidelman): Use data.displayName instead from client?
          profileId: profileId
        });

      });
    });

    socket.on('disconnect', function() {
      //djs.splice(djs.indexOf(socket), 1);
      socket.get('profileid', function(err, profileId) {
        var tmpUser = users[profileId];

        delete users[profileId];

        //socket.json.emit('userleft', {nickname: nickname, users:users});

        chat.json.emit('userleft', {
          senderID: socket.id,
          displayName: tmpUser.displayName,
          profileId: profileId,
          users: users
        });

      });
    });
  });


  var audio = io.of('/audio').on('connection', function(socket) {

    addDj(socket);

    // TODO(ericbidelman): Remove. This only allows the first connector to play.

console.log('mysocket:' + socket.id, 'djsocket:' + self.getCurrentDjSocket().id)

    if (self.getCurrentDjSocket().id == socket.id) {
      socket.json.emit('start', {
        djSocketId: self.getCurrentDjSocket().id
      });
    }

console.log('playingfile:', self.playingFile)

    // Already a song playing? Tell this socket to start playing it.
    if (self.playingFile) {
     socket.json.emit('songplaying', {
        senderID: socket.id,
        file: self.playingFile
      });
    }

    socket.on('chunk', function(data) {
      console.log('GOT CHUNK - ' + Date.now());
      lastChunkReceived = Date.now();
    });

    socket.on('disconnect', function() {
      var currentDjSocket = self.getCurrentDjSocket();

      removeDj(socket);
      nextDj();

      var nextDjSocket = self.getCurrentDjSocket();

      if (nextDjSocket == null) {
        self.playingFile = null;
      } else if (currentDjSocket.id == socket.id) { // Current DJ leaves room.
        self.playingFile = null; // New connectors should hear nothing.

         // Tell next dj it's their turn.
        audio.sockets[nextDjSocket.id].json.emit('start', {
          djSocketId: nextDjSocket.id
        });
      }
    });

    socket.on('nextuser', function(data) {
      nextDj();

      var nextDjSocket = self.getCurrentDjSocket();

      self.playingFile = null; // New connectors should hear nothing.

       // Tell next dj it's their turn.
      audio.sockets[nextDjSocket.id].json.emit('start', {
        djSocketId: nextDjSocket.id
      });
    });

    socket.on('songready', function(data) {
      data.djSocketId = socket.id;
      audio.json.emit('startsong', data); // broadcast
    });

    socket.on('getcurrenttimestamp', function(data) {
      //data.djSocketId = socket.id;
      //audio.json.emit('timestamp', data); // broadcast
console.log('getcurrenttimestamp', self.getCurrentDjSocket().id)
      audio.clients[self.getCurrentDjSocket().id].send('getcurrenttimestamp', 'plz');
    });


  });
  this.audio = audio;

  console.log('Starting server at http://' + host + ':' + port + '...');
}

const TMP_FOLDER = 'tmp'; // Move into prototype

Server.prototype = {

  onRequest: function(req, res) {
    var path = this.getPath(req.url);
    var ext = this.getFileExtension(path);

    // Handler for serving song upload temp url.
    if (path.indexOf('/upload/' + TMP_FOLDER) == 0) {
      var rewrittenPath = (__dirname + path).replace('/upload', '');
      this.sendFile(res, rewrittenPath, ext);
      return;
    }

    switch (path) {
      case '/':
        this.sendFile(res, __dirname + '/index.html', '.html');
        // TODO(smus): Swap comments to serve dj app:
        //this.sendFile(res, __dirname + '/../index.html', '.html');
        this.sendFile(res, __dirname + '/index.html', '.html');
        break;
      case '/upload':
        var audio = this.audio;
        var server = this;

        server.playingFile = null; // reset

        var form = new formidable.IncomingForm();
        form.parse(req, function(err, fields, files) {
          res.writeHead(200, {'content-type': 'application/javascript'});
          //res.write('received upload:\n\n');
          //res.end(sys.inspect({fields: fields, files: files}));

          // TODO(ericbidelman): need to make /tmp directory if it doesn't exist.
          var file = files.file;
          var baseDir = [__dirname, TMP_FOLDER].join('/');
          var path = [__dirname, TMP_FOLDER, file.path.substring(file.path.lastIndexOf('/') + 1)];
          var ext = server.getFileExtension(file.name);

          // Remove any previous uploads.
          var files = fs.readdirSync(baseDir);
          files = files.filter(function(entry, i) {
           return entry.indexOf('.') != 0;
          });
          for (var i = 0, filePath; filePath = files[i]; ++i) {
            fs.unlinkSync(baseDir + '/' + filePath);
          }

          fs.rename(file.path, path.join('/') + ext, function(err) {
            if (err) {
              res.end('Error: Could not write file.' + err.toString());
              return;
            }

            server.playingFile = {
              djSocketId: server.getCurrentDjSocket().id,
              url: [req.url, path[1], path[2]].join('/') + ext,
              size: file.size,
              name: file.name
            };

            audio.json.emit('uploadcomplete', server.playingFile);
          });

        });
        break;
      case '/chat.html':
        this.sendFile(res, __dirname + '/chat.html', '.html');
        break;
      case '/proxy':
        this.proxy(req, res);
        break;
      case '/buy':
        var id = "00790225735776612440";
        var secret = "enAElg5OLqEDdzRbpKAtIA";
        var postData = ""
        req.addListener("data", function(chunk){postData += chunk});
        req.addListener("end", function(){
          var item = {
            "iss" : id,
              "aud" : "Google"
              "typ" : "google/payments/inapp/item/v1",
              "exp" : Date.now(),
              "iat" : Date.now() + 1000000,
              "request" :{
                "name" : "Avatar",
                "description" : "Avatar",
                "price" : "3.00",
                "currencyCode" : "USD"
              };
          };
        });
        break;
      default:
        // TODO(smus): Swap comments to serve dj app:
        //this.sendFile(res, __dirname + '/..' + path, ext);
        this.sendFile(res, __dirname + path, ext);
    }
  },


  /**
   * Implements a proxy that takes two GET params:
   */
  proxy: function(request, response) {
    var params = this.parseParams(request.url);
    var accessToken = params.accessToken;
    var urlInfo = this.parseUrl(params.url);
    var options = {
      host: urlInfo.host,
      port: urlInfo.port,
      path: urlInfo.path,
      method: 'GET',
      headers: {
        Authorization: 'OAuth ' + accessToken
      }
    };

    response.writeHead(200, {'content-type': 'application/json'});
    var proxyRequest = https.request(options, function(proxyResponse) {
      //console.log('STATUS: ' + proxyResponse.statusCode);
      //console.log('HEADERS: ' + JSON.stringify(proxyResponse.headers));
      proxyResponse.setEncoding('utf8');
      proxyResponse.on('data', function (chunk) {
        //console.log('BODY: ' + chunk);
        response.write(chunk);
      });
      proxyResponse.on('close', function() {
        response.end();
      });
    });

    proxyRequest.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

    // write data to request body
    proxyRequest.end();
  },

  /**
   * Return {k:v, l:w} given http://foo.com/bar?k=v&l=w
   */
  parseParams: function(u) {
    var out = {};
    var query = url.parse(u).query;
    if (query) {
      query.split('&').forEach(function(param) {
        var kv = param.split('=');
        out[kv[0]] = kv[1];
      });
    }
    return out;
  },

  /**
   * Return {host: host.com, path: foo} given http://host.com/foo
   */
  parseUrl: function(u) {
    var regex = /(https?):\/\/(.*?)(\/.*)/;
    var match = u && u.match(regex);
    var scheme = match[1];

    return match && {
      host: match[2],
      path: match[3],
      port: scheme === 'http' && 80 || 443
    } || {};
  },

  onWebSocketConnection: function(socket) {
  },

  onWebSocketDisconnect : function() {
  },


  sendFile : function(res, path, ext) {
    var self = this;
    var contenttype = mime.lookup(ext);

    fs.readFile(path, function(err, data) {
      if (err) {
        self.send404(res);
        return;
      }

      var headers = {
        'Content-Type': contenttype
      };

      if (ext == '.less') {
        var less = require('less');
        less.render(data.toString(), function(err, cssOutput) {
          if (err) {
            console.error(err);
            return;
          }
          res.writeHead(200, {
            'Content-Type': 'text/css'
          });
          res.write(cssOutput, 'utf8');
          res.end();
        });
      } else if (ext == '.ogv') {
        headers['Content-Length'] = data.length;
        headers['Accept-Ranges'] = 'bytes';
        res.writeHead(200, headers);
        res.write(data);
        res.end();
      } else {
        res.writeHead(200, {
          'Content-Type': contenttype
        });
        res.write(data, 'utf8');
        res.end();
      }
    });

  },

  send404 : function(res) {
    res.writeHead(404);
    res.write('404');
    res.end();
  },

  getFileExtension : function(path) {
    var ext = '.html';
    var parts = path.split('.');
    if (parts.length > 1) {
      ext = '.' + parts[parts.length - 1];
    }
    return ext;
  },

  getPath : function(rawurl) {
    var path = url.parse(rawurl).pathname;
    if (path.lastIndexOf('/') == path.length - 1) {
      path += 'index.html';
    }
    return path;
  }
};

var server = new Server();


