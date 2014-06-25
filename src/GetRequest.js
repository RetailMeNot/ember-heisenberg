define([
  'ember',
  './EH',
  './AjaxRequest'
], function (Em, EH, AjaxRequest) {

  /**
   * @class EH.GetRequest
   * @extends EH.AjaxRequest
   */
  EH.GetRequest = AjaxRequest.extend(/** @lends EH.GetRequest# */{
    init: function () {
      this._super();
      this.set('_settings.type', 'GET');
    }
  });

  return EH.GetRequest;
});