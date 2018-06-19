var windowObjectReference; // global variable

function openRequestedPopup() {
  windowObjectReference = window.open(
      "http://www.domainname.ext/path/ImgFile.png",
      "DescriptiveWindowName",
      "width=420,height=230,resizable,scrollbars=yes,status=1"
  );
}