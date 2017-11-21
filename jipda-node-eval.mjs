import fs from 'fs';
import {getGlobal} from './jipda';

function print(...args)
{
  console.log.apply(null, args);
}

getGlobal().print = print;
const read = name => fs.readFileSync(name).toString();
const args = process.argv.slice(2);
const src = read(args[0]);
console.log((0, eval)(src)); // non-strict eval!