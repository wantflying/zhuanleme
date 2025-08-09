// components/odometer/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 要显示的数值
    value: {
      type: Number,
      value: 0
    },
    // 小数位数
    precision: {
      type: Number,
      value: 2
    },
    // 整数位数
    digits: {
      type: Number,
      value: 6
    },
    // 每个数字的宽度(rpx)
    digitWidth: {
      type: Number,
      value: 40
    },
    // 每个数字的高度(rpx)
    digitHeight: {
      type: Number,
      value: 60
    },
    // 动画持续时间(ms)
    duration: {
      type: Number,
      value: 1000
    },
    // 前缀符号
    prefix: {
      type: String,
      value: '¥'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    digitList: [],
    oldValue: 0
  },

  /**
   * 组件生命周期函数
   */
  lifetimes: {
    attached() {
      this.updateDigits();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 更新数字显示
     */
    updateDigits() {
      const { value, precision, digits } = this.properties;
      const oldValue = this.data.oldValue;
      
      // 将数值转换为固定位数的字符串
      const valueStr = value.toFixed(precision);
      const oldValueStr = oldValue.toFixed(precision);
      
      // 分离整数部分和小数部分
      const [integerPart, decimalPart] = valueStr.split('.');
      const [oldIntegerPart, oldDecimalPart] = oldValueStr.split('.');
      
      // 补齐整数部分到指定位数
      const paddedInteger = integerPart.padStart(digits, '0');
      const paddedOldInteger = oldIntegerPart.padStart(digits, '0');
      
      // 生成数字列表
      const digitList = [];
      
      // 添加整数部分
      for (let i = 0; i < digits; i++) {
        const digit = parseInt(paddedInteger[i]);
        const oldDigit = parseInt(paddedOldInteger[i]);
        digitList.push({
          id: `int_${i}`,
          type: 'integer',
          current: digit,
          old: oldDigit,
          hasChanged: digit !== oldDigit
        });
      }
      
      // 添加小数点
      if (precision > 0) {
        digitList.push({
          id: 'decimal_point',
          type: 'decimal_point',
          current: '.',
          old: '.',
          hasChanged: false
        });
        
        // 添加小数部分
        for (let i = 0; i < precision; i++) {
          const digit = parseInt(decimalPart[i]);
          const oldDigit = parseInt(oldDecimalPart[i]);
          digitList.push({
            id: `dec_${i}`,
            type: 'decimal',
            current: digit,
            old: oldDigit,
            hasChanged: digit !== oldDigit
          });
        }
      }
      
      this.setData({
        digitList,
        oldValue: value
      });
      
      // 触发动画
      this.triggerAnimation();
    },

    /**
     * 触发滚动动画
     */
    triggerAnimation() {
      const { duration } = this.properties;
      
      // 为每个有变化的数字添加动画类
      this.data.digitList.forEach((digit, index) => {
        if (digit.hasChanged && digit.type !== 'decimal_point') {
          const selector = `.odometer-digit[data-id="${digit.id}"]`;
          const query = this.createSelectorQuery();
          query.select(selector).node().exec((res) => {
            if (res[0]) {
              // 添加动画效果
              this.animateDigit(digit, duration);
            }
          });
        }
      });
    },

    /**
     * 执行单个数字的动画
     * @param {Object} digit 数字对象
     * @param {number} duration 动画时长
     */
    animateDigit(digit, duration) {
      const steps = 10; // 动画步骤数
      const stepDuration = duration / steps;
      let currentStep = 0;
      
      const animate = () => {
        if (currentStep >= steps) {
          return;
        }
        
        currentStep++;
        const progress = currentStep / steps;
        
        // 计算当前应显示的数字
        const diff = digit.current - digit.old;
        const currentValue = digit.old + Math.floor(diff * progress);
        
        // 更新显示
        const selector = `.odometer-digit[data-id="${digit.id}"] .digit-current`;
        const query = this.createSelectorQuery();
        query.select(selector).node().exec((res) => {
          if (res[0] && res[0].node) {
            res[0].node.textContent = currentValue % 10;
          }
        });
        
        setTimeout(animate, stepDuration);
      };
      
      animate();
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'value': function(newValue) {
      if (this.data.oldValue !== newValue) {
        this.updateDigits();
      }
    }
  }
});
