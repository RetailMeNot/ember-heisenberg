define([
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

  EH.Array = EH.SerializableArray;
  return EH.SerializableArray;
});
