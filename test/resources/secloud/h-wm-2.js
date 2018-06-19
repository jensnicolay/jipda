var popup = window.open(...popup details...);

popup.postMessage("The user is 'bob' and the password is 'secret'",
    "https://secure.example.net");

popup.postMessage("hello there!", "http://example.com");

function receiveMessage(event)
{
  if (event.origin !== "http://example.com")
    return;
}
window.addEventListener("message", receiveMessage, false);

function receiveMessage(event)
{
  if (event.origin !== "http://example.com:8080")
    return;

  event.source.postMessage("hi there yourself!  the secret response " +
      "is: rheeeeet!",
      event.origin);
}

window.addEventListener("message", receiveMessage, false);