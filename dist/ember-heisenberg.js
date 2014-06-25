define('EH',[
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
define('AjaxRequest',[
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
     *   .fail(function(result) {
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

define('DeleteRequest',[
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
define('GetRequest',[
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
define('PostRequest',[
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
define('PutRequest',[
  'ember',
  './EH',
  './AjaxRequest'
], function (
  /** Ember */ Em,
  /** EH */ EH,
  /** EH.AjaxRequest */ AjaxRequest
) {

  /**
   * @class EH.PutRequest
   * @extends EH.AjaxRequest
   */
  EH.PutRequest = AjaxRequest.extend(/** @lends EH.PutRequest# */{
    init: function () {
      this._super();
      this.set('_settings.type', 'PUT');
    },

    /**
     * Specifies the data to be sent with this request.
     *
     * @param {string|*} json JSON data
     * @returns {EH.PutRequest}
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

  return EH.PutRequest;
});
define('ObjectState',[
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

define('StoresLocalDataMixin',[
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
define('SerializableArray',[
  'ember',
  './EH',
  './ObjectState',
  './StoresLocalDataMixin'
], function (
  /** Ember */ Em,
  /** EH */ EH,
  /** EH.ObjectState */ ObjectState,
  /** EH.StoresLocalDataMixin */ StoresLocalDataMixin
) {

  /**
   * @class EH.SerializableArray
   * @extends Ember.ArrayProxy
   * @mixes Ember.ClassMixin
   * @mixes Ember.SortableMixin
   * @mixes EH.SerializableMixin
   * @mixes EH.ObjectState
   */
  EH.SerializableArray = Em.ArrayProxy.extend(Em.Copyable, Em.SortableMixin, StoresLocalDataMixin, /** @lends EH.SerializableArray# */ {

    objectState: null,

    /**
     * @param {Object} [options] Additional options when calling to object.
     * @param {boolean} [options.includeTransient=false] Indicates if transient fields should be serialized.
     * @returns {Array}
     */
    toObject: function (options) {
      return this.serialize(options);
    },

    /**
     * @returns {string}
     */
    toJson: function () {
      return JSON.stringify(this.toObject());
    },

    /**
     * @returns {string}
     */
    toWrappedJson: function() {
      var objectArray = this.toObject();

      var rootKey = this.get('type').rootKey;
      if (Em.isNone(rootKey)) {
        return JSON.stringify(objectArray);
      }

      var wrappedObjectArray = {};
      wrappedObjectArray[rootKey] = objectArray;

      return JSON.stringify(wrappedObjectArray);
    },

    /**
     * @return {EH.SerializableArray} a copy of the object
     */
    copy: function () {
      return this.deserialize(this.toObject({includeTransient: true}));
    },

    init: function () {
      this._super.apply(this, arguments);
      this.set('objectState', ObjectState.create({}));
      this.set('content', []);
    },

    indexOf: function(object, startAt) {
      var idx, len = Em.get(this, 'length');

      if (startAt === undefined) startAt = 0;
      if (startAt < 0) startAt += len;

      for(idx=startAt;idx<len;idx++) {
        if (Em.isEqual(object, this.objectAt(idx))) return idx;
      }
      return -1;
    },

    isEqual: function(other) {
      if (Em.isNone(other)) {
        return false;
      }

      var len = Em.get(this, 'length');
      var otherLength = Em.get(other, 'length');

      if (len !== otherLength) {
        return false;
      }

      return this.every(function(item, index) {
        return Em.isEqual(item, other.objectAt(index));
      });
    },

    /**
     * @return {EH.SerializableObject|EH.SerializableType}
     */
    type: function (key, value) {
      var localData = this._localData(this);
      if (arguments.length > 1) {
        if (!Em.isNone(localData.type)) {
          throw new TypeError('Cannot change already-specified type of ' + localData.type.toString() + ' for ' + this.constructor.toString());
        }
        localData.type = value;
      }
      return localData.type;
    }.property().volatile(),

    /**
     * @return {function}
     */
    _deserializer: function () {
      /** @type EH.SerializableObject|EH.SerializableType */
      var type = this.get('type');
      if (Em.typeOf(type.deserialize) !== 'function') {
        throw new TypeError('Could not find a deserializer for type ' + type.constructor);
      }

      return type.deserialize.bind(type);
    }.property('type'),

    /**
     * @param {Array} rawValue
     * @returns {EH.SerializableArray}
     */
    deserialize: function(rawValue) {
      var deserialize = this.get('_deserializer');
      var type = this.get('type');
      var childObjectStates = this.get('objectState._childObjectStates');
      Em.beginPropertyChanges();
      if (!Em.isNone(rawValue)) {
        var deserializedList = rawValue.map(function(item) {
          var args = [item];
          if (Em.Object.detect(type)) {
            var arrayItem = type.create({});
            args.push(arrayItem );
            childObjectStates.push(arrayItem.get('objectState'));
          }
          return deserialize.apply(this, args);
        });
        // Ember has a bug where length isn't always set correctly here. Luckily we do not currently encounter the bug.
        this.clear().pushObjects(deserializedList);
      } else {
        this.clear();
      }
      this.set('objectState.isLoaded', true);
      Em.endPropertyChanges();
      this.addObserver('content.@each', this, '_setObjectStateToDirty');
      return this;
    },

    _setObjectStateToDirty: function(){
      this.set('objectState._isDirty', true);
      this.removeObserver('content.@each', this, '_setObjectStateToDirty');
    },

    /**
     * @param {Object} [options] Additional options when calling to object.
     * @param {boolean} [options.includeTransient=false] Indicates if transient fields should be serialized.
     * @return {function}
     */
    _serializer: function () {
      /** @type EH.SerializableObject|EH.SerializableType */
      var type = this.get('type');
      if (Em.isNone(type)) {
        throw new TypeError('Unspecified type for array instance ' + this);
      } else if (Em.typeOf(type.serialize) !== 'function') {
        throw new TypeError('Could not find a serializer for type ' + type.constructor);
      }

      return type.serialize.bind(type);
    }.property('type'),

    /**
     * @param typedValue the object to serialize
     * @param {Object} [options] Additional options when calling to object.
     * @param {boolean} [options.includeTransient=false] Indicates if transient fields should be serialized.
     * @returns {Array}
     */
    serialize: function (typedValue, options) {
      var serialize = this.get('_serializer');
      var type = this.get('type');
      return this.map(function (item) {
        return serialize(item, options);
      });
    }
  });

  return EH.SerializableArray;
});

define('SerializableType',[
  'ember',
  'moment',
  './EH'
], function (/** Ember */ Em,
             /** moment **/ moment,
             /** EH */ EH) {

  /**
   * @namespace EH.SerializableType
   * @class EH.SerializableType
   */
  EH.SerializableType = {
    /**
     * @class EH.SerializableType.Boolean
     */
    Boolean: {
      /**
       * @param typedValue
       * @returns {boolean}
       */
      serialize: function (typedValue) {
        return Em.isNone(typedValue) ? void 0 : typedValue;
      },

      /**
       * @param rawValue
       * @returns {null|boolean}
       */
      deserialize: function (rawValue) {
        if (Em.isNone(rawValue)) {
          return null;
        }

        var type = typeof rawValue;

        if (type === "boolean") {
          return rawValue;
        } else if (type === "string") {
          return rawValue.match(/^true$|^yes$|^y$|^t$|^1$/i) !== null;
        } else if (type === "number") {
          return rawValue === 1;
        } else {
          return false;
        }
      }
    },

    /**
     * @class EH.SerializableType.Date
     */
    Date: {
      /**
       * @param typedValue
       * @returns {string}
       */
      serialize: function (typedValue) {
        return Em.isNone(typedValue) ? void 0 : moment(typedValue).format();
      },
      /**
       * @param rawValue
       * @returns {null|Date}
       */
      deserialize: function (rawValue) {
        return Em.isNone(rawValue) ? null : moment(rawValue).toDate();
      }
    },

    /**
     * @class EH.SerializableType.Number
     */
    Number: {
      /**
       * @param typedValue
       * @returns {number}
       */
      serialize: function (typedValue) {
        return Em.isEmpty(typedValue) ? void 0 : typedValue;
      },
      /**
       * @param rawValue
       * @returns {null|number}
       */
      deserialize: function (rawValue) {
        return Em.isEmpty(rawValue) ? null : Number(rawValue);
      }
    },

    /**
     * @class EH.SerializableType.Raw
     */
    Raw: {
      /**
       * @param typedValue
       * @returns typedValue
       */
      serialize: function (typedValue) {
        return typedValue;
      },

      /**
       * @param rawValue
       * @returns rawValue
       */
      deserialize: function (rawValue) {
        return rawValue;
      }
    },

    /**
     * @class EH.SerializableType.String
     */
    String: {
      /**
       * @param typedValue
       * @returns {string}
       */
      serialize: function (typedValue) {
        return Em.isNone(typedValue) ? void 0 : typedValue;
      },
      /**
       * @param rawValue
       * @returns {null|string}
       */
      deserialize: function (rawValue) {
        return Em.isNone(rawValue) ? null : String(rawValue);
      }
    }
  };

  return EH.SerializableType;
});
define('SerializableObject',[
  'ember',
  './EH',
  './ObjectState',
  './StoresLocalDataMixin',
  './SerializableArray',
  './SerializableType'
], function (
  /** Ember */ Em,
  /** EH */ EH,
  /** EH.ObjectState */ ObjectState,
  /** EH.StoresLocalDataMixin */ StoresLocalDataMixin,
  /** EH.SerializableArray */ SerializableArray,
  /** EH.SerializableType */ SerializableType
) {

  /**
   * Describes a JSON-serializable model.
   *
   * @abstract
   * @class EH.SerializableObject
   * @extends Ember.Object
   * @mixes Ember.ClassMixin
   * @mixes Ember.Copyable
   * @mixes EH.StoresLocalDataMixin
   */
  EH.SerializableObject = Em.Object.extend(Em.Copyable, /** @lends EH.SerializableObject# */{
    /**
     * @param {Object} [options] Additional options when calling to object.
     * @param {boolean} [options.includeTransient=false] Indicates if transient fields should be serialized.
     * @returns {Object}
     */
    toObject: function (options) {
      return this.constructor.toObject(this.constructor, this, options);
    },

    /**
     * @returns {string}
     */
    toJson: function () {
      return this.constructor.toJson(this.constructor, this);
    },

    /**
     * @returns {string}
     */
    toWrappedJson: function () {
      return this.constructor.toWrappedJson(this.constructor, this);
    },

    objectState: null,

    /**
     * @return {EH.SerializableObject} a copy of the object
     */
    copy: function() {
      /** @type EH.SerializableObject */
      var objectInstance = this.constructor.create({});
      return EH.SerializableObject.fromJson(this.toObject({includeTransient: true}), this.constructor, objectInstance);
    },

    init: function () {
      this._super.apply(this, arguments);
      this.set('objectState', ObjectState.create({}));
      EH.SerializableObject._eachFieldOf(this.constructor, function (name, /** Meta */ meta) {
        if (meta.isList === true && Em.isNone(this.get(name))) {
          var serializableArray = SerializableArray.create().setProperties({type: meta.type});
          this.set(name, serializableArray);
          this.get('objectState._childObjectStates').pushObject(serializableArray.get('objectState'));
        }
      }.bind(this));
    }
  });

  /**
   * @abstract
   * @class EH.SerializableObject
   * @extends Ember.Object
   */
  EH.SerializableObject.reopenClass(StoresLocalDataMixin, /** @lends EH.SerializableObject */{
    rootKey: null,

    /**
     * @param objectType the serializable object type
     * @param {Object} rawJson
     */
    unwrapRootObject: function (objectType, rawJson) {
      if (Em.isNone(objectType.rootKey)) {
        return rawJson;
      }

      return rawJson[objectType.rootKey];
    },

    /**
     * @param objectType the serializable object type that is represented by <code>obj</code>
     * @param {Object} obj The raw Javascript Object to wrap using the specified Serializable Object type's root key
     */
    wrapRootObject: function (objectType, obj) {
      if (Em.isNone(objectType.rootKey)) {
        return obj;
      }

      var wrappedObj = {};
      wrappedObj[objectType.rootKey] = obj;

      return wrappedObj;
    },

    /**
     * Convenience to iterate *only* the serializable fields of the specified object type.
     * @param objectType the serializable object type
     * @param {function({string}, {})} visitorFn
     */
    _eachFieldOf: function (objectType, visitorFn) {
      objectType.eachComputedProperty(function (name, /** Meta */ meta) {
        if (meta.isSerializableField !== true) {
          return;
        }

        visitorFn(name, meta);
      });
    },

    /**
     * @param objectType
     * @param objectInstance
     * @param {Object} json
     * @returns {EH.SerializableObject}
     */
    _fromJsonInternal: function (json, objectType, objectInstance) {
      EH.SerializableObject._eachFieldOf(objectType, function (name, /** Meta */ meta) {
        var rawPropertyValue = json[name];

        var modelPropertyValue;
        if (meta.isList === true) {
          modelPropertyValue = SerializableArray.create({})
              .setProperties({type: meta.type});
          modelPropertyValue = modelPropertyValue.deserialize(rawPropertyValue);
          objectInstance.get('objectState._childObjectStates').pushObject(modelPropertyValue.get('objectState'));
        } else {
          if (EH.SerializableObject.detect(meta.type)) {
            if (Em.isNone(rawPropertyValue)) {
              modelPropertyValue = null;
            } else {
              var embeddedObjectInstance = meta.type.create({});
              modelPropertyValue = meta.type.deserialize(rawPropertyValue, embeddedObjectInstance);
              modelPropertyValue.set('objectState.isNew', false);
              objectInstance.get('objectState._childObjectStates').pushObject(modelPropertyValue.get('objectState'));
            }
          } else {
            modelPropertyValue = meta.type.deserialize(rawPropertyValue);
          }
        }

        objectInstance.set(name, modelPropertyValue);
      });
      return objectInstance;
    },

    /**
     * @param {Object} json
     * @param {EH.SerializableObject} objectType the serializable object type
     * @param {EH.SerializableObject} objectInstance an instance into which the object will be deserialized
     * @returns {EH.SerializableObject}
     */
    fromJson: function (json, objectType, objectInstance) {
      Em.beginPropertyChanges();
      objectInstance = EH.SerializableObject._fromJsonInternal(json, objectType, objectInstance);
      objectInstance.set('objectState.isLoaded', true);
      Em.endPropertyChanges();
      return objectInstance;
    },

    /**
     * @param {Object} rawValue
     * @param {EH.SerializableObject} objectInstance
     * @returns {EH.SerializableObject}
     */
    deserialize: function (rawValue, objectInstance) {
      return EH.SerializableObject.fromJson(rawValue, this, objectInstance);
    },

    /**
     * @param objectType the serializable object type
     * @param {EH.SerializableObject} objectInstance
     * @param {Object} [options] Additional options when calling to object.
     * @param {boolean} [options.includeTransient=false] Indicates if transient fields should be serialized.
     * @returns {Object}
     */
    _toObjectInternal: function (objectType, objectInstance, options) {
      if (Em.isEmpty(options)) {
        options = {};
      }

      var obj = {};
      EH.SerializableObject._eachFieldOf(objectType, function (name, /** Meta */ meta) {
        var propertyValue = Em.get(objectInstance, name);
        if (Em.isNone(propertyValue)) {
          // nothing to serialize
        } else if (meta.isTransient === true && options.includeTransient !== true) {
          // nothing to serialize
        } else if (meta.isList === true) {
          obj[name] = propertyValue.serialize(propertyValue, options);
        } else if (Em.typeOf(meta.type.serialize) === 'function') {
          obj[name] = meta.type.serialize(propertyValue, options);
        } else {
          throw new TypeError('Could not find a serializer for type ' + meta.type.constructor);
        }
      });

      return obj;
    },

    /**
     * Serializes the specified object instance to a raw Javascript object.
     *
     * @param objectType the serializable object type
     * @param {EH.SerializableObject} objectInstance the object instance to serialize
     * @param {Object} [options] Additional options when calling to object.
     * @param {boolean} [options.includeTransient=false] Indicates if transient fields should be serialized.
     * @returns {Object}
     */
    toObject: function (objectType, objectInstance, options) {
      return EH.SerializableObject._toObjectInternal(objectType, objectInstance, options);
    },

    /**
     * Serializes the specified object instance to a raw Javascript object.
     *
     * @param typedValue the object to serialize
     * @param {Object} [options] Additional options when calling to object.
     * @param {boolean} [options.includeTransient=false] Indicates if transient fields should be serialized.
     * @returns {Object}
     */
    serialize: function (typedValue, options) {
      return EH.SerializableObject.toObject(this, typedValue, options);
    },

    /**
     * Serializes the specified object instance to a JSON string.
     *
     * @param objectType the serializable object type
     * @param {EH.SerializableObject} objectInstance the object instance to serialize
     * @returns {string}
     */
    toJson: function (objectType, objectInstance) {
      var obj = EH.SerializableObject.toObject(objectType, objectInstance);
      return JSON.stringify(obj);
    },

    /**
     * Serializes the specified object instance to a wrapped JSON string, if the specified
     * object type has a root key.
     *
     * @param objectType the serializable object type
     * @param {EH.SerializableObject} objectInstance
     * @returns {string}
     */
    toWrappedJson: function (objectType, objectInstance) {
      var obj = EH.SerializableObject.toObject(objectType, objectInstance);
      var wrappedObject = EH.SerializableObject.wrapRootObject(objectType, obj);

      return JSON.stringify(wrappedObject);
    },

    /**
     * @returns {boolean}
     */
    _updateDirtyState: function(key, value, objectInstance) {
      if (objectInstance.get('objectState.isLoaded') === true && !Em.isEqual(objectInstance.get(key), value)) {
        objectInstance.set('objectState._isDirty', true);
        return true;
      }
      return false;
    },

    /**
     * @returns {*}
     */
    _serializableObjectSetter: function (objectType) {
      if (!EH.SerializableObject.detect(objectType)) {
        throw new TypeError("Object type '" + objectType + "' is not a SerializableObject");
      }
      return function (key, value) {
        if (!Em.isNone(value) && !objectType.detectInstance(value)) {
          throw new TypeError("Object for property '" + key + "' cannot be set to '" + value + "', expected type '" + objectType + "' instead");
        }
        EH.SerializableObject._updateDirtyState(key, value, this);
        return value;
      };
    },

    /**
     * @returns {*}
     */
    _listSetter: function (objectType) {
      return function (key, value) {
        if (!Em.Enumerable.detect(value)) {
          throw new TypeError("Object for property '" + key + "' cannot be set to '" + value + "', expected an Ember.Enumerable object instead");
        }
        if (!SerializableArray.detectInstance(value)) {
          // Suspend observers while we pushObjects
          Em.beginPropertyChanges();
          value = SerializableArray.create().setProperties({type: objectType}).pushObjects(value);
          EH.SerializableObject._updateDirtyState(key, value , this);
          Em.endPropertyChanges();
        }
        return value;
      };
    },

    /**
     * @param key
     * @param value
     * @returns {*}
     */
    _deserializingSetter: function (key, value) {
      /** Meta */
      var meta = this.constructor.metaForProperty(key);
      var deserialized = meta.type.deserialize(value);
      EH.SerializableObject. _updateDirtyState(key, deserialized , this);
      return deserialized;
    },

    /**
     * @param {(EH.SerializableType|EH.SerializableObject)} type
     * @param {Object} options
     * @param {boolean} [options.isList] true if this field represents a list containing elements of the specified type
     * @param {boolean} [options.transient] true if this field should be serialized
     * @returns {function}
     */
    _field: function (type, options) {
      var isList = options.isList;
      var isTransient = (options.transient === true);

      var fieldValueSetterFn;
      if (isList === true) {
        fieldValueSetterFn = EH.SerializableObject._listSetter(type);
      } else if (EH.SerializableObject.detect(type)) {
        fieldValueSetterFn = EH.SerializableObject._serializableObjectSetter(type);
      } else {
        fieldValueSetterFn = EH.SerializableObject._deserializingSetter;
      }

      return function (key, value) {
        var localData = EH.SerializableObject._localData(this);
        if (arguments.length > 1) {
          localData[key] = fieldValueSetterFn.apply(this, arguments);
        }
        return localData[key];
      }.property()
          .volatile()
          .meta(/** Meta */ {
            isSerializableField: true,
            isTransient: isTransient,
            type: type,
            isList: isList
          });
    },

    /**
     * Describes a scalar field of the specified type.
     *
     * @param {(EH.SerializableType|EH.SerializableObject)} type Either a simple type with a serializer and deserializer,
     *                                          or a complex type, which is another serializable object.
     * @param {Object} [options]
     * @param {boolean} [options.transient=false] if true, this field will not be serialized
     * @returns {function}
     */
    field: function (type, options) {
      options = options || {};
      options.isList = false;
      return EH.SerializableObject._field(type, options);
    },

    /**
     * Describes a list field of the specified type.
     *
     * @param {(EH.SerializableType|EH.SerializableObject)} type Either a simple type with a serializer and deserializer,
     *                                          or a complex type, which is another serializable object.
     * @param {Object} [options]
     * @param {boolean} [options.transient=false] if true, this field will not be serialized
     * @returns {function}
     */
    list: function (type, options) {
      options = options || {};
      options.isList = true;
      return EH.SerializableObject._field(type, options);
    },

    /**
     * Convenience for <code>EH.SerializableObject.field(EH.SerializableType.Boolean)</code>
     *
     * @param {Object} [options]
     * @param {boolean} [options.transient=false] if true, this field will not be serialized
     * @returns {function}
     */
    booleanField: function (options) {
      return EH.SerializableObject.field(SerializableType.Boolean, options);
    },

    /**
     * Convenience for <code>EH.SerializableObject.list(EH.SerializableType.Boolean)</code>.
     *
     * @param {Object} [options]
     * @param {boolean} [options.transient=false] if true, this field will not be serialized
     * @returns {function}
     */
    booleanList: function (options) {
      return EH.SerializableObject.list(SerializableType.Boolean, options);
    },

    /**
     * Convenience for <code>EH.SerializableObject.field(EH.SerializableType.Date)</code>
     *
     * @param {Object} [options]
     * @param {boolean} [options.transient=false] if true, this field will not be serialized
     * @returns {function}
     */
    dateField: function (options) {
      return EH.SerializableObject.field(SerializableType.Date, options);
    },

    /**
     * Convenience for <code>EH.SerializableObject.list(EH.SerializableType.Date)</code>.
     *
     * @param {Object} [options]
     * @param {boolean} [options.transient=false] if true, this field will not be serialized
     * @returns {function}
     */
    dateList: function (options) {
      return EH.SerializableObject.list(SerializableType.Date, options);
    },

    /**
     * Convenience for <code>EH.SerializableObject.field(EH.SerializableType.Number)</code>
     *
     * @param {Object} [options]
     * @param {boolean} [options.transient=false] if true, this field will not be serialized
     * @returns {function}
     */
    numberField: function (options) {
      return EH.SerializableObject.field(SerializableType.Number, options);
    },

    /**
     * Convenience for <code>EH.SerializableObject.list(EH.SerializableType.Number)</code>.
     *
     * @param {Object} [options]
     * @param {boolean} [options.transient=false] if true, this field will not be serialized
     * @returns {function}
     */
    numberList: function (options) {
      return EH.SerializableObject.list(SerializableType.Number, options);
    },

    /**
     * Convenience for <code>EH.SerializableObject.field(EH.SerializableType.Raw)</code>
     *
     * @param {Object} [options]
     * @param {boolean} [options.transient=false] if true, this field will not be serialized
     * @returns {function}
     */
    rawField: function (options) {
      return EH.SerializableObject.field(SerializableType.Raw, options);
    },

    /**
     * Convenience for <code>EH.SerializableObject.list(EH.SerializableType.Raw)</code>.
     *
     * @param {Object} [options]
     * @param {boolean} [options.transient=false] if true, this field will not be serialized
     * @returns {function}
     */
    rawList: function (options) {
      return EH.SerializableObject.list(SerializableType.Raw, options);
    },

    /**
     * Convenience for <code>EH.SerializableObject.field(EH.SerializableType.String)</code>
     *
     * @param {Object} [options]
     * @param {boolean} [options.transient=false] if true, this field will not be serialized
     * @returns {function}
     */
    stringField: function (options) {
      return EH.SerializableObject.field(SerializableType.String, options);
    },

    /**
     * Convenience for <code>EH.SerializableObject.list(EH.SerializableType.String)</code>.
     *
     * @param {Object} [options]
     * @param {boolean} [options.transient=false] if true, this field will not be serialized
     * @returns {function}
     */
    stringList: function (options) {
      return EH.SerializableObject.list(SerializableType.String, options);
    }
  });

  /**
   * @typedef {Object} Meta
   * @property {boolean} isSerializableField Always true for any field that is decorated with EH.SerializableObject.field
   * @property {boolean} isTransient true for fields which should not be serialized
   * @property {boolean} isList true for fields which represent a list of values
   * @property {(EH.SerializableObject|EH.SerializableType)} type the type of a given field
   */
  var Meta;  // need the 'var' because Chrome will yield a ReferenceError otherwise

  return EH.SerializableObject;
});

define('Resource',[
  'ember',
  './EH',
  './SerializableArray',
  './SerializableObject',
  './GetRequest',
  './DeleteRequest',
  './PostRequest',
  './PutRequest'
], function(
  /** Ember */ Em,
  /** EH */ EH,
  /** EH.SerializableArray */ SerializableArray,
  /** EH.SerializableObject */ SerializableObject,
  /** EH.GetRequest */ GetRequest,
  /** EH.DeleteRequest */ DeleteRequest,
  /** EH.PostRequest */ PostRequest,
  /** EH.PutRequest */ PutRequest) {

  /**
   * @abstract
   * @class EH.Resource
   */
  EH.Resource = Em.Object.extend(/** @lends EH.Resource# */{
  });

  EH.Resource.reopenClass(/** @lends EH.Resource */{
    /**
     * {Object.<string, EH.AjaxRequest>}
     * @private
     */
    _METHOD_TO_REQUEST_CLASS: {
      'DELETE': DeleteRequest,
      'GET' : GetRequest,
      'POST': PostRequest,
      'PUT': PutRequest
    },

    /**
     * Creates an AJAX request for the specified method.
     *
     * @param {string} method
     * @returns {EH.AjaxRequest}
     */
    method: function (method) {
      var requestClass = this._METHOD_TO_REQUEST_CLASS[method];
      if (Em.isNone(requestClass)) {
        throw new Error('Cannot create a request with method "' + method + '"');
      }

      return requestClass.create();
    },

    /**
     * Executes the specified AJAX request.
     *
     * @param {EH.AjaxRequest} request
     * @returns {{getResponsePromise: function():Ember.RSVP.Promise, getResponseValue: function():EH.SerializableObject|EH.SerializableArray}}
     */
    executeRequest: function (request) {
      var objectType = Em.get(request, 'responseObjectType');

      /** @type EH.SerializableObject|EH.SerializableArray|Object*/
      var instance;
      var deserialize;
      var isPrimitive;

      var responseObjectType = Em.get(request, 'responseObjectType');
      switch (responseObjectType) {
        case EH.SerializableType.Boolean:
        case EH.SerializableType.Date:
        case EH.SerializableType.Raw:
        case EH.SerializableType.String:
          isPrimitive = true;
          break;
        default:
          isPrimitive = false;
      }

      if (isPrimitive) {
        instance = EH.SerializableObject.create();
        deserialize = EH.Resource.deserializePrimitive(responseObjectType.deserialize);
      } else if (Em.get(request, 'responseIsList') === true) {
        instance = SerializableArray.create().setProperties({type: objectType});
        deserialize = EH.Resource.deserializeIntoListOf;
      } else if (Em.get(request, 'responseIsSingletonList') === true) {
        instance = objectType.create({});
        deserialize = EH.Resource.deserializeIntoSingletonListOf;
      } else {
        instance = objectType.create({});
        instance.set('objectState.isNew', false);
        deserialize = EH.Resource.deserializeInto;
      }

      var checkNull;
      if (Em.get(request, 'producesNullable') === true) {
        checkNull = EH.Resource.resolveUnconditionally;
      } else {
        checkNull = EH.Resource.rejectNull;
      }

      var unwrapRoot;
      if (isPrimitive === true) {
        unwrapRoot = EH.Resource.resolveUnconditionally;
      } else {
        unwrapRoot = EH.Resource.unwrapRoot(objectType);
      }

      var handleNotFoundError = function(error) {
        var errorObject = new Error();

        errorObject.status = error.status;

        if (error.status === 404) {
          errorObject.responseText = error.responseText;
          errorObject.responseTitle = error.statusText + ' (' + error.status + ')';
          return Em.RSVP.reject(errorObject);
        }

        errorObject.responseText = error.stack;
        errorObject.responseTitle = error.toString();
        return Em.RSVP.reject(errorObject);
      };

      /** @type Ember.RSVP.Promise */
      var promise = request.execute()
          .then(checkNull)
          .then(unwrapRoot)
          .then(deserialize(instance))
          .fail(handleNotFoundError)
          .fail(setErrorFlag.bind(this, instance));

      return this.createResponseObject(instance, promise);
      function setErrorFlag(instance, error) {
        instance.set('objectState.isError', true);
        return Em.RSVP.reject(error);
      }
    },

    resolveUnconditionally: function(json) {
      return Em.RSVP.resolve(json);
    },

    rejectNull: function(json) {
      if (Em.isNone(json)) {
        return Em.RSVP.reject(new Error('Response must not be null.'));
      }
      return Em.RSVP.resolve(json);
    },

    /**
     * Returns a thenable function which takes JSON as its input value, root-unwraps it, and
     * returns a resolved promise.
     *
     * @param objectType
     * @returns {function(): Ember.RSVP.Promise}
     */
    unwrapRoot: function (objectType) {
      return function (json) {
        if (Em.isNone(json)) {
          return Em.RSVP.resolve(null);
        }

        var unwrappedJson = SerializableObject.unwrapRootObject(objectType, json);
        return Em.RSVP.resolve(unwrappedJson);
      };
    },

    /**
     * @param instance
     * @param [promise=Em.RSVP.resolve(instance)]
     * @returns {{getResponsePromise: (function(): Ember.RSVP.Promise), getResponseValue: (function(): EH.SerializableObject|EH.SerializableArray)}}
     */
    createResponseObject: function (instance, promise) {
      if (Em.isNone(promise)) {
        promise = Em.RSVP.resolve(instance);
      }

      return {
        getResponseValue: function () {
          return instance;
        },
        getResponsePromise: function () {
          return promise;
        }
      };
    },

    /**
     * Takes a primitive deserializer (see {EH.SerializableType}) and returns a function that
     * returns a thenable function which takes JSON as its input value, creates a wrapper object
     * for the specified primitive type, and returns a resolved promise.  The wrapper object
     * is a simple object with a single property "value".
     *
     * @param {function} primitiveDeserializer
     * @returns {function(): Ember.RSVP.Promise}
     */
    deserializePrimitive: function (primitiveDeserializer) {
      return function (objectInstance) {
        return function (primitiveValue) {
          if (Em.isNone(primitiveValue)) {
            return Em.RSVP.resolve(null);
          }

          objectInstance.set('value', primitiveDeserializer(primitiveValue));
          return Em.RSVP.resolve(objectInstance);
        };
      };
    },

    /**
     * Returns a thenable function which takes JSON as its input value, creates a instance of
     * the specified serializable object type, and returns a resolved promise.
     *
     * @param {EH.SerializableObject} objectInstance
     * @returns {function(): Ember.RSVP.Promise}
     */
    deserializeInto: function (objectInstance) {
      return function (json) {
        if (Em.isNone(json)) {
          objectInstance.set('objectState.isLoaded', true);
          return Em.RSVP.resolve(null);
        }

        SerializableObject.fromJson(json, objectInstance.constructor, objectInstance);
        return Em.RSVP.resolve(objectInstance);
      };
    },

    /**
     * Returns a thenable function which takes JSON as its input value, creates a list of instances of
     * the specified serializable object type, and returns a resolved promise.
     *
     * @param {EH.SerializableArray} arrayInstance
     * @returns {function(): Ember.RSVP.Promise}
     */
    deserializeIntoListOf: function (arrayInstance) {
      return function (json) {
        if (Em.isNone(json)) {
          arrayInstance.set('objectState.isLoaded', true);
          return Em.RSVP.resolve(null);
        }

        /** EH.SerializableArray */
        arrayInstance.deserialize(json);
        return Em.RSVP.resolve(arrayInstance);
      };
    },

    /**
     * Returns a thenable function which takes JSON as its input value, creates a instance of
     * the specified serializable object type, and returns a resolved promise.
     *
     * @param {EH.SerializableObject} objectInstance
     * @returns {function(): Ember.RSVP.Promise}
     */
    deserializeIntoSingletonListOf: function (objectInstance) {
        return function (json) {
          if (Em.isEmpty(json)) {
            objectInstance.set('objectState.isLoaded', true);
            return Em.RSVP.resolve(null);
          }

          SerializableObject.fromJson(json[0], objectInstance.constructor, objectInstance);
          return Em.RSVP.resolve(objectInstance);
        };
    }
  });

  return EH.Resource;
});
define('modules',[
  './EH',
  './AjaxRequest',
  './DeleteRequest',
  './GetRequest',
  './PostRequest',
  './PutRequest',
  './Resource',
  './SerializableObject'
],function(){
});
define('ember-heisenberg',[
  './EH',
  './modules'
],function (EH) {
  return EH;
});
