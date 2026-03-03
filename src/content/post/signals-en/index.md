---
title: "Signals"
publishDate: "2023/12/23"
description: "What are signals and why are they gaining attention in the frontend ecosystem?"
tags: ["siganl", "preact", "frontend", "react"]
lang: "en"
translationQuality: "draft"
---

## Signals

Today, I'd like to explore what signals are and why they've been steadily gaining attention in the frontend ecosystem.

## What is a Signal?

A signal is both a pattern and a concept for state management.
If you have experience with **Vue**, **Svelte**, **Solid.js**, **Angular**, etc., this concept may already be familiar.
In a nutshell, a signal can be described as **an implementation that holds a value providing reactivity**.

Before diving deep into signals, let's first look at the form and use cases of signals.

### @preact/signals

```jsx
import { signal } from "@preact/signals";

const count = signal(0); // Signal declaration

function Counter() {
  return (
    <div>
      <p>Count: {count}</p>
      {/* UI updates automatically when count value changes */}
      <button onClick={() => count.value++}>click me</button>
    </div>
  );
}
```

### solid.js

```jsx
import { render } from "solid-js/web";
import { createSignal } from "solid-js";

function Counter() {
  const [count, setCount] = createSignal(0); // Signal declaration

  setInterval(() => setCount(count() + 1), 1000);

  {/* UI updates automatically when count value changes */}
  return <div>Count: {count()}</div>;
}
```

Signals are not a new concept or technology but rather an implementation of the observer pattern. Because of this, while there may be interface differences between implementations, the usage patterns are largely the same.

The signal implementation I'll use as an example in this article is [Signals](https://preactjs.com/guide/v10/signals/) from the [Preact](https://preactjs.com/) ecosystem.

- 💡What is Preact?

    _Preact is a UI rendering library using JSX that removes convenience and advanced features like React's reconciler and SyntheticEvent, focusing on bundle size and performance.
    Unlike React, it strongly emphasizes bundle size savings—at version 10.19.2, its compressed size is only 4.5kb, compared to React's react(2.5kB) + react-dom(42kB), giving it a clear advantage._


## The Emergence of the Signal Concept

Modern frontend developers are accustomed to declarative UI development led by JSX. For declarative UI development, reactive variables or objects that automatically reflect value changes in the UI are essential.

Exploration of various implementation methods for providing reactivity has continued steadily. Among them, the observable objects in [Knockout.js](https://knockoutjs.com/), released in July 2010, formed the foundation of the technical concept now called **signals**.

```jsx
const count = ko.observable(0);

const doubleCount = ko.pureComputed(() => count() * 2);

// logs whenever doubleCount updates
ko.computed(() => console.log(doubleCount()))
```

One problem was that (similarly to Angular.js which adopted a similar solution) this reactive state management gradually increased application complexity due to two-way data binding.
As reactive variables were used globally throughout the product, tracking and debugging the elements that caused UI updates became increasingly difficult.

## The Rise of React

React introduced the concept of **unidirectional data binding** in an increasingly complex frontend ecosystem.

With the simple concept that component rendering only occurs through re-rendering from the upper tree or self-initiated state changes, frontend developers no longer had to wander through a maze of rendering.

React's unidirectional data flow brought clear convenience, but early React's state management solution was somewhat permissive.

In the process of contemplating and improving state management, several state management libraries emerged: **Redux** with its store-centric state change pattern following unidirectional data binding, and **Recoil** and **Jotai** which proposed the concept of atoms for reactivity and rendering optimization.

## React State Management

In React, state management for functional components is basically done through a hook called useState.

```jsx
const [count, setCount] = useState(0)

setCount(count+1)
```

Why do we have to manage state this way? Can't we just declare a global variable and use it?

```jsx
let count = 0

function View(){
  const add = () => {
    count++
  }
  return <button onClick={add}>{count}</button>
}
```

React's **functional components** must operate as **pure functions** themselves.

Since all functional components are completely re-invoked during the component (function) call process commonly called rendering, state management through variables declared inside the function is impossible.

- *Will the value of **count** increase when you press the button?*

    It will increase. But how can the user know that the value has increased?
    They won't be able to see it on screen.


All React components form a single tree connected by linked lists. This collection of nodes, commonly called the Virtual DOM, is one of React's biggest abstraction points.

React traverses this tree when state changes are detected, re-invoking each component that is a pure function. In this process, changed state is naturally reflected in UI changes through the component's logic, and then becomes visible to the user through the commit and paint phases. This process is commonly called **rendering/re-rendering**.

The important point here is that for React to operate its reconciler, which compares tree diffs, updates, and replaces each node, **a trigger indicating that state has changed is always necessarily required**.

### Re-render

From React's perspective (not the frontend developer's), there is exactly one re-rendering trigger condition.

