//var Trait = require("../../../../../papers/icse18/code/apps/libs/traits.js").Trait;
//var cop = require("../../../../../papers/icse18/code/apps/libs/context-traits.min.js");

/*
 * Base behavior definition
 */
CoreObject = Trait({
  display: function(message) {
    return "Message: " + message;
  }
});

/*
 * Context definition
 */
Remote = new Context({
  name: "Remote"
});

Encryption = new Context({
  name: "Encryption"
});


Compression = new Context({
  name: "Compression"
});

/*
 * Behavioral adaptations definition
 */
RemoteBehavior = Trait({
  send: function(message) {
    return this.display("remote! " + message);
  },
  display: function(message) {
    return this.proceed();
  }
});

EncryptionBehavior = Trait({
  send: function(message) {
    return "<E>" + this.proceed() + "<E>";
  }
});

CompressionBehavior = Trait({
  send: function(message) {
    return "<C>" + this.proceed() + "<C>";
  }
});

/*CompressedEncryptionBehavior = Trait({
  send: function() {
    return this.proceed();
  }
});
*/

//Generating object instance
obj = Object.create(Object.prototype, CoreObject);

//Associating context with objects
Compression.adapt(obj, CompressionBehavior);
Encryption.adapt(obj, EncryptionBehavior);
Remote.adapt(obj, RemoteBehavior);
//CompressedEncryption.adapt(obj, CompressedEncryptionRole);

/* -----------------------------
 *             TESTS
 * ----------------------------- */
console.log(obj.display("Hello world"));
Remote.activate();
console.log(obj.send("Hello world"));

Compression.activate();
console.log(obj.send("Hello remote world"));
Compression.deactivate();
Encryption.activate();
console.log(obj.send("Hello remote world"));
Encryption.deactivate();

Encryption.activate();
Compression.activate();
console.log(obj.send("Hello remote world"));
Compression.deactivate();
Encryption.deactivate();

Remote.activate();
console.log(obj.send("Hello remote world"));
Encryption.deactivate();
