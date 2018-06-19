var windowObjectReference = null; // global variable

function openRequestedPopup(strUrl, strWindowName) {
  if(windowObjectReference == null || windowObjectReference.closed) {
    windowObjectReference = window.open(strUrl, strWindowName,
        "resizable,scrollbars,status");
  } else {
    windowObjectReference.focus();
  };
}