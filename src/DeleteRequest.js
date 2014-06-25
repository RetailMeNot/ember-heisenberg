define([
  'ember',
  './EH',
  './AjaxRequest'
], function (Em, EH, AjaxRequest) {

  /**
   * @class EH.DeleteRequest
   * @extends EH.AjaxRequest
   */
  EH.DeleteRequest = AjaxRequest.extend(/** @lends EH.DeleteRequest# */{
    init: function () {
      this._super();
      this.set('_settings.type', 'DELETE');
    }
  });

  return EH.DeleteRequest;
});