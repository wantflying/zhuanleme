// pages/income/index.js
const { calculateTodayIncome, calculateMonthWorkSeconds, calculateMonthWorkdaysCount, formatTime, formatTimeWithSeconds, parseTimeToMinutes, formatDate } = require('../../utils/calc.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 偏好设置
    prefs: {},
    
    // 收益信息
    incomeInfo: {
      isTodayWorkday: false,
      todayEarned: 0,
      totalTodayIncome: 0,
      remainingTodayIncome: 0,
    incomePerSecond: 0
    },
    
    // 时间信息
    currentTime: '',
    workProgress: 0, // 工作进度百分比
    workTimeRange: '', // 工作时间范围
    
    // 详细计算信息
    calculations: {
      monthWorkSeconds: 0,
      workSecondsPerDay: 0,
      currentWorkSeconds: 0,
      remainingWorkSeconds: 0,
      workProgress: 0
    },
    
    // 供 WXML 使用的预计算字段
    calcView: {
      currentWorkHours: 0,
      currentWorkMinutes: 0,
      remainingWorkHours: 0,
      remainingWorkMinutes: 0,
      workHoursPerDay: 0,
      monthWorkHours: 0,
      workProgressPercent: 0,
      incomeTodayEarnedFixed2: '0.00',
      incomePerSecondFixed2: '0.00',
      incomePerMinuteFixed2: '0.00',
      totalTodayIncomeFixed2: '0.00',
      remainingTodayIncomeFixed2: '0.00'
    },
    
    // 设置面板
    showSettings: false,
    tempPrefs: {},
    
    // 实时更新定时器
    updateTimer: null,
    
    // 主题
    themeClass: '',
    
    // 动效相关
    animationClass: '',
    enableAnimation: true
    ,
    // 选择器数据（避免在 WXML 内联数组表达式）
    incomeModeRange: ['平均模式', '精确模式'],
    incomeModeOptions: ['average', 'precise'],
    animationTypeRangeLabels: ['脉冲', '发光', '摇晃', '闪烁', '里程表'],
    animationTypeOptions: ['pulse', 'glow', 'shake', 'blink', 'odometer'],
    // 每周上班天数选择器
    workDaysPerWeekRange: ['每周1天', '每周2天', '每周3天', '每周4天', '每周5天', '每周6天', '每周7天'],
    workDaysPerWeekOptions: [1,2,3,4,5,6,7]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.loadPreferences();
    this.calculateIncome();
    this.startRealTimeUpdate();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadPreferences();
    this.calculateIncome();
    this.startRealTimeUpdate();
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
    
    // 与默认值合并，确保缺失字段被补全
    const defaultPrefs = {
      monthlySalary: 8000,
      workStartTime: '09:00',
      workEndTime: '18:00',
      workDaysPerMonth: 22,
      workDaysPerWeek: 5,
      workdayMask: [1,2,3,4,5],
      holidays: [],
      workdays: [],
      incomeMode: 'average',
      enableIncomeAnimation: true,
      animationType: 'pulse',
      animationDuration: 1000,
      theme: 'pixel',
      pixelColor: ''
    };
    prefs = Object.assign({}, defaultPrefs, prefs);
    
    const themeClass = this.getThemeClass(prefs);
    const clonePrefs = Object.assign({}, prefs);
    
    this.setData({
      prefs,
      tempPrefs: clonePrefs,
      themeClass,
      enableAnimation: prefs.enableIncomeAnimation || false
    });

    // 计算当月工作日用于展示
    const monthWorkdays = calculateMonthWorkdaysCount(prefs);
    this.setData({ monthWorkdaysDisplay: monthWorkdays });
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
   * 计算收益信息
   */
  calculateIncome() {
    const prefs = (this.data.tempPrefs && Object.keys(this.data.tempPrefs).length)
      ? this.data.tempPrefs
      : this.data.prefs;
    const incomeInfo = calculateTodayIncome(prefs);
    
    // 计算详细信息
    const calculations = this.calculateDetailedInfo(prefs, incomeInfo);

    // 供 WXML 使用的预计算展示字段，避免在 WXML 中使用 Math
    const calcView = {
      currentWorkHours: Math.floor(calculations.currentWorkSeconds / 3600),
      currentWorkMinutes: Math.floor((calculations.currentWorkSeconds % 3600) / 60),
      remainingWorkHours: Math.floor(calculations.remainingWorkSeconds / 3600),
      remainingWorkMinutes: Math.floor((calculations.remainingWorkSeconds % 3600) / 60),
      workHoursPerDay: Math.floor(calculations.workSecondsPerDay / 3600),
      monthWorkHours: Math.floor(calculations.monthWorkSeconds / 3600),
      workProgressPercent: Math.floor((calculations.workProgress || 0) * 100),
      incomeTodayEarnedFixed2: incomeInfo.todayEarned.toFixed(2),
      incomePerSecondFixed2: incomeInfo.incomePerSecond.toFixed(2),
      incomePerMinuteFixed2: (incomeInfo.incomePerSecond * 60).toFixed(2),
      totalTodayIncomeFixed2: incomeInfo.totalTodayIncome.toFixed(2),
      remainingTodayIncomeFixed2: incomeInfo.remainingTodayIncome.toFixed(2)
    };
    
    // 计算工作进度
    const workProgress = this.calculateWorkProgress(prefs);
    
    // 格式化工作时间范围
    const workTimeRange = `${prefs.workStartTime || '09:00'} - ${prefs.workEndTime || '18:00'}`;
    
    // 更新时间
    const currentTime = formatTimeWithSeconds(new Date());
    
    const monthWorkdays = calculateMonthWorkdaysCount(prefs);
    this.setData({
      incomeInfo,
      calculations,
      calcView,
      workProgress,
      workTimeRange,
      currentTime,
      monthWorkdaysDisplay: monthWorkdays
    });
  },

  /**
   * 计算详细信息
   */
  calculateDetailedInfo(prefs, incomeInfo) {
    const { workStartTime, workEndTime, incomeMode } = prefs;
    
    // 解析工作时间
    const startMinutes = parseTimeToMinutes(workStartTime || '09:00');
    const endMinutes = parseTimeToMinutes(workEndTime || '18:00');
    const workSecondsPerDay = (endMinutes - startMinutes) * 60;
    
    // 当前时间的分钟数
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    let currentWorkSeconds = 0;
    let remainingWorkSeconds = 0;
    
    if (incomeInfo.isTodayWorkday) {
      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        // 在工作时间内
        currentWorkSeconds = (currentMinutes - startMinutes) * 60 + now.getSeconds();
        remainingWorkSeconds = workSecondsPerDay - currentWorkSeconds;
      } else if (currentMinutes > endMinutes) {
        // 已下班
        currentWorkSeconds = workSecondsPerDay;
        remainingWorkSeconds = 0;
      } else {
        // 还未上班
        currentWorkSeconds = 0;
        remainingWorkSeconds = workSecondsPerDay;
      }
    }
    
    // 计算本月工作秒数
    let monthWorkSeconds = 0;
    if (incomeMode === 'precise') {
      monthWorkSeconds = calculateMonthWorkSeconds(prefs);
    }
    
    // 计算工作进度百分比
    let workProgress = 0;
    if (incomeInfo.isTodayWorkday && workSecondsPerDay > 0) {
      workProgress = currentWorkSeconds / workSecondsPerDay;
    }

    return {
      monthWorkSeconds,
      workSecondsPerDay,
      currentWorkSeconds,
      remainingWorkSeconds: Math.max(0, remainingWorkSeconds),
      workProgress: Math.max(0, Math.min(1, workProgress))
    };
  },

  /**
   * 计算工作进度
   */
  calculateWorkProgress(prefs) {
    const { workStartTime, workEndTime } = prefs;
    
    const startMinutes = parseTimeToMinutes(workStartTime || '09:00');
    const endMinutes = parseTimeToMinutes(workEndTime || '18:00');
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    if (currentMinutes < startMinutes) {
      return 0; // 还未开始工作
    } else if (currentMinutes > endMinutes) {
      return 100; // 已经结束工作
    } else {
      // 计算进度百分比
      const workMinutes = endMinutes - startMinutes;
      const workedMinutes = currentMinutes - startMinutes;
      return Math.round((workedMinutes / workMinutes) * 100);
    }
  },

  /**
   * 开始实时更新
   */
  startRealTimeUpdate() {
    this.stopRealTimeUpdate(); // 先停止之前的定时器
    
    this.data.updateTimer = setInterval(() => {
      this.calculateIncome();
      
      // 触发动画
      if (this.data.enableAnimation && this.data.prefs.animationType !== 'odometer') {
        this.triggerIncomeAnimation();
      }
    }, 1000);
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
   * 触发收益动画
   */
  triggerIncomeAnimation() {
    const animationType = this.data.prefs.animationType;
    if (!animationType || animationType === 'odometer') return;
    
    this.setData({ animationClass: animationType });
    
    // 动画结束后清除类名
    setTimeout(() => {
      this.setData({ animationClass: '' });
    }, this.data.prefs.animationDuration || 1000);
  },

  /**
   * 显示设置面板
   */
  showSettingsPanel() {
    const clonePrefs = Object.assign({}, this.data.prefs);
    this.setData({ 
      showSettings: true,
      tempPrefs: clonePrefs
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
    this.calculateIncome();
  },

  /**
   * 时间选择
   */
  onTimeChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    const tempPrefs = Object.assign({}, this.data.tempPrefs);
    tempPrefs[field] = value;
    
    this.setData({
      tempPrefs: tempPrefs
    });
    
    // 立即触发页面数据计算更新
    this.calculateIncome();
  },

  /**
   * 切换开关
   */
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    const tempPrefs = Object.assign({}, this.data.tempPrefs);
    tempPrefs[field] = value;
    
    this.setData({
      tempPrefs: tempPrefs
    });
    // 立即触发页面数据计算更新
    this.calculateIncome();
  },

  /**
   * 滑块变化
   */
  onSliderChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    const tempPrefs = Object.assign({}, this.data.tempPrefs);
    tempPrefs[field] = value;
    
    this.setData({
      tempPrefs: tempPrefs
    });
    // 立即触发页面数据计算更新
    this.calculateIncome();
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
    // 立即触发页面数据计算更新
    this.calculateIncome();

    // 如果修改了每周上班天数，同步工作日掩码
    if (field === 'workDaysPerWeek') {
      const days = selectedValue;
      // 默认从周一开始的连续days天
      const mask = [];
      for (let i = 1; i <= 7; i++) {
        if (i <= days) mask.push(i);
      }
      const newPrefs = Object.assign({}, tempPrefs, { workdayMask: mask });
      this.setData({ tempPrefs: newPrefs });
      this.calculateIncome();
    }
  },

  /**
   * 保存设置
   */
  saveSettings() {
    const { tempPrefs } = this.data;
    
    // 验证设置
    if (!tempPrefs.monthlySalary || tempPrefs.monthlySalary <= 0) {
      wx.showToast({ title: '请输入有效的月工资', icon: 'none' });
      return;
    }
    
    if (!tempPrefs.workStartTime || !tempPrefs.workEndTime) {
      wx.showToast({ title: '请设置工作时间', icon: 'none' });
      return;
    }
    
    // 保存到本地存储
    wx.setStorageSync('zl_prefs', tempPrefs);
    
    // 更新页面数据
    this.loadPreferences();
    this.calculateIncome();
    this.hideSettingsPanel();
    
    wx.showToast({
      title: '设置已保存',
      icon: 'success'
    });
  },

  /**
   * 切换计算模式
   */
  toggleIncomeMode() {
    const currentMode = this.data.prefs.incomeMode;
    const newMode = currentMode === 'average' ? 'precise' : 'average';
    
    const updatedPrefs = Object.assign({}, this.data.prefs, { incomeMode: newMode });
    
    wx.setStorageSync('zl_prefs', updatedPrefs);
    this.loadPreferences();
    this.calculateIncome();
    
    wx.showToast({
      title: `已切换到${newMode === 'average' ? '平均' : '精确'}模式`,
      icon: 'success'
    });
  },

  

  /**
   * 手动刷新
   */
  refreshData() {
    this.calculateIncome();
    wx.showToast({
      title: '数据已刷新',
      icon: 'success'
    });
  },

  /**
   * 分享收益信息
   */
  shareIncome() {
    const { incomeInfo } = this.data;
    const content = `今日收益: ¥${incomeInfo.todayEarned}\n每秒赚取: ¥${incomeInfo.incomePerSecond}\n总计可赚: ¥${incomeInfo.totalTodayIncome}`;
    
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '收益信息已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 休息日加班/取消加班
   */
  toggleOvertimeToday() {
    const prefs = Object.assign({}, wx.getStorageSync('zl_prefs') || {});
    const todayStr = formatDate(new Date());
    const workdays = Array.isArray(prefs.workdays) ? prefs.workdays.slice() : [];
    const idx = workdays.indexOf(todayStr);
    if (idx >= 0) {
      workdays.splice(idx, 1);
      wx.showToast({ title: '已取消今日加班标记', icon: 'none' });
    } else {
      workdays.push(todayStr);
      wx.showToast({ title: '已标记今日为加班', icon: 'none' });
    }
    const updatedPrefs = Object.assign({}, prefs, { workdays });
    wx.setStorageSync('zl_prefs', updatedPrefs);
    this.loadPreferences();
    this.calculateIncome();
  },

  /**
   * 获取每周上班天数索引
   */
  getWorkDaysPerWeekIndex(val) {
    const v = Number(val || 5);
    return Math.max(0, Math.min(6, v - 1));
  },

  /**
   * 获取每周上班天数中文
   */
  getWorkDaysPerWeekLabel(val) {
    const v = Number(val || 5);
    return `每周${v}天`;
  },

  /**
   * 查看历史统计
   */
  viewStatistics() {
    wx.showModal({
      title: '功能开发中',
      content: '历史收益统计功能正在开发中，敬请期待！',
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
