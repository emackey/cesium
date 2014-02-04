/*global defineSuite*/
defineSuite([
         'Widgets/Navigation/NavigationViewModel',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/GeographicProjection',
         'Core/IntersectionTests',
         'Core/Math',
         'Core/Matrix4',
         'Core/Ray',
         'Scene/Camera',
         'Scene/OrthographicFrustum',
         'Scene/SceneMode'
     ], function(
         NavigationViewModel,
         Cartesian2,
         Cartesian3,
         Ellipsoid,
         GeographicProjection,
         IntersectionTests,
         CesiumMath,
         Matrix4,
         Ray,
         Camera,
         OrthographicFrustum,
         SceneMode) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var canvas;
    var camera;
    var viewModel;

    // create a mock canvas object to add events to so they are callable.
    var MockCanvas = function() {
        this.disableRootEvents = true;
        this.clientWidth = 1024;
        this.clientHeight = 768;
    };

    MockCanvas.prototype.getBoundingClientRect = function() {
        return {
            left : 0,
            top : 0,
            width : 0,
            height : 0
        };
    };

    var Direction = {
            RIGHT : 0,
            UP : 90,
            LEFT : 180,
            DOWN : -90
    };

    beforeEach(function() {
       canvas = new MockCanvas();
       camera = new Camera(canvas);
       viewModel = new NavigationViewModel(canvas, camera.controller);
    });

    afterEach(function() {

    });

    it('constructor throws without a canvas', function() {
        expect(function() {
           return new NavigationViewModel();
        }).toThrow();
    });

    it('constructor throws without a camera', function() {
       expect(function() {
           return new NavigationViewModel(new MockCanvas());
       }).toThrow();
    });

    it('get/set ellipsoid', function() {
       expect(viewModel.getEllipsoid()).toEqual(Ellipsoid.WGS84);
       viewModel.setEllipsoid(Ellipsoid.UNIT_SPHERE);
       expect(viewModel.getEllipsoid()).toEqual(Ellipsoid.UNIT_SPHERE);
    });

    function updateViewModel(frameState) {
        camera.controller.update(frameState.mode, frameState.scene2D);
        viewModel.update(frameState.mode);
    }

    function setUp2D() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var frameState = {
            mode : SceneMode.SCENE2D,
            scene2D : {
                projection : projection
            }
        };
        var maxRadii = ellipsoid.getMaximumRadius();
        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (canvas.clientHeight / canvas.clientWidth);
        frustum.bottom = -frustum.top;
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;
        camera.frustum = frustum;

        camera.position = new Cartesian3(0.0, 0.0, maxRadii);
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = Cartesian3.UNIT_X.clone();
        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 1.0);

        return frameState;
    }

    it('translate right in 2D', function() {
       var frameState = setUp2D();
       var position = camera.position.clone();

       viewModel.pointerDirection = Direction.RIGHT;
       viewModel.pointerDistance = 50;

       updateViewModel(frameState);
       expect(position.x).toBeLessThan(camera.position.x);
       expect(position.y).toEqual(camera.position.y);
       expect(position.z).toEqual(camera.position.z);
    });

    it('translate left in 2D', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();

        viewModel.pointerDirection = Direction.LEFT;
        viewModel.pointerDistance = 50;

        updateViewModel(frameState);
        expect(position.x).toBeGreaterThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate up in 2D', function() {
       var frameState = setUp2D();
       var position = camera.position.clone();

       viewModel.pointerDirection = Direction.UP;
       viewModel.pointerDistance = 50;

       updateViewModel(frameState);
       expect(position.y).toBeGreaterThan(camera.position.y);
       expect(position.x).toEqual(camera.position.x);
       expect(position.z).toEqual(camera.position.z);
    });

    it('translate down in 2D', function() {
       var frameState = setUp2D();
       var position = camera.position.clone();

       viewModel.pointerDirection = Direction.DOWN;
       viewModel.pointerDistance = 50;

       updateViewModel(frameState);
       expect(position.y).toBeLessThan(camera.position.y);
       expect(position.x).toEqual(camera.position.x);
       expect(position.z).toEqual(camera.position.z);
    });

    it('zoom-in in 2D', function() {
       var frameState = setUp2D();
       var position = camera.position.clone();
       var frustumDiff = camera.frustum.right - camera.frustum.left;

       viewModel.zoomRingAngle = 20;

       updateViewModel(frameState);
       expect(position.x).toEqual(camera.position.x);
       expect(position.y).toEqual(camera.position.y);
       expect(position.z).toEqual(camera.position.z);
       expect(frustumDiff).toBeGreaterThan(camera.frustum.right - camera.frustum.left);
    });

    it('zoom-out in 2D', function() {
       var frameState = setUp2D();
       var position = camera.position.clone();
       var frustumDiff = camera.frustum.right - camera.frustum.left;

       viewModel.zoomRingAngle = -20;

       updateViewModel(frameState);
       expect(position.x).toEqual(camera.position.x);
       expect(position.y).toEqual(camera.position.y);
       expect(position.z).toEqual(camera.position.z);
       expect(frustumDiff).toBeLessThan(camera.frustum.right - camera.frustum.left);
    });

    it('zoom with max zoom rate in 2D', function() {
       var frameState = setUp2D();
       var position = camera.position.clone();

       var factor = 1000000.0;
       camera.frustum.right *= factor;
       camera.frustum.left *= factor;
       camera.frustum.top *= factor;
       camera.frustum.bottom *= factor;
       var frustumDiff = camera.frustum.right - camera.frustum.left;

       viewModel.zoomRingAngle = 20;

       updateViewModel(frameState);
       expect(position.x).toEqual(camera.position.x);
       expect(position.y).toEqual(camera.position.y);
       expect(position.z).toEqual(camera.position.z);
       expect(frustumDiff).toBeGreaterThan(camera.frustum.right - camera.frustum.left);
    });

    it('update with zoomRingAngle unchanged has no effect on the camera', function() {
        var frameState = setUp2D();
        var position = camera.position.clone();
        var frustumDiff = camera.frustum.right - camera.frustum.left;

        updateViewModel(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toEqual(camera.frustum.right - camera.frustum.left);
    });

    it('zoom-in does not affect camera close to the surface', function() {
        var frameState = setUp2D();

        var frustum = camera.frustum;
        var ratio = frustum.top / frustum.right;
        frustum.right = viewModel.minimumZoomDistance * 0.5;
        frustum.left = -frustum.right;
        frustum.top = ratio * frustum.right;
        frustum.bottom = -frustum.top;

        var position = camera.position.clone();
        var frustumDiff = camera.frustum.right - camera.frustum.left;

        viewModel.zoomRingAngle = 20;

        updateViewModel(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
        expect(frustumDiff).toEqual(camera.frustum.right - camera.frustum.left);
    });

    function setUpCV() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var frameState = {
            mode : SceneMode.COLUMBUS_VIEW,
            scene2D : {
                projection : projection
            }
        };

        var maxRadii = ellipsoid.getMaximumRadius();
        camera.position = new Cartesian3(0.0, 0.0, maxRadii);
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = Cartesian3.UNIT_X.clone();
        camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 1.0);

        return frameState;
    }

    it('translate right in Columbus view', function() {
        var frameState = setUpCV();
        var position = camera.position.clone();

        viewModel.pointerDirection = Direction.RIGHT;
        viewModel.pointerDistance = 50;

        updateViewModel(frameState);
        expect(position.x).toBeLessThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate left in Columbus view', function() {
        var frameState = setUpCV();
        var position = camera.position.clone();

        viewModel.pointerDirection = Direction.LEFT;
        viewModel.pointerDistance = 50;

        updateViewModel(frameState);
        expect(position.x).toBeGreaterThan(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toEqual(camera.position.z);
    });

    it('translate up in Columbus view', function() {
       var frameState = setUpCV();
       var position = camera.position.clone();

       viewModel.pointerDirection = Direction.UP;
       viewModel.pointerDistance = 50;

       updateViewModel(frameState);
       expect(position.y).toBeGreaterThan(camera.position.y);
       expect(position.x).toEqual(camera.position.x);
       expect(position.z).toEqual(camera.position.z);
    });

    it('translate down in Columbus view', function() {
       var frameState = setUpCV();
       var position = camera.position.clone();

       viewModel.pointerDirection = Direction.DOWN;
       viewModel.pointerDistance = 50;

       updateViewModel(frameState);
       expect(position.y).toBeLessThan(camera.position.y);
       expect(position.x).toEqual(camera.position.x);
       expect(position.z).toEqual(camera.position.z);
    });

    it('zoom-in in Columbus view', function() {
        var frameState = setUpCV();
        var position = camera.position.clone();

        viewModel.zoomRingAngle = 20;

        updateViewModel(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toBeGreaterThan(camera.position.z);
    });

    it('zoom-out in Columbus view', function() {
        var frameState = setUpCV();
        var position = camera.position.clone();

        viewModel.zoomRingAngle = -20;

        updateViewModel(frameState);
        expect(position.x).toEqual(camera.position.x);
        expect(position.y).toEqual(camera.position.y);
        expect(position.z).toBeLessThan(camera.position.z);
    });

    function setUp3D() {
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection(ellipsoid);
        var frameState = {
                mode : SceneMode.SCENE3D,
                scene2D : {
                    projection : projection
                }
        };
        return frameState;
    }

    it('pans in 3D', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();

        viewModel.pointerDirection = 45;
        viewModel.pointerDistance = 50;

        updateViewModel(frameState);
        expect(camera.position).not.toEqual(position);
        expect(camera.direction).toEqualEpsilon(camera.position.negate().normalize(), CesiumMath.EPSILON15);
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('pans in 3D with constrained axis', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();
        camera.controller.constrainedAxis = Cartesian3.UNIT_Z;

        viewModel.pointerDirection = 45;
        viewModel.pointerDistance = 50;

        updateViewModel(frameState);
        expect(camera.position).not.toEqual(position);
        expect(camera.direction).toEqualEpsilon(camera.position.negate().normalize(), CesiumMath.EPSILON15);
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });

    it('zoom-in in 3D', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();

        viewModel.zoomRingAngle = 20;

        updateViewModel(frameState);
        expect(position.magnitude()).toBeGreaterThan(camera.position.magnitude());
    });

    it('zoom-out in 3D', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();

        viewModel.zoomRingAngle = -20;

        updateViewModel(frameState);
        expect(position.magnitude()).toBeLessThan(camera.position.magnitude());
    });

    it('zooms out to maximum height in 3D', function() {
        var frameState = setUp3D();

        var positionCart = Ellipsoid.WGS84.cartesianToCartographic(camera.position);
        positionCart.height = 0.0;
        camera.position = Ellipsoid.WGS84.cartographicToCartesian(positionCart);

        var maxDist = 100.0;
        viewModel.minimumZoomDistance = 0.0;
        viewModel.maximumZoomDistance = maxDist;

        viewModel.zoomRingAngle = -20;

        updateViewModel(frameState);
        var height = Ellipsoid.WGS84.cartesianToCartographic(camera.position).height;
        expect(height).toEqualEpsilon(maxDist, CesiumMath.EPSILON2);
    });

    it('tilts in 3D', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();

        viewModel.tiltRingAngle = -20;

        updateViewModel(frameState);
        expect(camera.position).not.toEqual(position);
        expect(camera.direction).not.toEqualEpsilon(camera.position.negate().normalize(), CesiumMath.EPSILON15);
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);

        var ray = new Ray(camera.positionWC, camera.directionWC);
        var intersection = IntersectionTests.rayEllipsoid(ray, frameState.scene2D.projection.getEllipsoid());
        expect(intersection).toBeDefined();
    });

    it('does not tilt in the wrong direction', function() {
        var frameState = setUp3D();
        var position = camera.position.clone();

        viewModel.tiltRingAngle = 20;

        updateViewModel(frameState);
        expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON8);
        expect(camera.direction).toEqualEpsilon(camera.position.negate().normalize(), CesiumMath.EPSILON15);
        expect(camera.direction.cross(camera.up)).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
        expect(camera.right.cross(camera.direction)).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
    });
});