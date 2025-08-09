// pages/depreciation/index.js
const { calculateDepreciation, formatDate } = require('../../utils/calc.js');
const { haptic, hapticLong } = require('../../utils/haptics.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 物品列表
    items: [],
    
    // 筛选和排序
    filterType: 'all', // all, uncategorized, category:分类名
    sortBy: 'purchaseDate', // purchaseDate, price, usedCost, dailyUsageCost
    sortOrder: 'desc', // asc, desc
    
    // 动态分类列表
    availableCategories: [],
    
    // 滑动相关数据
    activeSlideId: null, // 当前滑动的物品ID
    slideX: 0, // 滑动距离
    startX: 0, // 触摸开始位置
    startY: 0, // 触摸开始Y位置
    maxSlideDistance: 160, // 最大滑动距离(两个80rpx按钮宽度)
    
    // 添加物品表单
    showAddForm: false,
    addForm: {
      name: '',
      price: '',
      purchaseDate: '',
      currentPrice: '',
      depreciationRate: 0.2,
      category: '',
      description: ''
    },
    
    // 表单显示数据
    formDisplay: {
      depreciationRatePercent: 20 // 折旧率百分比显示
    },
    
    // 编辑状态
    editingId: null,
    
    // 统计信息
    stats: {
      totalItems: 0,
      totalCost: 0,
      totalUsedCost: 0,
      totalCurrentValue: 0,
      avgDailyUsageCost: 0
    },
    
    // 主题
    themeClass: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.loadItems();
    this.loadTheme();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadItems();
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
   * 加载物品列表
   */
  loadItems() {
    let items = wx.getStorageSync('zl_items') || [];
    
    // 如果没有数据，添加默认示例数据
    if (items.length === 0) {
      const hasEverHadData = wx.getStorageSync('zl_has_data') || false;
      
      // 只有在用户从未添加过数据时才自动添加示例数据
      if (!hasEverHadData) {
        const defaultItems = [
          {
            id: 'default_phone_' + Date.now(),
            name: 'iPhone 14 Pro (示例)',
            price: 7999,
            purchaseDate: '2023-09-20',
            currentPrice: null,
            depreciationRate: 0.25,
            category: '电子产品',
            description: '深空黑色 128GB，日常使用 - 这是示例数据',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'default_laptop_' + Date.now(),
            name: 'MacBook Pro (示例)',
            price: 12999,
            purchaseDate: '2023-06-15',
            currentPrice: null,
            depreciationRate: 0.2,
            category: '电子产品',
            description: '13寸 M2芯片 - 这是示例数据',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'default_shoes_' + Date.now(),
            name: 'Nike运动鞋 (示例)',
            price: 899,
            purchaseDate: '2024-01-10',
            currentPrice: null,
            depreciationRate: 0.3,
            category: '服装鞋包',
            description: 'Air Max系列 - 这是示例数据',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'default_book_' + Date.now(),
            name: '编程书籍 (示例)',
            price: 89,
            purchaseDate: '2024-03-01',
            currentPrice: null,
            depreciationRate: 0.1,
            category: '',
            description: 'JavaScript高级程序设计 - 这是示例数据，未分类',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        
        items = defaultItems;
        wx.setStorageSync('zl_items', items);
        wx.setStorageSync('zl_has_data', true); // 标记用户已经有过数据
      }
    }
    
    // 计算每个物品的使用成本信息
    const processedItems = items.map(item => {
      const depreciationInfo = calculateDepreciation(item);
      // 添加格式化的折旧率显示
      const depreciationRateDisplay = Math.round(item.depreciationRate * 100);
      return Object.assign({}, item, depreciationInfo, {
        depreciationRateDisplay: depreciationRateDisplay
      });
    });
    
    // 应用筛选和排序
    const filteredItems = this.filterItems(processedItems);
    const sortedItems = this.sortItems(filteredItems);
    
    // 计算统计信息
    const stats = this.calculateStats(processedItems);
    
    // 提取所有分类
    const availableCategories = this.extractCategories(processedItems);
    
    this.setData({
      items: sortedItems,
      stats,
      availableCategories
    });
  },

  /**
   * 提取所有分类
   */
  extractCategories(items) {
    const categories = new Set();
    items.forEach(item => {
      const category = item.category && item.category.trim();
      if (category) {
        categories.add(category);
      }
    });
    return Array.from(categories).sort();
  },

  /**
   * 筛选物品
   */
  filterItems(items) {
    const { filterType } = this.data;
    
    if (filterType.startsWith('category:')) {
      // 按分类筛选
      const categoryName = filterType.replace('category:', '');
      return items.filter(item => item.category === categoryName);
    }
    
    switch (filterType) {
      case 'uncategorized':
        return items.filter(item => !item.category || !item.category.trim());
      default:
        return items;
    }
  },

  /**
   * 排序物品
   */
  sortItems(items) {
    const { sortBy, sortOrder } = this.data;
    
    return items.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'purchaseDate') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      const result = aVal > bVal ? 1 : -1;
      return sortOrder === 'asc' ? result : -result;
    });
  },

  /**
   * 计算统计信息
   */
  calculateStats(items) {
    if (items.length === 0) {
      return {
        totalItems: 0,
        totalCost: 0,
        totalUsedCost: 0,
        totalCurrentValue: 0,
        avgDailyUsageCost: 0
      };
    }
    
    const totalCost = items.reduce((sum, item) => sum + item.price, 0);
    const totalUsedCost = items.reduce((sum, item) => sum + item.usedCost, 0);
    const totalCurrentValue = items.reduce((sum, item) => sum + item.currentValue, 0);
    const totalDailyUsageCost = items.reduce((sum, item) => sum + item.dailyUsageCost, 0);
    
    return {
      totalItems: items.length,
      totalCost: Math.round(totalCost * 100) / 100,
      totalUsedCost: Math.round(totalUsedCost * 100) / 100,
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      avgDailyUsageCost: Math.round((totalDailyUsageCost / items.length) * 100) / 100
    };
  },

  /**
   * 显示添加表单
   */
  showAddItemForm() {
    const today = formatDate(new Date());
    this.setData({
      showAddForm: true,
      addForm: {
        name: '',
        price: '',
        purchaseDate: today,
        currentPrice: '',
        depreciationRate: 0.2,
        category: '',
        description: ''
      },
      'formDisplay.depreciationRatePercent': 20
    });
    haptic('light');
  },

  /**
   * 隐藏添加表单
   */
  hideAddForm() {
    this.setData({
      showAddForm: false,
      editingId: null
    });
    haptic('light');
  },

  /**
   * 阻止事件冒泡（用于表单内容区域）
   */
  stopPropagation() {
    // 空函数，仅用于阻止事件冒泡
  },

  /**
   * 表单输入处理
   */
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    const keyPath = 'addForm.' + field;
    const updateObj = {};
    updateObj[keyPath] = value;
    this.setData(updateObj);
  },

  /**
   * 日期选择
   */
  onDateChange(e) {
    this.setData({
      'addForm.purchaseDate': e.detail.value
    });
  },

  /**
   * 滑块变化处理
   */
  onSliderChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    if (field === 'depreciationRate') {
      this.setData({
        'addForm.depreciationRate': value,
        'formDisplay.depreciationRatePercent': Math.round(value * 100)
      });
      haptic('light');
    }
  },

  /**
   * 保存物品
   */
  saveItem() {
    const { addForm, editingId } = this.data;
    
    // 验证表单
    if (!addForm.name.trim()) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' });
      haptic('light');
      return;
    }
    
    if (!addForm.price || addForm.price <= 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' });
      haptic('light');
      return;
    }
    
    if (!addForm.purchaseDate) {
      wx.showToast({ title: '请选择购买日期', icon: 'none' });
      haptic('light');
      return;
    }
    
    // 构建物品对象
    const item = {
      id: editingId || Date.now().toString(),
      name: addForm.name.trim(),
      price: parseFloat(addForm.price),
      purchaseDate: addForm.purchaseDate,
      currentPrice: addForm.currentPrice ? parseFloat(addForm.currentPrice) : null,
      depreciationRate: parseFloat(addForm.depreciationRate),
      category: addForm.category.trim(),
      description: addForm.description.trim(),
      createdAt: editingId ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 获取现有物品列表
    const items = wx.getStorageSync('zl_items') || [];
    
    if (editingId) {
      // 编辑模式
      const index = items.findIndex(i => i.id === editingId);
      if (index !== -1) {
        items[index] = Object.assign({}, items[index], item);
      }
    } else {
      // 新增模式
      items.push(item);
    }
    
    // 保存到本地存储
    wx.setStorageSync('zl_items', items);
    wx.setStorageSync('zl_has_data', true); // 标记用户已经添加过数据
    
    // 重新加载列表
    this.loadItems();
    this.hideAddForm();
    
    wx.showToast({
      title: editingId ? '修改成功' : '添加成功',
      icon: 'success'
    });
    haptic('medium');
  },

  /**
   * 编辑物品
   */
  editItem(e) {
    console.log('编辑按钮被点击', e);
    const { id } = e.currentTarget.dataset;
    console.log('编辑物品ID:', id);
    const items = wx.getStorageSync('zl_items') || [];
    const item = items.find(i => i.id === id);
    
    // 重置滑动状态
    this.resetSlide();
    
    if (item) {
      this.setData({
        showAddForm: true,
        editingId: id,
        addForm: {
          name: item.name,
          price: item.price.toString(),
          purchaseDate: item.purchaseDate,
          currentPrice: item.currentPrice ? item.currentPrice.toString() : '',
          depreciationRate: item.depreciationRate,
          category: item.category || '',
          description: item.description || ''
        },
        'formDisplay.depreciationRatePercent': Math.round(item.depreciationRate * 100)
      });
      haptic('light');
    }
  },

  /**
   * 删除物品
   */
  deleteItem(e) {
    console.log('删除按钮被点击', e);
    const { id } = e.currentTarget.dataset;
    console.log('删除物品ID:', id);
    
    // 重置滑动状态
    this.resetSlide();
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个物品吗？',
      success: (res) => {
        if (res.confirm) {
          hapticLong();
          const items = wx.getStorageSync('zl_items') || [];
          const filteredItems = items.filter(item => item.id !== id);
          wx.setStorageSync('zl_items', filteredItems);
          this.loadItems();
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          haptic('light');
        }
      }
    });
  },

  /**
   * 切换筛选类型
   */
  changeFilter(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ filterType: type });
    this.loadItems();
    haptic('light');
  },

  /**
   * 获取筛选标签显示名称
   */
  getFilterDisplayName(filterType) {
    if (filterType.startsWith('category:')) {
      return filterType.replace('category:', '');
    }
    
    const filterNames = {
      'all': '全部',
      'uncategorized': '未分类'
    };
    
    return filterNames[filterType] || filterType;
  },

  /**
   * 切换排序
   */
  changeSort(e) {
    const { sort } = e.currentTarget.dataset;
    const { sortBy, sortOrder } = this.data;
    
    if (sortBy === sort) {
      // 同一字段，切换排序方向
      this.setData({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      // 不同字段，使用默认排序方向
      this.setData({ sortBy: sort, sortOrder: 'desc' });
    }
    
    this.loadItems();
    haptic('light');
  },

  /**
   * 查看物品详情
   */
  viewItemDetail(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.items.find(i => i.id === id);
    
    if (item) {
      const content = `
购买价格: ¥${item.price}
购买日期: ${item.purchaseDate}
使用天数: ${item.usedDays}天
当前估值: ¥${item.currentValue}
已用成本: ¥${item.usedCost}
日用成本: ¥${item.dailyUsageCost}
折旧率: ${item.depreciationRateDisplay}%/年
      `;
      
      wx.showModal({
        title: item.name,
        content: content.trim(),
        showCancel: false
      });
      haptic('light');
    }
  },

  /**
   * 清除所有数据
   */
  clearAllData() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有物品数据吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          hapticLong();
          wx.removeStorageSync('zl_items');
          wx.removeStorageSync('zl_has_data'); // 重置数据标记，允许重新显示示例数据
          this.loadItems(); // 重新加载会自动添加示例数据
          
          wx.showToast({
            title: '数据已清除',
            icon: 'success'
          });
          haptic('light');
        }
      }
    });
  },

  /**
   * 触摸开始
   */
  onTouchStart(e) {
    const { id } = e.currentTarget.dataset;
    const touch = e.touches[0];
    
    this.setData({
      activeSlideId: id,
      startX: touch.clientX,
      startY: touch.clientY,
      slideX: 0
    });
  },

  /**
   * 触摸移动
   */
  onTouchMove(e) {
    const { activeSlideId, startX, startY, maxSlideDistance } = this.data;
    
    if (!activeSlideId) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    
    // 如果纵向滑动距离大于横向，则不处理滑动
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }
    
    // 阻止页面滚动
    e.preventDefault && e.preventDefault();
    
    // 只允许左滑（负值），限制滑动距离
    let slideX = deltaX;
    if (slideX > 0) {
      slideX = 0; // 不允许右滑
    } else if (Math.abs(slideX) > maxSlideDistance) {
      slideX = -maxSlideDistance; // 限制左滑最大距离
    }
    
    this.setData({ slideX });
  },

  /**
   * 触摸结束
   */
  onTouchEnd(e) {
    const { slideX, maxSlideDistance } = this.data;
    
    // 如果左滑距离超过阈值的一半，则自动滑到最大距离，否则回弹
    const threshold = maxSlideDistance / 2;
    let finalX = 0;
    
    if (slideX < 0 && Math.abs(slideX) > threshold) {
      finalX = -maxSlideDistance; // 只有左滑才显示按钮
    }
    
    this.setData({
      slideX: finalX
    });
    
    // 如果没有滑动到位，则重置activeSlideId
    if (finalX === 0) {
      this.setData({
        activeSlideId: null
      });
    }
  },

  /**
   * 重置滑动状态
   */
  resetSlide() {
    this.setData({
      activeSlideId: null,
      slideX: 0
    });
  }
});
