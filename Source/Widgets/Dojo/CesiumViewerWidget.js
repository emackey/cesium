/*global define,console*/
define([
        'require',
        'dojo/_base/declare',
        'dojo/ready',
        'dojo/_base/lang',
        'dojo/_base/event',
        'dojo/on',
        'dijit/_WidgetBase',
        'dijit/_TemplatedMixin',
        'dijit/_WidgetsInTemplateMixin',
        'dijit/form/Button',
        'dijit/form/ToggleButton',
        'dijit/form/DropDownButton',
        'dijit/TooltipDialog',
        './getJson',
        './TimelineWidget',
        '../../Core/BoundingRectangle',
        '../../Core/Clock',
        '../../Core/ClockStep',
        '../../Core/ClockRange',
        '../../Core/Extent',
        '../../Core/AnimationController',
        '../../Core/Ellipsoid',
        '../../Core/Iso8601',
        '../../Core/FullScreen',
        '../../Core/computeSunPosition',
        '../../Core/EventHandler',
        '../../Core/FeatureDetection',
        '../../Core/MouseEventType',
        '../../Core/Cartesian2',
        '../../Core/Cartesian3',
        '../../Core/JulianDate',
        '../../Core/DefaultProxy',
        '../../Core/Transforms',
        '../../Core/requestAnimationFrame',
        '../../Core/Color',
        '../../Core/Matrix4',
        '../../Core/Math',
        '../../Scene/PerspectiveFrustum',
        '../../Scene/Material',
        '../../Scene/Scene',
        '../../Scene/CentralBody',
        '../../Scene/BingMapsTileProvider',
        '../../Scene/BingMapsStyle',
        '../../Scene/SceneTransitioner',
        '../../Scene/SingleTileProvider',
        '../../Scene/PerformanceDisplay',
        '../../Scene/SceneMode',
        '../../DynamicScene/processCzml',
        '../../DynamicScene/DynamicObjectView',
        '../../DynamicScene/DynamicObjectCollection',
        '../../DynamicScene/VisualizerCollection',
        'dojo/text!./CesiumViewerWidget.html'
    ], function (
        require,
        declare,
        ready,
        lang,
        event,
        on,
        _WidgetBase,
        _TemplatedMixin,
        _WidgetsInTemplateMixin,
        Button,
        ToggleButton,
        DropDownButton,
        TooltipDialog,
        getJson,
        TimelineWidget,
        BoundingRectangle,
        Clock,
        ClockStep,
        ClockRange,
        Extent,
        AnimationController,
        Ellipsoid,
        Iso8601,
        FullScreen,
        computeSunPosition,
        EventHandler,
        FeatureDetection,
        MouseEventType,
        Cartesian2,
        Cartesian3,
        JulianDate,
        DefaultProxy,
        Transforms,
        requestAnimationFrame,
        Color,
        Matrix4,
        CesiumMath,
        PerspectiveFrustum,
        Material,
        Scene,
        CentralBody,
        BingMapsTileProvider,
        BingMapsStyle,
        SceneTransitioner,
        SingleTileProvider,
        PerformanceDisplay,
        SceneMode,
        processCzml,
        DynamicObjectView,
        DynamicObjectCollection,
        VisualizerCollection,
        template) {
    "use strict";

    /**
     * This Dojo widget wraps the full functionality of Cesium Viewer.
     *
     * @class CesiumViewerWidget
     * @param {Object} options - A list of options to pre-configure the widget.  Names matching member fields/functions will override the default values.
     */
    return declare('Cesium.CesiumViewerWidget', [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
    /** @lends CesiumViewerWidget */
    {
        // for Dojo use only
        templateString : template,

        /**
         * Enable streaming Imagery.  This is read-only after construction.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default true
         * @see CesiumViewerWidget#enableStreamingImagery
         */
        useStreamingImagery : true,
        /**
         * The map style for streaming imagery.  This is read-only after construction.
         *
         * @type {BingMapsStyle}
         * @memberof CesiumViewerWidget.prototype
         * @default {@link BingMapsStyle.AERIAL}
         * @see CesiumViewerWidget#setStreamingImageryMapStyle
         */
        mapStyle : BingMapsStyle.AERIAL,
        /**
         * The URL for a daytime image on the globe.
         *
         * @type {String}
         * @memberof CesiumViewerWidget.prototype
         */
        dayImageUrl : undefined,
        /**
         * The URL for a nighttime image on the globe.
         *
         * @type {String}
         * @memberof CesiumViewerWidget.prototype
         */
        nightImageUrl : undefined,
        /**
         * The URL for a specular map on the globe, typically with white for oceans and black for landmass.
         *
         * @type {String}
         * @memberof CesiumViewerWidget.prototype
         */
        specularMapUrl : undefined,
        /**
         * The URL for the clouds image on the globe.
         *
         * @type {String}
         * @memberof CesiumViewerWidget.prototype
         */
        cloudsMapUrl : undefined,
        /**
         * The URL for a bump map on the globe, showing mountain ranges.
         *
         * @type {String}
         * @memberof CesiumViewerWidget.prototype
         */
        bumpMapUrl : undefined,
        /**
         * An object containing settings supplied by the end user, typically from the query string
         * of the URL of the page with the widget.
         *
         * @type {Object}
         * @memberof CesiumViewerWidget.prototype
         * @example
         * var ioQuery = require('dojo/io-query');
         * var endUserOptions = {};
         * if (window.location.search) {
         *     endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
         * }
         *
         * @example
         * var endUserOptions = {
         *     'source' : 'file.czml', // The relative URL of the CZML file to load at startup.
         *     'lookAt' : '123abc',    // The CZML ID of the object to track at startup.
         *     'stats'  : 1,           // Enable the FPS performance display.
         *     'debug'  : 1,           // Full WebGL error reporting at substantial performance cost.
         * };
         */
        endUserOptions : {},
        /**
         * Check for WebGL errors after every WebGL API call.  Enabling this debugging feature
         * comes at a substantial performance cost, halting and restarting the graphics
         * pipeline hundreds of times per frame.  But it can uncover problems that are otherwise
         * very difficult to diagnose.
         * This property is read-only after construction.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default false
         */
        enableWebGLDebugging: false,
        /**
         * Allow the user to drag-and-drop CZML files into this widget.
         * This is read-only after construction.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default false
         */
        enableDragDrop: false,
        /**
         * Register this widget's resize handler to get called every time the browser window
         * resize event fires.  This is read-only after construction.  Generally this should
         * be true for full-screen widgets, and true for
         * fluid layouts where the widget is likely to change size at the same time as the
         * window.  The exception is, if you use a Dojo layout where this widget exists inside
         * a Dojo ContentPane or similar, you should set this to false, because Dojo will perform
         * its own layout calculations and call this widget's resize handler automatically.
         * This can also be false for a fixed-size widget.
         *
         * If unsure, test the widget with this set to false, and if window resizes cause the
         * globe to stretch, change this to true.
         *
         * @type {Boolean}
         * @memberof CesiumViewerWidget.prototype
         * @default true
         * @see CesiumViewerWidget#resize
         */
        resizeWidgetOnWindowResize: true,

        // for Dojo use only
        constructor : function() {
            this.ellipsoid = Ellipsoid.WGS84;
        },

        // for Dojo use only
        postCreate : function() {
            ready(this, '_setupCesium');
        },

        /**
         * If supplied, this function will be called at the end of widget setup.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @see CesiumViewerWidget#startRenderLoop
         */
        postSetup : undefined,

        /**
         * This function will get a callback in the event of setup failure, likely indicating
         * a problem with WebGL support or the availability of a GL context.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} widget - A reference to this widget
         * @param {Object} error - The exception that was thrown during setup
         */
        onSetupError : function(widget, error) {
            console.error(error);
        },

        /**
         * This function must be called when the widget changes size.  It updates the canvas
         * size, camera aspect ratio, and viewport size.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @see CesiumViewerWidget#resizeWidgetOnWindowResize
         */
        resize : function() {
            var width = this.canvas.clientWidth, height = this.canvas.clientHeight;

            if (typeof this.scene === 'undefined' || (this.canvas.width === width && this.canvas.height === height)) {
                return;
            }

            this.canvas.width = width;
            this.canvas.height = height;

            var frustum = this.scene.getCamera().frustum;
            if (typeof frustum.aspectRatio !== 'undefined') {
                frustum.aspectRatio = width / height;
            } else {
                frustum.top = frustum.right * (height / width);
                frustum.bottom = -frustum.top;
            }
        },

        /**
         * Have the camera track a particular object based on the result of a pick.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object to track, or <code>undefined</code> to stop tracking.
         */
        centerCameraOnPick : function(selectedObject) {
            this.centerCameraOnObject(typeof selectedObject !== 'undefined' ? selectedObject.dynamicObject : undefined);
        },

        _viewFromTo : undefined,

        /**
         * Have the camera track a particular object.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object to track, or <code>undefined</code> to stop tracking.
         */
        centerCameraOnObject : function(selectedObject) {
            if (typeof selectedObject !== 'undefined' && typeof selectedObject.position !== 'undefined') {
                var viewFromTo = this._viewFromTo;
                if (typeof viewFromTo === 'undefined') {
                    this._viewFromTo = viewFromTo = new DynamicObjectView(selectedObject, this.scene, this.ellipsoid);
                } else {
                    viewFromTo.dynamicObject = selectedObject;
                }
            } else {
                this._viewFromTo = undefined;

                var scene = this.scene;
                var mode = scene.mode;
                var camera = scene.getCamera();
                var controllers = camera.getControllers();
                if (mode === SceneMode.SCENE2D) {
                    controllers.removeAll();
                    controllers.add2D(scene.scene2D.projection);
                } else if (mode === SceneMode.SCENE3D) {
                    //For now just rename at the last location
                    //camera will stay in spindle/rotate mode.
                } else if (mode === SceneMode.COLUMBUS_VIEW) {
                    controllers.removeAll();
                    controllers.addColumbusView();
                }
            }
        },

        /**
         * Override this function to be notified when an object is selected (left-click).
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object that was selected, or <code>undefined</code> to de-select.
         */
        onObjectSelected : undefined,
        /**
         * Override this function to be notified when an object is right-clicked.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object that was selected, or <code>undefined</code> to de-select.
         */
        onObjectRightClickSelected : undefined,
        /**
         * Override this function to be notified when an object is left-double-clicked.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object that was selected, or <code>undefined</code> to de-select.
         */
        onObjectLeftDoubleClickSelected : undefined,
        /**
         * Override this function to be notified when an object hovered by the mouse.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object that was hovered, or <code>undefined</code> if the mouse moved off.
         */
        onObjectMousedOver : undefined,
        /**
         * Override this function to be notified when the left mouse button is pressed down.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the position of the mouse.
         */
        onLeftMouseDown : undefined,
        /**
         * Override this function to be notified when the left mouse button is released.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the position of the mouse.
         */
        onLeftMouseUp : undefined,
        /**
         * Override this function to be notified when the right mouse button is pressed down.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the position of the mouse.
         */
        onRightMouseDown : undefined,
        /**
         * Override this function to be notified when the right mouse button is released.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the position of the mouse.
         */
        onRightMouseUp : undefined,
        /**
         * Override this function to be notified when the left mouse button is dragged.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the start and end position of the mouse.
         */
        onLeftDrag : undefined,
        /**
         * Override this function to be notified when the right mouse button is dragged or mouse wheel is zoomed.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} The object with the start and end position of the mouse.
         */
        onZoom : undefined,

        _camera3D : undefined,

        _handleLeftClick : function(e) {
            if (typeof this.onObjectSelected !== 'undefined') {
                // Fire the selection event, regardless if it's a duplicate,
                // because the client may want to react to re-selection in some way.
                this.selectedObject = this.scene.pick(e.position);
                this.onObjectSelected(this.selectedObject);
            }
        },

        _handleRightClick : function(e) {
            if (typeof this.onObjectRightClickSelected !== 'undefined') {
                // Fire the selection event, regardless if it's a duplicate,
                // because the client may want to react to re-selection in some way.
                this.selectedObject = this.scene.pick(e.position);
                this.onObjectRightClickSelected(this.selectedObject);
            }
        },

        _handleLeftDoubleClick : function(e) {
            if (typeof this.onObjectLeftDoubleClickSelected !== 'undefined') {
                // Fire the selection event, regardless if it's a duplicate,
                // because the client may want to react to re-selection in some way.
                this.selectedObject = this.scene.pick(e.position);
                this.onObjectLeftDoubleClickSelected(this.selectedObject);
            }
        },

        _handleMouseMove : function(movement) {
            if (typeof this.onObjectMousedOver !== 'undefined') {
                // Don't fire multiple times for the same object as the mouse travels around the screen.
                var mousedOverObject = this.scene.pick(movement.endPosition);
                if (this.mousedOverObject !== mousedOverObject) {
                    this.mousedOverObject = mousedOverObject;
                    this.onObjectMousedOver(mousedOverObject);
                }
            }
            if (typeof this.leftDown !== 'undefined' && this.leftDown && typeof this.onLeftDrag !== 'undefined') {
                this.onLeftDrag(movement);
            } else if (typeof this.rightDown !== 'undefined' && this.rightDown && typeof this.onZoom !== 'undefined') {
                this.onZoom(movement);
            }
        },

        _handleRightDown : function(e) {
            this.rightDown = true;
            if (typeof this.onRightMouseDown !== 'undefined') {
                this.onRightMouseDown(e);
            }
        },

        _handleRightUp : function(e) {
            this.rightDown = false;
            if (typeof this.onRightMouseUp !== 'undefined') {
                this.onRightMouseUp(e);
            }
        },

        _handleLeftDown : function(e) {
            this.leftDown = true;
            if (typeof this.onLeftMouseDown !== 'undefined') {
                this.onLeftMouseDown(e);
            }
        },

        _handleLeftUp : function(e) {
            this.leftDown = false;
            if (typeof this.onLeftMouseUp !== 'undefined') {
                this.onLeftMouseUp(e);
            }
        },

        _handleWheel : function(e) {
            if (typeof this.onZoom !== 'undefined') {
                this.onZoom(e);
            }
        },

        _updateSpeedIndicator : function() {
            if (this.animationController.isAnimating()) {
                this.speedIndicator.innerHTML = this.clock.multiplier + 'x realtime';
            } else {
                this.speedIndicator.innerHTML = this.clock.multiplier + 'x realtime (paused)';
            }
        },

        /**
         * Apply the animation settings from a CZML buffer.
         * @function
         * @memberof CesiumViewerWidget.prototype
         */
        setTimeFromBuffer : function() {
            var clock = this.clock;

            this.animReverse.set('checked', false);
            this.animPause.set('checked', true);
            this.animPlay.set('checked', false);

            var availability = this.dynamicObjectCollection.computeAvailability();
            if (availability.start.equals(Iso8601.MINIMUM_VALUE)) {
                clock.startTime = new JulianDate();
                clock.stopTime = clock.startTime.addDays(1);
                clock.clockRange = ClockRange.UNBOUNDED;
            } else {
                clock.startTime = availability.start;
                clock.stopTime = availability.stop;
                clock.clockRange = ClockRange.LOOP;
            }

            clock.multiplier = 60;
            clock.currentTime = clock.startTime;
            this.timelineControl.zoomTo(clock.startTime, clock.stopTime);
        },

        /**
         * This function is called when files are dropped on the widget, if drag-and-drop is enabled.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} event - The drag-and-drop event containing the dropped file(s).
         */
        handleDrop : function(event) {
            event.stopPropagation(); // Stops some browsers from redirecting.
            event.preventDefault();

            var files = event.dataTransfer.files;
            var f = files[0];
            var reader = new FileReader();
            var widget = this;
            reader.onload = function(evt) {
                //CZML_TODO visualizers.removeAllPrimitives(); is not really needed here, but right now visualizers
                //cache data indefinitely and removeAll is the only way to get rid of it.
                //while there are no visual differences, removeAll cleans the cache and improves performance
                widget.visualizers.removeAllPrimitives();
                widget.dynamicObjectCollection.clear();
                processCzml(JSON.parse(evt.target.result), widget.dynamicObjectCollection, f.name);
                widget.setTimeFromBuffer();
            };
            reader.readAsText(f);
        },

        _setupCesium : function() {
            var canvas = this.canvas, ellipsoid = this.ellipsoid, scene, widget = this;

            try {
                scene = this.scene = new Scene(canvas);
            } catch (ex) {
                if (typeof this.onSetupError !== 'undefined') {
                    this.onSetupError(this, ex);
                }
                return;
            }

            this.resize();

            on(canvas, 'contextmenu', event.stop);
            on(canvas, 'selectstart', event.stop);

            if (typeof widget.endUserOptions.debug !== 'undefined' && widget.endUserOptions.debug) {
                this.enableWebGLDebugging = true;
            }

            var context = scene.getContext();
            if (this.enableWebGLDebugging) {
                context.setValidateShaderProgram(true);
                context.setValidateFramebuffer(true);
                context.setLogShaderCompilation(true);
                context.setThrowOnWebGLError(true);
            }

            var maxTextureSize = context.getMaximumTextureSize();
            if (maxTextureSize < 4095) {
                // Mobile, or low-end card
                this.dayImageUrl = this.dayImageUrl || require.toUrl('Images/NE2_50M_SR_W_2048.jpg');
                this.nightImageUrl = this.nightImageUrl || require.toUrl('Images/land_ocean_ice_lights_512.jpg');
            } else {
                // Desktop
                this.dayImageUrl = this.dayImageUrl || require.toUrl('Images/NE2_50M_SR_W_4096.jpg');
                this.nightImageUrl = this.nightImageUrl || require.toUrl('Images/land_ocean_ice_lights_2048.jpg');
                this.specularMapUrl = this.specularMapUrl || require.toUrl('Images/earthspec1k.jpg');
                this.cloudsMapUrl = this.cloudsMapUrl || require.toUrl('Images/earthcloudmaptrans.jpg');
                this.bumpMapUrl = this.bumpMapUrl || require.toUrl('Images/earthbump1k.jpg');
            }

            var centralBody = this.centralBody = new CentralBody(ellipsoid);

            // This logo is replicated by the imagery selector button, so it's hidden here.
            centralBody.logoOffset = new Cartesian2(-100, -100);

            this.showSkyAtmosphere(true);
            this.showGroundAtmosphere(true);
            this._configureCentralBodyImagery();

            scene.getPrimitives().setCentralBody(centralBody);

            var camera = scene.getCamera();
            camera.position = camera.position.multiplyByScalar(1.5);

            this.centralBodyCameraController = camera.getControllers().addCentralBody();

            var handler = new EventHandler(canvas);
            handler.setMouseAction(lang.hitch(this, '_handleLeftClick'), MouseEventType.LEFT_CLICK);
            handler.setMouseAction(lang.hitch(this, '_handleRightClick'), MouseEventType.RIGHT_CLICK);
            handler.setMouseAction(lang.hitch(this, '_handleLeftDoubleClick'), MouseEventType.LEFT_DOUBLE_CLICK);
            handler.setMouseAction(lang.hitch(this, '_handleMouseMove'), MouseEventType.MOVE);
            handler.setMouseAction(lang.hitch(this, '_handleLeftDown'), MouseEventType.LEFT_DOWN);
            handler.setMouseAction(lang.hitch(this, '_handleLeftUp'), MouseEventType.LEFT_UP);
            handler.setMouseAction(lang.hitch(this, '_handleWheel'), MouseEventType.WHEEL);
            handler.setMouseAction(lang.hitch(this, '_handleRightDown'), MouseEventType.RIGHT_DOWN);
            handler.setMouseAction(lang.hitch(this, '_handleRightUp'), MouseEventType.RIGHT_UP);

            //////////////////////////////////////////////////////////////////////////////////////////////////

            if (typeof this.highlightColor === 'undefined') {
                this.highlightColor = new Color(0.0, 1.0, 0.0);
            }

            if (typeof this.highlightMaterial === 'undefined') {
                this.highlightMaterial = Material.fromType(scene.getContext(), Material.ColorType);
                this.highlightMaterial.uniforms.color = this.highlightColor;
            }

            if (typeof this.onObjectLeftDoubleClickSelected === 'undefined') {
                this.onObjectLeftDoubleClickSelected = function(selectedObject) {
                    if (typeof selectedObject !== 'undefined' && typeof selectedObject.dynamicObject !== 'undefined') {
                        this.centerCameraOnPick(selectedObject);
                    }
                };
                                }
            if (this.enableDragDrop) {
                var dropBox = this.cesiumNode;
                on(dropBox, 'drop', lang.hitch(widget, 'handleDrop'));
                on(dropBox, 'dragenter', event.stop);
                on(dropBox, 'dragover', event.stop);
                on(dropBox, 'dragexit', event.stop);
            }

            var currentTime = new JulianDate();
            if (typeof this.animationController === 'undefined') {
                if (typeof this.clock === 'undefined') {
                    this.clock = new Clock({
                        startTime : currentTime.addDays(-0.5),
                        stopTime : currentTime.addDays(0.5),
                        currentTime : currentTime,
                        clockStep : ClockStep.SYSTEM_CLOCK_DEPENDENT,
                        multiplier : 1
                    });
                }
                this.animationController = new AnimationController(this.clock);
            } else {
                this.clock = this.animationController.clock;
            }

            var animationController = this.animationController;
            var dynamicObjectCollection = this.dynamicObjectCollection = new DynamicObjectCollection();
            var clock = this.clock;
            var transitioner = this.sceneTransitioner = new SceneTransitioner(scene);
            this.visualizers = VisualizerCollection.createCzmlStandardCollection(scene, dynamicObjectCollection);

            if (typeof widget.endUserOptions.source !== 'undefined') {
                getJson(widget.endUserOptions.source).then(function(czmlData) {
                    processCzml(czmlData, widget.dynamicObjectCollection, widget.endUserOptions.source);
                    widget.setTimeFromBuffer();
                    if (typeof widget.endUserOptions.lookAt !== 'undefined') {
                        widget.centerCameraOnObject(widget.dynamicObjectCollection.getObject(widget.endUserOptions.lookAt));
                    }
                },
                function(error) {
                    window.alert(error);
                });
            }

            if (typeof widget.endUserOptions.stats !== 'undefined' && widget.endUserOptions.stats) {
                widget.enableStatistics(true);
            }

            this._lastTimeLabelClock = clock.currentTime;
            this._lastTimeLabelDate = Date.now();
            this.timeLabelElement = this.timeLabel.containerNode;
            this.timeLabelElement.innerHTML = clock.currentTime.toDate().toUTCString();

            var animReverse = this.animReverse;
            var animPause = this.animPause;
            var animPlay = this.animPlay;

            on(this.animReset, 'Click', function() {
                animationController.reset();
                animReverse.set('checked', false);
                animPause.set('checked', true);
                animPlay.set('checked', false);
            });

            function onAnimPause() {
                animationController.pause();
                animReverse.set('checked', false);
                animPause.set('checked', true);
                animPlay.set('checked', false);
            }

            on(animPause, 'Click', onAnimPause);

            on(animReverse, 'Click', function() {
                animationController.playReverse();
                animReverse.set('checked', true);
                animPause.set('checked', false);
                animPlay.set('checked', false);
            });

            on(animPlay, 'Click', function() {
                animationController.play();
                animReverse.set('checked', false);
                animPause.set('checked', false);
                animPlay.set('checked', true);
            });

            on(widget.animSlow, 'Click', function() {
                animationController.slower();
            });

            on(widget.animFast, 'Click', function() {
                animationController.faster();
            });

            function onTimelineScrub(e) {
                widget.clock.currentTime = e.timeJulian;
                onAnimPause();
            }

            var timelineWidget = widget.timelineWidget;
            timelineWidget.clock = widget.clock;
            timelineWidget.setupCallback = function(t) {
                widget.timelineControl = t;
                t.addEventListener('settime', onTimelineScrub, false);
                t.zoomTo(clock.startTime, clock.stopTime);
            };
            timelineWidget.setupTimeline();

            var viewHomeButton = widget.viewHomeButton;
            var view2D = widget.view2D;
            var view3D = widget.view3D;
            var viewColumbus = widget.viewColumbus;
            var viewFullScreen = widget.viewFullScreen;

            view2D.set('checked', false);
            view3D.set('checked', true);
            viewColumbus.set('checked', false);

            on(viewFullScreen, 'Click', function() {
                if (FullScreen.isFullscreenEnabled()) {
                    FullScreen.exitFullscreen();
                } else {
                    FullScreen.requestFullScreen(document.body);
                }
            });

            on(viewHomeButton, 'Click', function() {
                widget.viewHome();
            });
            on(view2D, 'Click', function() {
                view2D.set('checked', true);
                view3D.set('checked', false);
                viewColumbus.set('checked', false);
                widget.showSkyAtmosphere(false);
                widget.showGroundAtmosphere(false);
                transitioner.morphTo2D();
            });
            on(view3D, 'Click', function() {
                view2D.set('checked', false);
                view3D.set('checked', true);
                viewColumbus.set('checked', false);
                transitioner.morphTo3D();
                widget.showSkyAtmosphere(true);
                widget.showGroundAtmosphere(true);
            });
            on(viewColumbus, 'Click', function() {
                view2D.set('checked', false);
                view3D.set('checked', false);
                viewColumbus.set('checked', true);
                widget.showSkyAtmosphere(false);
                widget.showGroundAtmosphere(false);
                transitioner.morphToColumbusView();
            });

            var cbLighting = widget.cbLighting;
            on(cbLighting, 'Change', function(value) {
                widget.centralBody.affectedByLighting = !value;
                widget.centralBody.showSkyAtmosphere = widget._showSkyAtmosphere && !value;
                widget.centralBody.showGroundAtmosphere = widget._showGroundAtmosphere && !value;
            });

            var imagery = widget.imagery;
            var imageryAerial = widget.imageryAerial;
            var imageryAerialWithLabels = widget.imageryAerialWithLabels;
            var imageryRoad = widget.imageryRoad;
            var imagerySingleTile = widget.imagerySingleTile;
            var imageryOptions = [imageryAerial, imageryAerialWithLabels, imageryRoad, imagerySingleTile];
            var bingHtml = imagery.containerNode.innerHTML;

            imagery.startup();

            function createImageryClickFunction(control, style) {
                return function() {
                    if (style) {
                        widget.setStreamingImageryMapStyle(style);
                        imagery.containerNode.innerHTML = bingHtml;
                    } else {
                        widget.enableStreamingImagery(false);
                        imagery.containerNode.innerHTML = 'Imagery';
                    }

                    imageryOptions.forEach(function(o) {
                        o.set('checked', o === control);
                    });
                };
            }

            on(imageryAerial, 'Click', createImageryClickFunction(imageryAerial, BingMapsStyle.AERIAL));
            on(imageryAerialWithLabels, 'Click', createImageryClickFunction(imageryAerialWithLabels, BingMapsStyle.AERIAL_WITH_LABELS));
            on(imageryRoad, 'Click', createImageryClickFunction(imageryRoad, BingMapsStyle.ROAD));
            on(imagerySingleTile, 'Click', createImageryClickFunction(imagerySingleTile, undefined));

            //////////////////////////////////////////////////////////////////////////////////////////////////

            if (widget.resizeWidgetOnWindowResize) {
                on(window, 'resize', function() {
                    widget.resize();
                });
            }

            this._camera3D = this.scene.getCamera().clone();

            if (typeof this.postSetup !== 'undefined') {
                this.postSetup(this);
            }
        },

        /**
         * Reset the camera to the home view for the current scene mode.
         * @function
         * @memberof CesiumViewerWidget.prototype
         */
        viewHome : function() {
            this._viewFromTo = undefined;

            var scene = this.scene;
            var mode = scene.mode;
            var camera = scene.getCamera();
            var controllers = camera.getControllers();
            controllers.removeAll();

            if (mode === SceneMode.SCENE2D) {
                controllers.add2D(scene.scene2D.projection);
                scene.viewExtent(Extent.MAX_VALUE);
            } else if (mode === SceneMode.SCENE3D) {
                this.centralBodyCameraController = controllers.addCentralBody();
                var camera3D = this._camera3D;
                camera3D.position.clone(camera.position);
                camera3D.direction.clone(camera.direction);
                camera3D.up.clone(camera.up);
                camera3D.right.clone(camera.right);
                camera3D.transform.clone(camera.transform);
                camera3D.frustum.clone(camera.frustum);
            } else if (mode === SceneMode.COLUMBUS_VIEW) {
                var transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                            1.0, 0.0, 0.0, 0.0,
                                            0.0, 1.0, 0.0, 0.0,
                                            0.0, 0.0, 0.0, 1.0);

                var maxRadii = Ellipsoid.WGS84.getMaximumRadius();
                var position = new Cartesian3(0.0, -1.0, 1.0).normalize().multiplyByScalar(5.0 * maxRadii);
                var direction = Cartesian3.ZERO.subtract(position).normalize();
                var right = direction.cross(Cartesian3.UNIT_Z).normalize();
                var up = right.cross(direction);

                var frustum = new PerspectiveFrustum();
                frustum.fovy = CesiumMath.toRadians(60.0);
                frustum.aspectRatio = this.canvas.clientWidth / this.canvas.clientHeight;

                camera.position = position;
                camera.direction = direction;
                camera.up = up;
                camera.frustum = frustum;
                camera.transform = transform;

                controllers.addColumbusView();
            }
        },

        /**
         * Test if the clouds are configured and available for display.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @returns {Boolean} <code>true</code> if the <code>cloudsMapSource</code> is defined.
         */
        areCloudsAvailable : function() {
            return typeof this.centralBody.cloudsMapSource !== 'undefined';
        },

        /**
         * Enable or disable the display of clouds.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Boolean} useClouds - <code>true</code> to enable clouds, if configured.
         */
        enableClouds : function(useClouds) {
            if (this.areCloudsAvailable()) {
                this.centralBody.showClouds = useClouds;
                this.centralBody.showCloudShadows = useClouds;
            }
        },

        /**
         * Enable or disable the FPS (Frames Per Second) perfomance display.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Boolean} showStatistics - <code>true</code> to enable it.
         */
        enableStatistics : function(showStatistics) {
            if (typeof this._performanceDisplay === 'undefined' && showStatistics) {
                this._performanceDisplay = new PerformanceDisplay();
                this.scene.getPrimitives().add(this._performanceDisplay);
            } else if (typeof this._performanceDisplay !== 'undefined' && !showStatistics) {
                this.scene.getPrimitives().remove(this._performanceDisplay);
                this._performanceDisplay = undefined;
            }
        },

        /**
         * Enable or disable the "sky atmosphere" effect, which displays the limb
         * of the Earth (seen from space) or blue sky (seen from inside the atmosphere).
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Boolean} show - <code>true</code> to enable the effect.
         */
        showSkyAtmosphere : function(show) {
            this._showSkyAtmosphere = show;
            this.centralBody.showSkyAtmosphere = show && this.centralBody.affectedByLighting;
        },

        /**
         * Enable or disable the "ground atmosphere" effect, which makes the surface of
         * the globe look pale at a distance.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Boolean} show - <code>true</code> to enable the effect.
         */
        showGroundAtmosphere : function(show) {
            this._showGroundAtmosphere = show;
            this.centralBody.showGroundAtmosphere = show && this.centralBody.affectedByLighting;
        },

        /**
         * Enable or disable streaming imagery, and update the globe.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Boolean} value - <code>true</code> to enable streaming imagery.
         * @see CesiumViewerWidget#useStreamingImagery
         */
        enableStreamingImagery : function(value) {
            this.useStreamingImagery = value;
            this._configureCentralBodyImagery();
        },

        /**
         * Change the streaming imagery type, and update the globe.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {BingMapsStyle} value - the new map style to use.
         * @see CesiumViewerWidget#mapStyle
         */
        setStreamingImageryMapStyle : function(value) {
            this.useStreamingImagery = true;

            if (this.mapStyle !== value) {
                this.mapStyle = value;
                this._configureCentralBodyImagery();
            }
        },

        /**
         * Set the positional offset of the logo of the streaming imagery provider.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Integer} logoOffsetX - The horizontal offset in screen space
         * @param {Integer} logoOffsetY - The vertical offset in screen space
         */
        setLogoOffset : function(logoOffsetX, logoOffsetY) {
            var logoOffset = this.centralBody.logoOffset;
            if ((logoOffsetX !== logoOffset.x) || (logoOffsetY !== logoOffset.y)) {
                this.centralBody.logoOffset = new Cartesian2(logoOffsetX, logoOffsetY);
            }
        },

        /**
         * Highlight an object in the scene, usually in response to a click or hover.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {Object} selectedObject - The object to highlight, or <code>undefined</code> to un-highlight.
         */
        highlightObject : function(selectedObject) {
            if (this.highlightedObject !== selectedObject) {
                if (typeof this.highlightedObject !== 'undefined' &&
                        (typeof this.highlightedObject.isDestroyed !== 'function' || !this.highlightedObject.isDestroyed())) {
                    if (typeof this.highlightedObject.material !== 'undefined') {
                        this.highlightedObject.material = this._originalMaterial;
                    } else if (typeof this.highlightedObject.outerMaterial !== 'undefined') {
                        this.highlightedObject.outerMaterial = this._originalMaterial;
                    } else if (typeof this.highlightedObject.setColor !== 'undefined') {
                        this.highlightedObject.setColor(this._originalColor);
                    }
                }
                this.highlightedObject = selectedObject;
                if (typeof selectedObject !== 'undefined') {
                    if (typeof selectedObject.material !== 'undefined') {
                        this._originalMaterial = selectedObject.material;
                        selectedObject.material = this.highlightMaterial;
                    } else if (typeof selectedObject.outerMaterial !== 'undefined') {
                        this._originalMaterial = selectedObject.outerMaterial;
                        selectedObject.outerMaterial = this.highlightMaterial;
                    } else if (typeof this.highlightedObject.setColor !== 'undefined') {
                        this._originalColor = Color.clone(selectedObject.getColor(), this._originalColor);
                        selectedObject.setColor(this.highlightColor);
                    }
                }
            }
        },

        _sunPosition : new Cartesian3(),

        /**
         * Call this function prior to rendering each animation frame, to prepare
         * all CZML objects and other settings for the next frame.
         *
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @param {JulianDate} currentTime - The date and time in the scene of the frame to be rendered
         */
        update : function(currentTime) {

            this._updateSpeedIndicator();
            this.timelineControl.updateFromClock();
            this.scene.setSunPosition(computeSunPosition(currentTime, this._sunPosition));
            this.visualizers.update(currentTime);

            if ((Math.abs(currentTime.getSecondsDifference(this._lastTimeLabelClock)) >= 1.0) ||
                    ((Date.now() - this._lastTimeLabelDate) > 200)) {
                this.timeLabelElement.innerHTML = currentTime.toDate().toUTCString();
                this._lastTimeLabelClock = currentTime;
                this._lastTimeLabelDate = Date.now();
            }

            // Update the camera to stay centered on the selected object, if any.
            var viewFromTo = this._viewFromTo;
            if (typeof viewFromTo !== 'undefined') {
                viewFromTo.update(currentTime);
            }
        },

        /**
         * Render the widget's scene.
         * @function
         * @memberof CesiumViewerWidget.prototype
         */
        render : function() {
            this.scene.render();
        },

        _configureCentralBodyImagery : function() {
            var centralBody = this.centralBody;

            if (this.useStreamingImagery) {
                centralBody.dayTileProvider = new BingMapsTileProvider({
                    server : 'dev.virtualearth.net',
                    mapStyle : this.mapStyle,
                    // Some versions of Safari support WebGL, but don't correctly implement
                    // cross-origin image loading, so we need to load Bing imagery using a proxy.
                    proxy : FeatureDetection.supportsCrossOriginImagery() ? undefined : new DefaultProxy('/proxy/')
                });
            } else {
                centralBody.dayTileProvider = new SingleTileProvider(this.dayImageUrl);
            }

            centralBody.nightImageSource = this.nightImageUrl;
            centralBody.specularMapSource = this.specularMapUrl;
            centralBody.cloudsMapSource = this.cloudsMapUrl;
            centralBody.bumpMapSource = this.bumpMapUrl;
        },

        /**
         * This is a simple render loop that can be started if there is only one <code>CesiumViewerWidget</code>
         * on your page.  Typically it is started from {@link CesiumViewerWidget.postSetup}.  If you wish to
         * customize your render loop, avoid this function and instead use code similar to the following example.
         * @function
         * @memberof CesiumViewerWidget.prototype
         * @see requestAnimationFrame
         * @example
         * // This takes the place of startRenderLoop for a single widget.
         *
         * var animationController = widget.animationController;
         * function updateAndRender() {
         *     var currentTime = animationController.update();
         *     widget.update(currentTime);
         *     widget.render();
         *     requestAnimationFrame(updateAndRender);
         * }
         * updateAndRender();
         * @example
         * // This example requires widget1 and widget2 to share an animationController
         * // (for example, widget2's constructor was called with a copy of widget1's
         * // animationController).
         *
         * function updateAndRender() {
         *     var currentTime = animationController.update();
         *     widget1.update(currentTime);
         *     widget2.update(currentTime);
         *     widget1.render();
         *     widget2.render();
         *     requestAnimationFrame(updateAndRender);
         * }
         * updateAndRender();
         * @example
         * // This example uses separate animationControllers for widget1 and widget2.
         * // These widgets can animate at different rates and pause individually.
         *
         * function updateAndRender() {
         *     var currentTime = widget1.animationController.update();
         *     widget1.update(currentTime);
         *     widget1.render();
         *     currentTime = widget2.animationController.update();
         *     widget2.update(currentTime);
         *     widget2.render();
         *     requestAnimationFrame(updateAndRender);
         * }
         * updateAndRender();
         */
        startRenderLoop : function() {
            var widget = this;
            var animationController = widget.animationController;

            function updateAndRender() {
                var currentTime = animationController.update();
                widget.update(currentTime);
                widget.render();
                requestAnimationFrame(updateAndRender);
            }
            updateAndRender();
        }
    });
});
