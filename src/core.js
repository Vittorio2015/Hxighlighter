/**
 * 
 */

(function($) {

    $.Core = function(options, inst_id) {
        
        // options and instance ids are saved
        this.options = options;
        this.instance_id = inst_id;

        // keeps track of viewer/plugin modules for UI
        this.viewers = [];
        this.plugins = [];

        // keeps track of annotations and storage modules for backend
        this.annotations = [];
        this.storage = [];

        // initializes tool
        this.init(this.options.mediaType);
    };

    $.Core.prototype.init = function() {
        this.setUpViewers();
        this.setUpListeners();
        this.setUpStorage();
        this.setUpPlugins();
    };

    $.Core.prototype.setUpListeners = function() {
        var self = this;
        hxSubscribe('targetLoaded', self.instance_id, function(_, element) {
            // store element that contains target for easy retrieval
            self.element = element;
            jQuery.each(self.viewers, function(_, viewer) {
                viewer.element = element;
            });

            if (self.options.should_highlight) {
                self.initHighlighter();
                hxSubscribe('shouldHighlight', self.instance_id, function(_, annotation) {
                    self.highlighter.draw(annotation);
                    self.annotationDrawn(annotation);
                });

                hxSubscribe('shouldUpdateHighlight', self.instance_id, function(_, annotation) {
                    self.highlighter.redraw(annotation);
                    self.annotationDrawn(annotation);
                });

                hxSubscribe('shouldDeleteHighlight', self.instance_id, function(_, annotation) {
                    self.highlighter.undraw(annotation);
                    self.annotationRemoved(annotation);
                });

                hxPublish('finishedHighlighterSetup', self.instance_id, []);
            }
        });

        hxSubscribe('selectAnnotation', self.instance_id, function(_, annotation) {
            self.selectedAnnotation = annotation;
        });

        hxSubscribe('editorShown', self.instance_id, function(_, editor, annotation) {
            self.editorShown(annotation, editor);
        });

        hxSubscribe('saveAnnotation', self.instance_id, function(_, annotation, text, isNew) {
            var updatedAnnotation = annotation;
            
            // all plugins have a chance to update the annotation before saving
            jQuery.each(self.plugins, function(_, plug) {
                updatedAnnotation = jQuery.extend({}, plug.saving(updatedAnnotation));
            });

            jQuery.each(self.storage, function(_, st) {
                st.saveAnnotation(updatedAnnotation, self.element);
            });

            hxPublish('shouldUpdateHighlight', self.instance_id, [updatedAnnotation]);
        });

        hxSubscribe('viewerShown', self.instance_id, function(_, viewer) {
            self.viewerShown(viewer);
        });

        hxSubscribe('deleteAnnotationById', self.instance_id, function(_, ann_id) {
            var found = self.getAnnotationById(ann_id);
            if (found) {
                hxPublish('shouldDeleteHighlight', self.instance_id, [found.annotation]);
                jQuery.each(self.storage, function(_, st) {
                    st.deleteAnnotation(found, self.element);
                });
            }
        });
    };

    $.Core.prototype.setUpViewers = function() {
        var self = this;
        var viewer;
        if (self.options.viewers.indexOf('floating') >= 0) {
            viewer = new Hxighlighter.FloatingViewer(self.options, self.instance_id);
            self.viewers.push(viewer);
        }

        if (self.options.viewers.indexOf('sidebar') >= 0) {
            viewer = new Hxighlighter.Sidebar(self.options, self.instance_id);
            self.viewers.push(viewer);
        }
    };

    $.Core.prototype.setUpStorage = function() {
        var self = this;
        if (self.options.storageOptions.backend.indexOf('catchpy') > -1) {
            // hxLogging('Connecting to external catchpy database');
            self.storage.push(new Hxighlighter.CatchPy(self.options, self.instance_id));
        }
        if (self.options.storageOptions.backend.indexOf('backup') > -1) {
            // hxLogging('Setting up backup feature using browser localStorage');
            // var backup1 = new Hxighlighter.Backup(self.options.storageOptions, self.instance_id);
        }
        if (self.options.storageOptions.backend.indexOf('local') > -1) {
            // hxLogging('Setting up temporary storage, usually reserved for demos or exporting');
            self.storage.push(new Hxighlighter.Local(self.options, self.instance_id));
        }

        hxSubscribe('finishedHighlighterSetup', self.instance_id, function(_) {
            var all_annotations = [];
            jQuery.each(self.storage, function(_, store) {
                var anns = store.onLoad() || [];
                jQuery.each(anns, function(_, ann) {
                    hxPublish('shouldHighlight', self.instance_id, [ann]);
                });
                all_annotations = all_annotations.concat(anns);
            });

            jQuery.each(self.viewers, function(_, viewer) {
                if (viewer.onLoad) {
                    viewer.onLoad(all_annotations);
                }
            });
        });
    };

    $.Core.prototype.setUpPlugins = function() {
        var self = this;
        if (typeof self.options.plugins !== undefined) {
            jQuery.each(self.options.plugins, function(pluginName, pluginOptions) {
                if (typeof window[pluginName] === "function") {
                    var plugin = new window[pluginName](pluginOptions, self.instance_id);
                    plugin.annotationListeners();
                    self.plugins.push(plugin);
                } else {
                    // hxLogging('Plugin "' + pluginName + '" was not loaded. Make sure the JavaScript and CSS files are included in this page.', 'error');
                }
            });
        }
    };

    $.Core.prototype.annotationDrawn = function(annotation) {
        var self = this;
        jQuery.each(self.plugins, function (_, plug) {
            if (typeof plug.annotationDrawn === "function") {
                plug.annotationDrawn(annotation);
            }
        });

        var ann_id = annotation.id;
        var found = self.getAnnotationById(ann_id);
        if (found) {
            self.annotations.splice(found.index, 1);
        }
        self.annotations.push(annotation);
        
    };

    $.Core.prototype.annotationRemoved = function(annotation) {
        var self = this;
        var ann_id = annotation.id;
        self.removeAnnotationById(ann_id);
    };

    $.Core.prototype.getAnnotationById = function(ann_id) {
        var self = this;
        var found = undefined;
        jQuery.each(self.annotations, function(index, ann) {
            if (ann.id == ann_id) {
                found = {
                    index: index,
                    annotation: ann
                };
            }
        });

        return found;
    };

    $.Core.prototype.removeAnnotationById = function(ann_id) {
        var self = this;

        self.annotations = self.annotations.filter(function(ann) {
            return ann.id !== ann_id;
        });
    };

    $.Core.prototype.editorShown = function(annotation, editor) {
        
        var self = this;
        jQuery.each(self.plugins, function (_, plug) {
            if (typeof plug.editorShown === "function") {
                plug.editorShown(annotation, editor);
            }
        });
    };

    $.Core.prototype.viewerShown = function(annotation, editor) {
        
        var self = this;
        jQuery.each(self.plugins, function (_, plug) {
            if (typeof plug.viewerShown === "function") {
                plug.viewerShown(annotation, editor);
            }
        });
    };

    $.Core.prototype.initHighlighter = function() {
        var self = this;

        self.highlighter = new annotator.ui.highlighter.Highlighter(self.element[0]);

        var highlightTogglers = {
            'mouseover': 'show',
            'mouseleave': 'hide',
            'click': 'toggle'
        };

        jQuery.each(highlightTogglers, function(eventType, value) {
            self.element.on(eventType, '.annotator-hl', function(event) {
                var annotations = self.getAnnotationsFromElement(event);
                hxPublish('toggleViewer', self.instance_id, [event, value, annotations]);
            });
        });
    };

    $.Core.prototype.getAnnotationsFromElement = function(event) {
        return jQuery(event.target).parents('.annotator-hl').addBack().map(function(_, elem) {
            return jQuery(elem).data('annotation');
        }).toArray();
    };

}(Hxighlighter));