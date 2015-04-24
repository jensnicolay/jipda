"use strict";   



function createDagreGraph(states)
{
  var graph = new dagreD3.Digraph();
  
  states.forEach(
    function (s)
    {
      var nodeLabel = "";
      if (s.constructor.name === "ReturnState")
      {
        nodeLabel += "return ";
      }
      else if (s.constructor.name === "ThrowState")
      {
        nodeLabel += "throw ";
      }
      else if (s.constructor.name === "BreakState")
      {
        nodeLabel += "break ";
      }
      if (s.node)
      {
        nodeLabel += String(s.node).substring(0,20);
      }
      else if (s.value !== undefined)
      {
        nodeLabel += String(s.value);
      }
      else
      {
        nodeLabel += s.type;
      }
      nodeLabel += s.kont ? (s.kont._id === undefined ? "" : " | " + s.kont._id) : " | ?";
//      print(s._id, "!");
      graph.addNode(s._id, {label: nodeLabel});
    })

    states.forEach(
      function (s)
      {
        s._successors.forEach(
          function (t2)
          {
            var s2 = t2.state;
            var edgeLabel = "";
            edgeLabel += t2.effects;
            graph.addEdge(t2._id, s._id, s2._id, {label: edgeLabel});            
          })
      })
    return graph;
  }
   
   function drawDagreGraph(graph)
   {
      var renderer = new dagreD3.Renderer();
      renderer.run(graph, d3.select("svg g"));
      $("g.node").each(function ()
          {
            var state = states[this.__data__];
            var constructorName = String(state.constructor.name);
//            constructorName = constructorName.substring(0, constructorName.length);
            $(this).attr("class", "node enter " + constructorName)
              .click(function(e) {
                e.stopPropagation();
                var astNode = states[e.target.__data__].node;
                if (astNode)
                {
                  highlightAstNodeInSource(astNode);
                }})
              .dblclick(function(e) {
                e.stopPropagation();
                dblclickedOnState(this.__data__);
                });
          });
      $("g.edgePath").each(function ()
          {
            var transition = transitions[this.__data__];
            $(this)//.attr("class", "edgePath enter " + constructorName)
              .click(function(e) {
                e.stopPropagation();
                })
              .dblclick(function(e) {
                e.stopPropagation();
                dblclickedOnTransition(this.__data__);
                })
          });
      $("g.edgeLabel").each(function ()
          {
            var transition = transitions[this.__data__];
            $(this)//.attr("class", "edgePath enter " + constructorName)
              .click(function(e) {
                e.stopPropagation();
                })
              .dblclick(function(e) {
                e.stopPropagation();
                dblclickedOnLabel(this.__data__);
                })
          });
   }

   
   function editorPosToAstNode(pos)
   {
     var line = pos.line + 1; // lines: cm 0-based, esprima 1-based
     var col = pos.ch; 
     var astNode = Ast.locToNode(line, col, ast);
     return astNode;
   }
   
   function editorCursorToAstNode()
   {
     var pos = editor.getCursor("from");
     return editorPosToAstNode(pos);
   }
   
   function highlightAstNodeInSource(node)
   {
     var loc = node.loc;
     editor.setSelection(CodeMirror.Pos(loc.start.line - 1, loc.start.column), CodeMirror.Pos(loc.end.line - 1, loc.end.column));
   }
   
   function highlightAstNodeInGraph(node)
   {
     $("g.node").each(function ()
         {
           var state = states[this.__data__];
           var q = state.q;
           if (q.node && (node === q.node || node === q.node.expression))
           {
             this.classList.add("highlight");
           }
           else
           {
             this.classList.remove("highlight");
           }
         })
   }
   
   function unhighlightTransitionsInGraph()
   {
     $("g.edgePath").each(function ()
         {
           this.classList.remove("highlight");
           $("path", this).attr("marker-end", "url(#arrowhead)");
         })
   }
   
   function highlightTransitionInGraph(transition)
   {
     $("g.edgePath").each(function ()
         {
           var t = transitions[this.__data__];
           if (t === transition)
           {
             this.classList.add("highlight");
             $("path", this).attr("marker-end", "url(#highlightarrowhead)");
           }
         })
   }
   
   function highlightStateInGraph(state)
   {
     $("g.node").each(function ()
         {
           var s = states[this.__data__];
           if (s === state)
           {
             this.classList.add("highlight");
           }
         })
   }
   
   function unhighlightStatesInGraph()
   {
     $("g.node").each(function ()
         {
           this.classList.remove("highlight");
         })
   }
   
   function highlightInGraph(x)
   {
     if (Array.isArray(x))
     {
       x.forEach(highlightInGraph);
     }
     else if (x instanceof Edge)
     {
       highlightTransitionInGraph(x)
     }
     else if (x instanceof Conf)
     {
       highlightStateInGraph(x);
     }
     else console.log("highlightInGraph?", x);
   }
   
   function unhighlightGraph()
   {
     unhighlightStatesInGraph();
     unhighlightTransitionsInGraph();
   }
   
   function unhighlight()
   {
     unhighlightGraph();
     editor.setCursor(editor.getCursor());
   }
   
   function highlight(x)
   {
     if (Array.isArray(x))
     {
       x.forEach(highlight);
     }
     else if (x instanceof Edge)
     {
       highlightTransitionInGraph(x)
     }
     else if (x instanceof Conf)
     {
       highlightStateInGraph(x);
     }
     else if (x && x.loc)
     {
       editor.addSelection(CodeMirror.Pos(x.loc.start.line - 1, x.loc.start.column), CodeMirror.Pos(x.loc.end.line - 1, x.loc.end.column));
     }
     else console.log("highlight?", x);
   }
   
   function logOutput(clazz, msg, clickEvent)
   {
     var out = $("#output");
     out.append(function () {return $("<pre class='" + clazz + "'>" + msg + "</pre>").click(clickEvent)});
     out.scrollTop(out[0].scrollHeight);
   }
   
   function logInput(msg)
   {
     meta.replaceRange(msg, CodeMirror.Pos(meta.lastLine()));
   }

   
   function dblclickedOnTransition(i)
   {
     logInput("transitions[" + i + "]");
   }
   
   function dblclickedOnLabel(i)
   {
     logInput("transitions[" + i + "]");
   }
   
   function dblclickedOnState(i)
   {
     logInput("states[" + i + "]");
   }
   
   function sanitize(str)
   {
     var result = "";
     for (var i = 0; i < str.length; i++)
     {
       var code = str.charCodeAt(i); 
       if (code < 256)
       {
         result += str.charAt(i); 
       }
       else
       {
         result += "\n";
       }
     }
     return result;
   }
   
   function clear()
   {
     $("#output").empty();
     return []; // avoids "undefined" as return value, currently prints nothing (?)
   }
   
   function getUrlParameter(sParam)
   {
       var sPageURL = window.location.search.substring(1);
       var sURLVariables = sPageURL.split('&');
       for (var i = 0; i < sURLVariables.length; i++) 
       {
           var sParameterName = sURLVariables[i].split('=');
           if (sParameterName[0] == sParam) 
           {
               return sParameterName[1];
           }
       }
   }
   
  var Editors = {};
  
  Editors.metaConfig =  function () {return {
      mode: "javascript",
      value: getUrlParameter("meta") || "",
      lineWrapping: true,
      extraKeys: { "Ctrl-Space": function (cm) {
        var word = /[\w$]+/;
        var cur = cm.getCursor(), curLine = cm.getLine(cur.line);
        var start = cur.ch, end = start;
        while (end < curLine.length && word.test(curLine.charAt(end))) ++end;
        while (start && word.test(curLine.charAt(start - 1))) --start;
        var curWord = start != end && curLine.slice(start, end);
        var startPos = CodeMirror.Pos(cur.line, start);
        var endPos = CodeMirror.Pos(cur.line, end);
        console.log(curWord);
        $.ajax({
          url : "test/resources/fun-" + curWord + ".js",
          dataType: "text",
          success : function (data) {
            console.log(data);
            cm.setValue(data) }
          })
      },
        "Ctrl-Enter": function(cm) {
          var code = $("#meta #input div.CodeMirror-code").clone().addClass("cm-s-default");
          cm.setValue("");
          cm.clearHistory();
          var out = $("#output");
          out.append(code);
          try
          {
            var txt = sanitize(code.text());
            var result = window.eval(txt);
            logOutput("result", result, function () {unhighlight(); highlight(result)});
          }
          catch (e)
          {
            logOutput("error", e + "\n" + e.stack);
          }
          var met = $("#meta");
          met.scrollTop(met[0].scrollHeight);
        }}
    }}