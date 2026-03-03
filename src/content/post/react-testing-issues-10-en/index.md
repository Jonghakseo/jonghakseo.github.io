---
title: "10 Issues I Encountered While Writing React Tests"
description: "A summary of 10 major issues including jsdom, userEvent, and accessibility that I encountered while writing React test code over the past year."
publishDate: "2023-01-22"
tags: ["react", "testing"]
lang: "en"
translationQuality: "draft"
---

The testing environment is as follows:

- jest (27.0.6 -> 28.1.3)
- jsdom (16.6.0 -> 19.0.0)
- @testing-library/react (12.0.0)
- @testing-library/user-event (13.5.0)

![Testing environment](../react-testing-issues-10/img1.png)

## 1. Unable to Detect innerText in JSDOM Environment

While testing a DropdownSelect component that extends a Select component, I encountered an issue where the selected value could not be detected. (The Select component is a UI component that allows selecting one option from multiple choices. It dynamically receives a Renderer component to handle various requirements.)

The failing test involved selecting a specific value in the DropdownSelect. When I inspected it using testing library's **screen.debug** method, the text corresponding to the selected value was not visible — even though it displayed correctly in a real browser environment.

After researching various resources, I was able to identify the cause and solution:

1. The part that displays the selected value inside the Select component was fetching it from an array of option elements within the Select component's children.
2. In the process of getting the selected value from the option element, **optionElement.innerText** was being used.
3. innerText retrieves the element's text "as rendered" — that is, exactly as it appears when rendered.
4. Upon investigating innerText more closely, I found that it returns different values depending on how the text actually appears in the browser environment.
5. The innerText specification itself is designed to get "as rendered" values, which means it inherently depends on the layout engine.
6. Our testing environment uses jsdom, and jsdom has no layout engine. Therefore, jsdom does not support innerText.

After identifying the root cause through this process, our team decided to use textContent as a replacement for innerText.

Beyond just fixing the broken test, we determined that textContent was actually more suitable for our actual use case — it returns the text within HTML as-is, without trimming line breaks, whitespace, or paragraph formatting.

> _And if all you need is to retrieve a text of an element without any kind of style awareness, you should — by all means — use textContent instead._

**References**

- https://html.spec.whatwg.org/multipage/dom.html#the-innertext-idl-attribute
- http://perfectionkills.com/the-poor-misunderstood-innerText/
- https://github.com/jsdom/jsdom/issues/1245

## 2. Tests That Only Fail in CI Environment

![CI environment failure](../react-testing-issues-10/img2.png)

Our team currently uses GitHub Actions for CI (Continuous Integration).

At some point, certain tests started failing in the CI environment. Tests that never failed locally would fail only in CI, and they were intermittent failures at that — re-running the test action would immediately pass them, making debugging extremely difficult.

We tried several approaches targeting suspicious areas.

We checked whether any implementations or test code were affected by the testing environment's timezone (GMT), and tried running tests locally to mimic the CI environment as closely as possible to see if the issue occurred when test processes ran in parallel.

During this process, we found a common pattern among the intermittently failing tests: the failure points were all in **await findBy~** calls where specific elements couldn't be found within the allotted time.

The last thing we tried was increasing the timeout of the test environment itself.

We increased the timeout for waitFor and find methods in react-testing-library from the default 1 second to 4 seconds using asyncUtilTimeout.

https://testing-library.com/docs/dom-testing-library/api-configuration/#asyncutiltimeout

After that, the intermittent test failures disappeared completely.

Some legacy components that were difficult to test had integration tests using waitFor/findBy to wait for re-renders triggered by network mocking and state changes. In the relatively low-spec CI environment, these complex state changes and re-renders apparently couldn't complete within 1 second.

While we resolved this issue by increasing the timeout threshold for test failures, the fundamental problem was that these components had complex logic and unnecessary re-renders that couldn't complete within the generous 1-second window. Refactoring these components to improve code quality and create test-friendly structures would prevent such issues.

**References**

