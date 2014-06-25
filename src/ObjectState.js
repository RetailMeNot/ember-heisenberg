define([
  'ember',
  './EH'
], function (Em, EH) {

  /**
   * @class EH.ObjectState
   * @mixes Ember.ClassMixin
   */
  EH.ObjectState = Em.Object.extend(/** @lends EH.ObjectState# */{
    isLoading: function() {
      return !this.get('isLoaded') && !this.get('isError');
    }.property('isLoaded', 'isError'),

    isError: false,
    isLoaded: false,
    isNew: true,
    isDirty: function() {
      return this.get('_isDirty') || !Em.isNone(this.get('_childObjectStates').findProperty('isDirty', true));
    }.property('_isDirty', '_childObjectStates.@each.isDirty'),
    _isDirty: false,
    _childObjectStates: null,
    init: function() {
      this._super.apply(this, arguments);
      this.set('_childObjectStates', []);
    }
  });

  return EH.ObjectState;
});
