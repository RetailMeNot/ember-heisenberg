define([
  'SerializableArray',
  'SerializableObject'
], function (
/** EH.SerializableArray */ SerializableArray,
/** EH.SerializableObject */ SerializableObject
) {

  /**
   * @class NestedObject
   * @extends EH.SerializableObject
   */
  var NestedObject = SerializableObject.extend(/** @lends NestedObject# */{
    aNestedStringField: SerializableObject.stringField()
  });

  /**
   * @class TestObject
   * @extends EH.SerializableObject
   * @mixes Ember.ClassMixin
   */
  var TestObject = SerializableObject.extend(/** @lends TestObject# */{
    aStringList: SerializableObject.stringList(),
    aBooleanList: SerializableObject.booleanList(),
    aDateList: SerializableObject.dateList(),

    aNestedObjectList: SerializableObject.list(NestedObject)
  });

  /**
   * @class SimpleObject
   * @extends EH.SerializableObject
   * @mixes Ember.ClassMixin
   */
  var SimpleObject = SerializableObject.extend(/** @lends SimpleObject# */{
    aStringField: SerializableObject.stringField(),

    isEqual: function (other) {
      if (Em.isNone(other)) {
        return false;
      }

      return this.get('aStringField') === other.get('aStringField');
    }
  });

  /**
   * @class RootWrappedSimpleObject
   * @extends EH.SerializableObject
   * @mixes Ember.ClassMixin
   */
  var RootWrappedSimpleObject = SimpleObject.extend(/** @lends RootWrappedSimpleObject# */{
  });
  RootWrappedSimpleObject.reopenClass({
    rootKey: 'rootWrapper'
  });



  describe('SerializableObjects', function () {

    var testObj;
    beforeEach(function () {
      testObj = TestObject.create({});
    });

    describe('should serialize', function () {
      describe('lists of', function () {

        it('strings', function () {
          testObj.set('aStringList.content', ['foo', 'bar', 'baz']);

          var serializedObj = testObj.toObject();

          expect(serializedObj.aStringList).toEqual(['foo', 'bar', 'baz']);
          expect(serializedObj.aBooleanList).toEqual([]);
          expect(serializedObj.aDateList).toEqual([]);
          expect(serializedObj.aNestedObjectList).toEqual([]);
        });

        it('booleans', function () {
          testObj.set('aBooleanList.content', [true, false, true]);

          var serializedObj = testObj.toObject();

          expect(serializedObj.aStringList).toEqual([]);
          expect(serializedObj.aBooleanList).toEqual([true, false, true]);
          expect(serializedObj.aDateList).toEqual([]);
          expect(serializedObj.aNestedObjectList).toEqual([]);
        });

        it('dates into lists of ISO-8601 formatted strings', function () {
          var dateList = [new Date(), new Date(), new Date()];
          testObj.set('aDateList.content', dateList);

          var serializedObj = testObj.toObject();

          var formattedDateList = dateList.map(function (date) {
            return moment(date).format();
          });
          expect(serializedObj.aStringList).toEqual([]);
          expect(serializedObj.aBooleanList).toEqual([]);
          expect(serializedObj.aDateList).toEqual(formattedDateList);
          expect(serializedObj.aNestedObjectList).toEqual([]);
        });
      });

    });


    describe('should deserialize', function () {
      describe('lists of', function () {

        it('strings', function () {
          var strings = ['foo', 'bar', 'baz', 'baz'];
          SerializableObject.fromJson({aStringList: strings}, TestObject, testObj);

          expect(testObj.get('aStringList.content')).toEqual(strings);
        });

        it('booleans', function () {
          var booleans = [true, false, true];
          SerializableObject.fromJson({aBooleanList: booleans}, TestObject, testObj);

          expect(testObj.get('aBooleanList.content')).toEqual(booleans);
        });

        it('dates from lists of ISO-8601 formatted strings', function () {
          var momentList = [moment().format(), moment().format(), moment().format()];
          SerializableObject.fromJson({aDateList: momentList}, TestObject, testObj);

          var dateListValue = testObj.get('aDateList.content');
          dateListValue.forEach(function (date) {
            expect(date instanceof Date).toBe(true);
          });
          var dateListValueAsMoments = dateListValue.map(function (date) {
            return moment(date).format();
          });
          expect(dateListValueAsMoments).toEqual(momentList);
        });
      });

      it('lists of nested objects', function () {
        var strings = ['foo', 'bar', 'baz'];
        var nestedObjList = strings.map(function (fieldValue) {
          return {aNestedStringField: fieldValue};
        });
        SerializableObject.fromJson({aNestedObjectList: nestedObjList}, TestObject, testObj);

        var nestedObjectListValue = testObj.get('aNestedObjectList.content');
        expect(nestedObjectListValue).not.toBeUndefined();
        nestedObjectListValue.forEach(function (nestedObj) {
          expect(nestedObj instanceof NestedObject).toBe(true);
        });
        expect(nestedObjectListValue.getEach('aNestedStringField')).toEqual(strings);
      });

    });

  });


  describe('SerializableArrays', function () {

    var testArray;
    beforeEach(function () {
      testArray = SerializableArray.create({type: SimpleObject});
    });

    function asSerializableObjectArray(key, type) {
      if (Em.isNone(type)) {
        type = SimpleObject;
      }
      return function (value) {
        var o = type.create();
        o.set(key, value);
        return o;
      }
    }

    function asRawObjectArray(key) {
      return function (value) {
        var o = {};
        o[key] = value;
        return o;
      }
    }

    describe('of SerializableObjects', function () {
      it('should serialize into lists of raw objects', function () {
        var input = ['foo', 'bar', 'baz'];
        var fieldName = 'aStringField';

        testArray.set('content', input.map(asSerializableObjectArray(fieldName)));

        var serializedArray = testArray.toObject();

        var expected = input.map(asRawObjectArray(fieldName));
        expect(serializedArray).toEqual(expected);
      });

      it('should serialize into JSON', function () {
        var input = ['foo', 'bar', 'baz'];
        var fieldName = 'aStringField';

        testArray.set('content', input.map(asSerializableObjectArray(fieldName)));

        var serializedArrayJson = testArray.toJson();

        var expected = input.map(asRawObjectArray(fieldName));
        expect(serializedArrayJson).toEqual(JSON.stringify(expected));
      });

      describe('that have a specified rootKey', function () {
        it('should root-wrap serialized JSON when toWrappedJson is called', function () {
          var input = ['foo', 'bar', 'baz'];
          var fieldName = 'aStringField';
          testArray = SerializableArray.create({type: RootWrappedSimpleObject});

          testArray.set('content', input.map(asSerializableObjectArray(fieldName, RootWrappedSimpleObject)));

          var serializedArrayJson = testArray.toWrappedJson();

          var expected = input.map(asRawObjectArray(fieldName));
          expect(serializedArrayJson).toEqual(JSON.stringify({rootWrapper: expected}));
        });
      });

      describe('that do not have a specifiedRootKey', function () {
        it('should not root-wrap serialized JSON when toWrappedJson is called', function () {
          var input = ['foo', 'bar', 'baz'];
          var fieldName = 'aStringField';

          testArray.set('content', input.map(asSerializableObjectArray(fieldName)));

          var serializedArrayJson = testArray.toWrappedJson();

          var expected = input.map(asRawObjectArray(fieldName));
          expect(serializedArrayJson).toEqual(JSON.stringify(expected));
        });
      });

      describe('are searchable using the indexOf instance method, which', function () {
        it('should return the correct index of an item that is found', function () {
          var input = ['foo', 'bar', 'baz'];
          var fieldName = 'aStringField';

          var contents = input.map(asSerializableObjectArray(fieldName));
          testArray.set('content', contents);

          expect(testArray.indexOf(SimpleObject.create({aStringField: 'baz'}))).toBe(2);
        });

        it('should return -1 when an item is not', function () {
          var input = ['foo', 'bar', 'baz'];
          var fieldName = 'aStringField';

          var contents = input.map(asSerializableObjectArray(fieldName));
          testArray.set('content', contents);

          expect(testArray.indexOf(SimpleObject.create({aStringField: 'blar'}))).toBe(-1);
        });
      });

      describe('are comparable using Ember.isEqual, which', function () {

        var testArray2;
        beforeEach(function () {
          testArray2 = SerializableArray.create({type: SimpleObject});
        });

        it('should return false when the other array is null, undefined, or empty', function () {
          var fieldName = 'aStringField';

          var contents = ['foo', 'bar', 'baz'].map(asSerializableObjectArray(fieldName));
          testArray.set('content', contents);

          expect(testArray.isEqual(null)).toBe(false);
          expect(testArray.isEqual(undefined)).toBe(false);
          expect(testArray.isEqual([])).toBe(false);
        });

        it('should return false when arrays are of differing lengths', function () {
          var fieldName = 'aStringField';

          var contents = ['foo', 'bar', 'baz'].map(asSerializableObjectArray(fieldName));
          testArray.set('content', contents);

          var contents2 = ['bork', 'bark'].map(asSerializableObjectArray(fieldName));
          testArray2.set('content', contents2);

          expect(testArray.isEqual(testArray2)).toBe(false);
        });

        it('should return false when arrays are of differing contents', function () {
          var fieldName = 'aStringField';

          var contents = ['foo', 'bar', 'baz'].map(asSerializableObjectArray(fieldName));
          testArray.set('content', contents);

          var contents2 = ['bork', 'bark', 'blob'].map(asSerializableObjectArray(fieldName));
          testArray2.set('content', contents2);

          expect(testArray.isEqual(testArray2)).toBe(false);
        });

        it('should return true when arrays have the same contents', function () {
          var fieldName = 'aStringField';

          var contents = ['foo', 'bar', 'baz'].map(asSerializableObjectArray(fieldName));
          testArray.set('content', contents);

          var contents2 = ['foo', 'bar', 'baz'].map(asSerializableObjectArray(fieldName));
          testArray2.set('content', contents2);

          expect(testArray.isEqual(testArray2)).toBe(true);
        });

      });

      it('should be Copyable', function () {
        var input = ['foo', 'bar', 'baz'];
        var fieldName = 'aStringField';

        var contents = input.map(asSerializableObjectArray(fieldName));
        testArray.set('content', contents);

        expect(testArray.copy).toBeDefined();

        var copyArray = testArray.copy();
        expect(testArray.isEqual(copyArray)).toBe(true);
      });
    });

  });

});
