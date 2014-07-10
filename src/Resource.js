define([
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
          .catch(handleNotFoundError)
          .catch(setErrorFlag.bind(this, instance));

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
