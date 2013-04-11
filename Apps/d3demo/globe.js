/*global require, sharedObject, d3*/

require([
    'Cesium',
    'Widgets/Dojo/CesiumViewerWidget',
    'Core/JulianDate'
], function(
    Cesium, CesiumViewerWidget, JulianDate)
{
    "use strict";

    var polylines = [];

    // Load the data.
    d3.json("nations_geo.json", function(nations) {

        var colorScale = d3.scale.category20c();


        var ellipsoid = widget.centralBody.getEllipsoid();
        var primitives = widget.scene.getPrimitives();
        var polylineCollection = new Cesium.PolylineCollection();

        for (var i=0; i<nations.length; i++){
            // Set a polyline's width
            var nation = nations[i];

            var widePolyline = polylineCollection.add();
            widePolyline.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 0.0),
                // TODO: use d3.scale to scale the height of the line based on a data parameter
                Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 1000000.0)
            ]));
            // TODO: use d3.scale to scale the width of the line based on a data parameter
            widePolyline.setWidth(10.0);
            widePolyline.getMaterial().uniforms.color = Cesium.Color.fromCssColorString(colorScale(nation.region));

            polylines.push(widePolyline);
        }

        primitives.add(polylineCollection);


    });

    function updateLineData() {
        var ellipsoid = widget.centralBody.getEllipsoid();
        var xScale = d3.scale.log().domain([300, 1e5]).range([0, 10000000.0]);
        //var yScale = d3.scale.linear().domain([10, 85]).range([0, 30]);
        var widthScale = d3.scale.sqrt().domain([0, 5e8]).range([0, 40]);

        for (var i=0; i<polylines.length; i++) {
            var nation = sharedObject.yearData[i];
            var polyline = polylines[i];

            polyline.setPositions(ellipsoid.cartographicArrayToCartesianArray([
                           Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, 0.0),
                           Cesium.Cartographic.fromDegrees(nation.lon, nation.lat, xScale(nation.income))
                           ]));
            polyline.setWidth(widthScale(nation.population));

        }

    }


    var widget = new CesiumViewerWidget({
        onObjectMousedOver : function(mousedOverObject) {
            widget.highlightObject(mousedOverObject);
        },
        showSkyBox : false
    });

    widget.placeAt('cesiumContainer');
    widget.startup();

    var providerViewModels = widget.baseLayerPicker.viewModel.imageryProviderViewModels;
    widget.baseLayerPicker.viewModel.selectedItem(providerViewModels()[8]);

    var clockViewModel = widget.clockViewModel;

    clockViewModel.startTime(JulianDate.fromIso8601("1800-01-02"));
    clockViewModel.currentTime(JulianDate.fromIso8601("1800-01-02"));
    clockViewModel.stopTime(JulianDate.fromIso8601("2009-01-02"));
    clockViewModel.clockRange(Cesium.ClockRange.LOOP_STOP);
    clockViewModel.clockStep(Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER);

    var yearPerSec = 86400*365;
    clockViewModel.multiplier(yearPerSec * 5);

    widget.animationViewModel.setShuttleRingTicks([yearPerSec, yearPerSec*5, yearPerSec*10, yearPerSec*50]);
    widget.animationViewModel.setDateFormatter(function(date, viewModel) {
        var gregorianDate = date.toGregorianDate();
        return 'Year: ' + gregorianDate.year;
    });

    var year = 1800;

    widget.clock.onTick.addEventListener(function(){
        var gregorianDate = widget.clock.currentTime.toGregorianDate();
        var currentYear = gregorianDate.year + gregorianDate.month/12;// + gregorianDate.day/31;
        if (currentYear !== year && typeof window.displayYear !== 'undefined'){
            window.displayYear(currentYear);
            year = currentYear;

            updateLineData();
        }
    });


    widget.timeline.zoomTo(widget.clock.startTime, widget.clock.stopTime);


    sharedObject.flyTo = function(d) {
        var destination = Cesium.Cartographic.fromDegrees(d.lon, d.lat-20.0, 10000000.0);
        var lookAt = widget.centralBody.getEllipsoid().cartographicToCartesian(
                                Cesium.Cartographic.fromDegrees(d.lon, d.lat, 0.0));
        var direction = lookAt.subtract(widget.centralBody.getEllipsoid().cartographicToCartesian(destination)).normalize();
        var up = direction.cross(lookAt).cross(direction).normalize();

        // only fly there if it is not the camera's current position
        if (!widget.centralBody.getEllipsoid()
                   .cartographicToCartesian(destination)
                   .equalsEpsilon(widget.scene.getCamera().getPositionWC(), Cesium.Math.EPSILON6)) {

            var flight = Cesium.CameraFlightPath.createAnimationCartographic(widget.scene.getFrameState(), {
                destination : destination,
                direction : direction,
                up : up
            });
            widget.scene.getAnimations().add(flight);
        }
    };

});