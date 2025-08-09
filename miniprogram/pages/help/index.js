// pages/help/index.js
Page({
  data: {
    themeClass: ''
  },
  onLoad() {
    this.loadTheme();
  },
  onShow() {
    this.loadTheme();
  },
  loadTheme() {
    const prefs = wx.getStorageSync('zl_prefs') || {};
    let themeClass = '';
    if (prefs.theme === 'pixel') {
      themeClass = 'theme-pixel';
      if (prefs.pixelColor) {
        themeClass += ` theme-pixel-${prefs.pixelColor}`;
      }
    }
    this.setData({ themeClass });
  }
});


