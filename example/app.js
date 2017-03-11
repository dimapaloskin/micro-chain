const { json } = require('micro');

module.exports = async req => {
  const uri = req.url;
  switch (uri) {
    case '/auth': {
      return { id: '123', username: 'paloskin', email: 'dima@paloskin.me' };
    }
    case '/private': {
      return { message: 'Nice to see you :)' };
    }
    case '/public': {
      const body = await json(req);
      return Object.assign({}, body, { final: true });
    }
    default:
      return { message: 'hi' };
  }
};
