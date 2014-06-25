require.config({
  keepBuildDir: false,
  useStrict: true,

  optimize: 'none',

  paths: {
    'jquery': 'empty:',
    'ember': 'empty:',
    'moment': 'empty:',
    'handlebars': 'empty:'
  },
  shim: {
    'jquery': {
      exports: '$'
    },
    'ember': {
      deps: ['jquery', 'handlebars'],
      exports: 'Ember'
    }
  }
});
