// pages/index/index.js
const { calculateTodayIncome, calculateRetirement, formatTime } = require('../../utils/calc.js');

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
    themeClass: ''
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
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadPreferences();
    this.loadItemStats();
    this.calculateData();
    this.startIncomeAnimation();
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
      incomeMode: 'average',
      enableIncomeAnimation: false,
      animationType: 'pulse',
      animationDuration: 1000,
      retirementAge: 60,
      currentAge: 25,
      theme: 'pixel',
      pixelColor: 'mint'
    };
    
    prefs = Object.assign({}, defaultPrefs, prefs);
    
    const themeClass = this.getThemeClass(prefs);
    this.setData({
      prefs,
      themeClass
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
    const currentTime = formatTime(now);
    this.setData({ currentTime });
    
    // 每秒更新时间
    setTimeout(() => {
      this.updateTime();
    }, 1000);
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
  },

  /**
   * 像素风配色变化
   */
  onPixelColorChange(e) {
    const colors = ['mint', 'sunset', 'grape', 'ocean', 'forest', 'rose'];
    const selectedColor = colors[e.detail.value];
    
    const updatedPrefs = Object.assign({}, this.data.prefs, { pixelColor: selectedColor });
    
    wx.setStorageSync('zl_prefs', updatedPrefs);
    this.loadPreferences();
    this.calculateData();
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
  },

  /**
   * 跳转到物品管理
   */
  navigateToDepreciation() {
    wx.navigateTo({
      url: 'pages/depreciation/index'
    });
  },

  /**
   * 跳转到收益详情
   */
  navigateToIncome() {
    wx.navigateTo({
      url: 'pages/income/index'
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
