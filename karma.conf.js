// Karma configuration

module.exports = function(config) {
  config.set({


    // frameworks to use
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      // ES5 Shim is necessary for PhantomJS support
      'node_modules/es5-shim/es5-shim.js',

      // Hack to load RequireJS after the shim libs (see https://github.com/karma-runner/karma/issues/699)
      'node_modules/requirejs/require.js',
      'node_modules/karma-requirejs/lib/adapter.js',

      'tests/test-main.js',

      {pattern: './lib/**/*.js', included: false},
      {pattern: './src/**/*.js', included: false},
      {pattern: './tests/**/*.js', included: false}
    ],


    // list of files to exclude
    exclude: [
      'src/build.js',
      '**/modules.js',
      '**/*-dist.js'
    ],


    // preprocessors to use
    preprocessors: {
      'src/*.js': ['coverage']
    },


    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['PhantomJS', 'Chrome', 'Firefox'],


    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false
  });
};
