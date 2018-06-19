if (document.cookie.split(';').filter(function(item) {
  return item.indexOf('reader=1') >= 0
}).length) {
  console.log('The cookie "reader" has "1" for value')
}

if (document.cookie.split(';').filter((item) => {
  return item.includes('reader=1')
}).length) {
  console.log('The cookie "reader" has "1" for value')
}