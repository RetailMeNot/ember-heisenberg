var tests = Object.keys(window.__karma__.files).filter(function filterTests(file) {
  return /Test\.js$/.test(file);
}).map(function pathToModule(file) {
  return file.replace(/^\/base\//, '../').replace(/\.js$/, '');
});

requirejs.config({
  baseUrl: '/base/src',

  paths: {
    'jquery': '../lib/jquery',
    'handlebars': '../lib/handlebars',
    'ember': '../lib/ember',
    'moment': '../lib/moment'
  },

  shim: {
    'jquery' : {
      exports: '$'
    },
    'handlebars': {
      exports: 'Handlebars'
    },
    'ember': {
      deps: ['jquery', 'handlebars'],
      exports: 'Ember'
    }
  },

  deps: tests,

  callback: window.__karma__.start
});
