import test from 'ava';
import rq from 'request-promise';
import ip from 'ip';
import { send } from 'micro';
import { createSimple, createChain } from './utils';

let port;
test.before(async () => {
  port = await createSimple(async (req, res) => {
    send(res, 401, 'Unauthorized');
  });
});

test('should handle error and break the chain', async t => {
  const config = {
    micro: async () => {
      t.fail('this code never should executed');
      return { message: 'hello'};
    },
    chain: [{
      target: `${ip.address()}:${port}`
    }]
  };

  const chainPort = await createChain(config);
  const uri = `http://${ip.address()}:${chainPort}/`;

  try {
    return await rq({
      method: 'POST',
      uri,
      json: true,
      body: {
        message: 'hello'
      },
      resolveWithFullResponse: true
    });
  } catch (err) {
    t.is(err.statusCode, 401);
    t.is(err.error, 'Unauthorized');
  }
});

test('should not break the chain if status allowed', async t => {
  const config = {
    micro: async () => {
      return { message: 'hello'};
    },
    chain: [{
      target: `${ip.address()}:${port}`,
      allowedStatuses: [200, 401]
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
