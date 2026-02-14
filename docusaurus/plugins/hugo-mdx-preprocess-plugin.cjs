'use strict';

const path = require('path');

module.exports = function hugoMdxPreprocessPlugin() {
  return {
    name: 'hugo-mdx-preprocess-plugin',
    configureWebpack() {
      return {
        module: {
          rules: [
            {
              test: /\.mdx?$/i,
              enforce: 'pre',
              include: [path.resolve(__dirname, '..')],
              exclude: [/node_modules/],
              use: [
                {
                  loader: path.resolve(__dirname, 'hugo-mdx-preprocess-loader.cjs'),
                },
              ],
            },
          ],
        },
      };
    },
  };
};

