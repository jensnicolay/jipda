if (document.cookie.split(';').filter(function(item) {
  return item.indexOf('reader=') >= 0
}).length) {
  console.log('The cookie "reader" exists')
}

if (document.cookie.split(';').filter((item) => {
  return item.includes('reader=')
}).length) {
  console.log('The cookie "reader" exists')
}
