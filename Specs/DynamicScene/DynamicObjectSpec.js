/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian3',
             'Core/Quaternion',
             'Core/Iso8601',
             'Core/TimeInterval'
            ], function(
              DynamicObject,
              JulianDate,
              Cartesian3,
              Quaternion,
              Iso8601,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets id.', function() {
        var dynamicObject = new DynamicObject('someId');
        expect(dynamicObject.id).toEqual('someId');
    });

    it('isAvailable is always true if no availability defined.', function() {
        var dynamicObject = new DynamicObject('someId');
        expect(dynamicObject.isAvailable(new JulianDate())).toEqual(true);
    });

    it('isAvailable throw if no time specified.', function() {
        var dynamicObject = new DynamicObject('someId');
        expect(function() {
            dynamicObject.isAvailable();
        }).toThrow();
    });

    it('constructor creates a unique id if one is not provided.', function() {
        var object = new DynamicObject();
        var object2 = new DynamicObject();
        expect(object.id).toBeDefined();
        expect(object.id).toNotEqual(object2.id);
    });

    it('isAvailable works.', function() {
        var dynamicObject = new DynamicObject('dynamicObject');
        var interval = TimeInterval.fromIso8601('2000-01-01/2001-01-01');
        dynamicObject._setAvailability(interval);
        expect(dynamicObject.isAvailable(interval.start.addSeconds(-1))).toEqual(false);
        expect(dynamicObject.isAvailable(interval.start)).toEqual(true);
        expect(dynamicObject.isAvailable(interval.stop)).toEqual(true);
        expect(dynamicObject.isAvailable(interval.stop.addSeconds(1))).toEqual(false);
    });

    it('mergeProperties does not change a fully configured billboard', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.position = 1;
        objectToMerge.orientation = 2;
        objectToMerge.vertexPositions = 3;
        objectToMerge.availability = TimeInterval.fromIso8601('2000-01-01/2001-01-01');
        objectToMerge.viewFrom = 5;

        var targetObject = new DynamicObject('targetObject');
        targetObject.position = 6;
        targetObject.orientation = 7;
        targetObject.vertexPositions = 8;
        targetObject.availability = TimeInterval.fromIso8601('2002-01-01/2003-01-01');
        targetObject.viewFrom = 10;

        DynamicObject.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.position).toEqual(6);
        expect(targetObject.orientation).toEqual(7);
        expect(targetObject.vertexPositions).toEqual(8);
        expect(targetObject.availability).toEqual(objectToMerge.availability); //Is currently always overwritten
        expect(targetObject.viewFrom).toEqual(10);
    });

    it('mergeProperties creates and configures an undefined object', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.position = 1;
        objectToMerge.orientation = 2;
        objectToMerge.vertexPositions = 3;
        objectToMerge.availability = 4;
        objectToMerge.viewFrom = 4;

        var targetObject = new DynamicObject('targetObject');

        DynamicObject.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.position).toEqual(objectToMerge.position);
        expect(targetObject.orientation).toEqual(objectToMerge.orientation);
        expect(targetObject.vertexPositions).toEqual(objectToMerge.vertexPositions);
        expect(targetObject.availability).toEqual(objectToMerge.availability);
        expect(targetObject.viewFrom).toEqual(objectToMerge.viewFrom);
    });

    it('mergeProperties does not change when used with an undefined object', function() {
        var objectToMerge = new DynamicObject('targetObject');

        var targetObject = new DynamicObject('objectToMerge');
        targetObject.position = 1;
        targetObject.orientation = 2;
        targetObject.vertexPositions = 3;
        targetObject.availability = 4;
        targetObject.viewFrom = 5;

        DynamicObject.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.position).toEqual(1);
        expect(targetObject.orientation).toEqual(2);
        expect(targetObject.vertexPositions).toEqual(3);
        expect(targetObject.availability).toEqual(4);
        expect(targetObject.viewFrom).toEqual(5);
    });

    it('undefineProperties works', function() {
        var dynamicObject = new DynamicObject('testObject');

        dynamicObject.position = 1;
        dynamicObject.orientation = 2;
        dynamicObject.vertexPositions = 3;
        dynamicObject.availability = 4;
        dynamicObject.viewFrom = 5;

        DynamicObject.undefineProperties(dynamicObject);

        expect(dynamicObject.position).toBeUndefined();
        expect(dynamicObject.orientation).toBeUndefined();
        expect(dynamicObject.vertexPositions).toBeUndefined();
        expect(dynamicObject.availability).toBeUndefined();
        expect(dynamicObject.viewFrom).toBeUndefined();
    });
});