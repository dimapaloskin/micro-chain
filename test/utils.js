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

exports.createChain = async config => {
  const chained = chain(config);
  const server = micro(chained);
  const listen = Promise.promisify(server.listen, { context: server });
  const p = await getPort();
  await listen(p);
  return p;
};
