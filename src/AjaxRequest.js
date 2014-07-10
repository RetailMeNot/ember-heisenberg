define([
  'ember',
  './EH'
],function (Em, EH) {

  /**
   * @abstract
   * @class EH.AjaxRequest
   * @extends Ember.Object
   * @mixes Ember.ClassMixin
   */
  EH.AjaxRequest = Em.Object.extend(/** @lends EH.AjaxRequest# */{
    /**
     * @private
     * {string}
     */
    _url: null,

    /**
     * @private
     * {Object}
     */
    _settings: null,

    /**
     * {EH.SerializableObject|EH.SerializableType}
     */
    responseObjectType: null,

    /**
     * @private
     * {boolean}
     */
    responseIsList: false,

    /**
     * @private
     * {boolean}
     */
    responseIsSingletonList: false,

    init: function () {
      this._super();
      this.set('_settings', {});
      this.consumesJson();
      this.producesJson();
    },

    /**
     * @protected
     * @returns {Ember.RSVP.Promise}
     */
    execute: function() {
      return EH.AjaxRequest.execute(this.get('_url'), this.get('_settings'));
    },

    /**
     * Using the specified input string, substitutes the specified tokens with their values. Also
     * applies the specified encoding function if one is provided.
     *
     * Used primarily to process URL path parameters.
     *
     * @protected
     * @param {string} input
     * @param {Object} tokens
     * @param {Function} [encodeFn] an encoding function to apply to the parameter value
     * @return {string} parsed
     */
    processTokens: function(input, tokens, encodeFn) {
      var result = input;
      for (var key in tokens) {
        if (tokens.hasOwnProperty(key)) {
          var val = tokens[key];
          if (!Em.isNone(encodeFn) && Em.typeOf(encodeFn) === 'function') {
            val = encodeFn(val);
          }
          var re = new RegExp('{' + key +  '}', 'g');
          result = result.replace(re, val);
        }
      }

      return result;
    },

    /**
     * Sets the URL for the specified request.
     *
     * @param {string} url
     * @param [params]
     * @returns {EH.AjaxRequest}
     */
    url: function(url, params) {
      var parsedUrl = this.processTokens(url, params, encodeURIComponent);
      this.set('_url', parsedUrl);
      return this;
    },

    /**
     * Sets whether a global (external) AJAX error handler should be used.
     * It may be desirable to disable the global error handler if the caller wants
     * to make a dynamic determination of whether a particular response should be
     * dealt with either in a specific way or by propagating to the default
     * handler.
     *
     * If the global error handler is disabled then it is expected that the caller
     * will take appropriate action and manually call the default handler (on app)
     * if appropriate.
     *
     * e.g.:
     *
     * myResourceMethod: function() {
     *   var request = MyResource.method('GET')
     *     .url(myUrl, {})
     *     .useGlobalErrorHandler(false)
     *     .produces(MyModel);
     *
     *   return MyResource.executeRequest(request);
     * }
     *
     *
     * MyResource.myResourceMethod()
     *   .then(function(result) {
     *     // happy
     *   }.bind(this))
     *   .catch(function(result) {
     *     if (iCanHandleError(result)) {
     *       handleError(result);
     *     } else {
     *       app.globalAjaxError(null, result);
     *     }
     *   }.bind(this));
     *
     * @returns {EH.AjaxRequest}
     */
    useGlobalErrorHandler: function(useGlobalErrorHandler) {
      var settings = this.get('_settings');
      settings.global = useGlobalErrorHandler;
      return this;
    },

    disableGlobalErrorHandler: function() {
      return this.useGlobalErrorHandler(false);
    },

    /**
     * Specifies query parameters to be encoded into a query string as a part of this request.
     *
     * {@link undefined} param values are omitted.  For flag params, use {@link EH.AjaxRequest.QUERY_PARAM_EMPTY_VALUE}.
     *
     * @param {Object} queryParams an object hash of the query parameters to specify
     * @returns {EH.AjaxRequest}
     */
    queryParams: function(queryParams) {
      if (!Em.isNone(queryParams)) {
        var queryString = '?';
        var params = [];

        var encodeAndPushParamValueArray = function (element) {
          params.push(paramName + '=' + encodeURIComponent(element));
        };

        for (var paramName in queryParams) {
          if (!queryParams.hasOwnProperty(paramName)) {
            continue;
          }

          var paramValue = queryParams[paramName];
          if (paramValue === undefined) {
            continue;
          }

          if (Em.isArray(paramValue)) {
            paramValue.forEach(encodeAndPushParamValueArray);

            continue;
          }

          var paramFragment;
          if (paramValue === EH.AjaxRequest.QUERY_PARAM_EMPTY_VALUE) {
            paramFragment = paramName;
          } else {
            paramFragment = paramName + '=' + encodeURIComponent(paramValue);
          }
          params.push(paramFragment);
        }
        queryString += params.join('&');

        var url = this.get('_url');
        this.set('_url', url + queryString);
      }
      return this;
    },

    /**
     * Specifies that the content type of the request is application/json.
     * @returns {EH.AjaxRequest}
     */
    consumesJson: function() {
      this.set('_settings.contentType', 'application/json; charset=utf-8');
      return this;
    },

    /**
     * Specifies that the content type of the request is application/x-www-form-urlencoded.
     * @returns {EH.AjaxRequest}
     */
    consumesFormData: function() {
      this.set('_settings.contentType', 'application/x-www-form-urlencoded; charset=utf-8');
      return this;
    },

    /**
     * Specifies that this request accepts JSON responses.
     *
     * @returns {EH.AjaxRequest}
     */
    producesJson: function() {
      var settings = this.get('_settings');
      settings.dataType = 'json';
      settings.headers = { Accept: 'application/json' };
      return this;
    },

    /**
     * Specifies that this request accepts CSV responses.
     *
     * @returns {EH.AjaxRequest}
     */
    producesCsv: function () {
      var settings = this.get('_settings');
      settings.dataType = 'text';
      settings.headers = { Accept: 'text/csv' };
      return this;
    },

    /**
     * Indicates that this request should allow for null responses.
     *
     * @param {boolean} [flag=true]
     * @returns {EH.AjaxRequest}
     */
    producesNullable: function(flag) {
      this.set('producesNullable', arguments.length === 0 || flag === true);
      return this;
    },

    /**
     * Specifies that this request will return a wrapped primitive boolean
     *
     * @returns {EH.AjaxRequest}
     */
    producesBoolean: function () {
      this.set('responseObjectType', EH.SerializableType.Boolean);
      return this;
    },

    /**
     * Specifies that this request will return a wrapped primitive date
     *
     * @returns {EH.AjaxRequest}
     */
    producesDate: function () {
      this.set('responseObjectType', EH.SerializableType.Date);
      return this;
    },

    /**
     * Specifies that this request will return a wrapped primitive raw
     *
     * @returns {EH.AjaxRequest}
     */
    producesRaw: function () {
      this.set('responseObjectType', EH.SerializableType.Raw);
      return this;
    },

    /**
     * Specifies that this request will return a wrapped primitive string
     *
     * @returns {EH.AjaxRequest}
     */
    producesString: function () {
      this.set('responseObjectType', EH.SerializableType.String);
      return this;
    },

    /**
     * Specifies that this request will return an object of the specified type.
     *
     * @param {EH.SerializableObject|EH.SerializableType} objectType
     * @returns {EH.AjaxRequest}
     */
    produces: function (objectType) {
      this.set('responseObjectType', objectType);
      return this;
    },

    /**
     * Specifies that this request will return a list of objects of the specified type.
     *
     * @param {EH.SerializableObject|EH.SerializableType} objectType
     * @returns {EH.AjaxRequest}
     */
    producesListOf: function (objectType) {
      this.produces(objectType).set('responseIsList', true);
      return this;
    },

    /**
     * Specifies that this request will return a list with a single object in it.  (If the list is empty, the
     * result is considered to be null).
     *
     * @param {EH.SerializableObject|EH.SerializableType} objectType
     * @returns {EH.AjaxRequest}
     */
    producesSingletonListOf: function (objectType) {
      this.produces(objectType).set('responseIsSingletonList', true);
      return this;
    }

  });

  EH.AjaxRequest.reopenClass(/** @lends EH.AjaxRequest */{

    /**
     * Marker to specify a query param having an empty value (no '=' or value after the equals).
     *
     * @type {object}
     * @const
     */
    QUERY_PARAM_EMPTY_VALUE: {},

    /**
     * @param {string} url
     * @param {Object} [settings]
     * @returns {Ember.RSVP.Promise}
     */
    execute: function (url, settings) {
      return new Em.RSVP.Promise(function (resolve, reject) {
        var ajaxSettings = settings || {};

        ajaxSettings.success = function (data) {
          Em.run(null, resolve, data);
        };

        ajaxSettings.error = function (data) {
          Em.run(null, reject, data);
        };

        return Em.$.ajax(url, ajaxSettings);
      });
    }

  });

  return EH.AjaxRequest;
});
