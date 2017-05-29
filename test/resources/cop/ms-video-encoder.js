//require("underscore");
//var Trait = require("traits").Trait;
//var cop = require("context-traits");

/*
 * Base behavior definition
 */
CoreObject = Trait({
  send: function(message) {
    return message;
  }
});

/*
 * Context definitions
 */
Encryption = new Context({
  name: "Encryption"
});


Compression = new Context({
  name: "Compression"
});

/*
 * Behavioral adaptations definition
 */
EncryptionAdaptation = Trait({
  send: function(message) {
    return "<E>" + this.proceed() + "<E>";
  }
});

/*
CompressedEncryption = new cop.Context({
  name: "CompressedEncryption"
});
*/

CompressionAdaptation = Trait({
  send: function(message) {
    return "<C>" + this.proceed() + "<C>";
  }
});

/*
CompressedEncryptionRole = Trait({
  send: function() {
    return this.proceed();
  }
});
*/

obj = Object.create(Object.prototype, CoreObject);

//Context behavioral adaptation association
Compression.adapt(obj, CompressionAdaptation);
Encryption.adapt(obj, EncryptionAdaptation);
//CompressedEncryption.adapt(obj, CompressedEncryptionRole);


/* -----------------------------
 *             TESTS
 * ----------------------------- */
console.log(obj.send("Normal message"));
Compression.activate();
console.log(obj.send("compressed message"));
Compression.deactivate();
Encryption.activate();
console.log(obj.send("Encrypted message"));
Encryption.deactivate();

Compression.activate();
Encryption.activate();
Compression.activate();
//CompressedEncryption.activate();
console.log(obj.send("Both message"));
Compression.deactivate();
Encryption.deactivate();
Compression.deactivate();
//CompressedEncryption.deactivate();
