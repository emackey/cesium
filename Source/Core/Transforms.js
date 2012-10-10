/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Math',
        './Matrix3',
        './Matrix4',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './TimeConstants',
        './Ellipsoid'
    ],
    function(
        defaultValue,
        DeveloperError,
        CesiumMath,
        Matrix3,
        Matrix4,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        TimeConstants,
        Ellipsoid) {
    "use strict";

    var gmstConstant0 = 6 * 3600 + 41 * 60 + 50.54841;
    var gmstConstant1 = 8640184.812866;
    var gmstConstant2 = 0.093104;
    var gmstConstant3 = -6.2E-6;
    var rateCoef = 1.1772758384668e-19;
    var wgs84WRPrecessing = 7.2921158553E-5;
    var twoPiOverSecondsInDay = CesiumMath.TWO_PI / 86400.0;

    var eastNorthUpToFixedFrameNormal = new Cartesian3();
    var eastNorthUpToFixedFrameTangent = new Cartesian3();
    var eastNorthUpToFixedFrameBitangent = new Cartesian3();

    var northEastDownToFixedFrameNormal = new Cartesian3();
    var northEastDownToFixedFrameTangent = new Cartesian3();
    var northEastDownToFixedFrameBitangent = new Cartesian3();

    var pointToWindowCoordinatesTemp = new Cartesian4();

    /**
     * Contains functions for transforming positions to various reference frames.
     * @exports Transforms
     */
    var Transforms = {
        /**
         * Computes a 4x4 transformation matrix from a reference frame with an east-north-up axes
         * centered at the provided origin to the provided ellipsoid's fixed reference frame.
         * The local axes are defined as:
         * <ul>
         * <li>The <code>x</code> axis points in the local east direction.</li>
         * <li>The <code>y</code> axis points in the local north direction.</li>
         * <li>The <code>z</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
         * </ul>
         *
         * @param {Cartesian3} origin The center point of the local reference frame.
         * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
         * @param {Matrix4} [result] The object onto which to store the result.
         * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
         *
         * @exception {DeveloperError} origin is required.
         *
         * @example
         * // Get the transform from local east-north-up at cartographic (0.0, 0.0) to Earth's fixed frame.
         * var ellipsoid = Ellipsoid.WGS84;
         * var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
         * var transform = Transforms.eastNorthUpToFixedFrame(center);
         */
        eastNorthUpToFixedFrame : function(origin, ellipsoid, result) {
            if (typeof origin === 'undefined') {
                throw new DeveloperError('origin is required.');
            }

            // If x and y are zero, assume origin is at a pole, which is a special case.
            if (CesiumMath.equalsEpsilon(origin.x, 0.0, CesiumMath.EPSILON14) &&
                CesiumMath.equalsEpsilon(origin.y, 0.0, CesiumMath.EPSILON14)) {
                var sign = CesiumMath.sign(origin.z);
                if (typeof result === 'undefined') {
                    return new Matrix4(
                            0.0, -sign,  0.0, origin.x,
                            1.0,   0.0,  0.0, origin.y,
                            0.0,   0.0, sign, origin.z,
                            0.0,   0.0,  0.0, 1.0);
                }
                result[0] = 0.0;
                result[1] = 1.0;
                result[2] = 0.0;
                result[3] = 0.0;
                result[4] = -sign;
                result[5] = 0.0;
                result[6] = 0.0;
                result[7] = 0.0;
                result[8] = 0.0;
                result[9] = 0.0;
                result[10] = sign;
                result[11] = 0.0;
                result[12] = origin.x;
                result[13] = origin.y;
                result[14] = origin.z;
                result[15] = 1.0;
                return result;
            }

            var normal = eastNorthUpToFixedFrameNormal;
            var tangent  = eastNorthUpToFixedFrameTangent;
            var bitangent = eastNorthUpToFixedFrameBitangent;

            ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
            ellipsoid.geodeticSurfaceNormal(origin, normal);

            tangent.x = -origin.y;
            tangent.y = origin.x;
            tangent.z = 0.0;
            Cartesian3.normalize(tangent, tangent);

            normal.cross(tangent, bitangent);

            if (typeof result === 'undefined') {
                return new Matrix4(
                        tangent.x, bitangent.x, normal.x, origin.x,
                        tangent.y, bitangent.y, normal.y, origin.y,
                        tangent.z, bitangent.z, normal.z, origin.z,
                        0.0,       0.0,         0.0,      1.0);
            }
            result[0] = tangent.x;
            result[1] = tangent.y;
            result[2] = tangent.z;
            result[3] = 0.0;
            result[4] = bitangent.x;
            result[5] = bitangent.y;
            result[6] = bitangent.z;
            result[7] = 0.0;
            result[8] = normal.x;
            result[9] = normal.y;
            result[10] = normal.z;
            result[11] = 0.0;
            result[12] = origin.x;
            result[13] = origin.y;
            result[14] = origin.z;
            result[15] = 1.0;
            return result;
        },

        /**
         * Computes a 4x4 transformation matrix from a reference frame with an north-east-down axes
         * centered at the provided origin to the provided ellipsoid's fixed reference frame.
         * The local axes are defined as:
         * <ul>
         * <li>The <code>x</code> axis points in the local north direction.</li>
         * <li>The <code>y</code> axis points in the local east direction.</li>
         * <li>The <code>z</code> axis points in the opposite direction of the ellipsoid surface normal which passes through the position.</li>
         * </ul>
         *
         * @param {Cartesian3} origin The center point of the local reference frame.
         * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
         * @param {Matrix4} [result] The object onto which to store the result.
         * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
         *
         * @exception {DeveloperError} origin is required.
         *
         * @example
         * // Get the transform from local north-east-down at cartographic (0.0, 0.0) to Earth's fixed frame.
         * var ellipsoid = Ellipsoid.WGS84;
         * var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
         * var transform = Transforms.northEastDownToFixedFrame(center);
         */
        northEastDownToFixedFrame : function(origin, ellipsoid, result) {
            if (typeof origin === 'undefined') {
                throw new DeveloperError('origin is required.');
            }

            if (CesiumMath.equalsEpsilon(origin.x, 0.0, CesiumMath.EPSILON14) &&
                CesiumMath.equalsEpsilon(origin.y, 0.0, CesiumMath.EPSILON14)) {
                // The poles are special cases.  If x and y are zero, assume origin is at a pole.
                var sign = CesiumMath.sign(origin.z);
                if (typeof result === 'undefined') {
                    return new Matrix4(
                      -sign, 0.0,   0.0, origin.x,
                        0.0, 1.0,   0.0, origin.y,
                        0.0, 0.0, -sign, origin.z,
                        0.0, 0.0,   0.0, 1.0);
                }
                result[0] = -sign;
                result[1] = 0.0;
                result[2] = 0.0;
                result[3] = 0.0;
                result[4] = 0.0;
                result[5] = 1.0;
                result[6] = 0.0;
                result[7] = 0.0;
                result[8] = 0.0;
                result[9] = 0.0;
                result[10] = -sign;
                result[11] = 0.0;
                result[12] = origin.x;
                result[13] = origin.y;
                result[14] = origin.z;
                result[15] = 1.0;
                return result;
            }

            var normal = northEastDownToFixedFrameNormal;
            var tangent = northEastDownToFixedFrameTangent;
            var bitangent = northEastDownToFixedFrameBitangent;

            ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
            ellipsoid.geodeticSurfaceNormal(origin, normal);

            tangent.x = -origin.y;
            tangent.y = origin.x;
            tangent.z = 0.0;
            Cartesian3.normalize(tangent, tangent);

            normal.cross(tangent, bitangent);

            if (typeof result === 'undefined') {
                return new Matrix4(
                        bitangent.x, tangent.x, -normal.x, origin.x,
                        bitangent.y, tangent.y, -normal.y, origin.y,
                        bitangent.z, tangent.z, -normal.z, origin.z,
                        0.0,       0.0,         0.0,      1.0);
            }
            result[0] = bitangent.x;
            result[1] = bitangent.y;
            result[2] = bitangent.z;
            result[3] = 0.0;
            result[4] = tangent.x;
            result[5] = tangent.y;
            result[6] = tangent.z;
            result[7] = 0.0;
            result[8] = -normal.x;
            result[9] = -normal.y;
            result[10] = -normal.z;
            result[11] = 0.0;
            result[12] = origin.x;
            result[13] = origin.y;
            result[14] = origin.z;
            result[15] = 1.0;
            return result;
        },

        /**
         * Computes a rotation matrix to transform a point or vector from True Equator Mean Equinox (TEME) axes to the
         * pseudo-fixed axes at a given time.  This method treats the UT1 time standard as equivalent to UTC.
         *
         * @param {JulianDate} date The time at which to compute the rotation matrix.
         * @param {Matrix3} [result] The object onto which to store the result.
         * @return {Matrix3} The modified result parameter or a new Matrix3 instance if none was provided.
         *
         * @exception {DeveloperError} date is required.
         *
         * @example
         * //Set the view to in the inertial frame.
         * scene.setAnimation(function() {
         *     var time = new JulianDate();
         *     scene.getCamera().transform = Matrix4.fromRotationTranslation(Transforms.computeTemeToPseudoFixedMatrix(time), Cartesian3.ZERO)});;
         * });
         */
        computeTemeToPseudoFixedMatrix : function (date, result) {
            if (typeof date === 'undefined') {
                throw new DeveloperError('date is required.');
            }

            // GMST is actually computed using UT1.  We're using UTC as an approximation of UT1.
            // We do not want to use the function like convertTaiToUtc in JulianDate because
            // we explicitly do not want to fail when inside the leap second.

            var dateInUtc = date.addSeconds(-date.getTaiMinusUtc());
            var utcDayNumber = dateInUtc.getJulianDayNumber();
            var utcSecondsIntoDay = dateInUtc.getSecondsOfDay();

            var t;
            var diffDays = utcDayNumber - 2451545;
            if (utcSecondsIntoDay >= 43200.0) {
                t = (diffDays + 0.5) / TimeConstants.DAYS_PER_JULIAN_CENTURY;
            } else {
                t = (diffDays - 0.5) / TimeConstants.DAYS_PER_JULIAN_CENTURY;
            }

            var gmst0 = gmstConstant0 + t * (gmstConstant1 + t * (gmstConstant2 + t * gmstConstant3));
            var angle = (gmst0 * twoPiOverSecondsInDay) % CesiumMath.TWO_PI;
            var ratio = wgs84WRPrecessing + rateCoef * (utcDayNumber - 2451545.5);
            var secondsSinceMidnight = (utcSecondsIntoDay + TimeConstants.SECONDS_PER_DAY * 0.5) % TimeConstants.SECONDS_PER_DAY;
            var gha = angle + (ratio * secondsSinceMidnight);
            var cosGha = Math.cos(gha);
            var sinGha = Math.sin(gha);

            if (typeof result === 'undefined') {
                return new Matrix3(cosGha, sinGha, 0.0,
                                  -sinGha, cosGha, 0.0,
                                      0.0,    0.0, 1.0);
            }
            result[0] = cosGha;
            result[1] = -sinGha;
            result[2] = 0.0;
            result[3] = sinGha;
            result[4] = cosGha;
            result[5] = 0.0;
            result[6] = 0.0;
            result[7] = 0.0;
            result[8] = 1.0;
            return result;
        },

        /**
         * Transform a point from model coordinates to window coordinates.
         *
         * @param {Matrix4} modelViewProjectionMatrix The 4x4 model-view-projection matrix.
         * @param {Matrix4} viewportTransformation The 4x4 viewport transformation.
         * @param {Cartesian3} point The point to transform.
         * @param {Cartesian2} [result] The object onto which to store the result.
         * @return {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
         *
         * @exception {DeveloperError} modelViewProjectionMatrix is required.
         * @exception {DeveloperError} viewportTransformation is required.
         * @exception {DeveloperError} point is required.
         *
         * @see UniformState#getModelViewProjection
         * @see czm_modelViewProjection
         * @see UniformState#getViewportTransformation
         * @see czm_viewportTransformation
         */
        pointToWindowCoordinates : function (modelViewProjectionMatrix, viewportTransformation, point, result) {
            if (typeof modelViewProjectionMatrix === 'undefined') {
                throw new DeveloperError('modelViewProjectionMatrix is required.');
            }

            if (typeof viewportTransformation === 'undefined') {
                throw new DeveloperError('viewportTransformation is required.');
            }

            if (typeof point === 'undefined') {
                throw new DeveloperError('point is required.');
            }

            var tmp = pointToWindowCoordinatesTemp;
            tmp.x = point.x;
            tmp.y = point.y;
            tmp.z = point.z;
            tmp.w = 1.0;

            Matrix4.multiplyByVector(modelViewProjectionMatrix, tmp, tmp);
            Cartesian4.multiplyByScalar(tmp, 1.0 / tmp.w, tmp);
            Matrix4.multiplyByVector(viewportTransformation, tmp, tmp);
            return Cartesian2.fromCartesian4(tmp, result);
        }
    };

    return Transforms;
});