It's a method called **scheduleUpdateOnFiber**, which literally **"schedules an update on a Fiber object, React's internal implementation."**

And this method is called from the **dispatchAction** function triggered internally when using **useState** or **useReducer**. (For class components, it's this.setState)

In other words, only by using **useState** or **useReducer** can you tell React **"a state change occurred at this point, so this node part of the tree needs re-rendering."**

Now we know why changes to external state without using **useState** don't cause UI changes. It's because React can't know whether re-rendering is needed.

## But Svelte works fine, right?

Svelte's code writing approach is completely different.

```jsx
<script>
  let count = 0;

  function add() {
    count += 1
  }
</script>

<button on:click={add}>
  {count}
</button>
```

Unlike React, this Svelte code works perfectly.

The secret is that Svelte converts the declared **count** variable into its own reactive object during the [compilation process](https://en.wikipedia.org/wiki/Source-to-source_compiler). So when a value changes, it automatically finds and updates everything that uses that value at runtime.

`let count = 0` essentially becomes `const count = signals(0)` after compilation.

## So what's so great about signals?

To define signals in one sentence again:

They are **objects that hold a specific value and provide UI reactivity based on changes to that value**.

```jsx
import { signal } from "@preact/signals";

const count = signal(0);

function Counter() {
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => count.value++}>click me</button>
    </div>
  );
}
```

Unlike the global variable **let count**, the above code works correctly.

Objects created through **signal()** can have their values accessed through the **.value** property.

If a change occurs in **.value**, it will trigger rendering of all components that have accessed **.value**.

But in the example above, it works correctly even without appending **.value** for outputting the count value.

This is another interesting point of **@preact/signals**.

If you access **count.value** inside a component, the component will render whenever **count**'s value changes. But if you use **count** itself for rendering a specific node, only the part using that signal gets re-rendered.

Simply put, it's not the **Counter** component but only `{count}` inside `<p/>` that gets replaced.

This is the decisive difference from useState where state changes inside a component trigger rendering of the entire component. With signals, you can precisely re-render only the nodes where state changes need to be reflected, like performing precise surgery.

### How is this possible?

As we've seen earlier, React's re-rendering can only be triggered through **scheduleUpdateOnFiber** → **DispatchAction** → **useState, useReducer**, so how is such behavior possible with signals?

Also, React basically performs **component-level re-rendering**, so how can you change the count value without component re-rendering?

Let's examine the **@preact/signals** source code to see how this is achieved. The most important part to focus on is where the signal and React interfaces are connected.

The code that actually integrates React's rendering logic with the signal interface is defined in the **installAutoSignalTracking** method inside **@preact/signals-react-runtime**.

**ReactCurrentDispatcher** is a dispatcher used in React's internal implementation that holds the **current** implementation of all hooks including **useState** and **useEffect**.

In React, various types of **Dispatchers** are exchanged depending on the rendering stage.

For example, the **useState** implementation used when a component mounts and the **useState** used when re-rendering after mount are different implementations.

Based on these facts, the code roughly identifies the current rendering stage by detecting changes in **ReactCurrentDispatcher** and using the type information of the **previous Dispatcher** and **current Dispatcher**.

The useSignal implementation injected during component mount and re-rendering uses **useSyncExternalStore** to trigger re-rendering. (useSyncExternalStore is a hook added in React 18 that supports triggering React rendering through external store state changes.)

Through **installJSXHooks**, the **wrapJSX** decorator extends the default JSX transform functions and **React.createElement**'s functionality.

The code converts **host component props (excluding children) that contain signals into signal.value**.

Now let's look at the prototype redefinition of Signal that wraps it as a React element:

The **Signal** object disguises itself as if it was born through **React.createElement** to appear as a React component. The **SignalValue** functional component is placed in the type property.

This means a signal object rendered in JSX is treated as a **ReactElement** by React, and the rendered functional component **SignalValue** takes its place.

**Now all the secrets are revealed!**

The phenomenon we observed when using signals was **"the entire component doesn't re-render?"**, but in reality, since the signal itself is converted into a small component, only the **SignalValue** component gets re-rendered.

## Why doesn't React do this?

Looking at various RFC documents and responses from core React contributors on X (Twitter), it seems React also recognizes that there are inconvenient and inefficient aspects to its state management logic and memoization.

React, having emerged from its inception to overcome frontend application complexity arising from two-way binding, adheres to unidirectional data flow based on the Flux pattern.

There seems to be concern that excessive use of reactive objects through logic resembling two-way data binding (though it's not exactly that) could make state control flow difficult to understand and recreate the very problem React was designed to solve.

**In summary,**

If signals say **"I'll detect where state changes well and re-render only those parts,"**
React's attitude is closer to **"I'll recalculate everywhere that state changes could affect to guarantee consistent behavior."**

## The Light and Dark Side of Signals

While I said earlier that signals are neither a new concept nor technology, there are clear reasons they're getting attention again recently.

- Complexity of React state management
- The need for messy memoization hooks for rendering optimization
- Ultimately needing to understand React internals to manage state well

At first glance, signals seem like a silver bullet that could end all this pain.

### Signal Supporters

Those who support signals as a state management pattern argue that implementations like **solid.js** and **@preact/signals** may look like two-way data binding, but the actual implementation doesn't break React's unidirectional data binding pattern.

### Signal Opponents

Those opposing signals argue that there's nothing you can't do with **useState** and **useReducer** hooks.

### @preact/signals Opposition

Dan Abramov also recommended against using Preact's signal implementation.
> Preact Signals relies on overriding React's public API and patching React internals with unstable assumptions about how they work. This library is a completely unsupported way to use React.

## Building a Signal from Scratch

Using what we learned above, we can build our own reactive signal object. I created a working signal implementation in about 70 lines using **class** and **useSyncExternalStore** hook.

## Closing

The consensus that React's current state management approach is inconvenient definitely exists, and libraries like **valtio** and **jotai** providing reactivity have been born to solve that problem. Recently, signals have been gaining renewed attention as a means to provide more fine-grained reactivity.

Whether **React Forget** will emerge quickly to save suffering React developers, or whether a completely different paradigm shift in state management will come from another idea—watching these developments will certainly be fascinating.

## Example Code

[github.com/Jonghakseo/react-signal-example](https://github.com/Jonghakseo/react-signal-example)

## References

[The Evolution of Signals in JavaScript](https://dev.to/this-is-learning/the-evolution-of-signals-in-javascript-8ob)

[Let's learn how modern JavaScript frameworks work by building one](https://nolanlawson.com/2023/12/02/lets-learn-how-modern-javascript-frameworks-work-by-building-one/)

[SolidJS](https://www.solidjs.com/tutorial/introduction_signals)

[Signals – Preact Guide](https://preactjs.com/guide/v10/signals/)

[https://github.com/preactjs/signals](https://github.com/preactjs/signals)
