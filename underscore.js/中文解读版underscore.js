//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2017 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

// 外层一个立即执行函数包裹
(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` (`self`) in the browser, `global`
  // on the server, or `this` in some virtual machines. We use `self`
  // instead of `window` for `WebWorker` support.

  // 将全局对象赋给root，浏览器中是self(用self不用window是为了支持WebWorker，其全局对象是self)
  // node中为global, 否则为一个空对象
  var root = typeof self == 'object' && self.self === self && self ||
            typeof global == 'object' && global.global === global && global ||
            this ||
            {};

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:

  // 将Array Object Symbol类型的原型对象赋值给各变量，同时缓存变量，方便压缩代码
  var ArrayProto = Array.prototype, ObjProto = Object.prototype;
  var SymbolProto = typeof Symbol !== '' ? Symbol.prototype : null;

  // Create quick reference variables for speed access to core prototypes.

  // 将常用的几种方法赋值给各变量， 方便快速获得这些方法，缓存变量，方便压缩代码， 
  // 减少在原型链中查找的次数
  var push = ArrayProto.push,
      slice = ArrayProto.slice,
      toString = ObjProto.toString,
      hasOwnProperty = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.

  // ES5 原生方法, 如果浏览器支持, 则 underscore 中会优先使用
  var nativeIsArray = Array.isArray,
      nativeKeys = Object.keys,
      nativeCreate = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  // 将'_'声明为一个构造函数
  var _ = function(obj) {
    // 如果obj已经是'_'的实例，则直接返回原对象
    if (obj instanceof _) return obj;

    // 如果this不是'_'的实例，则用new运算符再次调用'_'函数 
    // 再次调用时，会创建一个新对象，并将obj赋值给新对象的_wrapped属性
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for their old module API. If we're in
  // the browser, add `_` as a global object.
  // (`nodeType` is checked to ensure that `module`
  // and `exports` are not HTML elements.)
  // 将"_"挂载到全局对象上
  // node服务器端CommonJS中
  if (typeof exports != 'undefined' && !exports.nodeType) {
    if (typeof module != 'undefined' && !module.nodeType && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    // 客户端中, self._ = _
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  // 优化回调(特指函数中传入的回调)
  // void 0是一个真正的undefined因为undefined是可以被赋值的
  // 防止undefined值被篡改
  // 接下来就是保证回调函数的执行上下文。
  // 如果回调函数参数只有1个，那么我们在迭代过程中我们只需要值
  // 两个回调函数参数的时候基本不存在这里省略
  // 3个的情况类似forEach那么传入回调函数值(值，索引，被迭代集合对象)
  // 4个的情况则是累加器，类似reduce(累加器，值，索引，被迭代集合对象)
  // argCount不存在则直接返回一个绑定上下文的回调函数
  var optimizeCb = function(func, context, argCount) {
    // 如果上下文为为空， 则返回原函数
    if (context === void 0) return func;
    switch (argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      // The 2-parameter case has been omitted only because no current consumers
      // made use of it.
      case null:
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
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
    return function() {
      return func.apply(context, arguments);
    };
  };

  var builtinIteratee;

  // An internal function to generate callbacks that can be applied to each
  // element in a collection, returning the desired result — either `identity`,
  // an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    // 如果_.iteratee已经被重写 用自定义的iteratee
    if (_.iteratee !== builtinIteratee) return _.iteratee(value, context);
    // 如果value为null 则返回一个直接返回传入值的函数
    if (value == null) return _.identity;
    // 如果value为函数，则返回一个经optimizeCb()优化的回调函数
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    // 如果value为对象，
    if (_.isObject(value) && !_.isArray(value)) return _.matcher(value);
    // 如果value是一个直接量， 则返回一个获取对象value属性值的函数
    return _.property(value);
  };


  // External wrapper for our callback generator. Users may customize
  // `_.iteratee` if they want additional predicate/iteratee shorthand styles.
  // This abstraction hides the internal-only argCount argument.
  // 定义迭代过程
  _.iteratee = builtinIteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // Similar to ES6's rest param (http://ariya.ofilabs.com/2013/03/es6-and-rest-parameter.html)
  // This accumulates the arguments passed into an array, after a given index.
  // /*
  //  *
  //  * @param func 函数
  //  * @param startIndex 开始的位置
  //  * @returns {function}
  //  */
  // 类似于ES6的rest参数，它将startIndex开始及后的参数放入一个数组中然后传入func
  var restArgs = function(func, startIndex) {
    // startIndex如果为空，则赋值为函数func的参数个数减一，'+startIndex'是为了将String类型转化为Number类型
    startIndex = startIndex == null ? func.length - 1 : +startIndex;
    return function() {
      var length = Math.max(arguments.length - startIndex, 0),
          rest = Array(length),
          index = 0;
      // 将arguments的startIndex开始至后面的参数复制给rest数组
      for (; index < length; index++) {
        rest[index] = arguments[index + startIndex];
      }
      // 常见的从0 1 2位置处开始转化数组的用call调用
      switch (startIndex) {
        case 0: return func.call(this, rest);
        case 1: return func.call(this, arguments[0], rest);
        case 2: return func.call(this, arguments[0], arguments[1], rest);
      }
      // startIndex较大的情况，将前面的参数也放入数组中，用apply调用
      var args = Array(startIndex + 1);
      for (index = 0; index < startIndex; index++) {
        args[index] = arguments[index];
      }
      args[startIndex] = rest;
      return func.apply(this, args);
    };
  };

  // An internal function for creating a new object that inherits from another.
  // 一个内部函数， 创建并返回一个继承自其他元素的新对象
  var baseCreate = function(prototype) {
    // 如果prototype不是一个对象则创建并返回一个{}对象
    if (!_.isObject(prototype)) return {};
    // 如果Create()方法存在，则直接调用nativeCreate(),
    // 创建并返回一个以prototype为原型的对象
    if (nativeCreate) return nativeCreate(prototype);
    // 若以上情况均不成立 则让Ctor.prototype = prototype，再用new调用Ctor创建新对象，如此一来新创建的对象便继承了prototype
    // 相当于是一个Object.create的polyfill
    Ctor.prototype = prototype;
    var result = new Ctor;
    // 将Ctor.prototype置空以便下次使用
    Ctor.prototype = null;
    return result;
  };
  
  // 获得对象的浅层属性
  var shallowProperty = function(key) {
    return function(obj) {
      // 此处void 0是undefind的代替，不仅能节省字节
      // 而且在低版本的浏览器中undefind可能会被重写，而void xx 永远返回undefined
      // 详情请见：(https://github.com/hanzichi/underscore-analysis/issues/1)
      return obj == null ? void 0 : obj[key];
    };
  };

  // 获得对象的深层属性
  // 例如：
  // var a= {a:{b:{c:1}}}
  // deepGet(a,['a','b','c'])
  // 1
  var deepGet = function(obj, path) {
    var length = path.length;
    for (var i = 0; i < length; i++) {
      if (obj == null) return void 0;
      obj = obj[path[i]];
    }
    return length ? obj : void 0;
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object.
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  // 最大安全值
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  // 取得length属性的函数
  var getLength = shallowProperty('length');
  // 判断是否是数组或者类数组
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };
  _.negate

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  // 迭代对象或数组的每一项
  // @param obj 用来迭代的对象或数组
  // @param iteratee 迭代方法
  // @param context 执行上下文
  _.each = _.forEach = function(obj, iteratee, context) {
    // 优化迭代方法
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    // 迭代数组
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      // 迭代对象
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    // 我们传递给的 _.map 的第二个参数就是一个 iteratee，他可能是函数，对象，甚至是字符串，
    // 内置函数cb 会将其统一处理为一个函数
    iteratee = cb(iteratee, context);
    
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  // reduce 函数的工厂函数, 用于生成一个 reducer, 通过参数决定 reduce 的方向
  // @param dir 方向 1(left) or 2(right)
  // @returns {function}

  var createReduce = function(dir) {
    // Wrap code that reassigns argument variables in a separate function than
    // the one that accesses `arguments.length` to avoid a perf hit. (#1991)
    var reducer = function(obj, iteratee, memo, initial) {
      // 有length属性则返回false, 没有length属性则返回obj的keys数组
      var keys = !isArrayLike(obj) && _.keys(obj),
          // 没有length属性 keys存在(非数组或类数组)，则返回keys的length
          // 有length属性(数组或类数组)，keys为false, 返回obj的length属性
          // 此做法是为了处理obj不是数组或类数组的情况
          length = (keys || obj).length,
          // 初始位置
          index = dir > 0 ? 0 : length - 1;
      // 如果没有传入初始位置，如果obj不是数组，则memo等于obj的keys[index]属性值
      // 如果obj是数组，则memo等于obj的index位置处的值
      if (!initial) {
        // memo为初始值
        memo = obj[keys ? keys[index] : index];
        // index移向下一位置
        index += dir;
      }
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    };

    return function(obj, iteratee, memo, context) {
      var initial = arguments.length >= 3;
      return reducer(obj, optimizeCb(iteratee, context, 4), memo, initial);
    };
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  // 产生左边方向开始迭代的函数
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  // 
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  // 查找一个对象或数组中使判断函数predicate返回true的属性，返回其匹配到的第一个属性值
  // @param obj 被查找的对象
  // @param predicate 判断函数
  // @param context 上下文
  // return 查找到的属性值 
  _.find = _.detect = function(obj, predicate, context) {
    // 根据obj的类型返回不同的查找函数
    // _.findIndex： 传入数组和判断函数，根据索引查找
    // _.findKey：传入对象和判断函数， 根据属性的key查找
    var keyFinder = isArrayLike(obj) ? _.findIndex : _.findKey;
    // 找到满足条件的属性key或者索引
    var key = keyFinder(obj, predicate, context);
    // 如果存在key满足条件， 则返回obj对象的该key的属性值
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  // 过滤出对象或数组的所有满足条件的元素值，并以数组的形式返回
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  // 过滤出对象或数组的所有 不！！！满足条件的元素值，并以数组的形式返回
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  // 判断对象的属性或数组元素是否每一项都使predicate返回true,
  // 是则返回true, 否则返回false
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  // 判断对象的属性或数组元素是否存在使predicate返回true的一项或多项,
  // 是则返回true, 否则返回false
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  // 判断一个数组或对象中是否存在指定的某项
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    // 如果obj不是数组，则取出其的所有属性值组成一个数组
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  // 在obj的每个元素上执行path方法
  // 任何传递给invoke的额外参数， invoke都会在调用path方法的时候传递给它。
  _.invoke = restArgs(function(obj, path, args) {
    var contextPath, func;
    if (_.isFunction(path)) {
      func = path;
    } else if (_.isArray(path)) {
      // 如果path是数组，contextPath取前n-1个
      contextPath = path.slice(0, -1);
      // path等于path最后一项
      path = path[path.length - 1];
    }
    return _.map(obj, function(context) {
      var method = func;
      if (!method) {
        if (contextPath && contextPath.length) {
          context = deepGet(context, contextPath);
        }
        if (context == null) return void 0;
        method = context[path];
      }
      return method == null ? method : method.apply(context, args);
    });
  });

  // Convenience version of a common use case of `map`: fetching a property.
  // 遍历obj的每一项，将其key属性的值放入数组中返回，没有则将undefind返回
  _.pluck = function(obj, key) {
    // _.property(key)返回一个函数，该函数返回传入对象的key属性值
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  // 过滤出obj中存在attrs的所有属性且相等的元素，返回
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  // 寻找obj中 存在attr中所有属性且值相等的一项，找到则立即返回这一项的值
  _.findWhere = function(obj, attrs) {
    // 寻找obj中第一个使_.matcher(attrs)返回ture的一项，返回该项的值
    // _.matcher(attrs)返回ture，即attr中的所有属性 目标值里都存在且相等
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  // 寻找obj中最大的一项，如果传入iteratee, 则以iteratee返回值obj作为排序的依据
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
        // 未传入iteratee时 或者iteratee为数值，并且obj不为空里面的元素不为对象时，以原值作为排序依据
    if (iteratee == null || (typeof iteratee == 'number' && typeof obj[0] != 'object') && obj != null) {
      // obj是数组时，等于原来的数组，为对象时等于值所组成的数组
      obj = isArrayLike(obj) ? obj : _.values(obj);
      // 比较找出最大的值
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value != null && value > result) {
          result = value;
        }
      }
    } else {
      // 否则
      iteratee = cb(iteratee, context);
      _.each(obj, function(v, index, list) {
        computed = iteratee(v, index, list);
        // 如果计算出来的值大于上次计算的值 或者 计算出来的值与已存的reuslt均为负无穷，
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          // 将此次迭代的值存在result上
          result = v;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  // 与_.max实现类似，寻找最小的
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null || (typeof iteratee == 'number' && typeof obj[0] != 'object') && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value != null && value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(v, index, list) {
        computed = iteratee(v, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = v;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection.
  _.shuffle = function(obj) {
    return _.sample(obj, Infinity);
  };

  // Sample **n** random values from a collection using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  // 从list中返回一个随机样本，传入数值n 则返回n个
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    // 兼顾对象与数组的情况
    var sample = isArrayLike(obj) ? _.clone(obj) : _.values(obj);
    var length = getLength(sample);
    // 兼顾 n 比obj长 或者 n<0 的情况
    n = Math.max(Math.min(n, length), 0);
    var last = length - 1;
    // 下面的循环打乱数组顺序
    for (var index = 0; index < n; index++) {
      // 从index到最后之间的随机一项
      var rand = _.random(index, last);
      // 交换sample[index]和sample[rand]的值
      var temp = sample[index];
      sample[index] = sample[rand];
      sample[rand] = temp;
    }
    // 返回一个截取前n项的数组
    return sample.slice(0, n);
  };

  // Sort the object's values by a criterion produced by an iteratee.
  // 取得 obj对象或数组 根据iteratee处理的值 排序后的 所有属性的值
  _.sortBy = function(obj, iteratee, context) {
    var index = 0;
    iteratee = cb(iteratee, context);
    
    return _.pluck(_.map(obj, function(value, key, list) {
      // 构造一个包含属性值， 索引 迭代值 的对象
      return {
        value: value,
        index: index++,
        criteria: iteratee(value, key, list)
      };

    }).sort(function(left, right) {  // 将对象根据迭代值排序
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      // 相等 返回-1
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  // 工厂函数
  // 返回一个接受三个参数的函数 obj：集合   iteratee: 迭代过程   context: 上下文
  // 返回的函数对集合的每一项执行iteratee并将结果key传入behavior执行
  // @param behavior: 决定返回函数的行为  
  //                  _.groupBy: 按迭代值分组; 
  //                  _.indexBy: 以迭代值作为索引存储集合该项的value;
  //                  _.indexBy: 按迭代值分别计数
  var group = function(behavior, partition) {
    return function(obj, iteratee, context) {
      // 根据传入的partition参数决定将result初始化为两个元素的数组还是一个对象
      // 此处是为了兼顾_.partition函数能够根据iteratee迭代结果是true 或 false来分组
      var result = partition ? [[], []] : {};
      iteratee = cb(iteratee, context);
      // 将集合的每一项经过iteratee求值，再结果key传入behavior中
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  // 根据传入的函数对集合进行分组，如果函数处理结果一致则放在同一组。.
  // 如果传入的是一个字符串而不是函数, 那么将使用 iterator 作为各元素的属性名来对比进行分组.
  _.groupBy = group(function(result, value, key) {
    // 如果result已经有key属性，则将其value放进result[key]对应的数组中，否则给result增加该属性。初始化为新数组[value]
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  // 下面两个函数上面已有解释， 不再赘述
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  var reStrSymbol = /[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;
  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    // 如果没有传入参数， 则返回一个空数组
    if (!obj) return [];
    // 如果obj是数组， 则返回数组的一个副本
    if (_.isArray(obj)) return slice.call(obj);
    // 如果是一个字符串 则用正则匹配来分割
    if (_.isString(obj)) {
      // Keep surrogate pair characters together
      return obj.match(reStrSymbol);
    }
    // 如果是类数组或数组 则遍历每一项，返回原来的数据， 组成一个新数组
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    // 如果是对象 则返回一个由所有属性值组成的数组
    return _.values(obj);
  };

  // Return the number of elements in an object.
  // 返回集合（对象，数组， 类数组）的元素个数
  _.size = function(obj) {
    // 如果传入一个空对象 返回 0
    if (obj == null) return 0;
    // 如果是数组或类数组， 则返回其长度， 否则则返回obj键的个数
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = group(function(result, value, pass) {
    result[pass ? 0 : 1].push(value);
  }, true);



  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    // 如果没有传入数组或数组里面没有元素， 返回undefined
    if (array == null || array.length < 1) return void 0;
    // 如果n为undefined或null, 默认返回第一个元素
    if (n == null || guard) return array[0];
    // 否则返回array除去后面length-n项，即前n项
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  // 返回数组除最后一项的所有项，若传入参数n, 则返回除后n项的所有项
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.

  _.last = function(array, n, guard) {
    // 如果没有传入数组或数组里面没有元素， 返回undefined
    if (array == null || array.length < 1) return void 0;
    // 如果n为undefined或null, 默认返回最后一个元素 
    if (n == null || guard) return array[array.length - 1];
    // 否则返回除前n个元素外的所有元素
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  // 返回数组除第一个元素外的所有元素
  // 若传入参数n, 则返回除前n个元素外的所有元素
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  // 返回一个去除掉数组中值为false的数组副本
  _.compact = function(array) {
    return _.filter(array, Boolean);
  };

  // Internal implementation of a recursive `flatten` function.
  // 将一个嵌套多层的数组 array（数组） (嵌套可以是任何层数)转换为只有一层的数组。
  // 如果你传递 shallow参数，数组将只减少一维的嵌套。 
  // _.flatten([1, [2], [3, [[4]]]]);
  // => [1, 2, 3, 4];
  
  // _.flatten([1, [2], [3, [[4]]]], true);
  // => [1, 2, 3, [[4]]];
  // (此处参考自：http://www.css88.com/doc/underscore1.8.2/#flatten)
  var flatten = function(input, shallow, strict, output) {
    // 如果有传入outout参数则用传入的， 没有就新建一个数组
    output = output || [];
    var idx = output.length;
    for (var i = 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      // 如果value是数组，或者arguments类数组          _.isArguments()：判断value是否是函数的arguments类数组对象
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        // Flatten current level of array or arguments object.
        // 如果传入shallow为true, 直接将数组value逐向项复制到output中
        if (shallow) {
          var j = 0, len = value.length;
          while (j < len) output[idx++] = value[j++];
        } else {
          // 否则递归调用flatten，将此时的output传入函数中，直到value不再是数组
          flatten(value, shallow, strict, output);
          // 递归调用以后，ouptput的长度已经改变，但外部的idx变量仍未更新，所以手动将idx指向数组最后一项的后面
          idx = output.length;
        }
      } else if (!strict) {
      // 如果strict为false的情况下，直接将该项赋值到output里面
        output[idx++] = value;
      }
    }
    return output;
  };
 // 重点掌握 递归调用！！！


  // Flatten out an array, either recursively (by default), or just one level.
  // 给用户提供一个接口，array: 数组， shallow: 供用户决定是否只减少一维的嵌套
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  // 与_.diffrence作用相似,返回array中，后面其余的参数里面不存在的部分
  // 用restArgs方法返回后的函数可以对array后面的参数增加一层数组嵌套, diffrence中再来解一层嵌套
  // 这样做对于类似_.without(array,[1,2],[3,4])的调用，在_.difference中可以将[1,2],[3,4]处理成[1,2,3,4]
  _.without = restArgs(function(array, otherArrays) {
    return _.difference(array, otherArrays);
  });

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  // 返回 array去重后的副本, 使用 === 做相等测试.
  // 如果您确定 array 已经排序, 那么给 isSorted 参数传递 true值, 此函数将运行的更快的算法.
  // 如果要处理对象元素, 传递 iteratee函数来获取要对比的属性.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    // 如果isSorted不是布尔值， 那传入的第二个参数就是迭代函数， 第三个参数是上下文，isSorted则为false
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    // 如果传入了iteratee且不为空
    if (iteratee != null) iteratee = cb(iteratee, context);
    // 保存结果
    var result = [];
    // 如果有数组有序，则用来保存上一次计算的结果
    // 如果无序，且iteratee存在 则用来保存所有已经存入结果数组中的项的计算结果
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      // 如果数组有序
      if (isSorted) {
        // 如果i为0（第一次循环）， 或者上次计算的结果与这次计算的结果不一致，则将这项元素存入结果数组中
        if (!i || seen !== computed) result.push(value);
        // 更新seen为此次计算的值
        seen = computed;
      } else if (iteratee) {
        // 如果数组无序，且iteratee存在
        if (!_.contains(seen, computed)) {
          // 如果seen中不包含此次计算的结果， 则直接将计算结果存入seen, 此次循环的值存入结果数组中
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        // 如果如果数组无序，也不存在iteratee， 那么如果result中不包含此次的value,
        // 则将这个value存入结果数组中
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  // 将传入的数据求并集，然后去重返回
  // 使用restArgs将传入的多个数组外加一层变成一个arrays数组
  _.union = restArgs(function(arrays) {
    // 先将arrays去掉一层嵌套，这样就得到多个数组的并集，然后去重，返回
    return _.uniq(flatten(arrays, true, true));
  });

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  // 返回多个数组的交集，去重后的副本
  _.intersection = function(array) {
    // 存储结果
    var result = [];
    // 参数个数
    var argsLength = arguments.length;
    // 遍历第一个参数数组
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      // 如果结果数组中已经包含这个值，则跳出此次循环，进入下一次循环
      if (_.contains(result, item)) continue;
      var j;
      // 遍历剩余的参数数组
      for (j = 1; j < argsLength; j++) {
        // 如果该数组里面不包含这项值，则跳出这个循环，不再遍历剩下的数组
        if (!_.contains(arguments[j], item)) break;
      }
      // 如果j === argsLength，则说明遍历完成，此项值是所数组的交集
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  // 返回所有array中 rest里面不存在的项
  _.difference = restArgs(function(array, rest) {
    // 将rest参数去掉一层嵌套 目的是可以将[[1,2],[3]]类型的数组转化成[1,2,3]形式的
    rest = flatten(rest, true, true);
    // 遍历array 判断rest中是否包含此项， 不包含则返回true
    return _.filter(array, function(value){
      // 返回array中rest里面没有的元素
      return !_.contains(rest, value);
    });
  });

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices.
  // _.unzip([['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]]);
  // =>["moe", 30, true], ["larry", 40, false], ["curly", 50, false]
  _.unzip = function(array) {
    // 如果array存在，则将其赋值为array里面length属性最大的length值，否则赋值为0
    var length = array && _.max(array, getLength).length || 0;
    // 新建一个数组用来保存结果
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      // _.pluck(array, index)将返回array里面每一项的index索引的值
      // 然后再赋值给result[index],如此就完成了值的合并
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  // _.zip(['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]);
  // => [["moe", 30, true], ["larry", 40, false], ["curly", 50, false]]
  // 个人感觉这样来理解好一点，_.unzip与_.zip的差别是：
  // _.unzip传入的是一个数组，里面包含了需要分项合并的各项数组
  // _.zip则直接分开传入需要合并的各项数组
  // 可以看到，他们实现的差别只是_.zip多了一层restArgs，来合并参数而已
  _.zip = restArgs(_.unzip);

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values. Passing by pairs is the reverse of _.pairs.
  // 将数组转化为对象
  // _.object([1,2,3,4,5],[1,2,3,4])
  // => {1: 1, 2: 2, 3: 3, 4: 4, 5: undefined}
  // _.object([1,2],[3,4])
  // => {1: 3, 2: 4}
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      // 如果存在第二个参数
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions.
  // 返回一个函数，该函数可遍历传入的数组，寻找使传入的函数predicate返回true的一项，
  // 若找到则返回该项索引，否则返回-1
  var createPredicateIndexFinder = function(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  };

  // Returns the first index on an array-like that passes a predicate test.
  // 正向查找
  _.findIndex = createPredicateIndexFinder(1);
  // 反向查找
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  // 寻找 当往一个有序数组插入元素时， 能保持数组继续有序的的位置，
  // 此有序指的是经过迭代函数之后的有序
  /*@param array 迭代数组
  * @param obj 要插入的目标值
  * @param iteratee 迭代函数
  * @param context 上下文
  * return Number类型  应该插入的位置*/
  
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    // 将目标值经过迭代函数
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    // 有序数组，使用二分法查找
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions.
  // 创造寻找满足条件的元素索引的函数的工厂函数, 可判断包括NaN在内的情况
  // dir: 查找方向
  // predicateFind： 查找判断，此处主要用来处理查找目标值为NaN的情况
  var createIndexFinder = function(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      // 如果传入的idx类型为Number
      if (typeof idx == 'number') {
        if (dir > 0) {  // 正向查找
          // 重置查找的起始位置  如果idx小于0，则从右边数第|idx|位开始查找
          i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {  // 反向查找
          // 重置length属性值
          length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        // 能用二分法查找的条件：有序 && idx!== 0 && length ！== 0
        // 用二分法查找，加快效率
        // 找到合适插入item的位置， 如果存在相等的一项，则找到的插入的位置就是相等元素的位置
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      // 如果item 为NaN
      if (item !== item) {
        // slice.call(array, i, length)：将类数组转化为数组
        // 找到array中使_isNaN返回true的一项，即NaN
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      // O(n) 遍历数组
      // 寻找和 item 相同的元素
      // 特判排除了 item 为 NaN 的情况
      // 可以放心地用 `===` 来判断是否相等了
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  };

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  // _.findIndex, _.findLastIndex:正向， 反向查找数组中使传入的函数返回true的一项
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  // 一个用来创建整数灵活编号的列表的函数，便于each 和 map循环。
  // 如果省略start则默认为 0；step 默认为 1.返回一个从start 到stop的整数的列表，用step来增加 （或减少）独占。
  // 值得注意的是，如果stop值在start前面（也就是stop值小于start值），那么值域会被认为是零长度，而不是负增长。
  // 如果你要一个负数的值域 ，请使用负数step.

  // _.range(10);
  // => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  // _.range(1, 11);
  // => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  // _.range(0, 30, 5);
  // => [0, 5, 10, 15, 20, 25]
  // _.range(0, -10, -1);
  // => [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
  // _.range(0);
  // => [] 
  // 此处引用自 http://www.css88.com/doc/underscore1.8.2/#range
  _.range = function(start, stop, step) {
    if (stop == null) {
      // 如果没有传入stop 那么就将start作为stop,start置为0
      stop = start || 0;
      start = 0;
    }
    // 如果step不存在或为0，那么就根据stop < start的结果决定将step置为-1或1
    if (!step) {
      step = stop < start ? -1 : 1;
    }
    // Math.ceil(x)返回大于参数x的最小整数
    // length为要返回的数组长度
    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Split an **array** into several arrays containing **count** or less elements
  // of initial array.
  // 将数组分割成几个数组，每个数组含有指定个数count或更少的元素
  // 若未传入有效的count，则返回一个空数组 
  _.chunk = function(array, count) {
    if (count == null || count < 1) return [];

    var result = [];
    var i = 0, length = array.length;
    while (i < length) {
      result.push(slice.call(array, i, i += count));
    }
    return result;
  };

  // ---------函数部分---------
  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments.
  // 决定是否作为一个构造函数去执行，或者一作为个带有所提供的参数的普通函数执行
  // 要针对的是为了将函数调用模式更改为构造器调用和方法调用。
  // sourceFunc：原函数，待绑定函数
  // boundFunc： 绑定后函数
  // context：需要让函数绑定的上下文
  // callingContext：调用bound函数时的上下文，即this
  // args：绑定后的函数执行所需参数
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    // 无new调用
    // 如果上下文不是boundFunc的实例，即不是new调用 返回原函数以context为上下文调用的结果
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    // new调用
    // 创建一个对象，该对象以原函数的原型对象为原型
    var self = baseCreate(sourceFunc.prototype);
    // 以该对象为上下文调用原函数
    var result = sourceFunc.apply(self, args);
    // 如果调用结果是对象则返回该对象
    if (_.isObject(result)) return result;
    // 否则返回上面创建的新对象
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  // 绑定函数 function 到对象 object 上, 也就是无论何时调用函数, 函数里的 this 都指向这个 object.
  // 任意可选参数 arguments 可以传递给函数 function , 可以填充函数所需要的参数,这也被称为 partial application。
  // 对于没有结合上下文的partial application绑定，请使用partial。 
  // (愚人码头注：partial application翻译成“部分应用”或者“偏函数应用”。partial application可以被描述为一个函数，
  // 它接受一定数目的参数，绑定值到一个或多个这些参数，并返回一个新的函数，这个返回函数只接受剩余未绑定值的参数
  // 引用自 http://www.css88.com/doc/underscore1.8.2/#range
  _.bind = restArgs(function(func, context, args) {
    // 如果func不是一个函数，抛出错误
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    // bound等于一个将参数rest化后的函数
    var bound = restArgs(function(callArgs) {
      // func: 原函数，bound: 绑定后的函数，context:绑定后函数的上下文, this: 绑定后函数的上下文, args.concat(callArgs): 函数的所有参数
      return executeBound(func, bound, context, this, args.concat(callArgs));
    });
    return bound;
  });

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder by default, allowing any combination of arguments to be
  // pre-filled. Set `_.partial.placeholder` for a custom placeholder argument.
  // 先传入部分参数， 可用 _ 做占位符，等到调用所返回的函数时，再用后面传入的参数填充占位符，剩下的则追加在后面
  // 可以理解为函数柯里化，增加了占位符的功能
  _.partial = restArgs(function(func, boundArgs) {
    var placeholder = _.partial.placeholder;
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      // 如果是占位符，则赋值为对应的bound传入的参数， 否则赋值为boundArgs对应位置的参数
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === placeholder ? arguments[position++] : boundArgs[i];
      }
      // 如果bound传入的参数还有剩余的，则将剩下的全部追加在后面
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  });
  // 总的实现思路大概就是拼参数，然后apply调用
  // 供用户可自定义占位符
  _.partial.placeholder = _;

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  // 给keys里面的多个函数方法绑定到同一个obj上下文
  // 先用restArgs()将obj后面的参数rest化
  _.bindAll = restArgs(function(obj, keys) {
    // 将keys深层解嵌套
    keys = flatten(keys, false, false);
    var index = keys.length;
    if (index < 1) throw new Error('bindAll must be passed function names');
    while (index--) {
      var key = keys[index];
      obj[key] = _.bind(obj[key], obj);
    }
  });

  // Memoize an expensive function by storing its results.
  // Memoizes方法可以缓存某函数的计算结果
  // 如果传递了 hashFunction 参数，就用 hashFunction 的返回值作为key存储函数的计算结果
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      // 如果传入了hasher函数，则用hasher来生成key值， 否则就用穿入的key做键值
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      // 如果cache里面没有这个键值， 则重新计算 并给cache里面该键赋值
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      // 返回cache里面的该值
      return cache[address];
    };
    // 将 memoize.cache初始化为一个空对象
    memoize.cache = {};
    return memoize;
  };
  // 此处推荐韩子尺的这篇:从斐波那契数列求值优化谈 _.memoize 方法 ,地址：https://toutiao.io/posts/fscssn/preview

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  // 延迟调用func，直到到达了指定时间并且当前调用栈已经为空为止，
  // func之后的参数将作为func的参数调用
  _.delay = restArgs(function(func, wait, args) {
    return setTimeout(function() {
      return func.apply(null, args);
    }, wait);
  });

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  // _.defer(func, args, ......) 
  // fanc: 用于填充delay后面的占位符
  // 剩下的参数会被补充到 1 后面
  // 返回的函数 相当于执行的就是 _.delay(func, 1, args)， 即将func延迟一秒执行
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.

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

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  // 返回一个函数， 该函数将func作为它的第一个参数，执行该函数相当于执行 wrapper(func){...}
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  // 返回一个函数，该函数执行结果与传入的predicate函数执行结果相反
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  // 返回函数集 functions 组合后的复合函数, 也就是一个函数执行完之后把返回的结果再作为参数赋给下一个函数来执行. 以此类推.
  // 在数学里, 把函数 f(), g(), 和 h() 组合起来可以得到复合函数 f(g(h()))。
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  // 返回一个函数，该函数只有调用了times次后，才会调用func
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  // 返回一个函数，该函数只会调用times-1次，最后一次的调用结果将会被记住并返回
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  // 创建一个只会调用一次的函数
  _.once = _.partial(_.before, 2);

  _.restArgs = restArgs;

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  // 以此判断是否在IE9以下的浏览器中
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  var collectNonEnumProps = function(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = _.isFunction(constructor) && constructor.prototype || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  };

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`.
  _.keys = function(obj) {
    // 如果不是对象 则返回一个空数组
    if (!_.isObject(obj)) return [];
    // 如果原生keys方存在，则用原生keys方法
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    // 遍历对象，把所有属于obj对象自身的键放进keys数组
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9. 
    // profill IE9以下的对象的属性不能被for in 遍历
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    // 不是对象则返回一个空数组
    if (!_.isObject(obj)) return [];
    var keys = [];
    // 遍历对象，把所有对象自身及原型对象上可枚举的键放进keys数组
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  // 返回一个包含该对象的所有属性值的数组
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object.
  // In contrast to _.map it returns an object.
  // 和map作用类似，但它返回的是一个对象
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = _.keys(obj),
        length = keys.length,
        results = {};
    for (var index = 0; index < length; index++) {
      var currentKey = keys[index];
      results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  // The opposite of _.object.
  // 将一个对象转化为键值对的数组，如：
  // {a:1, b:2} => [[a,1],[b,2]]
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  // 返回一个object副本，使其键（keys）和值（values）对换。
  // 对于这个操作，必须确保object里所有的值都是唯一的且可以序列化成字符串.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`.
  // 返回一个对象里的所有方法名
  // 且返回的数组已经排序
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // An internal function for creating assigner functions.
  // 下面三个方法的的工厂函数
  // _.extend = createAssigner(_.allKeys); 复制所有attrs对象及其原型上的所有可枚举属性
  // _.extendOwn = _.assign = createAssigner(_.keys);复制attrs自身对象上的所有可枚举属性
  // _.defaults = createAssigner(_.allKeys, true);同_.extend,区别在于后面的不会覆盖前面赋值的属性
  var createAssigner = function(keysFunc, defaults) {
    return function(obj) {
      var length = arguments.length;
      if (defaults) obj = Object(obj);
      // 如果参数个数小于2或者obj为空， 则返回原对象
      if (length < 2 || obj == null) return obj;
      // 遍历除第一个参数后面的所有参数，
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            // keysFunc为传入的_.keys或者_.allKeys
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          // 如果default为false或者没有传入default,一定会给obj[key]赋值
          // 若default为true, 那么如果该属性等于undefined，则会赋值，否则不会赋值
          // 此是为了兼顾_.default方法，传入default参数，决定后面的属性是否会覆盖前面相同的属性
          if (!defaults || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s).
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test.
  // 寻找obj中使函数predicate返回true的一项属性，找到则返回该属性键
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Internal pick helper function to determine if `obj` has key `key`.
 
  var keyInObj = function(value, key, obj) {
  // 此处延伸下关于in运算符
  // 如果指定的属性存在于指定的对象中，则 in 运算符会返回 true。
  // in右操作数必须是一个对象值。比如，可以是一个String包装对象，但不能是一个字符串原始值。例如：   
  // var color1 = new String("green");
  // "length" in color1 // 返回true
  // var color2 = "coral";
  // "length" in color2 // 报错(color2不是对象)
  // 如果一个属性是从原型链上继承来的，in 运算符也会返回 true。例如：
  // "toString" in {}; // 返回true
    return key in obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  // 返回一个object副本，只过滤出keys(有效的键组成的数组)参数指定的属性值。或者接受一个判断函数，指定挑选哪个key。
  _.pick = restArgs(function(obj, keys) {
    var result = {}, iteratee = keys[0];
    // 如果obj为空， 则返回一个空对象
    if (obj == null) return result;
    // 如果iteratee是一个函数
    if (_.isFunction(iteratee)) {
      // 对iteratee进行优化
      if (keys.length > 1) iteratee = optimizeCb(iteratee, keys[1]);
      // 拿到obj对象上（包括原型对象的）的所有可枚举属性，赋值给keys
      keys = _.allKeys(obj);
    } else {
      // 如果iteratee不是一个函数
      iteratee = keyInObj;
      // 对传入的keys深层解嵌套 ！！！注意了，两种情况，keys赋的值不是一个东西
      keys = flatten(keys, false, false);
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      // 如果iteratee返回true，就将该属性复制给result
      // iteratee返回true，即obj中的属性使iteratee，
      // 或者，只需要keys中指定的属性，在obj中存在
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  });

  // Return a copy of the object without the blacklisted properties.
  // 与_.pick作用相反
  // 返回一个object副本，只过滤出除去keys(有效的键组成的数组)参数指定的属性值。
  // 或者接受一个判断函数，指定忽略哪个key。
  _.omit = restArgs(function(obj, keys) {
    var iteratee = keys[0], context;
    if (_.isFunction(iteratee)) {
      // 如果iteratee是函数， 将它转化为执行结果相反的函数
      iteratee = _.negate(iteratee);
      // 如果有3个参数， 则第3个作为上下文
      if (keys.length > 1) context = keys[1];
    } else {
      // 如果iteratee不是函数，则将keys深层解嵌套后全部转化为字符串
      keys = _.map(flatten(keys, false, false), String);
      // iteratee赋值为一个函数，如果keys里面不包含传入的key,则返回true, 包含则返回false
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    // 从obj中挑选出使使iteratee返回true的属性
    return _.pick(obj, iteratee, context);
  });

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  // 
  _.clone = function(obj) {
    // 如果obj不是一个对象， 则返回原obj 
    if (!_.isObject(obj)) return obj;
    // 如果是数组的话，用slice复制一个新数组，否则返回将obj的属性复制到了{}上的对象
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  // 将obj作为interceptor的参数调用，并返回obj
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  // 判断是否attr中的所有属性在object中都存在并且相等
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      // attr一旦有一个属性与object中的不相等，或object不存在该属性
      // 则返回false
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq, deepEq;
  eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    // 如果a===b, 1：有可能真的全等，2：也可能是+0 === -0，此时1/+0 !== 1/-0,所以这种情况应判断为不等
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // `null` or `` only equal to itself (strict comparison).
    
    if (a == null || b == null) return false;
    // `NaN`s are equivalent, but non-reflexive.
    // 如果两者都不等于自身， 则他们的值都为NaN,判断为相等
    if (a !== a) return b !== b;
    // Exhaust primitive checks
    var type = typeof a;
    if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;
    return deepEq(a, b, aStack, bStack);
  };

  // Internal recursive comparison function for `isEqual`.
  deepEq = function(a, b, aStack, bStack) {
    // Unwrap any wrapped objects.
    // 如果a和b是_的实例对象， a b赋值为其_wrapped属性值
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    // 如果类型不同， 则返回false
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    // 后面的情况类型则一定相等
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        // 如果是 RegExp或者String类型
        // 转化为String类型后再 === 比较
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN.
        // 如果a为NaN,则如果b也为NaN,就返回相等，否则不等
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
      case '[object Symbol]':
        return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
    }

    var areArrays = className === '[object Array]';
    // 如果不是数组
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    // 传了aStack则等于传入的， 没传就等于一个空数组
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    // 如果是数组
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      // 如果长度不等则不必再做比较， 直接返回false
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError, isMap, isWeakMap, isSet, isWeakSet.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error', 'Symbol', 'Map', 'WeakMap', 'Set', 'WeakSet'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), Safari 8 (#1929), and PhantomJS (#2236).
  var nodelist = root.document && root.document.childNodes;
  if (typeof /./ != 'function' && typeof Int8Array != 'object' && typeof nodelist != 'function') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    // 不是NaN 并且 是有穷的， 这个_.isSymbol哪儿跑出来的？
    return !_.isSymbol(obj) && isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`?
  // 判断值是否为isNaN
  _.isNaN = function(obj) {
    return _.isNumber(obj) && isNaN(obj);
  };

  // Is a given value a boolean?
  // 判断obj是否是布尔值
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  // 判断是否是null
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable ?
  // 判断是否是一个已经声明，但未赋值，或赋值为undefined的变量
  _.is = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
 // 判断对象是否有某个属性
  _.has = function(obj, path) {
    // 浅层属性
    if (!_.isArray(path)) {
      return obj != null && hasOwnProperty.call(obj, path);
    }
    // 深层属性
    var length = path.length;
    for (var i = 0; i < length; i++) {
      var key = path[i];
      if (obj == null || !hasOwnProperty.call(obj, key)) {
        return false;
      }
      obj = obj[key];
    }
    return !!length;
  };

 // -------工具类方法------
  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  // 如果全局环境中已经使用了 `_` 变量
  // 可以用该方法返回其他变量
  // 继续使用 underscore 中的方法
  // var underscore = _.noConflict();
  // underscore.each(..);

  // 来理一下  _ 是一个函数， 整个框架内部所有提供给用户的方法都是赋值给 _ 的属性的， 函数 _ 是全局变量 _ 的值
  // 调用 _.noConflict，返回 _ 函数，结果赋值给其他变量
  // 那么我们就有办法通过这个变量继续拿到 _ 函数， 并拿到 _ 函数上的属性值啦
  _.noConflict = function() {
    // 上面那步 var previousUnderscore = root._ ,将全局环境中已经存在的 _ 保存起来
    // 这一步则将 _ 的使用权重新交给 外部变量， 避免外部的 _ 对象被覆盖
    // 例如 :
    // var _ = {name: "test"}
    // var underscore = _.noConflict()  
    // 这样一来外部的 _ 就不会被underscore的 _ 取代， this所指向的 _ 函数也返回赋值给了“underscore”
    // 我们便可以通过underscore.xx,继续使用其方法
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  // 直接返回传入的值，整个框架只有两个地方用到了
  // 1：cb函数里， 为了即使没有传入迭代函数，也能返回一个函数， 就是它啦
  // 2：_.toArray里面， 为了通过_.map迭代，而将类数组转化为数组
  // 通过这个方法，现在我们想要复制一个数组的话 可以这样：
  // var newAry = [1,2,3,4],map(_.identity);
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  // 返回一个函数， 该函数返回传入的原值
  _.constant = function(value) {
    return function() {
      return value;
    };
  };
  // 一个空函数
  _.noop = function(){};

// 返回一个函数，该函数用来取得path属性值
  _.property = function(path) {
    if (!_.isArray(path)) {
      return shallowProperty(path);
    }
    return function(obj) {
      return deepGet(obj, path);
    };
  };

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    // 如果对象为空， 返回一个空函数
    if (obj == null) {
      return function(){};
    }
    // 否则返回一个函数，给该函数传入path参数，返回obj里面的path属性
    // 如果path不是数组， 直接返回obj[path], 否则返回obj的深层path属性
    return function(path) {
      return !_.isArray(path) ? obj[path] : deepGet(obj, path);
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    // 将attrs上的所有自身属性复制到{}上
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      // 判断是否attrs中的所有属性obj中都存在且相等
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  // 执行一个函数n次，将每次的执行结果存入数组里返回
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  // 返回一个min到max之间的一个数，只传入min时，返回一个0 min的数值
  _.random = function(min, max) {
    // 如果没有传入max
    if (max == null) {
      max = min;
      min = 0;
    }
    // Math.floor：返回一个与该浮点数最接近的整数
    // 为啥要加个1勒？
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  // 调用返回一个当前时间的时间戳
  _.now = Date.now || function() {
    return new Date().getTime();
  };

  // List of HTML entities for escaping.
  // html预留字符 与其对应的实体编码
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  // 将escapeMap键值对反转，用于解码
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  // 返回一个函数,向该函数传入字符串，能返回对应的html预留字符，或其实体编码
  var createEscaper = function(map) {    // 该函数返回map的match变量属性值
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped.
    // 构造一个正则表达式，如RegExp((?:&|<|>|"|'|`))或者RegExp((?:&amp;|&lt;|&gt;|&quot;|&#x27;|&#x60;))
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  // 用于编码,例如：
  // _.escape(">")
  // => "&gt;"
  _.escape = createEscaper(escapeMap);
  // 用于解码，例如：
  // _.unescape("&gt;")
  // => ">"
  _.unescape = createEscaper(unescapeMap);

  // Traverses the children of `obj` along `path`. If a child is a function, it
  // is invoked with its parent as context. Returns the value of the final
  // child, or `fallback` if any child is .
  // 如果对象 object 中的属性 property 是函数, 则调用它, 否则, 返回它。
  _.result = function(obj, path, fallback) {
    if (!_.isArray(path)) path = [path];
    var length = path.length;
    // 如果path长度为0, fallback是函数的话返回fallback调用的结果，否则返回fallback原函数
    if (!length) {
      return _.isFunction(fallback) ? fallback.call(obj) : fallback;
    }
    for (var i = 0; i < length; i++) {
      var prop = obj == null ? void 0 : obj[path[i]];
      // 如果该属性值为undefined，
      if (prop === void 0) {
        prop = fallback;
        i = length; // Ensure we don't continue iterating.
      }
      // 如果对象 object 中的属性 property 是函数, 则调用它, 否则, 返回它。
      obj = _.isFunction(prop) ? prop.call(obj) : prop;
    }
    return obj;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  // 生成一个全局唯一的id。如果prefix参数存在将附加在id前面
  _.uniqueId = function(prefix) {
    // 将 idCounter 加 1 然后转化为String类型
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  // 1. <%  %> - to execute some code
  // 2. <%= %> - to print some value in template
  // 3. <%- %> - to print some values HTML escaped
  _.templateSettings = {
    // 三种渲染模板
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };
  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  // 
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  // 某些字符需要转义，以便将它们放入字符串直接量。
  var escapes = {
    '\\': '\\',  // 反斜杠
    '\r': 'r',   // 回车符
    '\n': 'n',   // 换行符
    '\u2028': 'u2028', // 四个十六进制数字表示的 Unicode 字符
    '\u2029': 'u2029'
  };

  var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    /**
      \\     => \\\\
      \r     => \\r
      \n     => \\n
      \u2028 => \\u2028
      \u2029 => \\u2029
    **/
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  // 参考链接：
  // https://github.com/hanzichi/underscore-analysis/issues/25
  // http://www.css88.com/doc/underscore1.8.2/#template
  // _.template(templateString, [settings]) 
  _.template = function(text, settings, oldSettings) {
    
    if (!settings && oldSettings) settings = oldSettings;
    // 设置模板字符串，以setting优先
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    // 正则表达式 pattern，用于正则匹配 text 字符串中的模板字符串
    // /<%-([\s\S]+?)%>|<%=([\s\S]+?)%>|<%([\s\S]+?)%>|$/g
    var matcher = RegExp([
      (settings.escape || noMatch).source,      // source 属性用于返回模式匹配所用的正则文本。
      (settings.interpolate || noMatch).source, // /<%([\s\S]+?)%>/g.source  => "<%([\s\S]+?)%>"
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    // text为_.template传入的模板字符串
    // matcher: 模式串，
    // match：该次匹配的子串，
    // escape： 正则表达式中第一个圆括号匹配到的字符串
    // interpolate： 正则表达式中第二个圆括号匹配到的字符串
    // evaluate：正则表达式中第三个圆括号匹配到的字符串
    // offset: 匹配到的子字符串在原字符串中的偏移量。（比如，如果原字符串是“abcd”，匹配到的子字符串是“bc”，那么这个参数将是1）
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      // 将转义字符替换掉
      source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
      // 调整下次拼接的开始位置
      index = offset + match.length;

      if (escape) {
        // 对变量进行编码（=> HTML 实体编码）
        // 避免 XSS 攻击
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offset.
      // 并不改变匹配到的字符串，直接返回原文本
      // 此函数的作用是为了改变source值
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    var render;
    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  
   // 关于链式调用参考链接：
  // https://zhuanlan.zhihu.com/p/27878899
  // https://yoyoyohamapi.gitbooks.io/undersercore-analysis/content/supply/%E9%93%BE%E5%BC%8F%E8%B0%83%E7%94%A8.html

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  // 根据instance的_chain属性，决定是否设置obj的_chain属性属性
  var chainResult = function(instance, obj) {
    // 如果实例对象的_chain属性为true,即需要链式操作，则将执行结果(这里即obj)构造为underscore对象,
    // 并调用chain()方法，使得可以继续后续的链式操作
    // 否则直接返回obj
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      // 将obj上的方法挂载到 _ 上
      var func = _[name] = obj[name];
      // 
      _.prototype[name] = function() {
        // 取出调用该函数的实例对象的wrap属性，将该属性值与调用时传入的参数合并为一个数组
        var args = [this._wrapped];
        push.apply(args, arguments);
        // this: 调用对象     func.apply(_, args)： func函数执行结果
        return chainResult(this, func.apply(_, args));
      };
    });
    return _;
  };

  // Add all of the Underscore functions to the wrapper object.
  // _ 上挂载的所有方法经过_.mixin后
  // 例如以前必须通过 var a = {a:1};  _.map(a), _.chain(a)形式调用的函数，
  // 现在可以,var a = _({a:1});  a.map();  a.chain()的形式来调用, 这样就可以解释为什么chainResult函数
  // 中可以 _(obj).chain()这样来写了
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    // Array原型中的对应数组方法
    var method = ArrayProto[name];
    // 将这些原生数组方法添加到underscore的原型对象中去
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      // 如果是'shift'方法或者'splice'方法，并且实例对象的length属性为0, 就删除第一项的值，即变为undefined
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      // 如果this指向的实例对象 _chain属性为true 则将obj构造为可链式调用的underscore对象并返回
      // 否则返回原obj
      return chainResult(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      // 此处作用同上
      return chainResult(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  // _.prototype.value(): 调用可以获取被包裹的原始 对象
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return String(this._wrapped);
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define == 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }

}());
