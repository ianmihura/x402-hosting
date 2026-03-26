import nock from 'nock';

nock.enableNetConnect('127.0.0.1');

process.env.RECEIVE_WALLET_ADDRESS = '0x0000000000000000000000000000000000000000';
process.env.FACILITATOR_URL = 'http://localhost:3000';
process.env.R2_ENDPOINT = 'http://localhost:4566';
process.env.R2_ACCESS_KEY_ID = 'test';
process.env.R2_SECRET_ACCESS_KEY = 'test';
process.env.NODE_ENV = 'test';

// Mock facilitator initialization
nock('http://localhost:3000')
  .persist()
  .get('/supported')
  .reply(200, {
    kinds: [
      {
        x402Version: 2,
        scheme: 'exact',
        network: 'eip155:8453'
      }
    ],
    extensions: ['sign-in-with-x'],
    signers: {
      eip155: []
    }
  });
