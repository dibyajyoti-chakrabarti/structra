const JSONWebKey = require('json-web-key');
const jwt = require('jsonwebtoken');
const {
  GITHUB_CLIENT_ID,
  JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY,
} = require('./config');
const logger = require('./connectors/logger');

const KEY_ID = 'jwtRS256';

// Upstream embedded the RSA keypair into the webpack bundle via raw-loader
// (require('../jwtRS256.key')). That made the deployed artifact the only copy
// of the signing key: unbuildable from source and unrecoverable if the account
// holding it was lost, which is exactly what happened to the previous deploy.
//
// The keys are now ordinary runtime config, injected from Terraform. The bundle
// is reproducible from this repo and holds no secret.
const requireKey = (value, name) => {
  if (!value) {
    throw new Error(
      `Environment variable ${name} must be set. It is a PEM-encoded RSA key supplied by Terraform.`
    );
  }
  return value;
};

module.exports = {
  getPublicKey: () => ({
    alg: 'RS256',
    kid: KEY_ID,
    ...JSONWebKey.fromPEM(requireKey(JWT_PUBLIC_KEY, 'JWT_PUBLIC_KEY')).toJSON(),
  }),

  makeIdToken: (payload, host) => {
    const enrichedPayload = {
      ...payload,
      iss: `https://${host}`,
      aud: GITHUB_CLIENT_ID,
    };
    logger.debug('Signing payload %j', enrichedPayload, {});
    return jwt.sign(enrichedPayload, requireKey(JWT_PRIVATE_KEY, 'JWT_PRIVATE_KEY'), {
      expiresIn: '1h',
      algorithm: 'RS256',
      keyid: KEY_ID,
    });
  },
};
