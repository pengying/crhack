var cb = cb || {};
cb.ui = cb.ui || {};

cb.ui.CLASS_POSITIONER = 'cb_ui_positioner';
cb.ui.CLASS_HIDDEN = 'cb_ui_hidden';
cb.ui.CLASS_POPUP = 'cb_ui_popup';
cb.ui.CLASS_POPUPWRAP = 'cb_ui_popupwrap';
cb.ui.CLASS_MODALBG = 'cb_ui_modalbg';
cb.ui.CLASS_CLOSEBUTTON = 'cb_ui_closebutton';
cb.ui.CLASS_MENUITEM = 'cb_ui_menuitem';
cb.ui.CLASS_ICON = 'cb_ui_icon';
cb.ui.CLASS_ICON_NORMAL = 'cb_ui_icon_normal';
cb.ui.CLASS_ICON_SELECTED = 'cb_ui_icon_selected';
cb.ui.CLASS_ICON_HOVER = 'cb_ui_icon_hover';
cb.ui.CLASS_PROGRESS_BG = 'cb_ui_progress_bg';
cb.ui.CLASS_PROGRESS_FILL = 'cb_ui_progress_fill';

cb.ui.CLASS_POINTERUP = 'cb_ui_pointerup';
cb.ui.URL_POINTERUP = '/img/pointer-up.png';

cb.ui.Dom = Class.extend({
  init: function(dom) {
    this._dom = $(dom);
  },
  getDom: function() {
    return this._dom.get(0);
  }
});

cb.ui.Popup = Class.extend({
  init: function(content, opt_args) {
    this._dom_popup = $(content);
    if (this._dom_popup.get(0) == undefined) {
      this._dom_popup = $('<div>' + content + '</div>');
    }
    this._dom_popup.addClass(cb.ui.CLASS_POPUP);
    
    this._dom_wrap = $('<div></div>')
        .addClass(cb.ui.CLASS_POPUPWRAP)
        .addClass(cb.ui.CLASS_HIDDEN)
        .append(this._dom_popup);

    this._opt_args = opt_args || {};
    if (this._opt_args.closeable && this._opt_args.closeable == true) {
      this._dom_closebutton = $("<div>x</div>")
          .addClass(cb.ui.CLASS_CLOSEBUTTON)
          .click($.proxy(this, 'hide'));
      this._dom_wrap.append(this._dom_closebutton);
    }
    
    this._hidden = true;
    
    $(document.body).append(this._dom_wrap);
  },
  show: function() {
    this._dom_wrap.removeClass(cb.ui.CLASS_HIDDEN);
    this._hidden = false;
    $(this).trigger('showpopup');
  },
  hide: function() {
    this._dom_wrap.addClass(cb.ui.CLASS_HIDDEN);
    this._hidden = true;
    $(this).trigger('hidepopup');
  }
});

cb.ui.ModalPopup = cb.ui.Popup.extend({
  init: function(content, opt_args) {
    this._super(content, opt_args);
    var positioner = $('<div></div>')
        .addClass(cb.ui.CLASS_POSITIONER)
        .addClass(cb.ui.CLASS_HIDDEN)
        .addClass(cb.ui.CLASS_MODALBG)
        .append(this._dom_wrap);
    
    this._dom_wrap.removeClass(cb.ui.CLASS_HIDDEN);
    this._dom_wrap = positioner;
    $(document.body).append(this._dom_wrap);
  }
});

cb.ui.ProgressPopup = cb.ui.ModalPopup.extend({
  init: function(content, opt_args) {
    this._super(content, opt_args);
    this._progress = 0;
    this._dom_progress_fill = $('<div>&nbsp;</div>')
        .addClass(cb.ui.CLASS_PROGRESS_FILL);
    
    this._dom_progress_bg = $('<div></div>')
        .addClass(cb.ui.CLASS_PROGRESS_BG)
        .append(this._dom_progress_fill);
    
    this._dom_popup.append(this._dom_progress_bg);
  },
  setProgress: function(progress) {
    if (progress < 0) {
      progress = 0;
    } else if (progress > 100) {
      progress = 100;
    }
    this._progress = progress;
    this._dom_progress_fill.css('width', progress + '%');
    if (this._hidden == true && progress > 0) {
      this.show();
    } else if (this._hidden == false && progress == 100) {
      this.hide();
    }
  }
});

