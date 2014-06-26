Ember-Heisenberg
================
Ember-Heisenberg is a simple REST-like serialization and transport framework for
Ember.js applications. At its core, it provides a fluent, customizable,
promise-oriented API to define and bind client-side models to server-side
endpoints. Heisenberg is server-agnostic, which allows it to be flexible and
configurable without sacrificing simplicity. It also means that Heisenberg
plays well outside of a strict REST environment, and can just as easily support
RPC-oriented endpoints.


## Key Benefits

- Lightweight: client-side model definitions are simple `Ember.Object` wrappers
- Decoupled architecture: create a `Resource` definition to specify transport details
- No 'magic': be as explicit as necessary about server-side API expectations
- Promise-aware: all AJAX requests are promise-compliant, using `Ember.RSVP.Promise`
- Value-aware: response values can be directly bound to templates; Ember's binding will auto-update values seamlessly
- Declarative model relationships: specify child models just as you would any other field; one-to-many relationships are just lists of children
- Limited concerns: don't be forced into auto-magic 'caching' behaviors; if you want caching, layer that on top of Heisenberg

## Example Usage

```javascript

require('ember-heisenberg');

// Model definitions

App.Company = EH.Object.extend({
	name: EH.stringField()
});

var Company = App.Company;

App.Employee = EH.Object.extend({
	id: EH.numberField(),
	name: EH.stringField(),
	aliases: EH.stringList(),

	// embedded objects
	company: EH.field(Company),
});

var Employee = App.Employee;

// Resource Setup

App.EmployeeResource = EH.Resource.extend();

App.EmployeeResource.reopenClass({
	load: function(id) {
		var request = this.method('GET')
			// query/path parameters are templatized
			.url('/employee/{id}', {id: id}))

			// specify the expected return object to facilitate deserialization
			.produces(Employee);

		// This returns an object which has getResponsePromise() and getResponseValue() functions
		return EmployeeResource.executeRequest(request);
	},

	create: function(Employee) {
		var request = this.method('POST')
		.url('/Employee')
		.body(Employee.toJson())
		.produces(Employee);

		return EmployeeResource.executeRequest(request);
	}
 });


// Using Resources

// Use AJAX responses as promises...
var isBluth = App.EmployeeResource
				.load(10)
				.getResponsePromise()
				.then(doSomethingWithEmployee);

function doSomethingWithEmployee(Employee) {
	return Employee.get('name') === 'Bluth';
}

// ...or use them as values, which will be asynchronously set
var employee = App.EmployeeResource
				.load(11)
				.getResponseValue();

// Creating a new record and handle a failure of the save
var employee = App.Employee.create()
employee.set('name', 'Boy George')

var resultOfSave = EmployeeResource
						.create(Employee)
						.getResponsePromise()
						.then(doSomethingPostSaveSuccess)
						.fail(doSomethingPostSaveFail);

function doSomethingPostSaveSuccess() {
	return 1;
}

function doSomethingPostSaveFail() {
	return 0;
}
```

Building Ember-Heisenberg
=========================

1. Install node: http://nodejs.org/
- Install dependencies: `npm install`
- Build and run tests: `grunt`
- Output will be in `dist/`

Tests
=====

Heisenberg uses [Karma](http://karma-runner.github.io) as its test runner. Tests are run automatically
as a part of the build process, but you can invoke the tests manually with `grunt karma:unit`.

You can also run the tests continuously (they will auto-watch any dependencies) with `grunt karma:dev`.
