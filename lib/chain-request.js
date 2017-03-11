const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const Promise = require('bluebird');
const typer = require('media-typer');
const bl = require('bl');
const fullUrl = require('full-url');
const ip = require('ip');

module.exports = (req, body, {
  target,
  useSearchQuery = false,
  isOriginal = false
} = {}) => {
  return new Promise((resolve, reject) => {
    const type = req.headers['content-type'];
    const encoding = (type) ? typer.parse(type).parameters.charset : undefined;

    const full = fullUrl(req);
    const parsedOriginal = url.parse(full);

    if (!target.startsWith('http:') && !target.startsWith('https:') && !target.startsWith('/')) {
      target = `${parsedOriginal.protocol}//${target}`;
    }

    const parsedTarget = url.parse(target);
    if (!parsedTarget.protocol) {
      parsedTarget.protocol = parsedOriginal.protocol;
    }

    // Don't DOS Yourself!
    if (!parsedTarget.hostname) {
      const p = url.parse(full);
      parsedTarget.hostname = p.hostname;
      parsedTarget.port = p.port;
    }

    const headers = Object.assign({}, req.headers, {
      host: parsedTarget.host || parsedOriginal.host
    });

    if (body && body.length !== 0) {
      headers['content-length'] = body.length;
    } else if (headers['content-length']) {
      delete headers['content-length'];
    }

    let resolvedUrl = parsedTarget.path;
    if (useSearchQuery) {
      const queryObj = Object.assign({}, querystring.parse(parsedTarget.query), querystring.parse(parsedOriginal.query));
      resolvedUrl = url.format({
        pathname: parsedTarget.pathname,
        search: querystring.stringify(queryObj)
      });
    }

    const requestOptions = {
      protocol: isOriginal ? 'http:' : parsedTarget.protocol,
      hostname: isOriginal ? ip.address() : parsedTarget.hostname,
      port: parsedTarget.port || ((parsedTarget.protocol === 'http:') ? 80 : 443),
      path: resolvedUrl,
      method: req.method,
      headers
    };

    const request = (requestOptions.protocol === 'https:' ? https : http).request(requestOptions, res => {
      res.setEncoding(encoding);
      res.pipe(bl((err, body) => {
        if (err) {
          return reject(err);
        }

        resolve({
          body,
          statusCode: res.statusCode,
          headers: res.headers
        });
      }));
    });

    request.on('error', err => {
      reject(err);
    });

    request.on('abort', request.abort);

    if (body) {
      request.write(body);
    }

    request.end();
  });
};
