/**
 * 
 */

//during deployment, this is what decides what gets instantiated, should be moved elsewhere
require('./selectors/keyboard-selector.js');
require('./selectors/mouse-selector.js');
require('./drawers/xpath-drawer.js');
require('./viewers/sidebar.js');
require('./viewers/floatingviewer.js');
require('./plugins/hx-summernote-plugin.js');
require('./plugins/hx-simpletags-plugin.js');
require('./plugins/hx-dropdowntags-plugin.js');
require('./plugins/hx-colortags-plugin.js');
require('./plugins/hx-reply.js');
require('./storage/catchpy.js');

(function($) {

    /**
     * { function_description }
     *
     * @class      TextTarget (name)
     * @param      {<type>}  options  The options
     * @param      {<type>}  inst_id  The instance identifier
     */
    $.TextTarget = function(options, inst_id) {
        this.options = options;
        this.instance_id = inst_id;
        this.guid = undefined;
        this.annotation_selector = 'hx-annotation-hl';
        this.init();
    };

    /**
     * { function_description }
     */
    $.TextTarget.prototype.init = function () {
        var self = this;
        // this target is only meant to work with text/html objects
        this.media = "text";

        // this where the target will be contained
        this.target_selector = this.options.target_selector;

        // sets up listeners from core and other places
        this.setUpListeners();

        if (this.options.method == "url") {
            // if the text exists externally, this will load it into the DOM
            this.makeQuery(this.options.object_source, this.createTextSlotFromURL.bind(this), this.target_selector)
        } else if (this.options.method == "inline") {
            // if the text is already in the DOM, this sets up what is left
            this.createTextSlotFromSelector(this.options.object_source, this.instance_id);
        }
    };

    /**
     * Creates a text slot from url.
     *
     * @param      {string}  content      The content
     * @param      {<type>}  selector     The selector
     * @param      {<type>}  instance_id  The instance identifier
     */
    $.TextTarget.prototype.createTextSlotFromURL = function(content, selector, instance_id) {
        this.guid = Hxighlighter.getUniqueId();

        // each annotation target will be enclosed in a "slot"
        var slot = "<div class='annotation-slot' id='" + this.guid + "'>" + content + "</div>";
        
        // adds it to the page and turns on the wrapper
        jQuery(selector).append(slot);
        jQuery('.annotations-section').addClass('annotator-wrapper').removeClass('annotations-section');        
        
        // lets Core know that the target has finished loading on screen
        Hxighlighter.publishEvent('targetLoaded', instance_id, [jQuery('#' + this.guid)]);
    };

    /**
     * Creates a text slot from selector.
     *
     * @param      {<type>}  selector     The selector
     * @param      {<type>}  instance_id  The instance identifier
     */
    $.TextTarget.prototype.createTextSlotFromSelector = function(selector, instance_id) {
        
        // each annotation target will be enclosed in a "slot" with a temporary unique id
        this.guid = Hxighlighter.getUniqueId();
        var slot = jQuery(selector);
        slot.addClass('annotation-slot');
        slot.attr('id', this.guid);
        jQuery('.annotations-section').addClass('annotator-wrapper').removeClass('annotations-section');
        
        // lets core know that the target has finished loading on screen
        Hxighlighter.publishEvent('targetLoaded', instance_id, [jQuery('#' + this.guid)]);
    };

    /**
     * Makes a query.
     *
     * @param      {<type>}    url       The url
     * @param      {Function}  callback  The callback
     * @param      {<type>}    selector  The selector
     * @return     {<type>}    { description_of_the_return_value }
     */
    $.TextTarget.prototype.makeQuery = function(url, callback, selector) {
        var self= this;
        
        // retrieves the text to be loaded onto the page and passes it to callback function
        var defer = jQuery.ajax({
            url: url,
            type: 'GET',
            contentType: 'charset=utf-8',
            success: function(data) {
                callback(data, selector, self.instance_id);
            },
            async: true
        });
        return defer;
    };

    /**
     * { function_description }
     */
    $.TextTarget.prototype.setUpListeners = function() {
        var self = this;
        
        // once the target has been loaded, the selector can be instantiated
        Hxighlighter.subscribeEvent('targetLoaded', self.instance_id, function(_, element) {
            //annotation element gets data that may be needed later
            self.element = element;
            self.element.data('source_type', self.options.object_source);
            self.element.data('source_type', 'text');

            // finish setting up selectors
            self.setUpSelectors(self.element[0]);
            self.setUpDrawers(self.element[0]);

            // finish setting up viewers (which contain displays and editors)
            self.setUpViewers(self.element[0]);

            // finish setting up extra plugins
            self.setUpPlugins(self.element[0]);

            // finish setting up the storage containers
            self.setUpStorage(self.element[0]);
        });

        Hxighlighter.subscribeEvent('editorShown', self.instance_id, function(_, editor, annotation) {
            jQuery.each(self.plugins, function(_, plugin) {
                if (typeof(plugin.editorShown) === "function") {
                    plugin.editorShown(editor, annotation);
                }
            });
        });

        Hxighlighter.subscribeEvent('displayShown', self.instance_id, function(_, display, annotations) {
            jQuery.each(self.plugins, function(_, plugin) {
                if (typeof(plugin.displayShown) === "function") {
                    plugin.displayShown(display, annotations);
                }
            });
        });
    };


    /**
     * { function_description }
     *
     * @param      {<type>}  element  The element
     */
    $.TextTarget.prototype.setUpSelectors = function(element) {
        var self = this;
        self.selectors = [];
        jQuery.each(Hxighlighter.selectors, function(_, selector) {
            self.selectors.push(new selector(element, self.instance_id, {'confirm': true}));
        });
    }

    /**
     * { function_description }
     *
     * @param      {<type>}  element  The element
     */
    $.TextTarget.prototype.setUpDrawers = function(element) {
        var self = this;
        self.drawers = [];
        jQuery.each(Hxighlighter.drawers, function(_, drawer) {
            self.drawers.push(new drawer(element, self.instance_id, self.annotation_selector));
        });
    }

    $.TextTarget.prototype.setUpViewers = function(element) {
        var self = this;
        self.viewers = [];
        console.log(self.options);
        jQuery.each(Hxighlighter.viewers, function(_, viewer) {
            self.viewers.push(new viewer({
                element: element,
                template_urls: self.options.template_urls,
                viewer_options: self.options.viewerOptions,
                username: self.options.username,
                instructors: self.options.instructors
            }, self.instance_id));
        });
    };

    $.TextTarget.prototype.setUpPlugins = function(element) {
        var self = this;
        self.plugins = [];
        jQuery.each(Hxighlighter.plugins, function(_, plugin) {
            var optionsForPlugin;
            try {
                optionsForPlugin = jQuery.extend({}, self.options, self.options[plugin.name]) || {};
            } catch (e) {
                optionsForPlugin = {};
            }

            self.plugins.push(new plugin( optionsForPlugin, self.instance_id));
        });
    };

    $.TextTarget.prototype.setUpStorage = function(element, options) {
        var self = this;
        self.storage = [];
        jQuery.each(Hxighlighter.storage, function(idx, storage) {
            var optionsForStorage;
            try {
                optionsForStorage = jQuery.extend({}, self.options, self.options[storage.name]) || {};
            } catch (e) {
                optionsForStorage = {};
            }
            self.storage.push(new storage(optionsForStorage, self.instance_id));
            self.storage[idx].onLoad(element, options);
        });
    };

    /**
     * { function_description }
     *
     * @class      ComponentEnable (name)
     */
    $.TextTarget.prototype.ComponentEnable = function() {
        // Targets cannot technically be enabled/disabled, but 
        // there might be cases in which the target needs to be hidden/shown
      
        jQuery('#' + this.guid).show();  

    };

    /**
     * { function_description }
     *
     * @class      ComponentDisable (name)
     */
    $.TextTarget.prototype.ComponentDisable = function() {
        jQuery('#') + this.guid.hide();
    };

    /**
     * { function_description }
     *
     * @class      TargetSelectionMade (name)
     */
    $.TextTarget.prototype.TargetSelectionMade = function(range, event) {
        var range = Array.isArray(range) ? range[0] : range;
        var self = this;
        var annotation = {
            annotationText: [""],
            ranges: [range],
            id: $.getUniqueId(),
            exact: $.getQuoteFromHighlights([range]).exact,
            media: "text",
            totalReplies: 0,
            creator: {
                name: self.options.username,
                id: self.options.user_id
            }
        };
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.TargetSelectionMade(annotation, event);
        });
        self.TargetAnnotationDraw(annotation);

        // jQuery('.annotator-wrapper')[0].focus();

        //$.publishEvent('ViewerEditorOpen', self.instance_id, [annotation]);
    };

    /**
     * { function_description }
     *
     * @class      TargetAnnotationDraw (name)
     */
    $.TextTarget.prototype.TargetAnnotationDraw = function(annotation) {
        var self = this;
        jQuery.each(self.drawers, function(_, drawer) {
            drawer.draw(annotation);
        });
        jQuery.each(self.viewers, function(_, viewer) {
            if ($.exists(viewer.TargetAnnotationDraw)) {
                viewer.TargetAnnotationDraw(annotation);
            }
        });
        jQuery.each(self.plugins, function(_, plugin) {
            if ($.exists(plugin.TargetAnnotationDraw)) {
                plugin.TargetAnnotationDraw(annotation);
            }
        });
    };

    /**
     * { function_description }
     *
     * @class      TargetAnnotationUndraw (name)
     */
    $.TextTarget.prototype.TargetAnnotationUndraw = function(annotation) {
        var self = this;
        jQuery.each(self.drawers, function(_, drawer) {
            drawer.undraw(annotation);
        });
    };

    /**
     * { function_description }
     *
     * @class      ViewerEditorOpen (name)
     */
    $.TextTarget.prototype.ViewerEditorOpen = function(annotation) {
        return annotation;
    };

    /**
     * { function_description }
     *
     * @class      ViewerEditorClose (name)
     */
    $.TextTarget.prototype.ViewerEditorClose = function(annotation, redraw, should_erase) {
        var self = this;
        
        if (should_erase) {
            self.TargetAnnotationUndraw(annotation);
        } else {
            annotation = self.plugins.reduce(function(ann, plugin) { return plugin.saving(ann); }, annotation);
            jQuery.each(self.storage, function(_, store) {
                store.StorageAnnotationSave(annotation, self.element, redraw);
            });
            $.publishEvent('StorageAnnotationSave', self.instance_id, [annotation, redraw]);
        }

        jQuery.each(self.viewers, function(_, viewer) {
            viewer.ViewerEditorClose(annotation, event);
        });
        if (redraw) {
            jQuery.each(self.drawers, function(_, drawer) {
                self.TargetAnnotationUndraw(annotation);
                $.publishEvent('TargetAnnotationDraw', self.instance_id, [annotation]);
                // jQuery.each(self.storage, function(_, store) {
                //     store.StorageAnnotationUpdate(annotation, self.element);
                // })
                // $.publishEvent('StorageAnnotationUpdate', self.instance_id, [annotation, redraw]);
                //drawer.redraw(annotation);
            });
        }

        return annotation;
    };

    /**
     * { function_description }
     *
     * @class      ViewerDisplayOpen (name)
     */
    $.TextTarget.prototype.ViewerDisplayOpen = function(annotations) {
        var self = this;
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.ViewerDisplayOpen(annotations, event);
        });
        return annotations;
    };

    /**
     * { function_description }
     *
     * @class      ViewerDisplayClose (name)
     */
    $.TextTarget.prototype.ViewerDisplayClose = function(annotations) {
        var self = this;
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.ViewerDisplayClose(annotations, event);
        });
        return annotations;
    };
    
    /**
     * { function_description }
     *
     * @class      StorageAnnotationSave (name)
     */
    $.TextTarget.prototype.StorageAnnotationSave = function(annotations) {
        var self = this;
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.StorageAnnotationSave(annotations, event);
        });
    };

    /**
     * { function_description }
     *
     * @class      StorageAnnotationLoad (name)
     */
    $.TextTarget.prototype.StorageAnnotationLoad = function() {

    };

    /**
     * { function_description }
     *
     * @class      StorageAnnotationEdit (name)
     */
    $.TextTarget.prototype.StorageAnnotationEdit = function() {

    };

    /**
     * { function_description }
     *
     * @class      StorageAnnotationDelete (name)
     */
    $.TextTarget.prototype.StorageAnnotationDelete = function(annotation) {
        var self = this;
        jQuery.each(self.viewers, function(_, viewer) {
            viewer.StorageAnnotationDelete();
        });
        jQuery.each(self.storage, function(_, store) {
            store.StorageAnnotationDelete(annotation);
        });
    };

    /**
     * { function_description }
     *
     * @class      StorageAnnotationGetReplies (name)
     */
    $.TextTarget.prototype.StorageAnnotationGetReplies = function() {

    };
}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));
