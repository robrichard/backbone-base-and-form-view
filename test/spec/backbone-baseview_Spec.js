/*global Backbone, jQuery, _, describe, it, expect, spyOn, waitsFor, beforeEach */
(function (root, $, Backbone, _) {
    "use strict";

    describe('Backbone.BaseView', function () {
        var testData = [{
                firstName: 'Joe',
                lastName: 'Shmoe',
                registered: true
            }, {
                firstName: 'Sara',
                lastName: 'Shmara',
                registered: true
            }, {
                firstName: 'Harry',
                lastName: 'Shmarry',
                registered: false
            }],

            testCollection = new Backbone.Collection(testData),

            testView,

            toString = Object.prototype.toString,

            TableView = Backbone.BaseView.extend({
                tagName: 'table',
                template: _.template('<thead></thead><tbody></tbody>'),
                subViewConfig: {
                    row : {
                        construct: 'RowView',
                        location: 'tbody'
                    },
                    headingRow: {
                        construct: 'HeadingRowView',
                        location: 'thead',
                        singleton: true
                    }
                },
                setup: function () {
                    this.subs.add('headingRow', {
                        cols: ['First Name', 'Last Name', 'Actions']
                    });
                    this.collection.each(function (rowModel) {
                        this.subs.add('row', { model: rowModel });
                    }, this);
                    return this;
                },
                render: function () {
                    this.$el.html(this.template());
                    return this;
                },
                renderSubs: function () {
                    this.subs.renderAppend({ clearLocations: true });
                    return this;
                },
                viewEvents: {
                    'submit' : function (arg, view) {
                        this.wasSubmitted = true;
                        this.submissionArg = arg;
                        this.submissionView = view;
                    }
                }
            }),

            RowView = Backbone.BaseView.extend({
                tagName: 'tr',
                autoInitSubViews: true,
                subViewConfig: {
                    a: {
                        singleton: true,
                        construct: 'Backbone.BaseView'
                    }
                }
            }),

            HeadingRowView = Backbone.BaseView.extend({
                tagName: 'tr',
                initialize: function (opts) { this.options = opts; }
            }),

            ActionsView = Backbone.BaseView.extend({
                tagName: 'td',
                initialize: function (opts) { this.options = opts; }
            });

        _.extend(root, {
            TableView : TableView,
            RowView : RowView,
            HeadingRowView: HeadingRowView,
            ActionsView : ActionsView
        });

        beforeEach(function () {
            testView = new TableView({
                collection : testCollection
            });
        });

        it('should create a subview manager', function () {
            expect(testView.subs).toBeDefined();
            expect(typeof testView.subs.get).toBe('function');
            expect(typeof testView.subs.renderByKey).toBe('function');
            expect(typeof testView.subs.filteredSubs).toBe('function');
            expect(toString.call(testView.subs.subViews)).toBe('[object Array]');
        });

        describe('SubViewManager', function () {

            describe('Adding and Retrieving SubViews', function () {

                var data = {
                        firstName: 'Jeff',
                        lastName: 'Schmeff',
                        registered: false
                    },
                    model = new Backbone.Model(data);

                it('should allow you to add subviews for prededfined non-singleton types', function () {

                    var beforeLength = testView.subs.subViews.length;

                    testView.subs.add('row', {
                        model: model
                    });

                    expect(testView.subs.subViews.length).toBeGreaterThan(beforeLength);
                    expect(testView.subs.last().model.cid).toEqual(model.cid);
                });

                it('should return an array when asking for non-singleton types', function () {
                    testView.subs.add('row', {
                        model: model
                    });
                    expect(toString.call(testView.subs.get('row'))).toBe('[object Array]');
                });

                it('should allow you to only add one prededfined singleton subview', function () {
                    var headingRow = testView.subs.get('headingRow');
                    expect(headingRow).toBeUndefined();
                    testView.subs.add('headingRow', {
                        testFlag: 'First Addition'
                    });
                    testView.subs.add('headingRow', {
                        testFlag: 'Second Addition'
                    });
                    expect(testView.subs.last().options.testFlag).toBe('First Addition');
                });

                it('should return an instance when asking for a singleton', function () {
                    testView.subs.add('headingRow', {
                        testFlag: 'First Addition'
                    });
                    testView.subs.add('headingRow', {
                        testFlag: 'Second Addition'
                    });
                    expect(testView.subs.get('headingRow') instanceof HeadingRowView).toBe(true);
                    expect(testView.subs.get('headingRow').options.testFlag).toBe('First Addition');
                });

                it('should allow you to dynamically add a subview of a type that hasn\'t been defined yet', function () {
                    var view = new Backbone.View({
                            model: model
                        }),
                        beforeLen = testView.subs.subViews.length;
                    testView.subs.add('testNotPredefinedType', view);
                    expect(testView.subs.last().cid).toBe(view.cid);
                    expect(testView.subs.subViews.length).toBeGreaterThan(beforeLen);
                });

                it('should allow you to dynamically add a singleton subview that hasn\'t been defined yet', function () {
                    var view = new Backbone.View({
                            model: model
                        }),
                        beforeLen = testView.subs.subViews.length;
                    testView.subs.add('testNotPredefinedType', view, true);
                    expect(testView.subs.last().cid).toBe(view.cid);
                    expect(testView.subs.subViews.length).toBeGreaterThan(beforeLen);
                    expect(testView.subs.get('testNotPredefinedType').cid).toBe(view.cid);
                });

                it('should allow you add an array of instances as a particular type of subviews', function () {
                    var model1 = testCollection.at(0),
                        model2 = testCollection.at(1),
                        view1 = new RowView({
                            model: model1
                        }),
                        view2 = new RowView({
                            model: model2
                        });

                    testView.subs.add('row', [{
                        model: model1
                    }, {
                        model: model2
                    }]);
                    expect(testView.subs.get('row').length).toBe(2);
                    expect(testView.subs.get('row')[0].model.cid).toBe(model1.cid);
                    expect(testView.subs.get('row')[1].model.cid).toBe(model2.cid);

                    testView.subs.add('row', [view1, view2]);
                    expect(testView.subs.get('row').length).toBe(4);
                    expect(testView.subs.last().cid).toBe(view2.cid);
                    expect(testView.subs.get('row')[2].cid).toBe(view1.cid);
                });

                it('should allow you to add subviews by passing an object literal map', function () {
                    var testName = 'Test Name of Heading Row';
                    testView.subs.add({
                        headingRow: {
                            testFlag: testName
                        },
                        row: [{
                            model: testCollection.at(0)
                        }, {
                            model: testCollection.at(1)
                        }]
                    });
                    expect(testView.subs.get('headingRow').options.testFlag).toBe(testName);
                    expect(testView.subs.get('row').length).toBe(2);
                    expect(testView.subs.get('row')[0].model.cid).toBe(testCollection.at(0).cid);
                    expect(testView.subs.get('row')[1].model.cid).toBe(testCollection.at(1).cid);
                });

                it('should allow you to add a config for a subview type before adding it', function () {
                    testView.subs.addConfig('testTypeA', {
                        construct: 'ActionsView',
                        options: { testOpt: 'A' }
                    }).addConfig({
                        testTypeB : {
                            construct: 'Backbone.View',
                            singleton: true
                        }
                    });
                    testView.subs
                        .add('testTypeA', { foo: 'bar' })
                        .add('testTypeA', { foo: 'baz' })
                        .add('testTypeA', { testOpt: 'B' });
                    expect(testView.subs.get('testTypeA').length).toBe(3);
                    expect(testView.subs.get('testTypeA')[0].options.testOpt).toBe('A');
                    expect(testView.subs.get('testTypeA')[1].options.testOpt).toBe('A');
                    expect(testView.subs.get('testTypeA')[0].options.foo).toBe('bar');
                    expect(testView.subs.get('testTypeA')[1].options.foo).toBe('baz');
                    expect(testView.subs.get('testTypeA')[2].options.testOpt).toBe('B');
                    testView.subs.add('testTypeB');
                    expect(testView.subs.get('testTypeB') instanceof Backbone.View).toBeTruthy();
                });

                it('should allow switching the default state of subviews types to being singletons', function () {
                    testView.subs.defaultToSingletons = true;
                    var view1 = new Backbone.View(),
                        view2 = new Backbone.View();
                    view1.name = 'A';
                    view2.name = 'B';
                    testView.subs.add('testType', view1);
                    expect(testView.subs.get('testType') instanceof Backbone.View).toBe(true);
                    testView.subs.add('testType', view2);
                    expect(testView.subs.get('testType').name).toBe('A');
                    testView.subs.addConfig({
                        anotherTestType : {
                            construct: Backbone.View
                        },
                        yetAnotherTestType : {
                            construct: Backbone.View,
                            singleton: false
                        }
                    });
                    testView.subs.add('anotherTestType');
                    expect(testView.subs.get('anotherTestType') instanceof Backbone.View).toBe(true);
                    testView.subs.add('anotherTestType', new Backbone.View(), false);
                    expect(testView.subs.get('anotherTestType') instanceof Backbone.View).toBe(true);
                    testView.subs.add('yetAnotherTestType');
                    expect(toString.call(testView.subs.get('yetAnotherTestType'))).toBe('[object Array]');
                });

                it('should automatically create singleton instances from config if "autoInitSingletons" option is true', function () {
                    TableView.prototype.autoInitSubViews = true;
                    var tableView = new TableView({
                        collection: testCollection
                    });
                    expect(tableView.subs.get('headingRow') instanceof HeadingRowView).toBe(true);
                    expect(tableView.subs.get('row')).toBeUndefined();
                    TableView.prototype.autoInitSubViews = false;
                });

                it('should allow retrieval of subviews by the model, if the view had a model when added', function () {
                    var testModel = new Backbone.Model(),
                        testTypeView = new Backbone.View({
                            model: testModel
                        });
                    testView.subs.add('row', {
                        model : testModel
                    });
                    expect(testView.subs.get(testModel)).toBeDefined();
                    expect(testView.subs.get(testModel) instanceof RowView).toBe(true);
                    testView.subs.add('testType', testTypeView, true);
                    expect(toString.call(testView.subs.get(testModel))).toBe('[object Array]');
                    expect(testView.subs.get(testModel).length).toBe(2);
                    expect(testView.subs.get(testModel)[1].cid).toBe(testTypeView.cid);
                });

                it('should always return an array of subviews (of a named type) if "getByType" is used', function () {
                    testView.setup();
                    expect(toString.call(testView.subs.getByType('headingRow'))).toBe('[object Array]');
                    expect(testView.subs.getByType('row').length).toBe(testView.collection.length);
                });
            });

            describe('Removing Subviews', function () {

                beforeEach(function () {
                    testView.subs.addConfig('testType', {
                        construct: 'Backbone.View',
                        singleton: false
                    });
                    testView.subs.addConfig('testTypeSingle', {
                        construct: 'Backbone.View',
                        singleton: true
                    });
                    testView.subs.add('testType').add('testType').add('testTypeSingle');
                });

                it('should allow removing subviews by a particular type', function () {
                    testView.subs.remove('testType');
                    expect(testView.subs.get('testType').length).toBeFalsy();
                    testView.subs.remove('testTypeSingle');
                    expect(testView.subs.get('testTypeSingle')).toBeUndefined();
                });

                it('should call the Backbone.View remove method to remove from the dom', function () {
                    var aView = new Backbone.View();
                    spyOn(aView, 'remove');
                    testView.subs.add('anotherTestType', aView);
                    testView.subs.remove('anotherTestType');
                    expect(aView.remove).toHaveBeenCalled();
                });

                it('should remove only elements from the parent when "clearLocations" is used', function () {
                    testView.setup().render().subs.renderAppend();
                    testView.subs.clearLocations();
                    expect(testView.$('thead').children().length).toEqual(0);
                    expect(testView.$('tbody').children().length).toEqual(0);
                });

                it('should allow using a \'clear\' method to remove all subviews at once', function () {
                    var sub1 = testView.subs.at(1);
                    spyOn(sub1, 'remove');
                    testView.subs.clear();
                    expect(sub1.remove).toHaveBeenCalled();
                    expect(testView.subs.subViews.length).toEqual(0);
                    expect(testView.subs.get('testType')).toBeFalsy();
                    expect(testView.subs.get('testTypeSingle')).toBeFalsy();
                });
            });

            describe('Rendering subviews', function () {

                beforeEach(function () {
                    testView.setup().render();
                });

                it('should invoke \'render\' method on all subviews when the SubViewManager "render" method is called without arguments', function () {
                    spyOn(testView.subs.subViews[0], 'render');
                    spyOn(testView.subs.subViews[1], 'render');
                    spyOn(testView.subs.subViews[2], 'render');

                    testView.subs.render();
                    expect(testView.subs.subViews[0].render).toHaveBeenCalled();
                    expect(testView.subs.subViews[1].render).toHaveBeenCalled();
                    expect(testView.subs.subViews[2].render).toHaveBeenCalled();
                });

                it('should append subview "el" elements to their type\'s configured location if "renderAppend" is called without arguments', function () {
                    var headbeforeLen = testView.$('thead').children().length,
                        bodyBeforeLen = testView.$('tbody').children().length;
                    testView.subs.renderAppend();
                    expect(testView.$('thead').children().length).toBeGreaterThan(headbeforeLen);
                    expect(testView.$('thead').children().length).toBe(1);
                    expect(testView.$('tbody').children().length).toBeGreaterThan(bodyBeforeLen);
                    expect(testView.$('tbody').children().length).toBe(testView.collection.length);
                });

                it('should append all subviews to a container found inside the parent view\'s "el" HTMLelement when passing a selector argument', function () {
                    var testClass = 'test-subview-container';
                    testView.$el.append('<div class="' + testClass + '"></div>');
                    testView.subs.renderAppend('.' + testClass);
                    expect(testView.$('.' + testClass).children().length).toBe(testView.subViews.length);
                    expect(testView.subs.first().$el.parent().attr('class')).toBe(testClass);
                });

                it('should render only a specific type to have been rendered when passing a type to "renderByKey"', function () {
                    spyOn(testView.subs.get('headingRow'), 'render');
                    spyOn(testView.subs.get('row')[0], 'render');
                    testView.subs.renderByKey('headingRow');
                    expect(testView.subs.get('headingRow').render).toHaveBeenCalled();
                    expect(testView.subs.get('row')[0].render).not.toHaveBeenCalled();
                });

                it('should allow making \'location\' a function that returns a jQuery instance', function () {
                    testView = new Backbone.BaseView();
                    testView.$el.html('<div class="one"></div><div class="two">');
                    testView.subs.addConfig('testType', {
                        singleton: true,
                        construct: Backbone.BaseView,
                        location : function () {
                            return this.parentView.$('.two');
                        }
                    });
                    testView.subs.add('testType').renderAppend();
                    expect(testView.$('.two').children().length).toBe(1);
                    expect(testView.$('.one').children().length).toBe(0);
                });

            });

            describe('"filteredSubs" method', function () {

                beforeEach(function () {
                    testView.setup();
                });

                it("should return an instance of the SubViewManager", function () {
                    expect(testView.subs.filteredSubs('row') instanceof testView.subs.constructor).toBe(true);
                });
                it("should return instance with subviews that match the type passed as an argument", function () {
                    expect(testView.subs.filteredSubs('headingRow').subViews.length).toBe(1);
                    expect(testView.subs.filteredSubs('headingRow').at(0).getSubViewType()).toBe('headingRow');
                });
                it('should allow passing an array of subviews that will be used to create the new filtered instance', function () {
                    var i = 0,
                        subViews = testView.subs.filter(function (subView) {
                            if (subView.getSubViewType() === 'row') {
                                i++;
                                if (i % 2 === 1) {
                                    return true;
                                }
                            }
                        });
                    expect(testView.subs.filteredSubs(subViews).subViews.length).toBe(2);
                    expect(testView.subs.filteredSubs(subViews).subViews[0].cid).toBe(subViews[0].cid);
                    expect(testView.subs.filteredSubs(subViews).subViews[1].cid).toBe(subViews[1].cid);
                });
            });

            describe('"descend" method', function () {
                var descendView;
                beforeEach(function () {
                    descendView = new Backbone.BaseView();
                    descendView.subs.addConfig({
                        typeA : {
                            construct : Backbone.BaseView.extend({
                                subViewConfig : {
                                    typeAsubTypeA : { construct : 'Backbone.View' }
                                }
                            }),
                            singleton: true
                        },
                        typeB : { construct : 'Backbone.View' }
                    });
                    descendView.subs.add('typeA').add('typeB');
                    descendView.subs.get('typeA').subs.add('typeAsubTypeA').add('typeAsubTypeA');
                });

                it('should call a passed function for every subview and every subview\'s subview', function () {
                    var i = 0,
                        len = descendView.subs.subViews.length +
                            descendView.subs.get('typeA').subs.get('typeAsubTypeA').length;
                    descendView.subs.descend(function () {
                        i++;
                    });
                    expect(i).toEqual(len);
                });

                it('should set the context ("this") to switch to each subview instance', function () {
                    var wasTypeB,
                        wasTypeASubTypeA,
                        typeB = descendView.subs.get('typeB')[0],
                        typeAsubTypeA = descendView.subs.get('typeA').subs.get('typeAsubTypeA')[1];
                    descendView.subs.descend(function () {
                        if (this.cid === typeB.cid) {
                            wasTypeB = true;
                        } else if (this.cid === typeAsubTypeA.cid) {
                            wasTypeASubTypeA = true;
                        }
                    });
                    expect(wasTypeB).toBe(true);
                    expect(wasTypeASubTypeA).toBe(true);
                });

                it('should invoke a method on a subview if a string matching a method name is passed, and do nothing otherwise', function () {
                    var typeB = descendView.subs.get('typeB')[0],
                        typeAsubTypeA = descendView.subs.get('typeA').subs.get('typeAsubTypeA')[1],
                        foo = function () { return 'bar'; };
                    typeB.foo = foo;
                    typeAsubTypeA.foo = foo;
                    spyOn(typeB, 'foo');
                    spyOn(typeAsubTypeA, 'foo');
                    descendView.subs.descend('foo', ['arg']);
                    expect(typeB.foo).toHaveBeenCalledWith('arg');
                    expect(typeAsubTypeA.foo).toHaveBeenCalledWith('arg');
                });
            });

        });

        describe('"bindViewEvents" method', function () {

            it('should listens for events on backbone objects based on object literal key', function () {
                var calledEventA = false,
                    calledEventB = false,
                    eventAArg;
                testView.foo = function (arg) {
                    calledEventA = this;
                    eventAArg = arg;
                };
                testView.bindViewEvents({
                    'eventA collection': 'foo',
                    'eventB' : function () {
                        calledEventB = this;
                    }
                });
                testView.collection.trigger('eventA', 'test-arg');
                testView.trigger('eventB');
                expect(calledEventA.cid).toBe(testView.cid);
                expect(eventAArg).toBe('test-arg');
                expect(calledEventB.cid).toBe(testView.cid);
            });

            it('should bind backbone events on prototype in "viewEvents" property', function () {
                var calledFooWith,
                    calledBar = false,
                    calledBaz = false,
                    EventViewA = Backbone.BaseView.extend({
                        viewEvents: {
                            foo: function (arg) { calledFooWith = arg; }
                        }
                    }),
                    EventViewB = Backbone.BaseView.extend({
                        viewEvents: {
                            baz: 'baz'
                        },
                        baz: function () { calledBaz = true; },
                        bar: function () { calledBar = true; }
                    }),
                    viewA = new EventViewA(),
                    viewB = new EventViewB({
                        viewEvents: function () {
                            return { bar: 'bar' };
                        }
                    });
                viewA.trigger('foo', 'test-arg');
                viewB.trigger('bar').trigger('baz');
                expect(calledFooWith).toBe('test-arg');
                expect(calledBar).toBe(true);
                expect(calledBaz).toBeFalsy();
            });

            it('should be called on instantiation and bind events if present in options', function () {
                var calledEvent = false,
                    view = new Backbone.BaseView({
                        viewEvents: function () {
                            return {
                                testEvent : function () {
                                    calledEvent = this;
                                }
                            };
                        }
                    });
                view.trigger('testEvent');
                expect(calledEvent.cid).toBe(view.cid);
            });

        });

        it('should have a parentView property that\'s a reference to the View instance that it is a subview of', function () {
            testView.setup();
            expect(testView.subs.get('headingRow').parentView.cid).toBe(testView.cid);
            expect(testView.subs.get('row')[0].subs.subViews[0].parentView.cid).toBe(testView.subs.get('row')[0].cid);
            expect(testView.parentView).toBeFalsy();
        });

        describe('Backbone events view heirarchy cascading', function () {
            var topView, cView;
            beforeEach(function () {
                topView = new Backbone.BaseView();
                cView = new Backbone.BaseView();
                topView.subs
                    .add('a', new Backbone.BaseView(), true)
                    .last().subs
                    .add('b', new Backbone.BaseView())
                    .last().subs
                    .add('c', cView);
            });

            describe('"triggerBubble" method', function () {

                it('should trigger an event the view it\'s ancestors', function () {
                    var triggeredOnTopViewWith,
                        triggeredOnA,
                        triggeredOnB,
                        triggeredOnC;

                    cView.on('foo', function () { triggeredOnC = true; });
                    cView.parentView.on('foo', function () { triggeredOnB = true; });
                    topView.subs.get('a').on('foo', function () { triggeredOnA = true; });
                    topView.on('foo', function (arg) {
                        triggeredOnTopViewWith = arg;
                    });
                    cView.triggerBubble('foo', 'test-arg');
                    expect(triggeredOnC).toBe(true);
                    expect(triggeredOnB).toBe(true);
                    expect(triggeredOnA).toBe(true);
                    expect(triggeredOnTopViewWith).toBe('test-arg');
                });

                it('should pass the originating view as the last argument to the callback', function () {
                    var originatingView,
                        triggeredWith;
                    topView.on('foo', function (firstArg, view) {
                        triggeredWith = firstArg;
                        originatingView = view;
                    });
                    cView.triggerBubble('foo', 'test-arg');
                    expect(triggeredWith).toBe('test-arg');
                    expect(originatingView.cid).toBe(cView.cid);
                });

                it('should allow stopping the event bubble by calling stopEvent method in an event callback', function () {
                    var triggeredOnTopView = false,
                        triggeredOnA = false;
                    topView.on('foo', function () {
                        triggeredOnTopView = true;
                    });
                    topView.subs.get('a').on('foo', function () {
                        triggeredOnA = true;
                        this.stopEvent('foo');
                    });
                    cView.triggerBubble('foo');
                    expect(triggeredOnA).toBe(true);
                    expect(triggeredOnTopView).toBe(false);
                });
            });

            describe('"triggerDescend" method', function () {
                it('should trigger an event all a view\'s subviews, and their subviews, and so on', function () {
                    var firedOnTopView = false, firedOnA = false, firedOnB = false, firedOnCWith, origView;
                    topView.on('foo', function () { firedOnTopView = true; });
                    topView.subs.get('a').on('foo', function () { firedOnA = true; });
                    topView.subs.get('a').subs.get('b')[0].on('foo', function () { firedOnB = true; });
                    topView.subs.get('a').subs.get('b')[0].subs.get('c')[0].on('foo', function (arg, view) {
                        firedOnCWith = arg;
                        origView = view;
                    });
                    topView.triggerDescend('foo', 'test-arg');
                    expect(firedOnTopView).toBe(true);
                    expect(firedOnA).toBe(true);
                    expect(firedOnB).toBe(true);
                    expect(firedOnCWith).toBe('test-arg');
                    expect(origView.cid).toBe(topView.cid);
                });
                it('should allow a subview to stop an event descending down it\'s tree with "stopEvent" method', function () {
                    topView.subs.add('altA', new Backbone.BaseView());
                    var firedOnAltA = false, firedOnB = false, firedOnC = false;
                    topView.subs.get('a').subs.get('b')[0].on('foo', function () {
                        firedOnB = true;
                        this.stopEvent('foo');
                    });
                    cView.on('foo', function () {
                        firedOnC = true;
                    });
                    topView.subs.get('altA')[0].on('foo', function () {
                        firedOnAltA = true;
                    });
                    topView.triggerDescend('foo');
                    expect(firedOnB).toBe(true);
                    expect(firedOnAltA).toBe(true);
                    expect(firedOnC).toBe(false);
                });
            });
        });



    });
}(this, jQuery, Backbone, _));