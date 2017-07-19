"use strict";

const concKalloc =
    (function ()
    {
      let counter = 0;
      return function ()
      {
        return counter++;
      }
    })();
