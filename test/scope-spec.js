describe("Scope", function() {
	it("can be constructed and used as an object", function() {
		var scope = new Scope();
		scope.newProp = 1;
		expect(scope.newProp).toBe(1);
	});
	
	describe("digest", function() {
		var scope;
		beforeEach(function() { 
			scope = new Scope(); 
			jasmine.clock().install();
		});
		afterEach(function() {
			jasmine.clock().uninstall();
		});

		it("calls the listener function of a watch on first $digest", function() {
			var watchFn = function() {return "test";}
			var listenerFn = jasmine.createSpy();
			
			scope.$watch(watchFn, listenerFn);
			
			scope.$digest();
			
			expect(listenerFn).toHaveBeenCalled();
		});
		
		it("calls the watchFn with the scope as the argument", function() {
			var watchFn = jasmine.createSpy();
			var listenerFn = function() {};
			
			scope.$watch(watchFn, listenerFn);
			
			scope.$digest();
			
			expect(watchFn).toHaveBeenCalledWith(scope);
		});
		
		it("calls the listener when the watch function return different value", function() {
			scope.name = "";
			scope.count = 0;
			
			scope.$watch(function(scope){
				return scope.name;
			}, function(newVal, oldVal, scope) {
				scope.count++;
			});
			
			expect(scope.count).toBe(0);
			
			scope.$digest();
			expect(scope.count).toBe(1);
			
			scope.$digest();
			expect(scope.count).toBe(1);
			
			scope.name = "Iulian";
			
			scope.$digest();
			expect(scope.count).toBe(2);
		});
		
		it("digest loop should be recalled if a watch listener modify the scope", function() {
			scope.name = "";
			scope.count = 0;
			scope.result = 0;
			
			scope.$watch(function(scope) {
				return scope.count;
			}, function(newVal, oldVal, scope) {
				scope.result = newVal;
			});
			
			scope.$watch(function(scope) {
				return name;
			}, function(newVal, oldVal, scope) {
				scope.count++;
			});
			scope.$digest();
			expect(scope.result).toBe(1);
			
			scope.count = 3;
			scope.$digest();
			expect(scope.result).toBe(3);
			
			scope.name = "Iulian";
			scope.$digest();
			expect(scope.name).toBe("Iulian");
			expect(scope.result).toBe(3);
		});
		
		it("gives up on the watches after 10 iterations", function() {
			scope.n1 = 1;
			scope.n2 = 2;
			
			scope.$watch(function(scope) {
				return scope.n1;
			}, function(newVal, oldVal, scope) {
				scope.n2 = newVal + 1;
			});
			
			scope.$watch(function(scope) {
				return scope.n2;
			}, function(newVal) {
				scope.n1 = newVal + 1;
			});
			
			expect(function(){ scope.$digest(); }).toThrow();
		});
		
		it("watch based on value if it is enabled", function() {
			scope.data = [1, 2, 3];
			scope.count = 0;
			
			scope.$watch(function(scope) {
				return scope.data;
			}, function(newVal, oldVal, scope) {
				scope.count++;
			}, true);
			
			scope.$digest();
			expect(scope.count).toBe(1);
			
			scope.data.push(4);
			scope.$digest();
			expect(scope.count).toBe(2);
		});
		
		it("correctly handles NaNs", function() {
			scope.number = 0/0;
			scope.count = 0;
			
			scope.$watch(function(scope) {
				return scope.number;
			}, function(newVal, oldVal, scope) {
				scope.count++;
			});
			
			scope.$digest();
			expect(scope.count).toBe(1);
			
			scope.$digest();
			expect(scope.count).toBe(1);
		});
		
		it("Execute $evalAsync function later in the same cycle", function() {
			scope.aValue = [1, 2, 3];
			scope.asyncEvaluated = false;
			scope.asyncEvaluatedImmediately = false;
			
			scope.$watch(function(scope) {
				return scope.aValue;
			}, function(newVal, oldVal, scope) {
				scope.$evalAsync(function(scope) {
					scope.asyncEvaluated = true;
				});
				
				scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
			});
			
			scope.$digest();
			
			expect(scope.asyncEvaluated).toBe(true);
			expect(scope.asyncEvaluatedImmediately).toBe(false);
		});
		
		it("has a $$phase field whose value is the current digest phase", function() {
			scope.aValue = [1, 2, 3];
			scope.phaseInWatchFunction = undefined;
			scope.phaseInListenerFunction = undefined;
			scope.phaseInApplyFunction = undefined;
			
			scope.$watch(function(scope) {
				scope.phaseInWatchFunction = scope.$$phase;
				return scope.aValue;
			}, function(newVal, oldVal, scope) {
				scope.phaseInListenerFunction = scope.$$phase;
			});
			
			scope.$apply(function(scope) {
				scope.phaseInApplyFunction = scope.$$phase;
			});
			
			expect(scope.phaseInApplyFunction).toBe("$apply");
			expect(scope.phaseInListenerFunction).toBe("$digest");
			expect(scope.phaseInWatchFunction).toBe("$digest");
		});
		
		it("schedules a $digest in $evalAsync", function() {
			scope.aValue = [1, 2, 3];
			scope.count = 0;
			
			scope.$watch(function(scope) {
				return scope.aValue;
			}, function(newVal, oldVal, scope) {
				scope.count++;
			})
			
			scope.$evalAsync(function(){});
			
			expect(scope.count).toBe(0);
			jasmine.clock().tick(100);
			expect(scope.count).toBe(1);
		});
		
		it("Runs a $$postDigest after each $digest", function() {
			scope.count = 0;
			scope.$$postDigest(function(scope) {
				scope.count++;
			});
			
			expect(scope.count).toBe(0);
			
			scope.$digest();
			expect(scope.count).toBe(1);
			
			scope.$digest();
			expect(scope.count).toBe(1);
		});
		
		it("Catch an exception in watch function and continue!", function() {
			scope.aValue = [1, 2, 3];
			scope.count = 0;
			
			scope.$watch(function() {
				throw "error";
			}, function() {});
			
			scope.$watch(function(scope) {
				return scope.aValue;
			}, function(newVal, oldVal, scope) {
				scope.count++;
			});
			
			expect(scope.count).toBe(0);
			
			scope.$digest();
			expect(scope.count).toBe(1);
		});
		
		it("Catch an exception in listener function and continue!", function() {
			scope.aValue = [];
			scope.count = 0;
			
			scope.$watch(function (scope){
				return scope.aValue;
			}, function() {
				throw "error";
			});
			
			scope.$watch(function (scope) {
				return scope.aValue;
			}, function(newVal, oldVal, scope) {
				scope.count++;
			});
			
			expect(scope.count).toBe(0);
			
			scope.$digest();
			expect(scope.count).toBe(1);
		});
		
		it("Catch an exception in evalAsync and continue", function() {
			scope.aValue = [];
			scope.count = 0;
			
			scope.$watch(function(scope) {
				return scope.aValue;
			}, function(newVal, oldVal, scope) {
				scope.count++;
			})
			
			scope.$evalAsync(function(){
				throw "Error";
			});
			
			expect(scope.count).toBe(0);
			
			jasmine.clock().tick(100);
			expect(scope.count).toBe(1);
		});
		
		it("Catch an exception in postDigest and continue", function() {
			scope.aValue = [1, 2];
			scope.count = 0;
			
			scope.$watch(function(scope){
				return scope.aValue;
			}, function(newVal, oldVal, scope) {
				scope.count++;
			});
			
			scope.$$postDigest(function() {
				throw "error";
			});
			
			expect(scope.count).toBe(0);
			scope.$digest();
			expect(scope.count).toBe(1);
		});
		
		it("Allows to destroy a watch with a removal function", function() {
			scope.aValue = [1, 2];
			scope.count = 0;
			
			var destroy = scope.$watch(function(scope){
				return scope.aValue;
			}, function(newVal, oldVal, scope) {
				scope.count++;
			});
			
			expect(scope.count).toBe(0);
			
			scope.$digest();
			expect(scope.count).toBe(1);
			
			destroy();
			scope.$digest();
			expect(scope.count).toBe(1);
		});
	});
});