// pages/index/index.js
const { calculateTodayIncome, calculateRetirement, formatTimeWithSeconds, formatDate } = require('../../utils/calc.js');

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
    // 操作说明
    showHelp: false,
    
    // 动效相关
    incomeAnimationTimer: null,
    currentTime: '',
    dailyQuote: '',
    
    // 主题类名
    themeClass: '',
    importText: ''
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
    this.setDailyQuote();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadPreferences();
    this.loadItemStats();
    this.calculateData();
    this.startIncomeAnimation();
    this.setDailyQuote();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    this.stopIncomeAnimation();
  },

  /**
   * 语录候选（8-12字）
   */
  getQuoteList() {
    const quotes = [
      '行到水穷坐看云起',
      '此心安处是吾乡',
      '非淡泊无以明志',
      '非宁静无以致远',
      '不驰于空想不骛于虚声',
      '日拱一卒功不唐捐',
      '以终为始慎思笃行',
      '躬身入局久久为功',
      '路漫漫其修远兮',
      '穷且益坚不坠青云之志',
      '博观而约取厚积而薄发',
      '吾生也有涯而知也无涯',
      '吾将上下而求索',
      '心有猛虎细嗅蔷薇',
      '静以修身俭以养德',
      '面朝大海春暖花开',
      '读万卷书行万里路',
      '少壮不努力老大徒伤悲',
      '天行健君子以自强不息',
      '地势坤君子以厚德载物',
      '苟日新日日新又日新',
      '大道至简实干为要',
      '慎独守拙行稳致远'
    ];
    // 过滤长度 8-12 字
    return quotes.filter(q => q.length >= 8 && q.length <= 12);
  },

  /**
   * 设置每日一句（默认按日期稳定）
   */
  setDailyQuote() {
    const list = this.getQuoteList();
    if (!list.length) return;
    const today = formatDate(new Date());
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = (hash * 31 + today.charCodeAt(i)) >>> 0;
    }
    const index = hash % list.length;
    this.setData({ dailyQuote: list[index] });
  },

  /**
   * 刷新语录（点击左上角）
   */
  refreshDailyQuote() {
    const list = this.getQuoteList();
    if (!list.length) return;
    let next = list[Math.floor(Math.random() * list.length)];
    // 尽量与当前不同
    if (list.length > 1) {
      let tries = 0;
      while (next === this.data.dailyQuote && tries < 5) {
        next = list[Math.floor(Math.random() * list.length)];
        tries++;
      }
    }
    this.setData({ dailyQuote: next });
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
    const currentTime = formatTimeWithSeconds(now);
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
   * 显示/隐藏操作说明
   */
  showHelpPanel() {
    this.setData({ showHelp: true });
  },
  hideHelpPanel() {
    this.setData({ showHelp: false });
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
   * 导出数据为JSON文本
   */
  exportData() {
    const data = {
      prefs: wx.getStorageSync('zl_prefs') || {},
      items: wx.getStorageSync('zl_items') || [],
      meta: { exportedAt: Date.now(), app: 'zhuan', version: this.data?.globalData?.version || '1.0.0' }
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
