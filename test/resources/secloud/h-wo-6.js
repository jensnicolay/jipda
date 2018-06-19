var windowObjectReference = null; // global variable
var PreviousUrl; /* global variable which will store the
                    url currently in the secondary window */

function openRequestedSinglePopup(strUrl) {
  if(windowObjectReference == null || windowObjectReference.closed) {
    windowObjectReference = window.open(strUrl, "SingleSecondaryWindowName",
        "resizable,scrollbars,status");
  } else if(PreviousUrl != strUrl) {
    windowObjectReference = window.open(strUrl, "SingleSecondaryWindowName",
        "resizable=yes,scrollbars=yes,status=yes");
    /* if the resource to load is different,
       then we load it in the already opened secondary window and then
       we bring such window back on top/in front of its parent window. */
    windowObjectReference.focus();
  } else {
    windowObjectReference.focus();
  };

  PreviousUrl = strUrl;
  /* explanation: we store the current url in order to compare url
     in the event of another call of this function. */
}