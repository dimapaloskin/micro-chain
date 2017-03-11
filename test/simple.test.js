import test from 'ava';
import rq from 'request-promise';
import ip from 'ip';
import { json } from 'micro';
import { createSimple, createChain } from './utils';

let port;
test.before(async () => {
  port = await createSimple(async () => {
    return { message: 'middle' };
  });
});

test('should chain correct without body modification', async t => {
  const config = {
    micro: async req => {
      const body = await json(req);
      return body;
    },
    chain: [{
      target: `${ip.address()}:${port}`
    }]
  };

  const chainPort = await createChain(config);
  const uri = `http://${ip.address()}:${chainPort}/`;
  const response = await rq({
    method: 'POST',
    uri,
    json: true,
    body: {
      message: 'hello'
    }
  });

  t.deepEqual(response, {
    message: 'hello'
  });
});

test('should chain correct with merging and modifying original body', async t => {
  const config = {
    micro: async req => {
      const body = await json(req);
      return body;
    },
    chain: [{
      target: `${ip.address()}:${port}`,
      mergeJson: true
    }]
  };

  const chainPort = await createChain(config);
  const uri = `http://${ip.address()}:${chainPort}/`;
  const response = await rq({
    method: 'POST',
    uri,
    json: true,
    body: {
      message: 'hello'
    }
  });

  t.deepEqual(response, {
    message: 'middle'
  });
});

test('should chain correct with body merging', async t => {
  const config = {
    micro: async req => {
      const body = await json(req);
      return body;
    },
    chain: [{
      target: `${ip.address()}:${port}`,
      mergeJson: true
    }]
  };

  const chainPort = await createChain(config);
  const uri = `http://${ip.address()}:${chainPort}/`;
  const response = await rq({
    method: 'POST',
    uri,
    json: true,
    body: {
      account: 'ab'
    }
  });

  t.deepEqual(response, {
    message: 'middle',
    account: 'ab'
  });
});

test('should handle location', async t => {
  const config = {
    location: /\/private/,
    micro: async req => {
      const body = await json(req);
      return body;
    },
    chain: [{
      target: `${ip.address()}:${port}`,
      mergeJson: true
    }]
  };

  const chainPort = await createChain(config);
  const uri = `http://${ip.address()}:${chainPort}`;

  const notHandledResponse = await rq({
    method: 'POST',
    uri: `${uri}`,
    json: true,
    body: {
      message: 'hello'
    }
  });

  t.deepEqual(notHandledResponse, {
    message: 'hello'
  });

  const handledResponse = await rq({
    method: 'POST',
    uri: `${uri}/private`,
    json: true,
    body: {
      message: 'hello'
    }
  });

  t.deepEqual(handledResponse, {
    message: 'middle'
  });
});

test('should mix http and https and chain correct', async t => {
  const config = {
    micro: async req => {
      const body = await json(req);
      return body;
    },
    chain: [{
      target: `${ip.address()}:${port}`,
      mergeJson: true
    }, {
      target: `https://ping.pong.global`,
      mergeJson: true,
      sendOriginalBody: true
    }]
  };

  const chainPort = await createChain(config);
  const uri = `http://${ip.address()}:${chainPort}/`;
  const response = await rq({
    method: 'POST',
    uri,
    json: true,
    body: {
      message: 'ping'
    }
  });

  t.deepEqual(response, {
    message: 'pong'
  });
});
