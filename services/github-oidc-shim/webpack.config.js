// Lambda-only build. Upstream also emitted a `dist-web` express server and used
// raw-loader to inline the RSA signing key; we deploy only the five Lambda
// handlers and the key is injected at runtime, so both are gone.
module.exports = {
  mode: 'production',
  target: 'node',
  devtool: false, // no source maps: they tripled the deployed artifact size
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: { loader: 'babel-loader' },
      },
    ],
  },
  output: {
    libraryTarget: 'commonjs2',
    path: `${__dirname}/dist-lambda`,
    filename: '[name].js',
  },
  entry: {
    openIdConfiguration: './src/connectors/lambda/open-id-configuration.js',
    token: './src/connectors/lambda/token.js',
    userinfo: './src/connectors/lambda/userinfo.js',
    jwks: './src/connectors/lambda/jwks.js',
    authorize: './src/connectors/lambda/authorize.js',
  },
};