- https://testing-library.com/docs/dom-testing-library/api-configuration/#asyncutiltimeout

## 3. Elements Hidden with display:none Being Exposed in jsdom

![jsdom display:none issue](../react-testing-issues-10/img3.png)

I've already covered this issue in a separate article, so I'll just link to it here.

https://nookpi.tistory.com/139

## 4. When Using UI Libraries Like antd

![antd issue](../react-testing-issues-10/img4.png)

UI libraries like antd are a double-edged sword. While they can be difficult to customize and come with unnecessary interfaces, they drastically reduce the time needed to build UI components.

At our company, we use antd for our admin product. We made the judgment that the productivity gains from using antd outweigh the implementation constraints, so we use it selectively in the admin environment.

While writing test code for the admin environment, we discovered that some antd components have structures that are difficult to test with react-testing-library. For example, antd's select component looks like an input but is actually implemented as a div.

![antd select implementation](../react-testing-issues-10/img5.png)

Furthermore, the select component's placeholder is implemented as a span tag. This meant the **ByPlaceholder** query selector couldn't be used at all to find elements based on placeholder text.

In cases like this, you can query the component by creating custom query selectors.

https://testing-library.com/docs/react-testing-library/setup/#add-custom-queries

```typescript
import { buildQueries } from "@testing-library/react";

const ANTD_SELECT_PLACEHOLDER_CLASS_NAME = "ant-select-selection-placeholder" as const;

const queryAllByAntdSelectPlaceholder = (
	container: HTMLElement,
	placeholder: string,
): HTMLElement[] => {
	const selectPlaceHolders = container.getElementsByClassName(ANTD_SELECT_PLACEHOLDER_CLASS_NAME);
	return Array.from(selectPlaceHolders).filter(
		(selectPlaceHolder) => selectPlaceHolder.textContent === placeholder,
	) as HTMLElement[];
};
const getMultipleError = (container: Element | null, placeHolder: string) =>
	`Found multiple elements: ${placeHolder}`;
const getMissingError = (container: Element | null, placeHolder: string) =>
	`Unable to find an element: ${placeHolder}`;

const [
	queryByAntdSelectPlaceholder,
	getAllByAntdSelectPlaceholder,
	getByAntdSelectPlaceholder,
	findAllByAntdSelectPlaceholder,
	findByAntdSelectPlaceholder,
] = buildQueries(queryAllByAntdSelectPlaceholder, getMultipleError, getMissingError);
```

We created **ByAntdSelectPlaceholder** to retrieve antd's select component by its placeholder value.

However, we questioned whether it was really appropriate to create custom query selectors that are completely dependent on antd's environment and use them for testing. After deliberating within our team about the time and maintenance costs of creating custom query selectors, and whether the testing value in the admin environment would outweigh the development cost, we decided to write limited test code for the admin product that doesn't depend on antd's internal implementation details.

Whether creating custom query selectors actually increases testing value — carefully weighing maintenance costs against testing benefits and making wise decisions based on each team's situation and goals — seems like the right approach.

**References**

- https://testing-library.com/docs/react-testing-library/setup/#add-custom-queries

## 5. Having to Manually Add id and typename When Mocking GraphQL Responses

There's a library that solves this issue very conveniently, so I'll link to that article instead.

One drawback is that mocking for fragments and queries isn't supported yet...?

https://nookpi.tistory.com/134

## 6. Error When Reconciling a Deleted Node in Test Environment

![reconciliation error](../react-testing-issues-10/img6.png)

This issue arose from using **removeOtherMediaQueryDisplay**, which was discussed in issue #3.

When **removeOtherMediaQueryDisplay** is called within the render method, or when you directly call **element.remove** to delete an element, re-rendering that element through state changes causes an error.

