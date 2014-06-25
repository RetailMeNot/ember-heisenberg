define([
  'ember',
  './EH',
  './AjaxRequest'
], function (
  /** Ember */ Em,
  /** EH */ EH,
  /** EH.AjaxRequest */ AjaxRequest
) {

  /**
   * @class EH.PostRequest
   * @extends EH.AjaxRequest
   */
  EH.PostRequest = AjaxRequest.extend(/** @lends EH.PostRequest# */{
    init: function () {
      this._super();
      this.set('_settings.type', 'POST');
    },

    /**
     * Specifies the post data to be sent with this request.
     *
     * @param {string|*} json JSON data
     * @returns {EH.PostRequest}
     */
    body: function (json) {
      var contentType = this.get('_settings.contentType');
      // TODO: use Utils.isString after moving move Utils into RMN package
      if (contentType.match(/json/) && Em.typeOf(json) !== Em.typeOf('string')) {
        json = JSON.stringify(json);
      }
      this.set('_settings.data', json);
      return this;
    }
  });

  return EH.PostRequest;
});