/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../getElement',
        '../../ThirdParty/knockout'
    ], function(
        defaultValue,
        defineProperties,
        destroyObject,
        DeveloperError,
        getElement,
        knockout) {
    "use strict";

    var svgNS = "http://www.w3.org/2000/svg";
    var xlinkNS = "http://www.w3.org/1999/xlink";

    //Dynamically builds an SVG element from a JSON object.
    function svgFromObject(obj) {
        var ele = document.createElementNS(svgNS, obj.tagName);
        for ( var field in obj) {
            if (obj.hasOwnProperty(field) && field !== 'tagName') {
                if (field === 'children') {
                    var i;
                    var len = obj.children.length;
                    for (i = 0; i < len; ++i) {
                        ele.appendChild(svgFromObject(obj.children[i]));
                    }
                } else if (field.indexOf('xlink:') === 0) {
                    ele.setAttributeNS(xlinkNS, field.substring(6), obj[field]);
                } else if (field === 'textContent') {
                    ele.textContent = obj[field];
                } else {
                    ele.setAttribute(field, obj[field]);
                }
            }
        }
        return ele;
    }

    function svgText(x, y, msg) {
        var text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('class', 'cesium-navigation-svgText');

        var tspan = document.createElementNS(svgNS, 'tspan');
        tspan.textContent = msg;
        text.appendChild(tspan);
        return text;
    }

    function circularButton(x, y, path) {
        var button = {
            tagName : 'g',
            'class' : 'cesium-navigation-circularButton',
            transform : 'translate(' + x + ',' + y + ')',
            children : [{
                tagName : 'circle',
                'class' : 'cesium-navigation-buttonMain',
                cx : 0,
                cy : 0,
                r : 10
            }, {
                tagName : 'use',
                'class' : 'cesium-navigation-buttonPath',
                'xlink:href' : path
            }]
        };
        return svgFromObject(button);
    }

    function setPointerFromMouse(widget, e) {
        if (e.type === 'mousedown') {
            widget._dragging = true;
        } else if (widget._dragging && e.type === 'mousemove') {
            console.log("Dragged!");
        } else {
            widget._dragging = false;
        }
    }

    var Navigation = function(container, viewModel) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        if (typeof viewModel === 'undefined') {
            throw new DeveloperError('viewModel is required.');
        }

        container = getElement(container);

        this._viewModel = viewModel;
        this._container = container;

        this._centerX = 0;
        this._centerY = 0;
        this._dragging = false;

        var svg = document.createElementNS(svgNS, 'svg:svg');
        this._svgNode = svg;

        //Define the XLink namespace that SVG uses
        svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', xlinkNS);

        var topG = document.createElementNS(svgNS, 'g');
        this._topG = topG;

        var zoomRing = svgFromObject({
            tagName : 'use',
            'class' : 'cesium-navigation-zoomRing',
            transform : 'translate(60,168)',
            'xlink:href' : '#navigation_pathZoomTiltRing'
        });
        this._zoomRing = zoomRing;

        var zoomPlus = circularButton(60, 30, '#navigation_pathPlus');
        var zoomMinus = circularButton(60, 168, '#navigation_pathMinus');

        this._zoomRingPointer = svgFromObject({
            tagName : 'circle',
            'class' : 'cesium-navigation-zoomRingPointer',
            cx : 20,
            cy : 95,
            r : 10
        });

        var zoomRingG = document.createElementNS(svgNS, 'g');
        zoomRingG.setAttribute('class', 'cesium-navigation-zoomRingG');

        zoomRingG.appendChild(zoomRing);
        zoomRingG.appendChild(this._zoomRingPointer);
        zoomRingG.appendChild(zoomPlus);
        zoomRingG.appendChild(zoomMinus);

        var tiltRing = svgFromObject({
            tagName : 'use',
            'class' : 'cesium-navigation-tiltRing',
            transform : 'translate(140,168) scale(-1,1)',
            'xlink:href' : '#navigation_pathZoomTiltRing'
        });
        this._tiltRing = tiltRing;

        var tiltTiltRect = circularButton(140, 30, '#navigation_pathTiltRect');
        var tiltRect = circularButton(140, 168, '#navigation_pathRect');

        this._tiltRingPointer = svgFromObject({
            tagName : 'circle',
            'class' : 'cesium-navigation-tiltRingPointer',
            cx : 180,
            cy : 95,
            r : 10
        });

        var tiltRingG = document.createElementNS(svgNS, 'g');
        tiltRingG.setAttribute('class', 'cesium-navigation-tiltRingG');

        tiltRingG.appendChild(tiltRing);
        tiltRingG.appendChild(this._tiltRingPointer);
        tiltRingG.appendChild(tiltTiltRect);
        tiltRingG.appendChild(tiltRect);

        var knobG = svgFromObject({
           tagName : 'g',
           transform : 'translate(100,100)'
        });

        var knobOuterG = svgFromObject({
            tagName : 'g'
        });

        this._knobOuter = svgFromObject({
            tagName : 'circle',
            'class' : 'cesium-navigation-knobOuter',
            cx : 0,
            cy : 0,
            r : 60
        });

        this._knobOuterN = svgText(0, -42, 'N');

        knobOuterG.appendChild(this._knobOuter);
        knobOuterG.appendChild(this._knobOuterN);

        var knobInnerAndShieldSize = 40;

        var knobInner = svgFromObject({
            tagName : 'circle',
            'class' : 'cesium-navigation-knobInner',
            cx : 0,
            cy : 0,
            r : knobInnerAndShieldSize
        });

        var knobShield = svgFromObject({
            tagName : 'circle',
            'class' : 'cesium-navigation-blank',
            cx : 0,
            cy : 0,
            r : knobInnerAndShieldSize
        });

        this._panJoystick = svgFromObject({
            tagName : 'circle',
            'class' : 'cesium-navigation-panJoystick',
            cx : 0,
            cy : 0,
            r : 10
        });

        knobG.appendChild(knobOuterG);
        knobG.appendChild(knobInner);
        knobG.appendChild(knobShield);
        knobG.appendChild(this._panJoystick);

        topG.appendChild(zoomRingG);
        topG.appendChild(tiltRingG);
        topG.appendChild(knobG);

        svg.appendChild(topG);
        container.appendChild(svg);

        var that = this;
        var mouseCallback = function(e) {
            setPointerFromMouse(that, e);
        };
        this._mouseCallback = mouseCallback;

        document.addEventListener('mousemove', mouseCallback, true);
        document.addEventListener('mouseup', mouseCallback, true);
        this._knobOuterN.addEventListener('mousedown', mouseCallback, true);
        this._panJoystick.addEventListener('mousedown', mouseCallback, true);
        this._zoomRingPointer.addEventListener('mousedown', mouseCallback, true);
        this._tiltRingPointer.addEventListener('mousedown', mouseCallback, true);

        var defsElement = svgFromObject({
           tagName : 'defs',
           children : [{
               id : 'navigation_pathZoomTiltRing',
               tagName : 'path',
               d : 'M0,0 a80,80 1 0,1 0,-138.564'
           }, {
               id : 'navigation_pathPlus',
               tagName : 'path',
               d : 'M-7,2,-2,2,-2,7,2,7,2,2,7,2,7,-2,2,-2,2,-7,-2,-7,-2,-2,-7,-2,-7,2Z'
           }, {
               id : 'navigation_pathMinus',
               tagName : 'path',
               d : 'M-7,2,7,2,7,-2,-7,-2,-7,2Z'
           }, {
               id : 'navigation_pathTiltRect',
               tagName : 'path',
               d : 'M-3,-4,-6,4,6,4,3,-4,-3,-4Z'
           }, {
               id : 'navigation_pathRect',
               tagName : 'path',
               d : 'M-5,-7,-5,7,5,7,5,-7,-5,-7Z'
           }]
        });

        if (typeof this._defsElement === 'undefined') {
            this._svgNode.appendChild(defsElement);
        } else {
            this._svgNode.replaceChild(defsElement, this._defsElement);
        }
        this._defsElement = defsElement;
    };

    return Navigation;
});
