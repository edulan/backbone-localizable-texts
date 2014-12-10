/*! Backbone.Mutators - v0.4.0
------------------------------
Build @ 2013-05-01
Documentation and Full License Available at:
http://asciidisco.github.com/Backbone.Mutators/index.html
git://github.com/asciidisco/Backbone.Mutators.git
Copyright (c) 2013 Sebastian Golasch <public@asciidisco.com>

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the

Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.*/
(function (root, factory, undef) {
    'use strict';

    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory(require('underscore'), require('Backbone'));
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['underscore', 'backbone'], function (_, Backbone) {
            // Check if we use the AMD branch of Back
            _ = _ === undef ? root._ : _;
            Backbone = Backbone === undef ? root.Backbone : Backbone;
            return (root.returnExportsGlobal = factory(_, Backbone, root));
        });
    } else {
        // Browser globals
        root.returnExportsGlobal = factory(root._, root.Backbone);
    }

// Usage:
//
// Note: This plugin is UMD compatible, you can use it in node, amd and vanilla js envs
//
// Vanilla JS:
// <script src="underscore.js"></script>
// <script src="backbone.js"></script>
// <script src="backbone.mutators.js"></script>
//
// Node:
// var _ = require('underscore');
// var Backbone = require('backbone');
// var Mutators = require('backbone.mutators');
//
//
// AMD:
// define(['underscore', 'backbone', 'backbone.mutators'], function (_, Backbone, Mutators) {
//    // insert sample from below
//    return User;
// });
//
// var User = Backbone.Model.extend({
//    mutators: {
//        fullname: function () {
//            return this.firstname + ' ' + this.lastname;
//        }
//    },
//
//    defaults: {
//        firstname: 'Sebastian',
//        lastname: 'Golasch'
//    }
// });
//
// var user = new User();
// user.get('fullname') // returns 'Sebastian Golasch'
// user.toJSON() // return '{firstname: 'Sebastian', lastname: 'Golasch', fullname: 'Sebastian Golasch'}'

}(this, function (_, Backbone, root, undef) {
    'use strict';

    // check if we use the amd branch of backbone and underscore
    Backbone = Backbone === undef ? root.Backbone : Backbone;
    _ = _ === undef ? root._ : _;

    // extend backbones model prototype with the mutator functionality
    var Mutator     = function () {},
        oldGet      = Backbone.Model.prototype.get,
        oldSet      = Backbone.Model.prototype.set;

    // This is necessary to ensure that Models declared without the mutators object do not throw and error
    Mutator.prototype.mutators = {};

    // override get functionality to fetch the mutator props
    Mutator.prototype.get = function (attr) {
        var mutators = _.result(this, 'mutators');
        var isMutator = !_.isUndefined(this.mutators);

        // check if we have a getter mutation
        if (isMutator && _.isFunction(mutators[attr])) {
            return mutators[attr].call(this, _.bind(oldGet, this));
        }

        // check if we have a deeper nested getter mutation
        if (isMutator && _.isObject(mutators[attr]) && _.isFunction(mutators[attr].get)) {
            return mutators[attr].get.call(this, _.bind(oldGet, this));
        }

        return oldGet.call(this, attr);
    };

    // override set functionality to set the mutator props
    Mutator.prototype.set = function (key, value, options) {
        var mutators = _.result(this, 'mutators');
        var isMutator = !_.isUndefined(this.mutators),
            ret = null,
            attrs = null;

        // seamleassly stolen from backbone core
        // check if the setter action is triggered
        // using key <-> value or object
        if (_.isObject(key) || _.isNull(key)) {
            attrs = key;
            options = value;
        } else {
            attrs = {};
            attrs[key] = value;
        }

        // check if we have a deeper nested setter mutation
        if (isMutator && _.isObject(mutators[key])) {

            // check if we need to set a single value
            if (_.isFunction(mutators[key].set)) {
                ret = mutators[key].set.call(this, _.bind(oldSet, this), key, attrs[key], options);
            } else if(_.isFunction(mutators[key])){
                ret = mutators[key].call(this, _.bind(oldSet, this), key, attrs[key], options);
            }
        }

        if (_.isObject(attrs)) {
            _.each(attrs, function (attr, attrKey) {
                var cur_ret = null;

                if (isMutator && _.isObject(mutators[attrKey])) {
                    var meth = mutators[attrKey];

                    // check if we need to set a single value
                    if(_.isFunction(meth.set)){
                        meth = meth.set;
                    }

                    if(_.isFunction(meth)){
                        if (_.isUndefined(options) || (_.isObject(options) && !options.silent && (!_.isUndefined(options.mutators) && !options.mutators.silent))) {
                            this.trigger('mutators:set:' + attrKey);
                        }
                        cur_ret = meth.call(this, _.bind(oldSet, this), attrKey, attr, options);
                    }

                }
                if (_.isNull(cur_ret)) {
                    cur_ret = oldSet.call(this, attrKey, attr, options);
                }

                if (ret !== false) {
                    ret = cur_ret;
                }

            }, this);
        }

        //validation purposes
        if (!_.isNull(ret)) {
            return ret;
        }

        return oldSet.call(this, key, value, options);
    };

    // override toJSON functionality to serialize mutator properties
    Mutator.prototype.toData = function () {
        var mutators = _.result(this, 'mutators');
        // fetch ye olde values
        var attrs = _.clone(this.attributes);
        // iterate over all mutators (if there are some)
        _.each(mutators, function (mutator, name) {
            // check if we have some getter mutations
            if (_.isObject(mutators[name]) && _.isFunction(mutators[name].get)) {
                attrs[name] = mutators[name].get.call(this, _.bind(oldGet, this));
            } else {
                attrs[name] = mutators[name].call(this, _.bind(oldGet, this));
            }
        }, this);

        return { data: attrs };
    };

    // override get functionality to get HTML-escaped the mutator props
    Mutator.prototype.escape = function (attr){
        var val = this.get(attr);

        return _.escape(val == null ? '' : '' + val);
    };

    // extend the models prototype
    _.extend(Backbone.Model.prototype, Mutator.prototype);

    // make mutators globally available under the Backbone namespace
    Backbone.Mutators = Mutator;
    return Mutator;
}));
