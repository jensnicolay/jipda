export function t()
{
	var result = TestSuite.runSuites(arguments.length === 0 ? undefined : arguments);
	Test.displayTestResults(result);
}

var Test = {};

Test.displayTestResults =
  function (result)
  {
  	var log = result.log.flatten(); 
  	log.forEach(
  		function (entry)
  		{
  			console.log("===== " + entry.name + " =====");
  			console.log(entry.e);
  			if (entry.e.stack)
  			{
  				console.log(entry.e.stack);
  			}
  		});
  	console.log("SUCCESS: " + result.success);
  	console.log("FAIL   : " + result.fail + " " + log.map(function (entry) { return entry.name; }));
  	console.log((result.time/1000) + " seconds");
  }

export function TestSuite(name)
{
	this.name = name;
	TestSuite.registrations.push(this);
}

TestSuite.registrations = [];

TestSuite.runSuites =
	function (suites)
	{
		suites = suites || TestSuite.registrations;
		var log = [];
		var success = 0;
		var fail = 0;
		var start = Date.now();
		for (var i = 0; i < suites.length; i++)
		{
			var result = suites[i].run();
			success += result.success;
			fail += result.fail;
			log.push(result.log);
		}
		var end = Date.now();
		return { success: success, fail: fail, log: log, time: (end - start)};
	};
	
TestSuite.prototype.run =
	function ()
	{
		var log = [];
		var success = 0;
		var fail = 0;
		for (var name in this)
		{
			if (this.hasOwnProperty(name))
			{
				if (name.startsWith("test"))
				{
				  console.log(this.name, name);
					try
					{
						this[name].call(this);
						success++;
					}
					catch (e)
					{
						fail++;
						log.push({name: this.name + "." + name, e: e});
					}
				}
			}
		}
		return { success: success, fail: fail, log: log };
	}