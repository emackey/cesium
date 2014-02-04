/*global defineSuite*/
defineSuite([
         'Widgets/Navigation/Navigation',
         'Widgets/Navigation/NavigationViewModel',
         'Scene/Camera'
     ], function(
         Navigation,
         NavigationViewModel,
         Camera) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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

    it('sanity check', function() {
        var canvas = new MockCanvas();
        var camera = new Camera(canvas);
        var navigationViewModel = new NavigationViewModel(canvas, camera.controller);
        var navigation = new Navigation(document.body, navigationViewModel);
        navigation.applyThemeChanges();
        navigation.destroy();
    });
});