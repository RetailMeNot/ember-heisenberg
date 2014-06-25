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
  var NestedObject = SerializableObject.extend(/** @lends TestObject# */{
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

  describe('SerializableObjects', function () {

    var testObj;
    beforeEach(function () {
      testObj = TestObject.create({});
    });

    it('should serialize a list of strings', function () {
      testObj.set('aStringList.content', ['foo', 'bar', 'baz']);

      var serializedObj = testObj.toObject();

      expect(serializedObj.aStringList).toEqual(['foo', 'bar', 'baz']);
      expect(serializedObj.aBooleanList).toEqual([]);
      expect(serializedObj.aDateList).toEqual([]);
      expect(serializedObj.aNestedObjectList).toEqual([]);
    });

    it('should serialize a list of booleans', function () {
      testObj.set('aBooleanList.content', [true, false, true]);

      var serializedObj = testObj.toObject();

      expect(serializedObj.aStringList).toEqual([]);
      expect(serializedObj.aBooleanList).toEqual([true, false, true]);
      expect(serializedObj.aDateList).toEqual([]);
      expect(serializedObj.aNestedObjectList).toEqual([]);
    });

    it('should serialize a list of dates into a list of ISO-8601 formatted strings', function () {
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

    it('should serialize a list of nested objects', function () {
      var strings = ['foo', 'bar', 'baz', 'baz'];
      var nestedObjList = strings.map(function (fieldValue) {
        return NestedObject.create().setProperties({aNestedStringField: fieldValue});
      });
      testObj.set('aNestedObjectList.content', nestedObjList);

      var serializedObj = testObj.toObject();

      var serializedNestedObjList = strings.map(function (fieldValue) {
        return {aNestedStringField: fieldValue};
      });

      expect(serializedObj.aStringList).toEqual([]);
      expect(serializedObj.aBooleanList).toEqual([]);
      expect(serializedObj.aDateList).toEqual([]);
      expect(serializedObj.aNestedObjectList instanceof Array).toBe(true);
      expect(serializedObj.aNestedObjectList).toEqual(serializedNestedObjList);
    });

    it('should deserialize strings', function () {
      var strings = ['foo', 'bar', 'baz', 'baz'];
      SerializableObject.fromJson({aStringList: strings}, TestObject, testObj);

      expect(testObj.get('aStringList.content')).toEqual(strings);
    });

    it('should deserialize booleans', function () {
      var booleans = [true, false, true];
      SerializableObject.fromJson({aBooleanList: booleans}, TestObject, testObj);

      expect(testObj.get('aBooleanList.content')).toEqual(booleans);
    });

    it('should deserialize a list of dates from a list of ISO-8601 formatted strings', function () {
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

    it('should deserialize embedded objects', function () {
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