print("base behavior definition");
/*
 * Base behavior definition
 */
CoreObject = Trait({
  send: function coreSend(message) {
    return message;
  }
});

/*
 * Context definitions
 */
Encryption = new cop.Context("Encryption");


Compression = new cop.Context("Compression");

/*
 * Behavioral adaptations definition
 */
EncryptionAdaptation = Trait({
  send: function encryptionSend(message) {
    return "<E>" + this.proceed() + "<E>";
  }
});

/*
 CompressedEncryption = new cop.Context({
 name: "CompressedEncryption"
 });
 */

CompressionAdaptation = Trait({
  send: function compressionSend(message) {
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
print(obj.send("Normal message"));
Compression.activate();
print(obj.send("compressed message"));
Compression.deactivate();
Encryption.activate();
print(obj.send("Encrypted message"));
Encryption.deactivate();

Compression.activate();
Encryption.activate();
Compression.activate();
//CompressedEncryption.activate();
print(obj.send("Both message"));
Compression.deactivate();
Encryption.deactivate();
Compression.deactivate();
//CompressedEncryption.deactivate();








"yes"