cb.ui.PointingPopup = cb.ui.Popup.extend({
  init: function(content, opt_args) {
    this._super(content, opt_args);
    this._dom_pointerup = $("<img/>")
        .load($.proxy(this, 'adjustPosition'))
        .attr('src', cb.ui.URL_POINTERUP)
        .addClass(cb.ui.CLASS_POINTERUP);
    this._dom_wrap.append(this._dom_pointerup);
  },
  setTarget: function(target) {
    this._dom_target = $(target);
    this._dom_target.append(this._dom_wrap);
    if (this._opt_args.autoclose && this._opt_args.autoclose == true) {
      this._dom_target.bind('mouseleave', $.proxy(this, 'hide'));
    }
    this.adjustPosition();
  },
  adjustPosition: function() {
    if (!this._dom_target) { return; }
    
    var target_pos = this._dom_target.position();
    var pointer_pos = this._dom_pointerup.position();
    
    if (target_pos == null) { return; }
    
    var pointer_width = this._dom_pointerup.outerWidth();
    var pointer_height = this._dom_pointerup.outerHeight();
    var target_width = this._dom_target.outerWidth();
    var target_height = this._dom_target.outerHeight();

    var target_x = target_pos.left + target_width / 2;
    var target_y = target_pos.top + target_height;
    
    var wrap_x = target_x - (pointer_pos.left + pointer_width / 2);
    var wrap_y = target_y - pointer_height / 2;
    
    this._dom_wrap
        .css('left', wrap_x)
        .css('top', wrap_y);
  },
  show: function() {
    this._super();
    this.adjustPosition();
  }
});

cb.ui.Icon = Class.extend({
  init: function(icon_url, width, height) {
    this.selectd = false;
    
    this._width = width;
    this._height = height;

    this._dom_wrap = $('<div>&nbsp;</div>');
    this._dom_wrap
        .addClass(cb.ui.CLASS_ICON)
        .bind('mouseenter', $.proxy(this, '_onMouseEnter'))
        .bind('mouseleave', $.proxy(this, '_onMouseLeave'))
        .bind('click', $.proxy(this,'_onMouseClick'))
        .css('background', 'url(' + icon_url + ')')
        .css('width', width + 'px')
        .css('height', height + 'px')
        .append(this._dom_icon);
        
    this._setNormal();
  },
  _onMouseEnter: function(evt) {
    if (!this.selected) {
      this._setHover();
    }
  },
  _onMouseLeave: function(evt) {
    if (!this.selected) {
      this._setNormal();
    }
  },
  _onMouseClick: function(evt) {
    this.select();
  },
  _setNormal: function() {
    this._dom_wrap
        .removeClass(cb.ui.CLASS_ICON_SELECTED)
        .removeClass(cb.ui.CLASS_ICON_HOVER)
        .addClass(cb.ui.CLASS_ICON_NORMAL)
        .css('background-position', '0 0');    
  },
  _setSelected: function() {
    this._dom_wrap
        .removeClass(cb.ui.CLASS_ICON_NORMAL)
        .removeClass(cb.ui.CLASS_ICON_HOVER)
        .addClass(cb.ui.CLASS_ICON_SELECTED)
        .css('background-position', '0 -' + this._height + 'px');
  },
  _setHover: function() {
    this._dom_wrap
        .removeClass(cb.ui.CLASS_ICON_SELECTED)
        .removeClass(cb.ui.CLASS_ICON_NORMAL)
        .addClass(cb.ui.CLASS_ICON_HOVER)
        .css('background-position', '0 -' + this._height * 2 + 'px');
  },
  appendTo: function(parent) {
    $(parent).append(this._dom_wrap);
  },
  select: function() {
    if (!this.selected) {
      this.selected = true;
      this._setSelected();
      $(this).trigger('selected');
    }
  },
  deselect: function() {
    if (this.selected) {
      this.selected = false;
      this._setNormal();
      $(this).trigger('deselected');
    }
  }
});

cb.ui.Menu = Class.extend({
  init: function() {
    this._dom_wrap = $('<div></div>');
    this._dom_wrap
        .addClass('hbox')
        .bind('mouseleave', $.proxy(this, '_closePopups'));
    this._open_menu = null;
  },
  _closePopups: function(evt) {
    if (this._open_menu != null) {
      this._open_menu.hide();
      this._open_menu = null;
    }
  },
  _showPopup: function(evt) {
    if (this._open_menu != null) {
      setTimeout($.proxy(this._open_menu, 'hide'), 200);
      return;
    }
    this._open_menu = evt.data.popup;
    this._open_menu.show();
  },
  _onPopupClosed: function(evt) {
    if (this._open_menu == evt.data.popup) {
      this._open_menu = null;
    }
  },
  _onButtonMouseEnter: function(evt) {
    if (this._open_menu != null) {
      this._open_menu.hide();
      this._open_menu = evt.data.popup;
      this._open_menu.show();
    }
  },
  appendTo: function(parent) {
    $(parent).append(this._dom_wrap);
  },
  addEntry: function(dom, popup) {
    if (!popup instanceof cb.ui.PointingPopup) {
      throw new Error('cb.ui.Menu.addEntry requies a cb.ui.PointingPopup argument');
    }
    var button = $(dom);
    this._dom_wrap.append(button);
    popup.setTarget(button);
    button
        .bind('click', {popup:popup}, $.proxy(this, '_showPopup'))
        .bind('mouseenter', {popup:popup}, $.proxy(this, '_onButtonMouseEnter'))
        .addClass(cb.ui.CLASS_MENUITEM);
    $(popup).bind('hidepopup', {popup:popup}, $.proxy(this, '_onPopupClosed'));
  }
});