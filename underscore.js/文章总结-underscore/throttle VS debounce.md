## 场景辨析  
在实际场景中，我们时常会遇到某个事件触发太频繁的情况，这将会造成很大的性能损失，其实很多时候我们并不需要如此频繁的执行，
那应该怎么办呢，这时候throttle(函数节流)和debounce(函数去抖)就派上用场了,但是它们俩有什么区别呢，这是很容易让人搞混的地方，
就例如高程三614面所提及的函数节流，实则应为函数去抖，下面就来为它俩的用途做一下场景辨析，然后自然就明白为什么了。
### debounce使用场景  
作用：事件以小于某个时间段的间隔连续触发时，使其只执行最后一次。  
场景举例：当用户连续狂点某表单提交按钮时，它会照着点击次数去提交那么多次，其实这时候我们只需要提交最后一次就足够了。
通过去抖，可以自动覆盖掉前面几次提交，只执行最后一次，避免由频繁的网络请求造成的性能下降。
2. 
### throttle使用场景
作用：事件以小于某个时间段的间隔连续触发时， 使其只在每隔该固定时间段执行一次。  
场景举例： 要保持某个div的高度始终等于屏幕的宽度时，监听了window.resize事件。拖动浏览器窗口改变大小时，事件将会触发的非常频繁，
通过设置合适的时间段进行函数节流，可以大大减小事件执行次数，而用户肉眼几乎观察不到什么差别，由此可以显著提高页面性能。
## 原理分析
### debounce  
先来看下面这个简单一点的函数去抖： 
```javascirpt  
const debounce = function (fn, delay) {
    let timer = null;
    return function () {
        const context = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args)
        }, delay)
    }
}  
```
不难分析，如果连续执行的时间间隔小于delay, 那么前面设置的定时器都将被覆盖掉，导致只执行最后的一次。了解了基本思想和原理，
下面再来看underscore中debounce的实现, 原本的英文注释和自己理解的注释都已附上  
 ```javascirpt  
  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    // 将要执行的函数进行封装，只要一执行， timeout就为null
    var later = function(context, args) {
      timeout = null;
      if (args) result = func.apply(context, args);
    };

    var debounced = restArgs(function(args) {
      // 只要timeout不为null, 就清除上一个定时器
      if (timeout) clearTimeout(timeout);
      // 如果传入immediate为true,
      if (immediate) {     
        var callNow = !timeout;
        // 设置执行later的定时器
        timeout = setTimeout(later, wait);
        // 并立即执行一次
        if (callNow) result = func.apply(this, args);
      } else {
        // 如果immediate为false，则设置下一个执行later的定时器
        timeout = _.delay(later, wait, this, args);
      }
      // 返回执行结果
      return result;
    });
    // 清除定时器
    debounced.cancel = function() {
      clearTimeout(timeout);
      timeout = null;
    };
    return debounced;
  };
```
underscore的版本比起穷人版的来说，一是：提供了使函数立即执行一次的途径，只要传入第三个immediate参数的值为true,
事件连续触发时，会立即执行一次。二是：提供了取消的途径，当不再需要对函数去抖时，调用.cancel方法即可。
### throttle
throttle的实现较之debounce更为复杂一点，所以为了便于理解，一样还是先来看个穷人版的吧  
```javascirpt 
const throttle = function (fn, delay){
  let last = null;
	return function () {
      let context = this, args = arguments;
      let now = new Date();
      // 如果达到了指定的时间间隔
      if(now-last >= delay){
          // 则更新上次执行的时间，并立即执行
          last = new Date();
          fn.apply(context, args); 
          return;                        
      }
    }
}
```
通过记录上次的执行时间，与这次调用的时间做对比，到了一定的时间间隔则立即调用，以此达到了函数节流的目的。还有另一个相似的版本是下面这个
```javascirpt  
const throttle = function (fn, delay){
    let last = null, timer = null;
	return function () {
        let context = this, args = arguments;
        let now = new Date();
        function later() {
            last = new Date();
            fn.apply(context, args)
        }
        // 如果达到了指定的时间间隔
        if(now-last >= delay){
            // 则更新上次执行的时间，并立即执行
            last = new Date();
            fn.apply(context, args);                
        } else {
            // 未达到时间， 就清除上次的定时器
            clearTimeout(timer);
            // 并设置新的定时器
            timer = setTimeout( later, delay)
        }
    }
}
```
区别在于如果调用的时候没有达到指定时间间隔，则清除以前的定时器，设置新的定时器，比起上一个版本会多执行最后的一次调用。为什么要提这个版本呢，是因为它和undersore中的实现就比较像了。接着上underscore的版本，比穷人版更健壮，并且提供了更多可设定的选项：  
```javascirpt  
  // 函数节流
  // func: 需要被节流的函数
  // wait: 执行的时间间隔
  // 默认情况下，throttle将在你调用的第一时间尽快执行这个function，并且，如果你在wait周期内调用任意次数的函数，都将尽快的被覆盖。
  // 如果你想禁用第一次首先执行的话，传递{leading: false}，
  // 还有如果你想禁用最后一次执行的话，传递{trailing: false}。
  _.throttle = function(func, wait, options) {
    var timeout, context, args, result;
    var previous = 0;
    if (!options) options = {};

    var later = function() { f 
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };

    var throttled = function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        // 如果有定时器， 则立即清除
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        // 更新上次执行的时间
        previous = now;
        // 立即执行
        result = func.apply(context, args);
        // 清空上下文和参数
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) { // timeout为null && 未禁用最后一次执行
        timeout = setTimeout(later, remaining);
      }
      return result;
    };

    throttled.cancel = function() {
      clearTimeout(timeout);
      previous = 0;
      timeout = context = args = null;
    };

    return throttled;
  };


```
