define([
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
