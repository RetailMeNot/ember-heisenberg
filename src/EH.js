define([
  'ember'
], function (Em) {

  /**
   * @static
   * @class EH
   * @namespace EH
   * @extends Ember.Namespace
   */
  var EH = Em.Namespace.create( /** @lends EH# */ {
  });

  Em.assert(Em.exports.h === undefined, 'An export already exists for Ember.EH.*');
  Em.exports.h = EH;

  return EH;

});