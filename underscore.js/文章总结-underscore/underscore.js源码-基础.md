>最近在开始学习underscore.js的源码 从中可以学习到一些有用的小技巧， 也知道了原来一个框架是这样组织的，这篇文章就总结下一些基础部分的东西， 后续会接着完成集合， 数组， 函数， 对象等部分的学习和总结， 也希望可以由此打开我的源码学习之路，源码学习项目地址：https://github.com/Hilda1227/source-code-analyze

## 结构
框架中的所有代码，实际是由一个立即执行的匿名函数包裹，里面主要包含了一些内部函数（外部不可见，只供框架内部使用），以及一些提供给用户的方法函数(外部可通过 "_." 拿到，在外部 "_"是全局对象上的一个属性),结构大致如下：
```javascript
(function() {
  var A = function() {} // 内部函数
  _.B = function() {    // 提供给用户使用的函数
    A();
  }  
  ...
}());
```
通过匿名函数包裹，可以避免内部变量对全局环境的污染，在框架内部，"_"是一个变量，保存着一个函数，在外部和内部都可以直接通过 _(obj)的形式来无new构造 _ 类型的实例：
```javascript
  // Create a safe reference to the Underscore object for use below.
  // 将'_'声明为一个构造函数
  var _ = function(obj) {
    // 如果obj已经是'_'的实例，则直接返回原对象
    if (obj instanceof _) return obj;

    // 如果this不是'_'的实例，则用new运算符再次调用'_'函数 
    // 再次调用时，会创建一个新对象，这个对象是"_"的实例，所以会将obj赋值给新对象的_wrapped属性
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
    // 默认返回这个新对象
  };
```
 然后通过将内部变量 _ 赋值到全局对象的  "_" 属性上，再将需要提供给用户使用的函数赋值到 _ 函数的属性上，便为用户使用这些函数提供了途径，然而不同环境的全局对象是不同的，看下underscore的源码中对于获取全局环境的兼容写法是怎样的：
```javascript
   // 获取全局对象  
            // 浏览器窗口中全局对象是window或self，用self不用window是为了同时支持WebWorker，其工作线程的全局对象是self
  var root = typeof self == 'object' && self.self === self && self ||
            // node环境中全局对象为global
            typeof global == 'object' && global.global === global && global ||
            // 如果都不是 则返回this所指向的对象
            this ||
            // 如果没有this则返回一个空对象
            {};
  ---------------------------------
  // 然后再给全局对象的"_"属性赋值

  // 在CommonJS模块化环境中，将"_"赋值到外部可见的module.exports上 
  if (typeof exports != 'undefined' && !exports.nodeType) {
    if (typeof module != 'undefined' && !module.nodeType && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    // 否则，直接将变量"_"赋值到全局对象的"_"属性上
    root._ = _;
  }
```
如此一来内部的 _ 便与外部全局对象的 _ 属性建立起了联系，用户便有了使用这些封装好的方法的途径
  
## 优化
### 缓存常用数据
```javascript
// 将Array Object Symbol类型的原型对象赋值给各变量，同时缓存变量，方便压缩代码
  var ArrayProto = Array.prototype, ObjProto = Object.prototype;
  var SymbolProto = typeof Symbol !== '' ? Symbol.prototype : null;

  // Create quick reference variables for speed access to core prototypes.

  // 将常用的几种方法赋值给各变量， 
  var push = ArrayProto.push,
      slice = ArrayProto.slice,
      toString = ObjProto.toString,
      hasOwnProperty = ObjProto.hasOwnProperty;
```
这样做，可以方便快速获得这些方法，缓存变量，方便压缩代码， 并且减少在原型链中查找的次数
### call和apply
在underscore中，有这样一个内部函数：
```javascript
// Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  // 优化回调(特指函数中传入的回调)
  // 可以理解为返回一个函数，返回的函数与传入的func函数功能相同，只是经过了优化而已 
  // func 回调函数
  // context 上下文
  // argCount func函数的参数个数 
  var optimizeCb = function(func, context, argCount) {
    // 如果上下文为为空， 则返回原函数
    // void 0是一个真正的undefined 用void 0是为了防止undefined值被篡改 因为undefined是可以被赋值改写的
    if (context === void 0) return func;
    switch (argCount) {
      // 如果回调函数参数只有1个，那么我们在迭代过程中我们只需要值
      case 1: return function(value) {
        return func.call(context, value);
      };
      // The 2-parameter case has been omitted only because no current consumers
      // made use of it.
      // 两个回调函数参数的时候基本不存在这里省略
      case null:
      // 3个的情况类似forEach那么传入回调函数值(值，索引，被迭代集合对象)
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      // 4个的情况则是累加器，类似reduce(累加器，值，索引，被迭代集合对象)
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    // 如果没有执行上面的case，则直接用apply调用
    // 优先执行call的原因是 call比apply快很多，apply会进行检验和深拷贝
    // 参考链接:
    // https://segmentfault.com/q/1010000007894513
    // http://www.ecma-international.org/ecma-262/5.1/#sec-15.3.4.3
    // http://www.ecma-international.org/ecma-262/5.1/#sec-15.3.4.4
    // 此处参考自：https://github.com/hanzichi/underscore-analysis/blob/master/underscore-1.8.3.js/underscore-1.8.3-analysis.js

    // argCount不存在则直接返回一个绑定上下文的回调函数
    return function() {
      return func.apply(context, arguments);
    };
  };
  ```
  这个函数刚开始看的时候也有些懵逼，于是参考了其他大神对于这个函数的注解， 才get到了其深意，总之call比apply快了很多，可以的情况下尽量用call，这样对于效率的提升将会比较大，亲测~~  

  ## void 0 与 undefined 
  underscore中，几乎很少看到undefined, 而void 0 却用的比较频繁，void后面跟任何表达式返回的都是undefined, 自然也就选择了void 0来代替undefined, 因为undefined确是有可能被改写的，在浏览器下全局环境中是否能改写不能确定，而在局部作用域中，就很容易了，例如：
  ```javascript
  (function (){
    var undefined = 10;
    console.log(undefined); // 10
  }())
```
所以现在开始，void 0 用起来吧~~

## js中的|| 与 &&
这里介绍一个很基础的东西，应该对大部分人来说都不是啥问题，只是自己刚开始遇到真的有点不太清楚，所以在此记录下：  

* a && b : 将a, b转换为Boolean类型, 再执行逻辑与, true返回b, false返回a
* a || b : 将a, b转换为Boolean类型, 再执行逻辑或, true返回a, false返回b
转换规则: 1.对象为true, 2. 非零数字为true, 3.非空字符串为true, 4.其他为false



