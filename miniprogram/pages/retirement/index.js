// pages/retirement/index.js
const { calculateRetirement, formatDate } = require('../../utils/calc.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 偏好设置
    prefs: {},
    
    // 退休倒计时信息
    retirement: {
      retirementDate: '',
      daysToRetirement: 0,
      workdaysToRetirement: 0,
      workhourToRetirement: 0
    },
    
    // 年龄和生日信息
    ageInfo: {
      currentAge: 0,
      retirementAge: 0,
      birthday: '',
      yearsToRetirement: 0,
      monthsToRetirement: 0
    },
    
    // 设置面板
    showSettings: false,
    tempPrefs: {},
    
    // 实时更新定时器
    updateTimer: null,
    
    // 当前时间
    currentTime: '',
    
    // 主题
    themeClass: '',
    
    // 图表数据
    chartData: {
      totalDays: 0,
      passedDays: 0,
      remainingDays: 0,
      progressPercent: 0
    },
    retirementModeRange: ['近似模式', '精确模式'],
    retirementModeOptions: ['approximate', 'precise']
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.loadPreferences();
    this.calculateRetirementInfo();
    this.startRealTimeUpdate();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadPreferences();
    this.calculateRetirementInfo();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    this.stopRealTimeUpdate();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    this.stopRealTimeUpdate();
  },

  /**
   * 加载偏好设置
   */
  loadPreferences() {
    let prefs = wx.getStorageSync('zl_prefs') || {};
    
    // 设置默认值
    const defaultPrefs = {
      currentAge: 25,
      retirementAge: 60,
      retirementMode: 'approximate',
      birthday: '',
      monthlySalary: 5000,
      workStartTime: '09:00',
      workEndTime: '18:00',
      workDaysPerMonth: 22,
      workDaysPerWeek: 5,
      workdayMask: [1,2,3,4,5],
      holidays: [],
      workdays: [],
      theme: 'pixel',
      pixelColor: 'mint'
    };
    
    prefs = Object.assign({}, defaultPrefs, prefs);
    const themeClass = this.getThemeClass(prefs);
    
    const clonePrefs = Object.assign({}, prefs);
    this.setData({
      prefs,
      tempPrefs: clonePrefs,
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
   * 计算退休信息
   */
  calculateRetirementInfo(prefsArg) {
    const prefs = prefsArg || this.data.prefs;
    
    // 计算基础退休倒计时
    const retirement = calculateRetirement(prefs);
    
    // 计算年龄信息
    const ageInfo = this.calculateAgeInfo(prefs);
    
    // 计算图表数据
    const chartData = this.calculateChartData(prefs, ageInfo);
    
    // 更新当前时间
    const currentTime = new Date().toLocaleString();
    
    // 预计算数据避免在WXML中使用Math
    const calcData = {
      workdaysFromHours: Math.floor(retirement.workhourToRetirement / 24),
      remainingWorkYears: Math.floor(retirement.workdaysToRetirement / 252)
    };
    
    this.setData({
      retirement,
      ageInfo,
      chartData,
      currentTime,
      calcData
    });
  },

  /**
   * 计算年龄信息
   */
  calculateAgeInfo(prefs) {
    const { currentAge, retirementAge, birthday } = prefs;
    
    let actualCurrentAge = currentAge || 25;
    let yearsToRetirement = retirementAge - actualCurrentAge;
    let monthsToRetirement = yearsToRetirement * 12;
    
    if (birthday) {
      // 有生日信息，精确计算
      const birthDate = new Date(birthday);
      const now = new Date();
      
      // 计算精确年龄
      actualCurrentAge = now.getFullYear() - birthDate.getFullYear();
      const monthDiff = now.getMonth() - birthDate.getMonth();
      const dayDiff = now.getDate() - birthDate.getDate();
      
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        actualCurrentAge--;
      }
      
      // 计算到退休的精确时间
      const retirementDate = new Date(birthDate.getFullYear() + retirementAge, birthDate.getMonth(), birthDate.getDate());
      const timeDiff = retirementDate.getTime() - now.getTime();
      
      yearsToRetirement = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 365.25));
      monthsToRetirement = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 30.44));
    }
    
    return {
      currentAge: actualCurrentAge,
      retirementAge: retirementAge || 60,
      birthday: birthday || '',
      yearsToRetirement: Math.max(0, yearsToRetirement),
      monthsToRetirement: Math.max(0, monthsToRetirement)
    };
  },

  /**
   * 计算图表数据
   */
  calculateChartData(prefs, ageInfo) {
    const { currentAge, retirementAge } = ageInfo;
    const totalYears = retirementAge - 18; // 假设18岁开始工作
    const passedYears = currentAge - 18;
    const remainingYears = retirementAge - currentAge;
    
    const progressPercent = Math.round((passedYears / totalYears) * 100);
    
    return {
      totalDays: totalYears * 365,
      passedDays: passedYears * 365,
      remainingDays: remainingYears * 365,
      progressPercent: Math.max(0, Math.min(100, progressPercent))
    };
  },

  /**
   * 开始实时更新
   */
  startRealTimeUpdate() {
    this.stopRealTimeUpdate();
    
    this.data.updateTimer = setInterval(() => {
      this.calculateRetirementInfo();
    }, 60000); // 每分钟更新一次
  },

  /**
   * 停止实时更新
   */
  stopRealTimeUpdate() {
    if (this.data.updateTimer) {
      clearInterval(this.data.updateTimer);
      this.setData({ updateTimer: null });
    }
  },

  /**
   * 显示设置面板
   */
  showSettingsPanel() {
    const clonePrefs2 = Object.assign({}, this.data.prefs);
    this.setData({
      showSettings: true,
      tempPrefs: clonePrefs2
    });
  },

  /**
   * 隐藏设置面板
   */
  hideSettingsPanel() {
    this.setData({ showSettings: false });
  },

  /**
   * 临时设置更新
   */
  onTempPrefChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    console.log('Input change:', field, value); // 调试日志
    
    const tempPrefs = Object.assign({}, this.data.tempPrefs);
    tempPrefs[field] = value;
    
    this.setData({
      tempPrefs: tempPrefs
    });
    
    // 立即触发页面数据计算更新
    const previewPrefs = Object.assign({}, this.data.prefs, tempPrefs);
    this.calculateRetirementInfo(previewPrefs);
  },

  /**
   * 日期选择
   */
  onDateChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    const tempPrefs = Object.assign({}, this.data.tempPrefs);
    tempPrefs[field] = value;
    
    this.setData({
      tempPrefs: tempPrefs
    });
    
    // 立即触发页面数据计算更新
    const previewPrefs = Object.assign({}, this.data.prefs, tempPrefs);
    this.calculateRetirementInfo(previewPrefs);
  },

  /**
   * 选择器变化
   */
  onPickerChange(e) {
    const { field, options } = e.currentTarget.dataset;
    const { value } = e.detail;
    const selectedValue = options[value];
    
    const tempPrefs = Object.assign({}, this.data.tempPrefs);
    tempPrefs[field] = selectedValue;
    
    this.setData({
      tempPrefs: tempPrefs
    });

    const previewPrefs = Object.assign({}, this.data.prefs, tempPrefs);
    this.calculateRetirementInfo(previewPrefs);
  },

  /**
   * 保存设置
   */
  saveSettings() {
    const { tempPrefs } = this.data;
    
    // 验证设置
    if (!tempPrefs.retirementAge || tempPrefs.retirementAge <= 0) {
      wx.showToast({ title: '请输入有效的退休年龄', icon: 'none' });
      return;
    }
    
    if (!tempPrefs.currentAge || tempPrefs.currentAge <= 0) {
      wx.showToast({ title: '请输入有效的当前年龄', icon: 'none' });
      return;
    }
    
    if (tempPrefs.currentAge >= tempPrefs.retirementAge) {
      wx.showToast({ title: '当前年龄不能大于或等于退休年龄', icon: 'none' });
      return;
    }
    
    // 保存到本地存储
    wx.setStorageSync('zl_prefs', tempPrefs);
    
    // 更新页面数据
    this.loadPreferences();
    this.calculateRetirementInfo();
    this.hideSettingsPanel();
    
    wx.showToast({
      title: '设置已保存',
      icon: 'success'
    });
  },

  /**
   * 切换计算模式
   */
  toggleRetirementMode() {
    const currentMode = this.data.prefs.retirementMode;
    const newMode = currentMode === 'approximate' ? 'precise' : 'approximate';
    
    const updatedPrefs = Object.assign({}, this.data.prefs, { retirementMode: newMode });
    
    wx.setStorageSync('zl_prefs', updatedPrefs);
    this.loadPreferences();
    this.calculateRetirementInfo();
    
    wx.showToast({
      title: `已切换到${newMode === 'approximate' ? '近似' : '精确'}模式`,
      icon: 'success'
    });
  },

  /**
   * 手动刷新
   */
  refreshData() {
    this.calculateRetirementInfo();
    wx.showToast({
      title: '数据已刷新',
      icon: 'success'
    });
  },

  /**
   * 分享退休信息
   */
  shareRetirement() {
    const { retirement, ageInfo } = this.data;
    const content = `退休倒计时:\n剩余${retirement.daysToRetirement}天\n工作日${retirement.workdaysToRetirement}天\n工作时长${retirement.workhourToRetirement}小时\n距离${ageInfo.retirementAge}岁退休还有${ageInfo.yearsToRetirement}年`;
    
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '退休信息已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 查看退休规划建议
   */
  viewRetirementPlan() {
    const { ageInfo, retirement } = this.data;
    const yearsLeft = ageInfo.yearsToRetirement;
    
    let suggestion = '';
    if (yearsLeft > 30) {
      suggestion = '距离退休还很远，建议制定长期理财规划，积极投资。';
    } else if (yearsLeft > 15) {
      suggestion = '进入中期规划阶段，建议平衡投资风险，增加储蓄。';
    } else if (yearsLeft > 5) {
      suggestion = '临近退休，建议降低投资风险，保障资金安全。';
    } else if (yearsLeft > 0) {
      suggestion = '即将退休，建议做好资金安排和养老准备。';
    } else {
      suggestion = '已达到退休年龄，享受美好的退休生活吧！';
    }
    
    wx.showModal({
      title: '退休规划建议',
      content: suggestion,
      showCancel: false
    });
  },

  /**
   * 计算退休所需资金
   */
  calculateRetirementFunds() {
    wx.showModal({
      title: '功能开发中',
      content: '退休资金计算功能正在开发中，敬请期待！',
      showCancel: false
    });
  },

  /**
   * 阻止事件传播
   */
  stopPropagation(e) {
    // 阻止事件冒泡
  }
});