```tsx
test("error test", () => {
	// given
	const Usage = () => {
		const [visible, setVisible] = useState(true);
		return (
			<>
				<input onChange={() => setVisible(false)} />
				{visible && <div id="removed-element" />}
			</>
		);
	};
	// when
	render(<Usage />);

	// Removing a conditionally rendered element after rendering
	document.body.querySelector("#removed-element")?.remove();

	// then
	const input = screen.getByRole("textbox");
	// NotFoundError: The node to be removed is not a child of this node.
	fireEvent.change(input, { target: { value: "1" } });
	// or
	userEvent.type(input, "1");
	// Note: unlike fireEvent, userEvent only outputs this error as console.error without throwing, so extra caution is needed.
});
```

The error occurs because when DOM changes are made that the vdom doesn't know about, React's reconciliation process cannot find the corresponding node. Simply put, it's an error caused by a mismatch between the vdom structure loaded in memory and the actual DOM.

The fundamental solution is to avoid creating such situations. Direct DOM manipulation is a discouraged practice, and code that causes mismatches between the vdom and actual DOM is not good code.

But what if, like our **removeOtherMediaQueryDisplay** method, such a situation is unavoidable?

The workaround is simple. The error above doesn't occur when the node being deleted and the node being conditionally rendered don't match. In the example code, wrapping removed-element with another reactNode solves the issue.

Additionally, **with userEvent**, some events (like type) don't throw the error but handle it with console.error instead, meaning the test doesn't fail. **This makes it difficult to notice when the issue occurs, so extra caution is needed.**

![fireEvent.change throws error](../react-testing-issues-10/img7.png)

![userEvent.type outputs console.error](../react-testing-issues-10/img8.png)

## 7. Form Invalid Event Not Detected in Test Environment Due to jsdom Bug

![form invalid issue](../react-testing-issues-10/img9.png)

One day, a bug was discovered in some form component tests. The component had test code written for all business requirements, and all tests were passing. Surprisingly, upon closer inspection of the test code, tests that should have been failing were actually passing.

This false positive caused issues to slip through testing and reach production, resulting in poor experiences for customers.

Here's an example of a test that shouldn't have been passing:

```tsx
test("test that should not pass", () => {
	// given
	const onSubmit = jest.fn();
	const onInvalid = jest.fn();

	// when
	render(
		<form onSubmit={onSubmit} onInvalid={onInvalid}>
			<Input required validate />
			<input required />
			<RequiredFieldValidator hasValue={false} message="error" />
			<button />
		</form>,
	);

	userEvent.click(screen.getByRole("button"));

	// then
	expect(onSubmit).toBeCalled();
	expect(onInvalid).not.toBeCalled();
});
```

The reason this test, which should have failed, didn't fail is that jsdom couldn't trigger the browser's form validation. To detect a form's invalid event in the testing environment, we had to manually call **event.reportValidity** inside the onSubmit method.

Looking into it, there was already an issue raised about this:

https://github.com/jsdom/jsdom/issues/544

And the fix had already been released in jsdom 18.0.0:

https://github.com/jsdom/jsdom/commit/6a4d9a0646dc19b9521066251d8338953f0715a6

https://github.com/jsdom/jsdom/releases/tag/18.0.0

At the time, the jsdom we were using depended on jest 27.0.6, which used jsdom 16.6.0.

When I looked for a jest version that uses jsdom 18.0.0 or higher, I found that starting from jest 28.0.0 alpha, the jsdom dependency was upgraded from 16.6.0 to 19.0.0. As a temporary fix, we made the onSubmit method call **reportValidity** internally, and soon after upgraded jest to version 28+ to properly resolve the issue.

If for some reason upgrading jest is not easy in your environment, consider using **reportValidity** as a temporary measure.

Although it was just a temporary fix before upgrading jest, we found ourselves in the awkward situation where implementation code was temporarily dependent on test code (specifically, the test environment).

**References**

- https://github.com/jsdom/jsdom/issues/544

## 8. Unable to Detect src in Test Code Due to Next/Image Component's Lazy Loading

![Next/Image lazyload issue](../react-testing-issues-10/img10.png)

Our web product uses the Next/Image component.

