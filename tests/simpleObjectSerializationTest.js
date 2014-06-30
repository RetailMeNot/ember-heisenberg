define([
  'SerializableObject'
], function (
/** EH.SerializableObject */ SerializableObject
) {

  var isEqualHelper = function(itemA, itemB) {
    if (Em.isNone(itemA) && Em.isNone(itemB)) {
      return true;
    }

    return Em.isEqual(itemA, itemB);
  };

  /**
   * @class NestedObject
   * @extends EH.SerializableObject
   */
  var NestedObject = SerializableObject.extend(/** @lends TestObject# */{
    aNestedStringField: SerializableObject.stringField(),
    aNestedTransientField: SerializableObject.stringField({transient: true}),

    isEqual: function(other) {
      if (Em.isNone(other)) {
        return false;
      }

      return isEqualHelper(this.get('aNestedStringField'), other.get('aNestedStringField')) &&
          isEqualHelper(this.get('aNestedTransientField'), other.get('aNestedTransientField'));
    }
  });

  /**
   * @class TestObject
   * @extends EH.SerializableObject
   * @mixes Ember.ClassMixin
   */
  var TestObject = SerializableObject.extend(/** @lends TestObject# */{
    aBooleanField: SerializableObject.booleanField(),
    aDateField: SerializableObject.dateField(),
    aNumberField: SerializableObject.numberField(),
    aRawField: SerializableObject.rawField(),
    aStringField: SerializableObject.stringField(),

    aStringListField: SerializableObject.stringList(),

    aNestedObjectField: SerializableObject.field(NestedObject),
    aNestedObjectListField: SerializableObject.list(NestedObject),

    aTransientField: SerializableObject.stringField({transient: true}),
    aTransientListField: SerializableObject.stringList({transient: true}),

    isEqual: function(other) {
      if (Em.isNone(other)) {
        return false;
      }

      var properties = ['aBooleanField', 'aDateField', 'aNumberField', 'aStringField', 'aStringListField', 'aNestedObjectField', 'aNestedObjectListField'];
      var thisProperties = this.getProperties(properties);
      var otherProperties = other.getProperties(properties);

      return isEqualHelper(thisProperties.aBooleanField, otherProperties.aBooleanField) &&
          isEqualHelper(Em.tryInvoke(thisProperties.aDateField, 'toString'), Em.tryInvoke(otherProperties.aDateField, 'toString')) &&
          isEqualHelper(thisProperties.aNumberField, otherProperties.aNumberField) &&
          isEqualHelper(thisProperties.aStringField, otherProperties.aStringField) &&
          isEqualHelper(thisProperties.aStringListField, otherProperties.aStringListField) &&
          isEqualHelper(thisProperties.aNestedObjectField, otherProperties.aNestedObjectField) &&
          isEqualHelper(thisProperties.aNestedObjectListField, otherProperties.aNestedObjectListField);
    }
  });


  /**
   * @class RootWrappedTestObject
   * @extends EH.SerializableObject
   * @mixes Ember.ClassMixin
   */
  var RootWrappedTestObject = TestObject.extend(/** @lends RootWrappedTestObject# */{
  });
  RootWrappedTestObject.reopenClass({
    rootKey: 'rootWrapper'
  });


  describe('SerializableObjects', function () {

    var testObj;
    beforeEach(function () {
      testObj = TestObject.create({});

      this.addMatchers({
        toEmberEqual: function(expected) {
          return isEqualHelper(this.actual, expected);
        }
      })
    });

    function assertDeepEquals(expected, actual){
      expect(expected).toEmberEqual(actual);

      // "Primitives"
      expect(expected.get('aBooleanField')).toEqual(actual.get('aBooleanField'));
      expect(expected.get('aDateField')).toEqual(actual.get('aDateField'));
      expect(expected.get('aNumberField')).toEqual(actual.get('aNumberField'));

      // Strings & String Lists
      expect(expected.get('aStringField')).toEqual(actual.get('aStringField'));
      expect(expected.get('aStringListField')).toEmberEqual(actual.get('aStringListField'));

      // Nested Objects
      expect(expected.get('aNestedObjectField')).toEmberEqual(actual.get('aNestedObjectField'));
      expect(expected.get('aNestedObjectField.aNestedStringField')).toEqual(actual.get('aNestedObjectField.aNestedStringField'));
      expect(expected.get('aNestedObjectField.aNestedTransientField')).toEqual(actual.get('aNestedObjectField.aNestedTransientField'));

      // Object Lists
      expect(expected.get('aNestedObjectListField')).toEmberEqual(actual.get('aNestedObjectListField'));

      // Transients
      expect(expected.get('aTransientField')).toEqual(actual.get('aTransientField'));
      expect(expected.get('aTransientListField')).toEmberEqual(actual.get('aTransientListField'));
    }

    describe('should serialize', function () {
      it ('booleans', function () {
        testObj.set('aBooleanField', true);

        var serializedObj = testObj.toObject();

        expect(serializedObj.aBooleanField).toBe(true);
        expect(serializedObj.aDateField).toBeUndefined();
        expect(serializedObj.aNumberField).toBeUndefined();

        expect(serializedObj.aStringField).toBeUndefined();
        expect(serializedObj.aStringListField).toEqual([]);

        expect(serializedObj.aNestedObjectField).toBeUndefined();
        expect(serializedObj.aNestedObjectListField).toEqual([]);

        expect(serializedObj.aTransientField).toBeUndefined();
        expect(serializedObj.aTransientListField).toBeUndefined();
      });

      it('dates into ISO-8601 formatted strings', function () {
        var now = new Date();
        testObj.set('aDateField', now);

        var serializedObj = testObj.toObject();

        expect(serializedObj.aBooleanField).toBeUndefined();
        expect(serializedObj.aDateField).toBe(moment(now).format());
        expect(serializedObj.aNumberField).toBeUndefined();
        expect(serializedObj.aStringField).toBeUndefined();
        expect(serializedObj.aNestedObjectField).toBeUndefined();
        expect(serializedObj.aNestedObjectListField).toEqual([]);
        expect(serializedObj.aTransientField).toBeUndefined();
        expect(serializedObj.aTransientListField).toBeUndefined();
      });

      it('numbers', function () {
        testObj.set('aNumberField', 123);

        var serializedObj = testObj.toObject();

        expect(serializedObj.aBooleanField).toBeUndefined();
        expect(serializedObj.aDateField).toBeUndefined();
        expect(serializedObj.aNumberField).toBe(123);
        expect(serializedObj.aStringField).toBeUndefined();
        expect(serializedObj.aNestedObjectField).toBeUndefined();
        expect(serializedObj.aNestedObjectListField).toEqual([]);
        expect(serializedObj.aTransientField).toBeUndefined();
        expect(serializedObj.aTransientListField).toBeUndefined();
      });

      it('strings', function () {
        testObj.set('aStringField', 'foo');

        var serializedObj = testObj.toObject();

        expect(serializedObj.aBooleanField).toBeUndefined();
        expect(serializedObj.aDateField).toBeUndefined();
        expect(serializedObj.aNumberField).toBeUndefined();
        expect(serializedObj.aStringField).toBe('foo');
        expect(serializedObj.aNestedObjectField).toBeUndefined();
        expect(serializedObj.aNestedObjectListField).toEqual([]);
        expect(serializedObj.aTransientField).toBeUndefined();
        expect(serializedObj.aTransientListField).toBeUndefined();
      });

      it('raw values without any modification', function () {
        var rawValue = new Date();
        testObj.set('aRawField', rawValue);

        var serializedObj = testObj.toObject();
        expect(serializedObj.aRawField).toBeDefined();
        expect(serializedObj.aRawField).toEqual(rawValue);
      });

      it('nested objects', function () {
        var nestedObjectInstance = NestedObject.create().setProperties({aNestedStringField: 'foo', aNestedTransientField: 'fooTransient'});
        testObj.set('aNestedObjectField', nestedObjectInstance);

        var serializedObj = testObj.toObject();

        expect(serializedObj.aBooleanField).toBeUndefined();
        expect(serializedObj.aDateField).toBeUndefined();
        expect(serializedObj.aNumberField).toBeUndefined();
        expect(serializedObj.aStringField).toBeUndefined();
        expect(serializedObj.aNestedObjectField instanceof Object).toBe(true);
        expect(serializedObj.aNestedObjectField.aNestedStringField).toBe('foo');
        expect(serializedObj.aNestedObjectField.aNestedTransientField).toBeUndefined();
        expect(serializedObj.aNestedObjectListField).toEqual([]);
        expect(serializedObj.aTransientField).toBeUndefined();
        expect(serializedObj.aTransientListField).toBeUndefined();
      });

      it('into JSON', function () {
        var nestedObj = NestedObject.create().setProperties({
          aNestedStringField: 'foo',
          aNestedTransientField: 'fooTransient'
        });

        testObj.setProperties({
          aBooleanField: true,
          aDateField: null,
          aNumberField: 123,
          aStringField: 'hello, world',
          aNestedObjectField: nestedObj
        });

        expect(testObj.toJson())
          .toEqual(JSON.stringify({
            aBooleanField: true,
            aNumberField: 123,
            aStringField: 'hello, world',
            aStringListField: [],
            aNestedObjectField: {
              aNestedStringField: 'foo'
            },
            aNestedObjectListField: []
          })
        );
      });

      it('into JSON with root-wrapping, if a rootKey is specified', function () {
        var nestedObj = NestedObject.create().setProperties({
          aNestedStringField: 'foo',
          aNestedTransientField: 'fooTransient'
        });

        var testObj = RootWrappedTestObject.create();
        testObj.setProperties({
          aBooleanField: true,
          aDateField: null,
          aNumberField: 123,
          aStringField: 'hello, world',
          aNestedObjectField: nestedObj
        });

        expect(testObj.toWrappedJson())
          .toEqual(JSON.stringify({
            rootWrapper: {
              aBooleanField: true,
              aNumberField: 123,
              aStringField: 'hello, world',
              aStringListField: [],
              aNestedObjectField: {
                aNestedStringField: 'foo'
              },
              aNestedObjectListField: []
            }
          })
        );
      });

      describe('lists of', function () {
        it('nested objects', function () {
          var nestedObjectInstance1 = NestedObject.create().setProperties({aNestedStringField: 'foo', aNestedTransientField: 'fooTransient'});
          var nestedObjectInstance2 = NestedObject.create().setProperties({aNestedStringField: 'bar', aNestedTransientField: 'barTransient'});
          testObj.set('aNestedObjectListField.content', [nestedObjectInstance1, nestedObjectInstance2]);

          var serializedObj = testObj.toObject();

          expect(serializedObj.aBooleanField).toBeUndefined();
          expect(serializedObj.aDateField).toBeUndefined();
          expect(serializedObj.aNumberField).toBeUndefined();
          expect(serializedObj.aStringField).toBeUndefined();
          expect(serializedObj.aNestedObjectField).toBeUndefined();
          expect(serializedObj.aNestedObjectListField instanceof Array).toBe(true);
          expect(serializedObj.aNestedObjectListField[0] instanceof Object).toBe(true);
          expect(serializedObj.aNestedObjectListField[0].aNestedStringField).toBe('foo');
          expect(serializedObj.aNestedObjectListField[0].aNestedTransientField).toBeUndefined();
          expect(serializedObj.aNestedObjectListField[1] instanceof Object).toBe(true);
          expect(serializedObj.aNestedObjectListField[1].aNestedStringField).toBe('bar');
          expect(serializedObj.aNestedObjectListField[1].aNestedTransientField).toBeUndefined();
          expect(serializedObj.aTransientField).toBeUndefined();
          expect(serializedObj.aTransientListField).toBeUndefined();
        })
      });

    });

    describe('should deserialize', function () {
      it('booleans', function () {
        SerializableObject.fromJson({aBooleanField: 'true'}, TestObject, testObj);

        expect(testObj.get('aBooleanField')).toBe(true);
      });

      it('booleans with numeric values', function () {
        SerializableObject.fromJson({aBooleanField: 1}, TestObject, testObj);

        expect(testObj.get('aBooleanField')).toBe(true);
      });

      it('booleans with unknown values into false', function () {
        SerializableObject.fromJson({aBooleanField: function () {}}, TestObject, testObj);

        expect(testObj.get('aBooleanField')).toBe(false);
      });

      it('numbers', function () {
        SerializableObject.fromJson({aNumberField: '123'}, TestObject, testObj);

        expect(testObj.get('aNumberField')).toBe(123);
      });

      it('strings', function () {
        SerializableObject.fromJson({aStringField: 'foo'}, TestObject, testObj);

        expect(testObj.get('aStringField')).toBe('foo');
      });

      it('dates from ISO-8601 formatted strings', function () {
        var now = moment().format();
        SerializableObject.fromJson({aDateField: now}, TestObject, testObj);

        var dateFieldValue = testObj.get('aDateField');
        expect(dateFieldValue instanceof Date).toBe(true);
        expect(moment(dateFieldValue).format()).toBe(now);
      });

      it('raw values without any modification', function () {
        var rawValue = new Date();
        SerializableObject.fromJson({aRawField: rawValue}, TestObject, testObj);

        var rawFieldValue = testObj.get('aRawField');
        expect(rawFieldValue).toBeDefined();
        expect(rawFieldValue).toEqual(rawValue);
      });

      it('embedded objects', function () {
        SerializableObject.fromJson({aNestedObjectField: {aNestedStringField:'foo'}}, TestObject, testObj);

        var nestedObjectFieldValue = testObj.get('aNestedObjectField');
        expect(nestedObjectFieldValue instanceof NestedObject).toBe(true);
        expect(nestedObjectFieldValue).not.toBeUndefined();
        expect(nestedObjectFieldValue.get('aNestedStringField')).toBe('foo');
      });

      it('transient fields', function () {
        SerializableObject.fromJson({aTransientField: 'foo'}, TestObject, testObj);

        expect(testObj.get('aTransientField')).toBe('foo');
      });
    });

    describe('should be Copyable for', function () {
      afterEach(function() {
        var copy = testObj.copy();
        assertDeepEquals(copy, testObj);

        // ObjectState
        expect(copy.get('objectState.isDirty')).toEqual(false);
        expect(copy.get('objectState.isLoaded')).toEqual(true);
      });

      it('all fields', function () {
        testObj.setProperties({
          aBooleanField: true,
          aDateField: moment(new Date()).format(),
          aNumberField: 123,

          aStringField: 'foo',
          aStringListField: ['a', 'b', 'c'],

          aNestedObjectField: NestedObject.create().setProperties({aNestedStringField: 'nestedFoo', aNestedTransientField: 'nestedBar'}),
          aNestedObjectListField: [NestedObject.create().setProperties({aNestedStringField: 'nestedA', aNestedTransientField: 'nestedATransient'}), NestedObject.create().setProperties({aNestedStringField: 'nestedB', aNestedTransientField: 'nestedBTransient'})],

          aTransientField: 'bar',
          aTransientListField: ['x', 'y', 'z']
        });
      });

      it('no fields', function () {
        testObj.setProperties({
        });
      });

      it('all null/empty', function () {
        testObj.setProperties({
          aBooleanField: null,
          aDateField: null,
          aNumberField: null,

          aStringField: null,
          aStringListField: [],

          aNestedObjectField: null,
          aNestedObjectListField: [],

          aTransientField: null,
          aTransientListField: []
        });
      });

      it('boolean fields', function () {
        testObj.setProperties({
          aBooleanField: false
        });
      });

      it('date fields', function () {
        testObj.setProperties({
          aDateField: moment(new Date()).format()
        });
      });

      it('number fields', function () {
        testObj.setProperties({
          aNumberField: 123
        });
      });

      it('string fields', function () {
        testObj.setProperties({
          aStringField: 'foo'
        });
      });

      it('string list fields', function () {
        testObj.setProperties({
          aStringListField: ['a', 'b', 'c']
        });
      });

      it('nested object fields', function () {
        testObj.setProperties({
          aNestedObjectField: NestedObject.create().setProperties({aNestedStringField: 'nestedFoo', aNestedTransientField: 'nestedBar'})
        });
      });

      it('nested object list fields', function () {
        testObj.setProperties({
          aNestedObjectListField: [NestedObject.create().setProperties({aNestedStringField: 'nestedA', aNestedTransientField: 'nestedATransient'}), NestedObject.create().setProperties({aNestedStringField: 'nestedB', aNestedTransientField: 'nestedBTransient'})]
        });
      });

      it('transient fields', function () {
        testObj.setProperties({
          aTransientField: 'bar'
        });
      });

      it('transient list fields', function () {
        testObj.setProperties({
          aTransientListField: ['x', 'y', 'z']
        });
      });

    });

    describe('should not serialize transient', function (){
      it('fields', function () {
        testObj.set('aTransientField', 'foo');

        var serializedObj = testObj.toObject();

        expect(serializedObj.aBooleanField).toBeUndefined();
        expect(serializedObj.aDateField).toBeUndefined();
        expect(serializedObj.aNumberField).toBeUndefined();
        expect(serializedObj.aStringField).toBeUndefined();
        expect(serializedObj.aNestedObjectField).toBeUndefined();
        expect(serializedObj.aNestedObjectListField).toEqual([]);
        expect(serializedObj.aTransientField).toBeUndefined();
        expect(serializedObj.aTransientListField).toBeUndefined();
      });

      it('lists', function () {
        testObj.set('aTransientListField', ['foo', 'bar']);

        var serializedObj = testObj.toObject();

        expect(serializedObj.aBooleanField).toBeUndefined();
        expect(serializedObj.aDateField).toBeUndefined();
        expect(serializedObj.aNumberField).toBeUndefined();
        expect(serializedObj.aStringField).toBeUndefined();
        expect(serializedObj.aNestedObjectField).toBeUndefined();
        expect(serializedObj.aNestedObjectListField).toEqual([]);
        expect(serializedObj.aTransientField).toBeUndefined();
        expect(serializedObj.aTransientListField).toBeUndefined();
      })
    });

    describe('should have a dirty ObjectState after changing', function () {
      it('primitive fields', function() {
        SerializableObject.fromJson({aStringField: 'foo'}, TestObject, testObj);
        testObj.set('aStringField', 'foo');
        expect(testObj.get('objectState.isDirty')).toBe(false);
        testObj.set('aStringField', 'bar');
        expect(testObj.get('objectState.isDirty')).toBe(true);
      });

      it('nested object fields', function () {
        SerializableObject.fromJson({ aNestedObjectField: {aNestedStringField:'foo'}}, TestObject, testObj);
        var nestedObjectFieldValue = testObj.get('aNestedObjectField');
        testObj.set('aNestedObjectField', nestedObjectFieldValue);
        expect(testObj.get('objectState.isDirty')).toBe(false);
        testObj.set('aNestedObjectField', NestedObject.create());
        expect(testObj.get('objectState.isDirty')).toBe(true);
      });

    });

    it('should have an unwrapRootObject class method', function () {
      expect(SerializableObject.unwrapRootObject).toBeDefined();
      expect(SerializableObject.unwrapRootObject.constructor).toEqual(Function);
    });

    describe ('unwrapRootObject class method', function () {
      it('should unwrap the root object from a JS object, when specifying a type that has a rootKey', function () {
        var obj = {
          aBooleanField: true,
          aNumberField: 123,
          aStringField: 'hello, world',
          aStringListField: [],
          aNestedObjectField: {
            aNestedStringField: 'foo'
          },
          aNestedObjectListField: []
        };
        var returnedObj = SerializableObject.unwrapRootObject(RootWrappedTestObject, {rootWrapper: obj});
        expect(returnedObj).toEqual(obj);
      });

      it('should return an unmodified JS object, when specifying a type that does not have a rootKey', function () {
        var obj = {
          aBooleanField: true,
          aNumberField: 123,
          aStringField: 'hello, world',
          aStringListField: [],
          aNestedObjectField: {
            aNestedStringField: 'foo'
          },
          aNestedObjectListField: []
        };
        var returnedObj = SerializableObject.unwrapRootObject(TestObject, obj);
        expect(returnedObj).toEqual(obj);
      });
    });

    it('should have a wrapRootObject class method', function () {
      expect(SerializableObject.wrapRootObject).toBeDefined();
      expect(SerializableObject.wrapRootObject.constructor).toEqual(Function);
    });

    describe ('wrapRootObject class method', function () {
      it('should wrap a JS object with a root object, when specifying a type that has a rootKey', function () {
        var obj = {
          aBooleanField: true,
          aNumberField: 123,
          aStringField: 'hello, world',
          aStringListField: [],
          aNestedObjectField: {
            aNestedStringField: 'foo'
          },
          aNestedObjectListField: []
        };
        var returnedObj = SerializableObject.wrapRootObject(RootWrappedTestObject, obj);
        expect(returnedObj.rootWrapper).toBeDefined();
        expect(returnedObj.rootWrapper).toEqual(obj);
      });

      it('should return an unmodified JS object, when specifying a type that does not have a rootKey', function () {
        var obj = {
          aBooleanField: true,
          aNumberField: 123,
          aStringField: 'hello, world',
          aStringListField: [],
          aNestedObjectField: {
            aNestedStringField: 'foo'
          },
          aNestedObjectListField: []
        };
        var returnedObj = SerializableObject.wrapRootObject(TestObject, obj);
        expect(returnedObj).toEqual(obj);
      });
    });

    describe('maintain an isLoading state, which', function () {
      it('should be true before an object has been deserialized', function () {
        expect(testObj.get('objectState.isLoading')).toBe(true);
        expect(testObj.get('objectState.isLoaded')).toBe(false);
      });

      it('should be false after an object has been deserialized', function () {
        SerializableObject.fromJson({aBooleanField: 'true'}, TestObject, testObj);

        expect(testObj.get('objectState.isLoading')).toBe(false);
        expect(testObj.get('objectState.isLoaded')).toBe(true);
      });
    });


  });

});
