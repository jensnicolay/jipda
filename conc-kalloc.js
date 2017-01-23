"use strict";

const concKalloc =
    (function ()
    {
      let counter = 0;
      return function (callable, operandValues, store)
      {
        return counter++;
      }
    })();