This component has several built-in image optimization features, and one of the most notable is lazy loading.

Starting from Next 13, browser-native lazy loading is supported, but prior versions used IntersectionObserver to implement lazy loading. Since our web product was still on Next 12, the Image component was using the legacy Next/Image component with IntersectionObserver-based lazy loading.

Lazy loading implementations using IntersectionObserver typically work by dynamically injecting the image source into the img element. This is clearly visible in the legacy Next/Image component's source code:

- https://github.com/vercel/next.js/blob/v12.3.3/packages/next/client/image.tsx#L925
- https://github.com/vercel/next.js/blob/v12.3.3/packages/next/client/image.tsx#L1051

You can see in the code above that the img tag's initial src is filled with a transparent SVG. This is what caused issues in our test code.

Our team was checking the src attribute in some test code to verify whether the correct image was being displayed. However, due to this implementation detail, the initial image component's src value was set to a transparent SVG, making it impossible to verify whether the correct src was applied.

Therefore, we had to wrap the check with waitFor:

```typescript
await waitFor(() => {
	expect(thumbnail.getAttribute("src")).toContain(mockData.ImageUrl);
});
```

Other solutions we considered:

1. Disable lazy loading based on test environment inside the Image component → This would add environment-dependent branching code to the implementation
2. Create a separate image testing utility function that can check src regardless of lazy load status → This would increase test code complexity and create an unnecessary abstraction layer
3. Upgrade to Next 13's Next/Image which uses browser-native lazy loading → Not something we could do immediately; requires thorough review and incremental migration

Ultimately, I believe option 3 is the right solution. Since our team currently has few test cases for image rendering, we're temporarily using asynchronous deferred verification through waitFor/findBy~.

**References**

- https://web.dev/browser-level-image-lazy-loading/
- https://github.com/vercel/next.js/blob/canary/packages/next/src/client/image.tsx
- https://nextjs.org/docs/api-reference/next/image

## 9. How Should We Use the byRole Method?

![byRole usage](../react-testing-issues-10/img11.png)

React Testing Library provides several query selectors to facilitate testing.

Among them, our team uses the byRole query most frequently. It's the query method that RTL recommends using with the highest priority, and it works based on the accessibility tree. They also state that if you build your web with semantic tags that consider accessibility, there will be very few elements that can't be retrieved through byRole.

https://testing-library.com/docs/queries/about/#priority

byRole is typically used like this:

```typescript
getByRole("button", { name: "Submit" });
```

Since there can be multiple buttons within a component, we pass the actually displayed text "Submit" to the name property of the second argument to identify the specific button we want to test.

As such, byRole and name are frequently used together.

As mentioned earlier, the byRole query operates based on the accessibility tree, and name refers to the accessible name in the accessibility tree. The accessibility tree (naturally) excludes elements that users can't actually access.

The conditions for exclusion from the accessibility tree are:

1. When the element itself or a parent element has CSS like `display:none` or `visibility:hidden`
2. When the element explicitly declares `role="presentation"` or `role="none"` to remove the element's implicit semantics
3. When `aria-hidden="true"` is declared on the element (parent element's hidden:true takes precedence over child element's hidden:false)

Let's now look at how the accessible name, which is frequently used with byRole, is calculated.

https://www.w3.org/TR/accname-1.1/#mapping_additional_nd_te

The method for obtaining the accessible name of a specific element roughly works as follows:

- To find the name, it traverses not only the element itself but also referenced nodes and child nodes, accumulating text.
- If the traversed node is hidden or doesn't have special reference attributes like aria-label or aria-labelledby, it returns an empty string.
- If a valid aria-label exists, the value within aria-label is calculated.
- If a native tag has a value in an attribute that defines alt text, that value is calculated.
- For `role="button"`, the value inside the button is calculated.

However, even with a rough understanding of these rules, you'll occasionally find that the accessible name calculation doesn't work as expected during testing. A notable example is the **\<li\>** tag that uses `role="listitem"`.

