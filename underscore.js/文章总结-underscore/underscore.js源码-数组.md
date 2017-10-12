>这篇文章主要理解下数组这部分里面 平常写代码中经常可能遇到的地方，例如数组解嵌套， 数组去重等， 其它的一些方法在我的github源码解析项目中基本也都添加了详细的注解，地址：https://github.com/Hilda1227/source-code-analyze 有兴趣的话可以看下~~
##  flatten
在underscore.js中，提供了一个\_.flatten函数，作用是将类似于[1,[2,[3],4,[5,6]]]这样层层嵌套的数组去除里面的嵌套，返回一个类似[1,2,3,4,5,6]这样简单结构的数组，也可以根据传入的shallow参数来决定是否只去除里面一层嵌套，此函数实现如下：
```javascript
  // Flatten out an array, either recursively (by default), or just one level.
  // 给用户提供一个接口，array: 数组， shallow: 供用户决定是否只减少一维的嵌套
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };
```
这个函数似乎只做了一件事，调用了一个内部函数flatten，并将传给外部函数的array, shallow参数传给flatten, 那么重点就在这个flatten函数了，所以我们再来看下flatten函数又做了什么呢，下面是它的内部实现：  

```javascript
 // Internal implementation of a recursive `flatten` function.
  // 将一个嵌套多层的数组 array（数组） (嵌套可以是任何层数)转换为只有一层的数组。
  // 如果你传递 shallow参数，数组将只减少一维的嵌套。 
  // _.flatten([1, [2], [3, [[4]]]]);
  // => [1, 2, 3, 4];
  
  // _.flatten([1, [2], [3, [[4]]]], true);
  // => [1, 2, 3, [[4]]];
  // (此处函数用法描述参考自：http://www.css88.com/doc/underscore1.8.2/#flatten)

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
```
里面的大致思路是，遍历数组每一项  
1. 该项为数组，如果传入shallow为true, 即只解一层嵌套，就将该项里面的元素直接逐项复制到返回结果中，如果shallow值为false, 那么就需要递归调用flatten函数，直到不为数组
2. 该项不为数组，直接赋值到结果数组中即可  
。。。这个strict参数还未get到其深意，待理解了再来补充~~  

## uniq
```javascript
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
```
该实现思路大概是for循环遍历数组每一项，然后分为3种情况：
* 数组有序，则直接与前一项做比较， 不相等则放入结果数组
* 数组无序，有迭代函数，则判断seen中是否已经存在该迭代结果，没有则放入结果数组 
* 数组无序，没有迭代函数， 则直接判断结果数组中是否存在该项值， 没有则放入结果数组  

## 查找
underscore中有4个提供给用户的关于数组查找的函数：
1. \_.indexOf(array, value, [isSorted]) ：返回value在该 array 中的索引值。   
2. \_.lastIndexOf(array, value, [fromIndex]) ：返回value在该 array 中的从最后开始的索引值。    
3. \_.findIndex(array, predicate, [context]) :类似于\_.indexOf，当predicate通过真检查时，返回第一个索引值；否则返回-1。  
4. \_.findLastIndex(array, predicate, [context]) :和\_.findIndex类似，但反向迭代数组，当predicate通过真检查时，最接近末端的索引值将被返回。    

```javascript
 // Returns the first index on an array-like that passes a predicate test.
  // 正向查找
  _.findIndex = createPredicateIndexFinder(1);
  // 反向查找
  _.findLastIndex = createPredicateIndexFinder(-1);

 
  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  // _.findIndex, _.findLastIndex:正向， 反向查找数组中使传入的函数返回true的一项
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);
```
在源码中，它们由各自的工厂函数创建，先来看下createPredicateIndexFinder是如何实现的：  

```javascript
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
        // slice.call(array, i, length)：如果是类数组的话可以将其转化为数组
        // 例如在_.indexOf中，predicateFind就是_.findIndex
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
  ```
再看下createPredicateIndexFinder的实现：
```javascript
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
```
看起来createIndexFinder比createPredicateIndexFinder反而更复杂一些，因为寻找值相等的索引，还需要分数组是否有序，要查找的元素是否为NaN这些特殊情况，你可能会想，indexOf 和 lastIndexOf函数不是有现成的了吗，为何要这么麻烦再来封装一个，这是因为indexOf和 lastIndexOf 在ECMA-262 标准 的第5版中被加入，但并非所有的浏览器都支持该方法。而且原生的方法无法正确判断NaN这个特殊情况，那么如果以后你需要写一个indexOf的polyfill, 相信聪明的你一定已经有想法了~~

