var KEY_BACKSPACE = 8,
  KEY_TAB = 9,
  KEY_ENTER = 13,
  KEY_LEFT = 37,
  KEY_RIGHT = 39,
  KEY_DELETE = 46,
  KEY_COMMA = 188;

class Tagify {
  constructor(element, options = {}) {
    let defaultOptions = {
      disabled: false,
      delimiter: ',',
      allowDelete: true,
      lowercase: false,
      uppercase: true,
      duplicates: false
    }
    this.element = element;
    this.options = Object.assign({}, defaultOptions, options);

    this.init();
  }

  init() {
    if (!this.options.disabled) {
      this.tags = [];
      // The container will visually looks like an input
      this.container = document.createElement('div');
      this.container.className = 'tagsinput';
      this.container.classList.add('field');
      this.container.classList.add('is-grouped');
      this.container.classList.add('is-grouped-multiline');
      this.container.classList.add('input');
      this.container.style = 'margin-bottom: 0px'; // Because field has usually -0.75em.

      let inputType = this.element.getAttribute('type');
    	if (!inputType || inputType === 'tags') {
    		inputType = 'text';
      }

      this.input_container = document.createElement('div');
      this.input_container.className = 'input_container awesomplete';
      this.container.appendChild(this.input_container);


    let dataTagList = this.element.getAttribute('data-tag-list');


      // Create an invisible input element so user will be able to enter value


      this.input = document.createElement('input');
      this.input.className = 'input';
      this.input.setAttribute('type', inputType);
      this.input.setAttribute('data-list', dataTagList);
      this.input.classList.add('awesomplete');
      this.input_container.appendChild(this.input);

      let sib = this.element.nextSibling;
      this.element.parentNode[sib ? 'insertBefore':'appendChild'](this.container, sib);
      this.element.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0.01;';
      this.element.tabIndex = -1;

      this.enable();
    }
  }

  enable() {
    if (!this.enabled && !this.options.disabled) {
      this.setInputWidth();


      this.awesomplete_highlight = false;

      this.input.addEventListener('awesomplete-highlight', (e) => {
        this.awesomplete_highlight = true;
      });

      this.input.addEventListener('awesomplete-selectcomplete', (e) => {
        this.awesomplete_select = false;
        this.awesomplete_highlight = false;
        this.savePartial();
      });

      this.input.addEventListener('awesomplete-close', (e) => {
        this.awesomplete_highlight = false;
      });

      window.addEventListener('resize', () => {
        this.setInputWidth();
      });



      this.element.addEventListener('focus', () => {
        this.container.classList.add('is-focused');
        this.select((Array.prototype.slice.call(this.container.querySelectorAll('.tag:not(.is-delete)'))).pop());
      });

      this.input.addEventListener('focus', () => {
    		this.container.classList.add('is-focused');
    		this.select((Array.prototype.slice.call(this.container.querySelectorAll('.tag:not(.is-delete)'))).pop());
      });
      this.input.addEventListener('blur', () => {
    		this.container.classList.remove('is-focused');
    		this.select((Array.prototype.slice.call(this.container.querySelectorAll('.tag:not(.is-delete)'))).pop());
    		this.savePartial();
      });
      this.input.addEventListener('keydown', (e) => {
              let key = e.charCode || e.keyCode || e.which,
                  selectedTag,
                  activeTag = this.container.querySelector('.tag.is-active'),
                  last = (Array.prototype.slice.call(this.container.querySelectorAll('.tag:not(.is-delete)'))).pop(),
                  atStart = this.caretAtStart(this.input);

              if (activeTag) {
                  selectedTag = this.container.querySelector('[data-tag="' + activeTag.innerHTML.trim() + '"]');
              }
              this.setInputWidth();

              if (key === this.options.delimiter.charCodeAt(0) || key == KEY_ENTER || key === KEY_COMMA) {
                  if (!this.input.value && (key !== this.options.delimiter.charCodeAt(0) || key === KEY_COMMA)) {
                      return;
                  }
                  if(!this.awesomplete_highlight){
                      this.savePartial();
                  }
              } else if (key === KEY_DELETE && selectedTag) {
                  if (selectedTag.nextSibling) {
                      this.select(selectedTag.nextSibling.querySelector('.tag'));
                  } else if (selectedTag.previousSibling) {
                      this.select(selectedTag.previousSibling.querySelector('.tag'));
                  }
                  this.container.removeChild(selectedTag);
                  delete this.tags[this.tags.indexOf(selectedTag.getAttribute('data-tag'))];
                  this.setInputWidth();
                  this.save();
              } else if (key === KEY_BACKSPACE) {
                  if (selectedTag) {
                      if (selectedTag.previousSibling) {
                          this.select(selectedTag.previousSibling.querySelector('.tag'));
                      } else if (selectedTag.nextSibling) {
                          this.select(selectedTag.nextSibling.querySelector('.tag'));
                      }
                      this.container.removeChild(selectedTag);
                      delete this.tags[this.tags.indexOf(selectedTag.getAttribute('data-tag'))];
                      this.setInputWidth();
                      this.save();
                  } else if (last && atStart) {
                      this.select(last);
                  } else {
                      return;
                  }
              } else if (key === KEY_LEFT) {
                  if (selectedTag) {
                      if (selectedTag.previousSibling) {
                          this.select(selectedTag.previousSibling.querySelector('.tag'));
                      }
                  } else if (!atStart) {
                      return;
                  } else {
                      this.select(last);
                  }
              }
              else if (key === KEY_RIGHT) {
                  if (!selectedTag) {
                      return;
                  }
                  this.select(selectedTag.nextSibling.querySelector('.tag'));
              }
              else {
                  return this.select();
              }

              e.preventDefault();
              return false;
      });
      this.input.addEventListener('input', () => {
        this.element.value = this.getValue();
        this.element.dispatchEvent(new Event('input'));
      });
      this.input.addEventListener('paste', () => setTimeout(savePartial, 0));

      this.container.addEventListener('mousedown', (e) => { this.refocus(e); });
      this.container.addEventListener('touchstart', (e) => { this.refocus(e); });

      this.savePartial(this.element.value);

      this.enabled = true;
    }
  }

