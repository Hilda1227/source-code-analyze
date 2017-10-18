var target = {};
var arg1 = {a: 1,b: {b1: 1, b2: 2}, c: {c1: 1, c2: 2, c3: 3}},
arg2 = {m: 'm1', n: [9,8,7]};

function extend(target) {
    var deep = false, args = Array.prototype.slice.call(arguments, 1);
    if(typeof target == 'boolean'){
        deep = target,
        target = args.shift();
    }
    args.forEach((arg) => {
        for(var key in arg){
            if (deep && arg[key] instanceof Object|| arg[key] instanceof Array){
                if(deep && arg[key] instanceof Object) target[key] = {};
                else target[key] = [];
                extend(deep, target[key], arg[key]);
            }
            else { target[key] = arg[key] }
        }
    });
    return target;
}