/*global define*/
define([
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../createCommand',
        '../ToggleButtonViewModel',
        '../../ThirdParty/sprintf',
        '../../ThirdParty/knockout'
    ], function(
        defineProperties,
        DeveloperError,
        createCommand,
        ToggleButtonViewModel,
        sprintf,
        knockout) {
    "use strict";

    var maxZoomRingAngle = 45;
    var maxTiltRingAngle = 45;
    var maxPointerDistance = 40;

    var NavigationViewModel = function() {

        this._zoomRingAngle = 0;
        this._tiltRingAngle = 0;
        this._northRingAngle = 0;
        this._pointerDistance = 0;
        this._pointerDirection = 0;

        knockout.track(this, ['_zoomRingAngle', '_tiltRingAngle', '_northRingAngle', '_pointerDistance', '_pointerDirection']);

        knockout.defineProperty(this, 'zoomRingAngle', {
            get : function () {
                return this._zoomRingAngle;
            },
            set : function (angle) {
                angle = Math.max(Math.min(angle, maxZoomRingAngle), -maxZoomRingAngle);
                this._zoomRingAngle = angle;
            }
        });

        knockout.defineProperty(this, 'tiltRingAngle', {
            get : function () {
                return this._tiltRingAngle;
            },
            set : function (angle) {
                angle = Math.max(Math.min(angle, maxTiltRingAngle), -maxTiltRingAngle);
                this._tiltRingAngle = angle;
            }
        });

        knockout.defineProperty(this, 'northRingAngle', {
            get : function () {
                return this._northRingAngle;
            },
            set : function (angle) {
                this._northRingAngle = angle;
            }
        });

        knockout.defineProperty(this, 'pointerDistance', {
            get : function () {
                return this._pointerDistance;
            },
            set : function (distance) {
                distance = Math.min(distance, maxPointerDistance);
                this._pointerDistance = distance;
            }
        });

        knockout.defineProperty(this, 'pointerDirection', {
            get : function () {
                return this._pointerDirection;
            },
            set : function (direction) {
                this._pointerDirection = direction;
            }
        });

        this._zoomIn = createCommand(function() {
            this.zoomRingAngle-=0.25;
            console.log("Zoom In!");
        });

        this._zoomOut = createCommand(function() {
            this.zoomRingAngle+=0.25;
            console.log("Zoom Out!");
        });

    };

    defineProperties(NavigationViewModel.prototype, {
        zoomIn : {
            get : function() {
                return this._zoomIn;
            }
        },

        zoomOut : {
            get : function() {
                return this._zoomOut;
            }
        }
    });

    return NavigationViewModel;
});