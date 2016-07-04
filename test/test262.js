const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const test262Dir = "../../test262/";
const harnessDir = test262Dir + "harness/";
const testDir = test262Dir + "test/";

const harness = {
  assert: fs.readFileSync(harnessDir + "assert.js").toString(),
  sta: fs.readFileSync(harnessDir + "sta.js").toString(),
  propertyHelper:fs.readFileSync(harnessDir + "propertyHelper.js").toString(),
  strict: "use \"strict\";\n"
}

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

function handleFile(fileName, i)
{

  function structureContent(content)
  {

    let configStarti =  content.indexOf("/*---") + 6;
    let configEndi =  content.indexOf("---*/");
    let configStr = content.substring(configStarti, configEndi);
    let config = yaml.load(configStr);
    let metaData = {};
    for (let param in config)
    {
      switch (param)
      {
        case "includes": config.includes;
        case "es5id":
        case "description":
          break;
        default: throw new Error("cannot handle config parameter '" + param + "' in " + fileName);
      }
    }
    return {raw:content, metaData};
  }

  function performTest(testData)
  {
    return 0;
  }

  let rawContent = fs.readFileSync(fileName).toString();
  let structuredContent = structureContent(rawContent);
  let testResult = performTest(structuredContent);
  return testResult;
}

const testFiles = [fileList(testDir)[0]];
let testResults = testFiles.map(handleFile);
console.log(testResults);
