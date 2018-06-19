var windowObjectReference;

function openRequestedPopup() {
  windowObjectReference = window.open(
      "http://www.domainname.ext/path/ImageFile.png",
      "DescriptiveWindowName",
      "resizable,scrollbars,status"
  );
}