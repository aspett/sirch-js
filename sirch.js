var irc           = require('irc');
var readline      = require('readline');
var elasticsearch = require('elasticsearch');
var fs            = require('fs');
var moment        = require('moment');

var elastic = elasticsearch.Client({
  host: 'localhost:9200',
});

var config = {
  server: 'irc.server.com',
  port: 6667,
  nick: 'Nick',
  user: 'Nick',
  real: 'Nick',
  channels: ['#lobby'],
  ssl: false,
  ssl_invalid_certs: false,
  debug: false,
  znc_username: 'User',
  znc_password: 'Pass'
}

elastic.ping({
  requestTimeout: 30000,
  hello: "elasticsearch!"
}).then(function(response) {
  console.log("Elasticsearch is up!");
  client.connect();
}, function(error) {
  console.log("Elasticsearch is down:");
  console.log(error);
});

var client = new irc.Client(config.server, config.nick, {
  userName: config.user,
  realName: config.real,
  channels: config.channel,
  port: config.port,
  secure: config.ssl,
  autoConnect: false,
  selfSigned: config.ssl_invalid_certs,
  certExpired: config.ssl_invalid_certs,
  debug: config.debug
});

var playback_complete = false;

client.addListener('raw', function(message) {
  if(message.prefix === 'irc.znc.in' && message.args[0] == 'AUTH') {
    client.send("PASS", config.znc_username + ":" + config.znc_password);
  }
  else if(message.command == 'PING') {
    client.send("PONG", message.args);
  }
});

client.addListener('error', function(message) {
  console.log("ERROR");
  console.log(message);
});

client.addListener('message', function(nick, to, text, message) {
  if(message.prefix === '***!znc@znc.in') {
    if(message.args[1] === 'Playback Complete.') {
      playback_complete = true;
    }
  }
  else if(playback_complete){
    if(message.args[1][0] == '[') throw "nope";
    console.log(message);
    elastic.create({
      index: 'sirch_development',
      type: 'message',
      body: {
        prefix: message.prefix,
        nick: message.nick,
        user: message.user,
        host: message.host,
        command: message.command,
        to: message.args[0],
        message: message.args[1],
        datetime: moment().format()
      }
    }).then(function(response) {
      // console.log("Elastic Success");
      // console.log(response);
    },
    function(error) {
      console.log("ELASTIC ERROR");
      console.log(error);
    });
  }
});

client.connect(3, function(opts) {
  console.log(opts);
});
console.log("Connect!");

consoleread = readline.createInterface(process.stdin, process.stdout);
var getinput = function(input) {
  args = input.split(" ");
  who = args.shift();
  if(who !== undefined) {
    client.say(who, args.join(" "));
  }
  consoleread.question(" > ", getinput);
}
consoleread.question(" > ", getinput);
