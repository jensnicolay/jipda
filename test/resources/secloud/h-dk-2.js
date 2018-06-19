document.cookie = "test1=Hello";
document.cookie = "test2=World";

var cookieValue = document.cookie.replace(/(?:(?:^|.*;\s*)test2\s*\=\s*([^;]*).*$)|^.*$/, "$1");

function alertCookieValue() {
  alert(cookieValue);
}