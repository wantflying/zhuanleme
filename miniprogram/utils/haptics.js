// utils/haptics.js
// 统一的震动反馈工具

function getPrefs() {
  try {
    return wx.getStorageSync('zl_prefs') || {};
  } catch (e) {
    return {};
  }
}

function vibrateShortWithType(type) {
  try {
    if (wx.vibrateShort) {
      // 支持传入 { type: 'heavy' | 'medium' | 'light' }
      if (typeof type === 'string') {
        wx.vibrateShort({ type });
      } else {
        wx.vibrateShort();
      }
    } else if (wx.vibrateLong) {
      wx.vibrateLong();
    }
  } catch (e) {
    // 忽略震动失败
  }
}

function haptic(forceType) {
  const prefs = getPrefs();
  if (!prefs.hapticsEnabled) return;
  const level = forceType || prefs.hapticsLevel || 'medium';
  // 轻量映射到 light，普通映射到 medium，重映射到 heavy
  let type = 'medium';
  if (level === 'light') type = 'light';
  if (level === 'heavy') type = 'heavy';
  vibrateShortWithType(type);
}

function hapticLong() {
  const prefs = getPrefs();
  if (!prefs.hapticsEnabled) return;
  try {
    wx.vibrateLong && wx.vibrateLong();
  } catch (e) {}
}

module.exports = {
  haptic,
  hapticLong
};


