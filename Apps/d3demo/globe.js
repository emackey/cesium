require([
    'Cesium',
    'Widgets/Dojo/CesiumViewerWidget',
    'Core/JulianDate'
], function(
    Cesium, CesiumViewerWidget, JulianDate)
{
    "use strict";

    function createPrimitives(widget) {
        var scene = widget.scene;
        var ellipsoid = widget.centralBody.getEllipsoid();
        var primitives = scene.getPrimitives();
        var polylines = new Cesium.PolylineCollection();

        // Fill circle
        var circle = new Cesium.Polygon();
        circle.setPositions(
                Cesium.Shapes.computeCircleBoundary(
                        ellipsoid,
                        ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.0, 40.0)),
                        300000.0));
        primitives.add(circle);

        // Outline circle
        var outline = polylines.add();
        outline.setPositions(
                Cesium.Shapes.computeCircleBoundary(
                        ellipsoid,
                        ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-82.0, 37.0)),
                        300000.0));
        primitives.add(polylines);

        // Apply a material to a filled circle
        var circle2 = new Cesium.Polygon();
        circle2.setPositions(
                Cesium.Shapes.computeCircleBoundary(
                        ellipsoid,
                        ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 35.0)),
                        400000.0));

        // Any polygon-compatible material can be used
        circle2.material = Cesium.Material.fromType(scene.getContext(), Cesium.Material.TyeDyeType);
        primitives.add(circle2);

        // Fill an ellipse
        var ellipse = new Cesium.Polygon();
        ellipse.setPositions(
                Cesium.Shapes.computeEllipseBoundary(
                        ellipsoid,
                        ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-78.0, 32.5)),
                        500000.0,
                        250000.0,
                        Cesium.Math.toRadians(60)));
        primitives.add(ellipse);
    }

    var widget = new CesiumViewerWidget({
        onObjectMousedOver : function(mousedOverObject) {
            widget.highlightObject(mousedOverObject);
        }
    });

    widget.placeAt('cesiumContainer');
    widget.startup();

    var clockViewModel = widget.clockViewModel;

    clockViewModel.startTime(JulianDate.fromIso8601("1800-01-02"));
    clockViewModel.currentTime(JulianDate.fromIso8601("1800-01-02"));
    clockViewModel.stopTime(JulianDate.fromIso8601("2009-01-02"));
    clockViewModel.clockRange(Cesium.ClockRange.LOOP_STOP);
    clockViewModel.clockStep(Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER);


    widget.timeline.zoomTo(widget.clock.startTime, widget.clock.stopTime);

    createPrimitives(widget);
});