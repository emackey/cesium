/*global require*/
require([
    'Core/ScreenSpaceEventHandler',
    'Core/ScreenSpaceEventType'
], function (
    ScreenSpaceEventHandler,
    ScreenSpaceEventType
) {
    "use strict";

    var targetsDiv, infoDiv;

    var lastWasMouseMove = false, lastWasTouchMove = false, anyMouseEvent = false;
    var lastMouseX = 0;
    var lastMouseY = 0;
    var infoLines = 1;
    var idleTimer;
    var handler;

    var mouseTarget = '-480px -160px';
    var targetsList = ['0px 0px', '-160px 0px', '-320px 0px', '-480px 0px', '0px -160px', '-160px -160px', '-320px -160px'];
    var colorsList = ['#800', '#080', '#008', '#840', '#088', '#808', '#880'];

    window.onload = function() {
        infoDiv = document.getElementById('infoDiv');
        targetsDiv = document.getElementById('targetsDiv');
        infoDiv.innerHTML = "waiting for events...";

        var eventTarget = infoDiv;
        handler = new ScreenSpaceEventHandler(eventTarget);

        eventTarget.oncontextmenu = function() { return false; };
        eventTarget.addEventListener('mousedown', handleMouseDown, false);
        document.addEventListener('mouseup', handleMouseUp, false);
        document.addEventListener('mousemove', handleMouseMove, false);
        document.addEventListener('mousewheel', handleMouseWheel, false);
        document.addEventListener('DOMMouseScroll', handleMouseWheel, false); // Mozilla mouse wheel

        eventTarget.addEventListener('mouseenter', handleMouseEnter, false);
        eventTarget.addEventListener('mouseleave', handleMouseLeave, false);
        eventTarget.addEventListener('mouseover', handleMouseOver, false);
        eventTarget.addEventListener('mouseout', handleMouseOut, false);

        // Touch events seem to work in iOS, Android browser 3.0 and up,
        // and various 3rd-party Android browsers, including FireFox.
        eventTarget.addEventListener('touchstart', handleTouchStart, false);
        document.addEventListener('touchmove', handleTouchMove, false);
        document.addEventListener('touchend', handleTouchEnd, false);
        document.addEventListener('touchcancel', handleTouchCancel, false);

        // The following are not triggered on any of my devices (PC, Android).
        // I think MozTouch* are desktop touch-surface events in FireFox, but not sure.
        eventTarget.addEventListener('MozTouchDown', dumpEvent, false);
        document.addEventListener('MozTouchMove', handleTouchMove, false);
        document.addEventListener('MozTouchUp', handleTouchEnd, false);
        document.addEventListener('scroll', HandleScroll, false);
        window.addEventListener('scroll', HandleScroll, false);
    };

    //
    // Text functions
    //
    function addLogText(msg) {
        infoDiv.innerHTML = msg + "<br\/>" + infoDiv.innerHTML;
        if (infoLines < 20) {
            ++infoLines;
        } else {
            var pos = infoDiv.innerHTML.lastIndexOf("<br");
            infoDiv.innerHTML = infoDiv.innerHTML.substring(0, pos);
        }
    }

    function popLogText() {
        if (infoLines > 1) {
            --infoLines;
            var pos = infoDiv.innerHTML.indexOf("<br");
            pos = infoDiv.innerHTML.indexOf(">", pos + 1);
            infoDiv.innerHTML = infoDiv.innerHTML.substring(pos + 1);
        }
    }

    function idleFunc() {
        addLogText("&nbsp;idle");
        lastWasMouseMove = lastWasTouchMove = false;
    }

    function getTargetSpan(x, y, bkgPos, label, color) {
        x -= 80;
        y -= 80;
        return '<span class="targetSpan" style="left:' + x + 'px;top:' + y +
            'px;color:' + color + ';background-position: ' + bkgPos + ';">' +
            label + '</span>';
    }

    //
    // Mouse events
    //
    function handleEvent(name, e) {
        e.preventDefault();
        var msg = name + " button " + e.button + " x " + e.clientX + " y " + e.clientY;
        if (e.wheelDeltaX !== undefined) {
            msg += " deltaX " + e.wheelDeltaX + " deltaY " + e.wheelDeltaY;
        } else if (e.wheelDelta !== undefined) {
            msg += " wheelDelta " + e.wheelDelta;
        } else if (e.detail || e.axis) {
            if (e.axis && (e.axis === e.VERTICAL_AXIS)) {
                msg += " vertical";
            } else if (e.axis && (e.axis === e.HORIZONTAL_AXIS)) {
                msg += " horizontal";
            }
            msg += " detail " + e.detail;
        }
        addLogText(msg);
        drawEvent(e);
    }

    function drawEvent(e) {
        targetsDiv.innerHTML = getTargetSpan(e.clientX, e.clientY, mouseTarget, "mouse", "#080");

        anyMouseEvent = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        lastWasMouseMove = lastWasTouchMove = false;

        clearTimeout(idleTimer);
        idleTimer = setTimeout(idleFunc, 5000);
    }

    function dumpEvent(e) {
        var mostE = {};
        try {
            for (var key in e) {
                if ((key.indexOf('Ele') === -1) && (key.indexOf('view') === -1) &&
                    (key.indexOf('arget') === -1)) {
                    mostE[key] = e[key];
                }
            }
            infoDiv.innerHTML = JSON.stringify(mostE).replace(/\,/g, ',<br\/>');
        }
        catch (ex) {
            mostE = {};
            for (var key in e) {
                if (e.hasOwnProperty(key)) {
                    mostE[key] = 0;
                }
            }
            infoDiv.innerHTML = JSON.stringify(mostE);
        }
        infoDiv.innerHTML += "<br\/><br\/><br\/><br\/>";
    }

    function handleMouseDown(e) {
        if (!e) { e = window.event; }
        handleEvent("mouse&nbsp; down", e);
        //dumpEvent(e);
    }

    function handleMouseUp(e) {
        if (!e) { e = window.event; }
        handleEvent("mouse&nbsp; &nbsp; up", e);
        anyMouseEvent = false;
    }

    function handleMouseMove(e) {
        if (!e) { e = window.event; }
        if (lastWasMouseMove) {
            popLogText();
        }
        handleEvent("mouse&nbsp; move", e);
        lastWasMouseMove = true;
    }

    function handleMouseWheel(e) {
        if (!e) { e = window.event; }
        handleEvent("mouse wheel", e);
    }

    function handleMouseEnter(e) {
        if (!e) { e = window.event; }
        handleEvent("mouse enter", e);
    }

    function handleMouseLeave(e) {
        if (!e) { e = window.event; }
        handleEvent("mouse leave", e);
        anyMouseEvent = false;
    }

    function handleMouseOver(e) {
        if (!e) { e = window.event; }
        handleEvent("mouse&nbsp; over", e);
    }

    function handleMouseOut(e) {
        if (!e) { e = window.event; }
        handleEvent("mouse &nbsp; out", e);
        anyMouseEvent = false;
    }

    // Scroll event, never happens
    function HandleScroll(e) {
        if (!e) { e = window.event; }
        handleEvent("&nbsp;win scroll", e);
    }

    //
    // Touchscreen events
    //
    function handleTouchEvent(name, e) {
        e.preventDefault();
        var msg = name + " all " + e.touches.length + " target " +
            e.targetTouches.length + " changed " + e.changedTouches.length;

        addLogText(msg);
        drawTouchEvent(e);
    }

    function drawTouchEvent(e) {
        var touches = (e.touches.length > 0) ? e.touches : e.changedTouches;
        if (!touches) {
            return;
        }

        var gfx = "";
        if (anyMouseEvent) {
            gfx += getTargetSpan(lastMouseX, lastMouseY, mouseTarget, "mouse", "#080");
        }

        var len = touches.length;
        for (var i = 0; i < len; ++i) {
            var touch = touches[i];

            var listIndex = touch.identifier % targetsList.length;
            gfx += getTargetSpan(touch.clientX, touch.clientY,
                targetsList[listIndex], "touch " + touch.identifier,
                colorsList[listIndex]);
        }

        targetsDiv.innerHTML = gfx;

        lastWasMouseMove = lastWasTouchMove = false;

        clearTimeout(idleTimer);
        idleTimer = setTimeout(idleFunc, 5000);
    }

    function handleTouchStart(e) {
        if (!e) { e = window.event; }
        handleTouchEvent("touch start", e);
        //dumpEvent(e.touches[0]);
    }

    function handleTouchMove(e) {
        if (!e) { e = window.event; }
        if (!lastWasTouchMove) {
            handleTouchEvent("touch &nbsp;move", e);
        } else {
            drawTouchEvent(e);
        }
        lastWasTouchMove = true;
    }

    function handleTouchEnd(e) {
        if (!e) { e = window.event; }
        handleTouchEvent("touch &nbsp; end", e);
    }

    function handleTouchCancel(e) {
        if (!e) { e = window.event; }
        handleTouchEvent("touchcancel", e);
    }
});
