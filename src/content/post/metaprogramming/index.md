---
title: "Metaprogramming"
publishDate: "2023/09/10"
description: "This post is about metaprogramming. What is meta programming?"
tags: ["meta", "meta programming", "proxy", "reflect"]
---

## What is metaprogramming?

### Metaprogramming? Metacognition?

To understand the concept of metaprogramming, we must first understand the word "meta".
Where does the word meta come from, which we are somewhat familiar with through the term metacognition?


**Meta** is an English word derived from the Greek, meaning 'about' or 'beyond' and refers to the abstraction and reflection on an object or concept at a higher level.
In other words, metadata is data about data, and metacognition is cognition about cognition.

Let's break it down a bit further. Metacognition is thinking about the fact that you are thinking, while metaprogramming is code "manipulating" itself.
This means that a program can read, analyse, and modify its own structure and behaviour.

As cognitive agents, humans can perceive their own cognition at a higher level in order to objectify their cognition.
They can also be aware of the self that is aware of their awareness.
And the self that is aware of the self that is aware of the self that is aware of the self... can constantly ascend to higher levels.

![A cartoon cactus looking at the Astro.build logo](./looking-down.jpg)

The concept of metaprogramming is similar to metacognition.
It refers to the ability of a program to examine its own instructions or structure and modify them or create new ones as needed.
This, of course, requires that the code be able to recognise and understand itself.

Metaprogramming makes it possible to give programs greater flexibility and dynamic capabilities.
Code no longer follows a single execution flow, but can modify itself during execution.

Especially in the runtime of dynamic languages like JavaScript, metaprogramming can be a powerful tool.

## Metaprogramming in JavaScript

Read the description of [MetaProgramming in MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming).

> The Proxy and Reflect objects allow you to intercept and define custom behavior for fundamental language operations (e.g. property lookup, assignment, enumeration, function invocation, etc.). With the help of these two objects you are able to program at the meta level of JavaScript.

For metaprogramming, JavaScript supports Reflect and Proxy objects, which help you intercept the language's default behaviour and provide custom behaviour.

### Reflection

Reflection is the ability of a program to inspect, evaluate, and modify its own structure and behaviour at runtime. It is used to observe and modify programs at runtime and is a key concept for metaprogramming.

#### JavaScript Reflect

JavaScript implements reflection through the Reflect object. Reflect is not a function object and all its properties and methods are static.

Here's an example of using Reflect to check if a property exists on an object.

```javascript
Reflect.has(Object, "assign"); // true
Object.hasOwnProperty("assign"); // true
```

Compare the two pieces of code, one that uses Reflect to check if an Object's 'assign' exists, and one that uses the Object.hasOwnProperty method to check if an 'assign' exists.

There is no difference in the return values, but the way they are called already reveals the concept of metaprogramming.

Reflect.has(Object, "assign") checks if a property named 'assign' exists in the global object named Object.

If you're thinking, "Doesn't Object.hasOwnProperty("assign") do the same thing?", you're right.

But let's look at how it's called.

In Reflect.has(Object, "assign"), it is the **Reflect.has** method that checks if 'assign' exists on Object.
On the other hand, in Object.hasOwnProperty("assign"), it is **Object** that checks if 'assign' exists.

In the previous section, I said that metaprogramming is code being self-aware. This is the difference between knowing that Object has assign via Reflect and receiving the result of calling hasOwnProperty on Object.

Another difference is that Reflect.has also allows you to detect properties that exist in the object's prototype chain.

```javascript
const x = {
  y: 0
}
// x has no property named 'toString' but it exists in the prototype chain
Reflect.has(x, "toString"); // true
x.hasOwnProperty("toString"); // false

!!x['toString'] // true
```

"I can just validate it with x["toString"]!"

But as they say, metaprogramming isn't about checking the results of your execution, it's about being self-aware at a higher level.

Let's look at a slightly different example.

```javascript
let y = 0

const x = {
  get y(){ return ++y }
}

x.y;                  // 1
Reflect.has(x, "y");  // true
x.y                   // 2
!!x["y"]              // true
x.y                   // 4
x.hasOwnProperty("y") // true
x.y                   // 5
```

I've made the return value increment with the number of times an object x accesses y.
Referencing via x.y will increment y by one, but checking that property via Reflect.has will not.

Verifying via hasOwnProperty also doesn't increment y, but as mentioned earlier, hasOwnProperty can't detect properties that exist in the prototype chain.

So,

1. Checking if object x has y = Reflect.has(x, "y")
2. Accessing y on object x and seeing the result = !!x["y"] (essentially the same as x.y)
3. Asking an object x if it has y = x.hasOwnProperty("y")

These are three very different things.


### Proxy
A proxy is a concept that is often mentioned in programming, and is familiar from the design pattern, the proxy pattern.
It is a pattern used to intercept or change the behaviour of a real object before accessing it, often for caching or validation purposes.

#### JavaScript Proxy

In a previous article, we already introduced the use of proxy objects to intercept the behaviour of a mocking object and validate access to unmocked values.

https://nookpi.tistory.com/183

#### Creating and Using Proxy Objects

In JavaScript, you can create proxy objects with the Proxy constructor, and then control their behaviour, such as accessing, modifying, and calling them.

```javascript
const target = {
  message1: "hello",
  message2: "everyone",
};

const handler = {
  get(target, prop, receiver) {
    return "world";
  },
};

const proxy = new Proxy(target, handler);

proxy.message1; // "world"
proxy.message2; // "world"
```

As shown above, the second argument to the Proxy constructor, handler, allows you to control the behaviour without modifying the target directly.

## Use cases for metaprogramming in JavaScript

JavaScript metaprogramming can make your code more flexible and reusable.
It can be used to override default behaviour through proxies, enable dynamic programming through reflection, and more.

### Use case 1: Validation

Metaprogramming can be used to validate the behaviour of an object.
For example, you can use a proxy to validate the behaviour of an object.

```javascript
const target = {
  message1: "hello",
  message2: "everyone",
};

const handler = {
  get(target, prop, receiver) {
    if (!Reflect.has(prop)) {
      throw new Error("Property does not exist");
    }
    return Reflect.get(...arguments);
  },
};

const strictTarget = new Proxy(target, handler);

target.message3; // undefined
strictTarget.message3; // Error: Property does not exist
```

In the above example, we created a proxy object that throws an error if the property does not exist.

### Use case 2: Caching

Metaprogramming can be used to cache the behaviour of an object.
For example, you can use a proxy to cache the behaviour of an object.

```javascript
const cache = new Map();

const _fibonacci = (n) => {
  if (n <= 1) {
    return 1;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
};

const handler = {
  apply: (target, thisArg, args) => {
    const [num] = args;
    if (cache.has(num)) {
      return cache.get(num);
    }
    const result = Reflect.apply(target, thisArg, args);
    cache.set(num, result);

    return result;
  }
}

const fibonacci = new Proxy(_fibonacci, handler);

fibonacci(5);
fibonacci(4);
fibonacci(3);
```

In the above example, we created a proxy object that caches the result of the fibonacci function.

## Summary of metaprogramming concepts in JS

Metaprogramming refers to the way a program checks and modifies itself, and in JavaScript, this is done primarily through reflection or proxies.
Understanding it and using it properly can make you more productive and flexible.


## References

- (KR) https://www.youtube.com/watch?v=NmAYfhGBP-I
- (KR) https://ko.wikipedia.org/wiki/%EB%A9%94%ED%83%80
- (EN) https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Meta_programming
- (EN) https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy﻿
