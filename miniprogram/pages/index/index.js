// pages/index/index.js
const { calculateTodayIncome, calculateRetirement, formatTimeWithSeconds } = require('../../utils/calc.js');
const { haptic, hapticLong } = require('../../utils/haptics.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 偏好设置
    prefs: {},
    
    // 今日收益
    todayIncome: {
      isTodayWorkday: false,
      todayEarned: 0,
      totalTodayIncome: 0,
      remainingTodayIncome: 0,
      incomePerSecond: 0
    },
    
    // 退休倒计时
    retirement: {
      daysToRetirement: 0,
      workdaysToRetirement: 0,
      workhourToRetirement: 0,
      retirementDate: ''
    },
    
    // 物品统计
    itemStats: {
      totalItems: 0,
      totalCost: 0,
      totalUsedCost: 0
    },
    
    // 设置面板
    showSettings: false,
    
    // 动效相关
    incomeAnimationTimer: null,
    currentTime: '',
    
    // 主题类名
    themeClass: '',
    importText: '',

    // 像素风配色选择器（WXML 数据驱动）
    pixelColorRangeLabels: ['薄荷色', '日落橙', '葡萄紫', '海洋蓝', '森林绿', '玫瑰金'],
    pixelColorOptions: ['mint', 'sunset', 'grape', 'ocean', 'forest', 'rose'],
    pixelColorIndex: 0,
    pixelColorLabel: '薄荷色',

    // 名言展示
    mottoText: '',
    mottoSymbols: ['「', '」']
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.loadPreferences();
    this.loadItemStats();
    this.calculateData();
    this.updateTime();
    this.startIncomeAnimation();
    this.loadMotto();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadPreferences();
    this.loadItemStats();
    this.calculateData();
    this.startIncomeAnimation();
    this.loadMotto();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    this.stopIncomeAnimation();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    this.stopIncomeAnimation();
  },

  /**
   * 加载偏好设置
   */
  loadPreferences() {
    let prefs = wx.getStorageSync('zl_prefs') || {};
    
    // 设置默认值
    const defaultPrefs = {
      monthlySalary: 5000,
      workStartTime: '09:00',
      workEndTime: '18:00',
      workDaysPerMonth: 22,
      workDaysPerWeek: 5,
      workdayMask: [1,2,3,4,5],
      holidays: [],
      workdays: [],
      incomeMode: 'average',
      enableIncomeAnimation: false,
      animationType: 'pulse',
      animationDuration: 1000,
      retirementAge: 60,
      currentAge: 25,
      theme: 'pixel',
      pixelColor: 'ocean'
    };
    
    prefs = Object.assign({}, defaultPrefs, prefs);
    
    const themeClass = this.getThemeClass(prefs);
    const pixelColorIndex = this.getPixelColorIndex(prefs.pixelColor);
    const pixelColorLabel = this.getPixelColorLabel(prefs.pixelColor);
    this.setData({
      prefs,
      themeClass,
      pixelColorIndex,
      pixelColorLabel
    });
  },

  /**
   * 获取主题类名
   */
  getThemeClass(prefs) {
    let className = '';
    if (prefs.theme === 'pixel') {
      className = 'theme-pixel';
      if (prefs.pixelColor) {
        className += ` theme-pixel-${prefs.pixelColor}`;
      }
    }
    return className;
  },

  /**
   * 加载物品统计
   */
  loadItemStats() {
    const items = wx.getStorageSync('zl_items') || [];
    let totalCost = 0;
    let totalUsedCost = 0;
    
    items.forEach(item => {
      totalCost += item.price || 0;
      // 这里可以调用计算函数获取已用成本，简化处理
      const usedCost = (item.price || 0) * 0.3; // 简化计算
      totalUsedCost += usedCost;
    });
    
    this.setData({
      itemStats: {
        totalItems: items.length,
        totalCost: Math.round(totalCost * 100) / 100,
        totalUsedCost: Math.round(totalUsedCost * 100) / 100
      }
    });
  },

  /**
   * 计算数据
   */
  calculateData() {
    const prefs = this.data.prefs;
    
    // 计算今日收益
    const todayIncome = calculateTodayIncome(prefs);
    
    // 计算退休倒计时
    const retirement = calculateRetirement(prefs);
    
    this.setData({
      todayIncome,
      retirement
    });
  },

  /**
   * 更新时间
   */
  updateTime() {
    const now = new Date();
    const currentTime = formatTimeWithSeconds(now);
    this.setData({ currentTime });
    
    // 每秒更新时间
    setTimeout(() => {
      this.updateTime();
    }, 1000);
  },

  /**
   * 加载与刷新名言
   */
  loadMotto() {
    const mottos = [
      '不积跬步，无以至千里',
      '日日精进，久久为功',
      '你所热爱的，正是你的生活',
      '种一棵树最好的时间是十年前，其次是现在',
      '凡事预则立，不预则废',
      '长期主义，时间的朋友'
    ];
    const today = new Date();
    const key = 'zl_motto';
    let saved = {};
    try { saved = wx.getStorageSync(key) || {}; } catch (e) {}
    const todayStr = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
    let index = 0;
    if (saved.date === todayStr && typeof saved.index === 'number') {
      index = saved.index % mottos.length;
    } else {
      index = Math.floor(Math.random() * mottos.length);
      wx.setStorageSync(key, { date: todayStr, index });
    }
    this.setData({ mottoText: mottos[index] });
  },

  refreshMotto() {
    const mottos = [
      '不积跬步，无以至千里',
      '日日精进，久久为功',
      '你所热爱的，正是你的生活',
      '种一棵树最好的时间是十年前，其次是现在',
      '凡事预则立，不预则废',
      '长期主义，时间的朋友'
    ];
    const key = 'zl_motto';
    let saved = {};
    try { saved = wx.getStorageSync(key) || {}; } catch (e) {}
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
    const currentIndex = typeof saved.index === 'number' ? saved.index : 0;
    const nextIndex = (currentIndex + 1) % mottos.length;
    wx.setStorageSync(key, { date: todayStr, index: nextIndex });
    this.setData({ mottoText: mottos[nextIndex] });
    haptic('light');
  },

  /**
   * 开始收益动画
   */
  startIncomeAnimation() {
    const { enableIncomeAnimation, animationType, animationDuration } = this.data.prefs;
    
    if (!enableIncomeAnimation) return;
    
    this.stopIncomeAnimation(); // 先停止之前的动画
    
    this.data.incomeAnimationTimer = setInterval(() => {
      // 重新计算收益
      this.calculateData();
      
      // 触发动画效果
      if (animationType && animationType !== 'odometer') {
        this.triggerIncomeAnimation(animationType, animationDuration);
      }
    }, 1000);
  },

  /**
   * 停止收益动画
   */
  stopIncomeAnimation() {
    if (this.data.incomeAnimationTimer) {
      clearInterval(this.data.incomeAnimationTimer);
      this.setData({ incomeAnimationTimer: null });
    }
  },

  /**
   * 触发收益动画效果
   */
  triggerIncomeAnimation(animationType, duration = 1000) {
    const query = this.createSelectorQuery();
    query.select('.income-amount').boundingClientRect();
    query.exec((res) => {
      if (res[0]) {
        const animation = wx.createAnimation({
          duration: duration,
          timingFunction: 'ease-in-out'
        });
        
        switch (animationType) {
          case 'pulse':
            animation.scale(1.1).step().scale(1).step();
            break;
          case 'glow':
            animation.opacity(0.7).step().opacity(1).step();
            break;
          case 'shake':
            animation.translateX(10).step().translateX(-10).step().translateX(0).step();
            break;
          case 'blink':
            animation.opacity(0).step().opacity(1).step();
            break;
        }
        
        this.setData({
          incomeAnimation: animation.export()
        });
        // 动效触发时（若开启震动）反馈
        if (this.data.prefs && this.data.prefs.hapticsEnabled) {
          haptic('light');
        }
      }
    });
  },

  /**
   * 显示设置面板
   */
  showSettingsPanel() {
    this.setData({ showSettings: true });
  },

  /**
   * 隐藏设置面板
   */
  hideSettingsPanel() {
    this.setData({ showSettings: false });
  },

  /**
   * 阻止事件传播（用于设置面板）
   */
  stopPropagation(e) {
    // 空方法用于catchtap拦截
  },

  /**
   * 主题选择变化
   */
  onThemeChange(e) {
    const themes = ['default', 'pixel'];
    const selectedTheme = themes[e.detail.value];
    
    const updatedPrefs = Object.assign({}, this.data.prefs, { theme: selectedTheme });
    
    wx.setStorageSync('zl_prefs', updatedPrefs);
    this.loadPreferences();
    this.calculateData();
    haptic('medium');
  },

  /**
   * 像素风配色变化
   */
  onPixelColorChange(e) {
    const colors = this.data.pixelColorOptions || ['mint', 'sunset', 'grape', 'ocean', 'forest', 'rose'];
    const selectedIndex = Number(e.detail.value || 0);
    const selectedColor = colors[selectedIndex];
    
    const updatedPrefs = Object.assign({}, this.data.prefs, { pixelColor: selectedColor });
    
    wx.setStorageSync('zl_prefs', updatedPrefs);
    this.setData({
      pixelColorIndex: selectedIndex,
      pixelColorLabel: this.getPixelColorLabel(selectedColor)
    });
    this.loadPreferences();
    this.calculateData();
    haptic('medium');
  },

  /**
   * 导出数据为JSON文本
   */
  exportData() {
    const app = getApp && getApp();
    const version = (app && app.globalData && app.globalData.version) || '1.0.0';
    const data = {
      prefs: wx.getStorageSync('zl_prefs') || {},
      items: wx.getStorageSync('zl_items') || [],
      meta: { exportedAt: Date.now(), app: 'zhuan', version, hasData: !!wx.getStorageSync('zl_has_data') }
    };
    const text = JSON.stringify(data);
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: 'JSON已复制', icon: 'success' })
    });
  },

  /**
   * 导入文本输入变化
   */
  onImportTextChange(e) {
    this.setData({ importText: e.detail.value });
  },

  /**
   * 清空导入文本
   */
  clearImportText() {
    this.setData({ importText: '' });
  },

  /**
   * 导入JSON数据
   */
  importData() {
    const { importText } = this.data;
    if (!importText || !importText.trim()) {
      wx.showToast({ title: '请输入JSON文本', icon: 'none' });
      return;
    }
    try {
      const parsed = JSON.parse(importText);
      if (parsed && typeof parsed === 'object') {
        if (parsed.prefs) wx.setStorageSync('zl_prefs', parsed.prefs);
        if (parsed.items) wx.setStorageSync('zl_items', parsed.items);
        if (parsed.meta && typeof parsed.meta.hasData === 'boolean') {
          wx.setStorageSync('zl_has_data', parsed.meta.hasData);
        }
        wx.showToast({ title: '导入成功', icon: 'success' });
        this.loadPreferences();
        this.loadItemStats();
        this.calculateData();
      } else {
        wx.showToast({ title: 'JSON格式不正确', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '解析失败，请检查JSON', icon: 'none' });
    }
  },

  /**
   * 重置整个程序（恢复初次安装状态）
   */
  resetProgram() {
    wx.showModal({
      title: '重置程序',
      content: '将清空本地所有配置与数据，恢复到初次安装状态，并尝试重启小程序，是否继续？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('zl_items');
            wx.removeStorageSync('zl_prefs');
            wx.removeStorageSync('zl_has_data');
            // 可选：清除其它可能的缓存键
            try { wx.clearStorageSync && wx.clearStorageSync(); } catch (e) {}
            this.setData({ importText: '' });
            // 尝试重启：跳转到首页并关闭其它页面
            wx.reLaunch({ url: '/pages/index/index' });
          } catch (e) {
            wx.showToast({ title: '重置失败', icon: 'none' });
          }
        }
      }
    });
  },

  /**
   * 获取像素风颜色索引
   */
  getPixelColorIndex(color) {
    const colors = ['mint', 'sunset', 'grape', 'ocean', 'forest', 'rose'];
    return colors.indexOf(color || 'mint');
  },

  /**
   * 获取像素风颜色标签
   */
  getPixelColorLabel(color) {
    const labels = {
      mint: '薄荷色',
      sunset: '日落橙', 
      grape: '葡萄紫',
      ocean: '海洋蓝',
      forest: '森林绿',
      rose: '玫瑰金'
    };
    return labels[color] || '薄荷色';
  },

  /**
   * 动效开关切换
   */
  onAnimationToggle(e) {
    const enabled = e.detail.value;
    
    const updatedPrefs = Object.assign({}, this.data.prefs, { enableIncomeAnimation: enabled });
    
    wx.setStorageSync('zl_prefs', updatedPrefs);
    this.loadPreferences();
    this.calculateData();
    
    // 重启动画
    this.startIncomeAnimation();
    haptic('light');
  },

  /**
   * 震动开关
   */
  onHapticsToggle(e) {
    const enabled = e.detail.value;
    const updatedPrefs = Object.assign({}, this.data.prefs, { hapticsEnabled: enabled });
    wx.setStorageSync('zl_prefs', updatedPrefs);
    this.loadPreferences();
    if (enabled) haptic('light');
  },

  /**
   * 震动等级
   */
  onHapticsLevelChange(e) {
    const options = ['light', 'medium', 'heavy'];
    const selected = options[Number(e.detail.value || 1)];
    const updatedPrefs = Object.assign({}, this.data.prefs, { hapticsLevel: selected });
    wx.setStorageSync('zl_prefs', updatedPrefs);
    this.loadPreferences();
    haptic(selected);
  },

  /**
   * 跳转到物品管理
   */
  navigateToDepreciation() {
    wx.navigateTo({
      url: '/pages/depreciation/index'
    });
  },

  /**
   * 跳转到收益详情
   */
  navigateToIncome() {
    wx.navigateTo({
      url: '/pages/income/index'
    });
  },

  /**
   * 跳转到退休倒计时
   */
  navigateToRetirement() {
    wx.navigateTo({
      url: '/pages/retirement/index'
    });
  },

  /**
   * 跳转到节假日日历
   */
  navigateToHoliday() {
    wx.navigateTo({
      url: '/pages/holiday/index'
    });
  }
});
