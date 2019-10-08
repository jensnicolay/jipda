(function (global)
{
  global.triggerEvents = triggerEvents;

  function triggerEvents(element)
  {
    var onclick = element.onclick;
    if (onclick)
    {
      onclick.apply(element, []);
    }
    var children = element.children;
    for (var i = 0; i < children.length; i++)
    {
      if(children[i] instanceof HTMLElement){
        triggerEvents(children[i]);
      }
    }
  }
})(this);
