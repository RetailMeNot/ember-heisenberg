define([
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

  EH.Type = EH.SerializableType;
  return EH.SerializableType;
});