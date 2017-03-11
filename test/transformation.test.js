import test from 'ava';
import rq from 'request-promise';
import ip from 'ip';
import { json } from 'micro';
import { createSimple, createChain } from './utils';

const ports = {
  first: undefined,
  second: undefined,
  third: undefined
};

test.before(async () => {
  ports.first = await createSimple(async req => {
    const body = await json(req);
    if (body.deleteThisProp) {
      throw new Error('should receive modified body');
    }
    return Object.assign(body, { first: true });
  });

  ports.second = await createSimple(async req => {
    const body = await json(req);

    if (body.secret) {
      throw new Error('should receive original body');
    }

    return Object.assign(body, { second: true });
  });

  ports.third = await createSimple(async req => {
    const body = await json(req);
    return Object.assign(body, { third: true, message: 'Alloha!' });
  });
});

test('should build chain and make all transforms correct', async t => {
  const config = {
    micro: async req => {
      const body = await json(req);
      return body;
    },
    chain: [{
      target: `${ip.address()}:${ports.first}`,
      mergeJson: true,
      transformRequestBody: body => {
        body = JSON.parse(body);
        body.message = 'Hey!';
        delete body.deleteThisProp;
        return body;
      },
      transformResponseBody: body => {
        body = JSON.parse(body);
        body.secret = 'javascript cat';
        return body;
      }
    }, {
      target: `${ip.address()}:${ports.second}`,
      sendOriginalBody: true
    }, {
      target: `${ip.address()}:${ports.third}`,
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
      id: 1,
      message: 'hello',
      deleteThisProp: true
    }
  });

  t.false({}.hasOwnProperty.call(response, 'second'));
  t.deepEqual(response, {
    id: 1,
    deleteThisProp: true,
    message: 'Alloha!',
    first: true,
    third: true,
    secret: 'javascript cat'
  });

  t.true(true);
});
