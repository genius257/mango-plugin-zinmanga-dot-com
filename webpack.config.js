const path = require('path');
const { webpack, DefinePlugin } = require('webpack');

module.exports = {
  mode: 'development',
  devtool: false,
  entry: './src/index.ts', // Adjust the entry point based on your project structure
  target: ['web', 'es5'],
  output: {
    filename: 'index.js', // Output file name
    path: path.resolve(__dirname, 'dist'),
    iife: false,

    globalObject: 'this',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new DefinePlugin({
      exports: 'this',
    })
  ],
};
