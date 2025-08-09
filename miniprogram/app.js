// app.js
App({
  globalData: {
    version: '1.0.0'
  },

  onLaunch() {
    // 初始化本地存储
    this.initStorage();
    
    // 显示本机小程序版本信息
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },

  initStorage() {
    // 初始化物品记录
    if (!wx.getStorageSync('zl_items')) {
      wx.setStorageSync('zl_items', []);
    }

    // 初始化偏好设置
    if (!wx.getStorageSync('zl_prefs')) {
      const defaultPrefs = {
        // 工作设置
        monthlySalary: 10000,
        workStartTime: '09:00',
        workEndTime: '18:00',
        workDaysPerMonth: 22,
        workDaysPerWeek: 5,
        workdayMask: [1, 2, 3, 4, 5], // 周一到周五
        
        // 节假日和调休
        holidays: [],
        workdays: [],
        
        // 退休设置
        retirementAge: 60,
        birthday: '',
        currentAge: 25,
        
        // 主题设置
        theme: 'pixel', // default, pixel
        pixelColor: 'ocean', // mint, sunset, grape, ocean, forest, rose
        
        // 动效设置
        enableIncomeAnimation: true,
        animationType: 'pulse', // pulse, glow, shake, blink, odometer
        animationIntensity: 0.5,
        animationDuration: 1000,

        // 震动设置
        hapticsEnabled: true,
        hapticsLevel: 'medium', // light | medium | heavy
        
        // 计算模式
        incomeMode: 'average', // average, precise
        retirementMode: 'approximate' // approximate, precise
      };
      wx.setStorageSync('zl_prefs', defaultPrefs);
    }
  }
});
