/**
 * Official documents — the `certificates` collection behind /verify.
 *
 * Index names match the Mongoose schema declarations
 * (src/server/models/certificate.ts). `certNo` is unique: it is the number
 * printed on the paper and carried by its QR code.
 */

const COLLECTIONS = ["certificates"];

const INDEXES = {
  certificates: [
    [{ certNo: 1 }, { name: "certNo_unique", unique: true }],
    [{ status: 1, createdAt: -1 }, { name: "status_created" }],
  ],
};

module.exports = {
  async up(db) {
    const existing = new Set(
      (await db.listCollections().toArray()).map((c) => c.name),
    );
    for (const name of COLLECTIONS) {
      if (!existing.has(name)) await db.createCollection(name);
    }
    for (const [collection, specs] of Object.entries(INDEXES)) {
      for (const [keys, options] of specs) {
        await db.collection(collection).createIndex(keys, options);
      }
    }
  },

  async down(db) {
    for (const [collection, specs] of Object.entries(INDEXES)) {
      for (const [, options] of specs) {
        try {
          await db.collection(collection).dropIndex(options.name);
        } catch {
          // already gone
        }
      }
    }
  },
};