```tsx
// when
render(<li>list</li>);

// then
screen.getByRole("listitem", { name: "list" });
```

Looking up related issues leads to this document:

https://github.com/w3c/aria/issues/1117

In summary, the APG (ARIA Authoring Practices Working Group) has decided not to calculate accessible names for four roles: listitem, rowgroup, term, and time.

Why don't they support name calculation for these roles? Looking at listitem specifically, they determined that, like paragraph, it's not an element that should inherently have a name.

I initially found it inconvenient that listitem didn't calculate accessible names, but once I understood the reasoning, it made complete sense.

**References & Accessibility-Related Recommended Reading**

- https://testing-library.com/docs/queries/about/#priority
- https://testing-library.com/docs/queries/byrole
- https://www.w3.org/TR/wai-aria-1.2/#tree_exclusion
- https://www.w3.org/TR/accname-1.1
- https://github.com/w3c/aria/issues/1117

## 10. If Tests Break After Migrating from fireEvent to userEvent

![userEvent migration](../react-testing-issues-10/img12.png)

After introducing test code, our team used fireEvent as the event trigger for about 1-2 months.

As each team member became more familiar with testing, we adopted userEvent — part of the RTL ecosystem — to use a more user-centric event trigger. However, when we started replacing fireEvent methods with userEvent, some previously passing tests began to fail.

After carefully examining the issue, we found the following common patterns among failing tests:

- There's an input component wrapped in a label
- The input component has sibling elements
- The sibling elements are also controllable elements (select, or other inputs)

To analyze the cause, we dug into the userEvent source code. The processing flow of userEvent's type method worked as follows:

1. Check if the element to type into is not in a disabled state
2. Click the element
3. Find the nearest label from the element, and if found, find the label's control element and call **focus**
4. Access the focused control element's ownerDocument and get the activeElement from the ownerDocument
5. Trigger typing events (keydown, keypress, keyup) through fireEvent

The problem occurred at step 3.

When finding the label's control element, if the label contained two or more control elements (select for country code, input for phone number), the select element positioned first would get focused instead.

However, placing two or more interactive elements within a single label is actually a discouraged practice from an accessibility perspective.

https://html.spec.whatwg.org/multipage/forms.html#labeled-control

This experience helped us recognize that the existing implementation of putting multiple control elements in a single label was problematic, and afterward we were able to implement input field components with better accessibility considerations.

**Caution**
The userEvent library has many breaking changes starting from version 14.0. Notably, from 14.0 onwards, all userEvent methods return Promises and can wait for React state updates.

- https://github.com/testing-library/user-event/issues/504

There's also a bug in versions after 14.3 where userEvent.click doesn't submit forms, so please review carefully before adopting.

- https://github.com/testing-library/user-event/issues/1075

**References**

- https://testing-library.com/docs/user-event/intro
- https://github.com/testing-library/user-event/issues/504
- https://html.spec.whatwg.org/multipage/forms.html#labeled-control
- https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label
- https://developer.mozilla.org/en-US/docs/Web/API/Node/ownerDocument
- https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement

---

Here are some other great articles related to writing test code:

- https://overreacted.io/the-wet-codebase/
- https://kentcdodds.com/blog/avoid-nesting-when-youre-testing
- https://kentcdodds.com/blog/aha-testing
- https://kentcdodds.com/blog/testing-implementation-details

Personally, I don't think we need to attach great significance to writing test code itself. I believe teams and individuals should first thoroughly consider what they aim to achieve through testing, and from where to where testing provides the most value given limited resources.

While there have been many benefits from consistently writing tests, the biggest one has been the dramatic improvement in design capabilities — both mine and my team members' — through the process of thinking about "design that makes testing easy."

Although not covered in this article, through consistently writing tests, I've come to realize that while **writing tests for poorly designed implementations can be easy, writing tests for well-designed implementations can never be hard**.

I've documented the major issues we encountered while writing test code over the past year. I hope this content helps those who are considering introducing test code, or those who have just started writing tests.
