var hrange = require('../h-range.js');
(function($) {
    $.KeyboardSelector = function(element, inst_id) {
        this.element = element;
        if (!jQuery(element).hasClass('annotator-wrapper')) {
            this.element = jQuery(element).find('.annotator-wrapper');
        }
        this.instance_id = inst_id;
        this.delimiter_list = ['*', '+', '#', '^'];
        this.keyMaps = {
            'BACKSPACE': 8,
            'TAB': 9,
            'ENTER': 13,
            'SHIFT': 16,
            'CTRL': 17,
            'ALT': 18,
            'ESC': 27,
            'SPACE': 32,
            'LEFT': 37,
            'UP': 38,
            'RIGHT': 39,
            'DOWN': 40,
            'DELETE': 46,
            'MULTIPLY': 106,
            'ADD': 107,
            'PIPE': 220,
            '*': 56,
            '+': 187,
            'HOME': 36,
            'END': 35
        };
        this.init();
    };

    $.KeyboardSelector.prototype.init = function() {
        var self = this;
        this.delimiter = this.checkDelimiter(self.element);
        if (!this.delimiter) {
            console.log('Error in delimiter...no suitable delimiter found!');
        }
        this.start = undefined;

        this.setUpButton();
    };

    $.KeyboardSelector.prototype.checkDelimiter = function(element) {
        var textSearch = jQuery(element).text();
        for (var i = 0; i < this.delimiter_list.length; i++) {
            var testDelimiter = this.delimiter_list[i];
            if (textSearch.indexOf(testDelimiter) == -1) {
                return testDelimiter;
            }
        }
        return undefined;
    };

    $.KeyboardSelector.prototype.setUpButton = function() {
        var self = this;
        jQuery(document).on('keydown', function(event){
            if ((event.key == 'å' || event.key == 'a') && event.altKey && event.ctrlKey) {
                //move this to external button
                if(!event.target.isContentEditable && !jQuery(event.target).hasClass('form-control')){
                    self.turnSelectionModeOn();
                }
            } else if (event.key == 'Escape') {
                self.turnSelectionModeOff();
            // } else if (event.key == ' ') {
            //     event.preventDefault();
            //     return false;
            }
        });
        jQuery(document).on('keyup', '*[role="button"]', function(evt) {
            if (evt.key == 'Enter' || evt.key == ' ') {
                jQuery(evt.currentTarget).click();
                return $.pauseEvent(evt);;
            }
        });
        jQuery(document).on('click', 'button[class*="keyboard-toggle"]', function(evt) {
            if (jQuery(this).hasClass('selection-mode-on')) {
                self.turnSelectionModeOff();
                jQuery(this).removeClass('selection-mode-on');
            } else {
                self.turnSelectionModeOn();
                jQuery(this).addClass('selection-mode-on');
            }
        });
    };

    $.KeyboardSelector.prototype.turnSelectionModeOn = function () {
        this.saveHTML = this.element.innerHTML;
        var toggleButton = jQuery(this.element).parent().find('.hx-toggle-annotations');
        if (!toggleButton.hasClass('should-show')) {
            toggleButton.click();
        }
        jQuery(this.element).attr('contenteditable', 'true');
        jQuery(this.element).attr('role', 'textbox');
        jQuery(this.element).attr('tabindex', "0");
        jQuery(this.element).attr('aria-multiline', 'true');
        jQuery(this.element).attr('accesskey', 't');
        jQuery('.hx-selector-img').remove();
        jQuery(this.element).on('keydown', jQuery.proxy(this.filterKeys, this));
        jQuery(this.element).on('keyup', jQuery.proxy(this.setSelection, this));
        this.start = undefined;
        this.currentSelection = undefined;
        this.element.innerHTML = this.saveHTML;
        this.element.focus();
    };

    $.KeyboardSelector.prototype.turnSelectionModeOff = function() {
        var toggleButton = jQuery(this.element).parent().find('.hx-toggle-annotations');
        if (toggleButton.hasClass('should-show')) {
            toggleButton.click();
        }
        jQuery(this.element).off('keydown');
        jQuery(this.element).off('keyup');
        jQuery(this.element).attr('contenteditable', 'false');
        jQuery(this.element).attr('role', '');
        jQuery(this.element).attr('tabindex', '');
        jQuery(this.element).attr('aria-multiline', 'false');
        jQuery(this.element).attr('outline', '0px');
        jQuery('.hx-selector-img').remove();
        this.start = undefined;
        this.currentSelection = undefined;
        this.element.focus();
    };

    /* Credit to Rich Caloggero
     * https://github.com/RichCaloggero/annotator/blob/master/annotator.html
     */
    $.KeyboardSelector.prototype.filterKeys = function(keyPressed) {
        var self = this;
        const key = keyPressed.key;
        switch (key) {
            case self.delimiter:
                return false;
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
            case "Home":
            case "End":
            case "Tab":
                return true;
            case "Backspace":
                if (self.verifyBackspace()) {
                    self.start = undefined;
                    return true;
                }
            default: keyPressed.preventDefault();
                return false;
            } // switch
    };

    $.KeyboardSelector.prototype.setSelection = function(keyPressed) {
        var self = this;
        const key = keyPressed.key;
        switch (key) {
            case self.delimiter:
                if (!(self.start) || typeof(self.start) == "undefined") {
                    self.start = self.copySelection(getSelection());
                    console.log($.mouseFixedPositionFromRange(self.start), self.start.getBoundingClientRect(), jQuery(window).scrollTop());
                    jQuery('body').append('<div class="hx-selector-img"></div>');
                    jQuery('.hx-selector-img').css({
                        top: self.start.getBoundingClientRect().top + jQuery(window).scrollTop() - 5,
                        left: self.start.getBoundingClientRect().left - 5
                    });
                } else {
                    var end = self.copySelection(getSelection());
                    jQuery('.hx-selector-img').remove();
                    console.log("Found end", end);
                    if (self.currentSelection) {
                        console.log(hrange.serializeRange(self.currentSelection, self.element, 'annotator-hl'), self.currentSelection.toString());
                        
                    } else {
                        var end = self.copySelection(getSelection())
                        var posStart = hrange.getGlobalOffset(self.start, self.element, 'annotator-hl');
                        var posEnd = hrange.getGlobalOffset(end, self.element, 'annotator-hl');
                        var boundingBox = undefined;
                        self.currentSelection = document.createRange();
                        if(posStart.startOffset < posEnd.startOffset) {
                            self.currentSelection.setStart(self.start.startContainer, self.start.startOffset);
                            self.currentSelection.setEnd(end.startContainer, end.startOffset);
                        } else {
                            self.currentSelection.setStart(end.startContainer, end.startOffset);
                            self.currentSelection.setEnd(self.start.startContainer, self.start.startOffset);
                        }
                    }
                    boundingBox = {
                        top: self.currentSelection.getBoundingClientRect().top + jQuery(window).scrollTop() - 5,
                        left: self.currentSelection.getBoundingClientRect().left - 5
                    }
                    console.log(boundingBox)
                    Hxighlighter.publishEvent('TargetSelectionMade', self.instance_id, [self.element, [hrange.serializeRange(self.currentSelection, self.element, 'annotator-hl')], boundingBox]);
                    self.element.blur();
                    self.turnSelectionModeOff();
                    // var startComesAfter = self.startComesAfter(self.start, end);
                    // console.log("Found other", startComesAfter);
                    // self.start = startComesAfter[0];
                    // self.processSelection(startComesAfter[0], startComesAfter[1]);
                }
                break;
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
                if (self.start) {
                    var end = self.copySelection(getSelection())
                    var posStart = hrange.getGlobalOffset(self.start, self.element, 'annotator-hl');
                    var posEnd = hrange.getGlobalOffset(end, self.element, 'annotator-hl')
                    self.currentSelection = document.createRange();
                    if(posStart.startOffset < posEnd.startOffset) {
                        self.currentSelection.setStart(self.start.startContainer, self.start.startOffset);
                        self.currentSelection.setEnd(end.startContainer, end.startOffset);
                    } else {
                        self.currentSelection.setStart(end.startContainer, end.startOffset);
                        self.currentSelection.setEnd(self.start.startContainer, self.start.startOffset);
                    }
                    // console.log(self.start, end);
                    // console.log(self.currentSelection, self.currentSelection.toString());
                    // var sel = window.getSelection();
                    // sel.removeAllRanges();
                    // sel.addRange(self.currentSelection);
                }
        }
    };

    $.KeyboardSelector.prototype.copySelection = function(selection) {
        // const sel = {
        //     anchorNode: selection.anchorNode,
        //     anchorOffset: selection.anchorOffset,
        //     focusNode: selection.focusNode,
        //     focusOffset: selection.focusOffset,
        //     parentElement: selection.anchorNode.parentElement
        // };
        return selection.getRangeAt(0);
    };

    $.KeyboardSelector.prototype.processSelection = function(start, end) {
        var self = this;
        const s = getSelection();
        console.log("LOOK HERE", start, end);
        const r = this.removeMarkers(start, end);
        self.start = undefined;
        console.log("R!", r);

        try {
            var boundingBox = r.end.parentElement.getBoundingClientRect();
        } catch(e) {
            var boundingBox = r.endContainer.parentElement.getBoundingClientRect();
        }
        console.log(boundingBox);

        // publish selection made
        Hxighlighter.publishEvent('TargetSelectionMade', this.instance_id, [this.element, [hrange.serializeRange(r, self.element, 'annotator-hl')], boundingBox]);
        self.element.blur();
        self.turnSelectionModeOff();
        // this.element.focus();
    };

    $.KeyboardSelector.prototype.startComesAfter = function(start, end) {
        if (start.anchorNode == end.anchorNode) {
            if (start.anchorOffset > end.anchorOffset) {
                start.anchorOffset += 1;
                return [end, start];
            } else {
                return [start, end];
            }
        }
        // TODO: Handle other use cases (i.e. starting several nodes instead of within the same one)
        var commonAncestor = this.getCommonAncestor(start.anchorNode, end.anchorNode);
        var children = jQuery(commonAncestor).children();
        var startCounter = 0;
        jQuery.each(children, function(_, el) {
            if (el == start.parentElement) {  
                startCounter += start.anchorOffset;
                return false;
            } else {
                startCounter += jQuery(el).text().length;
            }
        });
        var endCounter = 0;
        jQuery.each(children, function(_, el) {
            if (el == end.parentElement) {  
                endCounter += end.anchorOffset;
                return false;
            } else {
                endCounter += jQuery(el).text().length;
            }
        });
        if (startCounter > endCounter) {
            return [end, start];
        } else {
            return [start, end];
        }
    };

    /**
     * Gets the common ancestor.
     * Credit: https://stackoverflow.com/questions/3960843/how-to-find-the-nearest-common-ancestors-of-two-or-more-nodes
     *
     * @param      {<type>}  a       { parameter_description }
     * @param      {<type>}  b       { parameter_description }
     * @return     {Object}  The common ancestor.
     */
    $.KeyboardSelector.prototype.getCommonAncestor = function(a, b)
    {
        $parentsa = jQuery(a).parents();
        $parentsb = jQuery(b).parents();

        var found = null;

        $parentsa.each(function() {
            var thisa = this;

            $parentsb.each(function() {
                if (thisa == this)
                {
                    found = this;
                    return false;
                }
            });

            if (found) return false;
        });

        return found;
    };

    $.KeyboardSelector.prototype.removeMarkers = function(start, end) {
        var self = this;
        const _start = start.anchorNode;
        const _startOffset = start.anchorOffset - 1;
        const _end = end.anchorNode;
        const _endOffset = end.anchorOffset - 1;
        console.log(_start, _startOffset, _end, _endOffset);

        const t2 = this.removeCharacter(_end.textContent, _endOffset);
        _end.textContent = t2;

        const t1 = this.removeCharacter(_start.textContent, _startOffset);
        _start.textContent = t1;

        const r = document.createRange();
        r.setStart(_start, _startOffset);

        var realRange = {
            startContainer: _start,
            startOffset: _startOffset,
            endContainer: _end,
        }
        
        if (start.anchorNode === end.anchorNode) {
            realRange['endOffset'] = _endOffset - 1;
            r.setEnd(_start, _endOffset - 1);
        } else {
            realRange['endOffset'] = _endOffset;
            r.setEnd(_start, _endOffset);
        }
        // getting common ancestors
        // lonesomeday @ https://stackoverflow.com/questions/3960843/how-to-find-the-nearest-common-ancestors-of-two-or-more-nodes
        realRange['commonAncestorContainer'] = jQuery(_start).parents().has(_end).first()[0];
        realRange['exact'] = [r.toString()];
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(r);
        // convert to xpath and then back to a range
        // var sR = hrange.serializeRange(r, self.element, 'annotator-hl');
        //var nR = hrange.normalizeRange(sR, self.element, 'annotator-hl');
        // console.log(sR, nR);
        return r;
    };

    $.KeyboardSelector.prototype.removeCharacter = function(s, offset) {
        if (offset === 0) {
            s = s.slice(1);
        } else if (offset === s.length-1) { 
            s = s.slice(0, -1);
        } else {
            s = s.slice(0, offset) + s.slice(offset+1);
        }
        return s;
    };

    $.KeyboardSelector.prototype.verifyBackspace = function() {
        const s = getSelection();
        const r = new Range();
        var startOffset = s.anchorOffset;
        if (startOffset > 0) {
            startOffset -= 1;
        }
        r.setStart(s.anchorNode, startOffset);
        r.setEnd(s.anchorNode, startOffset + 1);

        return r.toString() == this.delimiter;
    };
    
    $.selectors.push($.KeyboardSelector);
}(Hxighlighter ?  Hxighlighter : require('../hxighlighter.js')));
