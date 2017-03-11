const Promise = require('bluebird');
const micro = require('micro');
const getPort = require('get-port');
const chain = require('./../dist');

exports.createSimple = fn => {
  return new Promise((resolve, reject) => {
    getPort()
      .then(port => {
        micro(fn).listen(port, err => {
          if (err) {
            return reject(err);
          }
          resolve(port);
        });
      }).catch(reject);
  });
};

exports.createChain = config => {
  return new Promise((resolve, reject) => {
    const chained = chain(config);
    const server = micro(chained);
    const listen = Promise.promisify(server.listen, { context: server });
    getPort().then(p => {
      listen(p)
        .then(() => resolve(p))
        .catch(reject);
    }).catch(reject);
  });
};
