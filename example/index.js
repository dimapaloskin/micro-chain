const chain = require('./../lib');

const options = {
  micro: './app.js',
  location: /\/public$/,
  chain: [{
    target: '/private'
  }, {
    target: '/auth',
    allowedStatuses: [200],
    mergeJson: true,
    transformRequestBody: body => {
      body = JSON.parse(body);
      delete body.password;
      return body;
    },
    transformResponseBody: body => {
      body = JSON.parse(body);
      delete body.email;
      return body;
    }
  }, {
    target: 'https://ping.pong.global',
    mergeJson: true
  }, {
    target: 'http://date.jsontest.com',
    mergeJson: true
  }]
};

module.exports = chain(options);
