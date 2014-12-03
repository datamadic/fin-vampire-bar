'use strict';

(function() {

    // # scroll-bar.js
    //
    // This module defines a custom `<scroll-bar>` element and attaches it to the
    // document.
    //


    var //templateHolder = document.createElement('div'),
    //SCROLL_BAR_BUTTON_SIZE = 15,
        throttle = function(func, wait, options) {
        var context, args, result;
        var timeout = null;
        var previous = 0;
        if (!options) {
            options = {};
        }
        var later = function() {
            previous = options.leading === false ? 0 : Date.now();
            timeout = null;
            result = func.apply(context, args);
            if (!timeout) {
                context = args = null;
            }
        };
        return function() {
            var now = Date.now();
            if (!previous && options.leading === false) {
                previous = now;
            }
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0 || remaining > wait) {
                clearTimeout(timeout);
                timeout = null;
                previous = now;
                result = func.apply(context, args);
                if (!timeout) {
                    context = args = null;
                }
            } else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(later, remaining);
            }
            return result;
        };
    };

    //templateHolder.innerHTML = require('./templates.js').scrollbar();



    //ScrollBar.prototype = Object.create(window.HTMLElement.prototype);

    Polymer('fin-vampire-bar', { /* jshint ignore:line  */

        setRangeAdapter: function(rangeAdapter) {

            var that = this;

            that.rangeAdapter = rangeAdapter;
            if (that.thumb) {
                that.thumb.rangeAdapter = rangeAdapter;
            }

            Object.observe(that.rangeAdapter.valueObj, function(change) {
                var value = change[0].object.value;
                if (value) {
                    try {
                        that.supressUpdates = true;
                        that.moveToPercent(value);
                    } finally {
                        that.supressUpdates = false;
                    }
                }
            });
        },

        // the createdCallback method will be called by the native code
        attached: function() {

            var that = this;




            // this.this.shadowRoot = this.shadowRoot;

            // get the actionable child elements
            this.bar = this.shadowRoot.querySelector('.scroll-bar');
            this.thumb = this.shadowRoot.querySelector('.scroll-bar-thumb');
            this.gutter = this.shadowRoot.querySelector('.scroll-bar-gutter');

            this.configureOrientation();

            //var bounds = that.bounds = that.getBoundingClientRect();
            that.isScrolling = false;

            that.attachThumbMouseDown()
                .attachThumbMouseMove()
                .attachThumbMouseUp();
        }, // end attaached


        throttledWheelEvent: throttle(function(event) {

            var that = this;

            var directionXY = that.orientation.toUpperCase(),
                styleProperty = directionXY === 'Y' ? 'top' : 'left',
                rangeStop = that.rangeAdapter.rangeStop(),
                currentPercent = ((that.thumb.style && that.thumb.style[styleProperty]) && parseFloat(that.thumb.style[styleProperty])) || 0,
                direction = event['delta' + directionXY] > 0 ? 1 : -1,
                currentPercentAsRows = Math.round(that.rangeAdapter.rangeStop() * currentPercent),
                oneMoreRow = Math.round(currentPercentAsRows + (1 * direction)),
                ranged = oneMoreRow / rangeStop / 100;

            ranged = ranged > 1 ? 1 : ranged;
            ranged = ranged < 0 ? 0 : ranged;

            that.rangeAdapter.setValue(ranged);

        }, 30),

        attachWheelEvent: function() {
            var that = this;

            document.addEventListener('wheel', function(event) {
                // dont pull on the page at all
                event.preventDefault();
                that.throttledWheelEvent(event);
            });

            return that;
        },

        attachThumbMouseDown: function() {
            var that = this;

            that.thumb.addEventListener('mousedown', function(event) {
                that.isScrolling = true;
                var offset = (typeof event['offset' + that.orientation.toUpperCase()] === 'undefined') ? 'layer' : 'offset';
                that.offset = event[offset + that.orientation.toUpperCase()];
            });

            return that;
        },

        attachThumbMouseMove: function() {
            var that = this;

            document.addEventListener('mousemove', function(event) {
                if (that.isScrolling) {

                    that.moveThumb(event['page' + that.orientation.toUpperCase()]);
                }
            });

            return that;
        },

        attachThumbMouseUp: function() {
            var that = this;
            document.addEventListener('mouseup', function() {
                if (that.isScrolling) {
                    that.isScrolling = false;
                }
            });

            return that;
        },

        moveThumb: function(pageLocation) {
            var that = this,
                direction = this.orientation === 'y' ? 'top' : 'left',
                //percent,
                maxScroll = that.getMaxScroll(),
                distanceFromEdge = that.gutter.getBoundingClientRect(),
                offBy = pageLocation - distanceFromEdge[direction] - that.offset;

            offBy = offBy < 0 ? 0 : offBy;
            offBy = offBy / maxScroll;
            offBy = offBy > 1 ? 1 : offBy;
            offBy = offBy * 100;

            that.thumb.style[direction] = offBy + '%';

            if (that.rangeAdapter) {
                if (that.supressUpdates) {
                    return;
                }
                that.rangeAdapter.setValue(offBy / 100);
            }
        }, //end movethumb value

        moveToPercent: function(percent) {
            var that = this;

            if (!that.isScrolling) {
                that.moveThumb(percent * this.getMaxScroll());
            }
        },


        setValueUpdatedCallback: function(callback) {
            this.valueUpdatedCallback = callback;

        },


        setOrientation: function(orientation) {
            this.orientation = orientation;

        },

        getMaxScroll: function() {
            var direction = this.orientation === 'y' ? 'clientHeight' : 'clientWidth';
            return this.gutter[direction];

        },


        configureOrientation: function() {
            var orientation = 'y';

            if ('horizontal' in this.attributes) {
                orientation = 'x';
                this.bar.classList.add('horizontal');
            }

            this.setOrientation(orientation);
        },

        tickle: function() {
            this.rangeAdapter.setValue(this.lastPercent);
        },

        lastPercent: 0.0,

        createRangeAdapter: function(subject, userConfig) {
            var config = userConfig || {
                    step: 1,
                    page: 40,
                    rangeStart: 0,
                    rangeStop: 100
                },
                that = {};

            // this is the 'cached' value that is listenable
            that.valueObj = {
                value: null
            };

            Object.observe(subject, function() {
                that.subjectChanged();
            });

            that.subjectChanged = function() {
                that.valueObj.value = that.computeNormalizedValue();
            };

            // that.grid = function(value) {
            //     if (value === undefined) {
            //         return grid;
            //     }
            //     grid = value;
            // };

            that.rangeStart = function(value) {
                if (value === undefined) {
                    return config.rangeStart;
                }
            };

            that.rangeStop = function(value) {
                if (value === undefined) {
                    return config.rangeStop;
                }
            };

            that.page = function(value) {
                if (value === undefined) {
                    return config.page;
                }
            };

            // @param value is a number
            that.setValue = function(newValue) {
                if (typeof newValue !== 'number') {
                    return;
                }
                var deNormalized = Math.floor((newValue * (config.rangeStop - config.rangeStart)) + config.rangeStart);
                subject.setValue(deNormalized);
                that.valueObj.value = newValue;
            };
            that.computeNormalizedValue = function() {
                var value = (subject.getValue() - config.rangeStart) / (config.rangeStop - config.rangeStart);
                return value;
            };

            that.getValue = function() {
                return that.valueObj.value;
            };

            return that;
        }

    });

})();
