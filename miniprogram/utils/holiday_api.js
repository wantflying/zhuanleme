/**
 * 节假日API相关工具函数
 */

const TIMOR_API_BASE = 'https://timor.tech/api/holiday';
const NAGER_API_BASE = 'https://date.nager.at/api/v3';

/**
 * 从Timor API获取节假日数据
 * @param {number} year 年份
 * @returns {Promise<Object>} 节假日数据
 */
function fetchHolidaysFromTimor(year) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${TIMOR_API_BASE}/year/${year}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          resolve(res.data);
        } else {
          reject(new Error('Timor API请求失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 从Nager API获取节假日数据
 * @param {number} year 年份
 * @returns {Promise<Array>} 节假日数据
 */
function fetchHolidaysFromNager(year) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${NAGER_API_BASE}/PublicHolidays/${year}/CN`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          resolve(res.data);
        } else {
          reject(new Error('Nager API请求失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 获取指定年份的节假日数据（优先Timor，备选Nager）
 * @param {number} year 年份
 * @returns {Promise<Object>} 处理后的节假日数据
 */
async function getHolidayData(year) {
  try {
    // 优先使用Timor API
    const timorData = await fetchHolidaysFromTimor(year);
    return parseTimorData(timorData);
  } catch (error) {
    console.warn('Timor API请求失败，尝试Nager API:', error);
    
    try {
      // 备选Nager API
      const nagerData = await fetchHolidaysFromNager(year);
      return parseNagerData(nagerData);
    } catch (nagerError) {
      console.error('所有节假日API请求失败:', nagerError);
      throw new Error('无法获取节假日数据');
    }
  }
}

/**
 * 解析Timor API返回的数据
 * @param {Object} data Timor API数据
 * @returns {Object} 标准化的节假日数据
 */
function parseTimorData(data) {
  const holidays = [];
  const workdays = [];
  
  if (data.holiday) {
    // 处理节假日
    Object.keys(data.holiday).forEach(dateStr => {
      const holiday = data.holiday[dateStr];
      holidays.push({
        date: dateStr,
        name: holiday.name,
        isOffDay: holiday.holiday,
        wage: holiday.wage
      });
      
      // 如果是调休日（上班但有加班费）
      if (!holiday.holiday && holiday.wage) {
        workdays.push({
          date: dateStr,
          name: `${holiday.name}调休`,
          reason: 'makeup'
        });
      }
    });
  }
  
  return {
    year: data.year,
    holidays: holidays.filter(h => h.isOffDay),
    workdays: workdays,
    source: 'timor'
  };
}

/**
 * 解析Nager API返回的数据
 * @param {Array} data Nager API数据
 * @returns {Object} 标准化的节假日数据
 */
function parseNagerData(data) {
  const holidays = data.map(holiday => ({
    date: holiday.date,
    name: holiday.localName || holiday.name,
    isOffDay: true,
    global: holiday.global,
    counties: holiday.counties
  }));
  
  return {
    year: new Date().getFullYear(),
    holidays: holidays,
    workdays: [], // Nager API不提供调休信息
    source: 'nager'
  };
}

/**
 * 获取多个年份的节假日数据
 * @param {Array<number>} years 年份数组
 * @returns {Promise<Array>} 多年节假日数据
 */
async function getMultiYearHolidays(years) {
  const promises = years.map(year => getHolidayData(year));
  
  try {
    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    console.error('获取多年节假日数据失败:', error);
    throw error;
  }
}

/**
 * 获取当前年份和下一年的节假日数据
 * @returns {Promise<Array>} 两年的节假日数据
 */
function getCurrentAndNextYearHolidays() {
  const currentYear = new Date().getFullYear();
  return getMultiYearHolidays([currentYear, currentYear + 1]);
}

/**
 * 将节假日数据转换为偏好设置格式
 * @param {Array} holidayDataList 节假日数据列表
 * @returns {Object} 偏好设置格式的数据
 */
function convertToPreferences(holidayDataList) {
  const holidays = [];
  const workdays = [];
  
  holidayDataList.forEach(yearData => {
    // 添加节假日
    yearData.holidays.forEach(holiday => {
      holidays.push(holiday.date);
    });
    
    // 添加调休日
    yearData.workdays.forEach(workday => {
      workdays.push(workday.date);
    });
  });
  
  return { holidays, workdays };
}

/**
 * 检查是否为节假日
 * @param {string} dateStr 日期字符串 YYYY-MM-DD
 * @param {Array} holidays 节假日数组
 * @returns {boolean} 是否为节假日
 */
function isHoliday(dateStr, holidays) {
  return holidays.includes(dateStr);
}

/**
 * 检查是否为调休日
 * @param {string} dateStr 日期字符串 YYYY-MM-DD
 * @param {Array} workdays 调休日数组
 * @returns {boolean} 是否为调休日
 */
function isWorkday(dateStr, workdays) {
  return workdays.includes(dateStr);
}

module.exports = {
  getHolidayData,
  getMultiYearHolidays,
  getCurrentAndNextYearHolidays,
  convertToPreferences,
  isHoliday,
  isWorkday,
  fetchHolidaysFromTimor,
  fetchHolidaysFromNager,
  parseTimorData,
  parseNagerData
};
