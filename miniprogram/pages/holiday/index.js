// pages/holiday/index.js
const { getCurrentAndNextYearHolidays, convertToPreferences, formatDate } = require('../../utils/holiday_api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 当前选中年份
    currentYear: new Date().getFullYear(),
    
    // 节假日数据
    holidayData: [],
    
    // 偏好设置中的节假日
    currentHolidays: [],
    currentWorkdays: [],
    
    // 日历视图数据
    calendarData: {},
    
    // 加载状态
    loading: false,
    
    // 主题
    themeClass: '',
    
    // 操作状态
    hasChanges: false,
    
    // 年份选择器
    yearRange: [],
    
    // 统计信息
    stats: {
      totalHolidays: 0,
      totalWorkdays: 0,
      appliedHolidays: 0,
      appliedWorkdays: 0
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.initPage();
  },

  /**
   * 初始化页面
   */
  initPage() {
    this.loadTheme();
    this.loadCurrentSettings();
    this.initYearRange();
    this.loadHolidayData();
  },

  /**
   * 加载主题
   */
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
  },

  /**
   * 加载当前设置
   */
  loadCurrentSettings() {
    const prefs = wx.getStorageSync('zl_prefs') || {};
    this.setData({
      currentHolidays: prefs.holidays || [],
      currentWorkdays: prefs.workdays || []
    });
  },

  /**
   * 初始化年份范围
   */
  initYearRange() {
    const currentYear = new Date().getFullYear();
    const yearRange = [];
    
    for (let i = currentYear - 2; i <= currentYear + 3; i++) {
      yearRange.push(i);
    }
    
    this.setData({ yearRange });
  },

  /**
   * 加载节假日数据
   */
  async loadHolidayData() {
    this.setData({ loading: true });
    
    try {
      // 获取当前年份和下一年的节假日数据
      const holidayDataList = await getCurrentAndNextYearHolidays();
      
      // 生成日历数据
      const calendarData = this.generateCalendarData(holidayDataList);
      
      // 计算统计信息
      const stats = this.calculateStats(holidayDataList);
      
      this.setData({
        holidayData: holidayDataList,
        calendarData,
        stats,
        loading: false
      });
      
    } catch (error) {
      console.error('加载节假日数据失败:', error);
      wx.showToast({
        title: '加载节假日数据失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 生成日历数据
   */
  generateCalendarData(holidayDataList) {
    const calendarData = {};
    
    holidayDataList.forEach(yearData => {
      const year = yearData.year;
      calendarData[year] = {
        holidays: {},
        workdays: {}
      };
      
      // 处理节假日
      yearData.holidays.forEach(holiday => {
        calendarData[year].holidays[holiday.date] = {
          name: holiday.name,
          type: 'holiday'
        };
      });
      
      // 处理调休日
      yearData.workdays.forEach(workday => {
        calendarData[year].workdays[workday.date] = {
          name: workday.name,
          type: 'workday'
        };
      });
    });
    
    return calendarData;
  },

  /**
   * 计算统计信息
   */
  calculateStats(holidayDataList) {
    let totalHolidays = 0;
    let totalWorkdays = 0;
    
    holidayDataList.forEach(yearData => {
      totalHolidays += yearData.holidays.length;
      totalWorkdays += yearData.workdays.length;
    });
    
    const { currentHolidays, currentWorkdays } = this.data;
    
    return {
      totalHolidays,
      totalWorkdays,
      appliedHolidays: currentHolidays.length,
      appliedWorkdays: currentWorkdays.length
    };
  },

  /**
   * 切换年份
   */
  onYearChange(e) {
    const yearIndex = e.detail.value;
    const selectedYear = this.data.yearRange[yearIndex];
    
    this.setData({ currentYear: selectedYear });
  },

  /**
   * 手动刷新数据
   */
  refreshData() {
    this.loadHolidayData();
    wx.showToast({
      title: '数据已刷新',
      icon: 'success'
    });
  },

  /**
   * 应用节假日设置
   */
  applyHolidaySettings() {
    wx.showModal({
      title: '确认应用',
      content: '确定要将获取的节假日信息应用到偏好设置中吗？这将覆盖当前的节假日设置。',
      success: (res) => {
        if (res.confirm) {
          this.doApplySettings();
        }
      }
    });
  },

  /**
   * 执行应用设置
   */
  doApplySettings() {
    const { holidayData } = this.data;
    
    if (holidayData.length === 0) {
      wx.showToast({
        title: '没有可应用的数据',
        icon: 'none'
      });
      return;
    }
    
    // 转换为偏好设置格式
    const converted = convertToPreferences(holidayData);
    const holidays = converted.holidays;
    const workdays = converted.workdays;
    
    // 获取当前偏好设置
    const prefs = wx.getStorageSync('zl_prefs') || {};
    
    // 更新节假日设置
    const updatedPrefs = Object.assign({}, prefs, { holidays: holidays, workdays: workdays });
    
    // 保存到本地存储
    wx.setStorageSync('zl_prefs', updatedPrefs);
    
    // 更新页面数据
    this.setData({
      currentHolidays: holidays,
      currentWorkdays: workdays,
      hasChanges: false
    });
    
    // 重新计算统计信息
    const stats = Object.assign({}, this.data.stats, { appliedHolidays: holidays.length, appliedWorkdays: workdays.length });
    
    this.setData({ stats });
    
    wx.showToast({
      title: '设置已应用',
      icon: 'success'
    });
  },

  /**
   * 清除节假日设置
   */
  clearHolidaySettings() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有节假日设置吗？',
      success: (res) => {
        if (res.confirm) {
          this.doClearSettings();
        }
      }
    });
  },

  /**
   * 执行清除设置
   */
  doClearSettings() {
    // 获取当前偏好设置
    const prefs = wx.getStorageSync('zl_prefs') || {};
    
    // 清除节假日设置
    const updatedPrefs = Object.assign({}, prefs, { holidays: [], workdays: [] });
    
    // 保存到本地存储
    wx.setStorageSync('zl_prefs', updatedPrefs);
    
    // 更新页面数据
    this.setData({
      currentHolidays: [],
      currentWorkdays: [],
      hasChanges: false
    });
    
    // 重新计算统计信息
    const stats = Object.assign({}, this.data.stats, { appliedHolidays: 0, appliedWorkdays: 0 });
    
    this.setData({ stats });
    
    wx.showToast({
      title: '设置已清除',
      icon: 'success'
    });
  },

  /**
   * 查看节假日详情
   */
  viewHolidayDetail(e) {
    const { year, type } = e.currentTarget.dataset;
    const yearData = this.data.holidayData.find(data => data.year == year);
    
    if (!yearData) return;
    
    let content = '';
    let title = '';
    
    if (type === 'holidays') {
      title = `${year}年节假日`;
      yearData.holidays.forEach(holiday => {
        content += `${holiday.date} ${holiday.name}\n`;
      });
    } else if (type === 'workdays') {
      title = `${year}年调休日`;
      yearData.workdays.forEach(workday => {
        content += `${workday.date} ${workday.name}\n`;
      });
    }
    
    wx.showModal({
      title,
      content: content.trim() || '暂无数据',
      showCancel: false
    });
  },

  /**
   * 导出节假日数据
   */
  exportHolidayData() {
    const { holidayData, currentHolidays, currentWorkdays } = this.data;
    
    let content = '=== 获取的节假日数据 ===\n';
    
    holidayData.forEach(yearData => {
      content += `\n${yearData.year}年:\n`;
      content += `节假日 (${yearData.holidays.length}个):\n`;
      yearData.holidays.forEach(holiday => {
        content += `  ${holiday.date} ${holiday.name}\n`;
      });
      
      if (yearData.workdays.length > 0) {
        content += `调休日 (${yearData.workdays.length}个):\n`;
        yearData.workdays.forEach(workday => {
          content += `  ${workday.date} ${workday.name}\n`;
        });
      }
    });
    
    content += '\n=== 当前应用的设置 ===\n';
    content += `已应用节假日: ${currentHolidays.length}个\n`;
    content += `已应用调休日: ${currentWorkdays.length}个\n`;
    
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '数据已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 查看使用说明
   */
  viewInstructions() {
    const content = `
1. 点击"刷新数据"获取最新节假日信息
2. 查看各年份的节假日和调休安排
3. 点击"应用到偏好"将数据应用到收益和退休计算中
4. 应用后会影响精确模式的计算结果
5. 可随时清除或重新应用设置
    `;
    
    wx.showModal({
      title: '使用说明',
      content: content.trim(),
      showCancel: false
    });
  }
});
