function Chatter(selector) {
  var self_ = this;
  var container_ = document.querySelector(selector);
  var chatLog_ = null;
  var messageInput_ = null;

  var socket_ = null;
  var nicknameInput_ = container_.querySelector('input[name="nickname"]');
  var profileId_ = container_.querySelector('input[name="profileid"]');
  var loginButton_ = container_.querySelector('[data-type="login"]');

  var chattersList_ = null;

  var chatBeep_ = new Audio();
  chatBeep_.volume = 0.3;
  chatBeep_.src = 'sounds/click.wav';
  chatBeep_.load();

  var userSignInSound_ = new Audio();
  userSignInSound_.volume = 0.3;
  userSignInSound_.src = 'sounds/DingLing.wav';
  userSignInSound_.load();

  window.addEventListener('message', function(e) {
    if (e.origin == document.location.origin) {
      var data = e.data;
      if (e.action == 'changeAvatar'){// Handle avatar change
        self_.changeAvatar(e.data);
      } else if (data.displayName) { // New user. Set their data.
        nicknameInput_.value = data.displayName;
        profileId_.value = data.profileId;
        doLogin_(data);
      }
    }
  }, false);
  
  nicknameInput_.addEventListener('keypress', function(e) {
    if (e.keyCode == 13) {
      e.preventDefault();
      e.stopPropagation();
      loginButton_.click();
      loginButton_.focus();
    }
  }, false);

  var log_ = function(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    chatLog_.appendChild(div);
    chatLog_.scrollTop = chatLog_.scrollHeight;
  };

  var isMe_ = function(id) {
    return id == parseInt(socket_.socket.sessionid);
  };

  var updateChattersList_ = function(users, opt_addDancers) {
    var addDancers = opt_addDancers || false;

    // Sort user displayName alphabetically.
    var sortUsers = function(o) {
       var a = [];
       for (var i in o) {
         if (o.hasOwnProperty(i)) {
           a.push([i, o[i]]);
         }
       }
       a.sort(function(a, b) { return a[1].displayName < b[1].displayName ? 1 : -1; })
       return a;
    };

    users = sortUsers(users);

    if (addDancers) {
      for (var i = 0, user; user = users[i]; ++i) {
        window.parent.visualizer.addDancer(
            '#dance-floor .dudes-container', user[1].id, user[1].image.url, 64, 64);
      }
    } else {
      var fragment = document.createDocumentFragment();
      for (var i = 0, user; user = users[i]; ++i) {
        var li = document.createElement('li');
        li.innerHTML = '<span data-nickname="' + user[1].displayName + '">' +
                       user[1].displayName + '</span>';
        fragment.appendChild(li);
      }

      chattersList_.innerHTML = '';
      chattersList_.appendChild(fragment);
    }

  };

  var doLogin_ = function(data) {
    if (!socket_) {
      socket_ = io.connect(document.location.origin + '/chat');

      socket_.on('connect', function(e) {
        console.log('== CHAT CONNECTED');
        document.getElementById("login-panel").classList.add("hidden");
        container_.querySelector('[data-connection]').dataset.connection = 'connected';
      });

      // I'm send this when first connecting to populate avatars on the dance floor.
      socket_.on('userlist', function(data) {
        updateChattersList_(data.users, true);
      });

      socket_.on('newuser', function(data) {
        log_('<span data-nickname="' + data.displayName + '">' +
             data.displayName + '</span> joined the room.');
        userSignInSound_.load();
        userSignInSound_.play();
        updateChattersList_(data.users);
        if (!isMe_(data.senderID)) {
          window.parent.visualizer.addDancer(
              '#dance-floor .dudes-container', data.profileId,
              data.users[data.profileId].image.url, 64, 64);
        }
      });
      

      //Propagate Avatar update
      socket_.on('changeAvatar', function(data){
        log_('<span data-nickname="' + data.displayName + '">' + 
          data.displayName + '</span>: changed their avatar');
          window.parent.app.updateAvatar(data);
      });
      
      socket_.on('chat', function(data) {
        log_('<span data-nickname="' + data.displayName + '">' +
             data.displayName + '</span>: ' + data.msg);
        window.parent.postMessage(data, document.location.origin);
        chatBeep_.load();
        chatBeep_.play();
      });

      socket_.on('userleft', function(data) {
        log_('<span data-nickname="' + data.displayName + '">' +
             data.displayName + '</span> left the room.');
        updateChattersList_(data.users);
        window.parent.visualizer.removeDancer(data.profileId);
      });

      socket_.on('error', function(e) {
        console.log(e);
      });

      socket_.on('disconnect', function(e) {
        container_.querySelector('[data-connection]').dataset.connection = 'disconnected';
        //document.getElementById("login-panel").classList.remove("hidden");
        messageInput_.disabled = true;
      });

      messageInput_.disabled = false;
    }

    self_.setNickName(data);
  };

  this.setNickName = function(data) {
    /*nicknameInput_.value = nicknameInput_.value.trim();
    if (!nicknameInput_.value) {
      nicknameInput_.value = 'Anonymous' + Date.now();
    }

    //oldNickname_ = nicknameInput_.value;
    nicknameInput_.dataset.oldvalue = nicknameInput_.value;
    //socket_.emit('setnickname', nicknameInput_.value);
    */

    socket_.json.emit('setnickname', data);
    log_('> Welcome <span data-nickname="' + nicknameInput_.value + '">' +
         nicknameInput_.value +
         '</span>! Hang tight while we queue up some music for you.');
  };

  this.sendMsg = function(msg) {
    socket_.emit('chat', msg);
  };

  this.changeAvatar = function(avatar){
    socket_.emit('changeAvatar', avatar)
  }
  
  var init = (function() {
    var fragment = document.createDocumentFragment();

    var input = document.createElement('input');
    input.type = 'text';
    input.name = 'msg';
    input.placeholder = 'Type your message...';
    input.disabled = true;
    input.setAttribute("x-webkit-speech", "x-webkit-speech");
    fragment.appendChild(input);

    var div = document.createElement('div');
    div.classList.add('log');
    chatLog_ = fragment.appendChild(div);

    messageInput_ = input;

    messageInput_.addEventListener('keypress', function(e) {
      if (e.keyCode == 13) {
        e.preventDefault();
        e.stopPropagation();

        if (!messageInput_.value) {
          return;
        }
        self_.sendMsg({msg: messageInput_.value, profileId: profileId_.value});
        messageInput_.value = '';
      };
    }, false);

    container_.querySelector('section:first-of-type').appendChild(fragment);

    loginButton_.onclick = doLogin_;

    chattersList_ = document.createElement('ul');
    container_.querySelector('#chatters').appendChild(chattersList_);

  })();
}

Chatter.prototype = {
  /*get nickname() {
    return nickname_;
  },*/
};