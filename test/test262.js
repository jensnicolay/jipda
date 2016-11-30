const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const esprima = require('esprima');


const test262Dir = "../../test262/";
const harnessDir = test262Dir + "harness/";
const testDir = test262Dir + "test/";

//eval(String(fs.readFileSync("../lib/esprima.js")));
eval(String(fs.readFileSync("../common.js")).substring(14));
eval(String(fs.readFileSync("../countingStore.js")).substring(14));
eval(String(fs.readFileSync("../agc.js")).substring(14));
eval(String(fs.readFileSync("../lattice.js")).substring(14));
eval(String(fs.readFileSync("../concLattice.js")).substring(14));
eval(String(fs.readFileSync("../ast.js")).substring(14));
eval(String(fs.readFileSync("../jsCesk.js")).substring(14));
eval(String(fs.readFileSync("../concreteAg.js")).substring(14));
eval(String(fs.readFileSync("../benv.js")).substring(14));
eval(String(fs.readFileSync("../object.js")).substring(14));

const harness = {
  assert: fs.readFileSync(harnessDir + "assert.js").toString(),
  sta: fs.readFileSync(harnessDir + "sta.js").toString(),
  propertyHelper:fs.readFileSync(harnessDir + "propertyHelper.js").toString(),
  strict: "use \"strict\";\n",
  cache: {}
}

const performance = {now: function () {return Date.now()}};
const print = function () { console.log(Array.prototype.slice.call(arguments).join(" ")) }

const PASS = "PASS";
const FAIL = "FAIL";

// String -> [String]
function fileList(dir)
{
  return fs.readdirSync(dir).reduce(function (list, file)
  {
    let name = path.join(dir, file);
    let isDir = fs.statSync(name).isDirectory();
    return list.concat(isDir ? fileList(name) : [name]);
  }, []);
}

function isTestFile(fileName)
{
  return fileName.endsWith(".js");
}

function handleFile(fileName, i)
{

  function extractMetaData(content)
  {
    let configStarti =  content.indexOf("/*---") + 6;
    let configEndi =  content.indexOf("---*/");
    let configStr = content.substring(configStarti, configEndi);
    let config = yaml.safeLoad(configStr, {json:true}); // json:true to avoid duplicate key errors
    return config;
    // let metaData = {};
    // let src = content;
    // for (let param in config)
    // {
    //   switch (param)
    //   {
    //     case "includes":
    //        config.includes.forEach((flag) => {metaData[flag] = true});
    //        break;
    //     case "flags":
    //       config.flags.forEach((flag) => {metaData[flag] = true});
    //       break;
    //     case "esid":
    //     case "es5id":
    //     case "es6id":
    //     case "description":
    //     case "info":
    //       break;
    //     default:
    //       throw new Error("cannot handle config parameter '" + param + "' in " + fileName);
    //   }
    // }
    // return {src, metaData};
  }
  
  function performTest(src, metaData)
  {
    let status = "?";
    let msg = "";
    src = harness.assert + harness.sta + src;
    if (metaData.includes)
    {
      metaData.includes.forEach(
          function (include)
          {
            let includeSrc = harness.cache[include];
            if (!includeSrc)
            {
              includeSrc = fs.readFileSync(harnessDir + include).toString();
              harness.cache[include] = includeSrc;
            }
            src += includeSrc;
          });
    }
    try
    {
      const actual = run(src);
      if (!metaData.flags.includes('noStrict'))
      {
        let srcStrict = harness.strict + src;
        let actualStrict = run(srcStrict);
      }
      status = PASS;
    }
    catch (e)
    {
      status = FAIL;
      msg = String(e);
    }
    return {fileName, status, msg};
  }
  
  function run(src)
  {
    let ast = Ast.createAst(src);
    let cesk = jsCesk({a:createConcAg(), l: new ConcLattice(), errors:true});
    let system = cesk.explore(ast);
    //var result = computeResultValue(system.result);
    assertEquals(1, system.result.count());
    const resultState = system.result.values()[0];
    if (resultState.constructor.name === "ThrowState")
    {
      throw new Error("Unexpected exception");
    }
    if (resultState.value === BOT)
    {
      throw new Error("BOT value");
    }
    let actual = resultState.value.value;
    assertTrue(actual === undefined);
    return actual;
  }
  
  print(i, fileName);
  const src = fs.readFileSync(fileName).toString();
  const metaData = extractMetaData(src);
  const testResult = performTest(src, metaData);
  return testResult;
}

function computeGlobalResult(startTime, duration, results)
{
  const name = "test262-" + new Date(startTime); // TODO: once this works properly in node, add some date formatting
  const numberOfTests = results.length;
  
  const statusCounts = {PASS:0,FAIL:0};
  results.forEach(
      function (result)
      {
        statusCounts[result.status]++;
      });
  return{startTime, duration, results, name, numberOfTests, statusCounts};
}

function createHtmlResult(globalResult)
{
  function createTag(name, content)
  {
    return "<" + name + ">\n" + content + "\n</" + name + ">\n";
  }
  
  const numberOfTestsP = createTag("p", "Number of tests:" + globalResult.numberOfTests);
  const durationP = createTag("p", "Duration:" + globalResult.duration)
  const statusP = createTag("p", "Success: " + globalResult.statusCounts[PASS]) + createTag("p", "Fail: " + globalResult.statusCounts[FAIL]);
  const global = numberOfTestsP + durationP + statusP;

  const testRows = globalResult.results.map(
      function (result)
      {
        return createTag("tr",
            [createTag("td", result.fileName),
              createTag("td", result.status),
              createTag("td", result.msg)].join("\n"))
      });
  const tests= createTag("table", testRows.join("\n"));
  
  return createTag("html", createTag("body", global + tests));
}

//const files = fileList(testDir); // REAL
const files = fileList(testDir).slice(0, 50); // DEBUG
//const files = [testDir + "metatest.js"]; // DEBUG
const testFiles = files.filter(isTestFile);

const startTime = performance.now();
const testResults = testFiles.map(handleFile);
const testDuration = performance.now() - startTime;

const globalResult = computeGlobalResult(startTime, testDuration, testResults);
print("testName", globalResult.testName);
print("duration", globalResult.duration);
print("number of tests", globalResult.numberOfTests);


const htmlResult = createHtmlResult(globalResult);
const htmlFileName =  globalResult.name + ".html";
fs.writeFileSync(htmlFileName, htmlResult);
print(htmlFileName, "written");