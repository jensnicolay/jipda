
function t()
{
	b();
	var result = TestSuite.runSuites();
	displayTestResults(result);
}

function displayTestResults(result)
{
	var log = result.log.flatten(); 
	log.forEach(
		function (entry)
		{
			print ("===== " + entry.name + " =====");
			print(entry.e);
			if (entry.e.stack)
			{
				print(entry.e.stack);
			}
		});
	print("SUCCESS: " + result.success);
	print("FAIL   : " + result.fail + " " + log.map(function (entry) { return entry.name; }));
	print((result.time/1000) + " seconds");
}

function TestSuite(name)
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
				  print(name);
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

function propertiesEntrySet(obj)
{
	return Object.keys(obj).map(
		function (key)
		{
			return [key, obj[key]];
		});
}

function tc(f)
{
  try { return f() } catch (e) { print(e, e.stack) };
}