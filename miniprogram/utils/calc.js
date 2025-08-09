/**
 * 计算相关工具函数
 */

/**
 * 计算物品的使用成本和折旧信息
 * @param {Object} item 物品信息
 * @param {number} item.price 购买价格
 * @param {string} item.purchaseDate 购买日期 YYYY-MM-DD
 * @param {number} item.depreciationRate 年折旧率 (0-1)
 * @param {number} item.currentPrice 当前价格(可选，用户自定义)
 * @returns {Object} 计算结果
 */
function calculateDepreciation(item) {
  const { price, purchaseDate, depreciationRate = 0.2, currentPrice } = item;
  
  const purchaseTime = new Date(purchaseDate).getTime();
  const nowTime = Date.now();
  const usedDays = Math.floor((nowTime - purchaseTime) / (1000 * 60 * 60 * 24));
  
  // 日折旧额
  const dailyDepreciation = price * depreciationRate / 365;
  
  let currentValue;
  let usedCost;
  
  if (currentPrice !== undefined && currentPrice !== null) {
    // 用户自定义当前价格
    currentValue = currentPrice;
    usedCost = price - currentPrice;
  } else {
    // 按线性折旧计算
    currentValue = Math.max(price - dailyDepreciation * usedDays, 0);
    usedCost = price - currentValue;
  }
  
  const dailyUsageCost = usedDays > 0 ? usedCost / usedDays : 0;
  
  return {
    usedDays,
    currentValue: Math.round(currentValue * 100) / 100,
    usedCost: Math.round(usedCost * 100) / 100,
    dailyUsageCost: Math.round(dailyUsageCost * 100) / 100,
    dailyDepreciation: Math.round(dailyDepreciation * 100) / 100
  };
}

/**
 * 计算今日收益相关信息
 * @param {Object} prefs 偏好设置
 * @returns {Object} 收益信息
 */
function calculateTodayIncome(prefs) {
  const {
    monthlySalary,
    workStartTime,
    workEndTime,
    workDaysPerMonth,
    workdayMask,
    holidays,
    workdays,
    incomeMode
  } = prefs;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // 判断今天是否为工作日
  const dayOfWeek = today.getDay();
  const todayStr = formatDate(today);
  
  let isTodayWorkday = false;
  
  if (workdays.includes(todayStr)) {
    // 调休日，强制为工作日
    isTodayWorkday = true;
  } else if (holidays.includes(todayStr)) {
    // 节假日，强制为非工作日
    isTodayWorkday = false;
  } else {
    // 按工作日掩码判断
    isTodayWorkday = workdayMask.includes(dayOfWeek === 0 ? 7 : dayOfWeek);
  }
  
  // 解析工作时间
  const [startHour, startMinute] = workStartTime.split(':').map(Number);
  const [endHour, endMinute] = workEndTime.split(':').map(Number);
  
  const workStartMs = startHour * 60 * 60 * 1000 + startMinute * 60 * 1000;
  const workEndMs = endHour * 60 * 60 * 1000 + endMinute * 60 * 1000;
  const workSecondsPerDay = (workEndMs - workStartMs) / 1000;
  
  let incomePerSecond;
  let workSecondsThisMonth;
  
  if (incomeMode === 'precise') {
    // 精确模式：计算本月实际工作秒数
    workSecondsThisMonth = calculateMonthWorkSeconds(prefs);
    incomePerSecond = workSecondsThisMonth > 0 ? monthlySalary / workSecondsThisMonth : 0;
  } else {
    // 平均模式：按本月实际工作日数量（由每周上班天数 + 节假日/调休推导）估算
    const monthWorkdays = calculateMonthWorkdaysCount(prefs);
    const days = monthWorkdays || workDaysPerMonth || 22;
    incomePerSecond = days > 0 ? monthlySalary / (days * workSecondsPerDay) : 0;
  }
  
  let todayEarned = 0;
  let totalTodayIncome = 0;
  
  if (isTodayWorkday) {
    const currentMs = now.getHours() * 60 * 60 * 1000 + now.getMinutes() * 60 * 1000 + now.getSeconds() * 1000;
    
    if (currentMs >= workStartMs && currentMs <= workEndMs) {
      // 在工作时间内
      const workedSeconds = (currentMs - workStartMs) / 1000;
      todayEarned = workedSeconds * incomePerSecond;
    } else if (currentMs > workEndMs) {
      // 已下班
      todayEarned = workSecondsPerDay * incomePerSecond;
    }
    
    totalTodayIncome = workSecondsPerDay * incomePerSecond;
  }
  
  return {
    isTodayWorkday,
    incomePerSecond: Math.round(incomePerSecond * 10000) / 10000,
    todayEarned: Math.round(todayEarned * 100) / 100,
    totalTodayIncome: Math.round(totalTodayIncome * 100) / 100,
    remainingTodayIncome: Math.round((totalTodayIncome - todayEarned) * 100) / 100
  };
}

/**
 * 计算本月工作秒数（精确模式）
 * @param {Object} prefs 偏好设置
 * @returns {number} 本月工作秒数
 */
