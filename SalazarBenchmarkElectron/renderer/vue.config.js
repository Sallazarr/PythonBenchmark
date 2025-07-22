const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,
    publicPath: './', 
  devServer: {
    hot: false,
    liveReload: false,
  },
});
