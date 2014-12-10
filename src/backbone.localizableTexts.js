$(function() {
    var LocalizableModel = Backbone.Model.extend({
        mutators: function() {
            if (!this.localizableAttributes) {
                return {};
            }

            return _.reduce(this.localizableAttributes, function(mutators, attr) {
                mutators[attr] = _.bind(function(mutator, key, value, options) {
                    if (key){
                        this.serializeLocalizable(attr, value, mutator);
                        return;
                    }

                    return this.deserializeLocalizable(attr, mutator);
                }, this);

                return mutators;
            }, {}, this);
        },

        deserializeLocalizable: function(attr, get) {
            var v = this.attributes[attr] || {};

            if (!this.defaultLocale) {
                throw new Error("Please assign a default locale");
            }

            if (!_.isUndefined(v[this.locale])) {
                return v[this.locale];
            }
            if (!_.isUndefined(v[this.defaultLocale])) {
                return v[this.defaultLocale];
            }

            return '';
        },

        serializeLocalizable: function(attr, value, set) {
            var v = {};

            if (!this.defaultLocale) {
                throw new Error("Please assign a default locale");
            }

            v[this.locale || this.defaultLocale] = value;
            set(attr, _.defaults(v, this.attributes[attr] || {}));
        },

        setLocale: function(locale) {
            this.locale = locale;
            this.trigger('change', this);
        },

        getLocale: function() {
            return this.locale;
        },

        setForLocale: function(attributes, locale) {
            this.locale = locale;
            this.set(attributes);
        }
    });

    var Book = LocalizableModel.extend({
        defaultLocale: 'es',

        localizableAttributes: [
            'title',
            'description',
            'other'
        ],

        defaults: {
            title: "Hola mundo!",
            description: "Ejemplo",
            other: "Awesome"
        }
    });

    var FormView = Backbone.View.extend({
        tmpl: $("#form-template").html(),

        events: {
            "click .locale-btn": "toggleLocale",
            "click #save-btn": "save",
            "click #save-all-locales-btn": "saveAllLocales"
        },

        initialize: function(options) {
            this.listenTo(this.model, 'change', this.render);
        },

        render: function() {
            this.$el.html(_.template(this.tmpl, this.model.toData()));
            return this;
        },

        save: function(event) {
            var title = this.$("input[name='title']").val();
            var description = this.$("input[name='description']").val();
            var other = this.$("input[name='other']").val();

            event.preventDefault();

            this.model.set({
                title: title,
                description: description,
                other: other
            });
        },

        saveAllLocales: function(event) {
            var title = this.$("input[name='title']").val();
            var description = this.$("input[name='description']").val();
            var other = this.$("input[name='other']").val();

            event.preventDefault();

            _.each(['es', 'en', 'fr'], function(locale) {
                this.model.setForLocale({
                    title: title,
                    description: description,
                    other: other
                }, locale);
            }, this);
        },

        toggleLocale: function(event) {
            var locale = $(event.currentTarget).data('locale');

            this.model.setLocale(locale);
            event.preventDefault();
        }
    });

    var InspectView = Backbone.View.extend({
        initialize: function(options) {
            this.listenTo(this.model, 'change', this.render);
        },

        render: function() {
            var json = JSON.stringify(this.model.toJSON(), undefined, 2);

            this.$el.html("<pre>" + json + "</pre>");
            return this;
        },
    });

    var book = new Book();
    var formView = new FormView({
        el: $("#form"),
        model: book
    });
    var inspectView = new InspectView({
        el: $("#inspect"),
        model: book
    });

    formView.render();
    inspectView.render();
});