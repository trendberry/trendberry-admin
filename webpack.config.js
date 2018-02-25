const path = require('path')
const devServer = require('@webpack-blocks/dev-server')
const splitVendor = require('webpack-blocks-split-vendor')
const happypack = require('webpack-blocks-happypack')
const { file, url } = require('@webpack-blocks/assets')
const babel = require('@webpack-blocks/babel')
const serverSourceMap = require('webpack-blocks-server-source-map')
const nodeExternals = require('webpack-node-externals')
const AssetsByTypePlugin = require('webpack-assets-by-type-plugin')
const ChildConfigPlugin = require('webpack-child-config-plugin')
const SpawnPlugin = require('webpack-spawn-plugin')

const {
  addPlugins, createConfig, entryPoint, env, setOutput,
  sourceMaps, defineConstants, group, match, resolve, customConfig
} = require('@webpack-blocks/webpack')
const webpack = require('webpack')

const host = process.env.HOST || 'localhost'
const port = (+process.env.PORT + 1) || 3001
const sourceDir = process.env.SOURCE || 'src'
const publicPath = `/${process.env.PUBLIC_PATH || ''}/`.replace('//', '/')
const sourcePath = path.join(process.cwd(), sourceDir)
const outputPath = path.join(process.cwd(), 'dist/public')
const assetsPath = path.join(process.cwd(), 'dist/assets.json')
const clientEntryPath = path.join(sourcePath, 'client.js')
const serverEntryPath = path.join(sourcePath, 'server.js')
const devDomain = `http://${host}:${port}/`

const base = () => group([
  setOutput({
    filename: '[name].js',
    path: outputPath,
    publicPath,
  }),

  addPlugins([
    new webpack.ProgressPlugin(),
  ]),

  happypack([
    babel(),
  ]),

  match(['*.eot', '*.ttf', '*.woff', '*.woff2'], [
    file()
  ]),

  match(['*.gif', '*.jpg', '*.jpeg', '*.png', '*.svg', '*.webp'], [
    url({ limit: 10000 })
  ]),

  resolve({
    extensions: ['.jsx'],
    modules: [].concat(sourceDir, ['node_modules']),
  }),

  defineConstants({
    'process.env.NODE_ENV': process.env.NODE_ENV,
    'process.env.PUBLIC_PATH': publicPath.replace(/\/$/, ''),
  }),

  env('development', [
    setOutput({
      publicPath: devDomain,
    }),
  ]),
])

const server = createConfig([
  base(),
  entryPoint({ server: serverEntryPath }),
  setOutput({
    filename: '../[name].js',
    libraryTarget: 'commonjs2',
  }),
  addPlugins([
    new webpack.BannerPlugin({
      banner: 'global.assets = require("./assets.json");',
      raw: true,
    }),
  ]),
  customConfig({
    target: 'node',
    externals: [nodeExternals()],
    stats: 'errors-only',
  }),

  env('development', [
    customConfig(serverSourceMap()),
    addPlugins([
      new SpawnPlugin('npm', ['start']),
    ]),
    customConfig({
      watch: true,
    }),
  ]),
])

const client = createConfig([
  base(),
  entryPoint({ client: clientEntryPath }),
  addPlugins([
    new AssetsByTypePlugin({ path: assetsPath }),
    new ChildConfigPlugin(server),
  ]),

  env('development', [
    devServer({
      contentBase: 'public',
      stats: 'errors-only',
      historyApiFallback: { index: publicPath },
      headers: { 'Access-Control-Allow-Origin': '*' },
      host,
      port,
    }),
    sourceMaps(),
    addPlugins([
      new webpack.NamedModulesPlugin(),
    ]),
  ]),

  env('production', [
    splitVendor(),
    addPlugins([
      new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false } }),
    ]),
  ]),
])

module.exports = client
