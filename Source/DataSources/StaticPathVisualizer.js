/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/JulianDate',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/ReferenceFrame',
        '../Core/TimeInterval',
        '../Core/Transforms',
        '../Scene/Material',
        '../Scene/PolylineCollection',
        '../Scene/SceneMode',
        './CompositePositionProperty',
        './ConstantPositionProperty',
        './MaterialProperty',
        './Property',
        './ReferenceProperty',
        './SampledPositionProperty',
        './ScaledPositionProperty',
        './TimeIntervalCollectionPositionProperty'
    ], function(
        AssociativeArray,
        Cartesian3,
        defined,
        destroyObject,
        DeveloperError,
        JulianDate,
        Matrix3,
        Matrix4,
        ReferenceFrame,
        TimeInterval,
        Transforms,
        Material,
        PolylineCollection,
        SceneMode,
        CompositePositionProperty,
        ConstantPositionProperty,
        MaterialProperty,
        Property,
        ReferenceProperty,
        SampledPositionProperty,
        ScaledPositionProperty,
        TimeIntervalCollectionPositionProperty) {
    'use strict';

    var defaultResolution = 60.0;
    var defaultWidth = 1.0;

    var scratchTimeInterval = new TimeInterval();
    var subSampleCompositePropertyScratch = new TimeInterval();
    var subSampleIntervalPropertyScratch = new TimeInterval();

    function EntityData(entity) {
        this.entity = entity;
        this.polyline = undefined;
        this.index = undefined;
        this.updater = undefined;
    }

    function subSampleSampledProperty(property, start, stop, times, referenceFrame, maximumStep, startingIndex, result) {
        var r = startingIndex;
        //Always step exactly on start (but only use it if it exists.)
        var tmp;
        tmp = property.getValueInReferenceFrame(start, referenceFrame, result[r]);
        if (defined(tmp)) {
            result[r++] = tmp;
        }

        //Iterate over all interval times and add the ones that fall in our
        //time range.  Note that times can contain data outside of
        //the intervals range.  This is by design for use with interpolation.
        var t = 0;
        var len = times.length;
        var current = times[t];
        var loopStop = stop;
        var sampling = false;
        var sampleStepsToTake;
        var sampleStepsTaken;
        var sampleStepSize;

        while (t < len) {
            if (JulianDate.greaterThan(current, start) && JulianDate.lessThan(current, loopStop)) {
                tmp = property.getValueInReferenceFrame(current, referenceFrame, result[r]);
                if (defined(tmp)) {
                    result[r++] = tmp;
                }
            }

            if (t < (len - 1)) {
                if (maximumStep > 0 && !sampling) {
                    var next = times[t + 1];
                    var secondsUntilNext = JulianDate.secondsDifference(next, current);
                    sampling = secondsUntilNext > maximumStep;

                    if (sampling) {
                        sampleStepsToTake = Math.ceil(secondsUntilNext / maximumStep);
                        sampleStepsTaken = 0;
                        sampleStepSize = secondsUntilNext / Math.max(sampleStepsToTake, 2);
                        sampleStepsToTake = Math.max(sampleStepsToTake - 1, 1);
                    }
                }

                if (sampling && sampleStepsTaken < sampleStepsToTake) {
                    current = JulianDate.addSeconds(current, sampleStepSize, new JulianDate());
                    sampleStepsTaken++;
                    continue;
                }
            }
            sampling = false;
            t++;
            current = times[t];
        }

        //Always step exactly on stop (but only use it if it exists.)
        tmp = property.getValueInReferenceFrame(stop, referenceFrame, result[r]);
        if (defined(tmp)) {
            result[r++] = tmp;
        }

        return r;
    }

    function subSampleGenericProperty(property, start, stop, referenceFrame, maximumStep, startingIndex, result) {
        var tmp;
        var i = 0;
        var index = startingIndex;
        var time = start;
        var stepSize = Math.max(maximumStep, 60);
        while (JulianDate.lessThan(time, stop)) {
            tmp = property.getValueInReferenceFrame(time, referenceFrame, result[index]);
            if (defined(tmp)) {
                result[index] = tmp;
                index++;
            }
            i++;
            time = JulianDate.addSeconds(start, stepSize * i, new JulianDate());
        }
        //Always sample stop.
        tmp = property.getValueInReferenceFrame(stop, referenceFrame, result[index]);
        if (defined(tmp)) {
            result[index] = tmp;
            index++;
        }
        return index;
    }

    function subSampleIntervalProperty(property, start, stop, referenceFrame, maximumStep, startingIndex, result) {
        subSampleIntervalPropertyScratch.start = start;
        subSampleIntervalPropertyScratch.stop = stop;

        var index = startingIndex;
        var intervals = property.intervals;
        for (var i = 0; i < intervals.length; i++) {
            var interval = intervals.get(i);
            if (!TimeInterval.intersect(interval, subSampleIntervalPropertyScratch, scratchTimeInterval).isEmpty) {
                var time = interval.start;
                if (!interval.isStartIncluded) {
                    if (interval.isStopIncluded) {
                        time = interval.stop;
                    } else {
                        time = JulianDate.addSeconds(interval.start, JulianDate.secondsDifference(interval.stop, interval.start) / 2, new JulianDate());
                    }
                }
                var tmp = property.getValueInReferenceFrame(time, referenceFrame, result[index]);
                if (defined(tmp)) {
                    result[index] = tmp;
                    index++;
                }
            }
        }
        return index;
    }

    function subSampleConstantProperty(property, start, stop, referenceFrame, maximumStep, startingIndex, result) {
        var tmp = property.getValueInReferenceFrame(start, referenceFrame, result[startingIndex]);
        if (defined(tmp)) {
            result[startingIndex++] = tmp;
        }
        return startingIndex;
    }

    function subSampleCompositeProperty(property, start, stop, referenceFrame, maximumStep, startingIndex, result) {
        subSampleCompositePropertyScratch.start = start;
        subSampleCompositePropertyScratch.stop = stop;

        var index = startingIndex;
        var intervals = property.intervals;
        for (var i = 0; i < intervals.length; i++) {
            var interval = intervals.get(i);
            if (!TimeInterval.intersect(interval, subSampleCompositePropertyScratch, scratchTimeInterval).isEmpty) {
                var intervalStart = interval.start;
                var intervalStop = interval.stop;

                var sampleStart = start;
                if (JulianDate.greaterThan(intervalStart, sampleStart)) {
                    sampleStart = intervalStart;
                }

                var sampleStop = stop;
                if (JulianDate.lessThan(intervalStop, sampleStop)) {
                    sampleStop = intervalStop;
                }

                index = reallySubSample(interval.data, sampleStart, sampleStop, referenceFrame, maximumStep, index, result);
            }
        }
        return index;
    }

    function reallySubSample(property, start, stop, referenceFrame, maximumStep, index, result) {
        var innerProperty = property;

        while (innerProperty instanceof ReferenceProperty || innerProperty instanceof ScaledPositionProperty) {
            if (innerProperty instanceof ReferenceProperty) {
                innerProperty = innerProperty.resolvedProperty;
            }
            if (innerProperty instanceof ScaledPositionProperty) {
                innerProperty = innerProperty._value;
            }
        }

        if (innerProperty instanceof SampledPositionProperty) {
            var times = innerProperty._property._times;
            index = subSampleSampledProperty(property, start, stop, times, referenceFrame, maximumStep, index, result);
        } else if (innerProperty instanceof CompositePositionProperty) {
            index = subSampleCompositeProperty(property, start, stop, referenceFrame, maximumStep, index, result);
        } else if (innerProperty instanceof TimeIntervalCollectionPositionProperty) {
            index = subSampleIntervalProperty(property, start, stop, referenceFrame, maximumStep, index, result);
        } else if (innerProperty instanceof ConstantPositionProperty) {
            index = subSampleConstantProperty(property, start, stop, referenceFrame, maximumStep, index, result);
        } else {
            //Fallback to generic sampling.
            index = subSampleGenericProperty(property, start, stop, referenceFrame, maximumStep, index, result);
        }
        return index;
    }

    function subSample(property, start, stop, referenceFrame, maximumStep, result) {
        if (!defined(result)) {
            result = [];
        }

        var length = reallySubSample(property, start, stop, referenceFrame, maximumStep, 0, result);
        result.length = length;
        return result;
    }

    var toFixedScratch = new Matrix3();
    function PolylineUpdater(scene, referenceFrame) {
        this._unusedIndexes = [];
        this._polylineCollection = new PolylineCollection();
        this._scene = scene;
        this._referenceFrame = referenceFrame;
        scene.primitives.add(this._polylineCollection);
    }
    PolylineUpdater.prototype.update = function(time) {
        if (this._referenceFrame === ReferenceFrame.INERTIAL) {
            var toFixed = Transforms.computeIcrfToFixedMatrix(time, toFixedScratch);
            if (!defined(toFixed)) {
                toFixed = Transforms.computeTemeToPseudoFixedMatrix(time, toFixedScratch);
            }
            Matrix4.fromRotationTranslation(toFixed, Cartesian3.ZERO, this._polylineCollection.modelMatrix);
        }
    };

    PolylineUpdater.prototype.updateObject = function(time, item) {
        var entity = item.entity;
        var staticPathGraphics = entity._staticPath;
        var positionProperty = entity._position;

        var sampleStart;
        var sampleStop;
        var showProperty = staticPathGraphics._show;
        var polyline = item.polyline;
        var show = entity.isShowing && (!defined(showProperty) || showProperty.getValue(time));

        //Compute the interval of the path to show based on availability.
        if (show) {
            var availability = entity._availability;
            var hasAvailability = defined(availability);

            //Objects need to have a defined availability in order to
            //draw a path, since we can't draw "infinite" paths.
            if (!hasAvailability) {
                show = false;
            } else {
                sampleStart = availability.start;
                sampleStop = availability.stop;
                show = JulianDate.lessThan(sampleStart, sampleStop);
            }
        }

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(polyline)) {
                this._unusedIndexes.push(item.index);
                item.polyline = undefined;
                polyline.show = false;
                item.index = undefined;
            }
            return;
        }

        if (!defined(polyline)) {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                var index = unusedIndexes.pop();
                polyline = this._polylineCollection.get(index);
                item.index = index;
            } else {
                item.index = this._polylineCollection.length;
                polyline = this._polylineCollection.add();
            }
            polyline.id = entity;
            item.polyline = polyline;
        }

        var resolution = Property.getValueOrDefault(staticPathGraphics._resolution, time, defaultResolution);

        // TODO: How to tell when positionProperty is meaningfully changed?  There's a definitionChanged event...
        if (!defined(polyline.positions[0])) {
            polyline.positions = subSample(positionProperty, sampleStart, sampleStop, this._referenceFrame, resolution, polyline.positions.slice());

            // TODO: Replace with color.
            var junkMaterial = MaterialProperty.getValue(time, staticPathGraphics._material, polyline.material);

            polyline.material = new Material({
                fabric : {
                    uniforms : {
                        updateTime : new Cartesian3(0.0, 0.0, 0.0),
                        color: junkMaterial.uniforms.evenColor || junkMaterial.uniforms.color  // TODO: Replace with color.
                    },
                    components : { // 'vec3(1.0)'
                        diffuse : 'color.rgb', //'vec3(0.5, 0.8, 1.0)',
                        alpha : 'color.a * smoothstep(updateTime.x, updateTime.x - updateTime.y, materialInput.st.s) * ' +
                                          'smoothstep(0.0, updateTime.x - updateTime.y, materialInput.st.s)'
                        //alpha : '((materialInput.st.s < updateTime.x) ? 1.0 : 0.4)'  //'materialInput.st.s'
                    }
                }
            });
        }

        var totalDuration = JulianDate.secondsDifference(sampleStop, sampleStart);
        var currentDuration = JulianDate.secondsDifference(time, sampleStart);
        var uniforms = polyline.material.uniforms;
        uniforms.updateTime.x = currentDuration / totalDuration;
        uniforms.updateTime.y = resolution / totalDuration;

        polyline.show = true;
        //polyline.material = MaterialProperty.getValue(time, staticPathGraphics._material, polyline.material);
        polyline.width = Property.getValueOrDefault(staticPathGraphics._width, time, defaultWidth);


    };

    PolylineUpdater.prototype.removeObject = function(item) {
        var polyline = item.polyline;
        if (defined(polyline)) {
            this._unusedIndexes.push(item.index);
            item.polyline = undefined;
            polyline.show = false;
            polyline.id = undefined;
            item.index = undefined;
        }
    };

    PolylineUpdater.prototype.destroy = function() {
        this._scene.primitives.remove(this._polylineCollection);
        return destroyObject(this);
    };

    /**
     * A {@link Visualizer} which maps {@link Entity#staticPath} to a {@link Polyline}.
     * @alias StaticPathVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    function StaticPathVisualizer(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(StaticPathVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._updaters = {};
        this._entityCollection = entityCollection;
        this._items = new AssociativeArray();

        this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
    }

    /**
     * Updates all of the primitives created by this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    StaticPathVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var updaters = this._updaters;
        for ( var key in updaters) {
            if (updaters.hasOwnProperty(key)) {
                updaters[key].update(time);
            }
        }

        var items = this._items.values;
        for (var i = 0, len = items.length; i < len; i++) {
            var item = items[i];
            var entity = item.entity;
            var positionProperty = entity._position;

            var lastUpdater = item.updater;

            var frameToVisualize = ReferenceFrame.FIXED;
            if (this._scene.mode === SceneMode.SCENE3D) {
                frameToVisualize = positionProperty.referenceFrame;
            }

            var currentUpdater = this._updaters[frameToVisualize];

            if ((lastUpdater === currentUpdater) && (defined(currentUpdater))) {
                currentUpdater.updateObject(time, item);
                continue;
            }

            if (defined(lastUpdater)) {
                lastUpdater.removeObject(item);
            }

            if (!defined(currentUpdater)) {
                currentUpdater = new PolylineUpdater(this._scene, frameToVisualize);
                currentUpdater.update(time);
                this._updaters[frameToVisualize] = currentUpdater;
            }

            item.updater = currentUpdater;
            if (defined(currentUpdater)) {
                currentUpdater.updateObject(time, item);
            }
        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    StaticPathVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    StaticPathVisualizer.prototype.destroy = function() {
        this._entityCollection.collectionChanged.removeEventListener(StaticPathVisualizer.prototype._onCollectionChanged, this);

        var updaters = this._updaters;
        for ( var key in updaters) {
            if (updaters.hasOwnProperty(key)) {
                updaters[key].destroy();
            }
        }

        return destroyObject(this);
    };

    StaticPathVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var item;
        var items = this._items;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._staticPath) && defined(entity._position)) {
                items.set(entity.id, new EntityData(entity));
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._staticPath) && defined(entity._position)) {
                if (!items.contains(entity.id)) {
                    items.set(entity.id, new EntityData(entity));
                }
            } else {
                item = items.get(entity.id);
                if (defined(item)) {
                    item.updater.removeObject(item);
                    items.remove(entity.id);
                }
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            item = items.get(entity.id);
            if (defined(item)) {
                if (defined(item.updater)) {
                    item.updater.removeObject(item);
                }
                items.remove(entity.id);
            }
        }
    };

    //for testing
    StaticPathVisualizer._subSample = subSample;

    return StaticPathVisualizer;
});
