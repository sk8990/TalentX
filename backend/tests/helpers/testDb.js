"use strict";

/**
 * In-memory MongoDB lifecycle helpers for Jest.
 *
 * Usage in a test file:
 *
 *   const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
 *
 *   beforeAll(connectTestDb);
 *   afterEach(clearTestDb);
 *   afterAll(disconnectTestDb);
 */

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongod = null;
let usingExternalTestDb = false;

function getDbNameFromUri(uri) {
  try {
    return new URL(uri).pathname.replace(/^\//, "").split("?")[0];
  } catch {
    return "";
  }
}

function assertSafeTestDbUri(uri) {
  const dbName = getDbNameFromUri(uri);
  assertSafeTestDbName(dbName);
}

function assertSafeTestDbName(dbName) {
  if (!/^talentx_(test|jest)/.test(dbName)) {
    throw new Error(
      `Refusing to run tests against non-test database "${dbName || "(missing)"}". ` +
      "Use a database name starting with talentx_test or talentx_jest."
    );
  }
}

async function connectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  const externalUri = String(process.env.MONGO_TEST_URI || "").trim();
  if (externalUri) {
    assertSafeTestDbUri(externalUri);
    usingExternalTestDb = true;
    await mongoose.connect(externalUri);
    await mongoose.connection.dropDatabase();
    return;
  }

  usingExternalTestDb = false;
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

async function disconnectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    if (usingExternalTestDb) {
      assertSafeTestDbName(mongoose.connection.name);
    }
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
  usingExternalTestDb = false;
}

async function clearTestDb() {
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

module.exports = { connectTestDb, disconnectTestDb, clearTestDb };
