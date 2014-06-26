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

  Em.assert(Em.exports.EH === undefined, 'An export already exists for EH.*');
  Em.exports.EH = EH;

  return EH;

});