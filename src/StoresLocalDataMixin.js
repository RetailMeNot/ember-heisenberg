define([
  'ember',
  './EH'
], function (Em, EH) {

  /**
   * @mixin EH.StoresLocalDataMixin
   * @type {*}
   */
  EH.StoresLocalDataMixin = Em.Mixin.create({
    /**
     * @param {EH.StoresLocalDataMixin} context
     * @returns {{}}
     */
    _localData: function (context) {
      var localDataPath = '__' + Em.guidFor(context) + '_localData';
      // This is optimized since it runs so often.
      return context[localDataPath] || (context[localDataPath] = {});
    }
  });

  return EH.StoresLocalDataMixin;
});