  disable() {
    if (this.enabled && !this.options.disabled) {
      this.reset();

      this.enabled = false;
    }
  }

  select(el) {
		let sel = this.container.querySelector('.is-active');
		if (sel) {
      sel.classList.remove('is-active');
    }
		if (el) {
      el.classList.add('is-active');
    }
  }

  addTag(text) {
    if (~text.indexOf(this.options.delimiter)) {
      text = text.split(this.options.delimiter);
    }
    if (Array.isArray(text)) {
      return text.forEach((text) => {
        this.addTag(text)
      });
    }

    let tag = text && text.trim();
    if (!tag) {
      return false;
    }

    if (this.element.getAttribute('lowercase') || this.options['lowercase'] == 'true') {
      tag = tag.toLowerCase();
    }
    if (this.element.getAttribute('uppercase') || this.options['uppercase'] == 'true') {
      tag = tag.toUpperCase();
    }
    if (this.element.getAttribute('duplicates') == 'true' || this.options['duplicates'] || this.tags.indexOf(tag) === -1) {
      this.tags.push(tag);

      let newTagWrapper = document.createElement('div');
      newTagWrapper.className = 'control';
      newTagWrapper.setAttribute('data-tag', tag);

      let newTag = document.createElement('div');
      newTag.className = 'tags';
      newTag.classList.add('has-addons');

      let newTagContent = document.createElement('span');
      newTagContent.className = 'tag';
      newTagContent.classList.add('is-active');
      this.select(newTagContent);
      newTagContent.innerHTML = tag;

      newTag.appendChild(newTagContent);
      if (this.options.allowDelete) {
        let newTagDeleteButton = document.createElement('a');
        newTagDeleteButton.className = 'tag';
        newTagDeleteButton.classList.add('is-delete');
        newTagDeleteButton.addEventListener('click', (e) => {
          let selectedTag,
            activeTag = e.target.parentNode,
            last = (Array.prototype.slice.call(this.container.querySelectorAll('.tag'))).pop(),
            atStart = this.caretAtStart(this.input);

          if (activeTag) {
            selectedTag = this.container.querySelector('[data-tag="' + activeTag.innerText.trim() + '"]');
          }

          if (selectedTag) {
    				this.select(selectedTag.previousSibling);
    				this.container.removeChild(selectedTag);
            delete this.tags[this.tags.indexOf(selectedTag.getAttribute('data-tag'))];
    				this.setInputWidth();
    				this.save();
    			}
    			else if (last && atStart) {
    				this.select(last);
    			}
    			else {
    				return;
          }
        });
        newTag.appendChild(newTagDeleteButton);
      }
      newTagWrapper.appendChild(newTag);

      this.container.insertBefore(newTagWrapper, this.input_container);
    }
  }

  getValue() {
    return this.tags.join(this.options.delimiter);
  }

  setValue(value) {
    (Array.prototype.slice.call(this.container.querySelectorAll('.tag'))).forEach((tag) => {
      delete this.tags[this.tags.indexOf(tag.innerHTML)];
      this.container.removeChild(tag);
    });
    this.savePartial(value);
  }

  setInputWidth() {
    let last = (Array.prototype.slice.call(this.container.querySelectorAll('.control'))).pop();

    if (!this.container.offsetWidth) {
      return;
    }
    this.input.style.width = Math.max(this.container.offsetWidth - (last ? (last.offsetLeft + last.offsetWidth) : 30) - 30, this.container.offsetWidth / 4) + 'px';
  }

  savePartial(value) {
    if (typeof value !== 'string' && !Array.isArray(value)) {
      value = this.input.value;
    }
    if (this.addTag(value) !== false) {
			this.input.value = '';
			this.save();
			this.setInputWidth();
    }
  }

  save() {
    this.element.value = this.tags.join(this.options.delimiter);
    this.element.dispatchEvent(new Event('change'));
  }

  caretAtStart(el) {
		try {
			return el.selectionStart === 0 && el.selectionEnd === 0;
		}
		catch(e) {
			return el.value === '';
		}
  }

  refocus(e) {
		if (e.target.classList.contains('tag')) {
      this.select(e.target);
    }
		if (e.target === this.input) {
      return this.select();
    }
		this.input.focus();
		e.preventDefault();
		return false;
  }

  reset() {
    this.tags = [];
  }

  destroy() {
    this.disable();
    this.reset();
    this.element = null;
  }
}

let tagInputs = document.querySelectorAll('input[type="tags_with_awesomplete"]');
if (tagInputs) {
  tagInputs.forEach(element => {
    new Tagify(element);
  })
}