function calculateMonthWorkSeconds(prefs) {
  const { workStartTime, workEndTime, workdayMask, holidays, workdays } = prefs;
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // 解析工作时间
  const [startHour, startMinute] = workStartTime.split(':').map(Number);
  const [endHour, endMinute] = workEndTime.split(':').map(Number);
  
  const workStartMs = startHour * 60 * 60 * 1000 + startMinute * 60 * 1000;
  const workEndMs = endHour * 60 * 60 * 1000 + endMinute * 60 * 1000;
  const workSecondsPerDay = (workEndMs - workStartMs) / 1000;
  
  let totalWorkSeconds = 0;
  
  // 遍历本月每一天
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const dateStr = formatDate(date);
    
    let isWorkday = false;
    
    if (workdays.includes(dateStr)) {
      // 调休日
      isWorkday = true;
    } else if (holidays.includes(dateStr)) {
      // 节假日
      isWorkday = false;
    } else {
      // 按工作日掩码判断
      isWorkday = workdayMask.includes(dayOfWeek === 0 ? 7 : dayOfWeek);
    }
    
    if (isWorkday) {
      totalWorkSeconds += workSecondsPerDay;
    }
  }
  
  return totalWorkSeconds;
}

/**
 * 计算本月工作日数量（按每周上班天数与节假日/调休）
 * @param {Object} prefs 偏好设置
 * @returns {number} 本月工作日数量
 */
function calculateMonthWorkdaysCount(prefs) {
  const { workdayMask = [], holidays = [], workdays = [] } = prefs;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const dateStr = formatDate(date);
    let isWorkday = false;
    if (workdays.includes(dateStr)) {
      // 调休/加班日（强制为工作日）
      isWorkday = true;
    } else if (holidays.includes(dateStr)) {
      // 法定节假日（强制为休息日）
      isWorkday = false;
    } else {
      // 按工作日掩码判断（1-7，周日为7）
      isWorkday = workdayMask.includes(dayOfWeek === 0 ? 7 : dayOfWeek);
    }
    if (isWorkday) count++;
  }
  return count;
}

/**
 * 计算退休倒计时信息
 * @param {Object} prefs 偏好设置
 * @returns {Object} 退休倒计时信息
 */
function calculateRetirement(prefs) {
  const { retirementAge, birthday, currentAge, retirementMode, workdayMask, holidays, workdays, workStartTime, workEndTime } = prefs;
  
  let retirementDate;
  
  if (birthday) {
    // 有生日信息，精确计算
    const birthDate = new Date(birthday);
    retirementDate = new Date(birthDate.getFullYear() + retirementAge, birthDate.getMonth(), birthDate.getDate());
  } else {
    // 无生日信息，按当前年龄近似
    const now = new Date();
    const yearsToRetirement = retirementAge - currentAge;
    retirementDate = new Date(now.getFullYear() + yearsToRetirement, now.getMonth(), now.getDate());
  }
  
  const now = new Date();
  const daysToRetirement = Math.ceil((retirementDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let workdaysToRetirement;
  let workhourToRetirement;
  
  if (retirementMode === 'precise') {
    // 精确模式：逐日计算
    const result = calculatePreciseRetirement(now, retirementDate, prefs);
    workdaysToRetirement = result.workdays;
    workhourToRetirement = result.workhours;
  } else {
    // 近似模式
    const workdaysPerWeek = workdayMask.length;
    workdaysToRetirement = Math.floor(daysToRetirement * (workdaysPerWeek / 7));
    
    // 计算日工时
    const [startHour, startMinute] = workStartTime.split(':').map(Number);
    const [endHour, endMinute] = workEndTime.split(':').map(Number);
    const workHoursPerDay = (endHour - startHour) + (endMinute - startMinute) / 60;
    
    workhourToRetirement = Math.floor(workdaysToRetirement * workHoursPerDay);
  }
  
  return {
    retirementDate: formatDate(retirementDate),
    daysToRetirement,
    workdaysToRetirement,
    workhourToRetirement
  };
}

/**
 * 精确计算退休倒计时（逐日枚举）
 * @param {Date} startDate 开始日期
 * @param {Date} endDate 结束日期
 * @param {Object} prefs 偏好设置
 * @returns {Object} 工作日和工作小时数
 */
function calculatePreciseRetirement(startDate, endDate, prefs) {
  const { workdayMask, holidays, workdays: workdaysFromPrefs, workStartTime, workEndTime } = prefs;
  
  // 解析工作时间
  const [startHour, startMinute] = workStartTime.split(':').map(Number);
  const [endHour, endMinute] = workEndTime.split(':').map(Number);
  const workHoursPerDay = (endHour - startHour) + (endMinute - startMinute) / 60;
  
  let workdaysCount = 0;
  const currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + 1); // 从明天开始
  
  while (currentDate < endDate) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = formatDate(currentDate);
    
    let isWorkday = false;
    
    if (workdaysFromPrefs.includes(dateStr)) {
      // 调休日
      isWorkday = true;
    } else if (holidays.includes(dateStr)) {
      // 节假日
      isWorkday = false;
    } else {
      // 按工作日掩码判断
      isWorkday = workdayMask.includes(dayOfWeek === 0 ? 7 : dayOfWeek);
    }
    
    if (isWorkday) {
      workdaysCount++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const workhours = Math.floor(workdaysCount * workHoursPerDay);
  
  return { workdays: workdaysCount, workhours };
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化时间为 HH:MM
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 格式化时间为 HH:MM:SS
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的时间字符串（含秒）
 */
function formatTimeWithSeconds(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * 解析时间字符串为分钟数
 * @param {string} timeStr 时间字符串 HH:MM
 * @returns {number} 分钟数
 */
function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

module.exports = {
  calculateDepreciation,
  calculateTodayIncome,
  calculateMonthWorkSeconds,
  calculateMonthWorkdaysCount,
  calculateRetirement,
  calculatePreciseRetirement,
  formatDate,
  formatTime,
  formatTimeWithSeconds,
  parseTimeToMinutes
};
