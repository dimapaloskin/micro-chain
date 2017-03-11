const { URL } = require('url');
const { resolve } = require('path');
const micro = require('micro');
const getRawBody = require('raw-body');
const getPort = require('get-port');
const fullUrl = require('full-url');
const doRequest = require('./chain-request');

module.exports = opts => {
  const mod = (typeof opts.micro === 'function') ? opts.micro : require(resolve(opts.micro));
  let isReady = false;
  let port;

  getPort()
    .then(p => {
      port = p;
      micro(mod).listen(port, err => {
        if (err) {
          console.error(err);
          process.exit(1);
        }

        isReady = true;
      });
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });

  return async (req, res) => {
    const originalBody = await getRawBody(req);
    let body = originalBody;

    if (!isReady) {
      return micro.send(res, 503, 'Service Unavailable');
    }

    if (opts.chain &&
      (!opts.location || (opts.location.test(req.url)))
    ) {
      try {
        for (let link of opts.chain) {
          let bodyToSend = body;
          if (link.transformRequestBody) {
            bodyToSend = link.transformRequestBody(bodyToSend);
            if (typeof bodyToSend === 'object' && !(bodyToSend instanceof Buffer)) {
              bodyToSend = JSON.stringify(bodyToSend);
            }
          }

          const result = await doRequest(req, (link.sendOriginalBody ? originalBody : bodyToSend), link);
          const allowedStatuses = link.allowedStatuses || [200];

          if (!allowedStatuses.includes(result.statusCode)) {
            return micro.send(res, result.statusCode, result.body);
          }

          if (typeof link.transformResponseBody === 'function') {
            result.body = link.transformResponseBody(result.body);
            if (typeof result.body === 'object') {
              result.body = JSON.stringify(result.body);
            }
          }

          if (link.mergeJson) {
            try {
              body = Object.assign({}, JSON.parse(body), JSON.parse(result.body));
              body = JSON.stringify(body);
            } catch (err) {}
          }
        }
      } catch (err) {
        console.error(err);
        throw micro.createError(500, 'Internal Server Error');
      }
    }

    const full = new URL(fullUrl(req));
    full.port = port;

    const originalRequest = await doRequest(req, body, { target: full.toString(), isOriginal: true });

    for (let key in originalRequest.headers) {
      if ({}.hasOwnProperty.call(originalRequest.headers, key)) {
        res.setHeader(key, originalRequest.headers[key]);
      }
    }

    micro.send(res, originalRequest.statusCode, originalRequest.body);
  };
};
