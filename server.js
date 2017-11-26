const express = require('express');
const bodyParser = require('body-parser');
const Pusher = require('pusher');
const sslRedirect = require('heroku-ssl-redirect');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(sslRedirect());
app.use(express.static('./'));

var pusher = new Pusher({
  appId: '432996',
  key: '1877417d412f691c6e86',
  secret:  '54601b39b26bf225af62'
});

app.post('/pusher/auth', function(req, res) {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  const auth = pusher.authenticate(socketId, channel);
  res.send(auth);
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log("App is running on port " + port);
});
